# Spec: Chốt thanh toán theo bucket tháng (Month-Bucket Settlement)

**Date:** 2026-08-27  
**Status:** approved (design dialogue)  
**Supersedes (behavior):** point-in-time running period (`period_start` → `now`) as the **primary** unpaid calculator  
**Keeps:** `settlement_checkpoints` + `covered_items` per payable item; 1 pending / member / group; stale-on-item-change; carry-forward `member_month_settlements`

## Problem

Current checkpoints settle a continuous window from the last confirmed `period_end` to `now`. Example: on 12/8, one slip can mix July leftovers + August-to-date; the next slip only covers “after 12/8”. Home still thinks in calendar months, so users feel **overlapping** periods.

Goal: settle by **month buckets**, allow mid-month partial for the current month, let users **choose which months** to pay, and tighten **pending lifecycle** so multi-member collection days do not leave zombie slips.

## Decisions (locked)

| Topic | Choice |
|---|---|
| Unit of debt | Payable item (unchanged) |
| Grouping | Calendar month `YYYY-MM` |
| Mid-month | Current month = items with date ≤ today (partial) |
| Multiple slips in one month | Allowed; each covers only still-`unsettled` items of that month |
| Which months in a slip | List all unpaid months by default; **selectable** (current month optional) |
| Who selects months | Member proposes; treasurer may edit before confirm |
| Approach | Evolve existing checkpoint + `covered_items` (not one-checkpoint-per-month rows, not full ledger rewrite) |
| Multi-member same day | Still per-member pending; no batch entity |
| Pending lifecycle | Option **C**: replace-on-new + time-stale for partial current-month slips |
| Carry-forward (“Gộp nợ”) | Unchanged; out of scope |

## Data model

### Keep

- Table `settlement_checkpoints` (`pending` \| `confirmed` \| `rejected`)
- Unique: one `pending` per `(group_id, member_id)`
- Column `covered_items` jsonb — snapshot of payable items (identity, amount, month, keys)
- Item-derived statuses: `unsettled` \| `pending` \| `confirmed`

### Change in meaning

- **`period_start` / `period_end`**: audit / display only (e.g. min/max covered item dates, or created-at window). **Must not** drive “what is still owed” after confirm.
- Unpaid set = payable items **not** covered by any pending or confirmed checkpoint (and not covered by confirmed payment notifications that already use `coveredItems`), grouped by `month`.

### Optional metadata (implementation may add without breaking RPC shape)

Prefer storing on checkpoint row or inside snapshot metadata:

- `selectedMonths: string[]` — months member/treasurer chose for this slip
- `asOfDate: YYYY-MM-DD` — for partial current month (“đến ngày”)
- `timeStaleReason` / flag derived in UI or column if needed for query

If schema stays minimal: derive `selectedMonths` / `asOfDate` from `covered_items` + `created_at`.

## Unpaid calculation rules

1. Build all payable items for the member in the group (existing builders).
2. Exclude items covered by confirmed payments / confirmed checkpoints / pending checkpoints (existing coverage maps).
3. Bucket remaining by `month` (`YYYY-MM`).
4. **Past months:** all unsettled items in that month.
5. **Current month:** only items with activity date ≤ **today** (partial). Future-dated items in the current month stay out until their date.
6. **Future months:** never offered.
7. Default UI selection: **all** months that still have unpaid amount after step 5–6.
8. User may deselect any month (e.g. pay only July, leave August).

After a confirmed slip that covered “August ≤ 12/8”, a later slip on 20/8 for August includes only August items still unsettled (typically 13/8–20/8).

## Flows

### Member — request slip (“Chờ nhận tiền”)

1. Open sheet → list unpaid month buckets (label, item count, amount).
2. Current month label includes as-of, e.g. `Tháng 8 · đến 12/8`.
3. All months checked by default; user may uncheck.
4. Total = sum of selected months only.
5. Submit → create checkpoint(s) per group (existing multi-group pattern) with `covered_items` = unsettled items in selected months (current month filtered by as-of).
6. Selected items → `Đang chờ nhận`; deselected months remain `Chưa chốt`.

### If member/group already has pending

Do **not** silently overwrite.

Show existing slip summary (selected months, amount, created date) and choices:

