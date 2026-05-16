# Spliteasy - Data Shapes

Tài liệu này mô tả cấu trúc dữ liệu hiện tại, suy ra từ `src/store.jsx`, `src/data.jsx`, và các payload được gửi vào reducer. Thuật ngữ kỹ thuật được ghi kèm tiếng Anh trong ngoặc.

## 1. Cấu trúc trạng thái gốc (Initial State)

`buildInitialState()` trong `src/store.jsx` tạo state rỗng như sau:

```json
{
  "currentUserId": null,
  "currentUserName": null,
  "members": [],
  "groups": [],
  "pickle": {
    "sessions": [],
    "upcoming": [],
    "fixedMembers": [],
    "externalTickets": [],
    "monthlyCourtFee": 0,
    "guestFeePerSession": 0
  },
  "notifications": []
}
```

### Giải thích từng field

- `currentUserId`: ID của người dùng hiện tại (current user). Ban đầu là `null`; được set bởi action `SET_CURRENT_USER`.
- `currentUserName`: tên đầy đủ của người dùng hiện tại (current user name). Ban đầu là `null`; được trim trước khi lưu.
- `members`: danh sách thành viên (member collection). Mỗi phần tử là một `Member`.
- `groups`: danh sách nhóm chi tiêu (group collection). Mỗi phần tử là một `Group`.
- `pickle`: module con cho CLB pickleball (pickleball sub-state).
- `pickle.sessions`: danh sách buổi chơi đã diễn ra (past sessions). Mỗi phần tử là một `PickleSession`.
- `pickle.upcoming`: danh sách buổi sắp tới (upcoming sessions). Mỗi phần tử là một `UpcomingSession`.
- `pickle.fixedMembers`: danh sách ID thành viên cố định của CLB (fixed member IDs).
- `pickle.externalTickets`: danh sách vé lẻ ngoài lịch cố định (external ticket collection). Mỗi phần tử là một `ExternalTicket`.
- `pickle.monthlyCourtFee`: tổng phí thuê sân theo tháng (monthly court fee), đơn vị VND, kiểu `number`.
- `pickle.guestFeePerSession`: phí khách vãng lai mỗi buổi (guest fee per session), đơn vị VND, kiểu `number`.
- `notifications`: danh sách thông báo (notification collection). Hiện có trong initial state nhưng chưa có reducer đọc/ghi shape cụ thể.

## 2. Cấu trúc từng thực thể (Entity Shapes)

### Member (Thành viên)

`Member` được tạo từ `SET_CURRENT_USER` hoặc `ADD_MEMBER`.

Ví dụ JSON:

```json
{
  "id": "u_abc123",
  "name": "Nguyễn Văn An",
  "short": "An",
  "initials": "NV",
  "color": "#574EFA",
  "isMe": true
}
```

Field:

- `id`: định danh thành viên (member ID). `SET_CURRENT_USER` dùng `action.userId`; màn thêm thành viên tạo ID dạng `u_...`.
- `name`: tên đầy đủ đã trim.
- `short`: tên ngắn để hiển thị, hiện được lấy bằng từ cuối trong `name`.
- `initials`: chữ cái viết tắt, lấy ký tự đầu của mỗi từ, cắt tối đa 2 ký tự, viết hoa.
- `color`: màu đại diện (avatar/accent color), dạng hex string.
- `isMe`: cờ đánh dấu người dùng hiện tại (current-user flag). `SET_CURRENT_USER` set `true`; thành viên thêm thủ công set `false`.

Reducer behavior:

- `SET_CURRENT_USER`: nếu `members` chưa có `userId`, tạo thêm một `Member` mới; luôn set `currentUserId` và `currentUserName`.
- `ADD_MEMBER`: chỉ chống trùng theo `id`; không validate các field còn lại.

### Group (Nhóm chi tiêu)

`Group` được tạo bởi `ADD_GROUP`, sửa bởi `EDIT_GROUP`, xóa bởi `DELETE_GROUP`.

