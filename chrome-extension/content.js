/**
 * AI Content Guardian - Content Script v3
 *
 * 수정 사항:
 * 1. moderate/strict 모드에서 즉시 차단 페이지로 이동 (background 의존 제거)
 * 2. YouTube Data API 연동으로 영상 카테고리 정확 분류
 * 3. 검색창/입력창 스캔 제외
 * 4. 맥락 기반 차단 (교육적 맥락이면 완화)
 * 5. 모든 웹사이트 키워드 차단 동작
 */

let settings = null;
let isBlocked = false;
let scanInterval = null;
let pageStartTime = Date.now();
let currentPageClassification = null;
let youtubeApiKey = null; // 팝업에서 설정 가능

// ─── 즉시 차단 함수 ──────────────────────────────────────────────────

function blockPage(reason, keyword, riskLevel) {
  if (isBlocked) return;
  isBlocked = true;

  const strength = settings?.blockStrength || 'moderate';

  if (strength === 'gentle') {
    showWarningOverlay(keyword, reason, riskLevel);
    return;
  }

  // moderate / strict: 즉시 차단 페이지로 이동
  const blockedUrl = chrome.runtime.getURL('blocked.html') +
    `?reason=${encodeURIComponent(reason)}&keyword=${encodeURIComponent(keyword || '')}&url=${encodeURIComponent(window.location.href)}`;

  // background에도 알림 (통계용)
  chrome.runtime.sendMessage({
    type: 'BLOCK_DETECTED',
    data: { reason, keyword, riskLevel, url: window.location.href, title: document.title }
  }).catch(() => {});

  window.location.replace(blockedUrl);
}

// ─── 콘텐츠 분류 ─────────────────────────────────────────────────────

const CLASSIFICATION_RULES = {
  study: {
    label: '공부/학습', emoji: '📚', isProductive: true, color: '#10B981',
    domains: ['coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'leetcode.com',
      'hackerrank.com', 'stackoverflow.com', 'github.com', 'notion.so', 'wikipedia.org',
      'scholar.google.com', 'docs.google.com', 'drive.google.com'],
    titleRe: /강의|tutorial|lecture|course|배우기|공부|코딩|프로그래밍|알고리즘|수학|영어|과학|역사|문법|react|python|javascript|java\b|개발|입문|기초|심화|수능|토익|토플|자격증|시험|정리|요약|AWS|클라우드/i,
  },
  work: {
    label: '업무/생산성', emoji: '💼', isProductive: true, color: '#3B82F6',
    domains: ['slack.com', 'trello.com', 'atlassian.net', 'figma.com', 'zoom.us',
      'meet.google.com', 'calendar.google.com', 'mail.google.com', 'outlook.com'],
    titleRe: /회의|미팅|업무|프로젝트|기획|보고서|발표|meeting|project|report/i,
  },
  gaming: {
    label: '게임', emoji: '🎮', isProductive: false, color: '#EF4444',
    domains: ['twitch.tv', 'op.gg', 'fmkorea.com', 'inven.co.kr', 'nexon.com',
      'netmarble.com', 'plaync.com', 'riotgames.com', 'steampowered.com', 'battlenet.com'],
    titleRe: /게임|gaming|gameplay|walkthrough|롤\b|LOL|발로란트|오버워치|마인크래프트|minecraft|fortnite|포트나이트|배그|PUBG|스타크래프트|리그오브레전드|피파|FIFA|e스포츠|esports|챔피언|패치노트|공략|실황/i,
  },
  entertainment: {
    label: '엔터테인먼트', emoji: '🎬', isProductive: false, color: '#F97316',
    domains: ['netflix.com', 'wavve.com', 'tving.com', 'watcha.com', 'disneyplus.com'],
    titleRe: /vlog|브이로그|먹방|mukbang|ASMR|reaction|리액션|드라마|예능|웃긴|funny|meme|밈|shorts|숏츠|챌린지|challenge|음악|music|MV|뮤직비디오|노래|커버|cover|댄스|dance|영화|movie|애니|anime|언박싱|unboxing|하울|haul/i,
  },
  social: {
    label: '소셜/SNS', emoji: '📱', isProductive: false, color: '#EC4899',
    domains: ['instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'tiktok.com',
      'reddit.com', 'threads.net', 'snapchat.com'],
    titleRe: /피드|타임라인|팔로워|좋아요|댓글|feed|timeline|follower/i,
  },
  shopping: {
    label: '쇼핑', emoji: '🛒', isProductive: false, color: '#FBBF24',
    domains: ['coupang.com', 'gmarket.co.kr', '11st.co.kr', 'amazon.com',
      'aliexpress.com', 'musinsa.com', 'zigzag.kr', 'baemin.com', 'yogiyo.co.kr'],
    titleRe: /쇼핑|구매|할인|세일|배송|장바구니|결제|shopping|sale|discount/i,
  },
  news: {
    label: '뉴스/정보', emoji: '📰', isProductive: true, color: '#6366F1',
    domains: ['news.naver.com', 'chosun.com', 'joongang.co.kr', 'donga.com',
      'hani.co.kr', 'bbc.com', 'cnn.com', 'reuters.com'],
    titleRe: /뉴스|news|시사|이슈|분석|해설|다큐|documentary|경제|정치|사회|국제/i,
  },
  health: {
    label: '건강/운동', emoji: '💪', isProductive: true, color: '#14B8A6',
    domains: ['strava.com', 'myfitnesspal.com', 'healthline.com'],
    titleRe: /운동|workout|exercise|fitness|헬스|요가|yoga|스트레칭|다이어트|diet|홈트|루틴/i,
  },
  gambling: {
    label: '도박', emoji: '🎰', isProductive: false, color: '#B91C1C',
    domains: ['bet365.com', 'casino.com', 'poker.com'],
    titleRe: /카지노|슬롯|도박|베팅|바카라|토토|배당/i,
  },
  adult: {
    label: '성인', emoji: '🔞', isProductive: false, color: '#DC2626',
    domains: [],
    titleRe: /야동|포르노|성인/i,
  },
};

