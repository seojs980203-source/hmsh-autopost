# Google Flow MCP 연동 가이드 (내 PC의 Claude Code)

대상 저장소: [shaig-mahmudov/google-flow-mcp](https://github.com/shaig-mahmudov/google-flow-mcp)
검증한 커밋: `e7872b5` (2026-06-25, MIT) — 서드파티 코드이므로 이 커밋에 고정해서 쓰길 권장합니다.

Claude Code가 **내 PC의 Chrome(Google 로그인 상태)** 을 CDP로 조종해서 Google Flow에서
이미지·영상을 만들게 하는 MCP 서버입니다. **PC에서 실행하는 도구**이고, 클라우드 세션/GitHub Actions에서는
Google 로그인 Chrome이 없어서 쓸 수 없습니다.

## 먼저 알아둘 것 — 처음 받은 안내와 다른 점

| 처음 안내 | 실제 (저장소 확인 결과) |
|---|---|
| `git clone https://github.com` (주소 잘림) | `https://github.com/shaig-mahmudov/google-flow-mcp.git` |
| Node 22.13+, pnpm | **Node 18+, npm** (`package-lock.json`만 있음) |
| `pnpm install && pnpm build` | `npm ci` 만으로 충분. build 불필요 |
| `claude mcp add google-flow --node ...` | `--node` 옵션은 없음 → `claude mcp add --transport stdio google-flow -- node <경로>` |
| 진입점 `dist/index.js` 가능 | **`src/index.js` 로 등록할 것.** `dist/` 번들은 `config/flow.config.json` 경로를 잘못 계산해 설정을 못 읽음 |
| 바로 사용 | `config/flow.config.json` 을 먼저 만들어야 함 (아래 2단계) |

## 1단계. 설치

Windows (PowerShell) / macOS / Linux 공통:

```bash
git clone https://github.com/shaig-mahmudov/google-flow-mcp.git
cd google-flow-mcp
git checkout e7872b5          # 검증한 커밋에 고정
npm ci
```

## 2단계. 설정 파일 만들기

```bash
# macOS / Linux
cp config/flow.config.example.json config/flow.config.json
# Windows PowerShell
copy config\flow.config.example.json config\flow.config.json
```

`config/flow.config.json` 에서 최소한 아래 두 값을 바꿉니다 (이 파일은 gitignore 대상, 커밋 금지).

```json
{
  "expectedAccount": "Flow에 쓸 구글 계정 이메일",
  "chromeProfile": "Default"
}
```

- 프로필 폴더명은 Chrome 주소창에 `chrome://version` → "프로필 경로" 마지막 폴더(`Default`, `Profile 1` …).
- Chrome이 기본 경로가 아닌 곳에 설치됐을 때만 `chromeExecutable` / `chromeUserDataDir` 를 추가합니다.
- 해당 프로필은 **미리 Google에 로그인**되어 있고 **Google Flow 사용 권한**이 있어야 합니다.

## 3단계. Claude Code에 등록

`<절대경로>` 는 클론한 폴더의 절대경로입니다. Windows는 `C:/Users/<이름>/google-flow-mcp/src/index.js` 처럼
슬래시(`/`)를 쓰면 편합니다.

```bash
claude mcp add --transport stdio --scope user google-flow -- node "<절대경로>/google-flow-mcp/src/index.js"
```

- `--scope user`: 모든 프로젝트에서 사용. 이 프로젝트에서만 쓰려면 `--scope project` (`.mcp.json` 에 기록됨 — 절대경로가
  들어가므로 **저장소에 커밋하지 말 것**).
- `.mcp.json` 을 직접 편집하는 방법은 [`google-flow-mcp.mcp.json.example`](google-flow-mcp.mcp.json.example) 참고.

## 4단계. 연결 확인

```bash
claude mcp list
# google-flow: node .../src/index.js - ✔ Connected
```

새 Claude Code 세션을 열고 `/mcp` 에서 `google-flow` 도구 19개가 보이면 끝입니다.

## 5단계. 첫 사용

1. **Chrome을 모두 종료**합니다. 첫 `flow_connect` 때 서버가 Chrome 프로필을 `User Data/KiaraFlow` 로 복사하는데,
   Chrome이 켜져 있으면 잠긴 파일(쿠키 DB 등)이 복사에서 빠져 로그인이 풀릴 수 있습니다.
2. Claude Code에서 요청: *"Google Flow에 연결해서 `flow_account_check` 까지 해줘"*
3. 로그인 확인이 되면: *"우주를 배경으로 한 고양이 이미지를 만들어줘"*

`npm run start-browser` 는 **쓰지 않아도 됩니다.** `flow_connect` 가 Chrome을 직접 실행합니다.
(그 스크립트는 기본 `User Data` 폴더를 그대로 쓰는데, Chrome 136 이후에는 기본 폴더에서
`--remote-debugging-port` 가 무시되는 것으로 알려져 있어 동작하지 않을 수 있습니다.)

## 크레딧 안전장치

생성은 Google Flow **크레딧을 소모**합니다.

- `flow_generate_image`: 기본값 `auto_confirm=false` → 프롬프트만 채우고 `ready_for_confirmation` 으로 멈춤.
  Claude가 `auto_confirm=true` 로 호출하면 실제 생성(크레딧 소모)됩니다. 도구 호출 승인 창에서 이 값을 확인하세요.
- `flow_generate_video`: 최종 Generate 버튼은 누르지 않고 준비 상태에서 멈춥니다 (소스 코드 설명 기준).

## 알고 쓸 것 (코드 점검 결과)

- 외부로 데이터를 보내는 코드는 없었습니다. 네트워크 호출은 `127.0.0.1` CDP 포트뿐입니다.
- 실제 Chrome 프로필(쿠키 포함, 캐시·확장 제외)을 `KiaraFlow` 폴더로 **복사**합니다. 로그인 세션이 디스크에
  한 벌 더 생기므로, 사용을 그만두면 `User Data/KiaraFlow` 를 삭제하세요.
- `--disable-blink-features=AutomationControlled` 로 자동화 표시를 숨깁니다. Google 약관/계정 보호 정책상
  자동화로 판단되면 제한이 걸릴 수 있으니, **주 계정 대신 별도 계정/프로필** 사용을 권장합니다.
- `scripts/start-browser.sh` 는 9222 포트를 점유한 응답 없는 프로세스를 `kill -9` 합니다. 사용하지 않는 편이 안전합니다.

## 검증 범위

| 항목 | 상태 |
|---|---|
| `npm ci`, `npm run build` | 확인함 (Linux, Node 22) |
| `src/index.js` 기동 + MCP `tools/list` → 19개 | 확인함 |
| `claude mcp add` 형식, `claude mcp list` → Connected | 확인함 (격리된 HOME) |
| `dist/index.js` 의 설정 경로 오류 | 확인함 |
| Windows/macOS 실제 Chrome 실행, Google 로그인, 실제 생성 | **미확인** (클라우드 컨테이너에는 로그인된 Chrome이 없음) |

문제가 생기면 `flow_status`(전체 상태), `flow_screenshot`(화면 캡처) 결과와 에러 메시지를 알려주세요.
