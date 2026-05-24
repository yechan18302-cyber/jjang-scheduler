/* ── 투약 스케줄 동기화 API ── */
const { Redis } = require('@upstash/redis');
const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { deviceId, date, alarms } = req.body;
        if (!deviceId || !date || !alarms) return res.status(400).json({ error: '필수 값 누락' });

        await redis.set(`schedule:${deviceId}`, { date, alarms }, { ex: 60 * 60 * 25 }); // 25시간
        console.log(`[sync] ${deviceId} | ${date} | ${alarms.length}개 알람`);
        return res.status(200).json({ ok: true, count: alarms.length });
    } catch (e) {
        console.error('[sync] 오류:', e);
        res.status(500).json({ error: e.message });
    }
};
