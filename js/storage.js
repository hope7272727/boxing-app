// localStorage 래퍼
(function () {
  const KEY_SESSIONS = 'ironpunch.sessions';
  const KEY_CURRENT  = 'ironpunch.current';
  const KEY_PROFILE  = 'ironpunch.lastProfile';

  const read = (k, fallback) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  window.STORAGE = {
    getSessions: () => read(KEY_SESSIONS, []),
    saveSession: (session) => {
      const all = read(KEY_SESSIONS, []);
      const idx = all.findIndex(s => s.id === session.id);
      if (idx >= 0) all[idx] = session; else all.push(session);
      write(KEY_SESSIONS, all);
    },
    deleteSession: (id) => {
      const all = read(KEY_SESSIONS, []).filter(s => s.id !== id);
      write(KEY_SESSIONS, all);
    },
    clearAll: () => {
      localStorage.removeItem(KEY_SESSIONS);
      localStorage.removeItem(KEY_CURRENT);
    },
    getCurrent: () => read(KEY_CURRENT, null),
    setCurrent: (session) => write(KEY_CURRENT, session),
    clearCurrent: () => localStorage.removeItem(KEY_CURRENT),
    getLastProfile: () => read(KEY_PROFILE, null),
    saveLastProfile: (p) => write(KEY_PROFILE, p),
  };
})();
