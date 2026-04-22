type DomainConfig = {
  domain: string;
  pattern: string;
};

const CONTENT_SCRIPT_ID = 'tfc-content-script';
const STORAGE_KEY = 'tfc_enabled_domains';
const LOG_KEY = 'tfc_debug_logs';

export {};

function log(msg: string) {
  const entry = `[${new Date().toISOString()}] ${msg}`;
  chrome.storage.local.get(LOG_KEY, (result) => {
    const logs: string[] = (result[LOG_KEY] as string[]) || [];
    logs.push(entry);
    if (logs.length > 100) logs.splice(0, logs.length - 100);
    chrome.storage.local.set({ [LOG_KEY]: logs });
  });
}

function getScriptId(domain: string): string {
  return `${CONTENT_SCRIPT_ID}-${domain}`;
}

function domainToPattern(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${clean}/*`;
}

async function getEnabledDomains(): Promise<DomainConfig[]> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as DomainConfig[]) || [];
}

async function saveEnabledDomains(domains: DomainConfig[]): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: domains });
}

async function ensureDomainRegistered(domain: string): Promise<boolean> {
  try {
    const pattern = domainToPattern(domain);
    const id = getScriptId(domain);

    log('ensureDomainRegistered called for ' + domain);

    const domains = await getEnabledDomains();
    const alreadySaved = domains.some((d) => d.domain === domain);

    try {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
      if (existing && existing.length > 0 && alreadySaved) {
        log('Already registered ' + domain);
        return true;
      }
    } catch (e: any) {
      log('getRegisteredContentScripts error: ' + (e?.message || e));
    }

    try {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    } catch (e: any) {
      log('unregisterContentScripts error (ignoring): ' + (e?.message || e));
    }

    log('Registering content script for ' + domain + ' pattern: ' + pattern);
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
    log('Content script registered for ' + domain);

    const filtered = domains.filter((d) => d.domain !== domain);
    filtered.push({ domain, pattern });
    await saveEnabledDomains(filtered);
    log('Domain saved to storage: ' + domain);

    return true;
  } catch (err: any) {
    log('Failed to register domain ' + domain + ': ' + (err?.message || err));
    return false;
  }
}

async function unregisterDomain(domain: string): Promise<boolean> {
  try {
    const id = getScriptId(domain);
    const pattern = domainToPattern(domain);

    try {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    } catch {
      // ignore
    }

    try {
      await chrome.permissions.remove({ origins: [pattern] });
    } catch {
      // ignore
    }

    const domains = await getEnabledDomains();
    const filtered = domains.filter((d) => d.domain !== domain);
    await saveEnabledDomains(filtered);

    return true;
  } catch (err: any) {
    log('Failed to unregister domain ' + domain + ': ' + (err?.message || err));
    return false;
  }
}

async function reRegisterAllScripts(): Promise<void> {
  const domains = await getEnabledDomains();
  log('reRegisterAllScripts, domains: ' + domains.length);
  for (const { domain, pattern } of domains) {
    const id = getScriptId(domain);
    try {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
      if (existing && existing.length > 0) continue;

      const hasPerm = await chrome.permissions.contains({ origins: [pattern] });
      if (!hasPerm) {
        const filtered = domains.filter((d) => d.domain !== domain);
        await saveEnabledDomains(filtered);
        continue;
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
      log('Re-registered ' + domain);
    } catch (err: any) {
      log('Failed to re-register ' + domain + ': ' + (err?.message || err));
    }
  }
}

// Auto-register whenever permission is granted
chrome.permissions.onAdded.addListener(async (permissions) => {
  log('onAdded fired! origins: ' + JSON.stringify(permissions.origins));
  if (!permissions.origins?.length) return;

  for (const origin of permissions.origins) {
    const domain = origin.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const domains = await getEnabledDomains();
    if (domains.some((d) => d.domain === domain)) {
      log('Domain already registered, skipping ' + domain);
      continue;
    }

    log('Permission granted for ' + domain + ' - auto-registering');
    await ensureDomainRegistered(domain);
  }
});

// Handle permission revoked externally
chrome.permissions.onRemoved.addListener(async (permissions) => {
  if (!permissions.origins?.length) return;
  const domains = await getEnabledDomains();
  const removed: string[] = [];
  for (const { domain, pattern } of domains) {
    if (permissions.origins!.includes(pattern)) {
      removed.push(domain);
    }
  }
  if (removed.length) {
    const filtered = domains.filter((d) => !removed.includes(d.domain));
    await saveEnabledDomains(filtered);
  }
});

// Alarm handler: wakes up SW to register content scripts after permission grant
// This survives service worker termination, unlike onAdded
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('tfc-recover-')) return;

  const domain = alarm.name.replace('tfc-recover-', '');
  log('Alarm fired for domain: ' + domain);

  const pattern = domainToPattern(domain);
  const hasPerm = await chrome.permissions.contains({ origins: [pattern] });
  log('Permission check for ' + domain + ': ' + hasPerm);

  if (hasPerm) {
    const ok = await ensureDomainRegistered(domain);
    log('Alarm recovery for ' + domain + ': ' + (ok ? 'success' : 'failed'));
  } else {
    log('Alarm recovery for ' + domain + ': permission not granted');
  }

  // Clear pending flag regardless
  const PENDING_KEY = 'tfc_pending_domains';
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: { domain: string; pattern: string }[] = (result[PENDING_KEY] as any) || [];
  const filtered = pending.filter((p) => p.domain !== domain);
  await chrome.storage.local.set({ [PENDING_KEY]: filtered });
});

// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Skip logging internal/noise messages to avoid ballooning and race conditions
  if (message.type !== 'get-logs' && message.type !== 'clear-logs') {
    log('Background received message: ' + message.type);
  }
  if (message.type === 'unregister-domain') {
    unregisterDomain(message.domain).then((ok) => {
      sendResponse({ success: ok });
    });
    return true;
  }
  if (message.type === 'get-domains') {
    getEnabledDomains().then((domains) => {
      sendResponse({ domains });
    });
    return true;
  }
  if (message.type === 'log') {
    log('Popup: ' + message.msg);
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === 'get-logs') {
    chrome.storage.local.get(LOG_KEY, (result) => {
      sendResponse({ logs: (result[LOG_KEY] as string[]) || [] });
    });
    return true;
  }
  if (message.type === 'clear-logs') {
    chrome.storage.local.remove(LOG_KEY, () => {
      sendResponse({ cleared: true });
    });
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  log('onInstalled: ' + reason);
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
});

chrome.runtime.onStartup.addListener(() => {
  log('onStartup');
  reRegisterAllScripts();
});

log('Background script loaded');
reRegisterAllScripts();
