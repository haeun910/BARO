// api/transport.js — 교통약자 이동지원센터 현황 + 택시 이용가능 정보 프록시
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
    numOfRows = 5
  } = req.query;

  try {
    // 1) 센터 기본정보
    let centerUrl =
      `https://apis.data.go.kr/B551982/tsdo_v2/center_info_v2` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&ctprvnCd=${ctprvnCd}` +
      `&pageNo=${pageNo}` +
      `&numOfRows=${numOfRows}` +
      `&type=json`;

    if (signguCd) centerUrl += `&signguCd=${signguCd}`;

    const centerRes = await fetch(centerUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });
    if (!centerRes.ok) throw new Error(`upstream center ${centerRes.status}`);
    const centerData = await centerRes.json();

    const centers = centerData?.response?.body?.items?.item;
    if (!centers) throw new Error('no center items');
    const arr = Array.isArray(centers) ? centers : [centers];

    // 2) 이용가능 택시 현황 (첫 번째 센터)
    let useData = null;
    if (arr.length > 0 && arr[0]?.centerId) {
      const useUrl =
        `https://apis.data.go.kr/B551982/tsdo_v2/info_vehicle_use_v2` +
        `?serviceKey=${encodeURIComponent(API_KEY)}` +
        `&centerId=${arr[0].centerId}` +
        `&type=json`;

      try {
        const useRes = await fetch(useUrl, { signal: AbortSignal.timeout(30000) });
        if (useRes.ok) useData = await useRes.json();
      } catch { /* optional, ignore */ }
    }

    return res.status(200).json({ centers: arr, useInfo: useData });
  } catch (e) {
    console.error('[/api/transport]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
