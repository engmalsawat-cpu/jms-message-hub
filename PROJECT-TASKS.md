# JMS — Project Tasks & Milestones / مهام ومراحل المشروع

> **لوحة المتابعة المشتركة.** هذا الملف هو **المكان الوحيد** اللي نتابع منه شنو خلصنا
> وشنو باقي. أي شي نتفق نسويه، نضيفه هنا. أول ما نخلّص مهمة، نعلّمها `[x]`.
>
> **Shared tracking board.** This file is the single place we track what's done and
> what's left. Anything we agree to do gets added here. When a task is finished,
> mark it `[x]`.
>
> _Last updated: 2026-06-19 (M4 done — all four milestones built; ready for heavy testing)_

---

## How to use this file / طريقة الاستخدام

- `[ ]` = لم يبدأ / not started
- `[~]` = جاري العمل / in progress
- `[x]` = منجز / done
- أي مهمة جديدة نتفق عليها → نضيفها تحت **"Backlog / مهام متفق عليها"**.
- عند الإنجاز: نعلّم المربع، ونحدّث تاريخ "Last updated" أعلى الملف.

---

## Milestones overview / نظرة عامة على المراحل

| # | Milestone / المرحلة | Status / الحالة | Effort / الجهد |
|---|---|---|---|
| 1 | Make it ours — Centers + Task Inbox / خليه لنا | `[x]` Done | 3–4 days |
| 2 | Center walls / جدران المراكز | `[~]` Built — awaiting DB apply | 3–5 days |
| 3 | Close the gaps — voting + stages / سد الفجوات | `[~]` Built; voting migration awaiting DB apply | 5–7 days |
| 4 | Fit your process / مطابقة سير العمل | `[x]` Done | 2–3 days |

---

## Milestone 1 — Make it ours / خليه لنا
**Goal:** Rename Journals→Centers + add a Task Inbox home screen. (3–4 days)

- [x] Rename "Journals" → "Centers" in screen text (Arabic + English) — keep DB table name as-is
- [x] Build Task Inbox home screen ("صندوق المهام") — landing page after login
  - [x] Show my pending review requests
  - [x] Show papers I'm assigned to (= reviews I accepted, awaiting my report)
  - [x] Show my papers needing revision
  - [x] Show unread notifications

## Milestone 2 — Center walls / جدران المراكز
**Goal:** Each center only sees its own data; HQ admin sees everything. (3–5 days)

- [x] Activate per-center membership (table exists but unused) — each user gets a list of centers _(via backfill in migration)_
- [x] Rewrite DB security rules so a user only sees items from their centers _(RLS rewrite, 19 tables)_
- [x] Add HQ admin capability (sees all centers) _(new `hq_admin` role)_
- [x] Make all lists/pages show the combined view of the user's centers _(no UI change needed — pages already RLS-driven)_
- [ ] (Optional, later) "Filter by center" control

## Milestone 3 — Close the gaps / سد الفجوات
**Goal:** Working committee voting + real stage tracking. (5–7 days)

- [x] Committee voting:
  - [x] Assign a paper to a committee
  - [x] Members cast votes with justification (4 options: approve / approve-with-revisions / reject / abstain)
  - [x] App tallies against the committee rule (majority / unanimous / minimum votes); abstain counts against passing
  - [x] Record the decision
- [x] Real stage tracking:
  - [x] Moving a paper actually sets its current stage
  - [x] Write an audit entry on each move

## Milestone 4 — Fit your process / مطابقة سير العمل
**Goal:** Configure stages + map roles to the real review→committee→decision flow. (2–3 days)

- [x] Configure stages to match the real review → committee → decision flow _("Load standard stages" button seeds a default template into an empty center; owner then renames/reorders. Stage engine already wired in M3.)_
- [x] Map our roles onto JMS's roles (relabeling + access checks) _(all 7 role labels already exist AR+EN; access checks verified. Owner decision: managing_editor does NOT manage centers/committees/stages — left to admin/editor_in_chief/hq_admin, matching the DB.)_

---

## Backlog — agreed new tasks / مهام متفق عليها (تُضاف هنا)

> أي مهمة جديدة نتفق عليها نضيفها هنا مع التاريخ.

- [x] Create this shared task & milestone tracker file — _2026-06-19_
- [x] Set up Plan → Build → QA workflow: 3 subagents (`planner`/Opus, `builder`/Sonnet, `qa`/Opus) + automatic pre-commit QA gate + `CLAUDE.md` — _2026-06-19_
- [x] Planner produces two plans: a simple owner plan + a detailed execution plan — _2026-06-19_

---

## Done log / سجل المنجز

> ملخص سريع لكل شي خلصناه (للرجوع السريع).

- **2026-06-19** — Added `PROJECT-TASKS.md` (this shared tracking board).
- **2026-06-19** — Added plan/build/QA subagents (Opus/Sonnet/Opus), automatic pre-commit QA gate (`.claude/hooks/qa-precommit.mjs`), and `CLAUDE.md` workflow doc.
- **2026-06-19** — Planner now outputs two plans (owner + execution).
- **2026-06-19** — Completed Milestone 1: renamed Journals→Centers (AR+EN display text) and added the Task Inbox (`صندوق المهام`) landing page. QA: PASS (mechanical lint/test/build could not run in the build container — deps not installable there; re-run locally).
- **2026-06-19** — Built Milestone 2 (Center walls): two Supabase migrations — `hq_admin` role + full RLS rewrite (membership-gated, 19 tables) with auto-backfill of `journal_members`. QA: PASS (SQL reviewed, not executed). **Applied to live Supabase by owner; owner is now hq_admin.** Three role test accounts (committee/editor/managing) added to journals to avoid lockout.
- **2026-06-19** — M3 Feature 2 (Real stage tracking): the "Change Status" dialog now also moves a paper to a real configured stage (`current_stage_id`) and logs it to `paper_stage_history`. QA: PASS (mechanical checks couldn't run in container). No DB change needed. Committee voting (Feature 1) is next.
- **2026-06-19** — Restored HQ/Admin access: fixed the paper RLS recursion error, gave the admin test login the `hq_admin` role, and updated HQ role checks in the UI.
- **2026-06-19** — M3 Feature 1 (Committee voting): assign a paper to a committee, members vote with justification (4 options: approve / approve-with-revisions / reject / abstain), live tally per the committee rule (majority/unanimous + min votes; abstain counts against passing), editor records the decision (writes a stage-history entry). Member tally uses a SECURITY DEFINER RPC so RLS doesn't hide colleagues' counts. QA: PASS (first pass FAIL caught an RLS tally bug — fixed; unit tests added for tally). **New migration `20260619230000_committee_voting.sql` must be applied to live Supabase** (vote UPDATE policy + tally RPC). _Applied by Lovable._
- **2026-06-19** — M4 (Fit your process): added a "Load standard stages" button (`src/lib/defaultStages.ts` template + unit test) so an empty center seeds a default review→committee→decision→publication flow in one click (owner edits after). Confirmed all 7 role labels + access are correct; per owner decision, managing_editor does NOT manage centers/committees/stages (kept to admin/editor_in_chief/hq_admin, matching the DB — no role change). QA: PASS. No DB migration. **All four milestones now built.**
