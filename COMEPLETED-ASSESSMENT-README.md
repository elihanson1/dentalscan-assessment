# DentalScan Engineering Challenge — Elijah Hanson

Full stack implementation of the DentalScan engineering challenge. Built with Next.js 14, TypeScript, Prisma ORM, PostgreSQL, and Tailwind CSS.

**Live Demo:** https://dentalscan-assesment.vercel.app/

**SQLite Local Dev Note:** SQLite was used for a zero-config setup and can easily be changed to PostgreSQL by changing one line in `schema.prisma`. This makes it so the messaging function is not transferred via Vercel deployment and can only be seen at the local host port. More info below.

---

## What Was Built

### Task 1 — Scan Enhancement (Frontend)
- Pre-scan tutorial carousel with angle-specific face illustrations and directional arrows
- Camera view with face outline overlay and mouth targeting ellipse
- Color-shifting stability indicator (red → amber → green) driven by a `useStabilityScore` custom hook
- Pixel-diff algorithm running on a 32×32 canvas via `requestAnimationFrame` zero overhead on the media feed

### Task 2 — Notification System (Backend)
- `POST /api/notify` fires on scan upload — async, non-blocking, does not delay the upload response
- Prisma `$transaction` wraps scan lookup and notification creation — no silent data loss on DB failure
- `Notification` model with `read/unread` state tracking
- Twilio SMS dispatch stubbed as specified — architecture is wired to swap in real credentials

### Task 3 — Patient-Dentist Messaging (Full Stack)
- Quick-message sidebar on the post-scan results page
- `/api/threads` uses `upsert` by `patientId` — idempotent and race-condition safe
- Optimistic UI updates — message appears immediately at reduced opacity, confirms or rolls back on response
- `Sender` union type enforced at both TypeScript layer and API boundary

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| ORM | Prisma ORM |
| Database | PostgreSQL (local: SQLite) |
| Notifications | Twilio stub |

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (or use SQLite for local dev — see note below)

### 1. Clone and install

```bash
git clone https://github.com/your-username/dentalscan-challenge
cd dentalscan-challenge
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dentalscan"
# For local SQLite dev, use:
# DATABASE_URL="file:./dev.db"
```

### 3. Run database migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start the dev server

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Switching from SQLite to PostgreSQL

The local dev setup uses SQLite for zero-config setup. Switching to PostgreSQL for production is a one-line change in `schema.prisma`:

```prisma
// Change this:
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// To this:
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:

```bash
npx prisma migrate deploy
```

No application code changes required.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── notify/route.ts       # Notification trigger
│   │   ├── threads/route.ts      # Message thread upsert
│   │   └── messages/route.ts     # Message persistence
│   ├── scan/                     # Scan flow + camera view
│   └── results/                  # Post-scan results + messaging sidebar
├── components/
│   ├── StabilityOverlay.tsx      # Camera guidance UI
│   ├── TutorialCarousel.tsx      # Pre-scan onboarding
│   └── MessageSidebar.tsx        # Patient-dentist messaging
├── hooks/
│   └── useStabilityScore.ts      # Pixel-diff stability hook
└── prisma/
    └── schema.prisma
```

---

## AUDIT.md

See [AUDIT.md](./AUDIT.md) for technical and UX findings from using the live DentalScan product, including a flagged clinical liability concern around a false-positive AI diagnostic result.
