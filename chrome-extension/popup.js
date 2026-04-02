/**
 * AI Content Guardian - Popup Script v2
 * 탭: 차단 관리 | 시간 리포트 | 사이트별
 */

const RISK_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  high:     { bg: 'rgba(249,115,22,0.15)', color: '#F97316' },
  medium:   { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
  low:      { bg: 'rgba(16,185,129,0.15)', color: '#10B981' },
};

let currentSettings = {};

// ─── 탭 전환 ─────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'report' || btn.dataset.tab === 'sites') {
      loadReport();
    }
    if (btn.dataset.tab === 'focus') {
      loadFocusStatus();
    }
  });
});

// ─── 초기화 ───────────────────────────────────────────────────────────

async function init() {
  currentSettings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

  renderStats(stats);
  renderMainToggle(currentSettings.isEnabled);
  renderStrength(currentSettings.blockStrength || 'moderate');
  renderKeywordGroups(currentSettings.keywordGroups || []);
  renderCustomKeywords(currentSettings.keywordGroups || []);
  renderBlockedDomains(currentSettings.blockedDomains || []);

  if (currentSettings.youtubeApiKey) {
    const input = document.getElementById('ytApiKey');
    if (input) input.placeholder = '저장됨 ✓';
  }

  // 집중 모드 상태 로드
  if (typeof loadFocusStatus === 'function') loadFocusStatus();
  const { focusWhitelist: saved } = await chrome.storage.local.get('focusWhitelist');
  if (saved && typeof focusWhitelist !== 'undefined') { focusWhitelist = saved; }
  if (typeof renderFocusWhitelist === 'function') renderFocusWhitelist();

  // 현재 탭 페이지 분류 표시
  loadCurrentPageInfo();
}

// ─── 리포트 로드 ─────────────────────────────────────────────────────

async function loadReport() {
  const report = await chrome.runtime.sendMessage({ type: 'GET_TIME_REPORT' });

  if (!report || report.totalMinutes === 0) {
    document.getElementById('categoryList').innerHTML =
      '<div class="empty-report">📊 아직 데이터가 없어요.<br>페이지를 방문하면 자동으로 기록됩니다.</div>';
    document.getElementById('siteList').innerHTML =
      '<div class="empty-report">🌐 방문한 사이트가 없어요.</div>';
    return;
  }

  // 리포트 헤더
  const h = Math.floor(report.totalMinutes / 60);
  const m = report.totalMinutes % 60;
  document.getElementById('reportTotal').textContent = h > 0 ? `${h}시간 ${m}분` : `${m}분`;
  document.getElementById('prodFill').style.width = `${report.productiveRatio}%`;
  document.getElementById('distFill').style.width = `${100 - report.productiveRatio}%`;
  document.getElementById('prodLabel').textContent = `생산적 ${report.productiveRatio}%`;
  document.getElementById('distLabel').textContent = `비생산적 ${100 - report.productiveRatio}%`;

  // 카테고리 목록
  const catList = document.getElementById('categoryList');
  catList.innerHTML = '';
  for (const cat of report.categories) {
    const row = document.createElement('div');
    row.className = 'category-row';
    row.innerHTML = `
      <span class="cat-emoji">${cat.emoji}</span>
      <div class="cat-info">
        <div style="display:flex; align-items:center; gap:5px;">
          <span class="cat-name">${cat.labelDisplay || cat.label}</span>
          <span class="cat-badge ${cat.isProductive ? 'badge-prod' : 'badge-dist'}">${cat.isProductive ? '생산적' : '비생산적'}</span>
        </div>
        <div class="cat-bar-bg">
          <div class="cat-bar-fill" style="width:${cat.percentage}%; background:${cat.color};"></div>
        </div>
      </div>
      <span class="cat-time">${cat.minutes}분</span>
    `;
    catList.appendChild(row);
  }

  // 사이트별 목록
  const siteList = document.getElementById('siteList');
  siteList.innerHTML = '';
  const allSites = report.categories.flatMap(c => c.sites || [])
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 15);

  for (const site of allSites) {
    const row = document.createElement('div');
    row.className = 'category-row';
    const mins = Math.round(site.seconds / 60);
    row.innerHTML = `
      <span class="cat-emoji">🌐</span>
      <div class="cat-info">
        <div class="cat-name">${site.domain}</div>
        <div style="font-size:10px; color:#6B6B8D; margin-top:1px;" title="${site.title}">${site.title?.slice(0, 40) || ''}</div>
      </div>
      <span class="cat-time">${mins}분</span>
    `;
    siteList.appendChild(row);
  }
}

