// api/offices.js — 민원실 기본정보 (cso_info_v2)
const { cors, callApi, bySido, hhmm, fail } = require('./_lib');

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sido } = req.query;
  try {
    // 전국 민원실 수가 많지 않아 한 번에 받아 오고, 지역 필터·거리 정렬은 이후 단계에서 한다.
    const { items } = await callApi('cso_v2/cso_info_v2', { pageNo: 1, numOfRows: 300 });
    const local = bySido(items, sido);
    const list = (local.length ? local : items).map(o => ({
      csoSn: o.csoSn,
      stdgCd: o.stdgCd,
      name: o.csoNm,
      address: o.roadNmAddr || o.lotnoAddr || '',
      lat: parseFloat(o.lat),
      lng: parseFloat(o.lot),
      operHour: `${hhmm(o.wkdyOperBgngTm)} ~ ${hhmm(o.wkdyOperEndTm)}`,
      nightOper: o.nghtOperYn === 'Y',
      nightNote: o.nghtDowExpln || '',
      weekendOper: o.wkndOperYn === 'Y',
      weekendNote: o.wkndDowExpln || ''
    })).filter(o => Number.isFinite(o.lat) && Number.isFinite(o.lng));

    return res.status(200).json({ ok: true, inRegion: local.length > 0, items: list });
  } catch (e) {
    return fail(res, '/api/offices', e);
  }
};
