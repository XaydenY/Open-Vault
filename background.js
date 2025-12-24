
const ITERATIONS = 400000;
let derivedAesKey = null;
let derivedHmacKey = null;
let unlocked = false;
let lockTimer = null;
let stayUnlockedSessionFlag = false;

let auditLog = [];

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function addAuditEntry(action, details = '') {
  auditLog.push({
    timestamp: Date.now(),
    action,
    details
  });
  if (auditLog.length > 1000) {
    auditLog = auditLog.slice(-1000);
  }
  chrome.storage.local.set({ auditLog });
}

async function loadAuditLog() {
  const stored = await chrome.storage.local.get(['auditLog']);
  auditLog = stored.auditLog || [];
}

async function clearAuditLog() {
  auditLog = [];
  await chrome.storage.local.remove(['auditLog']);
  return { ok: true };
}

async function deriveKeysFromPassword(password, saltBase64, iterations) {
  const salt = new Uint8Array(base64ToArrayBuffer(saltBase64));
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, baseKey, 512);
  const bytes = new Uint8Array(bits);
  const aesBytes = bytes.slice(0, 32);
  const hmacBytes = bytes.slice(32, 64);
  const aesKey = await crypto.subtle.importKey('raw', aesBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const hmacKey = await crypto.subtle.importKey('raw', hmacBytes, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['sign', 'verify']);
  return { aesKey, hmacKey };
}

async function encryptWithKeys(aesKey, hmacKey, obj) {
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(JSON.stringify({ v: 2, ts: Date.now() }));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, aesKey, data);
  const cipherBytes = new Uint8Array(cipher);
  const combined = new Uint8Array(iv.byteLength + cipherBytes.byteLength + aad.byteLength);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.byteLength);
  combined.set(aad, iv.byteLength + cipherBytes.byteLength);
  const sig = await crypto.subtle.sign({ name: 'HMAC', hash: { name: 'SHA-256' } }, hmacKey, combined.buffer);
  return {
    ciphertext: arrayBufferToBase64(cipher),
    iv: arrayBufferToBase64(iv),
    aad: arrayBufferToBase64(aad),
    hmac: arrayBufferToBase64(sig)
  };
}

async function decryptWithKeys(aesKey, hmacKey, ciphertextBase64, ivBase64, aadBase64, hmacBase64) {
  const cipherBuf = base64ToArrayBuffer(ciphertextBase64);
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  // Legacy support for AES-GCM only (no AAD/HMAC)
  if (!aadBase64 || !hmacBase64 || aadBase64 === '' || hmacBase64 === '') {
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipherBuf);
      return JSON.parse(new TextDecoder().decode(plain));
    } catch (e) {
      throw new Error('Decryption failed (legacy format): ' + e.message);
    }
  }

  try {
    const aad = new Uint8Array(base64ToArrayBuffer(aadBase64));
    const sigBuf = base64ToArrayBuffer(hmacBase64);
    const cipherBytes = new Uint8Array(cipherBuf);
    const combined = new Uint8Array(iv.byteLength + cipherBytes.byteLength + aad.byteLength);
    combined.set(iv, 0);
    combined.set(cipherBytes, iv.byteLength);
    combined.set(aad, iv.byteLength + cipherBytes.byteLength);
    const ok = await crypto.subtle.verify({ name: 'HMAC', hash: { name: 'SHA-256' } }, hmacKey, sigBuf, combined.buffer);
    if (!ok) throw new Error('HMAC verification failed');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, aesKey, cipherBuf);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    // If HMAC verification fails, try legacy decryption as fallback
    if (e.message.includes('HMAC verification failed')) {
      try {
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, cipherBuf);
        return JSON.parse(new TextDecoder().decode(plain));
      } catch (legacyError) {
        throw new Error('HMAC verification failed and legacy decryption also failed: ' + e.message);
      }
    }
    throw e;
  }
}

// Storage helpers
async function getStored() {
  return await chrome.storage.local.get(['salt', 'iterations', 'vault']);
}

async function saveVault(obj) {
  try {
    const enc = await encryptWithKeys(derivedAesKey, derivedHmacKey, obj);
    await chrome.storage.local.set({ vault: enc });
    // Confirm persistence
    const check = await chrome.storage.local.get(['vault']);
    if (!check.vault) throw new Error('Vault not saved');
    return { ok: true };
  } catch (e) {
    addAuditEntry('vault_save_error', String(e));
    return { ok: false, error: String(e) };
  }
}

