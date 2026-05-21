/**
 * Vercel Serverless Function
 * POST /api/commands   → Bot updates the command list (stores in Upstash Redis)
 * GET  /api/commands   → Website fetches the latest commands
 *
 * Uses Upstash Redis (serverless-friendly, HTTP based)
 *
 * Required Environment Variables (set in Vercel dashboard):
 *   UPSTASH_REDIS_REST_URL=...
 *   UPSTASH_REDIS_REST_TOKEN=...
 *   FISHR_UPDATE_SECRET=your-strong-secret-here   (optional but recommended)
 */

const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

const REDIS_KEY = 'fishr:commands:v1';
const UPDATE_SECRET = process.env.FISHR_UPDATE_SECRET || 'change-me-in-production';

module.exports = async (req, res) => {
  // CORS for the static website (same origin or GitHub pages etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-fishr-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Security: require secret header from the bot
    const auth = req.headers['x-fishr-secret'];
    if (auth !== UPDATE_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const body = req.body;

      // Expected payload from bot:
      // { "categories": { "fishing": { emoji, title, description, commands: [...] }, ... } }
      // or { "commands": [...] } for flat list (we'll normalize)

      let payloadToStore;

      if (body.categories) {
        payloadToStore = { type: 'categories', data: body.categories };
      } else if (body.commands && Array.isArray(body.commands)) {
        payloadToStore = { type: 'flat', data: body.commands };
      } else {
        // Fallback: store whatever was sent
        payloadToStore = { type: 'raw', data: body };
      }

      await redis.set(REDIS_KEY, JSON.stringify(payloadToStore), { ex: 60 * 60 * 24 * 7 }); // 7 days TTL

      return res.status(200).json({ 
        success: true, 
        message: 'Commands updated in Redis',
        storedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Redis write error:', err);
      return res.status(500).json({ error: 'Failed to store commands' });
    }
  }

  if (req.method === 'GET') {
    try {
      const raw = await redis.get(REDIS_KEY);

      if (!raw) {
        return res.status(200).json({ 
          type: 'empty', 
          data: {}, 
          message: 'No commands stored yet. Bot has not synced.' 
        });
      }

      const parsed = JSON.parse(raw);
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Redis read error:', err);
      return res.status(500).json({ error: 'Failed to retrieve commands' });
    }
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
};
