# GroupDetail Excel Matrix Export Design — 2026-06-29

## Goal

Thêm lựa chọn xuất Excel dạng bảng ngang cho màn chi tiết nhóm chi tiêu. Mỗi khoản chi trong tháng là một cột riêng, mỗi thành viên là một hàng riêng, ô giao nhau là phần tiền thành viên đó phải chịu trong khoản chi đó.

## Scope

Áp dụng cho group đang mở và tháng đang xem. Giữ export CSV hiện tại, thêm lựa chọn Excel bảng ngang.

## UI

Nút `📤 Xuất Excel` mở lựa chọn:

1. `CSV danh sách` — dùng export CSV hiện tại.
2. `Excel bảng ngang` — tải file `.xlsx` dạng bảng ma trận.

## Output

Tên file:

```text
spliteasy-[group-name]-[YYYY-MM]-matrix.xlsx
```

Định dạng file:

- Workbook `.xlsx` thật bằng package `xlsx`.
- Extension `.xlsx` để Excel/Numbers mở trực tiếp.
- Dùng dependency `xlsx` vì HTML `.xls` bị Numbers import raw HTML.

## Table Layout

```text
STT | THÀNH VIÊN | [Khoản chi 1] | [Khoản chi 2] | ... | TỔNG PHẢI CHỊU | SỐ DƯ
1   | HƯƠNG      | 55.000       | 60.000       | ... | 6.487.000      | -...
2   | LONG       | 55.000       | 60.000       | ... | 4.848.000      | +...
...
TỔNG             | 770.000      | 840.000      | ... | ...            | ...
```

## Calculation

- Member row = mỗi thành viên trong group, sort alphabet tiếng Việt (`localeCompare(..., 'vi')`).
- Expense column = mỗi khoản chi trong tháng, sort alphabet tiếng Việt theo tên khoản.
- Cell `member × expense`:
  - Nếu member nằm trong `splits` hoặc `participants` của expense: ghi phần tiền member phải chịu.
  - Nếu split có `amount`/`shareAmount`/`share_amount`: dùng số đó.
  - Nếu expense chỉ có participants không có amount riêng: chia đều `expense.amount / participantCount`.
  - Nếu member không tham gia: để trống.
- `TỔNG PHẢI CHỊU` = tổng các cell của member.
- `SỐ DƯ` = balance hiện có của member trong `GroupDetailData`.
- Missing data = ô trống, không crash.
- Số format `vi-VN`, có ngăn cách hàng nghìn.

## Styling

Gần giống bảng Excel mẫu:

- Header khoản chi: nền đỏ, chữ đậm.
- Body: nền trắng, border mảnh.
- Dòng tổng cuối: nền vàng/cam.
- Cột tổng/số dư: chữ đỏ đậm.
- Tên thành viên uppercase.

## Data Flow

`GroupDetail` giữ action hiện tại `onAction?.('exportGroupCsv', d)` nhưng AppV2 đổi thành mở lựa chọn export.

`buildGroupDetailData` bổ sung dữ liệu raw expense tháng hiện tại cho export matrix:

```js
exportExpenses: monthlyExpenses
```

`AppV2` xử lý:

- CSV danh sách → `exportGroupCsv(data)` hiện tại.
- Excel bảng ngang → `exportGroupMatrixXls(data)`.

## Constraints

- Không thêm dependency.
- Không tạo workbook XLSX thật trong phase này.
- CSV hiện tại không regression.
- XLS dùng HTML table đủ để Excel mở và chỉnh tay.

## Verification

- Static node test: có helper export matrix, có `.xlsx`, có `application/vnd.ms-excel`, có `localeCompare(..., 'vi')`, có `toLocaleString('vi-VN')`.
- `npm test` pass.
- `npm run build` pass.
- Browser: mở GroupDetail, chọn `Excel bảng ngang`, download `.xlsx`.
