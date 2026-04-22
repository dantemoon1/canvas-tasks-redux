import { OptionsDefaults } from '../Content/modules/constants';
import Options from '../Content/modules/types/options';
import './index.css';

const storedUserOptions = Object.keys(OptionsDefaults);

function applyDefaults(options: Options): Options {
  return {
    ...OptionsDefaults,
    ...options,
  };
}

/* Set the logo and title to the GitHub repo */
function setStoreLinks() {
  const storeURL = 'https://github.com/dantemoon1/canvas-tasks-redux';

  Array.from(document.getElementsByTagName('a')).forEach((elem) => {
    if (elem.className === 'store-link') elem.href = storeURL;
  });
}

function createDropdownOption(label: string, cb: () => void): HTMLElement {
  const option = document.createElement('div');
  option.className = 'dropdown-option';
  option.textContent = label;
  option.onclick = cb;
  return option;
}

function setSelectedDropdownOption(
  label: string,
  dropdownId: string,
  selectedId: string
) {
  const selected = document.getElementById(selectedId);
  const dropdown = document.getElementById(dropdownId);
  if (selected?.firstChild) selected.firstChild.textContent = label;
  if (dropdown) dropdown.classList.add('hidden');
}

function setDropdown(
  keys: Record<string, number> | Record<string, string>,
  dropdownId: string,
  selectedId: string,
  cb?: (key: string) => void,
  cmp?: (a: string, b: string) => number
) {
  const weekdayDropdown = document.getElementById(dropdownId);
  const weekdaySelected = document.getElementById(selectedId);
  if (weekdaySelected && weekdayDropdown)
    weekdaySelected.onclick = () => {
      if (!weekdayDropdown.classList.contains('hidden'))
        weekdayDropdown.classList.add('hidden');
      else weekdayDropdown.classList.remove('hidden');
    };
  let iter = Object.keys(keys);
  if (cmp) iter = iter.sort();
  iter.forEach((w) => {
    weekdayDropdown?.appendChild(
      createDropdownOption(w, () => {
        setSelectedDropdownOption(w, dropdownId, selectedId);
        if (cb) cb(w);
      })
    );
  });
}

const weekdays: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

const ampm: Record<string, number> = {
  am: 0,
  pm: 12,
};

const hours: Record<string, number> = {};
for (let h = 1; h <= 12; h++) {
  hours[h] = h % 12;
}

const minutes: Record<string, number> = {};
for (let m = 0; m < 60; m++) {
  minutes[(m < 10 ? '0' : '') + m] = m;
}

const listLength: Record<string, number> = {};
for (let l = 4; l <= 10; l++) {
  listLength[l + ''] = l;
}

function setWeekdayDropdown() {
  setDropdown(
    weekdays,
    'weekdays-options',
    'weekday-selected',
    (key: string) => {
      chrome.storage.sync.set({
        start_date: Object.keys(weekdays).indexOf(key) + 1,
      });
    }
  );
}

function setHoursDropdown() {
  setDropdown(hours, 'hours-options', 'hours-selected', (key: string) => {
    chrome.storage.sync.set({
      start_hour: hours[key] + ampm[getSelectedAmPm()],
    });
  });
}

function getSelectedHours() {
  return document.getElementById('hours-selected')?.textContent?.trim() || '0';
}

function setListLengthDropdown() {
  setDropdown(
    listLength,
    'list-length-options',
    'list-length-selected',
    (key: string) => {
      chrome.storage.sync.set({
        default_list_length: listLength[key],
      });
    }
  );
}

function setMinutesDropdown() {
  setDropdown(
    minutes,
    'minutes-options',
    'minutes-selected',
    (key: string) => {
      chrome.storage.sync.set({
        start_minutes: minutes[key],
      });
    },
    (a, b) => parseInt(a) - parseInt(b)
  );
}

function setAmPmDropdown() {
  setDropdown(ampm, 'ampm-options', 'ampm-selected', (key: string) => {
    // set option
    chrome.storage.sync.set({
      start_hour: hours[getSelectedHours()] + ampm[key],
    });
  });
}

function getSelectedAmPm() {
  return document.getElementById('ampm-selected')?.textContent?.trim() || 'am';
}

const periods: Record<string, string> = {
  day: 'Day',
  three_day: 'ThreeDay',
  week: 'Week',
  month: 'Month',
};

