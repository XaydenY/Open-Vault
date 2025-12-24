const $el = id => $(`#${id}`);
async function send(action, payload) {
  return await chrome.runtime.sendMessage(Object.assign({ action }, payload));
}

let unlocked = false;
let currentDomain = null;
let settings = {};

function replaceIcons() {
  window.SVG_CHECK = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>';
  window.SVG_TIMES = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
  window.SVG_EXCLAM = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  window.SVG_EYE = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  window.SVG_EYE_SLASH = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 19c-7 0-11-7-11-7a19.79 19.79 0 014.63-5.55"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0114.5 14.5"/></svg>';

    const map = {
    'question-circle': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 115.83 1c0 1.5-1 2-1.75 2.75"></path><path d="M12 17h.01"></path></svg>',
    'shield-alt': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"></path></svg>',
    'refresh': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path><path d="M20.49 15a9 9 0 01-14.13 3.36L1 14"></path></svg>',
    'lock': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>',
    'key': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2"></path><path d="M7 10a5 5 0 107 7L21 19"></path></svg>',
    'times': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    'eye': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    'check-circle': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9 12l2 2 4-4"></path></svg>',
    'exclamation-triangle': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    'info-circle': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    'download': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',
    'upload': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>',
    'trash': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line><path d="M9 6V4h6v2"></path></svg>',
    'plus': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    'user': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    'cog': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33"></path></svg>',
    'globe': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15 15 0 010 20"></path></svg>',
    'chevron-down': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
    'chevron-up': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"></polyline></svg>',
    'spinner': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 10-9 9"></path></svg>',
    'unlock': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0110 0"></path></svg>',
    'save': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V7a2 2 0 012-2h11l5 5v9a2 2 0 01-2 2z"></path><path d="M17 21v-8H7v8"></path></svg>',
    'magic': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 11l6 6"></path><path d="M8 3l2 2"></path><path d="M3 21l6-6"></path></svg>',
    'tags': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41L10 3 3 10l10.59 10.59a2 2 0 002.83 0L20.59 16.24a2 2 0 000-2.83z"></path><circle cx="7.5" cy="7.5" r="1.5"></circle></svg>',
    'fill': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v9"></path><path d="M5 21h14"></path></svg>',
    'mobile-alt': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path></svg>',
    'file-code': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path><path d="M10 18l-2-2 2-2"></path><path d="M14 14l2 2-2 2"></path></svg>',
    'eraser': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 9.17l-6-6a2 2 0 00-2.83 0L3 12.17V21h8.83l6-6a2 2 0 000-2.83z"></path></svg>',
    'broom': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21l13-13"></path><path d="M3 16l5 5"></path></svg>',
    'bug': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 8h-3"></path><path d="M4 8h3"></path><path d="M12 12v8"></path><path d="M8 7a4 4 0 018 0"></path></svg>',
    'hand-paper': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V9a4 4 0 018 0v12"></path></svg>',
    'calendar': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path></svg>',
    'copy': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>',
    'gauge': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0118 0"></path><path d="M12 12v-6"></path></svg>',
    'ruler-horizontal': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"></path><path d="M7 10v4"></path><path d="M12 10v4"></path><path d="M17 10v4"></path></svg>',
    'font': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21h14"></path><path d="M8 3h8l-4 14"></path></svg>',
    'hashtag': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l3 16"></path><path d="M17 4l-3 16"></path><path d="M3 10h18"></path><path d="M3 14h18"></path></svg>',
    'asterisk': '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"></path><path d="M6 9l12 6"></path><path d="M6 15l12-6"></path></svg>'
  };

  window.SVG_MAP = map;

  document.querySelectorAll('i[class*="fa-"]').forEach(i => {
    const classes = Array.from(i.classList).filter(c => c.startsWith('fa-'));
    let key = null;
    for (const c of classes) {
      if (c === 'fa' || c === 'fas' || c === 'fa-solid' || c === 'fa-pulse') continue;
      key = c.replace(/^fa-/, '');
      break;
    }
    const wrapper = document.createElement('span');
    wrapper.className = 'fa-replaced';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = '1.2em';
    wrapper.style.height = '1.2em';
    wrapper.style.verticalAlign = 'middle';
    wrapper.style.color = getComputedStyle(document.documentElement).getPropertyValue('--dark-charcoal') || '#272D2D';
    if (key && map[key]) {
      wrapper.innerHTML = map[key];
    } else {
      wrapper.innerHTML = '<svg class="inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';
    }
    i.parentNode.replaceChild(wrapper, i);
  });
}

document.addEventListener('DOMContentLoaded', replaceIcons);

