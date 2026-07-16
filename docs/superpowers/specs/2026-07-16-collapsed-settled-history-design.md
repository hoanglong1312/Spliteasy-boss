# Collapsed Settled History Design

## Goal

Keep each treasurer member card focused on payments that still need action while preserving access to completed older payments.

## Scope

- Change only the treasurer payment dashboard in `src/screens/Home.jsx` and focused tests.
- Keep existing payment data, settlement actions, totals, search, and Supabase behavior.
- Add no dependency, route, or new global history screen.

## Member Card

- Show unpaid, pending, and refund items in the main expanded content.
- Hide paid items behind one collapsed row at the bottom of that member card.
- Label the row `Đã chốt trước đây · N khoản · X đ`.
- Expand the row in place to show the existing paid item details.
- Keep paid items grouped by source and month in their current order.
- Keep `Hoàn tác` available only inside the expanded settled history.
- Collapse settled history by default whenever the payment sheet opens.

## Totals

- Keep `đã nhận` in the member header and dashboard summary unchanged.
- Compute the collapsed row count and amount from the same paid items already rendered today.
- Do not include pending, unpaid, or refund items in settled history.

## Interaction

- Expanding settled history must not collapse the member card.
- Selecting unpaid items remains unchanged.
- Search continues to match the member card; it does not automatically expand settled history.

## Verification

- Add focused tests for the collapsed label, paid-item separation, expansion, and `Hoàn tác` placement.
- Run Vitest, relevant Node tests, `npm run build`, and browser verification at mobile width.