function setSelectedPeriod(key: string) {
  const selected = document.getElementById(key);
  Object.keys(periods).forEach((p) => {
    document.getElementById(p)?.classList.remove('selected-period');
  });
  if (selected) {
    selected.classList.add('selected-period');
    const weekday = document.getElementById('weekday-dropdown');
    if (key !== 'week') weekday?.classList.add('hidden');
    else weekday?.classList.remove('hidden');
    const label = document.getElementById('start-label');
    if (label) {
      label.textContent = periods[key] + ' start';
    }
  }
}

function setPeriods() {
  Object.keys(periods).forEach((p) => {
    const pd = document.getElementById(p);
    if (pd)
      pd.onclick = () => {
        setSelectedPeriod(p);
        chrome.storage.sync.set({ period: periods[p] });
      };
  });
}

const booleanOptions: Record<string, string> = {
  'default-sidebar': 'sidebar',
  'active-rings': 'dash_courses',
  'due-date-headings': 'due_date_headings',
  'show-locked-assignments': 'show_locked_assignments',
  'show-confetti': 'show_confetti',
  'rolling-period': 'rolling_period',
  'custom-theme-color': 'theme_color',
  'show-needs-grading': 'show_needs_grading',
  'color-tabs': 'color_tabs',
  'long-overdue': 'show_long_overdue',
  'clock-24hr': 'clock_24hr',
  'show-rings': 'show_rings',
};

const invertedKeys = ['dash_courses', 'sidebar'];

function setBooleanOption(key: string, checked: boolean) {
  const updatedKey: Record<string, boolean> = {};
  updatedKey[key] = invertedKeys.includes(key) ? !checked : checked;
  chrome.storage.sync.set(updatedKey);
}

function toggleClass(className: string, elem: HTMLElement) {
  if (elem.classList.contains(className)) elem.classList.remove(className);
  else elem.classList.add(className);
}

function setCheckbox(key: string, checked: boolean) {
  if (checked) document.getElementById(key)?.classList.add('checked');
  else document.getElementById(key)?.classList.remove('checked');
}

// let selectedColor = '';
document
  .getElementById('color-choice')
  ?.addEventListener('input', (ev: Event) => {
    setThemeColor((ev?.target as HTMLInputElement).value);
  });

/* getPropertyValue() includes CSS formatting whitespace, so trim() is needed. */
const defaultColor = getComputedStyle(document.body)
  .getPropertyValue('--theme-default')
  .trim();

function debounce(func: (...args: string[]) => void, timeout = 300) {
  let timer: number;
  return (...args: string[]) => {
    clearTimeout(timer);
    timer = window.setTimeout(function (this: (...args: string[]) => void) {
      func.apply(this, args);
    }, timeout);
  };
}

const setThemeColor = debounce((color?: string) => {
  const colorChoice = document.getElementById('color-choice');
  // const check = document.getElementById('custom-theme-color');
  if (color) {
    if (colorChoice) (colorChoice as HTMLInputElement).value = color;
    chrome.storage.sync.set({
      theme_color: color,
    });
    document.body.style.setProperty('--bg-theme', color || defaultColor);
  } else {
    if (colorChoice) (colorChoice as HTMLInputElement).value = defaultColor;
    chrome.storage.sync.set({
      theme_color: 'var(--ic-brand-global-nav-bgd)',
    });
    document.body.style.setProperty('--bg-theme', defaultColor);
  }
});

function setRollingPeriodEffects() {
  const checkbox = document.getElementById('rolling-period');
  const startSelector = document.getElementById('start-selector');
  if (checkbox?.classList.contains('checked')) {
    startSelector?.classList.remove('show');
    startSelector?.classList.add('hide');
  } else {
    startSelector?.classList.remove('hide');
    startSelector?.classList.add('show');
  }
}

function setCustomColorEffects() {
  const checkbox = document.getElementById('custom-theme-color');
  const colorPicker = document.getElementById('color-options');
  if (!checkbox?.classList.contains('checked')) {
    colorPicker?.classList.remove('show');
    colorPicker?.classList.add('hide');
  } else {
    colorPicker?.classList.remove('hide');
    colorPicker?.classList.add('show');
  }
}

