---
name: AI recommendations service migration
description: Tattoo recommendation API migrated from dead OpenAI service to Anthropic Claude
---

**Location:** `server/services/ai/recommendations.ts`

**Pattern used:** `completeStructured<TattooRecommendation>({ prompt, system, tool })` from `server/services/ai/index.ts`.

**Route behaviour:**
- Returns 503 with `{ message: "AI recommendations are temporarily unavailable..." }` on any failure
- Always logs errors with `console.error("[ai-recs]", error)`

**Client side (`ai-recommendations.tsx`):**
- `apiRequest` throws `Error("503: {...json...}")` on non-2xx
- Client parses the inner JSON with a regex match on `\{[\s\S]*\}` to extract the friendly message

**Why:** Old `./services/openai` service relied on OPENAI_API_KEY which was never set; requests always 400'd with the key-not-configured error exposed raw to the user.
