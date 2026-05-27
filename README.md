# INO Shimeji

INO Shimeji는 Electron 기반의 Windows 데스크톱 마스코트 프로그램입니다. 투명한 항상-위 창 위에서 Diana 캐릭터가 화면을 돌아다니며, 사용자가 캐릭터를 클릭해서 드래그하거나 트레이 메뉴로 표시 상태를 제어할 수 있습니다.

## 주요 기능

- 투명한 데스크톱 오버레이 창
- 작업 표시줄에 나타나지 않는 항상-위 캐릭터 창
- 시스템 트레이 메뉴 제공
  - 캐릭터 보이기/숨기기
  - Always On Top 토글
  - 설정 안내
  - 종료
- 캐릭터 자동 행동
  - idle
  - look
  - sleep
  - walk
  - run
  - stumble
- 마우스 상호작용
  - 캐릭터 위에 마우스를 올리면 입력 캡처
  - 캐릭터 바깥 영역은 마우스 이벤트 통과
  - 클릭 후 드래그 가능
- 드래그 후 낙하 동작
  - 드래그를 놓으면 fall 상태로 전환
  - 바닥에 닿으면 바로 walk 상태로 전환
  - 드래그 방향/속도에 따라 이동 방향 결정
- 좌표가 실제로 움직이지 않는 경우 자동 idle 전환
  - walk/run 중 좌표 이동량이 거의 0인 상태가 약 220ms 이상 지속되면 idle 상태로 돌아감
- 다중 모니터/해상도 변경 대응
  - 디스플레이 추가/제거/크기 변경 시 창 범위 재계산
  - 절전 해제 후 위치 복구

## 실행 방법

이미 빌드된 실행 파일을 사용하는 경우:

```text
INO-Shimeji.exe
```

또는 파일 탐색기에서 아래 파일을 직접 실행합니다.

```text
C:\Users\yd320\OneDrive\문서\opencode\.INO-Shimeji-win32-x64\INO-Shimeji.exe
```

## 트레이 메뉴 사용법

프로그램 실행 후 Windows 시스템 트레이에 `Diana Shimeji` 아이콘이 표시됩니다.

- 좌클릭: 캐릭터 표시
- 우클릭: 메뉴 열기
  - `Hide Character` / `Show Character`: 캐릭터 숨김/표시
  - `Always On Top`: 항상 위 표시 여부 변경
  - `Settings`: 간단한 안내 창 표시
  - `Exit`: 프로그램 종료

## 조작 방법

1. 캐릭터 위로 마우스를 이동합니다.
2. 캐릭터가 마우스 입력을 받을 수 있는 상태가 됩니다.
3. 캐릭터를 클릭한 채 드래그합니다.
4. 마우스를 놓으면 캐릭터가 떨어집니다.
5. 바닥에 닿으면 바로 걷기 시작합니다.
6. 걷거나 뛰는 상태에서 실제 좌표가 움직이지 않으면 자동으로 idle 상태가 됩니다.

## 프로젝트 구조

```text
.INO-Shimeji-win32-x64/
├─ INO-Shimeji.exe
├─ resources/
│  └─ app/
│     ├─ package.json
│     └─ out/
│        ├─ main/
│        │  └─ index.js
│        ├─ preload/
│        │  └─ index.mjs
│        └─ renderer/
│           ├─ index.html
│           └─ assets/
│              ├─ index-DQZvRS8p.js
│              └─ diana/
│                 ├─ meta.json
│                 ├─ idle.png
│                 ├─ walk.png
│                 ├─ run.png
│                 ├─ drag.png
│                 ├─ fall.png
│                 └─ land.png
├─ locales/
├─ LICENSE
└─ LICENSES.chromium.html
```

## 주요 파일

### `resources/app/package.json`

앱 정보와 개발 스크립트가 정의되어 있습니다.

- 이름: `desktop-shimeji`
- 버전: `1.0.0`
- 설명: `AI Desktop Shimeji - Diana desktop mascot`
- 주요 의존성:
  - Electron
  - electron-vite
  - PixiJS
  - Matter.js
  - Sharp
  - TypeScript

