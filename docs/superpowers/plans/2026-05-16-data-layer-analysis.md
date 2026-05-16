# Bóc Tách Tầng Dữ Liệu (Data Layer Analysis) — Kế Hoạch Thực Thi

> **Dành cho agent thực thi:** Dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để thực thi từng task theo thứ tự. Mỗi bước dùng checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu (Goal):** Hiểu toàn bộ cách app SpliteasyBoss lưu trữ, tính toán và truyền dữ liệu — từ đó xây nền tảng để cải thiện logic và giao diện sau này.

**Kiến trúc tổng quan (Architecture):** App dùng mô hình React Context + useReducer làm kho trạng thái trung tâm (state store), lưu xuống bộ nhớ trình duyệt (localStorage) mỗi khi có thay đổi. Tầng tính toán (computation layer) là các hàm thuần túy (pure functions) trong `data.jsx`, được gắn vào `window` để dùng toàn cục.

**Công nghệ (Tech Stack):** React 18 (CDN), Babel Standalone, localStorage, không có build tool

---

## Sơ đồ file liên quan (File Map)

| File | Vai trò |
|------|---------|
| `src/store.jsx` | Kho trạng thái trung tâm (state store) — định nghĩa cấu trúc dữ liệu, các hành động (actions), và đồng bộ localStorage |
| `src/data.jsx` | Tầng tính toán (computation layer) — hàm tính tiền, chia tiền, tổng hợp dữ liệu |
| `src/app.jsx` | Điểm vào (entry point) — bọc toàn app trong `AppProvider`, điều hướng màn hình |
| `src/screen-home.jsx` | Màn hình chính — đọc dữ liệu qua `useApp()`, hiển thị số dư (balance) |
| `src/screen-groups.jsx` | Màn hình nhóm — đọc `state.groups`, hiển thị chi tiêu |
| `src/screen-pickleball.jsx` | Màn hình pickleball — đọc `state.pickle`, gọi `pickleSummary()` |
| `src/screen-profile.jsx` | Màn hình hồ sơ — đọc `state.members`, `state.groups` |

---

## Task 1: Bóc tách cấu trúc dữ liệu (Data Shapes)

**Mục tiêu:** Biết chính xác app lưu những gì trong bộ nhớ — từng trường dữ liệu (field) có nghĩa gì.

**Files đọc:** `src/store.jsx` (hàm `buildInitialState`)

- [ ] **Bước 1.1: Đọc và vẽ sơ đồ trạng thái gốc (initial state)**

  Codex đọc `buildInitialState()` trong `store.jsx` và liệt kê đầy đủ:

  ```
  State gốc của app:
  {
    currentUserId: null           ← ID người dùng hiện tại
    currentUserName: null         ← Tên người dùng
    members: []                   ← Danh sách thành viên
    groups: []                    ← Danh sách nhóm chi tiêu
    pickle: {
      sessions: []                ← Các buổi chơi đã diễn ra
      upcoming: []                ← Buổi chơi sắp tới
      fixedMembers: []            ← Thành viên cố định CLB
      externalTickets: []         ← Vé lẻ bên ngoài
      monthlyCourtFee: 0          ← Phí sân tháng
      guestFeePerSession: 0       ← Phí khách mỗi buổi
    }
    notifications: []             ← Thông báo
  }
  ```

- [ ] **Bước 1.2: Bóc tách cấu trúc từng thực thể (entity shape)**

  Codex đọc `appReducer` trong `store.jsx` để suy ra cấu trúc của từng object. Kết quả cần đạt:

  **Member (Thành viên):**
  ```js
  {
    id: string,       // ID duy nhất
    name: string,     // Tên đầy đủ
    short: string,    // Tên ngắn (họ hoặc tên)
    initials: string, // Chữ viết tắt (tối đa 2 ký tự)
    color: string,    // Màu avatar (hex)
    isMe: boolean     // Có phải người dùng hiện tại không
  }
  ```

  **Group (Nhóm chi tiêu):**
  ```js
  {
    id: string,
    name: string,
    emoji: string,
    color: string,
    members: [memberId],   // Danh sách ID thành viên
    expenses: [Expense],   // Danh sách chi tiêu
    settlements: [Settlement] // Danh sách thanh toán bù trừ
  }
  ```

  **Expense (Chi tiêu):**
  ```js
  {
    id: string,
    amount: number,        // Số tiền (VND)
    description: string,   // Mô tả
    paidBy: memberId,      // Ai trả
    participants: [memberId], // Ai tham gia
    splits: [             // Tùy chọn: chia không đều
      { memberId, amount }
    ],
    date: string
  }
  ```

  **Settlement (Thanh toán bù trừ):**
  ```js
  {
    id: string,
    fromId: memberId,  // Ai trả
    toId: memberId,    // Trả cho ai
    amount: number,
    date: string
  }
  ```

  **PickleSession (Buổi chơi pickleball):**
  ```js
  {
    id: string,
    date: string,
    attendees: [memberId],   // Người thực sự đến
    guests: [],              // Khách
    expenses: [             // Chi tiêu trong buổi
      { id, amount, payerId, description }
    ]
  }
  ```

