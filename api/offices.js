// api/offices.js — 민원실 기본정보 프록시
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = process.env.DATA_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const {
    ctprvnCd = '11',
    signguCd,
    pageNo = 1,
    numOfRows = 20
  } = req.query;

  try {
    let url =
      `https://apis.data.go.kr/B551982/cso_v2/cso_info_v2` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&pageNo=${pageNo}` +
      `&numOfRows=${numOfRows}` +
      `&ctprvnCd=${ctprvnCd}` +
      `&type=json`;

    if (signguCd) url += `&signguCd=${signguCd}`;

    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' }
    });

    if (!upstream.ok) {
      throw new Error(`upstream ${upstream.status}`);
    }

    const data = await upstream.json();

    // 오류 코드 체크
    const code = data?.response?.header?.resultCode;
    if (code && code !== '00') {
      throw new Error(data?.response?.header?.resultMsg || 'API Error');
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error('[/api/offices]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