Ví dụ JSON:

```json
{
  "id": "lwm3c9mjx8f2a1b",
  "name": "Ăn trưa team",
  "emoji": "🎯",
  "color": "#574EFA",
  "members": ["u_me", "u_binh", "u_chi"],
  "expenses": [],
  "settlements": [],
  "createdAt": "2026-05-16T03:20:10.123Z"
}
```

Field:

- `id`: định danh nhóm (group ID), tạo bằng `genId()`.
- `name`: tên nhóm đã trim.
- `emoji`: biểu tượng hiển thị cho nhóm.
- `color`: màu nhóm, hiện mặc định `#574EFA`.
- `members`: mảng ID thành viên (member IDs) thuộc nhóm.
- `expenses`: mảng `Expense` của nhóm.
- `settlements`: mảng `Settlement` của nhóm.
- `createdAt`: thời điểm tạo (creation timestamp), dạng ISO string.

Reducer behavior:

- `ADD_GROUP`: append `action.group` vào `state.groups`.
- `EDIT_GROUP`: merge nông (shallow merge) `{ ...g, ...action.group }` theo `group.id`.
- `DELETE_GROUP`: remove group khỏi `state.groups`; không cleanup entity liên quan ở nơi khác.

### Expense (Chi tiêu)

`Expense` nằm trong `group.expenses`. Được tạo bởi `ADD_EXPENSE`, sửa bởi `EDIT_EXPENSE`, xóa bởi `DELETE_EXPENSE`.

Ví dụ JSON:

```json
{
  "id": "lwm3e6a7n0f1b2c3",
  "title": "Bún chả",
  "amount": 240000,
  "paidBy": "u_me",
  "participants": ["u_me", "u_binh", "u_chi"],
  "splits": [
    { "memberId": "u_me", "amount": 80000 },
    { "memberId": "u_binh", "amount": 80000 },
    { "memberId": "u_chi", "amount": 80000 }
  ],
  "splitMode": "equal",
  "date": "16/05",
  "cat": "food",
  "createdAt": "2026-05-16T03:25:12.456Z"
}
```

Khi edit, object có thêm:

```json
{
  "updatedAt": "2026-05-16T03:40:01.222Z"
}
```

Field:

- `id`: định danh chi tiêu (expense ID), tạo bằng `genId()`.
- `title`: tên chi tiêu đã trim.
- `amount`: số tiền, kiểu `number`, đơn vị VND.
- `paidBy`: ID thành viên đã trả tiền (payer member ID).
- `participants`: mảng ID thành viên tham gia chia tiền (participant member IDs).
- `splits`: mảng dòng chia tiền (split rows), mỗi dòng có `{ memberId, amount }`.
- `splitMode`: chế độ chia (split mode), hiện có `"equal"` hoặc `"custom"`.
- `date`: ngày hiển thị dạng `"DD/MM"`. UI chi tiết đang append thêm `/2026`.
- `cat`: danh mục chi tiêu (category), mặc định `"food"`.
- `createdAt`: thời điểm tạo, ISO string.
- `updatedAt`: thời điểm sửa, ISO string, chỉ có sau edit.

Logic tính tiền trong `data.jsx`:

- `getShareMap(e)` ưu tiên `e.splits` nếu có phần tử.
- Nếu không có `splits`, hàm chia đều bằng `splitEqual(e.amount, e.participants)`.
- `splitEqual` làm tròn `Math.round(amount / ids.length)` và đưa phần chênh lệch còn lại vào participant cuối.

Reducer behavior:

- `ADD_EXPENSE`: append `action.expense` vào `group.expenses` theo `groupId`.
- `EDIT_EXPENSE`: tìm group hiện đang chứa expense theo `expense.id`; nếu `groupId` mới khác group cũ, xóa ở group cũ và append vào group mới. Nếu không đổi group, replace expense theo `id`.
- `DELETE_EXPENSE`: filter expense theo `expenseId`.