- [ ] **Bước 1.3: Ghi kết quả vào file tài liệu**

  Tạo file `docs/data-shapes.md` với toàn bộ sơ đồ cấu trúc trên.

---

## Task 2: Hiểu cơ chế lưu trữ (Storage Mechanism)

**Mục tiêu:** Biết dữ liệu được lưu và tải lại như thế nào — khi nào mất dữ liệu, khi nào bị lỗi.

**Files đọc:** `src/store.jsx` (hàm `loadState`, `saveState`, `AppProvider`)

- [ ] **Bước 2.1: Vẽ luồng lưu trữ (storage flow)**

  Codex đọc và mô tả:
  - Key lưu trong localStorage: `spliteasy_v3_state`
  - Khi nào lưu: mỗi lần `state` thay đổi (qua `useEffect`)
  - Khi nào tải: lần đầu app khởi động (lazy initializer của `useReducer`)
  - Xử lý lỗi: nếu JSON lỗi → trả về `null` → dùng `buildInitialState()`

- [ ] **Bước 2.2: Kiểm tra migration dữ liệu cũ (data migration)**

  Trong `loadState()` có đoạn:
  ```js
  if (s && s.pickle == null) {
    s.pickle = buildInitialState().pickle;
  }
  ```
  Codex xác nhận: đây là bản vá (patch) cho dữ liệu cũ bị lưu `pickle: null`.
  Liệt kê các field nào **chưa có migration guard** — tức là nếu thêm field mới vào `buildInitialState()` thì dữ liệu cũ sẽ thiếu field đó và có thể gây lỗi.

- [ ] **Bước 2.3: Ghi rủi ro vào file tài liệu**

  Thêm vào `docs/data-shapes.md` một mục "Rủi ro dữ liệu (Data Risks)" liệt kê các điểm dễ vỡ.

---

## Task 3: Hiểu tầng tính toán (Computation Layer)

**Mục tiêu:** Biết các hàm tính tiền hoạt động như thế nào — đúng chưa, có edge case nào không.

**Files đọc:** `src/data.jsx`

- [ ] **Bước 3.1: Bóc tách từng hàm tính toán**

  Codex đọc và giải thích bằng tiếng Việt từng hàm:

  | Hàm | Đầu vào | Đầu ra | Logic |
  |-----|---------|--------|-------|
  | `fmtVND(n)` | Số tiền (number) | Chuỗi rút gọn | < 1000 → "₫", < 1tr → "500k", ≥ 1tr → "1.5 tr" |
  | `fmtVNDFull(n)` | Số tiền | Chuỗi đầy đủ | "1.500.000 ₫" |
  | `getMemberMap(members)` | Mảng members | Object {id: member} | Để tra cứu nhanh theo ID |
  | `splitEqual(amount, ids)` | Tổng tiền + danh sách ID | Mảng splits | Chia đều, người cuối gánh phần lẻ |
  | `getShareMap(expense)` | Expense object | {memberId: amount} | Dùng `splits` tùy chỉnh hoặc chia đều |
  | `groupBalance(group, me)` | Nhóm + ID tôi | {memberId: ±amount} | Dương = họ nợ tôi, Âm = tôi nợ họ |
  | `groupNet(group, me)` | Nhóm + ID tôi | Số dư ròng (number) | Tổng tất cả balance trong nhóm |
  | `totalBalances(groups, me)` | Nhiều nhóm + ID tôi | {memberId: ±amount} | Tổng hợp balance qua tất cả nhóm |
  | `recentActivity(groups, limit)` | Mảng nhóm | Mảng chi tiêu gần đây | Gộp expenses của tất cả nhóm, lấy N cái đầu |
  | `pickleSummary(pickle)` | Dữ liệu pickle | Tổng kết tài chính tháng | Tính phí sân + doanh thu khách + chi phí buổi |

