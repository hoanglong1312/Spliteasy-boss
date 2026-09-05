# Spec: Tách dòng Tiền sân & Tiền nước trong thanh toán tháng (Split Court & Water Settlement)

**Date:** 2026-09-05  
**Status:** approved (by user decision)  
**Problem:**  
Hiện tại hệ thống chốt thanh toán (settlement) gom toàn bộ các khoản phát sinh trong một tháng thành 1 dòng duy nhất (ví dụ `Tháng 9 · đến 05/09: -561.600 đ`).  
Trong thực tế CLB Pickleball:
1. **Đầu tháng:** Thành viên cần thanh toán ngay tiền sân cố định / vé tháng của tháng tới (ví dụ 500.000 đ).
2. **Trong tháng:** Tiền nước và vé buổi/phụ phí phát sinh dần theo từng buổi chơi.
3. **Cuối tháng:** Thủ quỹ mới gom toàn bộ tiền nước của tháng để thanh toán một lần gói gọn.

Nếu gom chung 1 dòng `Tháng 9`, khi thủ quỹ chốt tiền sân đầu tháng sẽ vô tình chốt luôn cả tiền nước phát sinh đầu tháng (ví dụ 61.600 đ). Đến cuối tháng gom tiền nước lại bị xé lẻ thành nhiều đợt, không quản lý gói gọn được.

## Quyết định thiết kế (Design Decisions)

1. **Phân rã theo nhóm chi phí (Fee Category Breakdown):**  
   Trong mỗi tháng, thay vì chỉ tạo 1 dòng gộp duy nhất cho nguồn Pickleball, hệ thống sẽ phân tách thành các dòng mục tiêu rõ ràng:
   - **`Tiền sân` / `Vé tháng`** (`court` | `monthly-ticket`): Cố định, thu vào đầu tháng.
   - **`Tiền nước`** (`water`): Biến phí theo buổi/vé, gom thu vào cuối tháng (nhãn hiển thị kèm `đến DD/MM` đối với tháng hiện tại).
   - **`Vé buổi` / `Phụ phí`** (`fee` | `extras` | `p2p`): Vé lượt vãng lai hoặc phụ phí phát sinh (nếu có).

2. **Tương thích Data Model & Checkpoint:**
   - Hệ thống `settlement_checkpoints` + `covered_items` vốn dĩ đã định danh từng item con bằng `payableItemKey` riêng biệt (ví dụ `pickleball-court:...`, `pickleball-session:...:water`).
   - Khi thủ quỹ bấm `TT` cho dòng `Tiền sân`, chỉ item `Tiền sân` được đóng gói vào snapshot `covered_items`.
   - Dòng `Tiền nước` vẫn giữ nguyên trạng thái `Chưa chốt` (unsettled), tiếp tục tự động cộng dồn chi phí các buổi tiếp theo trong tháng.
   - Không cần thay đổi schema database hay migration mới.

3. **Giao diện hiển thị (UI/UX):**
   - **Màn hình Thủ quỹ (Treasurer Member Rows):** Mỗi member sẽ thấy các dòng rõ ràng:
     - `[ ] Tháng 9 · Tiền sân` `-500.000 đ` `[Chưa chốt]` `[TT]`
     - `[ ] Tháng 9 · Tiền nước · đến 05/09` `-61.600 đ` `[Chưa chốt]` `[TT]`
     - `[ ] Tháng 9 · Vé buổi · đến 05/09` `-50.000 đ` `[Chưa chốt]` `[TT]` (nếu có)
   - Thủ quỹ có thể:
     - Bấm `TT` riêng từng dòng.
     - Tick chọn nhiều dòng của 1 member hoặc dùng nút "Chọn hết tiền sân" / "Chọn hết" để thanh toán gộp linh hoạt.
   - **Màn hình Thành viên (Member Payment Sheet & Share Link):** Hiển thị chi tiết từng mục tương ứng để thành viên biết rõ mình đang nộp tiền gì (hoặc có thể chọn nộp tiền sân trước, tiền nước sau).
   - **Nội dung chuyển khoản QR:** Tự động điền rõ ràng: `Nguyen Van A - Thanh toan Thang 9 Tien san`.
