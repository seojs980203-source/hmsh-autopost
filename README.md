# hmsh-autopost

희망사항 인스타(@hmsh_official_) 릴스 자동발행 — [wht-autopost] 구조 미러.

- 큐: 구글시트 `IG_Reels_Queue_hmsh` 시트1 (A=영상 파일명 or URL / B=캡션 / C=status: ready→done·error / D=결과 media_id)
- 운영 토큰: 시트 `_config` 탭 (ig_long_token — 매 실행 60일 자동연장, publish_enabled 안전핀)
- 영상: `videos/` 폴더 mp4 → raw URL 발행 (public repo 필요). A열에 http URL을 직접 넣어도 됨(Dropbox dl=1 자동 정규화)
- 스케줄: 매일 20:47 KST (publish.yml) + 주간 토큰점검 (token-check.yml)
- Secret: `GOOGLE_CREDENTIALS` 1개 (구글 서비스계정 JSON)

새 릴스 추가 = ①mp4를 videos/에 커밋 ②시트에 행 추가(파일명·캡션·ready). 이후는 전자동.
