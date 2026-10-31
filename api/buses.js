// api/buses.js — 버스 노선 기본정보 (rte/mst_info)
const { cors, callAll, bySido, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido } = req.query;
  try {
    const { items } = await callAll('rte/mst_info');
    const list = bySido(items, sido).map(b => ({
      routeId: b.rteId,
      routeNo: b.rteNo,
      routeType: b.rteType,
      start: b.stpnt,
      end: b.edpnt,
      firstBus: b.vhclFstTm,
      lastBus: b.vhclLstTm,
      city: b.lclgvNm
    }));
    return res.status(200).json({ ok: true, items: list });
  } catch (e) {
    return fail(res, '/api/buses', e);
  }
};
