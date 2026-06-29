# GroupDetail CSV Export Design — 2026-06-29

## Goal

Thêm nút **Xuất Excel** cho màn chi tiết nhóm chi tiêu. File xuất là `.csv` UTF-8 BOM để Excel mở đúng tiếng Việt, không thêm package XLSX.

## Scope

Áp dụng cho group đang mở và tháng đang xem.

## Output

Tên file:

```text
spliteasy-[group-name]-[YYYY-MM].csv
```

Nội dung gồm các section trong cùng một CSV:

1. **Tổng quan**
   - Nhóm
   - Tháng
   - Số thành viên
   - Số khoản chi
   - Tổng chi
   - Số dư của bạn

2. **Thành viên**
   - Tên
   - Vai trò
   - Số dư
   - Trạng thái (`Cần thu`, `Cần nộp`, `Cân bằng`)
   - Ngân hàng
   - Số tài khoản

3. **Chi tiêu**
   - Ngày
   - Tên khoản
   - Số tiền
   - Người trả
   - Người tham gia
   - Trạng thái

## UI

Trong `GroupDetail` hero actions, thêm nút nhỏ `📤 Xuất Excel` cạnh `+ Thêm chi tiêu` và `💳 Thanh toán`.

## Data flow

`GroupDetail` gọi:

```js
onAction?.('exportGroupCsv', data)
```

`AppV2` xử lý action và tạo file CSV client-side bằng `Blob` + anchor download.

## Constraints

- Không thêm dependency.
- CSV escape quote/dấu phẩy/newline đúng.
- Có BOM `﻿` để Excel đọc tiếng Việt.
- Nếu thiếu dữ liệu thì để trống, không crash.

## Verification

- `npm test`
- `npm run build`
- Browser: bấm `Xuất Excel`, file `.csv` được download; nội dung có section `TỔNG QUAN`, `THÀNH VIÊN`, `CHI TIÊU`.
