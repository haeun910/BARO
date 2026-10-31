// api/transport.js — 교통약자 이동지원센터 현황(center_info_v2) + 차량 이용가능 정보(info_vehicle_use_v2)
const { cors, callApi, cacheFor, bySido, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido, raw } = req.query;
  try {
    // 센터·차량 두 API를 동시에 요청 (차량 정보는 실패해도 센터 정보만으로 응답)
    const [centers, vehicles] = await Promise.all([
      callApi('tsdo_v2/center_info_v2', { pageNo: 1, numOfRows: 300 }),
      callApi('tsdo_v2/info_vehicle_use_v2', { pageNo: 1, numOfRows: 300 })
        .catch(e => { console.warn('[/api/transport] vehicle', e.message); return { items: [] }; })
    ]);

    if (raw) return res.status(200).json({ centers: centers.items.slice(0, 3), vehicles: vehicles.items.slice(0, 3) });

    cacheFor(res, 600);
    return res.status(200).json({
      ok: true,
      centers: bySido(centers.items, sido),
      vehicles: bySido(vehicles.items, sido)
    });
  } catch (e) {
    return fail(res, '/api/transport', e);
  }
};