function setBooleanOptions() {
  Object.keys(booleanOptions).forEach((b) => {
    const checkbox = document.getElementById(b);
    if (checkbox) {
      checkbox.onclick = () => {
        toggleClass('checked', checkbox);
        if (b !== 'custom-theme-color') {
          setBooleanOption(
            booleanOptions[b],
            checkbox.classList.contains('checked')
          );
        }
        if (b === 'rolling-period') {
          setRollingPeriodEffects();
        } else if (b === 'custom-theme-color') {
          setCustomColorEffects();
          setThemeColor();
        }
      };
    }
  });
}

setStoreLinks();
setWeekdayDropdown();
setHoursDropdown();
setMinutesDropdown();
setListLengthDropdown();
setAmPmDropdown();
setPeriods();

chrome.storage.sync.get(storedUserOptions, (items) => {
  const options = applyDefaults(items as Options);
  setSelectedPeriod(options.period.toLowerCase());
  setCheckbox('show-rings', options.show_rings);
  setCheckbox('rolling-period', options.rolling_period);
  setCheckbox('default-sidebar', !options.sidebar);
  setCheckbox('active-rings', !options.dash_courses);
  setCheckbox('due-date-headings', options.due_date_headings);
  // setCheckbox('show-locked-assignments', options.show_locked_assignments);
  setCheckbox('show-confetti', options.show_confetti);
  setCheckbox('show-needs-grading', options.show_needs_grading);
  setCheckbox(
    'custom-theme-color',
    options.theme_color !== 'var(--ic-brand-global-nav-bgd)'
  );
  setCheckbox('color-tabs', options.color_tabs);
  setCheckbox('long-overdue', options.show_long_overdue);
  setCheckbox('clock-24hr', options.clock_24hr);

  setThemeColor(
    options.theme_color !== OptionsDefaults.theme_color
      ? options.theme_color
      : ''
  );
  setSelectedDropdownOption(
    Object.keys(weekdays)[options.start_date - 1],
    'weekdays-options',
    'weekday-selected'
  );
  if (options.start_hour >= 12) {
    setSelectedDropdownOption(
      '' + (((options.start_hour - 1) % 12) + 1),
      'hours-options',
      'hours-selected'
    );
    setSelectedDropdownOption('pm', 'ampm-options', 'ampm-selected');
  } else {
    setSelectedDropdownOption(
      '' + options.start_hour,
      'hours-options',
      'hours-selected'
    );
    setSelectedDropdownOption('am', 'ampm-options', 'ampm-selected');
  }
  setSelectedDropdownOption(
    (options.start_minutes < 10 ? '0' : '') + options.start_minutes,
    'minutes-options',
    'minutes-selected'
  );
  setBooleanOptions();
  setRollingPeriodEffects();
  setCustomColorEffects();
});

/* Domain management */
const TFC_ENABLED_DOMAINS = 'tfc_enabled_domains';
const PENDING_KEY = 'tfc_pending_domains';

interface DomainConfig {
  domain: string;
  pattern: string;
}

async function getEnabledDomains(): Promise<DomainConfig[]> {
  const result = await chrome.storage.sync.get(TFC_ENABLED_DOMAINS);
  return (result[TFC_ENABLED_DOMAINS] as DomainConfig[]) || [];
}

async function saveEnabledDomains(domains: DomainConfig[]): Promise<void> {
  await chrome.storage.sync.set({ [TFC_ENABLED_DOMAINS]: domains });
}

function getScriptId(domain: string): string {
  return `tfc-content-script-${domain}`;
}