### Settlement (Thanh toán bù trừ)

`Settlement` nằm trong `group.settlements`. Được tạo bởi `SETTLE_DEBT`.

Ví dụ JSON:

```json
{
  "id": "lwm3f8q0p9a8b7c6",
  "fromId": "u_me",
  "toId": "u_binh",
  "amount": 120000,
  "date": "16/05/2026"
}
```

Field:

- `id`: định danh thanh toán (settlement ID), tạo bằng `genId()`.
- `fromId`: ID người trả tiền (payer/source member ID).
- `toId`: ID người nhận tiền (receiver/destination member ID).
- `amount`: số tiền đã thanh toán, kiểu `number`, đơn vị VND.
- `date`: ngày xác nhận thanh toán, tạo bằng `new Date().toLocaleDateString('vi-VN')`.

Logic tính tiền trong `groupBalance(g, me)`:

- Nếu `settlement.fromId === me`, `bal[settlement.toId]` được cộng `amount`.
- Nếu `settlement.toId === me`, `bal[settlement.fromId]` bị trừ `amount`.
- Mục tiêu là đưa số dư giữa hai người về gần 0 sau khi đã trả tiền.

Reducer behavior:

- `SETTLE_DEBT`: append `action.settlement` vào `group.settlements`, có fallback `g.settlements || []`.

### PickleSession (Buổi chơi pickleball)

`PickleSession` nằm trong `pickle.sessions`, đại diện buổi đã diễn ra. Initial state không tạo sẵn session nào; reducer hiện chỉ sửa attendance và thêm expense vào session đã tồn tại.

Ví dụ JSON:

```json
{
  "id": "ps_2026_05_16_1900",
  "date": "16/05",
  "day": "T7",
  "time": "19:00",
  "court": "Sân A",
  "attendees": ["u_me", "u_binh", "u_chi"],
  "guests": ["Anh Minh"],
  "expenses": [
    {
      "id": "lwm3h1p2a3b4c5d6",
      "category": "ball",
      "title": "Bóng mới",
      "amount": 300000,
      "payerId": "u_me",
      "paidBy": "u_me",
      "createdAt": 1778895600000
    }
  ]
}
```

Field:

- `id`: định danh buổi chơi (session ID).
- `date`: ngày hiển thị, UI đang xử lý như `"DD/MM"`.
- `day`: thứ hiển thị, ví dụ `"T7"`.
- `time`: giờ chơi, ví dụ `"19:00"`.
- `court`: tên sân.
- `attendees`: mảng ID thành viên có mặt (attendee member IDs). Reducer `CONFIRM_ATTENDANCE` ghi vào field này.
- `attended`: alias cũ (legacy alias) của `attendees`. Một số code đọc `s.attendees || s.attended || []`.
- `guests`: mảng tên khách vãng lai (guest names), không phải member IDs.
- `expenses`: mảng chi phí phát sinh trong buổi (session expenses).

Session expense shape:

- `id`: định danh expense.
- `category`: loại chi phí, hiện có `"ball"`, `"drink"`, `"food"`.
- `title`: mô tả chi phí; nếu người dùng để trống thì bằng category.
- `amount`: số tiền, kiểu `number`, đơn vị VND.
- `payerId`: ID người trả.
- `paidBy`: alias/field song song với `payerId`.
- `createdAt`: timestamp number từ `Date.now()`.
- Legacy aliases đang được UI chấp nhận: `kind` thay cho `category`, `label` thay cho `title`, `paidBy` thay cho `payerId`.

Reducer behavior:

- `CONFIRM_ATTENDANCE`: thêm/xóa `memberId` trong `session.attendees`, dùng `Set` để chống trùng khi thêm.
- `ADD_PICKLE_EXPENSE`: append `action.expense` vào `session.expenses`, có fallback `s.expenses || []`.

Logic tính tiền trong `pickleSummary(pickle)`:

