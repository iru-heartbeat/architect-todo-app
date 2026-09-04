# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-user ToDo app for a freelance architect, built as a plain static site (no build tooling, no package manager, no framework). Full requirements are in `要件定義.md` — read it before making feature decisions; it defines what is Must, Want, and explicitly out of scope.

## Running the app

There is no build step. Open `index.html` directly in a browser, or serve the directory with any static file server (e.g. `npx serve .`) for a URL-based origin (needed if a feature ever requires `fetch`/module imports with CORS restrictions — not currently the case).

There is no test suite, linter, or bundler configured.

## Architecture

Three flat files at the project root:
- `index.html` — all markup: both "screens" (today view and completed view) exist in the DOM simultaneously as sibling `<main>` elements (`#view-today`, `#view-completed`) and are switched by toggling the `hidden` attribute — this is not a router-based SPA. The two `.sheet-backdrop` blocks (`#add-sheet`, `#edit-sheet`) are bottom-sheet modals; both show title, due date, and priority fields inline (no progressive-disclosure toggle — the user rejected the extra tap). `#toast` is a single reusable status-message element.
- `style.css` — mobile-first, single stylesheet, no preprocessor. Design is optimized for one-handed phone use (bottom nav + floating action button) with a `@media (min-width: 768px)` breakpoint for desktop/PC viewing. Note the `[hidden] { display: none !important; }` rule near the top — several later class selectors (`.sheet-backdrop`, `.detail-fields`) set `display: flex` at equal specificity, so `!important` is required for the `hidden` attribute to actually hide them; don't remove it when touching those rules.
- `script.js` — implemented, single IIFE, no modules/bundler. Wires up: add/edit form submission (including title editing), the today/thisWeek/later section split, complete/restore/delete actions, the per-task kebab menu (`.task-menu` → `.menu-trigger` / `.menu-dropdown`), and toast notifications.

### Data model and section logic (per 要件定義.md, section 3.1 and 6, extended per later user requests)

Tasks need only a title to be created; due date and priority are optional, entered inline in the same add form (not behind a secondary tap) and editable later via the edit sheet (`#edit-title`, `#edit-due`, `#edit-priority`). On the top page, tasks are bucketed into three sections purely by due date:
- **今日 (today)**: due date is today or earlier (overdue tasks surface here too, since the goal is immediate visibility of urgency — see 要件定義.md section 1).
- **今週 (this week)**: due date falls later this week.
- **今週以降 (later)**: due date is beyond this week, or no due date set at all.

Within a section, ordering should reflect urgency first: due-today/overdue and high-priority tasks surface at the top (要件定義.md item 2). No due date and no priority are both valid, permanent states — do not make either field required.

Completed tasks move to the completed view (`#list-completed`), sorted newest-completed-first, with a one-tap restore back to incomplete (要件定義.md items 5–6).

Every task row (active and completed) has a kebab menu (`⋮`) offering **編集**/**削除** (active) or **削除** (completed) — added because editing/deleting used to require no clear entry point. Deleting is immediate (no confirm dialog), and every state-changing action (complete, restore, edit, delete) shows a short-lived toast via `showToast()` so silent list changes are always acknowledged.

### Explicit non-goals

Per 要件定義.md section 3.3: no login/auth, no multi-user sharing, no full calendar view, no deep category/tag system. Do not add these even if they seem like natural extensions.

### Persistence

No backend and no auth screen — data storage should stay simple (要件定義.md section 4 leaves the exact technique to implementation, but the single-user/no-login constraint points to client-side storage such as `localStorage` rather than a server).

## Testing / Verification

Do not attempt to open, test, or verify the app in Chrome (or any browser) yourself, including via browser automation tools. The user will manually verify all changes in their own browser. After implementing a feature, simply report what was changed and what to check — do not try to launch or screenshot the app.