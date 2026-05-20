# Home Enhancement — Personal Balance + "Của tôi" Filter Design

## Goal

Thêm thông tin cá nhân vào Home screen: banner balance ngắn gọn (net + owe/owed) và nút filter "Của tôi" để xem nhanh chi tiêu liên quan đến mình.

## Architecture

Thêm 2 thứ vào `src/screens/Home.jsx`:
1. `PersonalBalance` component — banner 3 dòng trên filter bar
2. Nút "Của tôi" trong filter bar — filter expenses theo currentUserId

Không tạo file mới. Không tạo screen mới.

## Components

### 1. PersonalBalance Banner

Vị trí: ngay trên filter bar, dưới header.

**Data computation** (tính trong component từ props):
```
expenses = props.expenses (filtered theo tháng hiện tại)
currentUserId = props.currentUserId

owed = sum của các khoản người khác nợ mình:
  → expenses where payer_id === currentUserId
  → sum(expense.amount - split_amount_of_currentUser)
  → hoặc đơn giản hơn: sum(expense.amount) where payer_id === currentUserId, trừ phần mình chịu

owes = sum các khoản mình nợ người khác:
  → expenses where payer_id !== currentUserId AND currentUserId in splits
  → sum(split_amount của currentUserId trong expense đó)

net = owed - owes
```

**Hiển thị:**
```
[Tên thành viên]
+250,000đ          ← net, màu emerald nếu dương / đỏ nếu âm / xám nếu = 0
Nợ: 180,000đ · Được nợ: 430,000đ   ← 2 số nhỏ, màu xám
```

Style: background `#1e293b`, border-radius 8px, padding 12px 16px, margin dưới 8px.

### 2. Filter "Của tôi"

Thêm option "Của tôi" vào filter bar hiện có (bên cạnh "Tất cả" / tháng).

Khi active:
- Chỉ hiển thị expenses mà `payer_id === currentUserId` HOẶC `currentUserId` xuất hiện trong `splits` (nếu có split data)
- Nếu splits chưa có trong data shape → đơn giản hơn: chỉ filter `payer_id === currentUserId`

Filter này độc lập với month filter — có thể dùng đồng thời.

## Data Shape

Spec này phụ thuộc vào data shape hiện có. Codex cần kiểm tra `src/hooks/useScreenData.js` hàm `buildHomeData` để biết chính xác:
- `expense.payer_id` hay `expense.created_by`?
- `expense.splits` có tồn tại không?
- `currentUserId` được pass vào Home như thế nào?

Codex điều chỉnh computation logic cho phù hợp với data shape thực tế.

## Constraints

- Chỉ sửa `src/screens/Home.jsx` — không tạo file mới
- Balance tính theo tháng đang filter (đồng bộ với month filter)
- Nếu chưa login (không có currentUserId) → không render PersonalBalance
- Format số: `toLocaleString('vi-VN')` + `đ`

## Out of Scope

- Settlement flow từ banner (bấm vào để settle — feature sau)
- Balance tích lũy nhiều tháng
- "Ai nợ ai" chi tiết theo tên người (chỉ show tổng owe/owed)