- Phí sân tháng chia đều cho `pickle.fixedMembers`.
- Doanh thu khách = tổng số `session.guests` * `guestFeePerSession`, rồi chia đều lại cho fixed members.
- Session expenses chia đều cho `s.attendees || s.attended || []`.
- Người trả expense được cộng `amount`; mỗi người có mặt bị trừ phần chia đều.

### UpcomingSession (Buổi sắp tới)

`UpcomingSession` nằm trong `pickle.upcoming`. Reducer hiện chỉ toggle danh sách người sẽ đi.

Ví dụ JSON:

```json
{
  "id": "ups_2026_05_18_1900",
  "date": "18/05",
  "day": "T2",
  "time": "19:00",
  "court": "Sân B",
  "going": ["u_me", "u_binh"]
}
```

Field:

- `id`: định danh buổi sắp tới (upcoming session ID).
- `date`: ngày hiển thị, UI đang xử lý như `"DD/MM"`.
- `day`: thứ hiển thị.
- `time`: giờ chơi.
- `court`: tên sân.
- `going`: mảng ID thành viên đang chọn tham gia (going member IDs).

Reducer behavior:

- `TOGGLE_UPCOMING`: nếu `memberId` đã có trong `going` thì xóa; nếu chưa có thì thêm vào bằng `Set` để chống trùng.

Ghi chú:

- Màn chi tiết session gom `pickle.sessions` và `pickle.upcoming` thành `allSessions`.
- Với upcoming, detail dùng `s.attendees || s.attended || s.going || []`, nên `going` đóng vai trò attendance tạm thời khi xem chi tiết.

### ExternalTicket (Vé lẻ bên ngoài)

`ExternalTicket` nằm trong `pickle.externalTickets`, đại diện buổi chơi tự phát ngoài lịch cố định. UI cũng đọc legacy `pickle.external`.

Ví dụ JSON:

```json
{
  "id": "lwm3k9z8y7x6w5v4",
  "date": "16/05",
  "label": "Sân Nguyễn Khoái",
  "amount": 400000,
  "paidBy": "u_me",
  "participants": ["u_me", "u_binh", "u_chi", "u_dung"],
  "createdAt": 1778895900000
}
```

Field:

- `id`: định danh vé lẻ (external ticket ID), tạo bằng `genId()`.
- `date`: ngày tạo dạng `"DD/MM"`, tạo bằng `toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })`.
- `label`: tên sân/địa điểm.
- `amount`: tổng tiền, kiểu `number`, đơn vị VND.
- `paidBy`: ID thành viên đã trả.
- `participants`: mảng ID thành viên tham gia chia tiền.
- `createdAt`: timestamp number từ `Date.now()`.

Reducer behavior:

- `ADD_EXTERNAL_TICKET`: append `action.ticket` vào `pickle.externalTickets`, có fallback `state.pickle.externalTickets || []`.

Logic hiển thị:

- UI tính `per = Math.round(amount / participants.length)`.
- Không lưu `splits`; toàn bộ vé lẻ đang được xem là chia đều.

## 3. Cơ chế lưu trữ (Storage Mechanism)

### Key localStorage

State được lưu vào localStorage với key:

```js
const STORAGE_KEY = 'spliteasy_v3_state';
```

### Khi nào tải (load)

State được tải trong initializer của `useReducer`:

```js
useReducer(appReducer, undefined, () => loadState() || buildInitialState())
```

Quy trình:

1. `loadState()` đọc `localStorage.getItem('spliteasy_v3_state')`.
2. Nếu không có raw data, return `null`.
3. Nếu có raw data, `JSON.parse(raw)`.
4. Nếu parse lỗi, log warning và return `null`.
5. Nếu `loadState()` return `null`, app dùng `buildInitialState()`.

### Khi nào lưu (save)

`AppProvider` có effect:

```js
useEffect(() => {
  saveState(state);
}, [state]);
```