### `resources/app/out/main/index.js`

Electron 메인 프로세스 코드입니다.

담당 기능:

- 투명한 전체 화면 오버레이 창 생성
- 항상 위 표시 설정
- 작업 표시줄 숨김
- 마우스 이벤트 통과/캡처 전환
- 시스템 트레이 생성
- 디스플레이 변경 대응
- 렌더러와 IPC 통신
- 입력 디버그 로그 기록

입력 디버그 로그 위치:

```text
%APPDATA%\desktop-shimeji\input-debug.log
```

### `resources/app/out/preload/index.mjs`

렌더러가 안전하게 Electron 기능을 호출할 수 있도록 IPC API를 노출합니다.

### `resources/app/out/renderer/assets/index-DQZvRS8p.js`

렌더러와 캐릭터 동작의 핵심 코드입니다.

담당 기능:

- PixiJS 기반 캐릭터 렌더링
- 애니메이션 로딩/전환
- 캐릭터 상태 머신
- 자동 행동 AI
- Matter.js 기반 낙하 물리
- 드래그 처리
- 마우스 위치/캐릭터 영역 계산
- 좌표 정지 시 idle 전환

### `resources/app/out/renderer/assets/diana/meta.json`

캐릭터 스프라이트 메타데이터입니다.

현재 설정:

```json
{
  "frameWidth": 177,
  "frameHeight": 230,
  "anchor": {
    "x": 0.5,
    "y": 0.12
  }
}
```

애니메이션 프레임:

| 상태 | 파일 | 프레임 | FPS |
|---|---|---:|---:|
| idle | idle.png | 4 | 8 |
| walk | walk.png | 3 | 10 |
| run | run.png | 6 | 14 |
| drag | drag.png | 4 | 8 |
| fall | fall.png | 4 | 12 |
| land | land.png | 5 | 10 |

## 개발 명령어

아래 명령어는 `resources/app` 폴더에서 실행합니다.

```bash
cd resources/app
npm install
npm run dev
npm run build
npm run start
```

사용 가능한 npm scripts:

```bash
npm run dev                  # electron-vite 개발 실행
npm run build                # electron-vite 빌드
npm run start                # electron-vite preview
npm run generate:placeholders
npm run generate:sprites
```

## 문법 검증

수정 후 최소한 아래 명령으로 JavaScript 문법을 확인합니다.

```bash
cd resources/app
node --check out/main/index.js
node --check out/preload/index.mjs
node --check out/renderer/assets/index-DQZvRS8p.js
node -e "JSON.parse(require('fs').readFileSync('out/renderer/assets/diana/meta.json', 'utf8')); console.log('meta.json OK')"
```

## 최근 수정 내역

- 드래그 후 마우스를 놓으면 캐릭터가 `fall` 상태로 떨어지도록 수정
- 바닥에 닿으면 `land`나 `idle` 대신 바로 `walk` 상태로 전환되도록 수정
- `fall -> walk/run/idle`, `land -> walk/run/idle` 전이가 가능하도록 FSM 제한 완화
- 낙하 중 화면 하단 margin 때문에 바닥까지 도달하지 못하던 문제 수정
- walk 스프라이트를 3프레임, run 스프라이트를 6프레임 기준으로 재정렬
- `meta.json`의 run 프레임 수를 6으로 수정
- walk/run 중 실제 좌표가 움직이지 않으면 자동 idle 상태로 전환되도록 수정

## 백업 폴더

캐릭터 스프라이트 수정 전 백업이 아래 폴더들에 남아 있습니다.

```text
resources/app/out/renderer/assets/diana/_resolution_backup_20260528_065658
resources/app/out/renderer/assets/diana/_rerun_backup_20260528_070337
resources/app/out/renderer/assets/diana/_oversize_backup_20260528
```

## 라이선스

프로젝트 루트의 `LICENSE` 파일을 참고하세요.
Electron/Chromium 관련 라이선스는 `LICENSES.chromium.html`을 참고하세요.