function applySemanticIcons() {
  const m = window.SVG_MAP || {};
  const setIcon = (selector, key) => {
    try {
      const el = document.querySelector(selector);
      if (!el || !m[key]) return;
      const iconContainer = el.querySelector('.icon');
      if (iconContainer) {
        iconContainer.innerHTML = m[key];
        return;
      }
      const svgChild = el.querySelector('svg');
      if (svgChild) {
        svgChild.outerHTML = m[key];
        return;
      }
      const span = document.createElement('span');
      span.className = 'icon';
      span.innerHTML = m[key];
      el.insertBefore(span, el.firstChild);
    } catch (e) {
    }
  };

  setIcon('#helpBtn', 'question-circle');
  setIcon('#lockBtn', 'lock');
  setIcon('#genBtn', 'magic');
  setIcon('#generateBtn', 'magic');
  setIcon('#copyGenBtn', 'copy');
  setIcon('#exportBtn', 'download');
  setIcon('#importBtn', 'upload');
  setIcon('#clearDatabaseBtn', 'eraser');
  setIcon('#viewAuditBtn', 'file-code');
    setIcon('#addBtn', 'plus');

    $('#autofillTutorialDismiss').on('click', async () => {
      try {
        settings = settings || {};
        settings.autofillTutorialDismissed = true;
        await send('setSettings', { settings });
      } catch (e) {
      }
      $('#autofillTutorial').hide();
    });

  try {
    const chev = document.getElementById('addFormToggle');
    if (chev && m['chevron-down']) {
      const newChevron = m['chevron-down'].replace('class="inline-icon"', 'id="addFormToggle" class="inline-icon chevron"');
      chev.outerHTML = newChevron;
    }
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => setTimeout(applySemanticIcons, 50));
function switchTab(tabName) {
  $('.tab-content').hide();
  $('.tabs li').removeClass('is-active');
  $(`#${tabName}-tab`).show();
  $(`#tab-${tabName}`).addClass('is-active');
  try {
    if (tabName === 'settings' && typeof loadSettings === 'function') {
      loadSettings();
    }
  } catch (e) { /* ignore */ }
}

function toggleAddForm() {
  const content = $('#addFormContent');
  const toggle = $('#addFormToggle');
  
  if (content.is(':visible')) {
    content.slideUp(200);
    toggle.removeClass('is-open');
  } else {
    content.slideDown(200);
    toggle.addClass('is-open');
  }
}

window.toggleAddForm = toggleAddForm;

$('#tab-vault').on('click', () => switchTab('vault'));
$('#tab-settings').on('click', () => switchTab('settings'));
$('#tab-generator').on('click', () => switchTab('generator'));
$('#tab-security').on('click', () => switchTab('security'));

async function getCurrentDomain() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || !tabs[0].url) return null;
  try {
    return new URL(tabs[0].url).hostname;
  } catch (e) {
    return tabs[0].url;
  }
}

// Show/hide tabs and add form depending on lock state (global)
function updateTabVisibility() {
  if (typeof unlocked === 'undefined') unlocked = false;
  if (unlocked) {
    $('#tab-settings').show();
    $('#addForm').show();
    $('#addBtn').show();
    $('#addForCurrentBtn').show();
  } else {
    $('#tab-settings').hide();
    $('#addForm').hide();
    $('#addBtn').hide();
    $('#addForCurrentBtn').hide();
    // ensure add form content collapsed
    $('#addFormContent').hide();
    $('#addFormToggle').removeClass('is-open');
  }
}

// UI States
function showLocked(hasVault) {
  unlocked = false;
  $el('lockedView').show();
  $el('unlockedView').hide();
  $el('masterBtn').text(hasVault ? 'Unlock Vault' : 'Create Vault');
  $el('resetVaultLink').hide();
  updateTabVisibility();
}

function showUnlocked() {
  unlocked = true;
  $el('lockedView').hide();
  $el('unlockedView').show();
  loadList();
  loadSettings();
  switchTab('vault');
  updateTabVisibility();
}

// Refresh status
async function refreshStatus() {
  try {
    const s = await send('status');
    currentDomain = await getCurrentDomain();
    $el('currentDomain').text(currentDomain ? currentDomain : 'No active tab');
    if (!s.hasVault) {
      // Show onboarding view for first-time users
      $el('onboardView').show();
      $el('lockedView').hide();
      $el('unlockedView').hide();
      $el('fallback').hide();
      return;
    }
    if (s.unlocked) {
      showUnlocked();
    } else {
      showLocked(s.hasVault);
    }
  } catch (e) {
    $el('fallback').show();
    $el('popupDebug').show().text(String(e));
    console.error('refreshStatus failed', e);
  }
  // Keep Alive / toggle stay-unlocked via button
  // Keep-alive checkbox and input handlers
  $el('keepAliveEnabled').on('change', async () => {
    const enabled = $el('keepAliveEnabled').is(':checked');
    try {
      await send('setStayUnlockedSession', { value: enabled });
      showStatusMsg(enabled ? 'Stay unlocked for this browser session: ON' : 'Stay unlocked for this browser session: OFF', enabled ? 'is-success' : 'is-warning');
      // touch to refresh timer when enabling
      if (enabled) await send('touch');
    } catch (e) {
      showStatusMsg('Failed to update stay-unlocked state', 'is-danger');
    }
  });

  // when enabling keep-alive, touch immediately to refresh session timer
}

