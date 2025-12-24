// Content script for OpenVault - handles autofill and autosave on web pages

let currentDomain = null;
let lastSaved = { username: '', password: '' };

// Enhanced password strength calculation for live checker
function calcStrengthScore(pw) {
  if (!pw) return 0;
  
  let score = 0;
  let penalties = 0;

  // Length scoring (exponential)
  if (pw.length >= 8) {
    score += 2;
    if (pw.length >= 12) {
      score += 2;
      if (pw.length >= 16) {
        score += 2;
        if (pw.length >= 20) {
          score += 2;
        }
      }
    }
  }

  // Character variety
  if (/[a-z]/.test(pw)) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 2;

  // Bonus for mixing different character types
  const types = [/\d/.test(pw), /[a-z]/.test(pw), /[A-Z]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const typeCount = types.filter(Boolean).length;
  if (typeCount >= 3) score += 1;
  if (typeCount >= 4) score += 1;

  // Penalties for common patterns
  if (/(.)\1{2,}/.test(pw)) penalties += 2; // Repeated characters
  if (/^(password|123|abc|qwerty|admin|letmein)/i.test(pw)) penalties += 3; // Common patterns
  if (/^(19|20)\d\d/.test(pw)) penalties += 1; // Years
  if (/123|abc|qwe|asd|zxc/i.test(pw)) penalties += 2; // Sequences

  // Final score calculation (0-10 scale)
  let finalScore = Math.max(0, score - penalties);
  
  // Convert to percentage (0-100)
  return Math.min(100, Math.round((finalScore / 10) * 100));
}

function estimateCrackTimeDisplay(password) {
  if (!password) return '<1s';
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  
  // Add more characters for common symbols
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) pool += 20;
  
  if (pool === 0) pool = 1;
  const entropy = Math.log2(Math.pow(pool, password.length));
  const guesses = Math.pow(2, entropy);
  const guessesPerSec = 1e10; // Modern GPU estimate
  const seconds = guesses / guessesPerSec;
  if (seconds < 1) return '<1s';
  if (seconds < 60) return Math.round(seconds) + 's';
  if (seconds < 3600) return Math.round(seconds/60) + 'm';
  if (seconds < 86400) return Math.round(seconds/3600) + 'h';
  if (seconds < 31536000) return Math.round(seconds/86400) + 'd';
  if (seconds < 315360000) return Math.round(seconds/31536000) + 'y';
  return Math.round(seconds/3153600000) / 10 + ' centuries';
}


// Get current domain
function getDomain() {
  return window.location.hostname;
}

// Send message to background, handle extension context invalidation
async function sendMessage(action, payload) {
  try {
    return await chrome.runtime.sendMessage(Object.assign({ action }, payload));
  } catch (e) {
    if (e && e.message && e.message.includes('Extension context invalidated')) {
      // Silently ignore, extension was reloaded or disabled
      return { ok: false, error: 'Extension context invalidated' };
    }
    throw e;
  }
}

// Find login forms on the page
function findLoginForms() {
  const forms = document.querySelectorAll('form');
  const loginForms = [];
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input[type="password"]');
    if (inputs.length > 0) {
      const usernameInput = form.querySelector('input[type="email"], input[type="text"], input[name*="user"], input[name*="email"]');
      const passwordInput = inputs[0];
      if (usernameInput && passwordInput) {
        loginForms.push({ form, username: usernameInput, password: passwordInput });
      }
    }
  });
  // Fallback: if no forms, look for standalone password fields
  if (loginForms.length === 0) {
    document.querySelectorAll('input[type="password"]').forEach(passwordInput => {
      if (!passwordInput.form) {
        loginForms.push({ form: null, username: null, password: passwordInput });
      }
    });
  }
  return loginForms;
}

