# Tally Room Reviews

A Booking-style web app to review the **Tally Rooms** found on ships, built for port workers worldwide.
Runs entirely on Cloudflare's free tier (Pages + D1 + R2).

## Features
- Type a ship name; if it is not in the database yet, add it.
- Star rating, amenity questions with YES / NO / blank (220V power, air conditioning, chairs, desk, cleanliness, lighting, toilet nearby), approximate capacity (people that fit inside), notes and up to 3 photos.
- **Update this Tally Room**: every new submission is a dated update. The sheet shows rating and amenities based on the **latest 5 reviews**, so a room that gets dirty or loses its AC shows up quickly. The full history stays visible.
- Reviews are **anonymous** and published only after **manual approval** in `/admin`.
- An existing list of ships (name + rating) can be imported from `/admin`. The imported rating is used until the first real review arrives.
- **Save to your phone**: on a phone, the first visit shows a one-time popup. On Android it installs the site to the home screen with one tap (the site is installable: `manifest.webmanifest`, `sw.js` and the icons in `public/`). On iPhone/iPad it shows the steps, because iOS does not allow this from code.
- **Home page**: a random selection of 6 major ports with live weather (temperature and wind in knots, strong wind highlighted), the latest port news headlines, the most recently updated Tally Rooms, and a SAFETY FIRST banner.
  - Weather: [MET Norway](https://api.met.no/doc/TermsOfService) (free, commercial use allowed with a descriptive User-Agent; credit shown on the page). Cached 30 minutes per port. The port list is in `functions/api/[[path]].js` (`PORTS`).
  - News: public RSS feed of [Port Technology International](https://www.porttechnology.org/rss-feeds/). Only the headline, source and link are shown. Cached 20 minutes. Feeds are listed in `NEWS_FEEDS` in the same file.
  - If a source is unreachable the card simply disappears.
- The search box, vessel name and notes are editable text areas instead of `<input>` fields on purpose: Chrome on iPhone shows an autofill bar (passwords, cards, addresses) above the keyboard on every input, but not on editable text areas.
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

## Email notifications for the admin
When a new vessel or review is submitted you get an email right away. While anything stays unapproved for
3 days or more, you also get a summary email every 3 days. Emails are sent with [Resend](https://resend.com)
(free: 3,000 emails per month).

1. Create a free Resend account and an **API key**.
2. Sending address:
   - quick start: set `MAIL_FROM` to `Tally Rooms <onboarding@resend.dev>`. Resend lets this address write to the email of your own Resend account, which is enough here.
   - recommended once `tallyrooms.com` is active: add the domain in Resend (it shows DNS records to add on Cloudflare) and use `Tally Rooms <notifications@tallyrooms.com>`, which is the default.
3. In the Pages project, add these **secrets** (Production and Preview) and redeploy:
   `RESEND_API_KEY`, `ADMIN_EMAIL` (where you want to receive the emails) and, only for the quick start, `MAIL_FROM`.
4. Reminders run from a small separate Worker in `reminder/` (Cron Trigger, free):
   - Create a Worker from this repository with **root directory** `tallyroom/reminder` (deploy command `npx wrangler deploy`) and set **Branch control** to the branch that contains this folder. Or from the terminal: `cd reminder && npx wrangler deploy`.
   - Add the same secrets to that Worker: `RESEND_API_KEY`, `ADMIN_EMAIL` and optionally `MAIL_FROM`.
   - In `reminder/wrangler.toml` you can change the interval (`REMIND_EVERY_DAYS`) and the run time (`crons`).

If the secrets are missing, nothing breaks: no emails are sent. The email address never appears in the code.

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
- `reminder/` daily Worker that sends the approval reminders
- `schema.sql` database tables
