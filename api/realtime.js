// api/realtime.js — 민원실 업무별 실시간 대기 현황 (cso_realtime_v2)
const { cors, callAll, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { csoSn } = req.query;
  if (!csoSn) return res.status(400).json({ ok: false, error: 'csoSn required' });

  try {
    // 한 페이지 최대 건수가 제한될 수 있어 100건씩 넘겨 가며 모은다
    const { items } = await callAll('cso_v2/cso_realtime_v2', {}, 100, 10);
    const list = items
      .filter(w => w.csoSn === csoSn)
      .map(w => ({
        taskNo: w.taskNo,
        taskName: w.taskNm,
        waiting: Number(w.wtngCnt) || 0,
        updatedAt: w.totDt
      }));
    return res.status(200).json({ ok: true, items: list });
  } catch (e) {
    return fail(res, '/api/realtime', e);
  }
};
