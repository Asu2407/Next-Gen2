# GEMINI.md — ResqNet AI (Next-Gen2)

## Overview
This project is **ResqNet AI**, a flood-response coordination engine built for
Assam flood relief operations, developed as a hackathon MVP. It coordinates
SOS intake, triage, rescue dispatch, tele-health, shelter routing, and
post-rescue accountability into one control-room dashboard.

All agents working in this workspace should treat this file as the single
source of truth for project context, shared data schemas, and conventions.

## MVP Scope — 8 Modules (build these)
1. Multilingual Voice-to-JSON Intake + Urgency Engine
2. Demographic Vulnerability Priority Matrix (DVS) — 3-tier triage
3. Water Zonation + Smart Rescue Asset Allocator (Leaflet)
4. Tele-Maternity Emergency Bridge (simplified/simulated call flow)
5. Shelter Navigation + Camp Inventory Tracker
6. System Audit (Overdue Alert + Feedback + Public Health Hazard Detection)
7. Missing Persons & Family Reunification Registry
8. SOS Deduplication & Clustering

## Future Scope — do NOT build yet, roadmap only
9. Offline-First Feature-Phone Intake (IVR/USSD)
10. Predictive Early-Warning Engine (CWC/IMD data ingestion)
11. Offline-First Field Sync
12. Post-Flood Damage & Compensation Module

## Shared Case JSON Schema
All modules must read/write cases using this exact schema so they interoperate:
```json
{
  "case_id": "string (uuid)",
  "raw_transcript": "string",
  "language_detected": "string",
  "gps_or_landmark": "string",
  "victim_count": "number",
  "emergency_categories": ["rising_water", "medical", "stranded"],
  "vulnerability_flags": ["pregnant", "infant", "elderly", "disabled", "dialysis"],
  "urgency_score": "number (1-5)",
  "tier": "Tier 1 | Tier 2 | Tier 3",
  "tele_health_status": "not_needed | connecting | connected | completed",
  "timestamp": "ISO8601 string"
}
```

## Tech Stack
- Backend: Python + FastAPI
- Frontend: React (Vite) + inline styles / CSS custom properties (see
  src/index.css "Hydro-Slate" design tokens) — not Tailwind, not a component
  library. Match the existing style pattern in each file rather than
  introducing a new one.
- Animation: framer-motion
- Map: Leaflet + react-leaflet + leaflet.heat (not Mapbox — the project
  moved off Mapbox/MapLibre/react-map-gl early; those packages should not
  be reintroduced as dependencies)
- Deployment config: VITE_API_BASE_URL env var (see .env.example) — empty
  in local dev (uses the Vite proxy in vite.config.js), set to the deployed
  backend URL in production (e.g. Vercel frontend + Render/Railway backend)
- LLM calls: entity extraction + urgency scoring via LLM API calls

## Agent Naming Conventions
When spawning agents in Agent Manager, use descriptive names tied to their
module, not generic labels:
- `Backend-Intake` → Module 1
- `Triage-Queue` → Module 2
- `Frontend-Map` → Module 3
- `CommsFlow` → Modules 4-5
- `Audit-System` → Module 6
- `Reunification` → Module 7
- `Dedup-Layer` → Module 8

## Development Guidelines
- Every module must accept/return the shared Case JSON Schema above — no
  module should invent its own case format.
- Tier assignment logic (Module 2) is the source of truth for tier — other
  modules read `tier` from the case object, they don't recompute it.
- Keep components modular: each module should be independently runnable/
  demoable even before final integration.
- Use `use context7` in prompts when writing code against Leaflet/react-leaflet,
  FastAPI, or other libraries to ensure current API usage.
- Populate every module with 4-8 mock/sample records so it's demoable
  standalone before integration.
- Verify each module's output against the shared schema before marking it done.

## Integration Target
All 8 MVP modules should ultimately share one case_id across their lifecycle
(intake → dedup → triage → dispatch → tele-health → shelter → audit) and be
navigable from one dashboard with tabs: Live Queue, Map, Camps, Missing
Persons, Audit.
## UI/UX Design System (all modules must follow this)

### Visual identity
- Dark control-room theme throughout: background #0b1220, panels
  rgba(15,20,35,0.9) with backdrop-blur.
- Tier colors are the ONLY semantic colors in the app — never introduce a
  new color for anything else: Tier 1 = #E24B4A (red), Tier 2 = #EF9F27
  (amber), Tier 3 = #639922 (green). Reuse these exact hexes everywhere
  (map pins, queue borders, badges, alerts) so tier meaning is instantly
  recognizable across every screen.
- Neutral text: #ddd primary, #999 secondary, #666 muted. Never pure white
  or pure black text.
- One accent action color only, used sparingly for primary buttons/CTAs —
  do not use tier colors for buttons, only for status/urgency.

### Typography & spacing
- Sans-serif throughout (system default is fine), sentence case everywhere
  (never Title Case or ALL CAPS in labels/buttons/headings).
- Consistent spacing scale: 4px/8px/12px/16px/24px — no arbitrary values
  like 13px or 22px margins.
- Font sizes: 11px captions/metadata, 13px body/secondary, 15px labels,
  20px section headers. Two weights only: 400 regular, 500 medium.

### Micro-interactions (this is what judges notice most)
- Every button has a hover state (subtle background lightening) and an
  active/pressed state (slight scale-down, e.g. transform: scale(0.98)).
- Tier 1 elements pulse (already specified for map pins — apply the same
  pulse to Tier 1 rows in the queue panel and any Tier 1 alert badges).
- Panel transitions always animate (slide/fade via framer-motion) —
  never an instant show/hide anywhere in the app.
- Numbers that update live (queue counts, case counts) should animate
  the transition (count up/down) rather than snapping instantly.

### Required states — every module must handle all three
- Loading state: show a skeleton/spinner, never a blank screen while
  fetching data.
- Empty state: if a queue/camp list/audit log has zero items, show a
  clear, friendly message ("No active cases right now"), never an empty
  blank panel.
- Error state: if an API call fails, show a visible, styled error message
  in the panel itself (not just a browser console error) — e.g. "Couldn't
  load the queue. Retry" with a retry button.

### Accessibility
- All interactive elements (buttons, markers) must have a visible focus
  state for keyboard navigation.
- Color is never the only signal — tier badges must show the tier NAME as
  text too, not just a color dot, for colorblind accessibility.
- Minimum tap target size 36px for any clickable element (important for
  demoing on a judge's phone/tablet if they try it themselves).

### Responsiveness
- The dashboard must remain usable at tablet width (768px) at minimum —
  side panels should shrink or become a slide-up drawer from the bottom
  rather than overflow off-screen.
- Test at browser width 1024px before considering a module "done."

### Consistency rule
- Every new module's UI must reuse the same button style, panel style,
  and card style already established (see btnStyle/panelStyle patterns
  in App.jsx) — do not introduce a new button or card style per module.