- **Giữ phiếu cũ** — abort new create
- **Thay phiếu** — reject old pending, then create new with current selection

### Treasurer — confirm / edit

1. Dashboard shows request broken down **by month**, not “from date X → now” as the primary axis.
2. Before confirm, treasurer may add/remove months within items that are still unsettled and not in another conflicting pending (same member/group still one pending).
3. Edit regenerates `covered_items` + `amount` from **current** live data for those months (or reject if any selected item is missing / amount changed — keep hard stale).
4. Confirm covers only snapshot items.
5. Reject / undo: keep existing semantics (pending → unsettled; undo confirmed → back per current undo RPC).

### Treasurer creating slips for many members (e.g. 12/8)

- Still one pending per member; no group-level batch row.
- Some members confirmed, some still pending: **expected**.
- Pending member does not block others.
- UI copy must say this is **that member’s slip**, not “group closed on 12/8”.

## Pending time-stale (Option C)

In addition to existing stale (item deleted / amount / key mismatch):

| Slip content | Rule |
|---|---|
| Includes **current-month partial** bucket | When calendar **date** > slip `asOfDate` (or created local date if asOf omitted) → **time-stale**: disable confirm; require **Thay phiếu** (or reject + new). Copy: phiếu chốt đến ngày X đã qua. |
| **Only completed months** (e.g. only July) | Do **not** time-stale merely because days passed; confirm OK unless item-stale. |

Editing months on a time-stale slip is not allowed; must replace.

## UI / copy

- Home / payment sheet / treasurer dashboard: primary breakdown by **month buckets**.
- Deprecate primary reliance on carry-forward-style “Còn nợ từ DD/MM/YYYY” as the main settlement narrative (helper text OK if useful).
- Status chips unchanged in meaning: `Chưa chốt` / `Đang chờ nhận` / paid-confirmed.
- When replace is required, explain that old pending items return to `Chưa chốt` before the new snapshot.

## Interaction with carry-forward

`member_month_settlements` (“Gộp → T[next]”) stays as-is: treasurer moves residual into a next-month expense. Month selection on a payment slip does **not** replace carry-forward.

## Out of scope

- Partial payment **inside** a single payable item
- One DB row per month per slip (approach 2)
- Full rewrite to month ledger as source of truth (approach 3)
- Group-level “Đợt thu” batch entity (rejected option B)
- Silent auto-reject without user action
- Merging or removing carry-forward

## Implementation notes (for plan)

Likely touch:

- `src/hooks/useScreenData.js` — stop using `groupWithExpensesAfterCheckpoint` / `period_end` as primary unpaid filter; build month buckets from uncovered payable items
- `src/screens/Home.jsx` — month multi-select on request sheet; treasurer edit; replace-pending UX; time-stale gating
- `src/app-v2.jsx` / `src/store.jsx` — replace = reject + request; optional update-covered RPC for treasurer month edit
- RPCs / migrations only if update-in-place for pending `covered_items` is not already possible
- Tests in `useScreenData.test.js`, `HomePaymentSheet.test.mjs`, related checkpoint tests

## Acceptance criteria

- [ ] Unpaid list is grouped by calendar month; past months full, current month ≤ today
- [ ] User can deselect current month and settle only prior months
- [ ] Second slip in same month only includes still-unsettled items of that month
- [ ] `period_end` of an old checkpoint does not hide unsettled items from other months incorrectly
- [ ] Default selects all unpaid months; selection drives `covered_items`
- [ ] Treasurer can change selected months before confirm; amount matches new snapshot
- [ ] Existing pending blocks create until user chooses Keep or Replace (reject + create)
- [ ] Partial current-month pending becomes time-stale after as-of date; confirm locked until replace
- [ ] Completed-month-only pending does not time-stale solely due to date change
- [ ] Multi-member: mix of confirmed + pending on same day works independently
- [ ] Carry-forward behavior unchanged
- [ ] Targeted unit tests + `npm run build` pass

## Open implementation detail (non-blocking for product)

Whether treasurer month-edit updates pending via new RPC `update_settlement_checkpoint_coverage` or force replace-only for edits: plan may pick the smaller safe path; product requires edit-before-confirm either as true update or as guided replace with same UX outcome.