// Show autofill suggestions
async function showAutofillSuggestions(forms) {
  if (forms.length === 0) return;

  const domain = getDomain();
  const response = await sendMessage('getCredentialsForDomain', { domain });
  if (!response.ok || !response.credentials || response.credentials.length === 0) return;

  // Create suggestion UI
  const suggestionDiv = document.createElement('div');
  suggestionDiv.id = 'localvault-suggestions';
  suggestionDiv.innerHTML = `
    <div style="position: fixed; top: 22px; right: 22px; background: #D9FFF5; border: 1px solid #A1674A; border-radius: 10px; padding: 16px; box-shadow: 0 6px 24px rgba(39, 45, 45, 0.12); z-index: 10000; max-width: 320px; font-family: 'Noticia Text', serif;">
      <div style="font-weight: 700; margin-bottom: 12px; color: #272D2D; font-size: 14px;">🔐 OpenVault - Autofill</div>
      ${response.credentials.map(cred => `
        <div style="margin-bottom: 8px;">
          <button class="lv-autofill-btn" data-id="${cred.id}" style="width: 100%; padding: 10px 14px; border: 1px solid #A1674A; background: #AAD2BA; color: #272D2D; cursor: pointer; border-radius: 8px; font-size: 14px; font-weight: 400; transition: all 0.12s ease; font-family: 'Noticia Text', serif;">${cred.username}</button>
        </div>
      `).join('')}
      <button id="lv-dismiss" style="width: 100%; padding: 10px 14px; border: 1px solid #272D2D; background: #50514F; color: #D9FFF5; cursor: pointer; border-radius: 8px; margin-top: 10px; font-size: 13px; font-weight: 600; transition: all 0.12s ease; font-family: 'Noticia Text', serif;">✕ Dismiss</button>
    </div>
  `;

  document.body.appendChild(suggestionDiv);

  // Add hover effects
  const buttons = suggestionDiv.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      if (button.id === 'lv-dismiss') {
        button.style.background = '#A1674A';
        button.style.borderColor = '#A1674A';
        button.style.color = '#D9FFF5';
      }
    });
  });
}

