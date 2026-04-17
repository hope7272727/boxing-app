// IRON_PUNCH — 라우터 + 뷰 렌더러
(function () {
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const profileModal = document.getElementById('profileModal');

  let state = {
    route: 'dashboard',
    profile: {
      name: '',
      difficulty: 'normal',
      stance: 'orthodox',
      venue: 'gym',
      minutes: 45,
      goal: 'technique',
    },
  };

  const mobileNav = document.getElementById('mobileNav');

  // ---------- ROUTER ----------
  function setRoute(r) {
    state.route = r;
    [...nav.querySelectorAll('a')].forEach(a => a.classList.toggle('active', a.dataset.route === r));
    if (mobileNav) [...mobileNav.querySelectorAll('a')].forEach(a => a.classList.toggle('active', a.dataset.route === r));
    render();
    window.scrollTo(0, 0);
  }

  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (!a) return;
    setRoute(a.dataset.route);
  });

  if (mobileNav) mobileNav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (!a) return;
    setRoute(a.dataset.route);
  });

  // ---------- PROFILE MODAL ----------
  function openProfileModal() {
    const last = STORAGE.getLastProfile();
    if (last) state.profile = { ...state.profile, ...last };
    syncPillsFromProfile();
    document.getElementById('fName').value = state.profile.name || '';
    profileModal.classList.add('open');
  }
  function closeProfileModal() { profileModal.classList.remove('open'); }

  function syncPillsFromProfile() {
    document.querySelectorAll('.modal .pill-group').forEach(group => {
      const key = group.dataset.group;
      const val = String(state.profile[key]);
      group.querySelectorAll('.pill').forEach(p => {
        p.classList.toggle('active', p.dataset.value === val);
      });
    });
  }

  profileModal.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (pill) {
      const group = pill.parentElement;
      group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const key = group.dataset.group;
      const val = pill.dataset.value;
      state.profile[key] = (key === 'minutes') ? parseInt(val, 10) : val;
    }
    if (e.target === profileModal) closeProfileModal();
  });

  const cancelBtn = document.getElementById('cancelProfile');
  const sideStartBtn = document.getElementById('sideStartBtn');
  const generateBtn = document.getElementById('generateBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeProfileModal);
  if (sideStartBtn) sideStartBtn.addEventListener('click', openProfileModal);

  function difficultyToParams(difficulty) {
    return {
      easy:   { level: 'beginner',     fatigue: 'high' },
      normal: { level: 'intermediate', fatigue: 'low' },
      hard:   { level: 'advanced',     fatigue: 'low' },
    }[difficulty] || { level: 'intermediate', fatigue: 'low' };
  }

  if (generateBtn) generateBtn.addEventListener('click', () => {
    const fName = document.getElementById('fName');
    state.profile.name = fName ? fName.value.trim() : '';
    STORAGE.saveLastProfile(state.profile);
    const dp = difficultyToParams(state.profile.difficulty);
    const buildProfile = { ...state.profile, level: dp.level, fatigue: dp.fatigue };
    const session = RECOMMENDER.buildSession(buildProfile);
    STORAGE.setCurrent(session);
    closeProfileModal();
    setRoute('today');
  });

  // ---------- VIEWS ----------
  function render() {
    updateSidebarRank();
    switch (state.route) {
      case 'dashboard': return renderDashboard();
      case 'today':     return renderToday();
      case 'logs':      return renderLogs();
      case 'settings':  return renderSettings();
      default:          return renderDashboard();
    }
  }

  function updateSidebarRank() {
    const sessions = STORAGE.getSessions();
    const done = sessions.filter(s => s.completedAt).length;
    const rank =
      done >= 30 ? 'CHAMPION' :
      done >= 15 ? 'CONTENDER' :
      done >= 5  ? 'AMATEUR' : 'ROOKIE';
    document.getElementById('sidebarRank').textContent = 'RANK · ' + rank;
  }

  // ---------- DASHBOARD ----------
  function renderDashboard() {
    const sessions = STORAGE.getSessions();
    const completed = sessions.filter(s => s.completedAt);
    const current = STORAGE.getCurrent();
    const streak = calcStreak(completed);
    const weeklyStats = calcWeekly(completed);
    const weeklyMinutes = weeklyStats.reduce((a, b) => a + b, 0);
    const totalRounds = completed.reduce((sum, s) => sum + countRounds(s), 0);

    const todayBlock = current
      ? `
        <div class="chip mb-16">오늘의 미션</div>
        <h2 class="font-display display-md mb-16">${escape(current.title)}</h2>
        <p class="body-lg mb-24">${escape(current.subtitle)}</p>
        <div class="flex gap-16 mb-24">
          <span class="label-sm">⚡ ${current.estMinutes}분</span>
          <span class="label-sm">${current.intensity.replace(/_/g, ' ')}</span>
          <span class="label-sm accent">${current.blocks.length} 블록</span>
        </div>
        <button class="btn btn-primary" data-action="go-today">START MISSION</button>
      `
      : `
        <div class="chip mb-16">NEW SESSION</div>
        <h2 class="font-display display-md mb-16">오늘 준비됐나?</h2>
        <p class="body-lg mb-24">프로필 입력하면 오늘 딱 맞는 루틴을 뽑아준다. 시작하자.</p>
        <button class="btn btn-primary" data-action="new-session">START WORKOUT</button>
      `;

    view.innerHTML = `
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">대시보드</div>
          <h1 class="font-display display-lg">
            <span class="white">PUSH THE</span><br />
            <span class="accent">LIMITS.</span>
          </h1>
          <p class="body-lg mt-16">${sessions.length === 0 ? '첫 세션을 시작하자.' : `이번 주 ${weeklyMinutes}분 — 계속 가자, 파이터.`}</p>
        </div>
        <div class="card-elev" style="min-width: 200px; text-align: right;">
          <div class="label-sm mb-8">CURRENT STREAK</div>
          <div class="font-display" style="font-size: 3rem; line-height: 1;">${streak}<span style="font-size: 1rem; color: var(--on-surface-dim); margin-left: 6px;">DAYS</span></div>
        </div>
      </div>

      ${renderDailyCombo()}

      <div class="grid grid-2 mb-32">
        <div class="card-hero">${todayBlock}</div>
        <div class="card">
          <div class="label-sm mb-16">QUICK LOG</div>
          ${completed.length === 0
            ? '<p class="body-sm">아직 완료된 세션이 없다. 오늘이 1일차.</p>'
            : `<p class="body-sm mb-16">최근: <span class="accent">${escape(completed[completed.length - 1].title)}</span></p>
               <div class="label-sm mb-8">완료된 세션</div>
               <div class="font-display accent" style="font-size: 2.5rem; line-height: 1;">${completed.length}</div>`
          }
          <button class="btn btn-secondary w-full mt-24" data-action="new-session">NEW SESSION</button>
        </div>
      </div>

      <div class="card mb-32">
        <div class="flex justify-between items-center mb-16">
          <div>
            <div class="label-sm">WEEKLY PROGRESS</div>
            <div class="title-md mt-8">주간 활동량 (분)</div>
          </div>
          <div class="font-display accent" style="font-size: 2rem;">${weeklyMinutes}</div>
        </div>
        <div class="chart">
          ${weeklyStats.map((m, i) => {
            const max = Math.max(...weeklyStats, 1);
            const h = Math.max(6, (m / max) * 100);
            const today = new Date().getDay();
            const idx = (today + 6) % 7;
            return `<div class="bar ${i === idx ? 'active' : ''}" style="height:${h}%" title="${m}분"></div>`;
          }).join('')}
        </div>
        <div class="chart-labels">
          ${['월','화','수','목','금','토','일'].map((d, i) => {
            const today = new Date().getDay();
            const idx = (today + 6) % 7;
            return `<span class="${i === idx ? 'today' : ''}">${d}</span>`;
          }).join('')}
        </div>
      </div>

      <div class="grid grid-stats">
        <div class="stat-card">
          <div class="label-sm mb-8">총 세션</div>
          <div class="stat-value white">${completed.length}</div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">총 라운드</div>
          <div class="stat-value">${totalRounds}</div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">누적 시간</div>
          <div class="stat-value white">${completed.reduce((s, ss) => s + (ss.actualMinutes || ss.estMinutes || 0), 0)}<span class="stat-unit"> 분</span></div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">현재 스트릭</div>
          <div class="stat-value">${streak}<span class="stat-unit"> 일</span></div>
        </div>
      </div>
    `;

    view.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const act = el.dataset.action;
        if (act === 'new-session') openProfileModal();
        else if (act === 'go-today') setRoute('today');
        else if (act === 'shuffle-combo') {
          window.shuffleDailyCombo();
          renderDashboard();
        }
      });
    });
  }

  // ---------- TODAY ----------
  function renderToday() {
    const current = STORAGE.getCurrent();
    if (!current) {
      view.innerHTML = `
        <div class="main-header">
          <div>
            <div class="label-sm mb-8">오늘의 루틴</div>
            <h1 class="font-display display-lg">아직 <span class="accent">세션이 없다.</span></h1>
          </div>
        </div>
        <div class="empty">
          <p class="body-lg mb-24">프로필 입력하고 오늘 루틴 뽑아라.</p>
          <button class="btn btn-primary" data-action="new-session">START NEW SESSION</button>
        </div>
      `;
      view.querySelector('[data-action="new-session"]').addEventListener('click', openProfileModal);
      return;
    }

    const done = current.blocks.filter(b => b.completed).length;
    const total = current.blocks.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    view.innerHTML = `
      <div class="main-header">
        <div style="flex:1">
          <div class="label-sm mb-8">오늘의 루틴 · ${escape(formatProfileSummary(current.profile))}</div>
          <h1 class="font-display display-lg">
            <span class="white">${escape(current.title.split('—')[0].trim())}</span><br />
            <span class="accent">${escape(current.title.split('—')[1]?.trim() || '')}</span>
          </h1>
          <p class="body-lg mt-16">${escape(current.subtitle)}</p>
        </div>
        <div class="card-elev" style="min-width: 220px;">
          <div class="flex justify-between mb-16">
            <div>
              <div class="label-sm">INTENSITY</div>
              <div class="title-md mt-8 accent">${current.intensity.replace(/_/g, ' ')}</div>
            </div>
            <div class="text-right">
              <div class="label-sm">예상</div>
              <div class="title-md mt-8">${current.estMinutes}분</div>
            </div>
          </div>
          <div class="mb-16">
            <div class="label-sm mb-8">예상 칼로리</div>
            <div class="font-display accent" style="font-size: 1.8rem;">${current.estCalories} <span style="font-size: 0.8rem; color: var(--on-surface-dim);">KCAL</span></div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="flex justify-between items-center mb-8">
          <div class="label-sm">PROGRESS</div>
          <div class="body-sm">${done}/${total} 블록 완료 · ${pct}%</div>
        </div>
        <div class="progress"><div class="fill" style="width: ${pct}%"></div></div>
      </div>

      <div>
        ${current.blocks.map((b, i) => renderBlock(b, i)).join('')}
      </div>

      <div class="card-elev mt-32">
        <div class="label-sm accent mb-8">COACH'S NOTE</div>
        <p class="body-lg" style="font-style: italic;">"${escape(current.notes)}"</p>
      </div>

      <div class="flex gap-16 mt-32">
        <button class="btn btn-danger" data-action="discard">DISCARD</button>
        <button class="btn btn-ghost" data-action="regenerate">루틴 다시 뽑기</button>
        <button class="btn btn-primary" data-action="finish">FINISH &amp; LOG</button>
      </div>
    `;

    view.querySelectorAll('[data-exercise-detail]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openExerciseModal(el.dataset.exerciseDetail);
      });
    });

    view.querySelectorAll('[data-block-toggle]').forEach(el => {
      el.addEventListener('click', () => {
        const i = parseInt(el.dataset.blockToggle, 10);
        current.blocks[i].completed = !current.blocks[i].completed;
        STORAGE.setCurrent(current);
        renderToday();
      });
    });

    view.querySelector('[data-action="discard"]').addEventListener('click', () => {
      if (confirm('이 세션을 버리시겠습니까?')) {
        STORAGE.clearCurrent();
        setRoute('dashboard');
      }
    });
    view.querySelector('[data-action="regenerate"]').addEventListener('click', () => {
      if (confirm('새 루틴으로 교체하시겠습니까? (현재 진행 상황 사라짐)')) {
        const fresh = RECOMMENDER.buildSession(current.profile);
        STORAGE.setCurrent(fresh);
        renderToday();
      }
    });
    view.querySelector('[data-action="finish"]').addEventListener('click', () => {
      if (done === 0) {
        if (!confirm('완료된 블록이 없다. 그래도 기록하시겠습니까?')) return;
      }
      current.completedAt = new Date().toISOString();
      current.actualMinutes = current.estMinutes;
      current.completedBlocks = done;
      current.totalBlocks = total;
      STORAGE.saveSession(current);
      STORAGE.clearCurrent();
      alert(`세션 완료! ${done}/${total} 블록 기록됨.`);
      setRoute('logs');
    });
  }

  // ---------- EXERCISE DETAIL MODAL ----------
  const exerciseModal = document.getElementById('exerciseModal');
  const exerciseModalContent = document.getElementById('exerciseModalContent');

  function openExerciseModal(id) {
    const ex = window.getExerciseById(id);
    if (!ex) return;
    const imgUrl = window.getExerciseImageUrl(ex, '720x400');
    const catLabel = window.CATEGORY_LABELS[ex.category] || ex.category;
    const levelLabel = { beginner: '초보', intermediate: '중급', advanced: '상급' }[ex.level] || ex.level;
    const venueLabel = ex.venue === 'gym' ? '복싱장' : ex.venue === 'home' ? '홈' : '어디서든';

    exerciseModalContent.innerHTML = `
      <button class="modal-close" data-close-exercise>✕</button>
      <div class="modal-hero" style="background-image: url('${imgUrl}')">
        <div>
          <div class="chip mb-16">${escape(catLabel)}</div>
          <div class="font-display display-md">${escape(ex.name)}</div>
        </div>
      </div>
      <div class="modal-body">
        <div class="flex gap-16 mb-24" style="flex-wrap:wrap;">
          <span class="label-sm accent">포커스 · ${escape(ex.focus)}</span>
          <span class="label-sm">${escape(levelLabel)}↑</span>
          <span class="label-sm">${escape(venueLabel)}</span>
        </div>

        ${ex.combo ? renderComboSequence(ex.combo) : ''}

        <p class="body-lg mb-32">${escape(ex.description)}</p>

        <div class="label-sm accent mb-16">SHORT CUE</div>
        <div class="card-elev mb-32" style="padding: 20px; font-style: italic;">
          "${escape(ex.cue)}"
        </div>

        <div class="label-sm accent mb-16">STEP-BY-STEP</div>
        <ol class="detail-steps mb-32">
          ${ex.steps.map(s => `<li>${escape(s)}</li>`).join('')}
        </ol>

        <div class="label-sm dim mb-16">흔한 실수 · 피해야 할 것</div>
        <ul class="detail-mistakes mb-32">
          ${ex.mistakes.map(m => `<li>${escape(m)}</li>`).join('')}
        </ul>

        <div class="body-sm muted" style="border-top: 1px solid var(--outline-variant); padding-top: 16px;">
          ※ 참고 사진은 Unsplash 키워드(${escape(ex.imgQuery)}) 검색 결과. 정확한 기술 시범은 코치 지도를 권장.
        </div>
      </div>
    `;
    exerciseModal.classList.add('open');
  }

  function closeExerciseModal() { exerciseModal.classList.remove('open'); }

  exerciseModal.addEventListener('click', (e) => {
    if (e.target === exerciseModal || e.target.closest('[data-close-exercise]')) {
      closeExerciseModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeExerciseModal(); closeProfileModal(); }
  });

  function renderDailyCombo() {
    const dc = window.getDailyCombo ? window.getDailyCombo() : null;
    if (!dc) return '';
    const seq = renderComboSequence(dc.combo);
    return `
      <div class="card-hero daily-combo-card mb-32">
        <div class="flex justify-between items-center mb-16">
          <div class="chip">TODAY'S COMBINATION</div>
          <button class="btn btn-sm btn-ghost" data-action="shuffle-combo">다른 콤보</button>
        </div>
        ${seq}
        <p class="body-lg mt-16">${escape(dc.cue)}</p>
      </div>
    `;
  }

  function renderComboSequence(combo) {
    if (!combo || !combo.length) return '';
    const legend = window.PUNCH_LEGEND || {};
    const stance = (state.profile && state.profile.stance) || 'orthodox';
    const pills = combo.map(p => {
      const key = String(p);
      const info = legend[key];
      const isDefense = info && info.type === 'defense';
      const isBody = info && info.level === 'body';
      const cls = isDefense ? 'combo-pill defense' : isBody ? 'combo-pill body' : 'combo-pill';
      const label = info ? info.short : key;
      let handTag = '';
      if (info && info.hand && info.hand !== 'none') {
        const handLabel = stance === 'southpaw'
          ? (info.hand === 'lead' ? '오' : '왼')
          : (info.hand === 'lead' ? '왼' : '오');
        handTag = `<span class="combo-hand">${handLabel}</span>`;
      }
      return `<span class="${cls}" title="${info ? info.name : key}"><span class="combo-num">${key}</span><span class="combo-label">${label}</span>${handTag}</span>`;
    });
    return `<div class="combo-sequence">${pills.join('<span class="combo-arrow">→</span>')}</div>`;
  }

  function renderBlock(b, i) {
    const params = b.params || {};
    let metaText = '';
    if (params.duration) metaText = `<strong>${params.duration}</strong>${params.unit === 'min' ? ' MIN' : ''}`;
    else if (params.rounds) metaText = `<strong>${params.rounds}</strong> RDS × <strong>${params.roundMin}</strong>M · 휴식 ${params.restSec}S`;
    else if (params.sets) metaText = `<strong>${params.sets}</strong> 세트 × <strong>${params.reps}</strong> 회 · 휴식 ${params.restSec}S`;

    const phaseLabel = {
      warmup: 'WARM-UP',
      shadow: 'SHADOW',
      bag: 'HEAVY BAG',
      combo: 'COMBINATION',
      sparring: 'SPARRING',
      bodyweight: 'BODYWEIGHT',
      conditioning: 'CONDITIONING',
      cooldown: 'COOL-DOWN',
    }[b.phase] || b.phase.toUpperCase();

    const comboHtml = (b.params && b.params.combo) ? renderComboSequence(b.params.combo) : '';

    return `
      <div class="session-block ${b.completed ? 'completed' : ''} ${comboHtml ? 'has-combo' : ''}">
        <div class="block-index">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <div class="block-phase">${phaseLabel} · ${escape(b.focus || '')}</div>
          <div class="block-name">
            <button class="block-name-button" data-exercise-detail="${escape(b.id)}">
              ${escape(b.name)}
              <span class="info-icon">i</span>
            </button>
          </div>
          ${comboHtml}
          <div class="block-cue">${escape(b.cue)}</div>
          <div class="block-meta">${metaText}</div>
        </div>
        <button class="check-btn" data-block-toggle="${i}">${b.completed ? '✓' : '○'}</button>
      </div>
    `;
  }

  // ---------- LOGS ----------
  function renderLogs() {
    const sessions = STORAGE.getSessions()
      .filter(s => s.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    if (sessions.length === 0) {
      view.innerHTML = `
        <div class="main-header">
          <div>
            <div class="label-sm mb-8">훈련 기록</div>
            <h1 class="font-display display-lg"><span class="white">TRAINING</span><span class="accent">_LOGS</span></h1>
          </div>
        </div>
        <div class="empty">
          <p class="body-lg mb-24">아직 기록이 없다. 첫 세션부터 시작하자.</p>
          <button class="btn btn-primary" data-action="new-session">첫 세션 시작</button>
        </div>
      `;
      view.querySelector('[data-action="new-session"]').addEventListener('click', openProfileModal);
      return;
    }

    const totalMin = sessions.reduce((s, ss) => s + (ss.actualMinutes || ss.estMinutes || 0), 0);
    const totalRounds = sessions.reduce((s, ss) => s + countRounds(ss), 0);
    const totalCals = sessions.reduce((s, ss) => s + (ss.estCalories || 0), 0);

    // 월간 목표 (임의: 월 12 세션)
    const thisMonth = sessions.filter(s => {
      const d = new Date(s.completedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const monthGoal = 12;
    const monthPct = Math.min(100, Math.round((thisMonth / monthGoal) * 100));

    view.innerHTML = `
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">SESSION HISTORY &amp; PERFORMANCE DATA</div>
          <h1 class="font-display display-lg"><span class="white">TRAINING</span><span class="accent">_LOGS</span></h1>
        </div>
      </div>

      <div class="grid grid-2 mb-32">
        <div>
          <div class="grid grid-stats mb-24">
            <div class="stat-card">
              <div class="label-sm mb-8">TOTAL SESSIONS</div>
              <div class="stat-value white">${sessions.length}</div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">TOTAL ROUNDS</div>
              <div class="stat-value">${totalRounds}</div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">TOTAL MIN</div>
              <div class="stat-value white">${totalMin}</div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">KCAL</div>
              <div class="stat-value">${totalCals.toLocaleString()}</div>
            </div>
          </div>

          <div class="label-sm mb-16">최근 세션</div>
          ${sessions.slice(0, 20).map(s => {
            const d = new Date(s.completedAt);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
            const rounds = countRounds(s);
            return `
              <div class="log-row" data-session-id="${s.id}">
                <div class="log-date"><div class="month">${mm}</div><div class="day">${dd}</div></div>
                <div>
                  <div class="log-title">${escape(s.title)}</div>
                  <div class="log-meta">${s.completedBlocks || 0}/${s.totalBlocks || s.blocks.length} 블록 · ${rounds} RDS · ${s.actualMinutes || s.estMinutes} MIN</div>
                </div>
                <div class="accent label-md">${s.intensity.replace(/_/g, ' ')}</div>
                <button class="btn btn-sm btn-ghost" data-delete="${s.id}">삭제</button>
              </div>
            `;
          }).join('')}
        </div>

        <div>
          <div class="card-accent mb-16">
            <div class="label-sm" style="color:#3a0c00;">MONTHLY GOAL</div>
            <div class="font-display display-md mt-8" style="color: #1a0600;">${thisMonth}<span style="font-size: 0.9rem;">/${monthGoal}</span></div>
            <div class="progress mt-16" style="background: rgba(0,0,0,0.25);">
              <div class="fill" style="width: ${monthPct}%; background: #1a0600;"></div>
            </div>
            <div class="label-sm mt-16" style="color:#3a0c00;">${monthPct}% 달성</div>
          </div>

          <div class="card-elev mb-16">
            <div class="label-sm mb-8">최근 목표 분포</div>
            ${renderGoalDist(sessions.slice(0, 30))}
          </div>

          <div class="card-elev">
            <div class="label-sm mb-8">NEXT PHASE</div>
            <div class="font-display accent" style="font-size: 1.4rem;">${sessions.length >= 30 ? 'CHAMPION' : sessions.length >= 15 ? 'CONTENDER' : sessions.length >= 5 ? 'AMATEUR' : 'ROOKIE'}</div>
            <p class="body-sm mt-8">${sessions.length >= 30 ? '최정상. 계속 유지하라.' : `다음 티어까지 ${sessions.length >= 15 ? 30 - sessions.length : sessions.length >= 5 ? 15 - sessions.length : 5 - sessions.length} 세션.`}</p>
          </div>
        </div>
      </div>
    `;

    view.querySelectorAll('[data-delete]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('이 세션 기록을 삭제하시겠습니까?')) {
          STORAGE.deleteSession(b.dataset.delete);
          renderLogs();
        }
      });
    });
  }

  function renderGoalDist(sessions) {
    const labels = { technique: '기술', power: '파워', cardio: '카디오', endurance: '지구력', weightloss: '감량' };
    const counts = {};
    sessions.forEach(s => {
      const g = s.profile?.goal || 'technique';
      counts[g] = (counts[g] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.keys(labels).map(k => {
      const c = counts[k] || 0;
      const pct = Math.round((c / total) * 100);
      return `
        <div style="margin-bottom: 10px;">
          <div class="flex justify-between" style="font-size: 0.75rem; color: var(--on-surface-dim); margin-bottom: 4px;">
            <span>${labels[k]}</span><span>${c} (${pct}%)</span>
          </div>
          <div class="progress"><div class="fill" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');
  }

  // ---------- SETTINGS ----------
  function renderSettings() {
    const sessions = STORAGE.getSessions();
    view.innerHTML = `
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">설정</div>
          <h1 class="font-display display-lg"><span class="white">SETTINGS</span></h1>
        </div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">데이터 관리</div>
        <p class="body-sm mb-24">현재 저장된 세션: <strong>${sessions.length}개</strong>. 모든 데이터는 이 브라우저에만 저장된다.</p>
        <div class="flex gap-16">
          <button class="btn btn-secondary" data-action="export">JSON 내보내기</button>
          <button class="btn btn-secondary" data-action="import">JSON 가져오기</button>
          <button class="btn btn-danger" data-action="clear">전체 삭제</button>
        </div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">이 앱에 대해</div>
        <p class="body-sm">
          IRON_PUNCH는 복싱 훈련 기록/추천 도구다. 맨몸·샌드백·섀도우·스파링 중심으로 구성되며, 기구를 사용하는 웨이트는 포함되지 않는다.
          주 3일 복싱장 + 비복싱장 날을 대비한 홈 루틴을 둘 다 추천한다.
        </p>
      </div>

      <input type="file" id="importFile" accept=".json" style="display:none" />
    `;

    view.querySelector('[data-action="export"]').addEventListener('click', () => {
      const data = JSON.stringify({ sessions: STORAGE.getSessions() }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ironpunch-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    view.querySelector('[data-action="import"]').addEventListener('click', () => {
      document.getElementById('importFile').click();
    });
    view.querySelector('#importFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.sessions && Array.isArray(data.sessions)) {
            data.sessions.forEach(s => STORAGE.saveSession(s));
            alert(`${data.sessions.length}개 세션을 가져왔다.`);
            renderSettings();
          } else alert('잘못된 파일 형식.');
        } catch { alert('JSON 파싱 실패.'); }
      };
      reader.readAsText(file);
    });

    view.querySelector('[data-action="clear"]').addEventListener('click', () => {
      if (confirm('모든 데이터를 삭제한다. 되돌릴 수 없다. 계속할까?')) {
        STORAGE.clearAll();
        renderSettings();
      }
    });
  }

  // ---------- HELPERS ----------
  function calcStreak(completed) {
    if (completed.length === 0) return 0;
    const days = new Set(completed.map(s => new Date(s.completedAt).toDateString()));
    let streak = 0;
    let d = new Date();
    while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    // 오늘 안했으면 어제부터 카운트
    if (streak === 0) {
      d = new Date(); d.setDate(d.getDate() - 1);
      while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    }
    return streak;
  }

  function calcWeekly(completed) {
    const arr = [0, 0, 0, 0, 0, 0, 0]; // 월~일
    const now = new Date();
    const monday = new Date(now);
    const day = (now.getDay() + 6) % 7;
    monday.setDate(now.getDate() - day); monday.setHours(0, 0, 0, 0);
    completed.forEach(s => {
      const d = new Date(s.completedAt);
      if (d >= monday) {
        const idx = (d.getDay() + 6) % 7;
        arr[idx] += (s.actualMinutes || s.estMinutes || 0);
      }
    });
    return arr;
  }

  function countRounds(session) {
    return (session.blocks || []).reduce((s, b) => s + (b.params?.rounds || 0), 0);
  }

  function formatProfileSummary(p) {
    const diff = { easy: '하', normal: '중', hard: '상' }[p.difficulty] || p.level || '중';
    const v = p.venue === 'gym' ? '복싱장' : '집';
    return `난이도 ${diff} · ${v} · ${p.minutes}분`;
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- INIT ----------
  const hash = (window.location.hash || '').replace('#', '');
  if (['dashboard', 'today', 'logs', 'settings'].includes(hash)) {
    setRoute(hash);
  } else {
    render();
  }
})();
