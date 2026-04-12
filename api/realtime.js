// api/realtime.js — 민원실 창구별 실시간 대기현황 프록시
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.DATA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const { csoId, pageNo = 1, numOfRows = 20 } = req.query;

  try {
    let url =
      `https://apis.data.go.kr/B551982/cso_v2/cso_realtime_v2` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&pageNo=${pageNo}` +
      `&numOfRows=${numOfRows}` +
      `&type=json`;

    if (csoId) url += `&csoId=${csoId}`;

    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);

    const data = await upstream.json();

    const code = data?.response?.header?.resultCode;
    if (code && code !== '00') throw new Error(data?.response?.header?.resultMsg || 'API Error');

    return res.status(200).json(data);
  } catch (e) {
    console.error('[/api/realtime]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