// Normalize site input
function normalizeSite(input) {
  try {
    return new URL(input).hostname;
  } catch (e) {
    return input.replace(/^https?:\/\//, '').split('/')[0];
  }
}

// Add credential
async function addCredential() {
  const site = normalizeSite($el('siteInput').val().trim() || '');
  const user = $el('userInput').val().trim() || '';
  const pass = $el('passInput').val().trim() || '';
  const tags = $el('tagsInput').val().trim() || '';
  const notes = $el('notesInput').val().trim() || '';

  if (!site || !user || !pass) {
    alert('Please fill in site, username, and password');
    return;
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const cred = { id, domain: site, username: user, password: pass, tags, notes };

  const r = await send('addCredential', { credential: cred });
  if (r.ok) {
    $el('siteInput').val('');
    $el('userInput').val('');
    $el('passInput').val('');
    $el('tagsInput').val('');
    $el('notesInput').val('');
    loadList();
  } else {
    alert('Failed to add credential: ' + (r.error || 'Unknown error'));
  }
}

// Load credentials list
async function loadList() {
  const r = await send('getVault');
  if (!r.ok) return;

  const creds = r.vault || [];
  const list = $el('list');
  list.empty();

  if (creds.length === 0) {
    list.html('<div class="empty-state"><p>No credentials stored yet — add your first one above.</p></div>');
    return;
  }

  const groups = {};
  creds.forEach(c => {
    groups[c.domain] = groups[c.domain] || [];
    groups[c.domain].push(c);
  });

  for (const domain of Object.keys(groups)) {
    const domainCard = $('<div class="card mb-3"></div>');
    const header = $('<div class="card-header"></div>');
    const headerTitle = $('<div class="card-header-title"></div>').text(domain);
    header.append(headerTitle);

    const content = $('<div class="card-content"></div>');
    const contentDiv = $('<div class="content"></div>');

    groups[domain].forEach(c => {
      const box = $('<div class="box"></div>');
      const level = $('<div class="level"></div>');

      const levelLeft = $('<div class="level-left"></div>');
      const levelItemLeft = $('<div class="level-item"></div>');
      const credIcon = $(
        '<span class="cred-icon" title="Credential">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:8px;">' +
        '<path d="M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" fill="white" opacity="0.0"></path>' +
        '<rect x="3" y="7" width="18" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"></rect>' +
        '<path d="M8 7V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>' +
        '</svg>' +
        '</span>'
      );
      const username = $('<strong></strong>').text(c.username);
      levelItemLeft.append(credIcon).append(username);
      if (c.tags) {
        const tag = $('<span class="tag is-info is-light ml-2"></span>').text(c.tags);
        levelItemLeft.append(tag);
      }
      levelLeft.append(levelItemLeft);

      const levelRight = $('<div class="level-right"></div>');
      const levelItemRight = $('<div class="level-item"></div>');
      const copyBtn = $(
        '<button class="button is-small copy-btn icon-btn" title="Copy password" aria-label="Copy password">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:6px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
        '<span class="sr-only">Copy Password</span>' +
        '</button>'
      );
      copyBtn.data('password', c.password);
      // Edit button
      const editBtn = $('<button class="button is-small edit-btn" style="margin-left:8px;">Edit</button>');
      // Delete button with trash icon
      const delBtn = $(
        '<button class="button is-small delete-btn icon-btn" style="margin-left:8px;color:var(--terracotta);background:transparent;border:none;padding:6px;" title="Delete credential" aria-label="Delete credential">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;display:block;">' +
        '<polyline points="3 6 5 6 21 6"></polyline>' +
        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
        '<path d="M10 11v6"></path><path d="M14 11v6"></path>' +
        '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>' +
        '</svg>' +
        '</button>'
      );
      // append delete first so it remains visible in narrow containers
      levelItemRight.append(delBtn).append(copyBtn).append(editBtn);
      levelRight.append(levelItemRight);

      level.append(levelLeft).append(levelRight);
      box.append(level);

      if (c.notes) {
        const notes = $('<p class="is-size-7 has-text-grey"></p>').text(c.notes);
        box.append(notes);
      }

      contentDiv.append(box);
    });

    content.append(contentDiv);
    domainCard.append(header).append(content);
    list.append(domainCard);
  }

  // Copy password functionality
  $('.copy-btn').on('click', async function() {
    const password = $(this).data('password');
    try {
      await navigator.clipboard.writeText(password);
      const btn = $(this);
      btn.addClass('is-success');
      const sr = btn.find('.sr-only');
      const prev = sr.text();
      sr.text('Copied!');
      setTimeout(() => {
        sr.text(prev);
        btn.removeClass('is-success');
      }, 1500);
    } catch (e) {
      alert('Failed to copy password');
    }
  });

  // Delete credential handler
  $('.delete-btn').on('click', async function() {
    const box = $(this).closest('.box');
    const title = box.find('strong').first().text();
    // find credential id by matching username+domain from displayed elements
    // we stored credentials in closure earlier — easier to request id from server by asking for matching entry
    // fallback: ask for confirm and call delete by matching username&domain
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    // attempt to locate id from nearby data attribute if present
    const username = box.find('strong').first().text();
    const domain = box.closest('.card').find('.card-header-title').text();
    try {
      const r = await send('getCredentialsForDomain', { domain });
      if (r.ok) {
        const found = (r.credentials||[]).find(x => x.username === username);
        if (found) {
          const del = await send('deleteCredential', { id: found.id });
          if (del.ok) {
            loadList();
            return;
          }
        }
      }
      alert('Failed to delete credential');
    } catch (e) {
      alert('Error deleting credential');
    }
  });

  // Edit credential handler — open modal and prefill
  $('.edit-btn').on('click', async function() {
    const box = $(this).closest('.box');
    const username = box.find('strong').first().text();
    const domain = box.closest('.card').find('.card-header-title').text();
    try {
      const r = await send('getCredentialsForDomain', { domain });
      if (r.ok) {
        const found = (r.credentials||[]).find(x => x.username === username);
        if (found) {
          // populate modal
          window._editingCredentialId = found.id;
          $el('editSiteInput').val(found.domain);
          $el('editUserInput').val(found.username);
          $el('editPassInput').val(found.password);
          $el('editTagsInput').val(found.tags || '');
          $el('editNotesInput').val(found.notes || '');
          const modal = $('#editCredentialModal');
          modal.show().addClass('is-active');
          setTimeout(() => { $el('editUserInput').focus(); }, 60);
          return;
        }
      }
      alert('Failed to load credential for editing');
    } catch (e) {
      alert('Error loading credential');
    }
  });
}

// Load settings
async function loadSettings() {
  const r = await send('getSettings');
  if (!r.ok) return;
  settings = r.settings || {};
  // ensure sensible defaults (persist if missing)
  let needPersist = false;
  if (typeof settings.autoSave === 'undefined') { settings.autoSave = false; needPersist = true; }
  if (typeof settings.autoFill === 'undefined') { settings.autoFill = false; needPersist = true; }
  if (typeof settings.autoFillOnLoad === 'undefined') { settings.autoFillOnLoad = false; needPersist = true; }
  if (typeof settings.lockTimeoutSeconds === 'undefined') { settings.lockTimeoutSeconds = 300; }
  if (typeof settings.enableLiveChecker === 'undefined') { settings.enableLiveChecker = false; needPersist = true; }

  $el('autoSave').prop('checked', !!settings.autoSave);
  $el('autoFill').prop('checked', !!settings.autoFill);
  $el('autoFillOnLoad').prop('checked', !!settings.autoFillOnLoad);
  $el('lockTimeout').val(settings.lockTimeoutSeconds || 300);
  $el('enableLiveChecker').prop('checked', !!settings.enableLiveChecker);

  // show/hide autofill tutorial when autofill is enabled and not dismissed
  if (settings.autoFill && !settings.autofillTutorialDismissed) {
    $('#autofillTutorial').show();
  } else {
    $('#autofillTutorial').hide();
  }

  // persist defaults back to storage so other clients see the same defaults
  if (needPersist) {
    try { await send('setSettings', { settings }); } catch (e) { /* ignore */ }
  }

  // Load vault statistics
  const statsR = await send('getVaultStats');
  if (statsR.ok) {
    const stats = statsR.stats;
    $el('statTotalCredentials').text(stats.totalCredentials);
    $el('statUniqueDomains').text(stats.uniqueDomains);
    $el('statVaultSize').text(formatBytes(stats.vaultSize));
    $el('statLastModified').text(stats.lastModified ? new Date(stats.lastModified).toLocaleDateString() : 'Never');
  }
  // query session-scoped stay-unlocked state
  try {
    const ss = await send('getStayUnlockedSession');
    if (ss && typeof ss.value !== 'undefined') {
      $el('stayUnlockedSession').prop('checked', !!ss.value);
      $el('keepAliveEnabled').prop('checked', !!ss.value);
    } else {
      $el('stayUnlockedSession').prop('checked', false);
      $el('keepAliveEnabled').prop('checked', false);
    }
  } catch (e) {
    $el('stayUnlockedSession').prop('checked', false);
    $('#touch').removeClass('is-active');
  }
}

// Save settings
async function saveSettings() {
  const newSettings = {
    autoSave: $el('autoSave').prop('checked'),
    autoFill: $el('autoFill').prop('checked'),
    autoFillOnLoad: $el('autoFillOnLoad').prop('checked'),
    lockTimeoutSeconds: parseInt($el('lockTimeout').val()) || 300,
    enableLiveChecker: $el('enableLiveChecker').prop('checked')
  };
  // merge with any existing flags (don't clobber tutorial dismiss flag etc.)
  const merged = Object.assign({}, settings || {}, newSettings);
  const r = await send('setSettings', { settings: merged });
  if (r.ok) {
    settings = merged;
    // reflect tutorial visibility immediately after saving
    if (merged.autoFill && !merged.autofillTutorialDismissed) $('#autofillTutorial').show(); else $('#autofillTutorial').hide();
    alert('Settings saved!');
    // notify tabs so content scripts can react to changes (e.g., live checker)
    try {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(t => {
          try {
            // only send to regular web pages where content scripts can be injected
            if (!t || !t.url || !/^https?:/.test(t.url)) return;
            const p = chrome.tabs.sendMessage(t.id, { action: 'settingsChanged' });
            if (p && typeof p.then === 'function') p.catch(() => {});
          } catch (e) { /* ignore */ }
        });
      });
    } catch (e) { /* ignore */ }
  } else {
    alert('Failed to save settings');
  }
}

