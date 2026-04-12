// api/buses.js — 초정밀버스 노선 기본정보 + 실시간 위치 프록시
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.DATA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const {
    ctprvnCd = '11',
    signguCd,
    routeId,       // 특정 노선 실시간 위치 조회 시
    pageNo = 1,
    numOfRows = 10
  } = req.query;

  try {
    if (routeId) {
      // 실시간 버스 위치 조회
      const url =
        `https://apis.data.go.kr/B551982/rte/rtm_loc_info` +
        `?serviceKey=${encodeURIComponent(API_KEY)}` +
        `&routeId=${routeId}` +
        `&type=json`;

      const r = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30000)
      });
      if (!r.ok) throw new Error(`upstream rtm ${r.status}`);
      return res.status(200).json(await r.json());
    }

    // 노선 기본정보 조회
    let url =
      `https://apis.data.go.kr/B551982/rte/mst_info` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&ctprvnCd=${ctprvnCd}` +
      `&pageNo=${pageNo}` +
      `&numOfRows=${numOfRows}` +
      `&type=json`;

    if (signguCd) url += `&signguCd=${signguCd}`;

    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error(`upstream mst ${r.status}`);

    const data = await r.json();
    const code = data?.response?.header?.resultCode;
    if (code && code !== '00') throw new Error(data?.response?.header?.resultMsg);

    return res.status(200).json(data);
  } catch (e) {
    console.error('[/api/buses]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
