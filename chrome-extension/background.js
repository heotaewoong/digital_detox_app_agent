/**
 * AI Content Guardian - Background Service Worker
 * URL 차단 + 키워드 기반 차단 + 통계 관리
 */

// 기본 차단 키워드 (앱과 동기화)
const DEFAULT_KEYWORD_GROUPS = [
  {
    id: 'gambling',
    name: '도박/베팅',
    keywords: ['카지노', '슬롯', '베팅', '도박', '바카라', '포커', '토토', '배팅', 'casino', 'gambling', 'slot', 'betting'],
    enabled: true,
    riskLevel: 'critical'
  },
  {
    id: 'gaming',
    name: '게임 중독',
    keywords: ['가챠', '뽑기', '과금', '아이템 구매', '보석 충전', '다이아 충전', 'gacha', 'loot box', '리그오브레전드', 'league of legends', 'lol', '롤', '오버워치', '배그', 'pubg'],
    enabled: true,
    riskLevel: 'high'
  },
  {
    id: 'adult',
    name: '성인 콘텐츠',
    keywords: ['야동', '포르노', '성인사이트', 'xxx', 'porn', 'nsfw'],
    enabled: true,
    riskLevel: 'critical'
  },
  {
    id: 'social_media',
    name: '소셜 미디어 과다',
    keywords: ['숏츠', '릴스', '틱톡', 'shorts', 'reels', 'tiktok', 'infinite scroll'],
    enabled: false,
    riskLevel: 'medium'
  },
  {
    id: 'shopping',
    name: '충동 쇼핑',
    keywords: ['타임세일', '플래시딜', '한정판매', '오늘만', '최저가', 'flash sale', 'limited time'],
    enabled: false,
    riskLevel: 'low'
  }
];

// 기본 차단 도메인
const DEFAULT_BLOCKED_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'xnxx.com',
  'bet365.com', 'casino.com'
];

// 초기화
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['keywordGroups', 'blockedDomains', 'stats', 'isEnabled', 'blockStrength']);
  
  if (!stored.keywordGroups) {
    await chrome.storage.local.set({ keywordGroups: DEFAULT_KEYWORD_GROUPS });
  }
  if (!stored.blockedDomains) {
    await chrome.storage.local.set({ blockedDomains: DEFAULT_BLOCKED_DOMAINS });
  }
  if (!stored.stats) {
    await chrome.storage.local.set({ stats: { totalBlocked: 0, todayBlocked: 0, lastReset: new Date().toDateString() } });
  }
  if (stored.isEnabled === undefined) {
    await chrome.storage.local.set({ isEnabled: true });
  }
  if (!stored.blockStrength) {
    await chrome.storage.local.set({ blockStrength: 'moderate' });
  }
  
  console.log('[AI Content Guardian] 설치 완료');
});

// content.js에서 차단 요청 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_URL') {
    handleURLCheck(message.url, message.title, sender.tab?.id).then(sendResponse);
    return true;
  }
  if (message.type === 'BLOCK_DETECTED') {
    handleBlockDetected(message.data, sender.tab?.id);
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_SETTINGS') {
    getSettings().then(sendResponse);
    return true;
  }
  if (message.type === 'GET_STATS') {
    getStats().then(sendResponse);
    return true;
  }
  if (message.type === 'TRACK_TIME') {
    saveTimeRecord(message.data);
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_TIME_REPORT') {
    getTimeReport().then(sendResponse);
    return true;
  }
  if (message.type === 'EDUCATIONAL_CONTEXT_DETECTED') {
    console.log('[ACG] Educational context, not blocking:', message.data.keyword);
    sendResponse({ ok: true });
  }
  // 집중 모드
  if (message.type === 'START_FOCUS') {
    startFocusMode(message.minutes);
    sendResponse({ ok: true });
  }
  if (message.type === 'STOP_FOCUS') {
    stopFocusMode();
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_FOCUS_STATUS') {
    getFocusStatus().then(sendResponse);
    return true;
  }
  // 통계 내보내기
  if (message.type === 'EXPORT_DATA') {
    exportData().then(sendResponse);
    return true;
  }
  // 현재 페이지 분류 결과 저장
  if (message.type === 'PAGE_CLASSIFIED') {
    chrome.storage.local.set({ currentPageClassification: message.data });
    sendResponse({ ok: true });
  }
});