Mỗi lần `state` thay đổi, `saveState(state)` ghi:

```js
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
```

Nếu localStorage đầy hoặc ghi lỗi, catch rỗng và bỏ qua. App không báo lỗi cho user.

### Migration guard hiện có

Chỉ có một guard trong `loadState()`:

```js
if (s && s.pickle == null) {
  s.pickle = buildInitialState().pickle;
}
```

Ý nghĩa:

- Nếu save cũ có `pickle: null`, hoặc thiếu `pickle` (`undefined == null`), app sẽ gán `pickle` bằng default pickle state.
- Guard này chỉ bảo vệ root `pickle` khi nó null/undefined.
- Không có schema version (data schema version) riêng trong state.
- Không merge defaults sau khi load.

### Các field chưa có migration guard

Nếu thêm field mới vào `buildInitialState()` hoặc thêm field bắt buộc vào entity, dữ liệu cũ trong localStorage sẽ không tự động có field đó.

Root state chưa có guard:

- `currentUserId`
- `currentUserName`
- `members`
- `groups`
- `notifications`

Pickle sub-state chưa có deep guard nếu `pickle` là object nhưng thiếu field:

- `pickle.sessions`
- `pickle.upcoming`
- `pickle.fixedMembers`
- `pickle.externalTickets`
- `pickle.monthlyCourtFee`
- `pickle.guestFeePerSession`

Group chưa có guard:

- `group.name`
- `group.emoji`
- `group.color`
- `group.members`
- `group.expenses`
- `group.settlements`
- `group.createdAt`

Expense chưa có guard:

- `expense.title`
- `expense.amount`
- `expense.paidBy`
- `expense.participants`
- `expense.splits`
- `expense.splitMode`
- `expense.date`
- `expense.cat`
- `expense.createdAt`
- `expense.updatedAt`

Settlement chưa có guard:

- `settlement.fromId`
- `settlement.toId`
- `settlement.amount`
- `settlement.date`

PickleSession chưa có guard:

- `session.date`
- `session.day`
- `session.time`
- `session.court`
- `session.attendees`
- `session.attended`
- `session.guests`
- `session.expenses`

UpcomingSession chưa có guard:

- `upcoming.date`
- `upcoming.day`
- `upcoming.time`
- `upcoming.court`
- `upcoming.going`

ExternalTicket chưa có guard:

- `ticket.date`
- `ticket.label`
- `ticket.amount`
- `ticket.paidBy`
- `ticket.participants`
- `ticket.createdAt`

## 4. Rủi ro dữ liệu (Data Risks)

1. Migration hiện quá mỏng (thin migration). App chỉ guard `pickle == null`, không deep-merge default state. Save cũ có `pickle: {}` vẫn vượt qua migration nhưng UI có thể crash khi gọi `pickle.sessions.length`, `pickle.upcoming.map`, hoặc `pickle.fixedMembers.length`.

2. Không có schema version (schema version). `STORAGE_KEY` là `spliteasy_v3_state`, nhưng bên trong state không có `version`. Khi thay đổi data shape, app không biết dữ liệu cũ đang ở version nào để migrate có điều kiện.

3. Reducer tin payload tuyệt đối (unvalidated action payload). `ADD_GROUP`, `ADD_EXPENSE`, `ADD_EXTERNAL_TICKET` append thẳng object từ action. Nếu payload thiếu field bắt buộc, state vẫn bị lưu xuống localStorage.

4. `ADD_EXPENSE` giả định `group.expenses` tồn tại. Code dùng `[...g.expenses, action.expense]`; nếu group cũ thiếu `expenses`, action này sẽ throw.

5. Nhiều helper giả định field bắt buộc tồn tại. `groupBalance` lặp qua `g.members` và `g.expenses`; `recentActivity` lặp qua `g.expenses`; một số màn hình dùng `e.participants.includes(...)`. Dữ liệu cũ thiếu array sẽ gây lỗi runtime.

