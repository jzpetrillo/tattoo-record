# Inktagram - Tattoo Social Community Platform

## Overview

Inktagram is a production-ready, full-stack tattoo social community platform that enables artists, studios, and enthusiasts to connect, share work, and collaborate. The platform features real-time messaging, live streaming capabilities, portfolio management, job postings, and AI-powered tattoo design recommendations. Built as a modern monorepo, it combines a React-based frontend with an Express backend, utilizing PostgreSQL for data persistence and WebSocket for real-time features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Routing**: The application uses a single-page architecture with Wouter for client-side routing. The frontend is built with React 18 and Vite as the build tool, providing fast development and optimized production builds.

**State Management**: The application uses a hybrid state management approach:
- Zustand with persistence middleware handles authentication state and user sessions
- TanStack Query (React Query) manages server state, caching, and data synchronization
- Local component state for UI-specific concerns

**UI Component System**: Built on shadcn/ui components with Radix UI primitives, providing accessible, customizable components styled with Tailwind CSS. The design system uses CSS variables for theming with a dark-mode-first approach.

**Form Handling**: React Hook Form combined with Zod for schema validation provides type-safe form management with minimal re-renders.

**Real-time Communication**: WebSocket connections are established for messaging and live streaming features, with automatic reconnection handling and heartbeat mechanisms.

### Backend Architecture

**Server Framework**: Express.js with TypeScript provides the HTTP API layer. The server uses middleware for JSON parsing, request logging, and body capture for debugging.

**Database Layer**: Drizzle ORM interfaces with PostgreSQL (Neon-compatible) using a connection pool from @neondatabase/serverless. The database schema defines 22+ tables covering users, posts, messages, stories, portfolios, jobs, and live streaming.

**Authentication & Authorization**: JWT-based authentication with bcrypt password hashing. The `requireAuth` middleware validates tokens and attaches user context to requests. Role-based access control (RBAC) supports three user types: ARTIST, STUDIO, and ENTHUSIAST, enforced through the `requireRole` middleware.

**File Upload & Storage**: Multer handles multipart form data uploads, while Cloudinary manages media storage and delivery. Media is organized into folders (posts, stories, portfolio) with automatic transformations and CDN distribution.

**WebSocket Architecture**: Two separate WebSocket servers run on the same HTTP server:
- `/ws` path handles real-time messaging with typing indicators, read receipts, and message reactions
- `/ws/live` path manages live streaming events with viewer tracking and real-time comments
Both implement heartbeat mechanisms for connection health monitoring.

**Background Jobs**: A scheduler runs periodic cleanup tasks, such as removing expired 24-hour stories and their associated media from Cloudinary.

**API Design**: RESTful endpoints follow resource-based naming conventions with standard HTTP methods. Routes are organized by domain (auth, posts, messages, livestream, etc.) in the routes registry.

### Data Storage Solutions

**Primary Database**: PostgreSQL serves as the primary data store with Drizzle ORM providing type-safe queries. The schema uses UUIDs for primary keys, timestamps for audit trails, and soft deletes for data retention.

**Schema Organization**: The database is organized into logical domains:
- Core entities (users, profiles)
- Social features (posts, comments, likes, follows, hashtags)
- Messaging (conversations, messages, participants)
- Stories & highlights
- Professional features (portfolios, studio approvals, jobs)
- Live streaming (events, participants, comments, reactions)

**Indexes**: Composite indexes are applied to join tables (post_likes, follows, conversation_participants) for efficient querying of relationships. Individual indexes on foreign keys optimize lookups.

**JSON Fields**: JSONB columns store flexible data structures like media arrays (with publicId, url, type, dimensions), location data (city, country, coordinates), user links, and social handles.

### External Dependencies

**Cloudinary**: Media management service handling image and video uploads, storage, transformations, and CDN delivery. Configured with cloud_name, api_key, and api_secret. Media is organized in an "inktagram" folder structure.

**OpenAI API**: Powers the AI recommendation system for tattoo designs. Uses GPT models to generate personalized suggestions based on user preferences (style, placement, size, description). Returns structured recommendations including styles, placement options, colors, descriptions, and aftercare tips.

**Neon Database**: Serverless PostgreSQL provider with WebSocket support for serverless environments. Uses connection pooling via @neondatabase/serverless package with ws for WebSocket protocol.

**Authentication**: JWT (jsonwebtoken library) for stateless authentication with a configurable secret. Tokens include user ID and are verified on protected routes.

**Development Tools**: 
- Vite for frontend development with HMR and Replit-specific plugins (cartographer, dev-banner, runtime error overlay)
- tsx for TypeScript execution in development
- esbuild for server bundling in production