// YouTube categoryId → 분류 매핑
const YT_CATEGORY_MAP = {
  '1': 'entertainment',  // Film & Animation
  '2': 'other',          // Autos & Vehicles
  '10': 'entertainment', // Music
  '15': 'entertainment', // Pets & Animals
  '17': 'health',        // Sports
  '19': 'other',         // Travel & Events
  '20': 'gaming',        // Gaming ← 핵심
  '22': 'entertainment', // People & Blogs
  '23': 'entertainment', // Comedy
  '24': 'entertainment', // Entertainment
  '25': 'news',          // News & Politics
  '26': 'other',         // Howto & Style
  '27': 'study',         // Education ← 핵심
  '28': 'study',         // Science & Technology
  '29': 'other',         // Nonprofits & Activism
};

function classifyPage() {
  const hostname = window.location.hostname.replace('www.', '');
  const title = document.title.toLowerCase();

  // YouTube는 별도 처리 (API 또는 제목 기반)
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return classifyYouTubeByTitle(title);
  }

  // 도메인 기반
  for (const [key, rule] of Object.entries(CLASSIFICATION_RULES)) {
    if (rule.domains.some(d => hostname.includes(d))) {
      return { label: key, ...rule };
    }
  }

  // 제목 기반
  for (const [key, rule] of Object.entries(CLASSIFICATION_RULES)) {
    if (rule.titleRe && rule.titleRe.test(title)) {
      return { label: key, ...rule };
    }
  }

  return { label: 'other', label_display: '기타', emoji: '📄', isProductive: false, color: '#6B7280' };
}

