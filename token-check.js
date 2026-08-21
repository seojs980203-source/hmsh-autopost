// IG 장기토큰 주간 점검·갱신 → 텔레그램 보고 — wht-autopost/token-check.js 미러 (hmsh판)
const path = require('path');
const { google } = require('googleapis');
const SHEET_ID = '1nkBS79b_SDvmnowkaA5OAo9wL8W2b8Tt6ZqbisFcEPE', CONF = '_config';
const G = 'https://graph.instagram.com';

(async () => {
  const auth = new google.auth.GoogleAuth({ keyFile: path.join(__dirname, 'google-credentials.json'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const conf = {}; let tokenRow = -1;
  const crows = (await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${CONF}'!A1:B30` })).data.values || [];
  crows.forEach((r, i) => { if (r[0]) { conf[r[0].trim()] = (r[1] || '').trim(); if (r[0].trim() === 'ig_long_token') tokenRow = i + 1; } });
  async function tg(text) { try { if (!conf.telegram_bot_token || !conf.telegram_chat_id) return;
    await fetch(`https://api.telegram.org/bot${conf.telegram_bot_token}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: conf.telegram_chat_id, text, parse_mode: 'HTML' }) }); } catch (e) { console.log('tg ' + e.message); } }
  if (!conf.ig_long_token || tokenRow < 0) { await tg('🚨 <b>HMSH IG 토큰 점검</b>\n_config에서 ig_long_token을 찾지 못했습니다.'); process.exit(1); }

  let alive = false, username = '';
  try {
    const me = await (await fetch(`${G}/v21.0/me?fields=id,username&access_token=${conf.ig_long_token}`)).json();
    if (me.id) { alive = true; username = me.username || ''; }
  } catch (e) { console.log(e.message); }
  if (!alive) { await tg('🚨 <b>HMSH IG 토큰 점검</b>\n토큰이 죽었습니다. Meta 앱 대시보드에서 재발급 후 _config에 갱신해주세요.'); process.exit(1); }

  let days = '?';
  try {
    const rr = await (await fetch(`${G}/refresh_access_token?grant_type=ig_refresh_token&access_token=${conf.ig_long_token}`)).json();
    if (rr.access_token) {
      await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `'${CONF}'!B${tokenRow}`, valueInputOption: 'RAW', requestBody: { values: [[rr.access_token]] } });
      days = Math.round((rr.expires_in || 0) / 86400);
    }
  } catch (e) { console.log('refresh 실패 ' + e.message); }
  console.log(`OK @${username} 잔여 ${days}일`);
  await tg(`🔑 <b>HMSH IG 토큰 점검</b>\n@${username} 정상 · 갱신 완료 (잔여 ${days}일)`);
})().catch(e => { console.error(e); process.exit(1); });
