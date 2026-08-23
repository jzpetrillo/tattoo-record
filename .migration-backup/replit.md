# Tattoo Record - Tattoo Social Community Platform

## Overview
Tattoo Record is a production-ready, full-stack tattoo social community platform for artists, studios, and enthusiasts. It facilitates connection, sharing of work, and collaboration through features like real-time messaging, live streaming, portfolio management, job postings, and AI-powered tattoo design recommendations. The platform aims to be a leading hub for the tattoo community, built with a modern monorepo architecture.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform features a minimalist black-and-white aesthetic, drawing inspiration from editorial magazine layouts with pure white backgrounds, black text, minimal borders, and sharp-edged elements. Navigation is consistent across devices, using a fixed left sidebar for desktop and a bottom navigation for mobile, primarily with icon-only designs. Profile pages are inspired by Instagram, including gradient-bordered avatars, dynamic statistics, and role-specific information.

### Technical Implementations
**Frontend**: Developed with React 18 and Vite, using Wouter for routing. State management is handled by Zustand for authentication, TanStack Query for server state, and local component state for UI. shadcn/ui, Radix UI, and Tailwind CSS form the component system. Form handling uses React Hook Form with Zod for validation.
**Backend**: An Express.js server in TypeScript manages API requests, utilizing Drizzle ORM for PostgreSQL interaction. Authentication is JWT-based with bcrypt hashing and Role-Based Access Control (RBAC) for `ARTIST`, `STUDIO`, and `ENTHUSIAST` roles. Multer and Cloudinary handle file uploads and media storage. Two WebSocket servers support real-time messaging and live streaming.
**Data Storage**: PostgreSQL serves as the primary data store, accessed via Drizzle ORM. The schema comprises over 22 tables for various entities, employing UUIDs for primary keys, timestamps, and soft deletes. JSONB columns are used for flexible data such as media arrays and location information. Composite and foreign key indexes optimize query performance.

### Feature Specifications
*   **Caption-Only Posts**: Supports text-only posts without media.
*   **Artist-Studio Connection System**: Facilitates affiliation requests and approvals between artists and studios.
*   **Profile Page Design**: Features an Instagram-inspired layout with three content tabs: Posts, Videos, and Portfolio (or "Tattoos" for enthusiasts). Includes role-specific details, verified badges, and optional banner images.
*   **Admin Verification System**: `ARTIST` and `STUDIO` roles require admin approval via an Admin Dashboard.
*   **Save/Bookmark System**: Users can save posts to custom collections, with a dedicated saved posts page.
*   **Trending Hashtags**: Displays real-time trending tattoo styles on the Explore page, powered by hashtag analytics.
*   **Featured Content**: Admin-curated posts are highlighted in a homepage carousel.
*   **Flash Sales**: Supports limited-time flash tattoo sales with countdown timers and special pricing.
*   **Discovery Filters**: Advanced filtering on the Explore page by user role, tattoo style, and location.
*   **Booking System**: A comprehensive appointment scheduling system with a defined status workflow (PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED).
*   **Feed Optimizations**: All feed queries include `isLiked` and `isSaved` flags using SQL EXISTS subqueries to prevent N+1 problems and improve performance.
*   **Portfolio Management CRUD**: Full create, edit, and delete functionality for portfolio items, including image uploads and metadata.
*   **Comprehensive Admin Module**: A fully functional admin dashboard provides modules for Overview, User Verification, User Management, Posts Management, Jobs Management, Flash Sales Management, and Bookings Overview.
*   **Security Hardening**: Implemented rate limiting, enhanced file upload validation, ownership checks for upload deletions, and robust admin/protected route guards. Password hashes are excluded from API responses.

## External Dependencies
*   **Cloudinary**: For media management (image/video uploads, storage, transformations, CDN).
*   **OpenAI API**: Provides AI-driven tattoo design recommendations.
*   **Neon Database**: Serverless PostgreSQL provider, used with `@neondatabase/serverless`.
*   **JWT (jsonwebtoken)**: For stateless authentication.
*   **Vite**: Frontend development and build tool.
*   **tsx**: TypeScript execution in development.
*   **esbuild**: Server bundling for production.