document.getElementById('refreshReport').addEventListener('click', loadReport);
document.getElementById('refreshSites').addEventListener('click', loadReport);

// ─── 기존 기능들 ─────────────────────────────────────────────────────

function renderStats(stats) {
  document.getElementById('todayBlocked').textContent = stats?.todayBlocked || 0;
  document.getElementById('totalBlocked').textContent = stats?.totalBlocked || 0;
  const activeGroups = (currentSettings.keywordGroups || []).filter(g => g.enabled).length;
  document.getElementById('activeGroups').textContent = activeGroups;
}

function renderMainToggle(isEnabled) {
  const btn = document.getElementById('mainToggle');
  btn.textContent = isEnabled ? 'ON' : 'OFF';
  btn.className = `toggle-btn ${isEnabled ? 'active' : 'inactive'}`;
}

document.getElementById('mainToggle').addEventListener('click', async () => {
  const newVal = !currentSettings.isEnabled;
  currentSettings.isEnabled = newVal;
  await chrome.storage.local.set({ isEnabled: newVal });
  renderMainToggle(newVal);
});

function renderStrength(strength) {
  document.querySelectorAll('.strength-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.strength === strength);
  });
}

document.querySelectorAll('.strength-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const strength = btn.dataset.strength;
    currentSettings.blockStrength = strength;
    await chrome.storage.local.set({ blockStrength: strength });
    renderStrength(strength);
  });
});

function renderKeywordGroups(groups) {
  const container = document.getElementById('keywordGroups');
  container.innerHTML = '';
  groups.forEach((group, idx) => {
    const risk = RISK_COLORS[group.riskLevel] || RISK_COLORS.medium;
    const div = document.createElement('div');
    div.className = 'keyword-group';
    div.innerHTML = `
      <div class="group-info">
        <div class="group-name">${group.name}</div>
        <div class="group-count">${group.keywords.length}개 키워드</div>
      </div>
      <span class="risk-badge" style="background:${risk.bg}; color:${risk.color}">
        ${group.riskLevel === 'critical' ? '위험' : group.riskLevel === 'high' ? '높음' : group.riskLevel === 'medium' ? '보통' : '낮음'}
      </span>
      <label class="toggle-switch">
        <input type="checkbox" ${group.enabled ? 'checked' : ''} data-idx="${idx}">
        <span class="slider"></span>
      </label>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const idx = parseInt(e.target.dataset.idx);
      currentSettings.keywordGroups[idx].enabled = e.target.checked;
      await chrome.storage.local.set({ keywordGroups: currentSettings.keywordGroups });
      document.getElementById('activeGroups').textContent =
        currentSettings.keywordGroups.filter(g => g.enabled).length;
    });
  });
}

function renderCustomKeywords(groups) {
  const customGroup = groups.find(g => g.id === 'custom_user');
  const container = document.getElementById('customKeywords');
  container.innerHTML = '';
  if (!customGroup || customGroup.keywords.length === 0) return;
  customGroup.keywords.forEach((kw) => {
    const div = document.createElement('div');
    div.className = 'blocked-domain-row';
    div.style.borderColor = 'rgba(139,92,246,0.3)';
    div.style.background = 'rgba(139,92,246,0.08)';
    div.innerHTML = `
      <span class="domain-text" style="color:#C4B5FD;">${kw}</span>
      <button class="remove-btn" data-kw="${kw}">✕</button>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const kw = btn.dataset.kw;
      const idx = currentSettings.keywordGroups.findIndex(g => g.id === 'custom_user');
      if (idx >= 0) {
        currentSettings.keywordGroups[idx].keywords =
          currentSettings.keywordGroups[idx].keywords.filter(k => k !== kw);
        await chrome.storage.local.set({ keywordGroups: currentSettings.keywordGroups });
        renderCustomKeywords(currentSettings.keywordGroups);
      }
    });
  });
}

