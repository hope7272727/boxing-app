// 추천 로직 — 프로필 입력 기반 룰 기반 엔진
(function () {
  const shuffle = (arr, seed) => {
    const a = arr.slice();
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const filterByLevel = (exs, level) => {
    const order = { beginner: 0, intermediate: 1, advanced: 2 };
    return exs.filter(e => order[e.level] <= order[level]);
  };

  const filterByVenue = (exs, venue) =>
    exs.filter(e => e.venue === venue || e.venue === 'both');

  function adjustForFatigue(params, fatigue) {
    const p = { ...params };
    if (fatigue === 'high') {
      p.rounds = Math.max(2, Math.round(p.rounds * 0.6));
      p.restSec = p.restSec + 30;
      p.intensityLabel = 'LOW-MID';
    } else if (fatigue === 'medium') {
      p.rounds = Math.max(2, Math.round(p.rounds * 0.85));
      p.intensityLabel = 'MODERATE';
    } else {
      p.intensityLabel = 'HIGH_VOLTAGE';
    }
    return p;
  }

  const MAX_BLOCKS = 8;
  const MIN_BLOCKS = 6;

  function buildSession(profile) {
    const { level, venue, minutes, fatigue, goal } = profile;
    const seed = Date.now() % 100000;

    const params = adjustForFatigue(window.VOLUME_PARAMS[level], fatigue);

    let pool = filterByVenue(filterByLevel(window.EXERCISES, level), venue);

    const byCat = cat => shuffle(pool.filter(e => e.category === cat), seed + cat.length);

    const warmups    = byCat('warmup');
    const shadows    = byCat('shadow');
    const bagEx      = byCat('bag');
    const comboEx    = byCat('combo');
    const sparring   = byCat('sparring');
    const bodyEx     = byCat('bodyweight');
    const condEx     = byCat('conditioning');

    const blocks = [];

    // 1) 워밍업 1개만
    const warmup1 = venue === 'gym'
      ? (warmups.find(w => w.id === 'jump_rope') || warmups[0])
      : (warmups.find(w => w.id === 'dynamic_stretch') || warmups[0]);
    if (warmup1) blocks.push(makeBlock(warmup1, 'warmup', { duration: 5, unit: 'min' }));

    // 2) 메인
    if (venue === 'gym') {
      // 섀도우 1개
      if (shadows[0]) blocks.push(makeBlock(shadows[0], 'shadow', { rounds: Math.max(2, Math.round(params.rounds / 3)), roundMin: params.roundMin, restSec: params.restSec }));

      // 콤비네이션: 오늘의 콤보 1개 + 랜덤 1개
      const dailyCombo = window.getDailyCombo ? window.getDailyCombo() : null;
      if (dailyCombo) {
        blocks.push(makeBlock(
          { id: 'daily_combo', name: dailyCombo.name, category: 'combo', focus: dailyCombo.focus, cue: dailyCombo.cue },
          'combo',
          { rounds: 3, roundMin: params.roundMin, restSec: params.restSec, combo: dailyCombo.combo }
        ));
      }
      const comboPick = pickByGoal(comboEx, goal);
      if (comboPick[0]) blocks.push(makeBlock(comboPick[0], 'combo', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec, combo: comboPick[0].combo }));

      // 샌드백 2개
      const bagPref = pickByGoal(bagEx, goal);
      bagPref.slice(0, 2).forEach(ex => {
        blocks.push(makeBlock(ex, 'bag', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec }));
      });

      // 스파링 1개 (중급+, 60분+, 컨디션 괜찮을 때)
      if (level !== 'beginner' && fatigue !== 'high' && minutes >= 60 && sparring[0]) {
        const sparType = goal === 'technique' ? (sparring.find(s => s.id === 'spar_technical') || sparring[0]) : sparring[0];
        blocks.push(makeBlock(sparType, 'sparring', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec }));
      }

    } else {
      // home: 섀도우 + 콤보 + 맨몸
      // 섀도우 1개
      const shadowPick = pickByGoal(shadows, goal);
      if (shadowPick[0]) blocks.push(makeBlock(shadowPick[0], 'shadow', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec }));

      // 콤비네이션 — 기술 목표일 때만
      if (goal === 'technique') {
        const homeComboPick = pickByGoal(comboEx, goal);
        homeComboPick.slice(0, 2).forEach(ex => {
          blocks.push(makeBlock(ex, 'combo', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec, combo: ex.combo }));
        });
      }

      // 맨몸 (기술이면 3개, 아니면 4개)
      const bodyCount = goal === 'technique' ? 3 : 4;
      const bodyPick = pickByGoal(bodyEx, goal);
      bodyPick.slice(0, bodyCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'bodyweight', { sets: 3, reps: params.reps.mid, restSec: 45 }));
      });

      // 컨디셔닝 피니셔 1개 (피로도 낮을 때만)
      if (fatigue !== 'high' && condEx[0] && blocks.length < MAX_BLOCKS) {
        const finisher = goal === 'cardio' || goal === 'weightloss' ? (condEx.find(c => c.id === 'shadow_hiit') || condEx[0]) : condEx[0];
        blocks.push(makeBlock(finisher, 'conditioning', { duration: 8, unit: 'min' }));
      }
    }

    // 최대 8개로 잘라내기 (쿨다운 제외)
    while (blocks.length > MAX_BLOCKS) blocks.pop();

    // 메타
    const estMinutes = estimateTime(blocks);
    const intensity = params.intensityLabel;
    const weightKg = profile.weight || 70;
    const calories = estimateCalories(estMinutes, intensity, weightKg);

    return {
      id: 'session_' + Date.now(),
      createdAt: new Date().toISOString(),
      profile,
      weightKg,
      title: buildTitle(venue, goal, fatigue),
      subtitle: buildSubtitle(venue, goal),
      estMinutes,
      intensity,
      estCalories: calories,
      blocks,
      notes: buildCoachNote(profile),
    };
  }

  function makeBlock(ex, phase, params) {
    return {
      id: ex.id,
      name: ex.name,
      category: ex.category,
      phase,
      focus: ex.focus,
      cue: ex.cue,
      params,
      completed: false,
    };
  }

  function pickByGoal(list, goal) {
    const weights = {
      technique: ['bag_jab', 'bag_1_2', 'bag_combo', 'shadow_tech', 'shadow_combo', 'shadow_counter', 'pushup', 'plank', 'shadow_footwork'],
      power:     ['bag_power', 'bag_hooks', 'bag_uppercut', 'shadow_power', 'jump_squat', 'jump_lunge', 'burpee', 'pushup_diamond'],
      cardio:    ['bag_speed', 'bag_move', 'shadow_power', 'burpee', 'mountain_climber', 'jumping_jacks', 'shadow_hiit', 'high_knees'],
      endurance: ['bag_freestyle', 'bag_move', 'shadow_combo', 'pushup', 'squat', 'lunge', 'plank', 'russian_twist'],
      weightloss:['burpee', 'mountain_climber', 'bag_speed', 'shadow_hiit', 'jump_squat', 'jumping_jacks', 'high_knees', 'bag_move'],
    };
    const pri = weights[goal] || [];
    const prioritized = [];
    const rest = [];
    list.forEach(e => (pri.includes(e.id) ? prioritized.push(e) : rest.push(e)));
    return [...prioritized, ...rest];
  }

  function estimateTime(blocks) {
    let m = 0;
    blocks.forEach(b => {
      const p = b.params || {};
      if (p.duration && p.unit === 'min') m += p.duration;
      else if (p.rounds) m += p.rounds * (p.roundMin || 2) + (p.rounds * (p.restSec || 60)) / 60;
      else if (p.sets) m += (p.sets * (p.reps || 10) * 3 + p.sets * (p.restSec || 45)) / 60;
    });
    return Math.round(m);
  }

  function estimateCalories(minutes, intensity, weightKg) {
    const w = weightKg || 70;
    const met = intensity === 'HIGH_VOLTAGE' ? 10 : intensity === 'MODERATE' ? 7 : 4.5;
    return Math.round(met * w * (minutes / 60));
  }

  function buildTitle(venue, goal, fatigue) {
    if (fatigue === 'high') return '회복 세션';
    const v = venue === 'gym' ? '복싱장' : '홈';
    const g = {
      technique: '기술 정밀',
      power:     '파워 라운드',
      cardio:    '카디오 번',
      endurance: '지구력 빌드',
      weightloss:'펫 번',
    }[goal] || '훈련';
    return `${v} — ${g}`;
  }

  function buildSubtitle(venue, goal) {
    if (venue === 'gym') return '샌드백과 스파링 중심의 실전 세션';
    return '집에서도 링 위처럼. 섀도우와 맨몸으로 끝까지.';
  }

  function buildCoachNote(profile) {
    if (profile.fatigue === 'high') return '오늘은 무리하지 말고 폼에만 집중하라. 회복도 훈련이다.';
    if (profile.goal === 'power') return '파워는 다리에서 나온다. 힙 로테이션을 절대 잊지 마라.';
    if (profile.goal === 'technique') return '속도보다 정확한 궤적이 먼저다. 폼이 무너지면 멈춰라.';
    const notes = [
      '속도보다 정확한 궤적이 먼저다. 주먹을 뻗을 때 반대쪽 손은 반드시 턱을 보호하라.',
      '파워는 다리에서 나온다. 힙 로테이션을 절대 잊지 마라.',
      '가드 복귀가 늦으면 아무리 좋은 펀치도 의미 없다. 끝까지 방어.',
      '호흡은 펀치와 함께. 내쉬며 치고, 들이마시며 회복.',
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  window.RECOMMENDER = { buildSession };
})();
