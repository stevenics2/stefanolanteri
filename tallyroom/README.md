# Tally Room Reviews

A Booking-style web app to review the **Tally Rooms** found on ships, built for port workers worldwide.
Runs entirely on Cloudflare's free tier (Pages + D1 + R2).

## Features
- Type a ship name; if it is not in the database yet, add it.
- Star rating, amenity checklist (power outlets, air conditioning, chairs, desk, cleanliness, lighting, Wi-Fi, toilet nearby), notes and up to 3 photos.
- **Update this Tally Room**: every new submission is a dated update. The sheet shows rating and amenities based on the **latest 5 reviews**, so a room that gets dirty or loses its AC shows up quickly. The full history stays visible.
- Reviews are **anonymous** and published only after **manual approval** in `/admin`.
- An existing list of ships (name + rating) can be imported from `/admin`. The imported rating is used until the first real review arrives.
- Anti-spam: hidden honeypot field and at most 5 submissions per hour per connection. Every review has a "Report" button.
- Photos are resized on the phone (about 200-300 KB) before upload, so the free storage lasts a long time.

## Deploy
Create a free Cloudflare account, then:
1. Create a D1 database named `tallyroom`, run the contents of `schema.sql` in its console and put its ID in `wrangler.toml`.
2. Create an R2 bucket named `tallyroom-photos`.
3. Create a **Pages** project from this Git repository: root directory `tallyroom`, build output directory `public`, no build command.
4. Add two **secrets** to the Pages project (Production and Preview): `ADMIN_PASSWORD` and `SALT` (any random phrase), then redeploy.
5. Open `/admin`, log in, and import your ship list (`name;rating`, see `ships-example.csv`).

CLI alternative:
```bash
npm install
npx wrangler login
npx wrangler d1 create tallyroom        # copy database_id into wrangler.toml
npm run db:remote
npx wrangler r2 bucket create tallyroom-photos
npx wrangler pages deploy public --project-name tally-room
npx wrangler pages secret put ADMIN_PASSWORD --project-name tally-room
npx wrangler pages secret put SALT --project-name tally-room
```

## Local development
```bash
npm install
npm run db:local
npm run dev        # http://localhost:8788
```
Create a `.dev.vars` file with `ADMIN_PASSWORD=...` and `SALT=...` (not committed).

## Free tier limits (approximate)
D1 5 GB, R2 10 GB with no egress fees, 100,000 function requests per day.

## Structure
- `public/` static frontend (`index.html`, `app.js`, `admin.html`, `admin.js`)
- `functions/api/[[path]].js` API
- `schema.sql` database tables