function classifyYouTubeByTitle(title) {
  const YOUTUBE_TITLE_RULES = [
    { label: 'study', re: /강의|tutorial|lecture|course|배우기|공부|코딩|프로그래밍|알고리즘|수학|영어|과학|역사|문법|react|python|javascript|java\b|개발|입문|기초|심화|수능|토익|토플|자격증|시험|정리|요약|AWS|클라우드/i },
    { label: 'gaming', re: /게임|gaming|gameplay|walkthrough|롤\b|LOL|발로란트|오버워치|마인크래프트|minecraft|fortnite|포트나이트|배그|PUBG|스타크래프트|리그오브레전드|피파|FIFA|e스포츠|esports|챔피언|패치노트|공략|실황/i },
    { label: 'health', re: /운동|workout|exercise|fitness|헬스|요가|yoga|스트레칭|다이어트|diet|홈트|루틴/i },
    { label: 'news', re: /뉴스|news|시사|이슈|분석|해설|다큐|documentary|경제|정치|사회|국제/i },
    { label: 'entertainment', re: /vlog|브이로그|먹방|mukbang|ASMR|reaction|리액션|드라마|예능|웃긴|funny|meme|밈|shorts|숏츠|챌린지|challenge|음악|music|MV|뮤직비디오|노래|커버|cover|댄스|dance|영화|movie|애니|anime|언박싱|unboxing|하울|haul/i },
  ];
  for (const rule of YOUTUBE_TITLE_RULES) {
    if (rule.re.test(title)) {
      const base = CLASSIFICATION_RULES[rule.label];
      return { label: rule.label, ...base, isYouTube: true };
    }
  }
  return { label: 'entertainment', ...CLASSIFICATION_RULES.entertainment, isYouTube: true };
}

// ─── YouTube Data API 연동 ────────────────────────────────────────────

