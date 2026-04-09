# Dignity Leads CRM - WhatsApp Follow-up System Design

## Overview

Upgrade the existing Dignity Leads CRM to include a template management + one-click WhatsApp send system, with a smart follow-up dashboard based on the "Golden 7 Days" methodology.

## Problem

- Manually sending WhatsApp self-introductions and project materials to each lead
- Forgetting to follow up or inconsistent message content
- Data stuck in localStorage, can't sync across devices
- Booth events generate many leads at once, manual follow-up is too slow

## Who

- Primary user: Real estate agent (Dignity Real Estate, Malaysia)
- Future: Team members
- Leads: Property buyers from booth events and other sources

## Core User Flow

1. Open CRM → Dashboard shows today's follow-up tasks (Day 0/1/3/7)
2. Click a lead → System auto-recommends the right template based on lead age
3. Template pre-fills customer name, project details
4. Click "Send WhatsApp" → Jumps to WhatsApp with message pre-filled
5. Click "Copy Image" → Image copied to clipboard, paste in WhatsApp manually
6. Mark as completed → Lead moves to next follow-up stage

## Non-Goals

- No auto-sending (no WhatsApp Business API)
- No chatbot / auto-reply
- No mobile app (web PWA is sufficient)
- No user authentication in phase 1

---

## Golden 7 Days Follow-up Schedule

| Day | WhatsApp Action | Call Action |
|-----|----------------|-------------|
| Day 0 | Self-intro + project summary + materials | - |
| Day 1 | Photo + selling points + question | 6pm-8pm second call |
| Day 3 | WhatsApp + CTA | Call back |
| Day 7 | WhatsApp + filter | Call back + filter (is buyer serious?) |

## Message Structure

Each WhatsApp message follows this format:
1. Greeting with customer name
2. Project image (manual paste)
3. Selling points / what customer gets
4. Agent name + phone number
5. Engaging question (to prompt reply)

---

## Database Design (Supabase)

### Existing tables (migrate from localStorage)

```sql
-- Events / Booth activities
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads / Customers
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  project_interest TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing', 'closed', 'dead')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timeline / Activity log
CREATE TABLE timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'status_change', 'whatsapp', 'call', 'system')),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New tables

```sql
-- Property projects
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  selling_points JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message templates (per project + day)
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL CHECK (day_type IN ('day0', 'day1', 'day3', 'day7')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Key relationships

- One **project** has multiple **templates** (one per day type)
- One **lead** has one **event** source and a **project_interest** linking to a project
- System calculates day number from `lead.created_at` to auto-recommend templates

---

## Navigation Structure

```
Today | Customers | Events | Projects | Settings
(今日)  (客户)     (展会)   (项目)     (设置)
```

## Page Designs

### 1. Today (Dashboard)

- Groups leads by Day 0 / Day 1 / Day 3 / Day 7
- Each lead shows: name, project, recommended template preview
- Action buttons: Send WhatsApp, Call, Mark Complete
- Summary stats at bottom

### 2. Projects (New)

- List all property projects with template completion status
- Project detail page:
  - Project images gallery (upload/manage)
  - Selling points list
  - Day 0/1/3/7 templates (create/edit)

### 3. Lead Detail (Enhanced)

- Auto-recommend template based on lead age
- Template preview with variables filled in
- "Copy Image" button for clipboard
- "Send WhatsApp" button (wa.me link)
- Dropdown to select other templates
- Follow-up completion tracking (Day 0 ✅ / Day 1 ✅ / Day 3 ❌)

### 4. Booth Batch Mode

- After a booth event, list all new leads
- Quick send mode: one-click per lead without entering detail page

---

## Technical Details

### Tech Stack (unchanged + additions)

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS 4
- **State**: Zustand (keep for UI state) + Supabase (data persistence)
- **Backend**: Supabase free tier (PostgreSQL + Storage + Realtime)
- **Hosting**: Vercel free tier
- **Images**: Supabase Storage (1GB free)

### Data Migration

1. On first load, detect localStorage data
2. Prompt user: "Found local data, migrate to cloud?"
3. One-click migration to Supabase
4. Confirm success, then clear localStorage

### Image Handling

- Upload images to Supabase Storage under `/projects/{project_id}/`
- Display in project detail and template preview
- "Copy Image" button uses Clipboard API to copy to clipboard
- User pastes manually in WhatsApp

### WhatsApp Integration

- Keep existing `wa.me` link approach (zero cost)
- Template variables: `{name}`, `{project}`, `{venue}`, `{agent_name}`, `{agent_phone}`
- Pre-fill message text, open in new tab/app

### Notifications

- Browser Notification API (free)
- Trigger on CRM open: check today's pending follow-ups
- No backend push service needed

### Auth

- Phase 1: No auth (single user)
- Phase 2: Supabase Auth when team access needed

---

## Decision Log

| # | Decision | Alternatives | Reason |
|---|----------|-------------|--------|
| 1 | Upgrade existing Vite+React project | Rewrite / Migrate to Next.js | Good code structure, rewrite wastes time |
| 2 | Supabase free tier as backend | Firebase / PlanetScale / localStorage | Free, PostgreSQL, built-in Storage, user has account |
| 3 | No WhatsApp Business API | Twilio / WATI / Official API | User requires zero cost, wa.me links sufficient |
| 4 | Templates by project + day | Unified templates / tag-based | Matches Golden 7 Days flow, each project has different selling points |
| 5 | "Copy to clipboard" for images | Image links / multi-step download | Closest to manual send experience, zero API cost |
| 6 | Dashboard as "Today's Tasks" | Keep stats / Calendar view | Drives action, solves forgetting-to-follow-up pain point |
| 7 | Browser Notification for reminders | Email / SMS / Push | Free, no extra services needed |
| 8 | Single user first, no login | Add Auth from start | YAGNI, add when team access is needed |
| 9 | Add "Projects" tab to navigation | Templates in settings / separate page | Projects are high-frequency, need dedicated entry |
| 10 | One-click localStorage migration | Manual re-entry / no migration | Preserve existing data, reduce friction |

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Supabase free tier limits | Data >500MB or images >1GB | Current data volume is tiny, won't hit limits soon |
| wa.me can't auto-send images | User must manually paste images | "Copy Image" button reduces effort |
| Browser notifications may be disabled | No reminders | Guide user to enable on first use; Dashboard itself is a reminder |
| localStorage migration data loss | Old data lost | Keep backup before migration, confirm before clearing |