6. Tên field không nhất quán (field alias drift). Pickle session đọc cả `attendees` và `attended`; session expense đọc `category`/`kind`, `title`/`label`, `payerId`/`paidBy`; external tickets đọc cả `pickle.external` và `pickle.externalTickets`. Nếu ghi mới vào một alias nhưng màn hình khác đọc alias còn lại, dữ liệu có thể hiển thị sai.

7. Format ngày không thống nhất (date format inconsistency). `Expense.date` là `"DD/MM"`; `Settlement.date` là locale date có năm; `ExternalTicket.date` là `"DD/MM"`; `createdAt` của group/expense là ISO string, trong khi pickle expense/external ticket dùng timestamp number. Sắp xếp, filter theo tháng, hoặc migrate ngày sau này sẽ dễ vỡ.

8. Custom split không được tất cả UI tôn trọng. `data.jsx` tính balance theo `expense.splits`, nhưng một số màn hình vẫn tính `per = Math.round(amount / participants.length)` và hiển thị "chia đều". Expense custom có thể đúng về balance nhưng sai về hiển thị chi tiết/thống kê.

9. Làm tròn chia tiền có phần lẻ (rounding remainder). `splitEqual` đưa phần chênh lệch vào participant cuối, nhưng các màn hình tính `Math.round(amount / participants.length)` riêng có thể không bằng tổng `splits`.

10. Thiếu ràng buộc tham chiếu (referential integrity). `groups.members`, `expense.paidBy`, `expense.participants`, `pickle.fixedMembers`, `session.attendees`, `ticket.participants` đều là member IDs nhưng không có check member có tồn tại trong `state.members`.

11. `SET_CURRENT_USER` không update member đã tồn tại. Nếu `userId` đã có trong `members`, action chỉ set `currentUserId/currentUserName`, không cập nhật `name`, `short`, `initials`, `color`, `isMe` của member cũ.

12. `EDIT_GROUP` là shallow merge. Payload có field `expenses`, `settlements`, hoặc field `undefined` có thể ghi đè dữ liệu cũ nếu caller truyền sai.

13. `EDIT_EXPENSE` khi move group có thể append duplicate nếu destination đã có expense cùng `id` do dữ liệu trước đó bị lỗi. Reducer không filter duplicate ở group đích.

14. Xóa group là xóa cùng mọi expense/settlement trong group. Không có archive, undo, hay soft delete; localStorage sẽ bị ghi đè ngay sau state change.

15. Pickle module thiếu action tạo/sửa session và cấu hình phí. `monthlyCourtFee`, `guestFeePerSession`, `sessions`, `upcoming` phải đến từ persisted data hoặc code khác. Nếu không có seed/migration, module pickle mặc định rỗng và nhiều logic tính tiền cho ra 0.

16. `pickle.sessions.length === 0` có thể tạo giá trị hiển thị lỗi. Màn thành viên tính width bằng `(attendedCount / pickle.sessions.length) * 100`, có nguy cơ `Infinity`/`NaN` khi chưa có session.

17. Save lỗi bị nuốt im lặng (silent persistence failure). `saveState` catch rỗng khi localStorage đầy/bị chặn, nên user có thể tưởng đã lưu nhưng reload sẽ mất dữ liệu.

18. Parse lỗi localStorage làm mất state đang lưu. Nếu JSON trong localStorage hỏng, `loadState()` return `null` và app khởi tạo state rỗng. Lần save kế tiếp có thể ghi đè state rỗng lên key cũ.

19. `notifications` có trong state nhưng chưa có documented entity/reducer. Thêm tính năng thông báo sau này dễ bị thiếu migration vì field này hiện là mảng rỗng không shape.

20. Không có normalisation riêng cho entity (normalized store). Expense/settlement lồng trong group; pickle expense lồng trong session. Khi cần query toàn cục, move entity, hoặc cleanup member ID, code phải duyệt sâu và dễ bỏ sót.
