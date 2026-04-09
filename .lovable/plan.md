

# Journal Management System (JMS) — Implementation Plan

## Overview

Build a bilingual (Arabic/English) academic journal management platform using React + Tailwind + Supabase (via Lovable Cloud). The spec calls for Node.js/Express, but we'll replace that with Supabase (auth, database, edge functions, storage) which gives us the same capabilities without a custom backend.

## Adaptation: Node.js/Express to Supabase

| Spec says | We'll use |
|-----------|-----------|
| Node.js + Express API | Supabase client SDK + Edge Functions |
| PostgreSQL + Drizzle ORM | Supabase PostgreSQL + migrations |
| Google SSO (OAuth 2.0) | Supabase Auth with Google provider |
| Docker per-journal | Supabase multi-tenant via `journals` table |

## Implementation Phases

Given the size of this system, I'll build it incrementally, starting with **Phase 1 (MVP)** as defined in the spec.

### Step 1: Database Schema

Create all 6 table groups via migrations:

- **Group 1** — `journals`, `profiles`, `journal_members`, `user_roles`
- **Group 2** — `papers`, `paper_roles`, `paper_stage_history`
- **Group 3** — `committees`, `committee_members`, `committee_papers`, `committee_votes`
- **Group 4** — `workflow_stages`, `stage_actions`, `workflow_forms`, `form_fields`, `paper_form_responses`
- **Group 5** — `threads`, `messages`, `notifications`, `notification_templates`
- **Group 6** — `financial_records`, `submission_windows`, `blacklist`

RLS policies on all tables. Role checking via a `has_role` security definer function.

### Step 2: Authentication

- Supabase Auth with email/password (Google SSO can be enabled later in Cloud settings)
- Profile auto-creation trigger on signup
- Protected routes with auth guard component

### Step 3: Bilingual Infrastructure

- i18n setup with Arabic (RTL) and English (LTR) support
- Language switcher in the header
- All UI strings in translation files
- RTL-aware layout using Tailwind's `rtl:` variants

### Step 4: Core Layout and Navigation

- Sidebar navigation with role-based menu items
- Top bar with user info, language toggle, notifications bell
- Responsive layout (mobile sidebar drawer)

### Step 5: Researcher Portal (MVP)

- Paper submission form with file upload (Supabase Storage)
- Submission list with status tracking
- Paper detail view with stage history timeline
- Respond to revision requests

### Step 6: Editor Dashboard (MVP)

- All papers overview with filters (status, stage, date)
- Paper detail with stage management
- Assign reviewers and committees
- Editor-to-author messaging thread

### Step 7: Committee System (MVP)

- Create/manage committees (CRUD)
- Assign members, set head, configure voting rules
- Refer papers to committees
- Vote recording and decision logging
- Committee member portal view

### Step 8: Communication

- Threaded messaging per paper
- Editor ↔ Author channel
- Internal committee threads
- In-app notification system

---

## Technical Details

- **State management**: React Query for server state, React context for auth/language
- **Routing**: React Router with role-based route guards
- **File uploads**: Supabase Storage with signed URLs
- **Forms**: React Hook Form + Zod validation
- **UI**: shadcn/ui components (already installed), extended with RTL support
- **Tables/Lists**: TanStack Table for data-heavy views with sorting/filtering

## What I'll Build First

I'll start with **Steps 1-4** (database, auth, i18n, layout) as the foundation, then proceed to the portals. This gives us a working skeleton to build features on top of.

Shall I proceed?

