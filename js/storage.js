// localStorage 래퍼 — 로그인 시 유저별 키 분리
(function () {
  function userKey(base) {
    var uid = (window.AUTH && window.AUTH.user) ? window.AUTH.user.uid : 'local';
    return 'ironpunch.' + uid + '.' + base;
  }

  const read = (k, fallback) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  window.STORAGE = {
    getSessions: () => read(userKey('sessions'), []),
    saveSession: (session) => {
      const k = userKey('sessions');
      const all = read(k, []);
      const idx = all.findIndex(s => s.id === session.id);
      if (idx >= 0) all[idx] = session; else all.push(session);
      write(k, all);
    },
    deleteSession: (id) => {
      const k = userKey('sessions');
      const all = read(k, []).filter(s => s.id !== id);
      write(k, all);
    },
    clearAll: () => {
      localStorage.removeItem(userKey('sessions'));
      localStorage.removeItem(userKey('current'));
    },
    getCurrent: () => read(userKey('current'), null),
    setCurrent: (session) => write(userKey('current'), session),
    clearCurrent: () => localStorage.removeItem(userKey('current')),
    getLastProfile: () => read(userKey('lastProfile'), null),
    saveLastProfile: (p) => write(userKey('lastProfile'), p),
  };
})();
