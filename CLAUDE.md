# JMS Message Hub — working agreement

A bilingual (Arabic/English) academic paper management app: Vite + React +
TypeScript + Tailwind + shadcn/ui, backed by Supabase. The owner is
non-technical — explain in simple language and always give a recommendation.

Read `JMS-BUILD-PLAN.md` for the product plan and `PROJECT-TASKS.md` for the
live task/milestone board. Update `PROJECT-TASKS.md` (mark `[x]`, add agreed
tasks) whenever work is done.

## Standard workflow: Plan → Build → QA → Commit

Every non-trivial change goes through three specialist subagents, each on a
specific model:

| Step | Subagent | Model | Does |
|---|---|---|---|
| 1. Plan | `planner` | Opus | Detailed plan + **exact expected output / acceptance criteria**. No code. |
| 2. Build | `builder` | Sonnet | Implements the approved plan. Writes the code. |
| 3. QA | `qa` | Opus | Reviews the diff vs. acceptance criteria, runs lint/test/build, returns PASS/FAIL. No code. |

Only commit after QA returns **PASS**. The agents live in `.claude/agents/`.

## Automatic QA gate (do not bypass)

`.claude/hooks/qa-precommit.mjs` runs before every `git commit` (wired via
`.claude/settings.json`). It runs `npm run lint` and `npm test`; if either
fails, the commit is blocked. Fix the issues rather than working around the gate.

This is the automatic, mechanical safety net. The `qa` subagent above is the
deeper, reasoning-based review — run it before committing as part of the flow.

## Git

- Develop on the designated feature branch; do not push to `main` directly.
- Land changes into `main` via a Pull Request.
- Keep secrets out of commits (`.env` is gitignored).