async function classifyYouTubeWithAPI(videoId) {
  if (!youtubeApiKey) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`
    );
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const categoryId = item.snippet.categoryId;
    const tags = (item.snippet.tags || []).join(' ').toLowerCase();
    const description = (item.snippet.description || '').toLowerCase().slice(0, 500);
    const title = item.snippet.title.toLowerCase();

    // categoryId 기반 분류
    const labelFromCategory = YT_CATEGORY_MAP[categoryId] || 'entertainment';

    // 태그/설명으로 보완
    let finalLabel = labelFromCategory;
    if (/게임|gaming|롤|lol|오버워치|배그|minecraft|fortnite/.test(tags + description)) {
      finalLabel = 'gaming';
    } else if (/공부|study|강의|tutorial|교육|education/.test(tags + description)) {
      finalLabel = 'study';
    }

    const base = CLASSIFICATION_RULES[finalLabel] || CLASSIFICATION_RULES.entertainment;
    return {
      label: finalLabel,
      ...base,
      isYouTube: true,
      apiTitle: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      categoryId,
    };
  } catch (e) {
    return null;
  }
}

function extractYouTubeVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return match ? match[1] : null;
}

// ─── 시간 트래킹 ─────────────────────────────────────────────────────

function startTracking() {
  pageStartTime = Date.now();
  currentPageClassification = classifyPage();

  // YouTube API로 더 정확한 분류 시도
  const videoId = extractYouTubeVideoId(window.location.href);
  if (videoId) {
    classifyYouTubeWithAPI(videoId).then(result => {
      if (result) currentPageClassification = result;
    });
  }

  setInterval(saveTimeRecord, 30000);
  window.addEventListener('beforeunload', saveTimeRecord);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveTimeRecord();
    else pageStartTime = Date.now();
  });
}

async function saveTimeRecord() {
  if (!currentPageClassification) return;
  const elapsed = Math.round((Date.now() - pageStartTime) / 1000);
  if (elapsed < 5) return;

  chrome.runtime.sendMessage({
    type: 'TRACK_TIME',
    data: {
      url: window.location.href,
      domain: window.location.hostname.replace('www.', ''),
      title: document.title,
      label: currentPageClassification.label,
      labelDisplay: currentPageClassification.label || currentPageClassification.label,
      emoji: currentPageClassification.emoji || '📄',
      isProductive: currentPageClassification.isProductive,
      color: currentPageClassification.color || '#6B7280',
      durationSeconds: elapsed,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('ko-KR'),
    }
  }).catch(() => {});
  pageStartTime = Date.now();
}

// ─── 키워드 차단 (맥락 기반) ─────────────────────────────────────────

function getPageTextExcludingInputs() {
  const excludeTags = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD']);
  const walker = document.createTreeWalker(
    document.body || document.documentElement,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        let el = node.parentElement;
        while (el) {
          if (excludeTags.has(el.tagName)) return NodeFilter.FILTER_REJECT;
          if (el.isContentEditable) return NodeFilter.FILTER_REJECT;
          const role = el.getAttribute('role');
          if (role === 'searchbox' || role === 'combobox' || role === 'textbox') return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const texts = [];
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (text && text.length > 1) texts.push(text);
  }
  return texts.join(' ').toLowerCase();
}

const EDUCATIONAL_CONTEXT = ['강의', '공부', '학습', '교육', '튜토리얼', 'tutorial', 'course', 'lecture', '역사', '분석', '연구', '논문', '수업', '교과서'];

function hasEducationalContext(text, keyword, position) {
  const windowSize = 300;
  const start = Math.max(0, position - windowSize);
  const end = Math.min(text.length, position + keyword.length + windowSize);
  const context = text.slice(start, end);
  return EDUCATIONAL_CONTEXT.some(ec => context.includes(ec));
}

function scanPageContent() {
  if (!settings || !settings.isEnabled || isBlocked) return;

  const groups = settings.keywordGroups || [];
  const pageUrl = window.location.href.toLowerCase();
  const pageTitle = document.title.toLowerCase();

  if (pageUrl.includes('blocked.html') || pageUrl.startsWith('chrome-extension://') || pageUrl.startsWith('chrome://')) return;

  // 입력창 제외한 페이지 텍스트
  const pageText = getPageTextExcludingInputs();

  for (const group of groups) {
    if (!group.enabled) continue;

    for (const keyword of group.keywords) {
      const kw = keyword.toLowerCase().trim();
      if (!kw || kw.length < 2) continue;

      const urlMatch = pageUrl.includes(kw);
      const titleMatch = pageTitle.includes(kw);
      const bodyIdx = pageText.indexOf(kw);
      const bodyMatch = bodyIdx >= 0;

      if (!urlMatch && !titleMatch && !bodyMatch) continue;

      // 교육적 맥락 확인 (high/critical만)
      if (bodyMatch && !urlMatch && !titleMatch) {
        if (group.riskLevel === 'high' || group.riskLevel === 'critical') {
          if (hasEducationalContext(pageText, kw, bodyIdx)) {
            chrome.runtime.sendMessage({
              type: 'EDUCATIONAL_CONTEXT_DETECTED',
              data: { keyword, url: window.location.href }
            }).catch(() => {});
            continue;
          }
        }
      }

      const source = urlMatch ? 'URL' : titleMatch ? '페이지 제목' : '페이지 본문';
      blockPage(
        `${source}에서 키워드 감지: "${keyword}" (${group.name})`,
        keyword,
        group.riskLevel
      );
      return;
    }
  }
}

// ─── 경고 오버레이 (gentle 모드) ─────────────────────────────────────

function showWarningOverlay(keyword, reason, riskLevel) {
  if (document.getElementById('acg-overlay')) return;
  const riskColor = riskLevel === 'critical' ? '#EF4444' : riskLevel === 'high' ? '#F97316' : '#FBBF24';
  const overlay = document.createElement('div');
  overlay.id = 'acg-overlay';
  overlay.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:2147483647;
    background:linear-gradient(135deg,#1a1a35,#2d1b69);
    border:2px solid ${riskColor}; border-radius:16px;
    padding:16px 20px; color:white;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:14px; max-width:320px;
    box-shadow:0 8px 32px rgba(139,92,246,0.4);
    animation:acgIn 0.3s ease;
  `;
  overlay.innerHTML = `
    <style>@keyframes acgIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}</style>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font-size:20px;">🛡️</span>
      <strong style="color:#A855F7;">AI Content Guardian</strong>
      <button onclick="document.getElementById('acg-overlay').remove()"
        style="margin-left:auto;background:none;border:none;color:#6B6B8D;cursor:pointer;font-size:18px;">✕</button>
    </div>
    <p style="margin:0;color:#E2E8F0;line-height:1.5;">
      ⚠️ <strong style="color:${riskColor};">"${keyword}"</strong> 키워드 감지
    </p>
    <p style="margin:4px 0 0;color:#A0A0C0;font-size:12px;">${reason}</p>
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button onclick="document.getElementById('acg-overlay').remove()"
        style="flex:1;padding:8px;background:rgba(139,92,246,0.2);border:1px solid #8B5CF6;border-radius:8px;color:#A855F7;cursor:pointer;font-size:13px;">
        계속 보기
      </button>
      <button onclick="window.history.back();document.getElementById('acg-overlay').remove()"
        style="flex:1;padding:8px;background:linear-gradient(135deg,#6C5CE7,#A855F7);border:none;border-radius:8px;color:white;cursor:pointer;font-size:13px;font-weight:600;">
        돌아가기
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay?.remove(), 12000);
}

// ─── 초기화 ───────────────────────────────────────────────────────────

async function init() {
  settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  youtubeApiKey = settings?.youtubeApiKey || null;

  startTracking();

  // 즉시 스캔
  if (document.readyState === 'complete') {
    setTimeout(scanPageContent, 500);
  } else {
    window.addEventListener('load', () => setTimeout(scanPageContent, 500));
  }

  // 5초마다 재스캔
  scanInterval = setInterval(scanPageContent, 5000);

  // 설정 변경 감지
  chrome.storage.onChanged.addListener(async () => {
    settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    youtubeApiKey = settings?.youtubeApiKey || null;
    isBlocked = false;
  });

  // background에서 스케줄 알림 수신
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SCHEDULE_ACTIVE') {
      const schedule = message.schedule;
      if (schedule.mode === 'block_all' && !isBlocked) {
        blockPage(`스케줄 차단: ${schedule.name} (${schedule.startTime}~${schedule.endTime})`, '', 'high');
      } else if (schedule.mode === 'focus_only') {
        showScheduleReminder(schedule);
      }
    }
  });

  // 현재 페이지 분류 결과를 background에 전송 (팝업에서 표시용)
  setTimeout(() => {
    if (currentPageClassification) {
      chrome.runtime.sendMessage({
        type: 'PAGE_CLASSIFIED',
        data: {
          label: currentPageClassification.label,
          labelDisplay: currentPageClassification.label_display || currentPageClassification.label,
          emoji: currentPageClassification.emoji,
          isProductive: currentPageClassification.isProductive,
          color: currentPageClassification.color,
          title: document.title,
          url: window.location.href,
        }
      }).catch(() => {});
    }
  }, 2000);
}

// 스케줄 리마인더 오버레이 (focus_only 모드)
function showScheduleReminder(schedule) {
  if (document.getElementById('acg-schedule-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'acg-schedule-overlay';
  overlay.style.cssText = `
    position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
    z-index:2147483647; background:linear-gradient(135deg,#1a1a35,#2d1b69);
    border:2px solid #3B82F6; border-radius:14px; padding:14px 20px;
    color:white; font-family:-apple-system,sans-serif; font-size:13px;
    box-shadow:0 8px 32px rgba(59,130,246,0.3); display:flex; align-items:center; gap:12px;
    animation:acgIn 0.3s ease;
  `;
  overlay.innerHTML = `
    <span style="font-size:20px;">📅</span>
    <div>
      <div style="font-weight:600;color:#93C5FD;">${schedule.name} 활성 중</div>
      <div style="color:#A0A0C0;font-size:11px;margin-top:2px;">${schedule.startTime}~${schedule.endTime} · 집중 모드</div>
    </div>
    <button onclick="document.getElementById('acg-schedule-overlay').remove()"
      style="background:none;border:none;color:#6B6B8D;cursor:pointer;font-size:16px;margin-left:8px;">✕</button>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay?.remove(), 8000);
}

init();
