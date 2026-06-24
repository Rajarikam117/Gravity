# GRAVITY

**Living Photo AR** — Transform printed wedding photographs into cinematic browser-based AR experiences.

No app install. No QR code. The photo itself is the trigger.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, TypeScript |
| WebAR | MindAR.js, Three.js |
| Backend | Node.js, Express |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Media CDN | **ImageKit** (free tier) |
| Deploy | Vercel (web) + Railway/Render (API) |

## Project Structure

```
gravity/
├── apps/
│   ├── web/          # React frontend (dashboard + scanner)
│   └── api/          # Express REST API
├── packages/
│   └── shared/       # Shared TypeScript types
└── supabase/
    └── schema.sql    # Database schema
```

## Quick Start

### 1. Prerequisites

- Node.js 20+
- Supabase account (free tier)
- ImageKit account (free tier)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` in the project root, and create `apps/web/.env`:

```bash
# Root .env (for API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
PORT=3001
CORS_ORIGIN=http://localhost:5173

# apps/web/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 4. Set up Supabase

1. Create a new Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Enable Email auth in Authentication → Providers
   
### 5. Set up ImageKit

1. Create account at [imagekit.io](https://imagekit.io)
2. Copy Public Key, Private Key, and URL Endpoint to `.env`
3. Free tier: 20GB bandwidth/month — enough for MVP validation

### 6. Run locally

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

### 7. Test on mobile

AR requires HTTPS and camera access. For local mobile testing:

```bash
# Use ngrok or Vite's network URL with HTTPS tunnel
npx ngrok http 5173
```

Open the ngrok URL on your Android phone in Chrome.

## User Flows

### Photographer

1. Sign up → Dashboard
2. Create event → Upload photo + video
3. System compiles `.mind` AR fingerprint (client-side)
4. Assets upload to ImageKit via API
5. Publish event → Copy scan URL

### Guest

1. Open scan URL on phone browser
2. Camera opens automatically
3. Point at printed photo
4. Cinematic video plays on the photo in AR

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/api/events` | Yes | List photographer events |
| POST | `/api/events` | Yes | Create event |
| GET | `/api/events/:id` | Yes | Get event details |
| PATCH | `/api/events/:id` | Yes | Update/publish event |
| DELETE | `/api/events/:id` | Yes | Delete event |
| POST | `/api/uploads/:eventId` | Yes | Upload photo, video, mind |
| GET | `/api/scan/:slug` | No | Public event for scanner |
| POST | `/api/scan/:slug/scan` | No | Record scan analytics |
| GET | `/api/analytics/summary` | Yes | Dashboard analytics |

## Deployment

### Frontend (Vercel)

```bash
cd apps/web
vercel
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (your deployed API URL)

### Backend (Railway or Render)

1. Connect GitHub repo
2. Set root directory to `apps/api`
3. Build command: `npm run build`
4. Start command: `npm start`
5. Add all root `.env` variables

Update `CORS_ORIGIN` to your Vercel URL.

## Performance Notes

- AR tracking is 100% client-side
- Video preloads before AR starts
- `.mind` compiled in browser during upload (no server cost)
- ImageKit CDN serves all media globally
- MindAR tuned for mid-range Android (`filterMinCF: 0.0001`)

## Video Guidelines

- Format: H.264 MP4
- Resolution: 720p max
- Duration: 15–60 seconds
- Size: under 50MB
- Compress with HandBrake or FFmpeg before upload

## Scaling Path (after validation)

| Trigger | Upgrade |
|---------|---------|
| 20GB ImageKit bandwidth | ImageKit paid plan |
| 500MB Supabase DB | Supabase Pro |
| API cold starts | Railway paid (no sleep) |
| 50+ concurrent scans | No backend change needed (client-side AR) |

## License

Private — GRAVITY © 2026
