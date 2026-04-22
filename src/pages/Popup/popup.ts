const CONTENT_SCRIPT_ID = 'tfc-content-script';
const STORAGE_KEY = 'tfc_enabled_domains';
const PENDING_KEY = 'tfc_pending_domains';

export {};

function log(msg: string) {
  chrome.runtime.sendMessage({ type: 'log', msg });
}

function getScriptId(domain: string): string {
  return `${CONTENT_SCRIPT_ID}-${domain}`;
}

function domainToPattern(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${clean}/*`;
}

async function setPending(domain: string, pattern: string) {
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: { domain: string; pattern: string }[] = (result[PENDING_KEY] as any) || [];
  const filtered = pending.filter((p) => p.domain !== domain);
  filtered.push({ domain, pattern });
  await chrome.storage.local.set({ [PENDING_KEY]: filtered });
}

async function clearPending(domain: string) {
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: { domain: string; pattern: string }[] = (result[PENDING_KEY] as any) || [];
  const filtered = pending.filter((p) => p.domain !== domain);
  await chrome.storage.local.set({ [PENDING_KEY]: filtered });
}

function scheduleRecoveryAlarm(domain: string) {
  chrome.alarms.create(`tfc-recover-${domain}`, { when: Date.now() + 3000 });
}

async function getEnabledDomains(): Promise<{ domain: string; pattern: string }[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'get-domains' }, (response) => {
      resolve(response?.domains || []);
    });
  });
}

async function ensureDomain(domain: string): Promise<boolean> {
  try {
    const pattern = domainToPattern(domain);
    const id = getScriptId(domain);

    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const domains: { domain: string; pattern: string }[] = (result[STORAGE_KEY] as any) || [];
    const alreadySaved = domains.some((d) => d.domain === domain);

    try {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
      if (existing && existing.length > 0 && alreadySaved) {
        return true;
      }
    } catch {
      // ignore
    }

    try {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    } catch {
      // ignore
    }

    await chrome.scripting.registerContentScripts([
      {
        id,
        matches: [pattern],
        js: ['contentScript.bundle.js'],
        css: ['content.styles.css'],
        runAt: 'document_idle',
        allFrames: true,
        world: 'ISOLATED',
      },
    ]);

    const filtered = domains.filter((d) => d.domain !== domain);
    filtered.push({ domain, pattern });
    await chrome.storage.sync.set({ [STORAGE_KEY]: filtered });

    return true;
  } catch (err) {
    console.error('Tasks for Canvas Redux: Failed to register', domain, err);
    return false;
  }
}

async function removeDomain(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'unregister-domain', domain }, (response) => {
      resolve(response?.success || false);
    });
  });
}

async function getActiveTabHostname(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length || !tabs[0].url) return null;
  try {
    const url = new URL(tabs[0].url);
    if (url.protocol !== 'https:') return null;
    return url.hostname;
  } catch {
    return null;
  }
}

async function isCanvasOnTab(): Promise<boolean> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length || !tabs[0].id) return false;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        const app = document.getElementById('application');
        return app ? app.classList.contains('ic-app') : false;
      },
    });
    return results[0]?.result === true;
  } catch {
    return false;
  }
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function setVisible(id: string, visible: boolean) {
  const el = $(id);
  if (el) el.classList.toggle('hidden', !visible);
}

async function refreshDomainList() {
  const domains = await getEnabledDomains();
  const listEl = $('domain-list') as HTMLUListElement;
  const noDomainsEl = $('no-domains');

  if (!listEl) return;
  listEl.innerHTML = '';

  if (domains.length === 0) {
    setVisible('no-domains', true);
  } else {
    setVisible('no-domains', false);
    for (const { domain } of domains) {
      const li = document.createElement('li');
      li.className = 'domain-item';
      li.innerHTML = `<span>${domain}</span><button data-domain="${domain}">Remove</button>`;
      listEl.appendChild(li);
    }

    listEl.querySelectorAll('button[data-domain]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const domain = (e.target as HTMLElement).getAttribute('data-domain');
        if (domain) {
          await removeDomain(domain);
          await refreshDomainList();
          await refreshCurrentSite();
        }
      });
    });
  }
}

async function showEnabledState(hostname: string) {
  const statusEl = $('site-status');
  setVisible('enable-btn', false);
  setVisible('disable-btn', true);
  if (statusEl) {
    statusEl.textContent = `Tasks sidebar is enabled on ${hostname}`;
    statusEl.className = 'status success';
  }

  const disableBtn = $('disable-btn') as HTMLButtonElement;
  if (disableBtn) {
    disableBtn.disabled = false;
    disableBtn.textContent = 'Disable on this site';
    disableBtn.onclick = async () => {
      disableBtn.disabled = true;
      disableBtn.textContent = 'Removing...';
      await removeDomain(hostname);
      await refreshDomainList();
      await refreshCurrentSite();
    };
  }
}

async function showEnableButton(hostname: string, pattern: string, looksLikeCanvas: boolean) {
  const statusEl = $('site-status');
  const enableBtn = $('enable-btn') as HTMLButtonElement;

  setVisible('enable-btn', true);
  setVisible('disable-btn', false);

  if (statusEl) {
    if (looksLikeCanvas) {
      statusEl.textContent = `This looks like Canvas (${hostname}). Enable the sidebar?`;
      statusEl.className = 'status info';
    } else {
      statusEl.textContent = `${hostname} doesn't look like Canvas, but you can still enable it.`;
      statusEl.className = 'status warning';
    }
  }

  if (!enableBtn) return;
  enableBtn.disabled = false;
  enableBtn.textContent = 'Enable on this site';

  enableBtn.onclick = async () => {
    log('Enable clicked for ' + hostname);
    enableBtn.disabled = true;
    enableBtn.textContent = 'Requesting permission...';

    // Set pending flag and alarm BEFORE requesting permissions
    await setPending(hostname, pattern);
    scheduleRecoveryAlarm(hostname);
    log('Set pending + alarm for ' + hostname);

    let granted = false;
    try {
      log('Calling chrome.permissions.request for ' + pattern);
      granted = await chrome.permissions.request({ origins: [pattern] });
      log('Permission request result: ' + granted);
    } catch (e: any) {
      log('Permission request error: ' + (e?.message || e));
      granted = false;
    }

    if (!granted) {
      log('Permission denied');
      await clearPending(hostname);
      if (statusEl) {
        statusEl.textContent = 'Permission denied.';
        statusEl.className = 'status warning';
      }
      enableBtn.disabled = false;
      enableBtn.textContent = 'Enable on this site';
      return;
    }

    // Popup stayed open — register now (alarm will also fire but is idempotent)
    log('Popup stayed open, calling ensureDomain');
    enableBtn.textContent = 'Enabling...';
    const ok = await ensureDomain(hostname);
    await clearPending(hostname);
    log('ensureDomain result: ' + ok);

    if (ok) {
      await refreshDomainList();
      await showEnabledState(hostname);
      if (statusEl) {
        statusEl.textContent = 'Enabled! Reload the Canvas page to see the sidebar.';
        statusEl.className = 'status success';
      }
    } else {
      log('ensureDomain failed');
      if (statusEl) {
        statusEl.textContent = 'Something went wrong. Try again.';
        statusEl.className = 'status warning';
      }
      enableBtn.disabled = false;
      enableBtn.textContent = 'Enable on this site';
    }
  };
}

async function refreshCurrentSite() {
  const hostname = await getActiveTabHostname();
  log('refreshCurrentSite, hostname: ' + hostname);
  if (!hostname) {
    setVisible('current-site-section', false);
    return;
  }

  setVisible('current-site-section', true);

  // 1. Already saved? Show enabled.
  const domains = await getEnabledDomains();
  if (domains.some((d) => d.domain === hostname)) {
    log('Domain already enabled: ' + hostname);
    await showEnabledState(hostname);
    return;
  }

  // 2. Permission granted but not registered? Auto-register now.
  const pattern = domainToPattern(hostname);
  const hasPermission = await chrome.permissions.contains({ origins: [pattern] });
  log('hasPermission for ' + hostname + ': ' + hasPermission);
  if (hasPermission) {
    const ok = await ensureDomain(hostname);
    log('Auto-register result for ' + hostname + ': ' + ok);
    if (ok) {
      await refreshDomainList();
      await showEnabledState(hostname);
      return;
    }
  }

  // 3. Not registered — show enable button
  const isCanvas = await isCanvasOnTab();
  const looksLikeCanvas = hostname.includes('canvas') || isCanvas;
  log('showing enable button for ' + hostname);
  await showEnableButton(hostname, pattern, looksLikeCanvas);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Recover any pending domains from a previous crashed/closed flow
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: { domain: string; pattern: string }[] = (result[PENDING_KEY] as any) || [];
  for (const { domain, pattern } of pending) {
    const hasPerm = await chrome.permissions.contains({ origins: [pattern] });
    if (hasPerm) {
      const ok = await ensureDomain(domain);
      if (ok) {
        await clearPending(domain);
      }
    }
  }

  await refreshDomainList();
  await refreshCurrentSite();

  const manualAddBtn = $('manual-add-btn') as HTMLButtonElement;
  const manualInput = $('manual-domain') as HTMLInputElement;

  if (manualAddBtn && manualInput) {
    manualAddBtn.onclick = async () => {
      const val = manualInput.value.trim();
      if (!val) return;
      manualAddBtn.disabled = true;
      manualAddBtn.textContent = 'Adding...';

      const pattern = `https://${val.replace(/^https?:\/\//, '').replace(/\/+$/, '')}/*`;

      await setPending(val, pattern);
      scheduleRecoveryAlarm(val);

      let granted = false;
      try {
        granted = await chrome.permissions.request({ origins: [pattern] });
      } catch {
        granted = false;
      }

      if (!granted) {
        await clearPending(val);
        manualAddBtn.disabled = false;
        manualAddBtn.textContent = 'Add';
        alert('Permission denied.');
        return;
      }

      const ok = await ensureDomain(val);
      await clearPending(val);
      manualAddBtn.disabled = false;
      manualAddBtn.textContent = 'Add';

      if (ok) {
        manualInput.value = '';
        await refreshDomainList();
      } else {
        alert('Failed to add domain.');
      }
    };
  }
});