// URL + 키워드 차단 체크
async function handleURLCheck(url, title, tabId) {
  const { keywordGroups, blockedDomains, isEnabled, blockStrength, schedules, focusMode } =
    await chrome.storage.local.get(['keywordGroups', 'blockedDomains', 'isEnabled', 'blockStrength', 'schedules', 'focusMode']);

  if (!isEnabled) return { blocked: false };

  // 집중 모드 체크 - 화이트리스트 외 모든 사이트 차단
  if (focusMode?.active) {
    const whitelist = focusMode.whitelist || ['localhost', 'google.com', 'naver.com'];
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      if (!whitelist.some(w => hostname.includes(w))) {
        await incrementBlockCount();
        return { blocked: true, reason: `집중 모드 활성 중 (${focusMode.remainingMinutes}분 남음)`, type: 'focus_mode' };
      }
    } catch (e) {}
  }

  // 스케줄 차단 체크
  if (schedules && schedules.length > 0) {
    const now = new Date();
    const day = now.getDay();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const activeSchedule = schedules.find(s => {
      if (!s.enabled || !s.days.includes(day)) return false;
      if (s.startTime <= s.endTime) return time >= s.startTime && time <= s.endTime;
      return time >= s.startTime || time <= s.endTime;
    });
    if (activeSchedule && activeSchedule.mode === 'block_all') {
      await incrementBlockCount();
      return { blocked: true, reason: `스케줄 차단: ${activeSchedule.name}`, type: 'schedule' };
    }
  }
  
  const groups = keywordGroups || DEFAULT_KEYWORD_GROUPS;
  const domains = blockedDomains || DEFAULT_BLOCKED_DOMAINS;
  
  // 1. 도메인 차단 체크
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    if (domains.some(d => domain.includes(d))) {
      await incrementBlockCount();
      return { blocked: true, reason: `차단된 사이트: ${domain}`, type: 'domain' };
    }
  } catch (e) {}
  
  // 2. URL 내 키워드 체크
  const urlLower = url.toLowerCase();
  const titleLower = (title || '').toLowerCase();
  const combined = urlLower + ' ' + titleLower;
  
  for (const group of groups) {
    if (!group.enabled) continue;
    for (const keyword of group.keywords) {
      const kw = keyword.toLowerCase();
      if (combined.includes(kw)) {
        await incrementBlockCount();
        return {
          blocked: true,
          reason: `키워드 감지: "${keyword}" (${group.name})`,
          keyword,
          group: group.name,
          riskLevel: group.riskLevel,
          type: 'keyword'
        };
      }
    }
  }
  
  return { blocked: false };
}

// 차단 감지 처리
async function handleBlockDetected(data, tabId) {
  await incrementBlockCount();

  const { blockStrength, userGoals, userDreams, lambdaEndpoint } = await chrome.storage.local.get(
    ['blockStrength', 'userGoals', 'userDreams', 'lambdaEndpoint']
  );

  if (blockStrength === 'strict' || blockStrength === 'moderate') {
    if (tabId) {
      const blockedUrl = chrome.runtime.getURL('blocked.html') +
        `?reason=${encodeURIComponent(data.reason)}&keyword=${encodeURIComponent(data.keyword || '')}&url=${encodeURIComponent(data.url || '')}`;
      chrome.tabs.update(tabId, { url: blockedUrl });
    }
  }

  // Multi-Agent 영상 생성 트리거 (Lambda 엔드포인트가 설정된 경우)
  if (lambdaEndpoint && userGoals && userGoals.length > 0) {
    triggerVideoGeneration(lambdaEndpoint, {
      goals: userGoals,
      dreams: userDreams || [],
      blockedKeyword: data.keyword || '',
      blockedCategory: data.group || 'custom',
    });
  }

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: '🛡️ AI Content Guardian',
    message: `차단됨: ${data.reason}`,
    priority: 1
  });
}

