# IRON_PUNCH — 복싱 훈련 트래커

개인 맞춤 복싱 훈련 루틴 추천 및 기록 웹 앱.

## 구조

- `app/` — 배포되는 정적 웹 앱 (HTML/CSS/JS)
  - `index.html`
  - `styles.css`
  - `js/` — `app.js`, `exercises.js`, `recommender.js`, `storage.js`
  - `shots/` — UI 스크린샷
- `design/` — 디자인 목업 및 레퍼런스
- `firebase.json` — Firebase Hosting 설정 (public: `app`)
- `.github/workflows/` — GitHub Actions 자동 배포

## 로컬 실행

```bash
cd app
python -m http.server 8000
# http://localhost:8000
```

또는 VS Code의 Live Server 확장 사용.

## 배포

`main` 브랜치에 push 하면 GitHub Actions 가 Firebase Hosting 에 자동 배포합니다.

수동 배포:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

## 기술

순수 HTML/CSS/JavaScript (프레임워크 없음). 데이터는 브라우저 `localStorage` 에 저장.
