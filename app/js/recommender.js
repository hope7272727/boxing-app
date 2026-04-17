// 추천 로직 — 프로필 입력 기반 룰 기반 엔진
// 입력: { level, venue, minutes, fatigue, goal, focus }
//   level: beginner | intermediate | advanced
//   venue: gym | home
//   minutes: 30 | 45 | 60 | 90
//   fatigue: low | medium | high
//   goal: technique | power | cardio | endurance | weightloss
//   focus: 선택적 추가 포커스 (예: footwork, defense 등) — 없으면 undefined

(function () {
  const pickOne = (arr, seed) => arr[seed % arr.length];
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

  function adjustForTime(totalBlocks, minutes) {
    if (minutes <= 30) return Math.max(3, totalBlocks - 3);
    if (minutes <= 45) return Math.max(4, totalBlocks - 1);
    if (minutes <= 60) return totalBlocks;
    return totalBlocks + 2;
  }

  // 세션 블록 구조: { warmup, main[], finisher, cooldown }
  function buildSession(profile) {
    const { level, venue, minutes, fatigue, goal } = profile;
    const seed = Date.now() % 100000;

    const params = adjustForFatigue(window.VOLUME_PARAMS[level], fatigue);
    const blockCount = adjustForTime(params.totalExercises, minutes);

    let pool = filterByVenue(filterByLevel(window.EXERCISES, level), venue);

    // 카테고리별 풀
    const byCat = cat => shuffle(pool.filter(e => e.category === cat), seed + cat.length);

    const warmups    = byCat('warmup');
    const shadows    = byCat('shadow');
    const bagEx      = byCat('bag');
    const comboEx    = byCat('combo');
    const sparring   = byCat('sparring');
    const bodyEx     = byCat('bodyweight');
    const condEx     = byCat('conditioning');
    const cooldowns  = byCat('cooldown');

    const blocks = [];

    // 1) 워밍업 2개 (복싱장: 줄넘기 우선 / 집: 동적스트레칭 우선)
    const warmup1 = venue === 'gym'
      ? (warmups.find(w => w.id === 'jump_rope') || warmups[0])
      : (warmups.find(w => w.id === 'dynamic_stretch') || warmups[0]);
    blocks.push(makeBlock(warmup1, 'warmup', { duration: 5, unit: 'min' }));
    const warmup2 = warmups.find(w => w.id !== warmup1.id);
    if (warmup2) blocks.push(makeBlock(warmup2, 'warmup', { duration: 3, unit: 'min' }));

    // 2) 메인: 장소/목표에 따라 구성
    if (venue === 'gym') {
      // 섀도우 → 샌드백 중심 → (중급+ 스파링)
      if (shadows[0]) blocks.push(makeBlock(shadows[0], 'shadow', { rounds: Math.max(2, Math.round(params.rounds / 3)), roundMin: params.roundMin, restSec: params.restSec }));

      // 콤비네이션 드릴 2-3개
      const comboCount = Math.max(2, Math.min(3, Math.floor(params.rounds / 2)));
      const comboPick = pickByGoal(comboEx, goal);
      comboPick.slice(0, comboCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'combo', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec, combo: ex.combo }));
      });

      // 샌드백 — 목표에 맞춰 선택 가중
      const bagPref = pickByGoal(bagEx, goal);
      const bagCount = Math.max(2, Math.min(4, Math.floor(params.rounds / 2)));
      bagPref.slice(0, bagCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'bag', { rounds: 1, roundMin: params.roundMin, restSec: params.restSec }));
      });

      // 스파링 — 중급 이상 & 피로도 높지 않을 때 & 시간 충분
      if (level !== 'beginner' && fatigue !== 'high' && minutes >= 60 && sparring[0]) {
        const sparType = goal === 'technique' ? (sparring.find(s => s.id === 'spar_technical') || sparring[0]) : sparring[0];
        blocks.push(makeBlock(sparType, 'sparring', { rounds: Math.max(2, Math.round(params.rounds / 3)), roundMin: params.roundMin, restSec: params.restSec }));
      }

    } else {
      // home: 섀도우 + 콤보 + 맨몸 + 컨디셔닝
      const shadowCount = Math.max(1, Math.round(params.rounds / 3));
      const shadowPick = pickByGoal(shadows, goal);
      shadowPick.slice(0, shadowCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'shadow', { rounds: 1, roundMin: params.roundMin, restSec: params.restSec }));
      });

      // 콤비네이션 드릴 2개 (집에서도 섀도우 콤보)
      const homeComboCount = Math.max(1, Math.min(2, comboEx.length));
      const homeComboPick = pickByGoal(comboEx, goal);
      homeComboPick.slice(0, homeComboCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'combo', { rounds: 2, roundMin: params.roundMin, restSec: params.restSec, combo: ex.combo }));
      });

      // 맨몸 서킷
      const bodyCount = Math.max(3, Math.min(5, blockCount - blocks.length - 2));
      const bodyPick = pickByGoal(bodyEx, goal);
      bodyPick.slice(0, bodyCount).forEach(ex => {
        blocks.push(makeBlock(ex, 'bodyweight', { sets: 3, reps: params.reps.mid, restSec: 45 }));
      });

      // 컨디셔닝 피니셔 1개 (피로도 낮을 때만)
      if (fatigue !== 'high' && condEx[0]) {
        const finisher = goal === 'cardio' || goal === 'weightloss' ? (condEx.find(c => c.id === 'shadow_hiit') || condEx[0]) : condEx[0];
        blocks.push(makeBlock(finisher, 'conditioning', { duration: 8, unit: 'min' }));
      }
    }

    // 3) 쿨다운
    if (cooldowns[0]) blocks.push(makeBlock(cooldowns[0], 'cooldown', { duration: 5, unit: 'min' }));
    const breath = cooldowns.find(c => c.id === 'breath_recovery');
    if (breath) blocks.push(makeBlock(breath, 'cooldown', { duration: 2, unit: 'min' }));

    // 메타
    const estMinutes = estimateTime(blocks);
    const intensity = params.intensityLabel;
    const calories = estimateCalories(estMinutes, intensity);

    return {
      id: 'session_' + Date.now(),
      createdAt: new Date().toISOString(),
      profile,
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

  function estimateCalories(minutes, intensity) {
    const rate = intensity === 'HIGH_VOLTAGE' ? 13 : intensity === 'MODERATE' ? 10 : 7;
    return minutes * rate;
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
    const notes = [
      '속도보다 정확한 궤적이 먼저다. 주먹을 뻗을 때 반대쪽 손은 반드시 턱을 보호하라.',
      '지구력이 눈에 띄게 좋아진다. 다음 세션에서는 복싱 리듬의 속도에 집중하자.',
      '파워는 다리에서 나온다. 힙 로테이션을 절대 잊지 마라.',
      '가드 복귀가 늦으면 아무리 좋은 펀치도 의미 없다. 끝까지 방어.',
      '호흡은 펀치와 함께. 내쉬며 치고, 들이마시며 회복.',
    ];
    if (profile.fatigue === 'high') return '오늘은 무리하지 말고 폼에만 집중하라. 회복도 훈련이다.';
    if (profile.goal === 'power') return '파워는 다리에서 나온다. 힙 로테이션을 절대 잊지 마라.';
    if (profile.goal === 'technique') return '속도보다 정확한 궤적이 먼저다. 폼이 무너지면 멈춰라.';
    return notes[Math.floor(Math.random() * notes.length)];
  }

  window.RECOMMENDER = { buildSession };
})();
