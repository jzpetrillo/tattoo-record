# Inktagram - Tattoo Social Community Platform

A production-ready, full-stack tattoo social community platform with real-time messaging, live streaming, portfolio management, and AI-powered recommendations.

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
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
- Prisma ORM
- PostgreSQL (Neon compatible)
- JWT authentication
- WebSocket (ws)
- Cloudinary (media storage)
- OpenAI API (AI recommendations)
- bcrypt (password hashing)

## Features

- **User Authentication**: JWT-based auth with role-based access (Artist, Studio, Enthusiast)
- **Social Features**: Posts, likes, comments, follows, hashtags, sharing
- **Real-time Messaging**: WebSocket-powered chat with typing indicators, read receipts, and reactions
- **Stories**: 24-hour expiring stories with highlights (Instagram-like)
- **Portfolio Management**: Artist portfolio with drag-and-drop reordering
- **Studio System**: Studio approval requests and artist management
- **Job Board**: Job postings and application system
- **Live Streaming**: Real-time live events with comments and reactions
- **AI Recommendations**: OpenAI-powered tattoo design suggestions
- **Search & Discovery**: Advanced search across posts, users, and hashtags

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or Neon account)
- Cloudinary account
- OpenAI API key

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
Create a `.env` file in the root directory with the following:
```bash
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_session_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
OPENAI_API_KEY=your_openai_api_key
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
```
Admin:      admin@inktagram.com / Test1234!
Studio:     studio1@inktagram.com / Test1234!
Artist:     artist1@inktagram.com / Test1234!
Enthusiast: enthusiast1@inktagram.com / Test1234!
```

5. **Start the development server**
```bash
npm run dev