// Multi-Agent 영상 생성 트리거
async function triggerVideoGeneration(endpoint, params) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const result = await response.json();
    if (result.videoUrl) {
      // 생성된 영상 URL을 storage에 저장 (blocked.html에서 읽어감)
      await chrome.storage.local.set({
        latestVideoUrl: result.videoUrl,
        latestVideoCreatedAt: Date.now(),
      });
      console.log('[ACG] 목표 영상 생성 완료:', result.videoUrl);
    }
  } catch (e) {
    console.log('[ACG] 영상 생성 실패 (Lambda 미설정):', e.message);
  }
}

// 차단 카운트 증가
async function incrementBlockCount() {
  const { stats } = await chrome.storage.local.get('stats');
  const today = new Date().toDateString();
  const currentStats = stats || { totalBlocked: 0, todayBlocked: 0, lastReset: today };
  
  if (currentStats.lastReset !== today) {
    currentStats.todayBlocked = 0;
    currentStats.lastReset = today;
  }
  
  currentStats.totalBlocked += 1;
  currentStats.todayBlocked += 1;
  await chrome.storage.local.set({ stats: currentStats });
}

// 설정 가져오기
async function getSettings() {
  return await chrome.storage.local.get(['keywordGroups', 'blockedDomains', 'isEnabled', 'blockStrength', 'youtubeApiKey']);
}

// 통계 가져오기
async function getStats() {
  const { stats } = await chrome.storage.local.get('stats');
  return stats || { totalBlocked: 0, todayBlocked: 0 };
}

// ─── 앱 ↔ 확장 프로그램 키워드 동기화 ──────────────────────────────

/**
 * 앱(localhost:8082)의 localStorage에서 키워드를 읽어 동기화합니다.
 * 앱에서 키워드를 추가/삭제하면 확장 프로그램에 자동 반영됩니다.
 */
async function syncFromApp() {
  try {
    // 앱이 실행 중인 탭 찾기
    const tabs = await chrome.tabs.query({ url: 'http://localhost:8082/*' });
    if (tabs.length === 0) return;

    const tab = tabs[0];
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const raw = window.localStorage.getItem('acg_sync');
        return raw ? JSON.parse(raw) : null;
      },
    });

    const syncData = result?.[0]?.result;
    if (!syncData || !syncData.keywordGroups) return;

    const stored = await chrome.storage.local.get(['keywordGroups', 'lastAppSync']);
    if (stored.lastAppSync === syncData.lastSync) return; // 변경 없음

    // 앱의 키워드 그룹을 확장 프로그램에 병합
    const currentGroups = stored.keywordGroups || DEFAULT_KEYWORD_GROUPS;
    const appGroups = syncData.keywordGroups;

    // 앱 그룹으로 업데이트 (custom_user 그룹은 확장 프로그램 것 유지)
    const extensionCustom = currentGroups.find(g => g.id === 'custom_user');
    const merged = appGroups.map(ag => {
      const existing = currentGroups.find(g => g.id === ag.id);
      return existing ? { ...ag, enabled: existing.enabled } : ag;
    });
    if (extensionCustom && !merged.find(g => g.id === 'custom_user')) {
      merged.push(extensionCustom);
    }

    await chrome.storage.local.set({
      keywordGroups: merged,
      lastAppSync: syncData.lastSync,
    });

    console.log('[ACG] 앱에서 키워드 동기화 완료:', merged.length, '그룹');

    // 앱에도 역방향 동기화
    await syncKeywordsToApp(merged);

    // 목표 데이터도 동기화
    const goalsResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const raw = window.localStorage.getItem('acg_goals');
        return raw ? JSON.parse(raw) : null;
      },
    });
    const goalsData = goalsResult?.[0]?.result;
    if (goalsData?.goals) {
      await chrome.storage.local.set({
        userGoals: goalsData.goals,
        userDreams: goalsData.dreams || [],
      });
    }
  } catch (e) {
    // 앱이 실행 중이 아니면 무시
  }
}

