# hmsh-autopost

희망사항 인스타(@hmsh_official_) 릴스 자동발행 — [wht-autopost] 구조 미러.

- 큐: 구글시트 `IG_Reels_Queue_hmsh` 시트1 (A=영상 파일명 or URL / B=캡션 / C=status: ready→done·error / D=결과 media_id)
- 운영 토큰: 시트 `_config` 탭 (ig_long_token — 매 실행 60일 자동연장, publish_enabled 안전핀)
- 미디어: `videos/` 폴더 mp4/jpg → raw URL 발행. A열: `a.mp4`=릴스, `a.jpg`=사진 피드, `a.jpg, b.jpg`(쉼표)=캐러셀 (public repo 필요). A열에 http URL을 직접 넣어도 됨(Dropbox dl=1 자동 정규화)
- 큐 E열 = **예약일 `YYYY-MM-DD` (날짜만!)**. 문자열 비교 `notBefore > todayKST`로 판정하므로
  `2026-09-04 12:00`처럼 **시각을 붙이면 영원히 미도래로 막힘**(2026-09-04 실제 사고). 비우면 즉시 발행.
- 스케줄 (2026-09-04 분리):
  - **12:00 / 18:00 KST → 로컬 Windows 작업 스케줄러** (`local-publish.js`,
    작업명 `HMSH 인스타 발행_정오` / `HMSH 인스타 발행_저녁`). PC 켜져 있어야 실행.
  - **20:47 KST → GitHub Actions** (publish.yml)
  - ⚠️ publish.yml에 12:00·18:00 크론을 다시 넣지 말 것 — 로컬과 **중복 발행**됨.
  - 사유: Actions 크론이 8/28부터 3~6시간 지연 (20:47 예정분이 자정~새벽 03시에 발행됨).
- 1회 실행 = 1건 발행. 하루 N건이 필요하면 트리거를 N개 두어야 함.
- 주간 토큰점검 (token-check.yml)
- Secret: `GOOGLE_CREDENTIALS` 1개 (구글 서비스계정 JSON)

새 릴스 추가 = ①mp4를 videos/에 커밋 ②시트에 행 추가(파일명·캡션·ready). 이후는 전자동.
