// api/transport.js — 교통약자 이동지원센터 현황(center_info_v2) + 차량 이용가능 정보(info_vehicle_use_v2)
const { cors, callApi, bySido, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido, raw } = req.query;
  try {
    const centers = await callApi('tsdo_v2/center_info_v2', { pageNo: 1, numOfRows: 300 });
    let vehicles = { items: [] };
    try { vehicles = await callApi('tsdo_v2/info_vehicle_use_v2', { pageNo: 1, numOfRows: 300 }); }
    catch (e) { console.warn('[/api/transport] vehicle', e.message); }

    if (raw) return res.status(200).json({ centers: centers.items.slice(0, 3), vehicles: vehicles.items.slice(0, 3) });

    return res.status(200).json({
      ok: true,
      centers: bySido(centers.items, sido),
      vehicles: bySido(vehicles.items, sido)
    });
  } catch (e) {
    return fail(res, '/api/transport', e);
  }
};
