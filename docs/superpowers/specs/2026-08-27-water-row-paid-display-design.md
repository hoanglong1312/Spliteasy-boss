# Spec: Hiển thị ✓ từng dòng nước đã nộp (Water Row Paid Display)

**Date:** 2026-08-27  
**Status:** approved  
**Scope:** PickleballOverview sheet “Nước của bạn” — view-only

## Problem

Card nước hiện “✓ Đã nộp: 72k” dạng tổng, nhưng từng dòng “Tiền nước · dd/mm” không có ✓ dù phiếu xác nhận đã cover. Nguyên nhân: coverage amount trong phiếu là âm, amount dòng UI là dương → `isPayableItemCovered` fail; phần dư sau vé tháng (`waterCoveredFromDelta`) cũng không gắn vào dòng.

## Decisions

| Topic | Choice |
|---|---|
| Interaction | View-only (không toggle trong sheet) |
| Per-item coverage | Khớp `coveredItems` / checkpoint bằng abs + cùng chiều nợ |
| Lump remainder | FIFO ngày tăng dần trên dòng chưa ✓ |
| Session water rows | Cùng rule `paid` như ticket water |
| “Đã nộp” subtext | = tổng `amount` các dòng `paid` |

## Out of scope

- Nút đánh dấu thủ công trong sheet
- Đổi flow xác nhận thanh toán Home / treasurer

## UI

Giữ style hiện có: label muted, amount xanh + prefix `✓` khi `row.paid`.
