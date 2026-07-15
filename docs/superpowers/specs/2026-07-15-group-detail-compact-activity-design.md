# Group Detail Compact Activity Design

## Goal

Give the group activity list more visible space while keeping key monthly controls available, and let users find transactions by expense title or payer name.

## Scope

- Change only `src/screens/GroupDetail.jsx` and focused tests.
- Keep the existing group detail data contract and `onAction` events.
- Add no dependency and no new route.

## Layout

- Keep the top group area sticky inside the screen.
- Use the approved compact layout:
  - group navigation row
  - month navigation
  - two compact values: total spent and personal balance
  - add-expense and settle-debt actions
  - members/activity tabs
- Move Excel export from the hero into the existing group options surface.
- Remove the explanatory debt text from the fixed area.

## Activity Search

- Show a controlled search input only on the activity tab.
- Match normalized text against transaction title and payer name.
- Preserve week grouping after filtering.
- Show the existing empty state when the month has no transactions.
- Show a search-specific empty state when transactions exist but no result matches.

## Scrolling

- Render every transaction supplied in `activitiesByWeek`; do not slice or cap the list.
- Keep the compact header fixed while the activity content scrolls below it.
- Preserve bottom tab-bar clearance.

## Verification

- Add a focused source regression test for controlled search, title/payer filtering, no list slicing, and compact sticky structure.
- Run focused tests, Vitest, `npm run build`, and browser verification at mobile width.
