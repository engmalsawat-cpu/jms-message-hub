# JMS Build Plan — Building Our System On Top of JMS

> **Plain-language plan.** Written for a non-technical reader. It captures what we
> verified in the JMS code, the decisions we've locked, and a costed, step-by-step
> build plan. Read `SESSION-HANDOFF.md` first for background.
>
> _Created: 2026-06-19_

---

## 1. The big picture (one paragraph)

We are **building on the existing JMS app** (`engmalsawat-cpu/jms-message-hub`) instead
of rebuilding from scratch. JMS is already real, working software for managing academic
papers (submission → review → decision), with a working reviewer system, messaging, and a
real database. We keep its existing **Supabase email/password login**. On top of it we will:
**(1)** rename "Journals" to "Centers", **(2)** add a **Task Inbox** home screen, **(3)** put
up **walls between centers** so each center only sees its own data, and **(4)** finish the two
parts that are not really built yet (committee voting and real stage tracking).

---

## 2. What we verified in the JMS code (the honest scorecard)

We read the database setup, the workflow manager, the committees page, the reviewer
screens, and the paper-detail page, and checked how every page gets its data.

**Bottom line: JMS is real software, not a demo.** Almost every page talks to a real
database. But two things are **not** built yet.

| Area | Status | Reality |
|---|---|---|
| Database / security setup | ✅ Real | All core tables exist with security rules: centers (journals), papers, committees, messages, notifications, financials, blacklist, profiles + CV tables, and a full reviewer-scoring system. |
| Reviewer flow | ✅ Real & solid | Editor sends a review request → reviewer accepts/declines → reviewer files a report (scores per criterion, recommendation, public + confidential comments) → editor sees all reports together. The most finished part of the app. |
| Messaging | ✅ Real | Editor↔author message threads work. |
| Most pages | ✅ Real | Dashboard, Papers, MyPapers, SubmitPaper (with file upload), Committees, Financial, Blacklist, Users, Operations, Profile, Notifications all read/write real data. Only `Index.tsx` is an unused placeholder. |
| Login | ✅ Real (Supabase) | Email/password via Supabase — exactly what we're keeping. |
| Workflow "engine" | ⚠️ Half-real / decorative | You can create, rename, reorder, delete a list of named stages. **But papers don't actually move through them.** Papers move through a *hardcoded* 8-step status list. The configurable stages are shown for display only. |
| Committee voting | ❌ Stub | The tables exist but **no screen uses them.** You can create a committee and add members — that's all. You cannot assign a paper to a committee, cast a vote, or record a decision anywhere. |

**Two surprises** (the earlier handoff overstated these):

1. There is **no transition/forms engine** — the workflow is a hardcoded status flow with a
   cosmetic stage list on top.
2. **Committee voting is not wired** at all — the biggest "looks done but isn't" gap.

**Also:** the `jms/` folder inside *this* repo (Research-Navigator) is **only design docs**
(a more ambitious paper plan: Active Directory login, pricing/contracts, official letters,
multi-track workflows). It is **not** the working app and should not be confused with it.
The working app is `jms-message-hub`.

---

## 3. One company or one-fits-all?

JMS is built for **one organization that runs several centers inside it** — not a
"sign up your own company" product. In plain terms: **multi-center, single-company.**
That fits the Darah setup (one organization, many research centers).

- Every key table is tagged with a center (`journal_id`), so the system already separates
  data by center.
- **But** there is no "company" layer above centers, roles are currently global (an admin is
  admin everywhere), and today's security rules let any logged-in user see *every* center's
  data. Closing that gap is Milestone 2 below.

---

## 4. Decisions locked

1. **Build on JMS**, not from scratch.
2. **Keep Supabase email/password login.** Active Directory login = later/optional, not now.
3. **Rename "Journals" → "Centers"** in the screen text (Arabic + English). Keep the database
   table named internally as-is for now (a full database rename is more risk for no visible gain).
4. **Add a Task Inbox** as the home screen ("صندوق المهام").
5. **Put walls between centers** so each center only sees its own data — this is a **must-have**.
6. Communicate in **simple language**; always give a recommendation, not just options.

