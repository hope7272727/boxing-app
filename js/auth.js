// Firebase Auth + Firestore 연동
(function () {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const provider = new firebase.auth.GoogleAuthProvider();

  window.AUTH = {
    user: null,

    login: function () {
      return auth.signInWithPopup(provider).catch(function (err) {
        if (err.code === 'auth/popup-blocked') {
          return auth.signInWithRedirect(provider);
        }
        console.error('Login error:', err);
      });
    },

    logout: function () {
      return auth.signOut();
    },

    onAuthChange: function (callback) {
      auth.onAuthStateChanged(function (user) {
        window.AUTH.user = user;
        callback(user);
      });
    },

    // Firestore에 세션 저장
    saveSessionCloud: function (session) {
      if (!window.AUTH.user) return Promise.resolve();
      return db.collection('users').doc(window.AUTH.user.uid)
        .collection('sessions').doc(session.id)
        .set(session);
    },

    // Firestore에서 세션 목록 가져오기
    getSessionsCloud: function () {
      if (!window.AUTH.user) return Promise.resolve([]);
      return db.collection('users').doc(window.AUTH.user.uid)
        .collection('sessions').orderBy('completedAt', 'desc').get()
        .then(function (snap) {
          return snap.docs.map(function (d) { return d.data(); });
        });
    },

    // Firestore에서 세션 삭제
    deleteSessionCloud: function (id) {
      if (!window.AUTH.user) return Promise.resolve();
      return db.collection('users').doc(window.AUTH.user.uid)
        .collection('sessions').doc(id).delete();
    },

    // 프로필을 Firestore에 저장
    saveProfileCloud: function (profile) {
      if (!window.AUTH.user) return Promise.resolve();
      return db.collection('users').doc(window.AUTH.user.uid)
        .collection('profile').doc('data')
        .set(profile);
    },

    // Firestore에서 프로필 가져오기
    getProfileCloud: function () {
      if (!window.AUTH.user) return Promise.resolve(null);
      return db.collection('users').doc(window.AUTH.user.uid)
        .collection('profile').doc('data').get()
        .then(function (doc) {
          return doc.exists ? doc.data() : null;
        });
    },

    // 로컬 세션을 클라우드에 동기화
    syncToCloud: function () {
      if (!window.AUTH.user) return Promise.resolve();
      var sessions = STORAGE.getSessions();
      var batch = db.batch();
      var userRef = db.collection('users').doc(window.AUTH.user.uid);
      sessions.forEach(function (s) {
        var ref = userRef.collection('sessions').doc(s.id);
        batch.set(ref, s);
      });
      // 프로필도 동기화
      var localProfile = STORAGE.getUserProfile();
      if (localProfile && (localProfile.height || localProfile.weight || localProfile.stance)) {
        var profileRef = userRef.collection('profile').doc('data');
        batch.set(profileRef, localProfile);
      }
      return batch.commit();
    },

    // 클라우드 세션을 로컬에 동기화
    syncFromCloud: function () {
      if (!window.AUTH.user) return Promise.resolve();
      return Promise.all([
        window.AUTH.getSessionsCloud().then(function (cloudSessions) {
          var localSessions = STORAGE.getSessions();
          var localIds = new Set(localSessions.map(function (s) { return s.id; }));
          cloudSessions.forEach(function (s) {
            if (!localIds.has(s.id)) {
              STORAGE.saveSession(s);
            }
          });
        }),
        window.AUTH.getProfileCloud().then(function (cloudProfile) {
          if (cloudProfile) {
            var local = STORAGE.getUserProfile();
            // 클라우드 프로필이 있고 로컬이 비어있으면 클라우드 값 사용
            if (!local.height && !local.weight) {
              STORAGE.saveUserProfile(cloudProfile);
            }
          }
        })
      ]);
    },
  };
})();