// Password generation
function generatePassword(length, options) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let chars = '';
  if (options.upper) chars += upper;
  if (options.lower) chars += lower;
  if (options.numbers) chars += numbers;
  if (options.symbols) chars += symbols;

  if (!chars) return '';

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Enhanced password strength calculation with better scoring logic
function calculateStrength(password) {
  if (!password) return { level: 'Empty', color: '#95a5a6', width: '0%', score: 0, feedback: [] };
  
  let score = 0;
  let feedback = [];
  let penalties = 0;

  // Length scoring (exponential)
  if (password.length >= 8) {
    score += 2;
    if (password.length >= 12) {
      score += 2;
      if (password.length >= 16) {
        score += 2;
        if (password.length >= 20) {
          score += 2;
        }
      }
    }
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  else feedback.push('Add special characters (!@#$%^&*)');

  // Bonus for mixing different character types
  const types = [/\d/.test(password), /[a-z]/.test(password), /[A-Z]/.test(password), /[^A-Za-z0-9]/.test(password)];
  const typeCount = types.filter(Boolean).length;
  if (typeCount >= 3) score += 1;
  if (typeCount >= 4) score += 1;

  // Penalties for common patterns
  if (/(.)\1{2,}/.test(password)) { // Repeated characters
    penalties += 2;
    feedback.push('Avoid repeated characters');
  }
  
  if (/^(password|123|abc|qwerty|admin|letmein)/i.test(password)) { // Common patterns
    penalties += 3;
    feedback.push('Avoid common words and patterns');
  }
  
  if (/^(19|20)\d\d/.test(password)) { // Years
    penalties += 1;
    feedback.push('Avoid using years');
  }
  
  if (/123|abc|qwe|asd|zxc/i.test(password)) { // Sequences
    penalties += 2;
    feedback.push('Avoid sequential characters');
  }

  // Final score calculation (0-10 scale)
  let finalScore = Math.max(0, score - penalties);
  
  // Convert to percentage (0-100)
  const percentage = Math.min(100, Math.round((finalScore / 10) * 100));

  // Determine strength level and visual properties
  if (percentage === 0) {
    return { level: 'Empty', color: '#95a5a6', width: '0%', score: percentage, feedback };
  } else if (percentage < 30) {
    return { level: 'Very Weak', color: '#e74c3c', width: '25%', score: percentage, feedback };
  } else if (percentage < 50) {
    return { level: 'Weak', color: '#e67e22', width: '40%', score: percentage, feedback };
  } else if (percentage < 70) {
    return { level: 'Fair', color: '#f39c12', width: '60%', score: percentage, feedback };
  } else if (percentage < 85) {
    return { level: 'Good', color: '#27ae60', width: '80%', score: percentage, feedback };
  } else {
    return { level: 'Strong', color: '#2ecc71', width: '100%', score: percentage, feedback };
  }
}

// numeric strength 0-100 (compatible with calculateStrength categories)
function getStrengthPct(password) {
  if (!password) return 0;
  const result = calculateStrength(password);
  return result.score;
}

// Check password strength with detailed feedback
function checkPasswordStrength(password) {
  const result = calculateStrength(password);
  return { strength: result.score, feedback: result.feedback };
}

// Estimate password crack time with improved accuracy
function estimateCrackTimeLocal(password) {
  if (!password) return { seconds: 0, display: '<1s' };
  
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
  
  // Modern GPU can do ~1e11 guesses/sec for SHA-256
  // Use more conservative estimate for real-world scenarios
  const guessesPerSec = 1e10;
  const seconds = guesses / guessesPerSec;
  
  let display;
  if (seconds < 1) display = '<1s';
  else if (seconds < 60) display = Math.round(seconds) + 's';
  else if (seconds < 3600) display = Math.round(seconds/60) + 'm';
  else if (seconds < 86400) display = Math.round(seconds/3600) + 'h';
  else if (seconds < 31536000) display = Math.round(seconds/86400) + 'd';
  else if (seconds < 315360000) display = Math.round(seconds/31536000) + 'y';
  else display = Math.round(seconds/3153600000) / 10 + ' centuries';
  
  return { seconds, display };
}


function escapeHtml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function estimateCrackTimeLocal(password) {
  if (!password) return { seconds: 0, display: '<1s' };
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^A-Za-z0-9]/.test(password)) pool += 32;
  if (pool === 0) pool = 1;
  const entropy = Math.log2(Math.pow(pool, password.length));
  const guesses = Math.pow(2, entropy);
  const guessesPerSec = 1e9;
  const seconds = guesses / guessesPerSec;
  let display;
  if (seconds < 1) display = '<1s';
  else if (seconds < 60) display = Math.round(seconds) + 's';
  else if (seconds < 3600) display = Math.round(seconds/60) + 'm';
  else if (seconds < 86400) display = Math.round(seconds/3600) + 'h';
  else if (seconds < 31536000) display = Math.round(seconds/86400) + 'd';
  else display = Math.round(seconds/31536000) + 'y';
  return { seconds, display };
}

