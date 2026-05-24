/* ── 구독 저장/삭제 API ── */
const { Redis } = require('@upstash/redis');
const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
});

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'POST') {
            const { subscription, deviceId } = req.body;
            if (!subscription || !deviceId) return res.status(400).json({ error: '필수 값 누락' });
            await redis.set(`sub:${deviceId}`, subscription, { ex: 60 * 60 * 24 * 60 }); // 60일
            console.log('[subscribe] 구독 저장:', deviceId);
            return res.status(200).json({ ok: true });
        }
        if (req.method === 'DELETE') {
            const { deviceId } = req.body;
            if (deviceId) await redis.del(`sub:${deviceId}`);
            return res.status(200).json({ ok: true });
        }
        res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('[subscribe] 오류:', e);
        res.status(500).json({ error: e.message });
    }
};
