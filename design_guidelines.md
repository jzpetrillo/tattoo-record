# Inktagram Design Guidelines

## Design Approach
**Reference-Based**: Instagram social patterns + nestmag.online editorial minimalism. This creates a distinctive tattoo community platform that feels both familiar and elevated through editorial restraint.

## Core Design Principles
1. **Editorial Purity**: Embrace negative space and stark black-on-white contrast
2. **Sharp Geometry**: Favor clean edges over rounded corners
3. **Grid Discipline**: Strict alignment and proportional spacing
4. **Visual Hierarchy**: Typography and scale create depth, not color

## Color Palette

**Monochrome Foundation**
- Background: Pure white (0 0% 100%)
- Primary Text: True black (0 0% 0%)
- Secondary Text: Dark gray (0 0% 20%)
- Tertiary/Meta: Medium gray (0 0% 50%)
- Borders: Light gray (0 0% 90%)
- Hover States: Subtle gray (0 0% 96%)

**Accent Usage** (Sparingly)
- Link Blue: 215 70% 50% (Instagram-inspired, used only for actionable links)
- Success: 142 71% 45% (follows, likes)
- Minimal, strategic application only

## Typography

**Font Stack**: System fonts for performance
- Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Monospace: SF Mono, Monaco, "Courier New" (for usernames/handles)

**Type Scale**
- Display (H1): 3.5rem / 4rem (56px/64px), font-weight: 300, letter-spacing: -0.02em
- H2: 2rem / 2.5rem, font-weight: 400
- H3: 1.25rem / 1.75rem, font-weight: 600
- Body: 0.9375rem / 1.5rem (15px/24px), font-weight: 400
- Small/Meta: 0.8125rem / 1.125rem (13px/18px), font-weight: 400
- Tiny: 0.6875rem / 1rem (11px/16px), font-weight: 500, text-transform: uppercase, letter-spacing: 0.05em

## Layout System

**Spacing Primitives**: Tailwind units of 1, 2, 4, 6, 8, 12, 16, 24
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-24
- Grid gaps: gap-1 (tight grids), gap-4 (card grids), gap-8 (section spacing)

**Container Strategy**
- Max-width: 1280px (max-w-7xl) for main content
- Profile/Feed: max-w-4xl (896px) centered
- Grid Layouts: 3 columns desktop (grid-cols-3), 2 tablet, 1 mobile

## Component Library

### Navigation
**Top Bar** (sticky): White bg, 1px bottom border, h-16, flex justify-between
- Logo (left): Black wordmark, font-weight: 700
- Search bar (center): Rounded-sm, gray border, w-80
- Actions (right): Icon buttons (notifications, profile), minimal padding

### Hero Section
Full-width banner image (16:9 aspect ratio), overlay with centered content
- Heading: Display typography, white text with subtle drop shadow
- Subheading: Body text, max-w-2xl
- CTA: Single primary button (rounded-sm, black bg, white text, px-8 py-3)

### Profile Components

**Profile Header**
- Banner: 1200x400px image, full-width
- Avatar: 150x150px circle, positioned -75px from bottom of banner, 4px white border
- Info Section: Centered below avatar, py-8
  - Username: H2, black
  - Bio: Body text, max-w-2xl, centered
  - Meta: Follower count, following count, posts count (inline, gap-6)
  - Social Links: Icon row, gap-4, gray icons

**Artist Details Card** (below profile header)
- Grid overlay pattern background (subtle, 0 0% 98%)
- Sections: Specialties, Styles, Location, Contact
- Bordered container, p-8, rounded-sm

### Feed/Grid Layouts

**Image Grid** (Explore, Profile Posts)
- 3 columns desktop, aspect-square images
- gap-1 (minimal spacing for editorial density)
- Hover: Subtle overlay showing likes/comments count

**Post Card** (Feed view)
- Header: Avatar + Username + timestamp, py-3 px-4
- Image: Full-width, aspect-auto
- Actions: Like, Comment, Share icons (line icons, 24px), px-4 py-2
- Engagement: Like count, comment preview, px-4 pb-4
- Border: 1px all around, rounded-sm

### Forms & Inputs
- Text inputs: 1px border, rounded-sm, px-4 py-2.5, focus:border-black
- Buttons: Minimal radius (rounded-sm), black primary, white outline secondary
- Dropdowns: Match input styling, native appearance with custom arrow

### Modals & Overlays
- Backdrop: rgba(0, 0, 0, 0.4)
- Panel: White, max-w-2xl, rounded-sm, p-8
- Close: X icon, top-right, 24px

## Images

### Hero Section
**Featured Banner**: 1920x600px editorial photography showcasing tattoo artistry
- Style: High-contrast black & white or desaturated color
- Composition: Centered subject, generous negative space
- Placement: Top of homepage, above featured artists

### Profile Banners
**Artist Header Images**: 1200x400px artist work showcase or studio shots
- Clean backgrounds preferred
- Can be color or B&W

### Grid Content
**Post Images**: Square format (1:1), minimum 800x800px
- Tattoo work, process shots, sketches
- Grid displays at 300-400px per image
- Full size on click/modal

### Placeholder Strategy
Use subtle gray background (0 0% 96%) with centered icon for missing images

## Accessibility & Polish

- Focus states: 2px offset outline in black
- Image alt text: Required for all tattoo images
- Minimum touch targets: 44x44px for all interactive elements
- Contrast ratio: Maintain 7:1 for body text, 4.5:1 minimum for UI elements

## Unique Features

**Grid Pattern Overlay** (Artist profiles)
- Subtle 20px grid SVG pattern, opacity: 0.05, over background sections
- Creates editorial sophistication without color

**Typography-First Cards**
- Feature artist bios with large pull quotes (2rem, font-weight: 300)
- Minimal decoration, let content breathe

**Minimal Interactions**
- No animations except subtle opacity changes (0.7 on hover)
- Instant state changes, no transitions >150ms