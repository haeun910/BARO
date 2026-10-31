// api/_lib.js — 공공데이터 API 공통 처리 (밑줄로 시작해 Vercel 라우트로 노출되지 않음)
// 한국지역정보개발원 API 응답은 { header, body: { items: { item } } } 구조이고 성공 코드는 "K0".
// 옛 공공데이터 형식({ response: { header, body } }, 성공 "00")도 함께 처리한다.

const BASE = 'https://apis.data.go.kr/B551982';

function cors(res, methods = 'GET, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function callApi(path, params = {}) {
  const key = process.env.DATA_API_KEY;
  if (!key) throw new Error('API key not configured');

  const qs = new URLSearchParams({ serviceKey: key, type: 'json', ...params });
  const r = await fetch(`${BASE}/${path}?${qs}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`upstream ${path} ${r.status}`);

  const text = await r.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`upstream ${path} returned non-JSON: ${text.slice(0, 120)}`); }

  const root = data.response || data;
  const code = root?.header?.resultCode;
  if (code && code !== 'K0' && code !== '00') {
    throw new Error(`upstream ${path} ${code} ${root?.header?.resultMsg || ''}`.trim());
  }

  const item = root?.body?.items?.item;
  const items = item ? (Array.isArray(item) ? item : [item]) : [];
  return { items, totalCount: Number(root?.body?.totalCount || items.length) };
}

// 전체 건수만큼 페이지를 넘기며 모은다 (최대 maxPages 페이지)
async function callAll(path, params = {}, rows = 1000, maxPages = 5) {
  const first = await callApi(path, { ...params, pageNo: 1, numOfRows: rows });
  let items = first.items;
  const pages = Math.min(maxPages, Math.ceil(first.totalCount / rows));
  for (let p = 2; p <= pages; p++) {
    const next = await callApi(path, { ...params, pageNo: p, numOfRows: rows });
    items = items.concat(next.items);
  }
  return { items, totalCount: first.totalCount };
}

// 법정동코드(stdgCd, 10자리)의 앞 2자리가 시도 코드. 시도 코드가 주어지면 그 지역만 남긴다.
function bySido(items, sido) {
  if (!sido) return items;
  return items.filter(it => String(it.stdgCd || '').startsWith(String(sido)));
}

// "090000" → "09:00"
function hhmm(t) {
  const s = String(t || '').padStart(4, '0');
  return s.length >= 4 ? `${s.slice(0, 2)}:${s.slice(2, 4)}` : '';
}

function fail(res, where, e) {
  console.error(`[${where}]`, e.message);
  return res.status(502).json({ ok: false, error: e.message });
}

module.exports = { cors, callApi, callAll, bySido, hhmm, fail };