// 확장 프로그램 키워드 → 앱으로 역방향 동기화
async function syncKeywordsToApp(keywordGroups) {
  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:8082/*' });
    if (tabs.length === 0) return;

    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (groups) => {
        // 앱의 acg_sync에 확장 프로그램 키워드 포함해서 저장
        const existing = JSON.parse(window.localStorage.getItem('acg_sync') || '{}');
        const merged = { ...existing, keywordGroups: groups, lastSync: new Date().toISOString(), fromExtension: true };
        window.localStorage.setItem('acg_sync', JSON.stringify(merged));
        // 앱에 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('acg_keywords_updated', { detail: groups }));
      },
      args: [keywordGroups],
    });
  } catch (e) {}
}

// 확장 프로그램에서 키워드 변경 시 즉시 앱에 반영
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.keywordGroups) {
    const newGroups = changes.keywordGroups.newValue;
    if (newGroups) {
      await syncKeywordsToApp(newGroups);
    }
  }
});

// 30초마다 앱과 동기화 시도
setInterval(syncFromApp, 30000);

// 탭이 업데이트될 때 동기화 + URL 차단 체크
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    setTimeout(syncFromApp, 1000);
  }
  if (changeInfo.status !== 'loading') return;
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const result = await handleURLCheck(tab.url, tab.title || '', tabId);
  if (result.blocked) {
    const blockedUrl = chrome.runtime.getURL('blocked.html') +
      `?reason=${encodeURIComponent(result.reason)}&keyword=${encodeURIComponent(result.keyword || '')}&url=${encodeURIComponent(tab.url)}`;
    chrome.tabs.update(tabId, { url: blockedUrl });
  }
});

// ─── 시간 트래킹 ─────────────────────────────────────────────────────

async function saveTimeRecord(record) {
  const today = new Date().toLocaleDateString('ko-KR');
  const { timeRecords } = await chrome.storage.local.get('timeRecords');
  const records = timeRecords || {};

  if (!records[today]) records[today] = [];

  // 같은 도메인 기록이 있으면 누적
  const existing = records[today].find(r => r.domain === record.domain && r.label === record.label);
  if (existing) {
    existing.durationSeconds += record.durationSeconds;
    existing.lastVisit = record.timestamp;
  } else {
    records[today].push(record);
  }

  // 최근 7일만 보관
  const keys = Object.keys(records).sort();
  if (keys.length > 7) delete records[keys[0]];

  await chrome.storage.local.set({ timeRecords: records });

  // 앱(localhost:8082)과 데이터 동기화
  syncDataToApp();
}

// 앱과 데이터 동기화 (localStorage를 통해)
async function syncDataToApp() {
  try {
    const report = await getTimeReport();
    const { stats } = await chrome.storage.local.get('stats');

    // 앱이 열린 탭 찾기
    const tabs = await chrome.tabs.query({ url: 'http://localhost:8082/*' });
    if (tabs.length === 0) return;

    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (reportData, statsData) => {
        window.localStorage.setItem('acg_report', JSON.stringify(reportData));
        window.localStorage.setItem('acg_stats', JSON.stringify({
          todayBlocked: statsData?.todayBlocked || 0,
          totalBlocked: statsData?.totalBlocked || 0,
          lastUpdated: new Date().toISOString(),
        }));
      },
      args: [report, stats],
    });
  } catch (e) {
    // 앱이 열려있지 않으면 무시
  }
}

async function getTimeReport() {
  const { timeRecords } = await chrome.storage.local.get('timeRecords');
  const records = timeRecords || {};
  const today = new Date().toLocaleDateString('ko-KR');
  const todayRecords = records[today] || [];

  // 카테고리별 집계
  const categoryMap = {};
  let totalSeconds = 0;

  for (const r of todayRecords) {
    if (!categoryMap[r.label]) {
      categoryMap[r.label] = {
        label: r.label,
        labelDisplay: r.labelDisplay || r.label,
        emoji: r.emoji || '📄',
        isProductive: r.isProductive,
        color: r.color || '#6B7280',
        totalSeconds: 0,
        sites: [],
      };
    }
    categoryMap[r.label].totalSeconds += r.durationSeconds;
    categoryMap[r.label].sites.push({ domain: r.domain, title: r.title, seconds: r.durationSeconds });
    totalSeconds += r.durationSeconds;
  }

  const categories = Object.values(categoryMap)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .map(c => ({
      ...c,
      percentage: totalSeconds > 0 ? Math.round((c.totalSeconds / totalSeconds) * 100) : 0,
      minutes: Math.round(c.totalSeconds / 60),
    }));

  const productiveSeconds = categories.filter(c => c.isProductive).reduce((s, c) => s + c.totalSeconds, 0);
  const productiveRatio = totalSeconds > 0 ? Math.round((productiveSeconds / totalSeconds) * 100) : 0;

  return {
    today,
    totalMinutes: Math.round(totalSeconds / 60),
    productiveRatio,
    categories,
    weeklyRecords: records,
  };
}

// ─── 집중 모드 ────────────────────────────────────────────────────────

let focusTimer = null;

async function startFocusMode(minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;
  await chrome.storage.local.set({
    focusMode: {
      active: true,
      startTime: Date.now(),
      endTime,
      totalMinutes: minutes,
      remainingMinutes: minutes,
      whitelist: ['localhost', 'google.com', 'naver.com', 'kakao.com'],
    }
  });

  // 배지 표시
  chrome.action.setBadgeText({ text: `${minutes}` });
  chrome.action.setBadgeBackgroundColor({ color: '#10B981' });

  // 1분마다 남은 시간 업데이트
  if (focusTimer) clearInterval(focusTimer);
  focusTimer = setInterval(async () => {
    const { focusMode } = await chrome.storage.local.get('focusMode');
    if (!focusMode?.active) { clearInterval(focusTimer); return; }

    const remaining = Math.max(0, Math.round((focusMode.endTime - Date.now()) / 60000));
    if (remaining <= 0) {
      await stopFocusMode();
      chrome.notifications.create({
        type: 'basic', iconUrl: 'icons/icon48.png',
        title: '🌲 집중 세션 완료!', message: `${minutes}분 집중 세션을 완료했습니다. 수고했어요!`,
        priority: 2,
      });
    } else {
      await chrome.storage.local.set({ focusMode: { ...focusMode, remainingMinutes: remaining } });
      chrome.action.setBadgeText({ text: `${remaining}` });
    }
  }, 60000);

  console.log(`[ACG] 집중 모드 시작: ${minutes}분`);
}

async function stopFocusMode() {
  if (focusTimer) { clearInterval(focusTimer); focusTimer = null; }
  await chrome.storage.local.set({ focusMode: { active: false } });
  chrome.action.setBadgeText({ text: '' });
  console.log('[ACG] 집중 모드 종료');
}

async function getFocusStatus() {
  const { focusMode } = await chrome.storage.local.get('focusMode');
  return focusMode || { active: false };
}

// ─── 통계 내보내기 ────────────────────────────────────────────────────

async function exportData() {
  const { timeRecords, stats, keywordGroups } = await chrome.storage.local.get(['timeRecords', 'stats', 'keywordGroups']);

  const exportObj = {
    exportDate: new Date().toISOString(),
    stats: stats || {},
    timeRecords: timeRecords || {},
    keywordGroups: keywordGroups || [],
  };

  // CSV 형태로도 변환
  const today = new Date().toLocaleDateString('ko-KR');
  const todayRecords = (timeRecords || {})[today] || [];
  const csvRows = ['도메인,제목,카테고리,생산적여부,시간(초),날짜'];
  for (const r of todayRecords) {
    csvRows.push(`"${r.domain}","${(r.title || '').replace(/"/g, '""')}","${r.labelDisplay || r.label}","${r.isProductive ? '예' : '아니오'}",${r.durationSeconds},"${r.date}"`);
  }

  return {
    json: JSON.stringify(exportObj, null, 2),
    csv: csvRows.join('\n'),
    filename: `acg_report_${today.replace(/\./g, '-')}`,
  };
}

// ─── 알람 기반 스케줄 체크 ────────────────────────────────────────────

// 1분마다 스케줄 체크
chrome.alarms.create('scheduleCheck', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'scheduleCheck') return;

  const { schedules, isEnabled } = await chrome.storage.local.get(['schedules', 'isEnabled']);
  if (!isEnabled || !schedules) return;

  const now = new Date();
  const day = now.getDay();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const activeSchedule = schedules.find(s => {
    if (!s.enabled || !s.days.includes(day)) return false;
    if (s.startTime <= s.endTime) return time >= s.startTime && time <= s.endTime;
    return time >= s.startTime || time <= s.endTime;
  });

  if (activeSchedule) {
    // 현재 열린 탭들에 알림
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
      chrome.tabs.sendMessage(tab.id, {
        type: 'SCHEDULE_ACTIVE',
        schedule: activeSchedule,
      }).catch(() => {});
    }
  }
});
