# Tattoo Record - Tattoo Social Community Platform

A production-ready, full-stack tattoo social community platform with real-time messaging, live streaming, portfolio management, and AI-powered recommendations.

## Tech Stack

### Frontend
- Vite + React 18
- TypeScript
- Tailwind CSS
- shadcn/ui component library
- TanStack Query (React Query)
- Zod validation
- React Hook Form
- Zustand (state management)
- Wouter (routing)

### Backend
- Node.js
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL (Neon compatible)
- Session-based authentication (express-session + passport)
- WebSocket (ws)
- Cloudinary (media storage)
- Anthropic Claude (AI recommendations)
- bcrypt (password hashing)

## Features

- **User Authentication**: Session-based auth with role-based access (Artist, Studio, Enthusiast)
- **Social Features**: Posts, likes, comments, follows, hashtags, sharing
- **Real-time Messaging**: WebSocket-powered chat with typing indicators, read receipts, and reactions
- **Stories**: 24-hour expiring stories with highlights (Instagram-like)
- **Portfolio Management**: Artist portfolio with drag-and-drop reordering
- **Studio System**: Studio approval requests and artist management
- **Job Board**: Job postings and application system
- **Live Streaming**: Real-time live events with comments and reactions
- **AI Recommendations**: Claude-powered tattoo design suggestions
- **Search & Discovery**: Advanced search across posts, users, and hashtags

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or Neon account)
- Cloudinary account

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

3. **Push database schema**
```bash
npm run db:push
```

4. **Seed the database with test data**
Seed the database with comprehensive test data (66+ users, 600+ posts, jobs, portfolios, messages, etc.):
```bash
npx tsx scripts/seed.ts
```

This will create:
- **66 users**: 1 admin, 15 studios, 30 artists, 20 enthusiasts
- **600+ posts and reels**: 10-15 posts + 5-10 reels per content creator
- **Portfolio items**: 10-20 items per artist
- **Job postings**: 3-10 jobs per studio
- **Messages**: 30 conversations with 10-30 messages each
- **Social interactions**: Follows, likes, comments across all users
- **Studio connections**: Artist-studio approval requests
- **Live stream events**: Scheduled/active/ended events
- **Notifications**: 10-30 notifications per user

**Test Credentials:**

Passwords are generated at seed time and printed to the console.
Check the seed output for the admin and demo account passwords
(seeded via `scripts/seed.ts`; see console output).

For local development, one-click Artist, Studio, and Enthusiast demo login buttons
can be enabled with `DEMO_MODE=true` and `VITE_DEMO_MODE=true`. Do not enable
demo mode on a public production deployment: demo accounts grant real access,
and the Admin demo account has full administrative privileges. Admin demo login
is available only in non-production builds.

5. **Start the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run check` | TypeScript type check |
| `npm run check:csp` | Verify CSP domain allowlist |
| `npm run db:push` | Push schema changes to database |
| `npm test` | Run Playwright end-to-end tests |
