// api/buses.js — 버스 노선 기본정보 (rte/mst_info)
const { cors, callAll, cacheFor, bySido, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido } = req.query;
  try {
    const { items } = await callAll('rte/mst_info', {}, 1000, 5, 3600);
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
    cacheFor(res, 3600); // 노선·첫차·막차는 하루 단위 정보
    return res.status(200).json({ ok: true, items: list });
  } catch (e) {
    return fail(res, '/api/buses', e);
  }
};
