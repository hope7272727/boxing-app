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
      venue: 'gym',
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
    const fNameEl = document.getElementById('fName');
    if (fNameEl) fNameEl.value = state.profile.name || '';
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
      state.profile[key] = val;
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
    const userProf = STORAGE.getUserProfile();
    const stanceVal = userProf.stance || 'orthodox';
    const weightVal = parseFloat(userProf.weight) || 70;
    const buildProfile = { ...state.profile, minutes: 45, level: dp.level, fatigue: dp.fatigue, stance: stanceVal, weight: weightVal };
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
      case 'guide':     return renderGuide();
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
    const totalRounds = completed.reduce((sum, s) => sum + countRounds(s), 0);

    const todayBlock = current
      ? `
        <div class="chip mb-16">진행 중</div>
        <div class="flex gap-16 mb-16">
          <span class="label-sm">${escape(formatProfileSummary(current.profile))}</span>
        </div>
        <button class="btn btn-primary" data-action="go-today">이어하기</button>
      `
      : `
        <button class="btn btn-primary" data-action="new-session">START MISSION</button>
      `;

    view.innerHTML = `
      ${renderAuthBar()}
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">메인 화면</div>
          <h1 class="font-display display-lg">
            <span class="white">Round One,</span><br />
            <span class="accent">Fight!</span>
          </h1>
        </div>
        <div class="card-elev" style="min-width: 200px;">
          ${(() => {
            const up = (window.STORAGE && window.STORAGE.getUserProfile) ? window.STORAGE.getUserProfile() : {};
            const gd = up.gender === 'female' ? '여성' : '남성';
            const ag = up.age || '—';
            const h = up.height || '—';
            const w = up.weight || '—';
            const st = up.stance === 'southpaw' ? '사우스포' : '오소독스';
            return `
              <div class="label-sm accent mb-16">MY PROFILE</div>
              <div class="flex justify-between mb-8">
                <span class="body-sm">${gd} / ${ag}세</span>
                <span class="title-md white">${h}<span class="stat-unit">cm</span> · ${w}<span class="stat-unit">kg</span></span>
              </div>
              <div class="flex justify-between">
                <span class="body-sm">스탠스</span>
                <span class="title-md accent">${st}</span>
              </div>
            `;
          })()}
        </div>
      </div>

      ${renderDailyCombo()}

      <div class="grid grid-2 mb-32">
        <div class="card-hero">${todayBlock}</div>
        <div class="card">
          ${completed.length > 0
            ? `<div class="label-sm mb-8">완료 미션</div>
               <div class="font-display accent" style="font-size: 2.5rem; line-height: 1;">${completed.length}</div>`
            : ''
          }
          <button class="btn btn-secondary w-full ${completed.length > 0 ? 'mt-24' : ''}" data-action="new-session">NEW MISSION</button>
        </div>
      </div>

      <div class="card mb-32">
        <div class="label-sm mb-16">이번 주 미션</div>
        <div class="week-check">
          ${['월','화','수','목','금','토','일'].map((d, i) => {
            const today = new Date().getDay();
            const idx = (today + 6) % 7;
            const now = new Date();
            const monday = new Date(now);
            monday.setDate(now.getDate() - idx);
            monday.setHours(0, 0, 0, 0);
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + i);
            const done = completed.some(s => {
              const cd = new Date(s.completedAt);
              return cd.toDateString() === dayDate.toDateString();
            });
            const isToday = i === idx;
            const isPast = i < idx;
            const cls = done ? 'day-done' : (isPast ? 'day-missed' : (isToday ? 'day-today' : 'day-future'));
            return `<div class="day-cell ${cls}">
              <div class="day-label">${d}</div>
              <div class="day-icon">${done ? '✓' : (isPast ? '✗' : (isToday ? '—' : ''))}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="grid grid-stats">
        <div class="stat-card">
          <div class="label-sm mb-8">총 미션</div>
          <div class="stat-value white">${completed.length}</div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">최대 연속</div>
          <div class="stat-value">${calcMaxStreak(completed)}<span class="stat-unit"> 일</span></div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">이번 주</div>
          <div class="stat-value white">${weeklyStats.filter(m => m > 0).length}<span class="stat-unit"> / 7</span></div>
        </div>
        <div class="stat-card">
          <div class="label-sm mb-8">총 칼로리</div>
          <div class="stat-value">${completed.reduce((s, ss) => s + (ss.estCalories || 0), 0).toLocaleString()}<span class="stat-unit"> kcal</span></div>
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
        else if (act === 'google-login' && window.AUTH) {
          window.AUTH.login();
        }
        else if (act === 'logout' && window.AUTH) {
          window.AUTH.logout().then(function () { renderDashboard(); });
        }
        else if (act === 'toggle-profile-menu') {
          const menu = document.getElementById('profileMenu');
          if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
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
            <div class="label-sm mb-8">오늘의 목표</div>
            <h1 class="font-display display-lg">아직 <span class="accent">미션이 없습니다.</span></h1>
          </div>
        </div>
        <div class="empty">
          <p class="body-lg mb-24">프로필을 입력하고 오늘의 루틴을 생성해보세요.</p>
          <button class="btn btn-primary" data-action="new-session">START NEW MISSION</button>
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
          <div class="chip mb-16">일일 퀘스트</div>
        </div>
        <div class="card-elev" style="min-width: 220px;">
          <div class="font-display headline-md accent mb-8">${escape(formatProfileSummary(current.profile))}</div>
          <div class="flex justify-between">
            <div class="text-right">
              <div class="label-sm">칼로리</div>
              <div class="title-md mt-8 accent">${current.estCalories} KCAL</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="flex justify-between items-center mb-8">
          <div class="label-sm">TO DO LIST</div>
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
      if (confirm('이 미션을 버리시겠습니까?')) {
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
        if (!confirm('완료된 블록이 없습니다. 그래도 기록하시겠습니까?')) return;
      }
      current.completedAt = new Date().toISOString();
      current.actualMinutes = current.estMinutes;
      current.completedBlocks = done;
      current.totalBlocks = total;
      STORAGE.saveSession(current);
      if (window.AUTH && window.AUTH.user) window.AUTH.saveSessionCloud(current);
      STORAGE.clearCurrent();
      alert(`미션 완료! ${done}/${total} 블록이 기록되었습니다.`);
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

  function comboToText(combo) {
    const legend = window.PUNCH_LEGEND || {};
    const userProfile = (window.STORAGE && window.STORAGE.getUserProfile) ? window.STORAGE.getUserProfile() : {};
    const stance = userProfile.stance || 'orthodox';
    const punchNames = {
      1: '잽', 2: '스트레이트', 3: '훅', 4: '훅', 5: '어퍼', 6: '어퍼',
      '2b': '바디', '5b': '바디', '6b': '바디',
      'SL': '슬립', 'WV': '위브', 'DK': '더킹', 'SB': '스텝백', 'PV': '피벗',
    };
    return combo.map(p => {
      const key = String(p);
      const info = legend[key];
      if (!info || info.type === 'defense') return punchNames[key] || key;
      const dir = stance === 'southpaw'
        ? (info.hand === 'lead' ? '우' : '좌')
        : (info.hand === 'lead' ? '좌' : '우');
      const base = info.level === 'body' ? '바디' : punchNames[key] || key;
      if (key === '1') return '잽';
      if (key === '2') return '스트레이트';
      return '(' + dir + ')' + base;
    }).join('-');
  }

  function renderDailyCombo() {
    const dc = window.getDailyCombo ? window.getDailyCombo() : null;
    if (!dc) return '';
    const seq = renderComboSequence(dc.combo);
    return `
      <div class="card-hero daily-combo-card mb-32">
        <div class="flex justify-between items-center mb-16">
          <div>
            <h2 class="font-display headline-md mb-8">오늘의 콤비네이션</h2>
            <div class="chip">TODAY'S COMBINATION</div>
          </div>
          <button class="btn btn-sm btn-ghost" data-action="shuffle-combo">다른 콤보</button>
        </div>
        ${seq}
        <p class="body-lg mt-16">${escape(comboToText(dc.combo))}</p>
      </div>
    `;
  }

  function renderComboSequence(combo) {
    if (!combo || !combo.length) return '';
    const legend = window.PUNCH_LEGEND || {};
    const userProfile = STORAGE.getUserProfile();
    const stance = (userProfile && userProfile.stance) || 'orthodox';
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
          ? (info.hand === 'lead' ? '우' : '좌')
          : (info.hand === 'lead' ? '좌' : '우');
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
          <div class="block-cue">${b.params && b.params.combo ? escape(comboToText(b.params.combo)) : escape(b.cue)}</div>
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
          <p class="body-lg mb-24">아직 기록이 없습니다. 첫 미션을 시작해보세요.</p>
          <button class="btn btn-primary" data-action="new-session">첫 미션 시작</button>
        </div>
      `;
      view.querySelector('[data-action="new-session"]').addEventListener('click', openProfileModal);
      return;
    }

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
          <div class="label-sm mb-8">MISSION HISTORY &amp; PERFORMANCE DATA</div>
          <h1 class="font-display display-lg"><span class="white">TRAINING</span><span class="accent">_LOGS</span></h1>
        </div>
      </div>

      <div class="grid grid-2 mb-32">
        <div>
          <div class="grid grid-stats mb-24">
            <div class="stat-card">
              <div class="label-sm mb-8">총 미션</div>
              <div class="stat-value white">${sessions.length}</div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">최대 연속</div>
              <div class="stat-value">${calcMaxStreak(sessions)}<span class="stat-unit"> 일</span></div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">이번 주</div>
              <div class="stat-value white">${calcWeekly(sessions).filter(m => m > 0).length}<span class="stat-unit"> / 7</span></div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">총 칼로리</div>
              <div class="stat-value">${totalCals.toLocaleString()}<span class="stat-unit"> kcal</span></div>
            </div>
          </div>
          <div class="grid grid-stats mb-24">
            <div class="stat-card">
              <div class="label-sm mb-8">총 라운드</div>
              <div class="stat-value">${totalRounds}</div>
            </div>
            <div class="stat-card">
              <div class="label-sm mb-8">평균 칼로리</div>
              <div class="stat-value white">${sessions.length ? Math.round(totalCals / sessions.length) : 0}<span class="stat-unit"> kcal</span></div>
            </div>
          </div>

          <div class="label-sm mb-16">최근 미션</div>
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
                  <div class="log-meta">${s.completedBlocks || 0}/${s.totalBlocks || s.blocks.length} 블록 · ${rounds} RDS</div>
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
            <p class="body-sm mt-8">${sessions.length >= 30 ? '최정상입니다. 계속 유지하세요.' : `다음 티어까지 ${sessions.length >= 15 ? 30 - sessions.length : sessions.length >= 5 ? 15 - sessions.length : 5 - sessions.length} 미션입니다.`}</p>
          </div>
        </div>
      </div>
    `;

    view.querySelectorAll('[data-delete]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('이 미션 기록을 삭제하시겠습니까?')) {
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
  // ---------- GUIDE ----------
  function renderGuide() {
    view.innerHTML = `
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">GUIDE</div>
          <h1 class="font-display display-lg">이용<span class="accent">가이드</span></h1>
        </div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">펀치 넘버링 시스템</div>
        <div class="body-sm mb-8">모든 콤비네이션은 아래 번호로 표시됩니다.</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;">
          <div class="card-elev" style="padding:12px;"><strong class="accent">1</strong> — 잽 (앞손 직선)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">2</strong> — 스트레이트/크로스 (뒷손 직선)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">3</strong> — 리드 훅 (앞손 훅)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">4</strong> — 리어 훅 (뒷손 훅)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">5</strong> — 리드 어퍼컷 (앞손 어퍼)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">6</strong> — 리어 어퍼컷 (뒷손 어퍼)</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">2b</strong> — 바디 크로스</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">5b/6b</strong> — 바디 어퍼컷</div>
        </div>
        <div class="body-sm mt-16">오소독스: 앞손=좌, 뒷손=우 / 사우스포: 앞손=우, 뒷손=좌</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">방어 동작</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <div class="card-elev" style="padding:12px;"><strong>SL</strong> — 슬립 (머리를 좌우로 피하기)</div>
          <div class="card-elev" style="padding:12px;"><strong>WV</strong> — 위브 (상체를 U자로 숙여 피하기)</div>
          <div class="card-elev" style="padding:12px;"><strong>DK</strong> — 더킹 (무릎 굽혀 숙이기)</div>
          <div class="card-elev" style="padding:12px;"><strong>SB</strong> — 스텝백 (뒤로 빠지기)</div>
          <div class="card-elev" style="padding:12px;"><strong>PV</strong> — 피벗 (발을 축으로 각도 변경)</div>
        </div>
        <div class="body-sm mt-16">더킹 후에는 항상 같은 손으로 이어집니다.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">메인 화면</div>
        <div class="body-sm mb-8"><strong class="white">오늘의 콤비네이션</strong> — 매일 자동으로 바뀌는 롱 콤보. "다른 콤보" 버튼으로 랜덤 교체 가능.</div>
        <div class="body-sm mb-8"><strong class="white">일일 퀘스트</strong> — 진행 중인 미션이 있으면 "이어하기"로 바로 이동. 없으면 "START MISSION"으로 새 미션 생성.</div>
        <div class="body-sm mb-8"><strong class="white">이번 주 미션</strong> — 월~일 요일별 미션 완료 여부. ✓ 완료, ✗ 미완료, — 오늘.</div>
        <div class="body-sm"><strong class="white">하단 통계</strong> — 총 미션 수 / 최대 연속 달성 / 이번 주 완료 / 총 소모 칼로리.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">미션 생성 (NEW MISSION)</div>
        <div class="body-sm mb-8"><strong class="white">난이도</strong> — 하(초보, 가벼운 강도) / 중(중급, 보통 강도) / 상(상급, 높은 강도). 라운드 수와 운동 개수에 영향.</div>
        <div class="body-sm mb-8"><strong class="white">훈련 장소</strong> — 복싱장(샌드백+콤비네이션+스파링) / 집(섀도우+맨몸+컨디셔닝). 집은 기구 없이 좁은 공간에서 가능한 것만.</div>
        <div class="body-sm"><strong class="white">오늘의 목표</strong> — 기술(폼/정확도 중심) / 체력(심폐+지구력) / 감량(고강도 칼로리 소모).</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">오늘의 목표 (미션 진행)</div>
        <div class="body-sm mb-8"><strong class="white">운동 블록</strong> — 각 운동이 번호와 함께 나열됨. 이름 옆 [i] 아이콘을 누르면 상세 설명(자세, 스텝, 흔한 실수) 확인.</div>
        <div class="body-sm mb-8"><strong class="white">체크 버튼 (○/✓)</strong> — 오른쪽 버튼을 눌러 완료 체크. 체크하면 해당 운동이 완료 처리됨.</div>
        <div class="body-sm mb-8"><strong class="white">콤비네이션 블록</strong> — 펀치 넘버가 시각적으로 표시. 아래에 좌/우 방향 포함 설명. 스탠스 설정에 따라 자동 변환.</div>
        <div class="body-sm mb-8"><strong class="white">FINISH & LOG</strong> — 미션 종료 후 기록 저장. 로그인 시 클라우드에도 자동 백업.</div>
        <div class="body-sm"><strong class="white">루틴 다시 뽑기</strong> — 현재 미션을 버리고 같은 조건으로 새 루틴 생성.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">훈련 기록</div>
        <div class="body-sm mb-8"><strong class="white">미션 히스토리</strong> — 완료된 모든 미션이 날짜순으로 나열. 각 미션의 블록 수, 라운드 표시.</div>
        <div class="body-sm mb-8"><strong class="white">월간 목표</strong> — 월 12회 기준 달성률. 주황색 바로 진행도 표시.</div>
        <div class="body-sm"><strong class="white">삭제</strong> — 각 기록 옆 삭제 버튼으로 개별 삭제 가능.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">설정</div>
        <div class="body-sm mb-8"><strong class="white">프로필 설정</strong> — 성별, 나이, 키(cm), 몸무게(kg), 스탠스(오소독스/사우스포). 성별·나이·체중·키로 Harris-Benedict 공식 기반 칼로리 정밀 계산. 스탠스는 콤비네이션 좌/우 표시에 사용.</div>
        <div class="body-sm mb-8"><strong class="white">JSON 내보내기/가져오기</strong> — 기록을 파일로 백업하거나 다른 기기에서 불러오기.</div>
        <div class="body-sm"><strong class="white">전체 삭제</strong> — 현재 계정의 모든 로컬 데이터 초기화.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">Google 로그인</div>
        <div class="body-sm mb-8"><strong class="white">로그인</strong> — 메인 화면 우측 상단 "로그인" 버튼. 구글 계정으로 로그인.</div>
        <div class="body-sm mb-8"><strong class="white">계정별 데이터</strong> — 로그인한 계정마다 미션 기록, 프로필이 따로 저장됨.</div>
        <div class="body-sm"><strong class="white">클라우드 동기화</strong> — 미션 완료 시 Firestore에 자동 백업. 다른 기기에서 같은 계정으로 로그인하면 기록 동기화.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">칼로리 계산</div>
        <div class="body-sm mb-8">MET(Metabolic Equivalent of Task) 기반 공식 사용:</div>
        <div class="body-sm mb-8"><strong class="white">칼로리 = MET × BMR(분당) × 시간(분)</strong></div>
        <div class="body-sm mb-8">BMR(기초대사량)은 Harris-Benedict 공식으로 성별·나이·키·체중에서 산출.</div>
        <div class="body-sm mb-8">난이도 상(MET 10) / 중(MET 7) / 하(MET 4.5)</div>
        <div class="body-sm">프로필에 정보를 입력할수록 정확해집니다. 미입력 시 남성/25세/170cm/70kg 기준.</div>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">랭크 시스템</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
          <div class="card-elev" style="padding:12px;"><strong>ROOKIE</strong> — 0~4 미션</div>
          <div class="card-elev" style="padding:12px;"><strong>AMATEUR</strong> — 5~14 미션</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">CONTENDER</strong> — 15~29 미션</div>
          <div class="card-elev" style="padding:12px;"><strong class="accent">CHAMPION</strong> — 30+ 미션</div>
        </div>
        <div class="body-sm mt-16">사이드바 로고 아래에 현재 랭크가 표시됩니다.</div>
      </div>

      <div class="card">
        <div class="label-sm accent mb-16">복싱장 vs 집 루틴 차이</div>
        <div class="body-sm mb-8"><strong class="white">복싱장</strong> — 워밍업(줄넘기) → 섀도우 → 오늘의 콤비네이션 + 콤보 → 샌드백 2종 → (중급↑ 스파링)</div>
        <div class="body-sm mb-8"><strong class="white">집</strong> — 워밍업(동적스트레칭) → 섀도우 → (기술 목표 시 콤보) → 맨몸 3~4종 → (컨디셔닝)</div>
        <div class="body-sm">집 루틴은 줄넘기, 풀업, 셔틀런 등 기구/공간이 필요한 운동을 제외하고 좁은 방에서 가능한 것만 포함.</div>
      </div>
    `;
  }

  // ---------- SETTINGS ----------
  function renderSettings() {
    const sessions = STORAGE.getSessions();
    const userProfile = STORAGE.getUserProfile();
    view.innerHTML = `
      <div class="main-header">
        <div>
          <div class="label-sm mb-8">설정</div>
          <h1 class="font-display display-lg"><span class="white">SETTINGS</span></h1>
        </div>
      </div>

      <div class="card mb-24 profile-settings">
        <div class="label-sm accent mb-16">프로필 설정</div>
        <div class="form-group">
          <label class="form-label">성별</label>
          <div class="pill-group" data-group="profileGender">
            <div class="pill ${userProfile.gender !== 'female' ? 'active' : ''}" data-value="male">남성</div>
            <div class="pill ${userProfile.gender === 'female' ? 'active' : ''}" data-value="female">여성</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">나이</label>
          <input type="number" id="profileAge" placeholder="25" value="${userProfile.age || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">키 (cm)</label>
          <input type="number" id="profileHeight" placeholder="170" value="${userProfile.height || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">몸무게 (kg)</label>
          <input type="number" id="profileWeight" placeholder="70" value="${userProfile.weight || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">스탠스</label>
          <div class="pill-group" data-group="profileStance">
            <div class="pill ${userProfile.stance !== 'southpaw' ? 'active' : ''}" data-value="orthodox">오소독스</div>
            <div class="pill ${userProfile.stance === 'southpaw' ? 'active' : ''}" data-value="southpaw">사우스포</div>
          </div>
        </div>
        <button class="btn btn-primary" data-action="save-profile">저장</button>
      </div>

      <div class="card mb-24">
        <div class="label-sm accent mb-16">데이터 관리</div>
        <p class="body-sm mb-24">현재 저장된 미션: <strong>${sessions.length}개</strong>. 모든 데이터는 이 브라우저에만 저장됩니다.</p>
        <div class="flex gap-16">
          <button class="btn btn-secondary" data-action="export">JSON 내보내기</button>
          <button class="btn btn-secondary" data-action="import">JSON 가져오기</button>
          <button class="btn btn-danger" data-action="clear">전체 삭제</button>
        </div>
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
            alert(`${data.sessions.length}개 미션을 가져왔습니다.`);
            renderSettings();
          } else alert('잘못된 파일 형식입니다.');
        } catch { alert('JSON 파싱에 실패했습니다.'); }
      };
      reader.readAsText(file);
    });

    view.querySelector('[data-action="clear"]').addEventListener('click', () => {
      if (confirm('모든 데이터가 삭제됩니다. 되돌릴 수 없습니다. 계속하시겠습니까?')) {
        STORAGE.clearAll();
        renderSettings();
      }
    });

    // 프로필 스탠스 pill group
    const stanceGroup = view.querySelector('[data-group="profileStance"]');
    if (stanceGroup) {
      stanceGroup.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        stanceGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    }

    // 프로필 저장
    view.querySelector('[data-action="save-profile"]').addEventListener('click', () => {
      const genderPill = view.querySelector('[data-group="profileGender"] .pill.active');
      const gender = genderPill ? genderPill.dataset.value : 'male';
      const age = document.getElementById('profileAge').value.trim();
      const height = document.getElementById('profileHeight').value.trim();
      const weight = document.getElementById('profileWeight').value.trim();
      const stancePill = view.querySelector('[data-group="profileStance"] .pill.active');
      const stance = stancePill ? stancePill.dataset.value : 'orthodox';
      const profile = { gender: gender, age: age, height: height, weight: weight, stance: stance };
      STORAGE.saveUserProfile(profile);
      if (window.AUTH && window.AUTH.user) {
        window.AUTH.saveProfileCloud(profile);
      }
      alert('프로필이 저장되었습니다.');
    });

    // 프로필 pill 클릭 핸들러
    view.querySelectorAll('.profile-settings .pill-group').forEach(group => {
      group.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
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

  function calcMaxStreak(completed) {
    if (completed.length === 0) return 0;
    const daySet = [...new Set(completed.map(s => new Date(s.completedAt).toDateString()))];
    const timestamps = daySet.map(d => new Date(d).getTime()).sort((a, b) => a - b);
    let max = 1, cur = 1;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] === 86400000) { cur++; max = Math.max(max, cur); }
      else { cur = 1; }
    }
    return max;
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
    return `난이도 ${diff} · ${v}`;
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- AUTH UI HELPER ----------
  function renderAuthBar() {
    const user = window.AUTH ? window.AUTH.user : null;
    if (user) {
      const photo = user.photoURL || '';
      const name = user.displayName || user.email || '';
      return `<div class="auth-bar">
        <div class="auth-profile" data-action="toggle-profile-menu">
          ${photo ? `<img class="auth-avatar" src="${escape(photo)}" alt="" />` : `<div class="auth-avatar auth-avatar-placeholder">${escape(name.charAt(0))}</div>`}
          <span class="auth-name">${escape(name)}</span>
        </div>
        <div class="profile-menu" id="profileMenu" style="display:none;">
          <div class="profile-menu-header">
            ${photo ? `<img class="profile-menu-avatar" src="${escape(photo)}" alt="" />` : ''}
            <div>
              <div class="title-md">${escape(name)}</div>
              <div class="body-sm muted">${escape(user.email || '')}</div>
            </div>
          </div>
          <button class="btn btn-sm btn-ghost w-full mt-16" data-action="logout">로그아웃</button>
        </div>
      </div>`;
    }
    return `<div class="auth-bar">
      <button class="btn btn-sm btn-secondary" data-action="google-login">로그인</button>
    </div>`;
  }

  // ---------- INIT ----------
  if (window.AUTH) {
    window.AUTH.onAuthChange(function (user) {
      if (user) {
        window.AUTH.syncFromCloud().then(function () {
          // 클라우드에서 프로필도 로드
          return window.AUTH.getProfileCloud();
        }).then(function (cloudProfile) {
          if (cloudProfile) {
            var local = STORAGE.getUserProfile();
            if (!local.height && !local.weight) {
              STORAGE.saveUserProfile(cloudProfile);
            }
          }
          render();
        });
      } else {
        render();
      }
    });
  }

  const hash = (window.location.hash || '').replace('#', '');
  if (['dashboard', 'today', 'logs', 'guide', 'settings'].includes(hash)) {
    setRoute(hash);
  } else {
    render();
  }
})();