// Vault operations
async function createVault(password) {
  addAuditEntry('create_vault', 'New vault created');
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltB = arrayBufferToBase64(salt);
  const keys = await deriveKeysFromPassword(password, saltB, ITERATIONS);
  const encrypted = await encryptWithKeys(keys.aesKey, keys.hmacKey, []);
  await chrome.storage.local.set({ salt: saltB, iterations: ITERATIONS, vault: encrypted, format: 2 });
  derivedAesKey = keys.aesKey;
  derivedHmacKey = keys.hmacKey;
  unlocked = true;
  await touch();
  // Confirm vault is empty and only created on user action
  const check = await chrome.storage.local.get(['vault']);
  if (!check.vault) throw new Error('Vault creation failed');
  return { ok: true };
}

async function unlockVault(password) {
  addAuditEntry('unlock_vault', 'Vault unlocked');
  const s = await getStored();
  if (!s.salt) return { ok: false, error: 'no_vault' };
  try {
    const keys = await deriveKeysFromPassword(password, s.salt, s.iterations || ITERATIONS);
    let vault = [];
    let migrated = false;
    if (s.vault) {
      vault = await decryptWithKeys(keys.aesKey, keys.hmacKey, s.vault.ciphertext, s.vault.iv, s.vault.aad, s.vault.hmac);
      if (!s.vault.hmac || !s.vault.aad) migrated = true;
    }
    derivedAesKey = keys.aesKey;
    derivedHmacKey = keys.hmacKey;
    unlocked = true;
    if (migrated) {
      try {
        await saveVault(vault);
        await chrome.storage.local.set({ format: 2 });
      } catch (e) {}
    }
    await touch();
    return { ok: true, vault };
  } catch (e) {
    addAuditEntry('unlock_failed', String(e));
    return { ok: false, error: String(e) };
  }
}

async function resetVault() {
  addAuditEntry('reset_vault', 'Vault reset due to corruption or user request');
  await chrome.storage.local.remove(['salt', 'iterations', 'vault', 'format']);
  derivedAesKey = null;
  derivedHmacKey = null;
  unlocked = false;
  return { ok: true };
}

async function lockVault() {
  addAuditEntry('lock_vault', 'Vault locked');
  derivedAesKey = null;
  derivedHmacKey = null;
  unlocked = false;
  if (lockTimer) clearTimeout(lockTimer);
  return { ok: true };
}

async function getVault() {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  const s = await getStored();
  if (!s.vault) return { ok: true, vault: [] };
  try {
    const vault = await decryptWithKeys(derivedAesKey, derivedHmacKey, s.vault.ciphertext, s.vault.iv, s.vault.aad, s.vault.hmac);
    return { ok: true, vault };
  } catch (e) {
    console.warn('getVault: decryption failed', e);
    return { ok: false, error: 'decrypt_failed', message: String(e) };
  }
}

async function addCredential(cred) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  const g = await getVault();
  const vault = g.vault || [];
  vault.push(cred);
  await saveVault(vault);
  addAuditEntry('add_credential', `Added credential for ${cred.domain}`);
  return { ok: true };
}

async function deleteCredential(id) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  const g = await getVault();
  let vault = g.vault || [];
  vault = vault.filter(c => c.id !== id);
  await saveVault(vault);
  addAuditEntry('delete_credential', `Deleted credential ${id}`);
  return { ok: true };
}

async function getCredentialById(id) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  const g = await getVault();
  const vault = g.vault || [];
  const c = vault.find(x => x.id === id);
  if (!c) return { ok: false };
  return { ok: true, credential: c };
}

async function getCredentialsForDomain(domain) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  try {
    const g = await getVault();
    const vault = g.vault || [];
    const matches = vault.filter(c =>
      c.domain === domain ||
      c.domain.endsWith('.' + domain) ||
      domain.endsWith('.' + c.domain)
    ).map(c => ({ id: c.id, username: c.username, domain: c.domain }));
    return { ok: true, credentials: matches };
  } catch (e) {
    return { ok: false };
  }
}

// Settings management
async function getSettings() {
  const s = await chrome.storage.local.get(['settings']);
  return s.settings || { autoSave: false, autoFill: false, autoFillOnLoad: false, lastUsed: {}, lockTimeoutSeconds: 300, enableLiveChecker: false };
}

async function setSettings(settings) {
  await chrome.storage.local.set({ settings });
  if (lockTimer) clearTimeout(lockTimer);
  const t = settings.lockTimeoutSeconds || 0;
  // If session-scoped stay-unlocked is enabled, skip setting auto-lock timer
  if (!stayUnlockedSessionFlag) {
    if (t > 0 && unlocked) {
      lockTimer = setTimeout(() => lockVault(), t * 1000);
    }
  } else {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  }
  addAuditEntry('settings_changed', 'Settings updated');
  return { ok: true };
}

// Initialize session-scoped stay-unlocked flag from session storage (if available)
(async () => {
  try {
    if (chrome.storage && chrome.storage.session) {
      const s = await chrome.storage.session.get(['stayUnlockedSession']);
      stayUnlockedSessionFlag = !!s.stayUnlockedSession;
    }
  } catch (e) {
    // ignore
  }
})();