- [ ] **Bước 3.2: Tìm edge cases (trường hợp biên) và lỗi tiềm ẩn**

  Codex kiểm tra từng hàm và ghi nhận:
  - `splitEqual`: nếu `ids` rỗng → chia 0 → `NaN`. **Chưa có guard.**
  - `groupBalance`: nếu `e.participants` undefined → `e.participants.includes(me)` crash. Đã có `if (!e.participants || e.participants.length === 0) continue` nhưng chỉ check length.
  - `pickleSummary`: dùng `s.attendees || s.attended` — có 2 tên field khác nhau cho cùng khái niệm (dữ liệu không nhất quán).
  - `recentActivity`: sắp xếp theo thứ tự thêm vào (không theo ngày) — activity feed không đúng thứ tự thời gian.

- [ ] **Bước 3.3: Ghi kết quả vào tài liệu**

  Tạo `docs/computation-layer.md` với bảng hàm và danh sách edge cases.

---

## Task 4: Vẽ luồng dữ liệu giữa các màn hình (Screen Data Flow)

**Mục tiêu:** Biết màn hình nào đọc dữ liệu gì từ store, và dùng hàm tính toán nào.

**Files đọc:** `src/screen-home.jsx`, `src/screen-groups.jsx`, `src/screen-pickleball.jsx`, `src/screen-profile.jsx`

- [ ] **Bước 4.1: Đọc từng màn hình, ghi nhận `useApp()` lấy gì**

  Codex đọc phần đầu mỗi file screen và liệt kê:

  **screen-home.jsx:**
  ```
  const { state, dispatch } = useApp()
  Đọc: state.groups, state.members, state.currentUserId
  Tính: totalBalances(groups, me), groupNet(g, me), recentActivity(groups)
  ```

  **screen-groups.jsx:**
  ```
  Đọc: state.groups, state.members
  Tính: groupBalance(g, me), groupNet(g, me)
  ```

  **screen-pickleball.jsx:**
  ```
  Đọc: state.pickle, state.members
  Tính: pickleSummary(pickle), getMemberMap(members)
  ```

  **screen-profile.jsx:**
  ```
  Đọc: state.currentUserId, state.members, state.groups
  Tính: totalBalances(groups, me)
  ```

- [ ] **Bước 4.2: Vẽ sơ đồ luồng dữ liệu tổng thể**

  Tạo sơ đồ dạng text:

  ```
  localStorage
      │
      ▼
  AppProvider (store.jsx)
      │  state = { members, groups, pickle, ... }
      │
      ├──► screen-home     ──► totalBalances, groupNet, recentActivity
      ├──► screen-groups   ──► groupBalance, groupNet
      ├──► screen-pickle   ──► pickleSummary, getMemberMap
      └──► screen-profile  ──► totalBalances
  ```

- [ ] **Bước 4.3: Lưu sơ đồ vào tài liệu**

  Tạo `docs/data-flow.md` với sơ đồ và mô tả từng màn hình.

---

## Task 5: Tổng kết và đánh giá rủi ro (Summary & Risk Assessment)

**Mục tiêu:** Có cái nhìn tổng thể để quyết định ưu tiên sửa gì trước.

- [ ] **Bước 5.1: Tổng hợp vào `docs/phase1-summary.md`**

  Nội dung cần có:
  - Sơ đồ kiến trúc dữ liệu tổng thể
  - Danh sách lỗi tiềm ẩn (bugs) theo mức độ ưu tiên
  - Danh sách dữ liệu không nhất quán (inconsistencies) cần chuẩn hóa
  - Đề xuất cải thiện cho Phase tiếp theo

- [ ] **Bước 5.2: Danh sách ưu tiên sửa lỗi**

  | Mức độ | Vấn đề | File | Tác động |
  |--------|--------|------|----------|
  | Cao | `splitEqual` không guard `ids.length === 0` | `data.jsx` | Crash khi tạo chi tiêu không có người tham gia |
  | Cao | `recentActivity` không sort theo ngày | `data.jsx` | Feed hiển thị sai thứ tự |
  | Trung bình | `s.attendees \|\| s.attended` — 2 tên cho 1 field | `data.jsx`, `store.jsx` | Dữ liệu không nhất quán |
  | Trung bình | Thiếu migration guard cho các field mới | `store.jsx` | Dữ liệu cũ gây crash khi nâng cấp |
  | Thấp | Hàm toàn cục qua `window` | `data.jsx` | Khó test, dễ xung đột tên |

---

## Phân công thực thi (Execution Assignment)

| Task | Ai làm | Phương thức |
|------|--------|-------------|
| Task 1–4: Đọc file, phân tích | **Codex** | `mcp__codex__codex` với `sandbox: read-only` |
| Task 5: Tổng kết, đánh giá | **Claude** | Tổng hợp từ output của Codex |
| Viết tài liệu (docs/*.md) | **Codex** | `sandbox: workspace-write` |
| Review tài liệu cuối | **Claude** | Đọc và xác nhận |
| Commit kết quả | **Claude** | `git add docs/ && git commit` |
