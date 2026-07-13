# Pending Payment Item Status Design

## Mục tiêu

Hiển thị rõ phần tiền nào của từng member đang chờ nhận, phần nào chưa chốt, và ngăn xác nhận snapshot đã lệch dữ liệu.

## Phạm vi

- Trạng thái áp dụng cho `payableItem`, không áp dụng cho toàn bộ expense.
- Không thêm bảng, route hoặc màn hình mới.
- Dùng `covered_items` hiện có trong settlement checkpoint.
- Không hỗ trợ thanh toán một phần của một payable item.

## Trạng thái

Mỗi payable item có đúng một trạng thái dẫn xuất:

- `unsettled`: chưa nằm trong checkpoint pending hoặc confirmed. UI: `Chưa chốt`.
- `pending`: nằm trong `covered_items` của checkpoint pending. UI: `Đang chờ nhận`.
- `confirmed`: đã được payment hoặc checkpoint confirmed cover. UI: `Đã thanh toán`.

`changed` không phải trạng thái thanh toán. Đây là cảnh báo khi item pending không còn khớp snapshot.

## Hiển thị

Dashboard thủ quỹ giữ danh sách hiện tại:

- Header member tách `Đang chờ {pendingAmount}` và `Chưa chốt {unsettledAmount}`.
- Dòng payable item pending có nhãn vàng `Đang chờ nhận` và không thể chọn lại.
- Dòng chưa nằm trong snapshot có nhãn `Chưa chốt`.
- Dòng phát sinh sau snapshot vẫn là `Chưa chốt`.
- Không dùng nhãn `Còn nợ mới`, vì khoản chưa chốt có thể tồn tại trước snapshot.

## Hành vi

### Chờ nhận tiền

- Chỉ snapshot payable item đang được chọn và chưa pending.
- Snapshot lưu identity và amount tại thời điểm chốt.
- Một member chỉ có một checkpoint pending trong mỗi group.
- Khoản phát sinh sau đó không thay đổi snapshot.

### Xác nhận đã nhận

- Dùng amount và `covered_items` trong checkpoint pending, không tính lại từ tổng công nợ hiện tại.
- Chỉ các item trong checkpoint chuyển sang confirmed.
- Item chưa chốt vẫn giữ nguyên.

### Hủy chờ

- Checkpoint chuyển sang rejected.
- Item từng pending trở lại `Chưa chốt` nếu chưa được payment khác cover.

## Snapshot lệch dữ liệu

Checkpoint được coi là lệch khi:

- payable item đã bị xóa hoặc không còn tìm thấy;
- amount hiện tại khác snapshot amount;
- identity hiện tại không còn khớp `payableItemKey`.

UI hiển thị `Có khoản đã thay đổi hoặc bị xóa`, khóa xác nhận và yêu cầu hủy checkpoint rồi tạo lại. Không tự sửa snapshot hoặc tự chuyển phần chênh lệch.

## Nhiều group

Tạo checkpoint theo từng group như hiện tại. Sheet chỉ đóng khi mọi group được chọn tạo checkpoint thành công. Nếu group nào lỗi, giữ sheet mở và hiển thị group thất bại; checkpoint đã tạo thành công vẫn hiện đúng trạng thái pending.

## Kiểm thử

- Item trong checkpoint pending được dẫn xuất thành `pending`.
- Item cùng expense nhưng thuộc member khác không bị đổi trạng thái.
- Item phát sinh sau snapshot vẫn `unsettled`.
- Confirm chỉ cover item trong snapshot.
- Amount thay đổi hoặc item bị xóa làm checkpoint stale và khóa confirm.
- Tạo checkpoint nhiều group có lỗi không đóng sheet.
- Build và browser smoke test dashboard thủ quỹ trên mobile.