document.getElementById('addKeywordBtn').addEventListener('click', async () => {
  const input = document.getElementById('newKeyword');
  const kw = input.value.trim();
  if (!kw) return;
  let groups = currentSettings.keywordGroups || [];
  const customIdx = groups.findIndex(g => g.id === 'custom_user');
  if (customIdx >= 0) {
    if (!groups[customIdx].keywords.includes(kw)) groups[customIdx].keywords.push(kw);
  } else {
    groups.push({ id: 'custom_user', name: '나의 차단 키워드', keywords: [kw], enabled: true, riskLevel: 'high' });
  }
  currentSettings.keywordGroups = groups;
  await chrome.storage.local.set({ keywordGroups: groups });
  input.value = '';
  renderCustomKeywords(groups);
  renderKeywordGroups(groups);
});

document.getElementById('newKeyword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addKeywordBtn').click();
});

function renderBlockedDomains(domains) {
  const container = document.getElementById('blockedDomains');
  container.innerHTML = '';
  domains.forEach((domain, i) => {
    const div = document.createElement('div');
    div.className = 'blocked-domain-row';
    div.innerHTML = `
      <span class="domain-text">${domain}</span>
      <button class="remove-btn" data-idx="${i}">✕</button>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      currentSettings.blockedDomains.splice(idx, 1);
      await chrome.storage.local.set({ blockedDomains: currentSettings.blockedDomains });
      renderBlockedDomains(currentSettings.blockedDomains);
    });
  });
}

document.getElementById('addDomainBtn').addEventListener('click', async () => {
  const input = document.getElementById('newDomain');
  let domain = input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) return;
  if (!currentSettings.blockedDomains) currentSettings.blockedDomains = [];
  if (!currentSettings.blockedDomains.includes(domain)) {
    currentSettings.blockedDomains.push(domain);
    await chrome.storage.local.set({ blockedDomains: currentSettings.blockedDomains });
  }
  input.value = '';
  renderBlockedDomains(currentSettings.blockedDomains);
});

document.getElementById('newDomain').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addDomainBtn').click();
});


// YouTube API 키 저장
document.getElementById('saveYtApiKey')?.addEventListener('click', async () => {
  const input = document.getElementById('ytApiKey');
  const key = input.value.trim();
  if (!key) return;
  currentSettings.youtubeApiKey = key;
  await chrome.storage.local.set({ youtubeApiKey: key });
  input.value = '';
  input.placeholder = '저장됨 ✓';
});

// Lambda 엔드포인트 저장
document.getElementById('saveLambdaEndpoint')?.addEventListener('click', async () => {
  const input = document.getElementById('lambdaEndpoint');
  const endpoint = input.value.trim();
  if (!endpoint) return;
  await chrome.storage.local.set({ lambdaEndpoint: endpoint });
  input.value = '';
  input.placeholder = '저장됨 ✓';
});

// ─── 집중 모드 ────────────────────────────────────────────────────────

let selectedFocusMinutes = 25;
let focusWhitelist = ['localhost', 'google.com', 'naver.com', 'kakao.com'];
let focusTimerInterval = null;

document.querySelectorAll('.focus-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.focus-preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFocusMinutes = parseInt(btn.dataset.min);
  });
});
// 기본 선택
document.querySelector('.focus-preset-btn[data-min="25"]')?.classList.add('active');

async function loadFocusStatus() {
  const status = await chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATUS' });
  if (status?.active) {
    showFocusActive(status);
  } else {
    document.getElementById('focusInactive').style.display = 'block';
    document.getElementById('focusActive').style.display = 'none';
    if (focusTimerInterval) { clearInterval(focusTimerInterval); focusTimerInterval = null; }
  }
}

function showFocusActive(status) {
  document.getElementById('focusInactive').style.display = 'none';
  document.getElementById('focusActive').style.display = 'block';

  if (focusTimerInterval) clearInterval(focusTimerInterval);
  focusTimerInterval = setInterval(async () => {
    const s = await chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATUS' });
    if (!s?.active) {
      clearInterval(focusTimerInterval);
      loadFocusStatus();
      return;
    }
    const remaining = Math.max(0, s.endTime - Date.now());
    const m = Math.floor(remaining / 60000);
    const sec = Math.floor((remaining % 60000) / 1000);
    document.getElementById('focusTimer').textContent =
      `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, 1000);
}

document.getElementById('startFocusBtn')?.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'START_FOCUS', minutes: selectedFocusMinutes });
  const status = await chrome.runtime.sendMessage({ type: 'GET_FOCUS_STATUS' });
  showFocusActive(status);
});

