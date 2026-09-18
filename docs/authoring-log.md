# Authoring log

Append-only record of autonomous authoring runs (see `docs/authoring-runbook.md`).

## Blocked

(none)

## Runs

- 2026-09-17 17:35 PDT — Curriculum expanded to 101 lessons across 21 tracks (roadmap.sh/frontend, 2026 edition). 3 authored, 98 pending. Scheduled runs: every 30 minutes from ~19:42 PDT through 08:42 PDT on 2026-09-18, 4 lessons per run.
- 2026-09-17 20:05 PDT — Run 1: added 04-effects-and-refs, 05-context-and-composition, 06-custom-hooks, 07-lists-keys-forms (Refresher track complete). Blocked: none. Pending: 94. Suite 118/118, typecheck clean. Notes: implementers flagged two facts stated from knowledge rather than re-fetched this run: React 19 form actions resetting uncontrolled fields (covered by lesson 03's passing checks, so verified behaviorally) and ref-callback cleanup / ref-as-prop without forwardRef (well documented in the React 19 release post). Also gitignored Claude Code's `.claude/scheduled_tasks.lock`.
- 2026-09-17 20:45 PDT — Run 2: added 08-concurrent-rendering, 09-external-stores, 10-use-and-ref-changes, 11-metadata-and-resources (React 18 track complete). Blocked: none. Pending: 90. Suite 142/142, typecheck clean. Notes: lesson 11 found and teaches two real gotchas (React only hoists a `<title>` with a single string child; react-dom's preload registry is global per document). Unverified-by-fetch this run: Next.js `metadata` / React Router 8 `meta` API details; exact version that added `useDeferredValue`'s initialValue (text avoids a version claim). Added `.gitattributes` (LF) to stop CRLF warnings.
