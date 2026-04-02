/**
 * AI Content Guardian - Blocked Page Script
 * 차단 페이지에서 목표 기반 동기부여 슬라이드를 자동 재생합니다.
 */

const params = new URLSearchParams(window.location.search);
const reason = params.get('reason') || '유해 콘텐츠가 감지되었습니다.';
const keyword = params.get('keyword') || '';

document.getElementById('reasonText').textContent = reason;
if (keyword) {
  document.getElementById('keywordBadge').innerHTML =
    '<span class="keyword-badge">🔍 "' + keyword + '"</span>';
}

// ─── 슬라이드 데이터 ─────────────────────────────────────────────────

var DEFAULT_SLIDES = [
  { emoji: '🛡️', title: '차단되었습니다', message: '지금 이 순간이 중요합니다.\n더 나은 선택을 할 수 있어요.' },
  { emoji: '⏰', title: '시간의 가치', message: '지금 이 30분을 목표에 투자하면\n1년 후 당신은 달라져 있을 거예요.' },
  { emoji: '💪', title: '유혹을 이겨냈어요', message: '집중 세션을 시작하거나\n목표 관련 활동을 해보세요.' },
  { emoji: '🚀', title: '지금 시작하세요', message: '완벽한 때는 없습니다.\n지금 이 순간이 가장 좋은 시작점입니다.' },
];

var slides = DEFAULT_SLIDES.slice();
var currentSlide = 0;
var progressInterval = null;
var progressValue = 0;

// 앱에서 목표 데이터 로드
function loadUserGoals() {
  chrome.storage.local.get(['userGoals', 'userDreams'], function(result) {
    var goals = result.userGoals;
    var dreams = result.userDreams;
    if (goals && goals.length > 0) {
      buildPersonalizedSlides(goals, dreams || []);
    }
  });
}

function buildPersonalizedSlides(goals, dreams) {
  var goal = goals[0] || '더 나은 나';
  var dream = dreams[0] || '꿈';
  var kw = keyword || '유해 콘텐츠';

  slides = [
    { emoji: '🛡️', title: '차단되었습니다', message: '"' + kw + '"가 감지되어 차단했습니다.\n지금 이 순간이 중요합니다.' },
    { emoji: '🎯', title: '당신의 목표', message: '"' + goal + '"\n\n이 목표를 위해 지금 이 시간이 필요합니다.' },
    { emoji: '💭', title: '잠깐 생각해보세요', message: '지금 보려던 것이\n' + goal + '에 도움이 되나요?\n\n아니라면, 더 나은 선택을 할 수 있어요.' },
    { emoji: '⏰', title: '시간의 가치', message: '지금 이 30분을\n' + goal + '에 투자하면\n1년 후 당신은 달라져 있을 거예요.' },
    { emoji: '🌟', title: '당신의 꿈', message: '"' + dream + '"\n\n그 꿈을 이루는 사람들은\n지금 이 순간 다른 선택을 합니다.' },
    { emoji: '💪', title: '지금 할 수 있는 것', message: '• 25분 집중 세션 시작하기\n• 목표 관련 책 읽기\n• 운동 10분 하기\n• 계획 세우기' },
    { emoji: '🚀', title: '시작하세요', message: '완벽한 때는 없습니다.\n지금 이 순간이\n가장 좋은 시작점입니다.' },
  ];
  renderSlide();
  buildDots();
}

// ─── 슬라이드 렌더링 ─────────────────────────────────────────────────