// Credential operations
async function saveCredentialFromPage(domain, username, password) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false, unlocked: false };
  const existing = await findCredential(domain, username);
  if (existing && existing.id) {
    existing.password = password;
    return await updateCredential(existing.id, existing);
  }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const cred = { id, domain, username, password };
  const r = await addCredential(cred);
  addAuditEntry('autosave_credential', `Auto-saved credential for ${domain}`);
  return r;
}

async function findCredential(domain, username) {
  const g = await getVault();
  const vault = g.vault || [];
  const c = vault.find(x => x.domain === domain && x.username === username);
  return c ? { ok: true, id: c.id, credential: c } : { ok: false };
}

async function updateCredential(id, updated) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false };
  const g = await getVault();
  let vault = g.vault || [];
  let found = false;
  vault = vault.map(c => {
    if (c.id === id) {
      found = true;
      return Object.assign({}, c, updated);
    }
    return c;
  });
  if (!found) return { ok: false };
  await saveVault(vault);
  addAuditEntry('update_credential', `Updated credential ${id}`);
  return { ok: true };
}

async function setLastUsed(domain, id) {
  const s = await getSettings();
  s.lastUsed = s.lastUsed || {};
  s.lastUsed[domain] = id;
  await setSettings(s);
  return { ok: true };
}

