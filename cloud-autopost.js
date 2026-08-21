// 희망사항(hmsh_official_) 릴스 클라우드 자동발행 — wht-autopost/cloud-autopost.js 미러 (릴스판)
// 구조: 시트 큐(IG_Reels_Queue_hmsh 시트1)에서 status=ready 첫 행 → REELS 3단계 발행 → done/error 기록.
// 영상: videos/ 폴더의 mp4를 repo raw URL로 발행 (A열=파일명), 또는 A열에 http URL 직접.
// 비밀: GOOGLE_CREDENTIALS(서비스계정 JSON)만 GitHub Secret. 운영토큰은 시트 '_config' 탭 (월핫템 방식).
// 안전핀: _config publish_enabled=true 일 때만 실발행. 로컬 테스트: node cloud-autopost.js --dry
const path = require('path');
const { google } = require('googleapis');
const DIR = __dirname;
const SHEET_ID = '1nkBS79b_SDvmnowkaA5OAo9wL8W2b8Tt6ZqbisFcEPE';
const QTAB = '시트1', CONF = '_config';
const G = 'https://graph.instagram.com/v21.0';
const RAW_BASE = 'https://raw.githubusercontent.com/seojs980203-source/hmsh-autopost/main/videos/';
const DRY = process.argv.includes('--dry');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: path.join(DIR, 'google-credentials.json'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1) _config
  const conf = {}; const rowOf = {};
  const crows = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${CONF}'!A1:B30` })).data.values || [];
  crows.forEach((r, i) => { if (r[0]) { conf[r[0].trim()] = (r[1] || '').trim(); rowOf[r[0].trim()] = i + 1; } });
  const TOKEN = () => conf.ig_long_token;
  const setConf = async (k, v) => { if (rowOf[k]) { conf[k] = v; await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `'${CONF}'!B${rowOf[k]}`, valueInputOption: 'RAW', requestBody: { values: [[v]] } }); } };
  async function tg(text) { try { if (!conf.telegram_bot_token || !conf.telegram_chat_id) return;
    await fetch(`https://api.telegram.org/bot${conf.telegram_bot_token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: conf.telegram_chat_id, text, parse_mode: 'HTML' }) }); } catch (e) { console.log('tg ' + e.message); } }

  if (!TOKEN()) { console.log('토큰 없음 — _config ig_long_token 확인'); process.exit(1); }

  // 2) 토큰 확인 + 60일 연장 (월핫템 방식)
  const me = await (await fetch(`${G}/me?fields=id,user_id,username&access_token=${TOKEN()}`)).json();
  if (!me.id) { console.log('토큰 무효: ' + JSON.stringify(me).slice(0, 200)); await tg('🚨 <b>HMSH 자동발행</b>\n토큰 무효 — 재발급 필요'); process.exit(1); }
  console.log(`토큰 OK @${me.username}`);
  if (!conf.ig_user_id) await setConf('ig_user_id', String(me.user_id || me.id));
  try {
    const rr = await (await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN()}`)).json();
    if (rr.access_token) { await setConf('ig_long_token', rr.access_token); console.log('토큰 연장'); }
  } catch (e) { console.log('연장 스킵 ' + e.message); }

  // 3) 큐: ready 첫 행
  const rows = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${QTAB}'!A1:D200` })).data.values || [];
  let t = null;
  for (let i = 1; i < rows.length; i++) {
    const [v, cap, st] = [(rows[i][0] || '').trim(), (rows[i][1] || '').trim(), (rows[i][2] || '').trim().toLowerCase()];
    if (st === 'ready' && v) { t = { rowNum: i + 1, v, cap }; break; }
  }
  if (!t) { console.log('📭 발행 대기 없음'); return; }
  const setRow = async (st, result) => sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `'${QTAB}'!C${t.rowNum}:D${t.rowNum}`, valueInputOption: 'RAW', requestBody: { values: [[st, result]] } });

  // 4) URL 결정: http면 그대로(드롭박스 정규화), 아니면 repo raw
  let videoUrl = /^https?:\/\//i.test(t.v)
    ? t.v.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/([?&])dl=0/, '$1dl=1')
    : RAW_BASE + encodeURIComponent(t.v);
  let caption = t.cap;
  if (!/#syntheticperformer/i.test(caption)) caption = (caption ? caption + '\n' : '') + '#syntheticperformer';
  console.log(`행 ${t.rowNum} → ${videoUrl.slice(0, 100)}`);

  const enabled = conf.publish_enabled === 'true' && !DRY;
  if (!enabled) { console.log('🟡 드라이런 (publish_enabled=' + conf.publish_enabled + ')'); return; }

  // 5) REELS 3단계
  try {
    const igPost = async (ep, params) => (await fetch(`${G}/${ep}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: TOKEN() }) })).json();
    const c = await igPost(`${conf.ig_user_id}/media`, { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true' });
    if (!c.id) throw new Error('컨테이너 실패 ' + JSON.stringify(c).slice(0, 300));
    let status = '', tries = 0;
    while (tries++ < 60) { await sleep(5000);
      const s = await (await fetch(`${G}/${c.id}?fields=status_code&access_token=${TOKEN()}`)).json();
      status = s.status_code || '';
      if (status === 'FINISHED' || status === 'ERROR') break;
    }
    if (status !== 'FINISHED') throw new Error(status === 'ERROR' ? '영상 처리 실패(MP4 H.264/AAC 9:16 확인)' : '처리 타임아웃');
    const pub = await igPost(`${conf.ig_user_id}/media_publish`, { creation_id: c.id });
    if (!pub.id) throw new Error('발행 실패 ' + JSON.stringify(pub).slice(0, 300));
    await setRow('done', pub.id);
    console.log('✅ 발행 완료 ' + pub.id);
    await tg(`✅ <b>HMSH 릴스 자동발행 완료</b>\n@${me.username} · media ${pub.id}\n${caption.split('\n')[0].slice(0, 60)}`);
  } catch (e) {
    await setRow('error', String(e.message).slice(0, 200));
    console.log('❌ ' + e.message);
    await tg(`🚨 <b>HMSH 릴스 발행 실패</b>\n행 ${t.rowNum}: ${e.message}`);
    process.exit(1);
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
