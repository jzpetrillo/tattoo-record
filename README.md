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
