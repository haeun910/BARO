// api/signals.js — 교차로 정보(crsrd_map_info) + 신호 잔여시간(tl_drct_info)을 교차로 ID로 병합
const { cors, callAll, cacheFor, bySido, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido, raw } = req.query;
  try {
    const [map, sig] = await Promise.all([
      callAll('rti/crsrd_map_info'),
      callAll('rti/tl_drct_info')
    ]);
    if (raw) return res.status(200).json({ map: map.items.slice(0, 3), sig: sig.items.slice(0, 3) });

    const sigById = new Map();
    sig.items.forEach(s => { if (s.crsrdId && !sigById.has(s.crsrdId)) sigById.set(s.crsrdId, s); });

    // 신호 잔여시간이 있는 교차로만 남겨 이름·좌표와 잔여시간을 한 카드로 합친다.
    const merged = bySido(map.items, sido)
      .filter(m => sigById.has(m.crsrdId))
      .map(m => ({ ...m, ...sigById.get(m.crsrdId) }));

    cacheFor(res, 5); // 잔여시간은 초 단위라 짧게
    return res.status(200).json({ ok: true, items: merged });
  } catch (e) {
    return fail(res, '/api/signals', e);
  }
};