### 4a. How center access works (locked detail)

- **A person can belong to one *or more* centers.** Membership is simply a list of centers.
- **They see everything from all their centers combined, in one place** — no "switch center"
  button. If you're in 2 centers, your inbox and lists show both centers' items together.
- **An HQ / Darah admin sees every center, all combined in one place.**
- Same rule for everyone — a reviewer or writer working across 2 centers sees all of their
  work in one unified view.
- The walls come from the database security rules: *"you can see an item only if it belongs to
  a center you are a member of"* — and HQ admins bypass that to see everything.
- Nice side effect: because it's a **combined view, not a switcher**, it's slightly simpler to
  build (no extra "current center" menu). An optional "filter by center" can be added later.

---

## 5. The costed plan

Effort is in **working days** (one developer building it).

| Milestone | What you get | Effort |
|---|---|---|
| **1 — Make it ours** | Rename Journals→Centers (screen text), Task Inbox landing page | **3–4 days** |
| **2 — Center walls** | Membership = list of centers per person; combined view of all your centers; HQ sees all; security rules enforce the walls | **3–5 days** |
| **3 — Close the gaps** | Working committee voting + connect stages to real paper progress | **5–7 days** |
| **4 — Fit your process** | Configure stages to your real flow, map roles | **2–3 days** |

- **First demo (Milestone 1 only): 3–4 days.**
- **Complete, walled-off system (all four): ~13–19 working days.**

### Why this order

- **Milestone 1 first** delivers your two visible requests (Centers + Inbox) fast, on code
  that already works. The inbox only ever shows *your own* tasks, so it's safe to build before
  the walls — and once the walls go up, the inbox automatically respects them with no rework.
- **Milestone 2 (walls) before Milestone 3** because the walls are the foundation: every later
  feature should sit on top of correct security, or we'd have to re-check each feature later.
- **Milestone 3** fixes the two real gaps (voting + real stage tracking) so nothing looks
  half-built in a demo.
- **Milestone 4** is mostly configuration once the engine is connected.

---

## 6. Milestone details

### Milestone 1 — Make it ours (3–4 days)
- **Rename Journals → Centers (0.5 day):** change the displayed Arabic + English labels and
  menu items. Database table keeps its internal name.
- **Task Inbox home screen (2–3 days):** a new landing page after login that answers
  *"what's waiting on me?"* — my pending review requests, papers I'm assigned to, my papers
  needing revision, and unread notifications. All this data already exists; it's one new
  screen, no new backend.

### Milestone 2 — Center walls (3–5 days)
- Activate per-center **membership** (the table already exists but is unused): each user gets a
  list of centers.
- Rewrite the database **security rules** so a user only sees items from centers they belong to.
- Add an **HQ admin** capability that sees all centers.
- Make all lists/pages show the **combined view** of the user's centers.
- (Optional later: a "filter by center" control.)

### Milestone 3 — Close the gaps (5–7 days)
- **Committee voting (3–4 days):** assign a paper to a committee → members cast votes with
  justification → app tallies against the committee's rule (majority / unanimous / minimum
  votes) and records the decision. Tables exist; this is the screens + tally logic.
- **Real stage tracking (2–3 days):** make moving a paper actually set its current stage and
  write an audit entry, so the configurable stages mean something instead of being decorative.

### Milestone 4 — Fit your process (2–3 days)
- Configure the stages to match the encyclopedia's real review → committee → decision flow
  (mostly data entry once Milestone 3 connects stages to progress).
- Map our roles onto JMS's roles (relabeling + access checks).

---

## 7. Risks & assumptions

- **Estimates assume one developer** and no major change of direction mid-build.
- **Rename is screen-text only.** If we later decide we need the database renamed too, that's a
  separate, larger job (240+ code spots + security rules).
- **Active Directory login is out of scope** for this plan (kept as a possible later add-on).
- The `jms/docs` ambition (pricing, contracts, official letters, AD) is **not** included here;
  this plan targets the working app plus the four milestones above.

---

## 8. Next step

Awaiting go-ahead to start **Milestone 1**. Suggested first visible result:
**rename to Centers + an inbox you can open, see your tasks, and click into a paper.**