// Autosave functionality
function setupAutosave(forms) {
  forms.forEach(({ form, username, password }) => {
    form.addEventListener('submit', async (e) => {
      // capture values before navigation
      const userVal = username.value.trim();
      const passVal = password.value.trim();
      const domain = getDomain();

      if (!userVal || !passVal) return;

      // check settings / opt-out
      const settingsResp = await sendMessage('getSettings');
      const settings = settingsResp.ok ? settingsResp.settings : {};
      const neverSave = (settings.neverSaveDomains || []).includes(domain);

      if (neverSave) return;
      // ...existing code for autosave...
    });
  });


// Attach an enhanced live strength meter UI to password inputs
function attachLiveChecker(forms) {
  try {
    // Remove any previous checkers first
    removeLiveChecker();
    
    // Also check for standalone password fields not in forms (like registration pages)
    const allPasswordInputs = document.querySelectorAll('input[type="password"]');
    const passwordFields = [];
    
    // Add password fields from forms
    forms.forEach(({ password }) => {
      if (password && !passwordFields.includes(password)) {
        passwordFields.push(password);
      }
    });
    
    // Add standalone password fields
    allPasswordInputs.forEach(input => {
      if (!passwordFields.includes(input)) {
        passwordFields.push(input);
      }
    });
    
    passwordFields.forEach(password => {
      if (!password) return;
      // Only inject into visible, enabled, non-readonly, non-hidden password fields
      const style = window.getComputedStyle(password);
      if (
        password.type !== 'password' ||
        password.readOnly ||
        password.disabled ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        password.offsetParent === null
      ) return;
      // avoid double-inject
      if (password.dataset.openvaultId) return;
      const uid = 'ovc-' + Math.random().toString(36).slice(2);
      password.dataset.openvaultId = uid;

      const box = document.createElement('div');
      box.className = 'openvault-livebox';
      box.setAttribute('data-openvault-box', uid);
      box.style.position = 'absolute';
      box.style.zIndex = 99999;
      box.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';
      box.style.border = '2px solid #4CAF50';
      box.style.borderRadius = '8px';
      box.style.padding = '12px';
      box.style.fontSize = '13px';
      box.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      box.style.display = 'none';
      box.style.minWidth = '220px';
      box.style.fontFamily = "'Segoe UI', system-ui, -apple-system, sans-serif";

      // Create strength meter with colored bar
      const meterContainer = document.createElement('div');
      meterContainer.style.marginBottom = '8px';
      
      const meterLabel = document.createElement('div');
      meterLabel.textContent = 'Password Strength';
      meterLabel.style.fontWeight = '600';
      meterLabel.style.marginBottom = '6px';
      meterLabel.style.color = '#333';
      
      const meterBar = document.createElement('div');
      meterBar.style.height = '8px';
      meterBar.style.background = '#e0e0e0';
      meterBar.style.borderRadius = '4px';
      meterBar.style.overflow = 'hidden';
      meterBar.style.marginBottom = '6px';
      
      const meterFill = document.createElement('div');
      meterFill.style.height = '100%';
      meterFill.style.width = '0%';
      meterFill.style.transition = 'all 0.3s ease';
      meterFill.style.borderRadius = '4px';
      
      meterBar.appendChild(meterFill);
      meterContainer.appendChild(meterLabel);
      meterContainer.appendChild(meterBar);

      const strengthText = document.createElement('div');
      strengthText.style.fontWeight = '600';
      strengthText.style.marginBottom = '6px';
      strengthText.textContent = 'Enter a password';

      const feedback = document.createElement('div');
      feedback.style.fontSize = '12px';
      feedback.style.color = '#666';
      feedback.style.marginBottom = '8px';
      feedback.style.minHeight = '32px';
      feedback.textContent = 'Start typing to see strength analysis';

      const crackTime = document.createElement('div');
      crackTime.style.fontSize = '11px';
      crackTime.style.color = '#888';
      crackTime.style.fontWeight = '500';
      crackTime.textContent = 'Crack time: —';

      box.appendChild(meterContainer);
      box.appendChild(strengthText);
      box.appendChild(feedback);
      box.appendChild(crackTime);

      document.body.appendChild(box);

      function update() {
        const val = password.value || '';
        const s = calcStrengthScore(val);
        const crackEstimate = estimateCrackTimeDisplay(val);
        
        // Update meter
        meterFill.style.width = s + '%';
        
        // Update text and colors based on strength
        if (s === 0) {
          strengthText.textContent = 'Enter a password';
          strengthText.style.color = '#95a5a6';
          meterFill.style.background = '#95a5a6';
          feedback.textContent = 'Start typing to see strength analysis';
        } else if (s < 30) {
          strengthText.textContent = 'Very Weak Password';
          strengthText.style.color = '#e74c3c';
          meterFill.style.background = '#e74c3c';
          feedback.innerHTML = '⚠️ Add more characters and variety';
        } else if (s < 50) {
          strengthText.textContent = 'Weak Password';
          strengthText.style.color = '#e67e22';
          meterFill.style.background = '#e67e22';
          feedback.innerHTML = '⚠️ Use uppercase, numbers, and symbols';
        } else if (s < 70) {
          strengthText.textContent = 'Fair Password';
          strengthText.style.color = '#f39c12';
          meterFill.style.background = '#f39c12';
          feedback.innerHTML = '✓ Getting better! Add more length or variety';
        } else if (s < 85) {
          strengthText.textContent = 'Good Password';
          strengthText.style.color = '#27ae60';
          meterFill.style.background = '#27ae60';
          feedback.innerHTML = '✓ Good! Consider making it longer';
        } else {
          strengthText.textContent = 'Strong Password';
          strengthText.style.color = '#2ecc71';
          meterFill.style.background = '#2ecc71';
          feedback.innerHTML = '✅ Excellent! This is a very secure password';
        }
        
        crackTime.textContent = 'Estimated crack time: ' + crackEstimate;
        
        // position near input
        const rect = password.getBoundingClientRect();
        box.style.top = (window.scrollY + rect.bottom + 8) + 'px';
        box.style.left = (window.scrollX + rect.left) + 'px';
        box.style.display = val ? 'block' : 'none';
      }

      password.addEventListener('input', update);
      password.addEventListener('focus', update);
        password.addEventListener('blur', () => {
          if (hideTimeout) clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => { box.style.display = 'none'; }, 1000);
        });
        let hideTimeout = null;
        function showBox() {
          box.style.display = 'block';
          if (hideTimeout) clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => { box.style.display = 'none'; }, 1000);
        }
        function update() {
          const val = password.value || '';
          const s = calcStrengthScore(val);
          const crackEstimate = estimateCrackTimeDisplay(val);
        
          // Update meter
          meterFill.style.width = s + '%';
        
          // Update text and colors based on strength
          if (s === 0) {
            strengthText.textContent = 'Enter a password';
            strengthText.style.color = '#95a5a6';
            meterFill.style.background = '#95a5a6';
            feedback.textContent = 'Start typing to see strength analysis';
          } else if (s < 30) {
            strengthText.textContent = 'Very Weak Password';
            strengthText.style.color = '#e74c3c';
            meterFill.style.background = '#e74c3c';
            feedback.innerHTML = '⚠️ Add more characters and variety';
          } else if (s < 50) {
            strengthText.textContent = 'Weak Password';
            strengthText.style.color = '#e67e22';
            meterFill.style.background = '#e67e22';
            feedback.innerHTML = '⚠️ Use uppercase, numbers, and symbols';
          } else if (s < 70) {
            strengthText.textContent = 'Fair Password';
            strengthText.style.color = '#f39c12';
            meterFill.style.background = '#f39c12';
            feedback.innerHTML = '✓ Getting better! Add more length or variety';
          } else if (s < 85) {
            strengthText.textContent = 'Good Password';
            strengthText.style.color = '#27ae60';
            meterFill.style.background = '#27ae60';
            feedback.innerHTML = '✓ Good! Consider making it longer';
          } else {
            strengthText.textContent = 'Strong Password';
            strengthText.style.color = '#2ecc71';
            meterFill.style.background = '#2ecc71';
            feedback.innerHTML = '✅ Excellent! This is a very secure password';
          }
        
          crackTime.textContent = 'Estimated crack time: ' + crackEstimate;
        
          // position near input
          const rect = password.getBoundingClientRect();
          box.style.top = (window.scrollY + rect.bottom + 8) + 'px';
          box.style.left = (window.scrollX + rect.left) + 'px';
          if (val) showBox(); else box.style.display = 'none';
        }
      
      // Update on window resize/scroll
      const scrollHandler = () => update();
      window.addEventListener('scroll', scrollHandler);
      window.addEventListener('resize', scrollHandler);
      
      // Remove checker if field is removed from DOM
      const observer = new MutationObserver(() => {
        if (!document.body.contains(password)) {
          box.remove();
          window.removeEventListener('scroll', scrollHandler);
          window.removeEventListener('resize', scrollHandler);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } catch (e) { console.error(e); }
}


// Remove any live-checker UI previously injected
function removeLiveChecker() {
  try {
    // remove boxes
    document.querySelectorAll('.openvault-livebox, [data-openvault-box]').forEach(el => el.remove());
    // clear markers on inputs
    document.querySelectorAll('input[data-openvault-id]').forEach(inp => {
      try { delete inp.dataset.openvaultId; } catch(e){}
    });
  } catch (e) { console.error(e); }
}

// Run on load and observe DOM changes for dynamic apps
function runInitAndObserve() {
  init();
  // Observe DOM changes to auto-inject checker on SPA/page changes
  const observer = new MutationObserver(() => {
    init();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInitAndObserve);
} else {
  runInitAndObserve();
}

// Listen for settings changes
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'settingsChanged') {
    // Reinitialize with new settings
    init();
    return;
  }

  if (msg.action === 'detectUsername') {
    // Try to detect a username from the focused input or the first login form
    const forms = findLoginForms();
    let username = '';
    try {
      const ae = document.activeElement;
      if (ae && ae.tagName === 'INPUT') {
        const t = (ae.type || '').toLowerCase();
        const name = (ae.name || '').toLowerCase();
        if (t === 'text' || t === 'email' || name.includes('user') || name.includes('email')) {
          username = ae.value || '';
        }
      }
    } catch (e) {}

    if (!username && forms.length > 0) {
      try { username = forms[0].username.value || ''; } catch (e) { username = ''; }
    }

    sendResponse({ ok: true, username });
    return;
  }

