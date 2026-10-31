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

// 서버 인스턴스 메모리 캐시: 같은 요청이 TTL 안에 다시 오면 공공 API를 다시 부르지 않는다
const memo = new Map();

// 전체 건수만큼 페이지를 모은다. 첫 페이지로 전체 건수를 알아낸 뒤 나머지 페이지는 동시에 요청한다.
async function callAll(path, params = {}, rows = 1000, maxPages = 5, ttlSec = 0) {
  const key = `${path}?${new URLSearchParams(params)}&rows=${rows}`;
  const hit = memo.get(key);
  if (ttlSec && hit && hit.exp > Date.now()) return hit.value;

  const first = await callApi(path, { ...params, pageNo: 1, numOfRows: rows });
  const pages = Math.min(maxPages, Math.ceil(first.totalCount / rows));
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      callApi(path, { ...params, pageNo: i + 2, numOfRows: rows }))
  );
  const value = { items: first.items.concat(...rest.map(r => r.items)), totalCount: first.totalCount };
  if (ttlSec) memo.set(key, { value, exp: Date.now() + ttlSec * 1000 });
  return value;
}

// 성공 응답만 Vercel CDN에 캐싱 (s-maxage 동안은 함수 실행 없이 CDN이 바로 응답)
function cacheFor(res, sec) {
  res.setHeader('Cache-Control', `public, s-maxage=${sec}, stale-while-revalidate=${sec * 4}`);
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

module.exports = { cors, callApi, callAll, cacheFor, bySido, hhmm, fail };