document.getElementById('stopFocusBtn')?.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'STOP_FOCUS' });
  loadFocusStatus();
});

document.getElementById('addFocusWhitelistBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('focusWhitelistInput');
  const site = input.value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!site) return;
  focusWhitelist.push(site);
  await chrome.storage.local.set({ focusWhitelist });
  input.value = '';
  renderFocusWhitelist();
});

function renderFocusWhitelist() {
  const container = document.getElementById('focusWhitelist');
  if (!container) return;
  container.innerHTML = '';
  focusWhitelist.forEach((site, i) => {
    const div = document.createElement('div');
    div.className = 'blocked-domain-row';
    div.style.borderColor = 'rgba(16,185,129,0.3)';
    div.style.background = 'rgba(16,185,129,0.08)';
    div.innerHTML = `<span class="domain-text" style="color:#6EE7B7;">${site}</span>
      <button class="remove-btn" data-idx="${i}">✕</button>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      focusWhitelist.splice(parseInt(btn.dataset.idx), 1);
      await chrome.storage.local.set({ focusWhitelist });
      renderFocusWhitelist();
    });
  });
}

// ─── 데이터 내보내기 ──────────────────────────────────────────────────

document.getElementById('exportJsonBtn')?.addEventListener('click', async () => {
  const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
  const blob = new Blob([data.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${data.filename}.json`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('exportCsvBtn')?.addEventListener('click', async () => {
  const data = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
  const blob = new Blob(['\uFEFF' + data.csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${data.filename}.csv`; a.click();
  URL.revokeObjectURL(url);
});

// YouTube API 키 로드 (저장된 경우 표시)
async function loadYtApiKey() {
  const { youtubeApiKey } = await chrome.storage.local.get('youtubeApiKey');
  if (youtubeApiKey) {
    const input = document.getElementById('ytApiKey');
    if (input) input.placeholder = '저장됨 ✓';
  }
}

init().then(loadYtApiKey);

// ─── 현재 탭 페이지 분류 표시 ────────────────────────────────────────

async function loadCurrentPageInfo() {
  try {
    const { currentPageClassification } = await chrome.storage.local.get('currentPageClassification');
    const el = document.getElementById('currentPageInfo');
    if (!el) return;

    if (currentPageClassification) {
      const { emoji, labelDisplay, label, isProductive } = currentPageClassification;
      const color = isProductive ? '#10B981' : '#F97316';
      el.innerHTML = `<span style="color:${color}">${emoji} ${labelDisplay || label}</span>`;
    } else {
      // 현재 활성 탭에서 직접 가져오기
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const hostname = new URL(tab.url).hostname.replace('www.', '');
        el.textContent = hostname || '디지털 디톡스 도우미';
      }
    }
  } catch (e) {
    // 무시
  }
}

// ─── 앱 스케줄 동기화 ────────────────────────────────────────────────

// 앱의 스케줄 데이터를 확장 프로그램에 동기화
async function syncSchedulesFromApp() {
  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:8082/*' });
    if (tabs.length === 0) return;

    const result = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        const raw = window.localStorage.getItem('app_control');
        return raw ? JSON.parse(raw) : null;
      },
    });

    const appData = result?.[0]?.result;
    if (!appData?.schedules) return;

    await chrome.storage.local.set({ schedules: appData.schedules });
  } catch (e) {}
}

// 팝업 열릴 때 스케줄 동기화
syncSchedulesFromApp();