function domainToPattern(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${clean}/*`;
}

async function setPending(domain: string, pattern: string) {
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: DomainConfig[] = (result[PENDING_KEY] as DomainConfig[]) || [];
  const filtered = pending.filter((p) => p.domain !== domain);
  filtered.push({ domain, pattern });
  await chrome.storage.local.set({ [PENDING_KEY]: filtered });
}

async function clearPending(domain: string) {
  const result = await chrome.storage.local.get(PENDING_KEY);
  const pending: DomainConfig[] = (result[PENDING_KEY] as DomainConfig[]) || [];
  const filtered = pending.filter((p) => p.domain !== domain);
  await chrome.storage.local.set({ [PENDING_KEY]: filtered });
}

function scheduleRecoveryAlarm(domain: string) {
  chrome.alarms.create(`tfc-recover-${domain}`, { when: Date.now() + 3000 });
}

async function registerDomain(domain: string): Promise<boolean> {
  try {
    const pattern = domainToPattern(domain);
    const id = getScriptId(domain);

    await setPending(domain, pattern);
    scheduleRecoveryAlarm(domain);

    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      await clearPending(domain);
      return false;
    }

    try {
      await chrome.scripting.unregisterContentScripts({ ids: [id] });
    } catch {
      /* ignore */
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

    const domains = await getEnabledDomains();
    const filtered = domains.filter((d) => d.domain !== domain);
    filtered.push({ domain, pattern });
    await saveEnabledDomains(filtered);
    await clearPending(domain);
    return true;
  } catch (err) {
    console.error('Failed to register domain', domain, err);
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
      /* ignore */
    }
    try {
      await chrome.permissions.remove({ origins: [pattern] });
    } catch {
      /* ignore */
    }

    const domains = await getEnabledDomains();
    const filtered = domains.filter((d) => d.domain !== domain);
    await saveEnabledDomains(filtered);
    return true;
  } catch (err) {
    console.error('Failed to unregister domain', domain, err);
    return false;
  }
}

async function refreshDomainsList() {
  const domains = await getEnabledDomains();
  const listEl = document.getElementById('domains-list');
  const noMsgEl = document.getElementById('no-domains-msg');
  const bannerEl = document.getElementById('onboarding-banner');

  if (!listEl) return;
  listEl.innerHTML = '';

  if (domains.length === 0) {
    if (noMsgEl) noMsgEl.classList.remove('hidden');
    if (bannerEl) bannerEl.classList.remove('hidden');
  } else {
    if (noMsgEl) noMsgEl.classList.add('hidden');
    if (bannerEl) bannerEl.classList.add('hidden');
    for (const { domain } of domains) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${domain}</span><button data-domain="${domain}">Remove</button>`;
      listEl.appendChild(li);
    }
    listEl.querySelectorAll('button[data-domain]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const d = (e.target as HTMLElement).getAttribute('data-domain');
        if (d) {
          await unregisterDomain(d);
          await refreshDomainsList();
        }
      });
    });
  }
}

const addDomainBtn = document.getElementById('add-domain-btn');
const addDomainInput = document.getElementById('add-domain-input') as HTMLInputElement;

if (addDomainBtn && addDomainInput) {
  addDomainBtn.addEventListener('click', async () => {
    const val = addDomainInput.value.trim();
    if (!val) return;
    addDomainBtn.textContent = 'Adding...';
    const ok = await registerDomain(val);
    addDomainBtn.textContent = 'Add Domain';
    if (ok) {
      addDomainInput.value = '';
      await refreshDomainsList();
    } else {
      alert('Failed to add domain. Permission may have been denied.');
    }
  });
}

refreshDomainsList();

/* Debug logs */
async function fetchLogs() {
  return new Promise<string[]>((resolve) => {
    chrome.runtime.sendMessage({ type: 'get-logs' }, (response) => {
      resolve(response?.logs || []);
    });
  });
}

async function clearLogs() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'clear-logs' }, () => resolve(true));
  });
}

async function renderLogs() {
  const output = document.getElementById('log-output');
  if (!output) return;
  const logs = await fetchLogs();
  output.textContent = logs.length === 0 ? 'No logs yet.' : logs.join('\n');
  output.scrollTop = output.scrollHeight;
}

const refreshBtn = document.getElementById('refresh-logs-btn');
const clearBtn = document.getElementById('clear-logs-btn');
const toggleDebugBtn = document.getElementById('toggle-debug-btn');
const debugContent = document.getElementById('debug-content');

if (toggleDebugBtn && debugContent) {
  toggleDebugBtn.addEventListener('click', () => {
    const isHidden = debugContent.classList.contains('hidden');
    if (isHidden) {
      debugContent.classList.remove('hidden');
      toggleDebugBtn.textContent = 'Hide Debug Logs';
      renderLogs();
    } else {
      debugContent.classList.add('hidden');
      toggleDebugBtn.textContent = 'Show Debug Logs';
    }
  });
}

if (refreshBtn) refreshBtn.addEventListener('click', renderLogs);
if (clearBtn) clearBtn.addEventListener('click', async () => {
  await clearLogs();
  await renderLogs();
});