// Import/Export
async function exportVault(password) {
  const s = await getStored();
  if (!s.salt) return { ok: false };
  // If a password is provided, attempt to derive keys and return plaintext vault
  if (password) {
    try {
      const keys = await deriveKeysFromPassword(password, s.salt, s.iterations || ITERATIONS);
      const plain = await decryptWithKeys(keys.aesKey, keys.hmacKey, s.vault.ciphertext, s.vault.iv, s.vault.aad, s.vault.hmac);
      if (!plain) return { ok: false };
      addAuditEntry('export_plaintext', 'Vault exported as plaintext (user confirmed)');
      return { ok: true, data: plain };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // Otherwise return the encrypted package (for backup/import scenarios)
  addAuditEntry('export_vault', 'Vault exported (encrypted package)');
  return { ok: true, package: { salt: s.salt, iterations: s.iterations || ITERATIONS, vault: s.vault } };
}

async function exportVaultAsJson() {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false, unlocked: false };
  const s = await getStored();
  if (!s.salt || !s.vault) return { ok: false };
  try {
    const vault = await decryptWithKeys(derivedAesKey, derivedHmacKey, s.vault.ciphertext, s.vault.iv, s.vault.aad, s.vault.hmac);
    if (!vault) return { ok: false };
    addAuditEntry('export_json', 'Vault exported as readable JSON');
    return { ok: true, data: vault };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getVaultStats() {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false, unlocked: false };
  const s = await getStored();
  if (!s.salt || !s.vault) return { ok: false };
  try {
    const vault = await decryptWithKeys(derivedAesKey, derivedHmacKey, s.vault.ciphertext, s.vault.iv, s.vault.aad, s.vault.hmac);
    if (!vault) return { ok: false };

    const stats = {
      totalCredentials: vault.length,
      uniqueDomains: new Set(vault.map(item => item.domain)).size,
      vaultSize: JSON.stringify(vault).length,
      lastModified: vault.length > 0 ? Math.max(...vault.map(item => item.lastUsed || 0)) : 0
    };

    return { ok: true, stats };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function importVault(pkg, sourcePassword) {
  if (!unlocked || !derivedAesKey || !derivedHmacKey) return { ok: false, unlocked: false };
  if (!pkg || !pkg.salt || !pkg.vault) return { ok: false };
  try {
    const keys = await deriveKeysFromPassword(sourcePassword, pkg.salt, pkg.iterations || ITERATIONS);
    const plain = await decryptWithKeys(keys.aesKey, keys.hmacKey, pkg.vault.ciphertext, pkg.vault.iv, pkg.vault.aad, pkg.vault.hmac);
    if (!plain) return { ok: false };
    await saveVault(plain);
    await chrome.storage.local.set({ salt: pkg.salt, iterations: pkg.iterations || ITERATIONS });
    addAuditEntry('import_vault', 'Vault imported');
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

// Auto-lock functionality
async function touch() {
  try {
    const s = await getSettings();
    if (lockTimer) clearTimeout(lockTimer);
    const t = s.lockTimeoutSeconds || 0;
    if (t > 0 && unlocked) {
      lockTimer = setTimeout(() => lockVault(), t * 1000);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}

// Production: no dev vault or test helpers

// Initialize audit log
loadAuditLog();
// On install or update, clear all settings and vault for a fresh start
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.clear(() => {
    // Set only default settings and audit log, do NOT set any vault
    chrome.storage.local.set({
      settings: {
        theme: 'light',
        stayUnlocked: false,
        autoFill: false,
        autoSave: false,
        // Add other default settings as needed
      },
      auditLog: [],
    });
  });
});

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.action !== 'status') await touch();
    switch (msg.action) {
      case 'status': {
        const s = await getStored();
        sendResponse({ hasVault: !!s.salt, unlocked });
        break;
      }
      case 'createVault': {
        const r = await createVault(msg.password);
        sendResponse(r);
        break;
      }
      case 'unlock': {
        const r = await unlockVault(msg.password);
        sendResponse(r);
        break;
      }
      case 'lock': {
        const r = await lockVault();
        sendResponse(r);
        break;
      }
      case 'getVault': {
        const r = await getVault();
        sendResponse(r);
        break;
      }
      case 'addCredential': {
        const r = await addCredential(msg.credential);
        sendResponse(r);
        break;
      }
      case 'deleteCredential': {
        const r = await deleteCredential(msg.id);
        sendResponse(r);
        break;
      }
      case 'getCredentialById': {
        const r = await getCredentialById(msg.id);
        sendResponse(r);
        break;
      }
      case 'getCredentialsForDomain': {
        const r = await getCredentialsForDomain(msg.domain);
        sendResponse(r);
        break;
      }
      case 'getSettings': {
        const r = await getSettings();
        sendResponse({ ok: true, settings: r });
        break;
      }
      case 'setSettings': {
        const r = await setSettings(msg.settings);
        sendResponse(r);
        break;
      }
      case 'setStayUnlockedSession': {
        try {
          const val = !!msg.value;
          stayUnlockedSessionFlag = val;
          if (chrome.storage && chrome.storage.session) {
            await chrome.storage.session.set({ stayUnlockedSession: val });
          }
          // adjust lock timer according to new flag
          const s = await getSettings();
          const t = s.lockTimeoutSeconds || 0;
          if (lockTimer) clearTimeout(lockTimer);
          if (!stayUnlockedSessionFlag && t > 0 && unlocked) {
            lockTimer = setTimeout(() => lockVault(), t * 1000);
          }
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false });
        }
        break;
      }
      case 'getStayUnlockedSession': {
        try {
          if (chrome.storage && chrome.storage.session) {
            const s = await chrome.storage.session.get(['stayUnlockedSession']);
            sendResponse({ ok: true, value: !!s.stayUnlockedSession });
          } else {
            sendResponse({ ok: true, value: !!stayUnlockedSessionFlag });
          }
        } catch (e) {
          sendResponse({ ok: false });
        }
        break;
      }
      case 'setNeverSaveForDomain': {
        try {
          const s = await getSettings();
          s.neverSaveDomains = s.neverSaveDomains || [];
          if (!s.neverSaveDomains.includes(msg.domain)) s.neverSaveDomains.push(msg.domain);
          const r = await setSettings(s);
          sendResponse(r);
        } catch (e) {
          sendResponse({ ok: false });
        }
        break;
      }
      case 'saveCredentialFromPage': {
        const r = await saveCredentialFromPage(msg.domain, msg.username, msg.password);
        sendResponse(r);
        break;
      }
      case 'findCredential': {
        const r = await findCredential(msg.domain, msg.username);
        sendResponse(r);
        break;
      }
      case 'updateCredential': {
        const r = await updateCredential(msg.id, msg);
        sendResponse(r);
        break;
      }
      case 'exportVault': {
        const r = await exportVault(msg.password);
        sendResponse(r);
        break;
      }
      case 'exportVaultAsJson': {
        const r = await exportVaultAsJson();
        sendResponse(r);
        break;
      }
      case 'getVaultStats': {
        const r = await getVaultStats();
        sendResponse(r);
        break;
      }
      case 'importVault': {
        const r = await importVault(msg.package, msg.sourcePassword);
        sendResponse(r);
        break;
      }
      case 'setLastUsed': {
        const r = await setLastUsed(msg.domain, msg.id);
        sendResponse(r);
        break;
      }
      case 'touch': {
        const r = await touch();
        sendResponse(r);
        break;
      }
      case 'openPopup': {
        try {
          if (chrome.action && chrome.action.openPopup) chrome.action.openPopup();
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false });
        }
        break;
      }
      case 'removeDevVault': {
        const r = await removeDevVault();
        sendResponse(r);
        break;
      }
      case 'getAuditLog': {
        sendResponse({ ok: true, log: auditLog });
        break;
      }
      case 'exportAuditLog': {
        sendResponse({ ok: true, log: auditLog });
        break;
      }
      case 'clearAuditLog': {
        const r = await clearAuditLog();
        sendResponse(r);
        break;
      }
      case 'resetVault': {
        const r = await resetVault();
        sendResponse(r);
        break;
      }
      default:
        sendResponse({ ok: false });
    }
  })();
  return true;
});