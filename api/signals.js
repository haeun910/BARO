// api/signals.js — 교통안전 신호등 신호잔여시간 실시간 프록시
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
    numOfRows = 10
  } = req.query;

  try {
    // 1단계: 교차로 맵 정보 (좌표)
    let mapUrl =
      `https://apis.data.go.kr/B551982/rti/crsrd_map_info` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&ctprvnCd=${ctprvnCd}` +
      `&pageNo=${pageNo}` +
      `&numOfRows=${numOfRows}` +
      `&type=json`;

    if (signguCd) mapUrl += `&signguCd=${signguCd}`;

    const mapRes = await fetch(mapUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    if (!mapRes.ok) throw new Error(`upstream map ${mapRes.status}`);
    const mapData = await mapRes.json();

    const mapItems = mapData?.response?.body?.items?.item;
    if (!mapItems) throw new Error('no map items');

    const mapArr = Array.isArray(mapItems) ? mapItems : [mapItems];
    if (!mapArr.length || !mapArr[0]?.crsrdId) throw new Error('empty map items');

    // 2단계: 신호 잔여시간 — 첫 번째 교차로 ID 목록 사용
    const ids = mapArr.slice(0, 6).map(m => m.crsrdId).join(',');
    let sigUrl =
      `https://apis.data.go.kr/B551982/rti/tl_drct_info` +
      `?serviceKey=${encodeURIComponent(API_KEY)}` +
      `&ctprvnCd=${ctprvnCd}` +
      `&pageNo=1&numOfRows=6` +
      `&type=json`;

    if (signguCd) sigUrl += `&signguCd=${signguCd}`;

    const sigRes = await fetch(sigUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });

    if (!sigRes.ok) throw new Error(`upstream sig ${sigRes.status}`);
    const sigData = await sigRes.json();

    // 두 데이터 병합: 교차로 이름 + 신호 잔여시간
    const sigItems = sigData?.response?.body?.items?.item;
    const sigArr = sigItems ? (Array.isArray(sigItems) ? sigItems : [sigItems]) : [];

    // 교차로 맵 데이터에 신호 잔여시간 합치기
    const merged = mapArr.slice(0, 4).map(m => {
      const sig = sigArr.find(s => s.crsrdId === m.crsrdId) || {};
      return { ...m, ...sig };
    });

    return res.status(200).json({ ok: true, items: merged });
  } catch (e) {
    console.error('[/api/signals]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
