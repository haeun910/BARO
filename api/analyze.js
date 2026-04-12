// api/analyze.js — Claude AI 맞춤 분석 프록시 (API 키 서버에서 안전 보관)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLAUDE_KEY = process.env.CLAUDE_API_KEY;
  if (!CLAUDE_KEY) return res.status(500).json({ error: 'Claude API key not configured' });

  const { userType, complaint, officeName, officeAddr, officeDist } = req.body || {};

  if (!userType || !complaint) {
    return res.status(400).json({ error: 'userType and complaint required' });
  }

  const prompt = `대한민국 공공 민원 서비스 안내 전문가로서 아래 정보를 분석해주세요.

방문자 유형: ${userType}
민원 종류: ${complaint}
선택 민원실: ${officeName || '민원실'} (${officeAddr || ''}, 약 ${officeDist || '?'}km)
현재 시각: ${new Date().toLocaleString('ko-KR')}

반드시 아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "recommendation": "추천 처리 방법 (예: 정부24 온라인 처리 권장)",
  "reason": "추천 이유 2문장. 구체적인 수치나 혜택 포함.",
  "documents": ["구비서류1", "구비서류2", "구비서류3"],
  "time": "예상 처리 시간",
  "tip": "해당 사용자 유형(${userType})에 특화된 실용적인 팁 1문장",
  "online": true또는false,
  "kiosk": true또는false
}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Claude API ${r.status}: ${err}`);
    }

    const data = await r.json();
    const text = data.content?.[0]?.text || '';

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      throw new Error('Failed to parse Claude response');
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error('[/api/analyze]', e.message);
    return res.status(502).json({ error: e.message });
  }
};
