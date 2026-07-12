# Treasurer Self Payment

## Goal

Cho thủ quỹ xác nhận phần tiền của chính mình bằng cùng cơ chế coverage per-item đang dùng cho member, không cần tạo thông báo chờ thủ quỹ tự duyệt.

## UI

- Trong sheet `Thanh toán` của thủ quỹ, thêm card `KHOẢN CỦA THỦ QUỸ` phía trên `TreasurerPaymentDashboard`.
- Chỉ hiện card khi profile hiện tại có payable item âm chưa được cover.
- Dùng breakdown và bộ chọn per-item hiện có; thủ quỹ có thể chọn từng khoản hoặc từng tháng.
- Nút chính ghi `Xác nhận đã nộp`.
- Sau khi xác nhận thành công, các item đã chọn biến mất hoặc chuyển sang trạng thái đã trả theo dữ liệu rebuild hiện có.
- Danh sách member cần thu bên dưới tiếp tục loại profile thủ quỹ để không hiển thị trùng.

## Data Flow

1. Card lấy các payable item âm của `currentProfileId` từ `paymentSheetData`.
2. Payload dùng cùng `coveredItems` và `coveredSources` như payment member hiện tại.
3. Action xác nhận tạo payment ở trạng thái `confirmed` ngay.
4. Không tạo notification `pending` cho chính thủ quỹ.
5. Coverage và trạng thái hoàn thành transaction tiếp tục tính theo payable item; không đánh dấu toàn expense chỉ vì thủ quỹ đã trả phần của mình.

## Error Handling

- Giữ validation hiện có: phải có ít nhất một item được chọn và tổng xác nhận phải lớn hơn 0.
- Nếu ghi payment lỗi, giữ nguyên selection và hiển thị lỗi theo cơ chế action hiện tại.
- Không thêm fallback theo source/month ngoài compatibility đang có.

## Verification

- Unit/source test: treasurer payment sheet có card riêng và action xác nhận trực tiếp.
- Regression: member payment flow vẫn tạo payment chờ duyệt như cũ.
- Regression: dashboard thu tiền vẫn không có row thủ quỹ.
- `npm test -- src/screens/HomePaymentSheet.test.mjs`
- `npm run build`
- Browser: mở `Thanh toán` bằng tài khoản thủ quỹ, chọn một khoản cá nhân, xác nhận, kiểm tra khoản được cover ngay và không có notification tự gửi.

## Out Of Scope

- Không đưa thủ quỹ vào danh sách member cần thu.
- Không đổi hero tiến độ thu.
- Không đổi schema DB hoặc RPC.
- Không đổi quy tắc hoàn thành transaction.
