# Water OCR Import in Quick Entry — Design

## Goal

Add paste import inside the existing quick water-entry screen so the treasurer can copy raw OCR/Excel text, preview parsed water rows by date, then fill the current quick-entry table without auto-saving.

## User Flow

1. User opens existing quick water-entry screen.
2. User clicks `Dán dữ liệu Excel/OCR`.
3. App opens a large textarea.
4. User pastes raw copied text from OCR/Excel.
5. User clicks `Phân tích`.
6. App parses text into dated rows and shows a preview table.
7. User reviews parsed rows and visible warnings.
8. User clicks `Điền vào bảng nhập nhanh`.
9. App fills matching dates in the current quick-entry form.
10. User uses the existing save action to persist data.

## Scope

In scope:

- Import UI inside the existing quick water-entry screen.
- Parser for raw multiline text copied from OCR/Excel.
- Preview before fill.
- Fill current quick-entry state only; no direct database save.
- Detect and display xé vé amount as a note, but do not import it into water values.
- Ignore `TỔNG CỘNG` and empty/noise rows.

Out of scope:

- Creating expenses for xé vé automatically.
- Uploading images or files.
- OCR inside the app.
- Replacing the existing quick-entry save flow.

## Parsing Rules

The parser reads pasted text as plain text.

- Detect a row start by date pattern `dd/mm/yyyy`.
- Group text from each detected date until the next detected date.
- Ignore rows without a date unless they are part of the current date block.
- Skip `TỔNG CỘNG` rows.
- Detect `Xé vé` within a date block and extract its amount as a non-water note.
- Do not include xé vé amount in water totals.
- Detect bottle quantities for supported prices:
  - `10k/chai`
  - `12.5k/chai`
  - `14k/chai`
  - `30k/chai`
- Produce a row status:
  - `OK`: parsed quantities are usable and calculated water total matches detected water total, when enough data exists.
  - `Cần kiểm tra`: missing/ambiguous quantities, OCR noise, or mismatched total.
  - `Bỏ qua`: no water data to fill.

## Data Shape

Parser output should be small and UI-oriented:

```js
{
  date: '2026-05-01',
  displayDate: '01/05/2026',
  quantities: {
    10000: 2,
    12500: 2,
    14000: 0,
    30000: 4
  },
  detectedWaterTotal: 96000,
  calculatedWaterTotal: 96000,
  extraNotes: [],
  status: 'ok',
  warnings: []
}
```

Example with xé vé:

```js
{
  date: '2026-05-09',
  displayDate: '09/05/2026',
  quantities: {
    10000: 1,
    12500: 0,
    14000: 0,
    30000: 0
  },
  detectedWaterTotal: 10000,
  calculatedWaterTotal: 10000,
  extraNotes: ['Có xé vé 200.000 đ — không nhập vào nước'],
  status: 'ok',
  warnings: []
}
```

## UI Behavior

Add one import section/button to the existing quick water-entry screen.

Preview columns:

| Column | Meaning |
|---|---|
| Ngày | Parsed date |
| 10k | Quantity |
| 12.5k | Quantity |
| 14k | Quantity |
| 30k | Quantity |
| Tổng detect | Water total detected from source text |
| Tổng tính | Quantity × price total |
| Ghi chú | xé vé/non-water notes |
| Trạng thái | OK / Cần kiểm tra / Bỏ qua |

Fill behavior:

- Only rows with `OK` or user-accepted usable rows fill the quick-entry form.
- Matching uses calendar date, not row index.
- If pasted data contains a date that is not visible in current quick-entry period, show warning and skip that row.
- If a visible date already has values, overwrite only after user confirms in the preview action.
- No database write happens during import/fill.

## Error Handling

- Empty paste: show `Chưa có dữ liệu để phân tích`.
- No dates found: show `Không tìm thấy ngày dạng dd/mm/yyyy`.
- Ambiguous rows: keep row in preview with `Cần kiểm tra`.
- Total mismatch: show both totals and warning.
- Xé vé detected: show note and do not block water import.

## Testing

Minimum tests:

- Parses the sample May 2026 text into dated rows.
- Skips `TỔNG CỘNG`.
- Detects xé vé and excludes it from water totals.
- Fills matching quick-entry dates without saving.
- Warns on date not present in current quick-entry period.
- Build passes.

## Acceptance Criteria

- User can paste raw copied OCR/Excel text into the quick water-entry screen.
- App previews parsed rows before applying anything.
- App maps parsed water quantities to correct dates.
- App does not import xé vé as water.
- App does not auto-save to Supabase during import.
- Existing quick-entry save remains source of persistence.
