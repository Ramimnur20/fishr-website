# FishR Web - Vercel + Redis Commands API

This folder is now a complete Vercel project:
- Static retro Windows-style website (index.html)
- Serverless API at /api/commands (stores & serves command list via Upstash Redis)

## Quick Start (Local)

1. Install Vercel CLI:
   npm i -g vercel

2. Copy env:
   cp .env.example .env.local

3. Get Upstash Redis (free):
   - Go to https://console.upstash.com
   - Create Redis database
   - Copy REST URL + TOKEN into .env.local

4. Set a strong secret in .env.local (FISHR_UPDATE_SECRET)

5. Run locally:
   vercel dev

6. Open http://localhost:3000

## Deploy to Production

1. Push this folder to GitHub (or use Vercel dashboard → Import Git repo)

2. In Vercel project settings:
   - Add the 3 environment variables (UPSTASH_..., FISHR_UPDATE_SECRET)
   - Framework preset: Other (static)

3. Deploy

4. Your API will be live at:
   https://your-project.vercel.app/api/commands

## How the sync works

- Bot sends POST /api/commands with the full HELP_CATEGORIES
- Includes header x-fishr-secret
- Vercel function writes to Redis
- Website fetches GET /api/commands when user opens the Commands tab
- Data is always fresh from the bot

See api/bot-sync-example.py for the exact code to add to the Python bot.

## Notes

- The function has a 7-day TTL on the Redis key (adjust if needed)
- CORS is open (*) for simplicity
- No rate limiting yet (add if you want)