async function runHealthCheck() {
  try {
    // try unlocked path first
    let r = await send('exportVaultAsJson');
    let vault = null;
    if (r && r.ok && r.data) {
      vault = r.data;
    } else {
      // prompt for master password to decrypt
      const pw = prompt('Enter master password to run Security Health Check:');
      if (!pw) { showStatusMsg('Health check cancelled', 'is-info'); return; }
      const r2 = await send('exportVault', { password: pw });
      if (!r2 || !r2.ok || !r2.data) { showStatusMsg('Unable to decrypt vault with provided password', 'is-danger'); return; }
      vault = r2.data;
    }

    if (!Array.isArray(vault)) {
      showStatusMsg('Unexpected vault format', 'is-danger');
      return;
    }

    // analyze
    const passMap = {};
    vault.forEach(c => { passMap[c.password] = (passMap[c.password] || 0) + 1; });
    const reused = Object.values(passMap).filter(n => n > 1).length;
    const items = vault.map(c => ({ ...c, pct: getStrengthPct(c.password), crack: estimateCrackTimeLocal(c.password) }));
    const weak = items.filter(i => i.pct < 50).sort((a,b)=>a.pct - b.pct);

    document.getElementById('healthSummary').textContent = `Analyzed ${vault.length} credentials — reused passwords: ${reused} — weak: ${weak.length}`;
    const list = document.getElementById('healthList'); list.innerHTML = '';
    weak.slice(0,50).forEach(i => {
      const div = document.createElement('div');
      div.className = 'box';
      div.style.marginBottom = '8px';
      div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
        <div><div style="font-weight:700">${escapeHtml(i.domain)} — ${escapeHtml(i.username)}</div>
        <div style="font-size:12px;color:var(--warm-gray)">Score: ${i.pct}/100 — Crack: ${i.crack.display}</div></div>
        <div style="display:flex;gap:8px;align-items:center;"><button class="button is-small lv-btn-accent edit-health-btn" data-domain="${escapeHtml(i.domain)}" data-username="${escapeHtml(i.username)}">Improve</button></div>
      </div>`;
      list.appendChild(div);
    });

    // wire improve
    Array.from(document.getElementsByClassName('edit-health-btn')).forEach(btn=>{
      btn.onclick = async function(){
        const domain = this.getAttribute('data-domain');
        const username = this.getAttribute('data-username');
        const resp = await send('getCredentialsForDomain', { domain });
        if (resp && resp.ok) {
          const found = (resp.credentials||[]).find(x=>x.username===username);
          if (found) {
            const credResp = await send('getCredentialById', { id: found.id });
            if (credResp && credResp.ok) {
              const c = credResp.credential;
              window._editingCredentialId = c.id;
              document.getElementById('editSiteInput').value = c.domain;
              document.getElementById('editUserInput').value = c.username;
              document.getElementById('editPassInput').value = c.password;
              document.getElementById('editTagsInput').value = c.tags || '';
              document.getElementById('editNotesInput').value = c.notes || '';
              const modal = document.getElementById('editCredentialModal'); modal.style.display = 'block'; modal.classList.add('is-active');
            }
          }
        }
      };
    });

    // Render charts (pie, donut, bar) using local chart helper if available
    try {
      if (window.OpenVaultCharts) {
        const pieContainer = document.getElementById('healthPie');
        const donutContainer = document.getElementById('healthDonut');
        const barContainer = document.getElementById('healthBar');
        const strongCount = vault.length - weak.length;
        const segments = [
          { label: 'Weak', value: weak.length, color: '#f14668' },
          { label: 'Reused', value: reused, color: '#f39c12' },
          { label: 'Strong', value: strongCount > 0 ? strongCount : 0, color: '#27ae60' }
        ];
        if (pieContainer) OpenVaultCharts.drawPie(pieContainer, segments, { size: 160 });
        const avgPct = items.reduce((s,i)=>s+i.pct,0) / (items.length || 1);
        if (donutContainer) OpenVaultCharts.drawDonut(donutContainer, avgPct, { size: 80, color: avgPct>75? '#27ae60' : avgPct>50? '#f39c12' : '#f14668' });
        const buckets = [0,0,0,0];
        items.forEach(i=>{
          if (i.pct < 25) buckets[0]++;
          else if (i.pct < 50) buckets[1]++;
          else if (i.pct < 75) buckets[2]++;
          else buckets[3]++;
        });
        if (barContainer) OpenVaultCharts.drawBar(barContainer, ['<25','25-49','50-74','75+'], buckets, { color: '#60A5FA', width: barContainer.clientWidth, height: 120 });
      }
    } catch (chartErr) {
      console.warn('Chart render failed', chartErr);
    }

  } catch (e) {
    console.error(e);
    showStatusMsg('Health check failed: ' + (e.message || String(e)), 'is-danger');
  }
}

document.getElementById('runHealthCheckBtn')?.addEventListener('click', runHealthCheck);
document.getElementById('refreshHealthBtn')?.addEventListener('click', runHealthCheck);

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Event listeners
$(document).ready(async () => {
  // hide all UI initially so the popup stays blank during DB initialization
  try {
    $('#fallback').hide();
    $('#app').hide();
    $('#onboardView').hide();
    $('#lockedView').hide();
    $('#unlockedView').hide();
  } catch (e) { /* ignore if elements missing */ }

  await refreshStatus();

  // Master password
  $el('masterBtn').on('click', async () => {
    // prevent default form submission and disable to avoid duplicate attempts
    try {
      const pw = $el('masterInput').val().trim();
      if (!pw) {
        showStatusMsg('Please enter a master password', 'is-danger');
        return;
      }
      $el('masterBtn').prop('disabled', true).addClass('is-loading');
      $el('busySpinner').show();
      const s = await send('status');
      let r;
      if (!s.hasVault) {
        r = await send('createVault', { password: pw });
      } else {
        r = await send('unlock', { password: pw });
      }
      if (r && r.ok) {
        showUnlocked();
        showStatusMsg('Vault unlocked successfully!', 'is-success');
        // clear password only on success
        $el('masterInput').val('');
      } else {
        if (r && r.error && String(r.error).includes('HMAC verification failed')) {
          showStatusMsg('Vault data appears corrupted. Try resetting the vault.', 'is-danger');
          $el('resetVaultLink').show();
        } else {
          showStatusMsg((r && r.error) || 'Authentication failed', 'is-danger');
        }
        // keep the typed password so user can correct without retyping fully
      }
    } catch (e) {
      showStatusMsg('An error occurred: ' + String(e), 'is-danger');
    } finally {
      $el('busySpinner').hide();
      $el('masterBtn').prop('disabled', false).removeClass('is-loading');
    }
  });

  // Lock vault
  $el('lockBtn').on('click', async () => {

    await send('lock');
    showLocked(true);
  });

  // Utility function for status messages
  function showStatusMsg(message, type = 'is-info') {
    $el('statusMsg').removeClass('is-info is-success is-danger is-warning').addClass(type).text(message).show();
  }
  // expose to global in case other contexts or inline handlers call it
  window.showStatusMsg = showStatusMsg;

  // Switch to unlock existing vault
  $el('switchToUnlock').on('click', (e) => {
    e.preventDefault();
    $el('onboardView').hide();
    showLocked(true);
  });

  // Feedback button
  $('#feedbackBtn').on('click', (e) => {
    e.preventDefault();
    try {
      window.open('mailto:feedback@openvault.example?subject=OpenVault%20Feedback');
    } catch (err) {
      alert('Please send feedback to feedback@openvault.example');
    }
  });

  // Reset vault link
  $el('resetVaultLink').on('click', async (e) => {
    e.preventDefault();
    if (confirm('This will permanently delete all vault data. Are you sure?')) {
      try {
        const r = await send('resetVault');
        if (r.ok) {
          showStatusMsg('Vault reset successfully. You can now create a new vault.', 'is-success');
          setTimeout(() => refreshStatus(), 1500);
        } else {
          showStatusMsg('Failed to reset vault', 'is-danger');
        }
      } catch (e) {
        showStatusMsg('Error resetting vault: ' + String(e), 'is-danger');
      }
    }
  });

  // Add credential
  $el('addBtn').on('click', () => {
    if (!unlocked) return;
    addCredential();
  });

  // Add credential for current domain: pre-fill site and open add form
  $el('addForCurrentBtn').on('click', async () => {
    if (!unlocked) return;
    const domain = currentDomain || '';
    let detectedUser = '';
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs[0]) {
        const resp = await chrome.tabs.sendMessage(tabs[0].id, { action: 'detectUsername' });
        if (resp && resp.ok && resp.username) detectedUser = resp.username;
      }
    } catch (e) {
      // ignore
    }
    $el('siteInput').val(domain);
    $el('userInput').val(detectedUser);
    if (!$('#addFormContent').is(':visible')) toggleAddForm();
    setTimeout(() => { $el('userInput').focus(); }, 120);
  });

  // Settings
  $el('autoSave').on('change', saveSettings);

  $el('autoFill').on('change', saveSettings);
  $el('autoFillOnLoad').on('change', saveSettings);

  $el('lockTimeout').on('change', saveSettings);

  // Live checker toggle binding
  $el('enableLiveChecker').on('change', saveSettings);

  // Save settings button
  $('#saveSettingsBtn').on('click', (e) => { e.preventDefault(); saveSettings(); });

  // Autofill tutorial actions
  $('#openChromePasswordsBtn').on('click', () => {
    try {
      chrome.tabs.create({ url: 'chrome://password-manager/settings' });
    } catch (e) {
      // fallback
      window.open('chrome://settings/passwords', '_blank');
    }
  });

  // Export/Import
  $el('exportBtn').on('click', async () => {
    // Require re-entry of master password to export plaintext passwords
    const pw = prompt('Re-enter master password to export vault (plaintext):');
    if (!pw) return;
    const r = await send('exportVault', { password: pw });
    if (r.ok && r.data) {
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openvault-plaintext-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (r.ok && r.package) {
      // fallback: encrypted package
      const blob = new Blob([JSON.stringify(r.package, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'openvault-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Failed to export vault');
    }
  });

  // exportJsonBtn removed from UI

  $el('viewAuditBtn').on('click', async () => {
    const r = await send('getAuditLog');
    if (r.ok) {
      const logText = r.log.map(entry => 
        `${new Date(entry.timestamp).toLocaleString()}: ${entry.action} - ${entry.details}`
      ).join('\n');
      alert('Audit Log:\n\n' + logText);
    } else {
      alert('Failed to load audit log');
    }
  });

  $el('clearAuditBtn').on('click', async () => {
    if (!confirm('This will permanently delete all audit log entries. Are you sure?')) return;
    const r = await send('clearAuditLog');
    if (r.ok) {
      alert('Audit log cleared successfully');
    } else {
      alert('Failed to clear audit log');
    }
  });

  $el('importBtn').on('click', () => {
    $el('fileInput').click();
  });

  $el('fileInput').on('change', async function() {
    const file = this.files[0];
    if (!file) return;

    const password = prompt('Enter the master password for the imported vault:');
    if (!password) return;

    try {
      const text = await file.text();
      const pkg = JSON.parse(text);
      const r = await send('importVault', { package: pkg, sourcePassword: password });
      if (r.ok) {
        alert('Vault imported successfully!');
        loadList();
      } else {
        alert('Import failed: ' + (r.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Invalid file format');
    }
  });

  // Clear database via modal (requires master password confirmation)
  $el('clearDatabaseBtn').on('click', () => {
    $el('confirmResetPassword').val('');
    // show modal (using Bulma-compatible classes if present)
    const modal = $('#confirmResetModal');
    modal.show().addClass('is-active');
    setTimeout(() => { $el('confirmResetPassword').focus(); }, 50);
  });

  // Modal cancel
  $('#confirmResetCancel').on('click', () => {
    const modal = $('#confirmResetModal');
    modal.removeClass('is-active').hide();
  });

  // Edit modal cancel
  $('#editCredentialCancel').on('click', () => {
    const modal = $('#editCredentialModal');
    modal.removeClass('is-active').hide();
    window._editingCredentialId = null;
  });

  // Edit modal save
  $('#editCredentialSave').on('click', async () => {
    const id = window._editingCredentialId;
    if (!id) return;
    const domain = $el('editSiteInput').val().trim();
    const username = $el('editUserInput').val().trim();
    const password = $el('editPassInput').val().trim();
    const tags = $el('editTagsInput').val().trim();
    const notes = $el('editNotesInput').val().trim();
    if (!domain || !username || !password) {
      alert('Please fill site, username, and password');
      return;
    }
    try {
      const r = await send('updateCredential', { id, domain, username, password, tags, notes });
      if (r.ok) {
        $('#editCredentialModal').removeClass('is-active').hide();
        window._editingCredentialId = null;
        loadList();
      } else {
        alert('Failed to update credential');
      }
    } catch (e) {
      alert('Error updating credential');
    }
  });

  // Modal submit — verify password then reset
  $('#confirmResetSubmit').on('click', async () => {
    const pw = $el('confirmResetPassword').val().trim();
    if (!pw) {
      alert('Please enter your master password');
      return;
    }
    $('#confirmResetSubmit').prop('disabled', true);
    try {
      const verify = await send('unlock', { password: pw });
      if (!verify.ok) {
        alert('Password incorrect — aborting.');
        return;
      }
      if (!confirm('This will permanently delete all vault data. Are you absolutely sure?')) return;
      const r = await send('resetVault');
      if (r.ok) {
        alert('Database cleared. The extension will show the onboarding screen.');
        $('#confirmResetModal').removeClass('is-active').hide();
        setTimeout(() => refreshStatus(), 500);
      } else {
        alert('Failed to clear database');
      }
    } catch (e) {
      alert('Error clearing database: ' + String(e));
    } finally {
      $('#confirmResetSubmit').prop('disabled', false);
    }
  });

  // Password generator
  $el('genLen').on('input', function() {
    const v = $(this).val();
    $el('genLenOutput').text(v);
    // keep numeric input in sync
    const num = document.getElementById('genLenNumber');
    if (num) num.value = v;
  });

  // numeric length input sync with slider
  $('#genLenNumber').on('input', function() {
    const v = $(this).val();
    const slider = $el('genLen');
    if (slider.length) slider.val(v);
    $el('genLenOutput').text(v);
  });

  $el('generateBtn').on('click', () => {
    // prefer numeric input for precise control
    const length = parseInt($el('genLenNumber').val()) || parseInt($el('genLen').val());
    const options = {
      upper: $el('genUpper').prop('checked'),
      lower: $el('genLower').prop('checked'),
      numbers: $el('genNumbers').prop('checked'),
      symbols: $el('genSymbols').prop('checked')
    };

    const password = generatePassword(length, options);
    $el('generatedPass').val(password);

    const strength = calculateStrength(password);
    $el('strengthFill').css({ width: strength.width, backgroundColor: strength.color });
    $el('strengthText').text(`Password strength: ${strength.level}`);
  });

  $el('copyGenBtn').on('click', async () => {
    const password = $el('generatedPass').val();
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      alert('Password copied to clipboard!');
    } catch (e) {
      alert('Failed to copy password');
    }
  });

  // Generate button in add form
  $el('genBtn').on('click', () => {
    switchTab('generator');
  });

  // Password strength checker
  function checkPasswordStrength(password) {
    let strength = 0;
    let feedback = [];

    if (password.length >= 8) strength++;
    else feedback.push('At least 8 characters');

    if (/[a-z]/.test(password)) strength++;
    else feedback.push('Lowercase letter');

    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('Uppercase letter');

    if (/[0-9]/.test(password)) strength++;
    else feedback.push('Number');

    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push('Special character');

    return { strength, feedback };
  }

  // Real-time password validation
  $el('onboardMaster').on('input', function() {
    const password = $(this).val();
    const { strength } = checkPasswordStrength(password);

    const icon = $el('masterStrengthIcon');
    const text = $el('masterStrengthText');
    const button = $el('onboardSetBtn');

    if (password.length === 0) {
      // Empty - gray state
      icon.removeClass('has-text-success has-text-warning has-text-danger has-text-info').addClass('has-text-grey');
      // swap to times (neutral)
      icon.html(window.SVG_TIMES);
      text.text('Password strength: Weak').removeClass('has-text-success has-text-warning has-text-danger has-text-info');
      button.removeClass('btn-weak btn-fair btn-good btn-strong').addClass('btn-weak');
    } else if (strength <= 1) {
      // Weak - red state
      icon.removeClass('has-text-success has-text-warning has-text-info').addClass('has-text-danger');
      icon.html(window.SVG_EXCLAM);
      text.text('Password strength: Weak').removeClass('has-text-success has-text-warning has-text-info').addClass('has-text-danger');
      button.removeClass('btn-fair btn-good btn-strong').addClass('btn-weak');
    } else if (strength <= 2) {
      // Fair - orange state
      icon.removeClass('has-text-success has-text-danger has-text-info').addClass('has-text-warning');
      icon.html(window.SVG_EXCLAM);
      text.text('Password strength: Fair').removeClass('has-text-success has-text-danger has-text-info').addClass('has-text-warning');
      button.removeClass('btn-weak btn-good btn-strong').addClass('btn-fair');
    } else if (strength <= 3) {
      // Good - light green state
      icon.removeClass('has-text-success has-text-danger has-text-warning').addClass('has-text-info');
      icon.html(window.SVG_CHECK);
      text.text('Password strength: Good').removeClass('has-text-success has-text-danger has-text-warning').addClass('has-text-info');
      button.removeClass('btn-weak btn-fair btn-strong').addClass('btn-good');
    } else {
      // Strong - dark green state
      icon.removeClass('has-text-warning has-text-danger has-text-info').addClass('has-text-success');
      icon.html(window.SVG_CHECK);
      text.text('Password strength: Strong').removeClass('has-text-warning has-text-danger has-text-info').addClass('has-text-success');
      button.removeClass('btn-weak btn-fair btn-good').addClass('btn-strong');
    }

    validateOnboardForm();
  });

  $el('onboardConfirm').on('input', function() {
    const master = $el('onboardMaster').val();
    const confirm = $(this).val();

    const icon = $el('confirmMatchIcon');
    const text = $el('confirmMatchText');

    if (confirm.length === 0) {
      icon.removeClass('has-text-success has-text-danger').addClass('has-text-grey');
      icon.html(window.SVG_TIMES);
      text.text('Passwords must match').removeClass('has-text-success has-text-danger');
    } else if (master === confirm) {
      icon.removeClass('has-text-danger has-text-grey').addClass('has-text-success');
      icon.html(window.SVG_CHECK);
      text.text('Passwords match').removeClass('has-text-danger has-text-grey').addClass('has-text-success');
    } else {
      icon.removeClass('has-text-success has-text-grey').addClass('has-text-danger');
      icon.html(window.SVG_TIMES);
      text.text('Passwords do not match').removeClass('has-text-success has-text-grey').addClass('has-text-danger');
    }

    validateOnboardForm();
  });

  function validateOnboardForm() {
    const master = $el('onboardMaster').val();
    const confirm = $el('onboardConfirm').val();

    // Simplified validation: just require 8+ chars and matching passwords
    const isValid = master.length >= 8 && master === confirm && master.length > 0;

    if (isValid) {
      $el('onboardSetBtn').prop('disabled', false).removeClass('is-disabled');
    } else {
      $el('onboardSetBtn').prop('disabled', true).addClass('is-disabled');
    }
  }

  $el('onboardSetBtn').on('click', async (e) => {
    e.preventDefault(); // Prevent form submission
    const pw = $el('onboardMaster').val().trim();
    const conf = $el('onboardConfirm').val().trim();

    if (!pw) {
      showOnboardError('Please enter a master password');
      return;
    }
    if (pw !== conf) {
      showOnboardError('Passwords do not match');
      return;
    }

    const { strength } = checkPasswordStrength(pw);
    if (pw.length < 8) {
      showOnboardError('Password must be at least 8 characters long.');
      return;
    }

    $el('onboardSetBtn').addClass('is-loading').prop('disabled', true);

    try {
      const r = await send('createVault', { password: pw });
      if (r.ok) {
        $el('onboardView').hide();
        showUnlocked();
      } else {
        showOnboardError('Failed to create vault');
      }
    } catch (e) {
      showOnboardError('An error occurred while creating the vault');
    } finally {
      $el('onboardSetBtn').removeClass('is-loading').prop('disabled', false);
    }
  });

  function showOnboardError(message) {
    $el('onboardErrorText').text(message);
    $el('onboardError').show();
  }

  // Help and Audit
  $el('helpBtn').on('click', () => {
    window.open(chrome.runtime.getURL('help.html'), '_blank');
  });

  $el('auditBtn').on('click', () => {
    window.open(chrome.runtime.getURL('audit.html'), '_blank');
  });

  // header reset removed (moved into settings)

  // Open settings button in popup (for quick access)
  $el('openSettingsBtn').on('click', async () => {
    switchTab('settings');
  });
  
  // Bind add form header click (removed inline onclick for CSP compliance)
  $('#addFormHeader').on('click', toggleAddForm);

  // Hide settings tab when locked, show when unlocked

  // Password visibility toggle — swap inline SVGs rather than FontAwesome classes
  $('.password-toggle').on('click', function() {
    const targetId = $(this).data('target');
    const input = $('#' + targetId);
    if (input.attr('type') === 'password') {
      input.attr('type', 'text');
      $(this).html(window.SVG_EYE_SLASH);
    } else {
      input.attr('type', 'password');
      $(this).html(window.SVG_EYE);
    }
  });

  // Keyboard shortcuts (use keyup to avoid composition/IME timing issues)
  $(document).on('keyup', (e) => {
    if (e.key === 'Enter') {
      if ($('#masterInput').is(':focus')) {
        $el('masterBtn').click();
      } else if ($('#siteInput, #userInput, #passInput').is(':focus')) {
        addCredential();
      }
    }
  });

  // No automatic fallback UI during initialization — keep views controlled by refreshStatus
});
