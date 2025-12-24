document.addEventListener('DOMContentLoaded', () => {
  async function loadAuditLog() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAuditLog' });
      if (response.ok) {
        displayLog(response.log);
      } else {
        document.getElementById('logContainer').innerHTML = '<p class="has-text-danger">Failed to load audit log</p>';
      }
    } catch (e) {
      document.getElementById('logContainer').innerHTML = '<p class="has-text-danger">Error loading audit log</p>';
    }
  }

  function displayLog(log) {
    const container = document.getElementById('logContainer');
    if (!log || log.length === 0) {
      container.innerHTML = '<p class="has-text-grey">No audit entries yet</p>';
      return;
    }

    container.innerHTML = log.map(entry => `
      <div class="box">
        <div class="level">
          <div class="level-left">
            <div class="level-item">
              <strong>${entry.action}</strong>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item">
              <small class="has-text-grey">${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          </div>
        </div>
        <p class="is-size-7">${entry.details || ''}</p>
      </div>
    `).join('');
  }

  document.getElementById('refreshBtn').addEventListener('click', loadAuditLog);

  document.getElementById('exportBtn').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'exportAuditLog' });
      if (response.ok) {
        const blob = new Blob([JSON.stringify(response.log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'openvault-audit-log.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('Failed to export audit log');
    }
  });

  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm('Clear all audit log entries?')) return;
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearAuditLog' });
      if (response.ok) {
        loadAuditLog();
      }
    } catch (e) {
      alert('Failed to clear audit log');
    }
  });

  loadAuditLog();
});