function renderSlide() {
  var slide = slides[currentSlide];
  var container = document.getElementById('slideContainer');
  if (!container) return;

  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';

  setTimeout(function() {
    document.getElementById('slideEmoji').textContent = slide.emoji;
    document.getElementById('slideTitle').textContent = slide.title;
    document.getElementById('slideMessage').textContent = slide.message;
    updateDots();
    container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 200);
}

function buildDots() {
  var dotsContainer = document.getElementById('slideDots');
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  slides.forEach(function(_, i) {
    var dot = document.createElement('div');
    dot.className = 'slide-dot' + (i === currentSlide ? ' active' : '');
    dotsContainer.appendChild(dot);
  });
}

function updateDots() {
  var dots = document.querySelectorAll('.slide-dot');
  dots.forEach(function(dot, i) {
    dot.classList.toggle('active', i === currentSlide);
  });
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  renderSlide();
  resetProgressBar();
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  renderSlide();
  resetProgressBar();
}

// ─── 진행 바 ─────────────────────────────────────────────────────────

function startProgressBar() {
  progressValue = 0;
  var bar = document.getElementById('progressBar');
  if (!bar) return;
  if (progressInterval) clearInterval(progressInterval);
  progressInterval = setInterval(function() {
    progressValue += 1;
    bar.style.width = progressValue + '%';
    if (progressValue >= 100) {
      clearInterval(progressInterval);
      nextSlide();
    }
  }, 50);
}

function resetProgressBar() {
  if (progressInterval) clearInterval(progressInterval);
  var bar = document.getElementById('progressBar');
  if (bar) bar.style.width = '0%';
  startProgressBar();
}

// ─── 카운트다운 타이머 ────────────────────────────────────────────────

var sec = 30;
var timerEl = document.getElementById('timer');
var backBtn = document.getElementById('backBtn');

timerEl.textContent = sec + '초 후 돌아가기 버튼이 활성화됩니다';
backBtn.disabled = true;
backBtn.style.opacity = '0.5';
backBtn.style.cursor = 'not-allowed';

var countdownInterval = setInterval(function() {
  sec--;
  if (sec <= 0) {
    clearInterval(countdownInterval);
    timerEl.textContent = '이제 돌아갈 수 있습니다.';
    backBtn.disabled = false;
    backBtn.style.opacity = '1';
    backBtn.style.cursor = 'pointer';
  } else {
    timerEl.textContent = sec + '초 후 돌아가기 버튼이 활성화됩니다';
  }
}, 1000);

backBtn.addEventListener('click', function() { if (!backBtn.disabled) history.back(); });
document.getElementById('closeBtn').addEventListener('click', function() { window.close(); });
document.getElementById('prevSlideBtn').addEventListener('click', prevSlide);
document.getElementById('nextSlideBtn').addEventListener('click', nextSlide);

// ─── 초기화 ───────────────────────────────────────────────────────────

loadUserGoals();
buildDots();
renderSlide();
startProgressBar();

// Multi-Agent 생성 영상 확인 (Lambda가 설정된 경우)
checkForGeneratedVideo();

// ─── Multi-Agent 생성 영상 재생 ───────────────────────────────────────

function checkForGeneratedVideo() {
  chrome.storage.local.get(['latestVideoUrl', 'latestVideoCreatedAt'], function(result) {
    var videoUrl = result.latestVideoUrl;
    var createdAt = result.latestVideoCreatedAt;

    // 5분 이내에 생성된 영상만 표시
    if (!videoUrl || !createdAt || (Date.now() - createdAt) > 5 * 60 * 1000) return;

    // 영상 메타데이터 로드
    fetch(videoUrl)
      .then(function(r) { return r.json(); })
      .then(function(meta) {
        if (meta.frames && meta.frames.length > 0) {
          showGeneratedVideo(meta);
          // 사용한 영상 URL 초기화
          chrome.storage.local.remove(['latestVideoUrl', 'latestVideoCreatedAt']);
        }
      })
      .catch(function(e) { console.log('[Blocked] 영상 로드 실패:', e); });
  });

  // 30초 후 재확인 (Lambda 처리 시간 고려)
  setTimeout(function() {
    chrome.storage.local.get(['latestVideoUrl', 'latestVideoCreatedAt'], function(result) {
      if (result.latestVideoUrl && result.latestVideoCreatedAt &&
          (Date.now() - result.latestVideoCreatedAt) < 5 * 60 * 1000) {
        fetch(result.latestVideoUrl)
          .then(function(r) { return r.json(); })
          .then(function(meta) {
            if (meta.frames && meta.frames.length > 0) {
              showGeneratedVideo(meta);
              chrome.storage.local.remove(['latestVideoUrl', 'latestVideoCreatedAt']);
            }
          })
          .catch(function() {});
      }
    });
  }, 30000);
}

function showGeneratedVideo(meta) {
  // 기존 슬라이드를 AI 생성 영상으로 교체
  var rightPanel = document.querySelector('.right-panel');
  if (!rightPanel) return;

  // 진행 바 중지
  if (progressInterval) clearInterval(progressInterval);

  // AI 생성 영상 패널로 교체
  rightPanel.innerHTML = '<div style="padding:20px; text-align:center;">' +
    '<div style="font-size:11px; color:#10B981; font-weight:600; letter-spacing:1px; text-transform:uppercase; margin-bottom:16px;">✨ AI가 당신을 위해 만든 영상</div>' +
    '<div id="aiVideoSlideshow" style="position:relative; border-radius:16px; overflow:hidden; background:#000;"></div>' +
    '<div style="font-size:13px; color:#A0A0C0; margin-top:12px; line-height:1.6;">' + (meta.narration || '') + '</div>' +
    '</div>';

  // AI 생성 이미지로 슬라이드쇼 재생
  var aiSlides = meta.frames;
  var aiCurrent = 0;
  var slideshow = document.getElementById('aiVideoSlideshow');

  function showAiSlide() {
    var frame = aiSlides[aiCurrent];
    slideshow.innerHTML = '<img src="' + frame.url + '" style="width:100%; height:240px; object-fit:cover; border-radius:16px;" />' +
      '<div style="position:absolute; bottom:12px; left:12px; background:rgba(0,0,0,0.7); border-radius:8px; padding:6px 12px; font-size:13px; font-weight:600; color:#FFF;">' + frame.title + '</div>';
    aiCurrent = (aiCurrent + 1) % aiSlides.length;
  }

  showAiSlide();

  // 오디오 재생
  if (meta.audioUrl) {
    var audio = new Audio(meta.audioUrl);
    audio.play().catch(function() {});
  }

  // 슬라이드 자동 전환
  setInterval(showAiSlide, 5000);
}
