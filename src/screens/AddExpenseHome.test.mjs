import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const addExpenseSource = readFileSync(new URL('./AddExpense.jsx', import.meta.url), 'utf8');
const groupDetailSource = readFileSync(new URL('./GroupDetail.jsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
const expenseDetailSource = readFileSync(new URL('./ExpenseDetail.jsx', import.meta.url), 'utf8');
const memberBillShareSource = readFileSync(new URL('./MemberBillShare.jsx', import.meta.url), 'utf8');
const settleAllSource = readFileSync(new URL('./SettleAll.jsx', import.meta.url), 'utf8');
const screenDataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');
const primitivesSource = readFileSync(new URL('../primitives.jsx', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../store.jsx', import.meta.url), 'utf8');

test('AddExpense defaults to the logged-in member and submits edit expense ids', () => {
  assert.match(addExpenseSource, /const editExpense = d\.editExpense/);
  assert.match(addExpenseSource, /useState\(\(\) => editExpense\?\.paidBy \?\? selectedGroup\.currentMemberId \?\? selectedMembers\[0\]\?\.id \?\? ''\)/);
  assert.match(addExpenseSource, /<h1[\s\S]*\{editExpense \? 'Sửa chi tiêu' : 'Thêm chi tiêu'\}/);
  assert.match(addExpenseSource, /expenseId: editExpense\?\.id/);
  assert.match(addExpenseSource, /Chia trong nhóm · \{selectedGroup\.memberCount \|\| \(selectedGroup\.members \|\| \[\]\)\.length\} thành viên/);
  assert.match(addExpenseSource, /\{selectedGroup\.emoji \|\| selectedGroup\.groupEmoji \|\| '👥'\}/);
});

test('AddExpense lets new expenses switch between expense groups without using pickleball groups', () => {
  assert.match(addExpenseSource, /const groupOptions = d\.groupOptions \|\| \[/);
  assert.match(addExpenseSource, /const \[selectedGroupId, setSelectedGroupId\] = useState\(\(\) => editExpense\?\.groupId \|\| d\.groupId \|\| groupOptions\[0\]\?\.id \|\| ''\)/);
  assert.match(addExpenseSource, /const selectedGroup = groupOptions\.find\(group => String\(group\.id\) === String\(selectedGroupId\)\) \|\| groupOptions\[0\] \|\| d/);
  assert.match(addExpenseSource, /onChange=\{event => setSelectedGroupId\(event\.target\.value\)\}/);
  assert.match(addExpenseSource, /groupId: editExpense\?\.groupId \|\| selectedGroup\.id/);
  assert.match(screenDataSource, /groupOptions: expenseGroups\.map\(group => buildAddExpenseGroupOption\(state, group\)\)/);
  assert.match(screenDataSource, /const expenseGroups = safeArray\(state\?\.groups\)[\s\S]*groupKind\(group\) !== 'pickleball'/);
});

test('AddExpense excludes archived groups from new expense options', () => {
  assert.match(
    screenDataSource,
    /const expenseGroups = safeArray\(state\?\.groups\)[\s\S]*groupKind\(group\) !== 'pickleball'[\s\S]*!\(group\.archivedAt \|\| group\.archived_at\)/,
  );
});

test('AddExpense empty amount keeps the zero placeholder visually centered', () => {
  assert.match(addExpenseSource, /const amountInputWidth = amount \? 220 : 54/);
  assert.match(addExpenseSource, /width: amountInputWidth/);
  assert.match(addExpenseSource, /textAlign: amount \? 'right' : 'center'/);
});

test('AddExpense uses scroll date picker and supports receipt image previews', () => {
  assert.match(addExpenseSource, /const \[datePickerOpen, setDatePickerOpen\] = useState\(false\)/);
  assert.match(addExpenseSource, /function DateScrollPicker\(\{ value, onChange, onClose \}\)/);
  assert.match(addExpenseSource, /const years = Array\.from\(\{ length: 7 \}/);
  assert.match(addExpenseSource, /overflowY: 'auto'/);
  assert.match(addExpenseSource, /setDatePickerOpen\(true\)/);
  assert.match(addExpenseSource, /function ReceiptImages\(\{ images, onAdd, onRemove \}\)/);
  assert.match(addExpenseSource, /accept="image\/\*"/);
  assert.match(addExpenseSource, /readImageDataUrl\(file\)/);
  assert.match(addExpenseSource, /reader\.readAsDataURL\(file\)/);
  assert.match(addExpenseSource, /receiptImages/);
  assert.match(appSource, /p_receipt_images: expense\.receiptImages/);
  assert.match(storeSource, /receiptImages: normalizeReceiptImages\(e\.receipt_images\)/);
  assert.match(storeSource, /receipt_images: normalizeReceiptImages\(expense\.receiptImages\)/);
});

test('GroupDetail menu, balances, and members tabs render real group data', () => {
  assert.match(groupDetailSource, /onAction\?\.\('addExpense', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /onAction\?\.\('settleAll'\)/);
  assert.match(groupDetailSource, />💳 Thanh toán hết nợ<\/Button>/);
  assert.match(groupDetailSource, /Thanh toán cho tất cả các tháng còn nợ đến hiện tại\./);
  assert.match(groupDetailSource, /function MonthBreakdown\(\{ rows \}\)/);
  assert.doesNotMatch(groupDetailSource, /⚡ Tất toán/);
  assert.doesNotMatch(groupDetailSource, /Gửi bill tháng/);
  assert.doesNotMatch(groupDetailSource, /Chốt sổ tháng/);
  assert.doesNotMatch(groupDetailSource, /onAction\?\.\('closeMonth', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /<GroupManagementPanel/);
  assert.match(groupDetailSource, /inviteCode=\{d\.inviteCode\}/);
  assert.match(groupDetailSource, /Sửa thông tin nhóm/);
  assert.match(groupDetailSource, /Chia sẻ link mời/);
  assert.match(groupDetailSource, /Sao chép/);
  assert.match(groupDetailSource, /gridTemplateColumns: 'auto minmax\(0, 1fr\) auto'/);
  assert.match(groupDetailSource, /onCopyInviteCode=\{\(\) => onAction\?\.\('copyInviteCode', \{ inviteCode: d\.inviteCode \}\)\}/);
  assert.doesNotMatch(groupDetailSource, /⌨ Mã mời thủ công/);
  assert.match(groupDetailSource, /const canManageGroup = Boolean\(isTreasurer \|\| d\.isGroupCreator\)/);
  assert.match(groupDetailSource, /\{canManageGroup \? <IconButton onClick=\{\(\) => setEditingGroup\(true\)\}>✎<\/IconButton> : <div style=\{\{ width: 44 \}\} \/>\}/);
  assert.match(groupDetailSource, /const \[deleteConfirmGroup, setDeleteConfirmGroup\] = useState\(false\)/);
  assert.match(groupDetailSource, />🗑️ Xóa nhóm<\/ActionButton>/);
  assert.doesNotMatch(groupDetailSource, /setMenuOpen/);
  assert.match(groupDetailSource, /onAction\?\.\('editGroup'/);
  assert.match(groupDetailSource, /onShare=\{\(\) => onAction\?\.\('createGroupInviteShare', \{ groupId: d\.id, inviteCode: d\.inviteCode \}\)\}/);
  assert.match(groupDetailSource, /action=\{<div[\s\S]*\{d\.emoji \|\| '👥'\}/);
  assert.match(groupDetailSource, /onAction\?\.\('deleteGroup', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /<BottomSheet title="Xóa nhóm\?"/);
  assert.match(groupDetailSource, /setDeleteConfirmGroup\(true\)/);
  assert.doesNotMatch(groupDetailSource, /window\.confirm\(`Xóa nhóm \$\{d\.name\}/);
  assert.doesNotMatch(groupDetailSource, /\{ key: 'balances', label: 'Số dư' \}/);
  assert.doesNotMatch(groupDetailSource, /activeTab === 'balances'/);
  assert.doesNotMatch(groupDetailSource, /d\.balanceLabel/);
  assert.doesNotMatch(groupDetailSource, /label="Số dư"/);
  assert.doesNotMatch(groupDetailSource, /onAction\?\.\('addExpense', \{ groupId: d\.id \}\)\}>\s*<span>＋<\/span> Thêm/);
  assert.match(groupDetailSource, /const heroBalanceLabel = d\.balance > 0 \? 'Bạn cần thu' : d\.balance < 0 \? 'Bạn cần nộp' : 'Bạn đã cân bằng'/);
  assert.match(groupDetailSource, /<SummaryChipRow[\s\S]*memberCount=\{d\.memberCount \|\| \(d\.members \|\| \[\]\)\.length\}[\s\S]*expenseCount=\{d\.expenseCount \|\| 0\}[\s\S]*totalSpent=\{d\.totalSpent \|\| 0\}/);
  assert.match(groupDetailSource, /function SummaryChipRow/);
  assert.doesNotMatch(groupDetailSource, /<GroupSummaryCard/);
  assert.doesNotMatch(groupDetailSource, /function GroupSummaryCard/);
  assert.match(groupDetailSource, /Thành viên/);
  assert.match(groupDetailSource, /Khoản chi/);
  assert.match(groupDetailSource, /Tổng chi/);
  assert.match(groupDetailSource, /const \[activeTab, setActiveTab\] = useState\('members'\)/);
  assert.match(groupDetailSource, /items=\{\[\s*\{ key: 'members',\s+label: `Thành viên · \$\{d\.memberCount\}` \},\s*\{ key: 'activity', label: 'Hoạt động' \},\s*\]\}/);
  assert.match(groupDetailSource, /activeTab === 'members'/);
  assert.match(groupDetailSource, /\+ Thêm thành viên/);
  assert.match(groupDetailSource, /<MemberRow[\s\S]*key=\{member\.id\}[\s\S]*member=\{member\}[\s\S]*onMore=\{setMemberMenu\}/);
  assert.match(groupDetailSource, /Sửa thành viên/);
  assert.match(groupDetailSource, /Cấp quyền thủ quỹ/);
  assert.match(groupDetailSource, /Xóa khỏi nhóm/);
  assert.match(groupDetailSource, />✏️ Sửa thành viên<\/ActionButton>/);
  assert.match(groupDetailSource, /\{memberMenu\.role === 'treasurer' \? '💳 Thu quyền thủ quỹ' : '💳 Cấp quyền thủ quỹ'\}/);
  assert.match(groupDetailSource, />🗑️ Xóa khỏi nhóm<\/ActionButton>/);
  assert.match(groupDetailSource, /onAction\?\.\('setMemberRole', \{ memberId: memberMenu\.id, groupId: d\.id, role \}\)/);
  assert.doesNotMatch(groupDetailSource, /RolePill icon="👑" label="Trưởng nhóm"/);
  assert.doesNotMatch(groupDetailSource, /Trưởng nhóm/);
  assert.match(groupDetailSource, /Tên tài khoản/);
  assert.match(groupDetailSource, /Số tài khoản/);
  assert.match(screenDataSource, /balanceRows: groupMembers/);
});

test('GroupDetail places the group invite share panel at the bottom of the page content', () => {
  const managementPanelIndex = groupDetailSource.indexOf('<GroupManagementPanel')
  const membersContentIndex = groupDetailSource.indexOf("{activeTab === 'members' &&")

  assert.ok(managementPanelIndex > membersContentIndex)
});

test('SettleAll shows refund bank readiness instead of QR when the member has surplus', () => {
  assert.match(screenDataSource, /function buildSettleAllData\(state\)/);
  assert.match(screenDataSource, /const sourceBalances = buildHomeSourceBalances/);
  assert.match(screenDataSource, /currentProfileSourceBreakdown\(sourceBalances, state\?\.currentUserId, members\)/);
  assert.match(screenDataSource, /paymentTarget: findAdminPaymentTarget\(members, state\)/);
  assert.match(settleAllSource, /Thanh toán tổng hợp/);
  assert.match(settleAllSource, /Theo nguồn tiền/);
  assert.match(settleAllSource, /Thông tin hoàn tiền/);
  assert.match(settleAllSource, /Đã có STK để thủ quỹ hoàn tiền/);
  assert.doesNotMatch(settleAllSource, /QR nhận tiền/);
  assert.doesNotMatch(settleAllSource, /generateQRUrl\(/);
});

test('GroupDetail lets group creators manage members without treasurer role', () => {
  assert.match(groupDetailSource, /const canManageMembers = Boolean\(isTreasurer \|\| d\.isGroupCreator\)/);
  assert.match(groupDetailSource, /const canManageGroup = Boolean\(isTreasurer \|\| d\.isGroupCreator\)/);
  assert.match(groupDetailSource, /const canAddMembers = true/);
  assert.match(groupDetailSource, /<MemberDetailPanel[\s\S]*isTreasurer=\{canManageMembers\}/);
  assert.match(groupDetailSource, /\{canAddMembers && \(\s*<Button variant="ghost"[\s\S]*\+ Thêm thành viên/);
  assert.match(groupDetailSource, /<MemberRow[\s\S]*isTreasurer=\{canManageMembers\}/);
  assert.match(groupDetailSource, /\{memberMenu && canManageMembers && \(/);
  assert.match(groupDetailSource, /\{deleteConfirmMember && canManageMembers && \(/);
  assert.match(screenDataSource, /isGroupCreator,/);
});

test('Treasurer payment dashboard uses record-backed member toggles', () => {
  const dashboardSource = homeSource.slice(
    homeSource.indexOf('function TreasurerPaymentDashboard'),
    homeSource.indexOf('function PaymentDashboardRow')
  );

  assert.match(dashboardSource, /const memberRows = buildTreasurerMemberRows\(/);
  assert.match(dashboardSource, /const paidItemCount = memberRows\.reduce/);
  assert.match(dashboardSource, /onPayItem=\{\(item\) => setPaymentRow\(paymentRowFromTreasurerItem\(item, data\)\)\}/);
  assert.match(dashboardSource, /onCancelPaid=\{\(record\) => withLoading\(\(\) => onAction\?\.\('cancelPaymentRecord', record\)\)\}/);
  assert.doesNotMatch(dashboardSource, /localPaidSet/);
  assert.doesNotMatch(dashboardSource, /setLocalPaidSet/);
});

test('Treasurer payment dashboard uses member rows with paid toggle records', () => {
  const dashboardSource = homeSource.slice(
    homeSource.indexOf('function TreasurerPaymentDashboard'),
    homeSource.indexOf('function TreasurerConfirmPaymentSheet')
  );

  assert.match(dashboardSource, /const memberRows = buildTreasurerMemberRows\(/);
  assert.match(dashboardSource, /title=\{`Danh sách member · \$\{memberRows\.length\}/);
  assert.match(dashboardSource, /function TreasurerMemberPaymentRow/);
  assert.match(dashboardSource, /item\.paid \? 'Đã nhận' : 'TT'/);
  assert.match(dashboardSource, /onCancelPaid\?\.\(item\.record\)/);
  assert.match(dashboardSource, /onPayItem\?\.\(item\)/);
  assert.doesNotMatch(dashboardSource, /title=\{`Còn chưa thanh toán/);
  assert.doesNotMatch(dashboardSource, /title=\{`Cần hoàn tiền/);
});

test('Treasurer payment dashboard can select multiple unpaid items before TT', () => {
  const dashboardSource = homeSource.slice(
    homeSource.indexOf('function TreasurerPaymentDashboard'),
    homeSource.indexOf('function TreasurerConfirmPaymentSheet')
  );

  assert.match(dashboardSource, /const \[selectedTreasurerItemKeys, setSelectedTreasurerItemKeys\] = useState\(\(\) => new Set\(\)\)/);
  assert.match(dashboardSource, /const selectedTreasurerItems = memberRows\.flatMap/);
  assert.match(dashboardSource, /const selectedTreasurerTotal = selectedTreasurerItems\.reduce/);
  assert.match(dashboardSource, /toggleTreasurerItemSelection/);
  assert.match(dashboardSource, /onPaySelected=\{\(items\) => setPaymentRow\(paymentRowFromTreasurerItems\(items, data\)\)\}/);
  assert.match(dashboardSource, />TT tổng \{formatVND\(selectedUnpaidTotal\)\}<\/button>/);
  assert.match(dashboardSource, /selectedKeys=\{selectedTreasurerItemKeys\}/);
  assert.match(dashboardSource, /onToggleSelect=\{toggleTreasurerItemSelection\}/);
});

test('Treasurer payment dashboard counts payment progress by profile', () => {
  const dashboardSource = homeSource.slice(
    homeSource.indexOf('function TreasurerPaymentDashboard'),
    homeSource.indexOf('function buildTreasurerMemberRows')
  );

  assert.match(dashboardSource, /const profileStats = new Map/);
  assert.match(dashboardSource, /const key = treasurerProfileStatKey\(row\)/);
  assert.match(dashboardSource, /const totalProfileCount = profileStatRows\.length/);
  assert.match(dashboardSource, /const paidMemberCount = profileStatRows\.filter/);
  assert.match(dashboardSource, /const pendingMemberCount = new Set\(\[\.\.\.pendingRecordsRaw, \.\.\.pendingCheckpoints\]\.map\(treasurerProfileStatKey\)\.filter\(Boolean\)\)\.size/);
  assert.match(dashboardSource, /const unpaidMemberCount = profileStatRows\.filter\(row => row\.amountDue > 0\)\.length/);
  assert.match(dashboardSource, /\{totalProfileCount\} member/);
  assert.match(dashboardSource, /<ProgressStat label="Đã nhận" count=\{paidMemberCount\}/);
  assert.match(dashboardSource, /<ProgressStat label="Chờ duyệt" count=\{pendingMemberCount\}/);
  assert.match(dashboardSource, /<ProgressStat label="Chưa thu" count=\{unpaidMemberCount\}/);
  assert.doesNotMatch(dashboardSource, /\{memberRows\.length\} member/);
  assert.doesNotMatch(dashboardSource, /paidItemCount/);
  assert.doesNotMatch(dashboardSource, /unpaidItemCount/);
});

test('Treasurer payment member rows group by profile key instead of member id', () => {
  const rowBuilderSource = homeSource.slice(
    homeSource.indexOf('function buildTreasurerMemberRows'),
    homeSource.indexOf('function paymentRowFromTreasurerItem')
  );

  assert.match(rowBuilderSource, /const key = treasurerProfileStatKey\(seed\) \|\| String\(seed\.memberId \|\| seed\.name \|\| 'member'\)/);
});

test('Member payment QR groups selected own and pay-for debts with the same breakdown style', () => {
  const paymentSheetSource = homeSource.slice(
    homeSource.indexOf('function PaymentSheet'),
    homeSource.indexOf('function TreasurerPaymentDashboard')
  );

  assert.match(paymentSheetSource, /const paymentDisplayGroups = \[/);
  assert.match(paymentSheetSource, /title: `Các khoản của \$\{data\?\.memberName \|\| 'bạn'\}`/);
  assert.match(paymentSheetSource, /title: `Các khoản của \$\{group\.row\.name\}`/);
  assert.match(paymentSheetSource, /paymentDisplayGroups\.map\(group => \(/);
  assert.match(paymentSheetSource, /<PaymentItemSection[\s\S]*title=\{group\.title\}[\s\S]*items=\{group\.items\}[\s\S]*checkedKeys=\{group\.checkedKeys\}[\s\S]*onToggle=\{group\.onToggle\}/);
  assert.doesNotMatch(paymentSheetSource, /Chi tiết khoản của \$\{group\.row\.name\}/);
});

test('GroupDetail hero balances amount on the right', () => {
  const heroBalanceSource = groupDetailSource.slice(
    groupDetailSource.indexOf('<ModuleHero'),
    groupDetailSource.indexOf('{/* Treasurer actions */}')
  );
  assert.match(groupDetailSource, /const currentMemberRow = \(d\.members \|\| \[\]\)\.find\(member => String\(member\.id\) === String\(d\.currentMemberId \|\| ''\)\) \|\| null/);
  assert.match(heroBalanceSource, /<HeroBalancePanel[\s\S]*label=\{heroBalanceLabel\}[\s\S]*balance=\{d\.balance \|\| 0\}[\s\S]*tone=\{heroBalanceTone\}[\s\S]*onOpen=\{currentMemberRow \? \(\) => setSelectedMember\(currentMemberRow\) : null\}/);
  assert.match(heroBalanceSource, /<SummaryChipRow/);
});

test('GroupDetail hero stats and personal balance avoid mobile overflow', () => {
  const summarySource = groupDetailSource.slice(
    groupDetailSource.indexOf('function SummaryChipRow'),
    groupDetailSource.indexOf('function MemberRow')
  );
  assert.match(summarySource, /display: 'grid'/);
  assert.match(summarySource, /gridTemplateColumns: 'repeat\(3, minmax\(0, 1fr\)\)'/);
  assert.match(summarySource, /overflowWrap: 'anywhere'/);
  assert.match(summarySource, /function HeroBalancePanel\(\{ label, balance, tone, onOpen \}\)/);
  assert.match(summarySource, /SỐ DƯ CỦA BẠN/);
  assert.match(summarySource, /role=\{clickable \? 'button' : undefined\}/);
  assert.match(summarySource, /onClick=\{onOpen \|\| undefined\}/);
  assert.match(summarySource, /formatVND\(Math\.abs\(balance \|\| 0\)\)/);
});

test('GroupDetail edit sheet uses group type picker and saves matching icon and description', () => {
  const heroSource = groupDetailSource.slice(
    groupDetailSource.indexOf('<ModuleHero'),
    groupDetailSource.indexOf('<SummaryChipRow')
  );

  assert.match(groupDetailSource, /const GROUP_TYPES = \[/);
  assert.match(groupDetailSource, /descriptionPlaceholder: 'Ví dụ: Ăn uống sau giờ chơi, cafe cuối tuần'/);
  assert.match(groupDetailSource, /const \[groupDescription, setGroupDescription\] = useState\(d\.description \|\| ''\)/);
  assert.match(groupDetailSource, /const selectedGroupType = groupTypeOptions\.find\(option => option\.key === groupTypeKey\) \|\| groupTypeOptions\[0\]/);
  assert.match(groupDetailSource, /emoji: selectedGroupType\.emoji \|\| '👥'/);
  assert.match(groupDetailSource, /groupType: selectedGroupType\.key/);
  assert.match(groupDetailSource, /description: groupDescription\.trim\(\)/);
  assert.match(heroSource, /\{d\.description && \(/);
  assert.match(heroSource, /\{d\.description\}/);
  assert.match(groupDetailSource, /function GroupTypePicker\(\{ value, options, onChange \}\)/);
  assert.match(groupDetailSource, /<GroupTypePicker value=\{groupTypeKey\} options=\{groupTypeOptions\} onChange=\{setGroupTypeKey\} \/>/);
  assert.match(groupDetailSource, /<TextArea label="Mô tả nhóm" value=\{groupDescription\} onChange=\{setGroupDescription\} placeholder=\{selectedGroupType\.descriptionPlaceholder\}/);
  assert.match(groupDetailSource, /onInput=\{event => onChange\(event\.target\.value\)\}/);
  assert.doesNotMatch(groupDetailSource, /<Field label="Biểu tượng"/);
  assert.doesNotMatch(groupDetailSource, /function EmojiPicker/);
  assert.match(appSource, /description: group\.description \|\| '',/);
  assert.match(storeSource, /description: action\.group\.description \|\| '',/);
  assert.match(screenDataSource, /description: g\.description \|\| '',/);
});

test('GroupDetail member rows show balance inline on the right of the member name', () => {
  const memberRowSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberRow'),
    groupDetailSource.indexOf('function MemberDetailPanel')
  );
  assert.doesNotMatch(memberRowSource, /const bankLabel/);
  assert.doesNotMatch(memberRowSource, /Chưa cập nhật ngân hàng/);
  assert.match(memberRowSource, /const balance = Number\(member\.balance \|\| 0\)/);
  assert.match(memberRowSource, /const balanceTone = balance < 0 \? colors\.danger : balance > 0 \? '#6ee7b7' : colors\.textSecondary/);
  assert.match(memberRowSource, /const balanceLabel = balance === 0 \? '0 đ' : `\$\{balance > 0 \? '\+' : '-'\}\$\{formatVND\(Math\.abs\(balance\)\)\}`/);
  assert.match(memberRowSource, /<div style=\{\{ flex: 1, minWidth: 0 \}\}>/);
  assert.match(memberRowSource, /<div style=\{\{ fontSize: 15, fontWeight: 800, color: balanceTone, \.\.\.type\.mono \}\}>\s*\{balanceLabel\}\s*<\/div>\s*\{isTreasurer && \(/);
  assert.doesNotMatch(memberRowSource, /marginTop: 3, \.\.\.type\.mono/);
});

test('GroupDetail member management adds members without bank fields', () => {
  assert.match(groupDetailSource, /function AddMemberEditor\(\{ title, groupId, candidates = \[\], isPickleball = false, onClose, onAction \}\)/);
  assert.match(groupDetailSource, /<AddMemberEditor[\s\S]*isPickleball=\{d\.isPickleball\}/);
  assert.match(groupDetailSource, /Thành viên có sẵn/);
  assert.match(groupDetailSource, /selectedCandidateIds\.includes\(String\(candidate\.id\)\)/);
  assert.match(groupDetailSource, /placeholder="Tìm vài ký tự để lọc thành viên"/);
  assert.doesNotMatch(groupDetailSource, /\{candidates\.length > 0 && \(/);
  assert.match(groupDetailSource, /\.normalize\('NFD'\)/);
  assert.match(groupDetailSource, /selectedCandidates = candidates\.filter\(candidate => selectedCandidateIds\.includes\(String\(candidate\.id\)\)\)/);
  assert.match(groupDetailSource, /for \(const candidate of selectedCandidates\)/);
  assert.match(groupDetailSource, /await onAction\?\.\('addExpenseGroupMember', \{[\s\S]*groupId,[\s\S]*profileId: candidate\?\.profileId \|\| candidate\?\.id \|\| '',[\s\S]*\}\)/);
  assert.match(groupDetailSource, /Hoặc nhập tên mới/);
  const addMemberEditorSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function AddMemberEditor'),
    groupDetailSource.indexOf('function EditMemberEditor')
  );
  assert.doesNotMatch(addMemberEditorSource, /bankAccountName/);
  assert.doesNotMatch(addMemberEditorSource, /bankName/);
  assert.doesNotMatch(addMemberEditorSource, /bankAccount/);
  assert.doesNotMatch(addMemberEditorSource, /Tên tài khoản/);
  assert.doesNotMatch(addMemberEditorSource, /<BankSelect/);
  assert.doesNotMatch(addMemberEditorSource, /Số tài khoản/);
  assert.match(addMemberEditorSource, /await onAction\?\.\('addExpenseGroupMember', \{[\s\S]*groupId,[\s\S]*name: cleanName,[\s\S]*profileId: '',[\s\S]*type: 'fixed',[\s\S]*\}\)/);
  assert.doesNotMatch(addMemberEditorSource, /onAction\?\.\('addPickleballMember'/);
  assert.doesNotMatch(addMemberEditorSource, /onAction\?\.\('addMember'/);
  assert.doesNotMatch(addMemberEditorSource, /bankAccountName: bankAccountName\.trim\(\)/);
  assert.doesNotMatch(addMemberEditorSource, /bankName,/);
  assert.doesNotMatch(addMemberEditorSource, /bankAccount: bankAccount\.trim\(\)/);
  assert.match(appSource, /if \(type === 'addExpenseGroupMember'\)/);
  assert.match(appSource, /\.rpc\('add_expense_group_member'/);
  assert.doesNotMatch(appSource, /groupId: payload\?\.groupId \|\| activePickleballGroupId\(state\)/);
  assert.match(appSource, /bank_account: payload\?\.bankAccount \?\? payload\?\.bank_account/);
  assert.match(appSource, /bank_account_name: payload\?\.bankAccountName \?\? payload\?\.bank_account_name/);
  assert.match(screenDataSource, /color: g\.color \|\| '#574EFA'/);
  assert.match(screenDataSource, /memberCandidates: buildGroupMemberCandidates\(g, members, profiles, \{ mode: 'expense' \}\)/);
  assert.match(screenDataSource, /const mode = options\.mode \|\| groupKind\(group\)/);
  assert.match(screenDataSource, /const blockingCurrentMembers = mode === 'pickleball'[\s\S]*?: currentMembers\.filter\(isExpenseActiveMember\)/);
  assert.match(screenDataSource, /const currentProfileIds = new Set\(blockingCurrentMembers\.map\(member => String\(member\.profileId \|\| member\.profile_id \|\| member\.id\)\)\)/);
  assert.match(screenDataSource, /function candidateProfilesFromDirectory\(members, profiles = \[\]\)/);
  assert.match(screenDataSource, /function isExpenseActiveMember\(member\)/);
  assert.match(screenDataSource, /!isExpenseActiveMember\(member\)/);
  assert.match(groupDetailSource, /const inactiveCandidates = candidates\.filter\(candidate => candidate\.isInactive\)/);
  assert.match(groupDetailSource, /const activeCandidates = candidates\.filter\(candidate => !candidate\.isInactive\)/);
  assert.match(groupDetailSource, /const inactiveCandidateCards = inactiveCandidates\.map\(candidate => \(/);
  assert.match(groupDetailSource, /const activeCandidateCards = activeCandidates\.map\(candidate => \(/);
  assert.match(groupDetailSource, /sectionTitle="Danh sách chờ thêm lại"/);
  assert.match(groupDetailSource, /sectionTitle="Thành viên có sẵn"/);
  assert.doesNotMatch(addMemberEditorSource, /\{activeCandidateCards\.length > 0 &&/);
  assert.match(addMemberEditorSource, /<MemberPicker[\s\S]*sectionTitle="Thành viên có sẵn"[\s\S]*maxListHeight=\{220\}/);
  assert.match(groupDetailSource, /const \[inactiveCandidateQuery, setInactiveCandidateQuery\] = useState\(''\)/);
  assert.match(groupDetailSource, /const \[activeCandidateQuery, setActiveCandidateQuery\] = useState\(''\)/);
  assert.doesNotMatch(groupDetailSource, /function memberPickerSectionTitle/);
  assert.match(screenDataSource, /!currentProfileIds\.has\(String\(member\.profileId \|\| member\.profile_id \|\| member\.id\)\)/);
  assert.match(screenDataSource, /bankName: member\.bankName \|\| member\.bank_name \|\| ''/);
  assert.match(screenDataSource, /bankAccount: member\.bankAccount \|\| member\.bank_account \|\| ''/);
  assert.match(screenDataSource, /bankAccountName: member\.bankAccountName \|\| member\.bank_account_name \|\| ''/);
});

test('GroupDetail member rows are compact and visually distinct from pickleball cards', () => {
  const memberRowSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberRow'),
    groupDetailSource.indexOf('function MemberDetailPanel')
  );
  assert.match(memberRowSource, /padding: '11px 12px'/);
  assert.match(memberRowSource, /background: 'rgba\(255,255,255,0\.035\)'/);
  assert.match(memberRowSource, /border: '1px solid rgba\(251,191,36,0\.20\)'/);
  assert.match(memberRowSource, /<Avatar initial=\{member\.initials\} size=\{34\}/);
  assert.doesNotMatch(memberRowSource, /rgba\(37,99,235,0\.28\)/);
  assert.doesNotMatch(memberRowSource, /rgba\(96,165,250,0\.35\)/);
});

test('GroupsList separates group metadata from balance and labels balanced groups clearly', () => {
  const groupCardSource = groupDetailSource && homeSource
    ? readFileSync(new URL('./GroupsList.jsx', import.meta.url), 'utf8')
    : '';
  assert.match(groupCardSource, /const balanceLabel = g\.balance === 0 \? 'Cân bằng' : formatVNDShort\(g\.balance\)/);
  assert.match(groupCardSource, /const pickleballGroups = visibleGroups\.filter\(isPickleballLikeGroup\)/);
  assert.match(groupCardSource, /const expenseGroups = visibleGroups\.filter\(g => !isPickleballLikeGroup\(g\)\)/);
  assert.match(groupCardSource, /function GroupsDivider\(\)/);
  assert.match(groupCardSource, /Nhóm chi tiêu thường/);
  assert.match(groupCardSource, /const groupTypeLabel = g\.groupTypeLabel \|\| groupTypeLabelFor\(g\)/);
  assert.match(groupCardSource, /const metaItems = \[groupTypeLabel, `\$\{g\.memberCount\} thành viên`\]/);
  assert.match(groupCardSource, /g\.linkedPickleballLabel \|\| 'Liên kết Pickleball'/);
  assert.match(groupCardSource, /\{g\.description && \(/);
  assert.match(groupCardSource, /\{g\.description\}/);
  assert.match(groupCardSource, /padding: '14px 14px'/);
  assert.match(groupCardSource, /gridTemplateColumns: '42px minmax\(0, 1fr\) auto'/);
  assert.match(groupCardSource, /gridTemplateColumns: isPickleballGroup \? '1fr' : 'auto 1fr'/);
  assert.match(groupCardSource, /whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'/);
  assert.doesNotMatch(groupCardSource, /Dùng chung danh bạ với/);
  assert.doesNotMatch(groupCardSource, /Danh bạ chung/);
});

test('GroupsList group cards support keyboard activation', () => {
  const groupCardSource = readFileSync(new URL('./GroupsList.jsx', import.meta.url), 'utf8');
  const groupCardBlock = groupCardSource.slice(
    groupCardSource.indexOf('function GroupCard'),
    groupCardSource.indexOf('function groupTypeLabelFor')
  );
  assert.match(groupCardBlock, /role="button"/);
  assert.match(groupCardBlock, /tabIndex=\{0\}/);
  assert.match(groupCardBlock, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(groupCardBlock, /event\.preventDefault\(\)/);
  assert.match(groupCardBlock, /onClick\?\.\(\)/);
});

test('GroupDetail keeps bank fields in edit member sheet only', () => {
  assert.match(groupDetailSource, /function AddMemberEditor\(\{ title, groupId, candidates = \[\], isPickleball = false, onClose, onAction \}\)/);
  const addMemberEditorSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function AddMemberEditor'),
    groupDetailSource.indexOf('function EditMemberEditor')
  );
  assert.doesNotMatch(addMemberEditorSource, /<Field label="Tên tài khoản"/);
  assert.doesNotMatch(addMemberEditorSource, /<BankSelect/);
  assert.doesNotMatch(addMemberEditorSource, /<Field label="Số tài khoản"/);
  const editMemberEditorSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function EditMemberEditor'),
    groupDetailSource.indexOf('function CandidateSelect')
  );
  assert.match(groupDetailSource, /function EditMemberEditor\(\{ title, member, onClose, onAction \}\)/);
  assert.match(editMemberEditorSource, /<Field label="Tên tài khoản" value=\{bankAccountName\}/);
  assert.match(editMemberEditorSource, /<BankSelect value=\{bankName\} onChange=\{setBankName\} \/>/);
  assert.match(editMemberEditorSource, /<Field label="Số tài khoản" value=\{bankAccount\}/);
});

test('GroupDetail member cards open a detail view with edit and delete actions', () => {
  assert.match(groupDetailSource, /const \[selectedMember, setSelectedMember\] = useState\(null\)/);
  assert.match(groupDetailSource, /const \[deleteConfirmMember, setDeleteConfirmMember\] = useState\(null\)/);
  assert.match(groupDetailSource, /onOpen=\{setSelectedMember\}/);
  assert.match(groupDetailSource, /function MemberDetailPanel\(\{ groupName, member, isTreasurer, onAction, onBack, onEdit, onDelete \}\)/);
  assert.match(groupDetailSource, /Chi tiết thành viên/);
  assert.match(groupDetailSource, /Cần nộp vào quỹ/);
  assert.doesNotMatch(groupDetailSource, /SỐ DƯ TRONG NHÓM/);
  assert.match(groupDetailSource, /THÔNG TIN NHẬN HOÀN ỨNG/);
  assert.match(groupDetailSource, /onClick=\{\(\) => onOpen\?\.\(member\)\}/);
  assert.match(groupDetailSource, /event\.stopPropagation\(\)/);
  assert.match(groupDetailSource, /onEdit=\{\(\) => \{ setEditingMember\(selectedMember\); setSelectedMember\(null\); \}\}/);
  assert.match(groupDetailSource, /onDelete=\{\(\) => \{[\s\S]*setDeleteConfirmMember\(selectedMember\);[\s\S]*setSelectedMember\(null\);[\s\S]*\}\}/);
});

test('GroupDetail member detail exposes clear treasurer edit access', () => {
  const memberDetailSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberDetailPanel'),
    groupDetailSource.indexOf('function MemberPaidTransactionRow')
  );
  assert.match(memberDetailSource, /\{isTreasurer && \(/);
  assert.match(memberDetailSource, /<BottomSheet title="Tùy chọn khác"/);
  assert.match(memberDetailSource, /<ActionButton onClick=\{\(\) => \{ setMemberActionsOpen\(false\); onEdit\?\.\(\); \}\}>Chỉnh sửa thông tin<\/ActionButton>/);
  assert.doesNotMatch(memberDetailSource, />Sửa thành viên<\/Button>/);
});

test('GroupDetail member detail stacks the balance chip under identity on mobile', () => {
  const memberDetailSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberDetailPanel'),
    groupDetailSource.indexOf('function BalanceBreakdownRow')
  );

  assert.match(memberDetailSource, /alignItems: 'baseline'/);
  assert.match(memberDetailSource, /justifyContent: 'space-between'/);
  assert.match(memberDetailSource, /overflow: 'hidden'/);
  assert.match(memberDetailSource, /textOverflow: 'ellipsis'/);
  assert.doesNotMatch(memberDetailSource, /minWidth: 108/);
  assert.match(memberDetailSource, /<BalanceBreakdownRow label="Cần trả"/);
  assert.match(memberDetailSource, /<BalanceBreakdownRow label="Đã ứng"/);
});

test('GroupDetail delete member does not depend on native confirm dialogs', () => {
  assert.doesNotMatch(groupDetailSource, /window\.confirm\(`Xóa \$\{selectedMember\.name\} khỏi nhóm\?`\)/);
  assert.doesNotMatch(groupDetailSource, /window\.confirm\(`Xóa \$\{memberMenu\.name\} khỏi nhóm\?`\)/);
  assert.match(groupDetailSource, /setDeleteConfirmMember\(memberMenu\)/);
  assert.match(groupDetailSource, /title="Xóa khỏi nhóm\?"/);
  assert.match(groupDetailSource, /Thành viên sẽ được ẩn khỏi danh sách nhóm\. Bạn có thể thêm lại sau\./);
  assert.match(groupDetailSource, /await onAction\?\.\('removeMemberFromGroup', \{ memberId: deleteConfirmMember\.id, groupId: d\.id \}\)/);
  assert.doesNotMatch(groupDetailSource, /d\.isPickleball \? 'removeMemberToVanglai'/);
  assert.match(appSource, /if \(type === 'removeMemberFromGroup'\)/);
  assert.match(appSource, /\.update\(\{ expense_active: false \}\)[\s\S]*?\.eq\('id', memberId\)[\s\S]*?\.eq\('group_id', targetGroupId\)/);
  const removeExpenseBlock = appSource.slice(
    appSource.indexOf("if (type === 'removeMemberFromGroup')"),
    appSource.indexOf("if (type === 'removePickleballMember')")
  );
  assert.doesNotMatch(removeExpenseBlock, /\.update\(\{ is_active: false \}\)/);
  assert.doesNotMatch(groupDetailSource, /onAction\?\.\('deleteMember'/);
  assert.match(appSource, /const targetGroupId = payload\?\.groupId \|\| state\.currentGroupId/);
  assert.match(appSource, /String\(group\.id\) === String\(targetGroupId\)/);
});

test('GroupDetail hides member detail bank accounts from non-treasurers', () => {
  const memberDetailSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberDetailPanel'),
    groupDetailSource.indexOf('function MemberPaidTransactionRow')
  );
  assert.doesNotMatch(memberDetailSource, /canViewMemberBank/);
  assert.doesNotMatch(memberDetailSource, /Ẩn với thành viên khác/);
  assert.match(memberDetailSource, /\{isTreasurer && \(\s*<Card style=\{\{ marginTop: 12 \}\}>\s*<SectionTitle>THÔNG TIN NHẬN HOÀN ỨNG<\/SectionTitle>/);
  assert.match(memberDetailSource, /<InfoLine label="Ngân hàng" value=\{member\.bankName \|\| 'Chưa cập nhật'\} \/>/);
  assert.match(memberDetailSource, /<InfoLine label="STK ngân hàng" value=\{member\.bankAccount \|\| 'Chưa cập nhật'\} \/>/);
  assert.match(screenDataSource, /isCurrentUser: String\(member\.id\) === String\(currentGroupMember\?\.id \|\| ''\)/);
});

test('Screen data excludes inactive memberships from group member lists', () => {
  assert.match(screenDataSource, /function membersForGroup\(group, members\) \{/);
  assert.match(screenDataSource, /return allMembersForGroup\(group, members\)[\s\S]*?\.filter\(isExpenseActiveMember\)/);
});

test('GroupDetail member detail shows payer transactions for the selected month', () => {
  const memberDetailSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberDetailPanel'),
    groupDetailSource.indexOf('function BalanceBreakdownRow')
  );
  const memberTransactionSource = groupDetailSource.slice(
    groupDetailSource.indexOf('function MemberTransactionRow'),
    groupDetailSource.indexOf('function MemberPaidTransactionRow')
  );

  assert.match(screenDataSource, /const memberTransactions = buildMemberTransactions\(g, member\.id, selectedYearMonth, groupMembers\)/);
  assert.match(screenDataSource, /function buildMemberTransactions\(group, memberId, selectedYearMonth, members = \[\]\)/);
  assert.match(screenDataSource, /memberTransactionSummary: summarizeMemberTransactions\(memberTransactions\)/);
  assert.match(groupDetailSource, /GIAO DỊCH LIÊN QUAN/);
  assert.match(groupDetailSource, /member\.memberTransactions/);
  assert.match(groupDetailSource, /transactionFilter/);
  assert.match(groupDetailSource, /placeholder="Tìm tên, ngày, loại chi phí, người trả\.\.\."/);
  assert.match(groupDetailSource, /transaction\.date/);
  assert.doesNotMatch(memberDetailSource, /<NetBillStat value=\{summary\.net\} \/>/);
  assert.doesNotMatch(memberDetailSource, /\{ key: 'settled', label: 'Cân bằng' \}/);
  assert.match(groupDetailSource, /function MemberTransactionRow\(\{ transaction, onOpen \}\)/);
  assert.doesNotMatch(groupDetailSource, /function NetBillStat\(\{ value \}\)/);
  assert.match(groupDetailSource, /whiteSpace: 'nowrap'/);
  assert.match(memberTransactionSource, /<TransactionPill label=\{roleLabel\} tone=\{roleTone\} \/>/);
  assert.match(memberTransactionSource, /<TransactionPill label=\{statusLabel\} tone=\{statusTone\} \/>/);
  assert.match(memberTransactionSource, /transactionStatusLabel\(transaction\.status\)/);
  assert.match(groupDetailSource, /onAction\?\.\('expenseDetail', \{ expenseId: transaction\.id \}\)/);
  assert.doesNotMatch(screenDataSource, /payerTransactions: buildMemberPayerTransactions/);
  assert.doesNotMatch(groupDetailSource, /member\.payerTransactions/);
});

test('GroupDetail member detail shows a personal bill link and removes separate app-link action', () => {
  assert.match(groupDetailSource, /onAction\?\.\('createMemberBillShare'/);
  assert.match(groupDetailSource, /LINK CÁ NHÂN/);
  assert.match(groupDetailSource, /Sao chép/);
  assert.match(groupDetailSource, /Tùy chọn khác/);
  assert.doesNotMatch(groupDetailSource, /Gửi bill cá nhân/);
  assert.doesNotMatch(groupDetailSource, /Tạo link vào app/);
  assert.doesNotMatch(groupDetailSource, /onAction\?\.\('createMemberAccessLink'/);
  assert.doesNotMatch(groupDetailSource, /const \[billQrOpen, setBillQrOpen\] = useState\(false\)/);
  assert.doesNotMatch(groupDetailSource, />Tạo QR thanh toán<\/Button>/);
  assert.doesNotMatch(groupDetailSource, /Chia sẻ link vào app/);
});

test('MemberBillShare renders payment QR when the member owes money and a payment target exists', () => {
  assert.match(memberBillShareSource, /import \{ BANK_LIST, generateQRUrl \} from '\.\.\/lib\/vietqr\.js'/);
  assert.match(memberBillShareSource, /function PaymentCard\(\{ bill, summary \}\)/);
  assert.match(memberBillShareSource, /<PaymentCard bill=\{bill\} summary=\{summary\} \/>/);
  assert.match(memberBillShareSource, /const canGenerateQr = Boolean\(qrBankId && paymentTarget\.bankAccount && paymentTarget\.bankAccountName && owesAmount > 0\)/);
  assert.match(memberBillShareSource, /generateQRUrl\(\{/);
  assert.match(memberBillShareSource, /alt="QR thanh toán"/);
  assert.match(memberBillShareSource, /Nội dung chuyển khoản/);
  assert.match(memberBillShareSource, /copyPaymentInfo/);
  assert.match(memberBillShareSource, /Không cần thanh toán/);
  assert.match(memberBillShareSource, /Chưa có thông tin quỹ, liên hệ thủ quỹ/);
});

test('App supports public member bill tokens without requiring login', () => {
  assert.match(appSource, /import MemberBillShare from '\.\/screens\/MemberBillShare'/);
  assert.match(appSource, /useState\(\(\) => publicBillTokenFromLocation\(\)\)/);
  assert.match(appSource, /async function openPersonalLinkHome\(token\)/);
  assert.match(appSource, /const openedHome = await openPersonalLinkHome\(publicBillToken\)/);
  assert.match(appSource, /if \(!alive \|\| openedHome\) return/);
  assert.match(appSource, /setActiveTab\('home'\)/);
  assert.match(appSource, /\.rpc\('get_member_bill_share'/);
  assert.match(appSource, /if \(publicBillToken\)/);
  assert.match(appSource, /<MemberBillShare data=\{publicBillData\}/);
  assert.match(appSource, /if \(type === 'createMemberBillShare'\)/);
  assert.match(appSource, /\.rpc\('create_member_access_link'/);
  assert.match(appSource, /p_purpose: 'member_bill'/);
  assert.match(appSource, /const billShareError = error\?\.message \|\| data\?\.error \|\| 'Không tạo được link chia sẻ\.'/);
});

test('App uses one selectedYearMonth across home, groups, group detail, and pickleball screens', () => {
  assert.match(storeSource, /selectedYearMonth: monthKey\(new Date\(\)\)/);
  assert.match(storeSource, /case 'SET_SELECTED_MONTH':/);
  assert.match(appSource, /dispatch\(\{ type: 'SET_SELECTED_MONTH', selectedYearMonth: nextYearMonth \}\)/);
  assert.match(screenDataSource, /selectedYearMonth = monthKey\(new Date\(\)\)/);
  assert.match(screenDataSource, /buildHomeData\(state, currentUserId, members, groups, pickle, pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupsListData\(groups, currentUserId, members, currentUserName, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupDetailData\(group, currentUserId, members, currentUserName, selectedYearMonth, state\?\.profiles, state\)/);
  assert.match(screenDataSource, /buildPickleballOverviewData\(pickleballState, pickle, _allPickle, currentUserId, members, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildPickleballMembersData\(pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildMemberDetailData\(pickleballState, memberId, selectedYearMonth\)/);
});

test('GroupDetail uses group-specific treasurer role for normal expense groups', () => {
  assert.match(screenDataSource, /const currentGroupMember = groupMembers\.find\(member => String\(member\.id\) === String\(memberIdForGroup\(g, currentUserId, members, currentUserName\)\)\)/);
  assert.match(screenDataSource, /const isGroupCreator = isMemberGroupCreator\(g, currentGroupMember\) \|\| isMemberGroupCreator\(g, currentMember\)/);
  assert.match(screenDataSource, /const isSoloExpenseGroup = groupMembers\.length === 1 && groupKind\(g\) !== 'pickleball'/);
  assert.match(screenDataSource, /function isManagerRole\(role\)/);
  assert.match(screenDataSource, /\['treasurer', 'admin', 'owner'\]\.includes\(String\(role \|\| ''\)\.toLowerCase\(\)\)/);
  assert.match(screenDataSource, /const isGroupTreasurer = Boolean\(isGroupCreator \|\| isManagerRole\(currentGroupMember\?\.role\) \|\| \(Boolean\(currentGroupMember\) && isSoloExpenseGroup\)\)/);
  assert.match(screenDataSource, /isTreasurer: isGroupTreasurer/);
  assert.match(appSource, /const detailData = route\.params\?\.groupId \? getGroupDetailData\(route\.params\.groupId\) : groupDetailData/);
  assert.match(appSource, /<GroupDetail data=\{detailData\} isTreasurer=\{detailData\?\.isTreasurer \?\? isTreasurer\} onAction=\{handle\} \/>/);
});

test('Store preserves expense group creator for group-level management', () => {
  assert.match(screenDataSource, /createdBy: g\.createdBy \|\| g\.created_by \|\| null/);
  assert.match(storeSource, /createdBy: group\.created_by \|\| null/);
  assert.match(storeSource, /created_by: group\.created_by \|\| null/);
  assert.match(storeSource, /\.from\('members'\)[\s\S]*\.update\(\{ role: 'treasurer' \}\)[\s\S]*\.eq\('id', joined\.member_id\)/);
  assert.match(appSource, /const detailData = route\.params\?\.groupId \? getGroupDetailData\(route\.params\.groupId\) : groupDetailData/);
  assert.match(appSource, /<GroupDetail data=\{detailData\} isTreasurer=\{detailData\?\.isTreasurer \?\? isTreasurer\} onAction=\{handle\} \/>/);
});

test('Home activity list filters by title, status, and category', () => {
  assert.match(homeSource, /import React, \{ useState, useEffect \} from 'react'/);
  assert.match(homeSource, /const \[filterText, setFilterText\] = useState\(''\)/);
  assert.match(homeSource, /const \[statusFilter, setStatusFilter\] = useState\('all'\)/);
  assert.match(homeSource, /const \[categoryFilter, setCategoryFilter\] = useState\('all'\)/);
  assert.match(homeSource, /placeholder="Tìm chi tiêu\.\.\."/);
  assert.match(homeSource, /const visibleTransactions = d\.transactions\.filter/);
  assert.match(homeSource, /titleMatches && statusMatches && categoryMatches/);
  assert.match(homeSource, /Chờ duyệt/);
  assert.match(homeSource, /Đã duyệt/);
  assert.match(homeSource, /Từ chối/);
  assert.match(homeSource, /<select[\s\S]*value=\{categoryFilter\}[\s\S]*onChange=\{e => setCategoryFilter\(e\.target\.value\)\}/);
  assert.doesNotMatch(homeSource, /<MiniStat/);
  assert.doesNotMatch(homeSource, /function MiniStat/);
});

test('Home renders a consolidated pending expense approval zone', () => {
  assert.match(screenDataSource, /pendingExpenses: buildPendingExpenseApprovals\(expenseGroups, members, currentUserId, state\?\.currentUserName\)/);
  assert.match(screenDataSource, /pendingPayments: buildPendingPaymentConfirmations\(state\)/);
  assert.match(screenDataSource, /function buildPendingPaymentConfirmations\(state\)/);
  assert.match(screenDataSource, /type\.includes\('payment'\)/);
  assert.match(screenDataSource, /String\(metadata\.status \|\| 'pending'\)\.toLowerCase\(\) === 'pending'/);
  assert.match(screenDataSource, /function buildPendingExpenseApprovals\(groups, members, currentUserId, currentUserName\)/);
  assert.match(screenDataSource, /filter\(group => canReviewPendingExpensesForGroup\(group, members, currentUserId, currentUserName\)\)/);
  assert.match(screenDataSource, /function canReviewPendingExpensesForGroup\(group, members, currentUserId, currentUserName\)/);
  assert.match(homeSource, /const pendingExpenses = d\.pendingExpenses \|\| \[\]/);
  assert.match(homeSource, /const pendingPayments = d\.pendingPayments \|\| \[\]/);
  assert.match(homeSource, /<PendingApprovalZone expenses=\{pendingExpenses\} payments=\{pendingPayments\} onAction=\{onAction\} \/>/);
  assert.match(homeSource, /function PendingApprovalZone\(\{ expenses, payments, onAction \}\)/);
  assert.match(homeSource, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(homeSource, /const items = \[/);
  assert.match(homeSource, /type: 'expense'/);
  assert.match(homeSource, /type: 'payment'/);
  assert.match(homeSource, /Cần duyệt · \{items\.length\}/);
  assert.match(homeSource, /aria-expanded=\{expanded\}/);
  assert.match(homeSource, /\{expanded && \(/);
  assert.match(homeSource, /onAction\?\.\('approveExpense', \{ expenseId: item\.id, groupId: item\.groupId \}\)/);
  assert.match(homeSource, /onAction\?\.\('rejectExpense', \{ expenseId: item\.id, groupId: item\.groupId \}\)/);
  assert.match(homeSource, /onAction\?\.\('confirmPaymentNotice', item\)/);
  assert.match(homeSource, /onAction\?\.\('rejectPaymentNotice', item\)/);
});

test('Home hero review chip is an explicit settle-all action', () => {
  assert.doesNotMatch(homeSource, /<ModuleHero/);
  assert.doesNotMatch(homeSource, /onAction\?\.\('addExpense'\)/);
  assert.doesNotMatch(homeSource, />\+ Thêm chi tiêu<\/Button>/);
  assert.doesNotMatch(homeSource, />Chi tiết quỹ<\/Button>/);
  assert.match(homeSource, /paymentOpen = false/);
  assert.match(homeSource, /<PaymentSheet[\s\S]*open=\{paymentOpen \|\| paymentSheetOpen\}/);
  assert.match(homeSource, /function PaymentSheet\(\{ open, data, paymentRecords = \[\], isTreasurer, confirmedRefunds, savingAction, setSavingAction, onAction, onViewPaymentRecord, onConfirmPayment, onConfirmRefund, onCancelRefund, onClose \}\)/);
  assert.match(homeSource, /Thanh toán về thủ quỹ/);
  assert.match(homeSource, /generateQRUrl\(/);
  assert.match(homeSource, /download=\"vietqr-thanh-toan\.png\"/);
  assert.match(homeSource, /Lưu QR/);
  assert.doesNotMatch(homeSource, /Sao chép STK/);
  assert.match(homeSource, /\['amount', 'Số tiền', formatVND\(amountToPay\)\]/);
  assert.doesNotMatch(homeSource, /\['holder', 'Người nhận'/);
  assert.doesNotMatch(homeSource, /\['bank', 'Ngân hàng'/);
  assert.match(homeSource, />Thông tin chủ tài khoản<\/span>/);
  assert.match(homeSource, />Người nhận<\/span>/);
  assert.match(homeSource, />Ngân hàng<\/span>/);
  assert.match(homeSource, /\{target\.holder \|\| 'Long'\}/);
  assert.match(homeSource, /\{target\.name \|\| target\.code \|\| 'Ngân hàng'\}/);
  assert.match(homeSource, /\['account', 'STK', target\.account\]/);
  assert.match(homeSource, /\['description', 'Nội dung', transferDescription\]/);
  assert.match(homeSource, /onClick=\{\(\) => copyPaymentField\(field, value\)\}/);
  assert.match(homeSource, /background: 'rgba\(59,130,246,0\.18\)'/);
  assert.match(homeSource, /background: paymentConfirmed \? 'rgba\(16,185,129,0\.20\)' : '#10b981'/);
  assert.match(homeSource, />Chi tiết chuyển khoản<\/span>/);
  assert.match(homeSource, /aria-expanded=\{paymentDetailsExpanded\}/);
  assert.match(homeSource, /setPaymentDetailsExpanded\(value => !value\)/);
  assert.match(homeSource, /Đã thanh toán/);
  assert.match(homeSource, /onConfirmPayment\?\.\(\{[\s\S]*amount: amountToPay,[\s\S]*coveredMembers: selectedPayForRows/);
  assert.match(homeSource, /const selectedPaymentItems = \[\.\.\.selectedOwnPaymentItems, \.\.\.selectedPayForPaymentItems\]/);
  assert.match(homeSource, /const paymentPeriodLabel = paymentItemsPeriodLabel\(selectedPaymentItems, data\?\.monthLabel\)/);
  assert.match(homeSource, /const transferDescription = `\$\{paymentNames\.join\(', '\)\} - Thanh toan \$\{paymentPeriodLabel\}`\.trim\(\)/);
  assert.match(homeSource, /return months\.join\(', '\)/);
  assert.match(homeSource, /const groupedItems = groupPaymentItemsBySource\(items\)/);
  assert.match(homeSource, /function groupPaymentItemsBySource\(items\)/);
  assert.match(homeSource, /group\.items\.map\(item =>/);
  assert.match(homeSource, /borderLeft: '4px solid rgba\(96,165,250,0\.54\)'/);
  assert.match(homeSource, /paddingLeft: 12/);
  assert.ok(homeSource.indexOf('alt="QR thanh toán thủ quỹ"') < homeSource.indexOf("['amount', 'Số tiền', formatVND(amountToPay)]"));
  assert.match(homeSource, /const \[selectedPayForIds, setSelectedPayForIds\] = useState\(\(\) => new Set\(\)\)/);
  assert.match(homeSource, /const \[payForExpanded, setPayForExpanded\] = useState\(false\)/);
  assert.match(homeSource, /const \[paymentDetailsExpanded, setPaymentDetailsExpanded\] = useState\(false\)/);
  assert.match(homeSource, /const payForRows = safeArray\(data\?\.payForRows\)/);
  assert.match(homeSource, /const selectedPayForRows = payForRows\.filter\(row => selectedPayForIds\.has\(String\(row\.profileId \|\| row\.name\)\)\)/);
  assert.match(homeSource, /const selectedPayForGroups = selectedPayForRows\.map\(row =>/);
  assert.match(homeSource, /const \[selectedPayForSourceKeys, setSelectedPayForSourceKeys\] = useState\(\(\) => new Set\(\)\)/);
  assert.match(homeSource, /const selectedPayForPaymentItems = selectedPayForGroups\.flatMap\(group => group\.items\)\.filter\(item => selectedPayForSourceKeys\.has\(item\.key\)\)/);
  assert.match(homeSource, /const selectedPayForTotal = paymentItemsAmountDue\(selectedPayForPaymentItems\)/);
  assert.match(homeSource, /const payForSummary = selectedPayForRows\.length/);
  assert.match(homeSource, /const \[selectedPaymentSourceKeys, setSelectedPaymentSourceKeys\] = useState\(\(\) => new Set\(\)\)/);
  assert.match(homeSource, /const ownPaymentItems = debtSources\.flatMap/);
  assert.match(homeSource, /const selectedOwnPaymentItems = ownPaymentItems\.filter\(item => selectedPaymentSourceKeys\.has\(item\.key\)\)/);
  assert.match(homeSource, /const amountToPay = paymentItemsAmountDue\(selectedOwnPaymentItems\) \+ paymentItemsAmountDue\(selectedPayForPaymentItems\)/);
  assert.match(homeSource, /paymentNames\.join\(', '\)/);
  assert.match(homeSource, /const paymentDisplayGroups = \[/);
  assert.match(homeSource, /title: `Các khoản của \$\{data\?\.memberName \|\| 'bạn'\}`/);
  assert.match(homeSource, /items: ownPaymentItems/);
  assert.match(homeSource, /checkedKeys: selectedPaymentSourceKeys/);
  assert.match(homeSource, /paymentDisplayGroups\.map\(group => \(/);
  assert.match(homeSource, /<PaymentItemSection[\s\S]*title=\{group\.title\}[\s\S]*items=\{group\.items\}[\s\S]*checkedKeys=\{group\.checkedKeys\}/);
  assert.match(homeSource, /selectedPayForGroups\.map\(group =>/);
  assert.match(homeSource, /title: `Các khoản của \$\{group\.row\.name\}`/);
  assert.match(homeSource, /items: group\.items/);
  assert.match(homeSource, /checkedKeys: selectedPayForSourceKeys/);
  assert.match(homeSource, /onToggle: togglePayForSource/);
  assert.match(homeSource, /Thanh toán hộ người khác/);
  assert.match(homeSource, /aria-expanded=\{payForExpanded\}/);
  assert.match(homeSource, /setPayForExpanded\(value => !value\)/);
  assert.match(homeSource, /\{payForExpanded && \(/);
  assert.match(homeSource, /\{payForSummary\}/);
  assert.match(homeSource, /onClick=\{\(\) => togglePayFor\(row\)\}/);
  assert.match(homeSource, /Chờ thủ quỹ hoàn tiền/);
  assert.match(homeSource, /Cần hoàn tiền/);
  assert.match(homeSource, /onConfirmRefund\?\.\(item\)/);
  assert.match(homeSource, /onAction\?\.\(isTreasurer \? 'markMemberPaid' : 'confirmPaymentSent', payload\)/);
  assert.match(homeSource, /const coveredSources = selectedPaymentItems\.map\(paymentItemToCoveredSource\)/);
  assert.match(homeSource, /\.filter\(item => Number\(item\.amount\) !== 0\)/);
  assert.match(homeSource, /function paymentItemsAmountDue\(items\) \{[\s\S]*const total = safeArray\(items\)\.reduce\(\(sum, item\) => sum \+ \(Number\(item\.amount\) \|\| 0\), 0\);[\s\S]*return total < 0 \? Math\.abs\(total\) : 0;/);
  assert.match(homeSource, /function signedVND\(value\)/);
  assert.match(homeSource, /Tổng \{signedVND\(sectionTotal\)\}/);
  assert.match(homeSource, /\{signedVND\(item\.amount\)\}/);
  assert.match(homeSource, /function paymentItemsPeriodLabel\(items, fallback = ''\)/);
  assert.match(appSource, /if \(type === 'confirmPaymentSent'\)/);
  assert.match(appSource, /coveredMembers/);
  assert.match(screenDataSource, /memberId: member\?\.id/);
  assert.match(homeSource, /const paymentSourceBreakdown = d\.paymentSummary\?\.sourceBreakdown \|\| d\.sourceBreakdown \|\| heroSourceBreakdown/);
  assert.match(homeSource, /const paymentSheetData = \{[\s\S]*\.\.\.\(isTreasurer \? \{\} : \{[\s\S]*netBalance: paymentNetBalance,[\s\S]*sourceBreakdown: paymentSourceBreakdown,[\s\S]*\}\)/);
  assert.match(homeSource, /<PaymentSheet[\s\S]*data=\{paymentSheetData\}/);
  assert.match(homeSource, /<SourceBreakdown[\s\S]*totalBalance=\{heroBalance\}[\s\S]*balanceLabel=\{heroBalanceLabel\}[\s\S]*owedTo=\{d\.owedTo\}[\s\S]*paymentStatus=\{d\.paymentSummary\?\.paymentStatus\}/);
  assert.match(homeSource, /function SourceBreakdown\(\{ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, paymentStatus = '', pendingSettlementCheckpoint = null, onOpenPayment, onAction, viewedMonthKey = '', onViewMonth \}\)/);
  assert.doesNotMatch(homeSource, /if \(!safeArray\(sources\)\.length\) return null/);
  assert.match(homeSource, /const sourceRows = safeArray\(sources\)/);
  assert.match(homeSource, /const paymentChipLabel = paidConfirmed \? '✅ Đã thanh toán' : paymentPending \? \(pendingSettlementCheckpoint \? '⏳ Chờ thủ quỹ duyệt' : '⏳ Chờ xác nhận'\) : isZeroTotal \? '0'/);
  assert.match(homeSource, /const paymentDisabled = isZeroTotal \|\| paidConfirmed \|\| paymentPending/);
  assert.match(homeSource, /const displayBalanceLabel = paidConfirmed \? 'Đã thanh toán' : isZeroTotal \? 'Số dư tháng này' : balanceLabel/);
  assert.match(homeSource, /\{sourceRows\.length\} nguồn ·/);
  assert.match(homeSource, /formatVND\(Math\.abs\(displayTotalBalance\)\)/);
  assert.match(homeSource, /width: '100%',[\s\S]*?minHeight: 48,[\s\S]*?\{paymentChipLabel\}/);
  assert.match(homeSource, /if \(!paymentDisabled\) onOpenPayment\?\.\(\)/);
  assert.match(homeSource, /cursor: paymentDisabled \? 'default' : 'pointer'/);
  assert.match(homeSource, /aria-label=\{isNegativeTotal \? `Xem \$\{owedTo\} quỹ cần kiểm tra` : 'Xem nguồn tiền'\}/);
  assert.match(homeSource, /setPaymentSheetOpen\(true\)/);
  assert.match(homeSource, /💳 Thanh toán/);
  assert.doesNotMatch(homeSource, /<span style=\{\{ width: 6, height: 6/);
  assert.doesNotMatch(appSource, /settleAll:\s*'settle-all'/);
  assert.doesNotMatch(appSource, /case 'settle-all'/);
  assert.match(appSource, /if \(type === 'settleAll' \|\| type === 'settle'\)/);
  assert.match(appSource, /setHomePaymentOpen\(true\)/);
});

test('Home payment sheet gives treasurers a payment progress dashboard', () => {
  assert.match(screenDataSource, /paymentProgress: buildPaymentProgressRows\(progressProfileBreakdown, members, state, monthLabel, safeArray\(state\?\.monthSettlements\), monthKey\(monthDate\)\)/);
  assert.match(screenDataSource, /treasurerProfileBreakdown/);
  assert.match(screenDataSource, /function buildPaymentProgressRows\(profileBreakdown, members, state, monthLabel, settlements = \[\], selectedYearMonth = ''\)/);
  assert.match(screenDataSource, /value === 'confirmed'/);
  assert.match(screenDataSource, /value === 'pending'/);
  assert.match(screenDataSource, /status: Number\(row\.pendingAmount\) > 0 \? 'pending' : 'unpaid'/);
  assert.match(homeSource, /<TreasurerPaymentDashboard[\s\S]*progressRows=\{\(data\?\.paymentProgress \|\| \[\]\)\.filter/);
  assert.match(homeSource, /function TreasurerPaymentDashboard\(\{ data, progressRows, pendingRecords, refundRows, pendingCheckpointsForTreasurer, confirmedRefunds, onAction, onViewPaymentRecord, onConfirmRefund, onCancelRefund \}\)/);
  assert.doesNotMatch(homeSource, /onDeferMonthBalance/);
  assert.doesNotMatch(homeSource, /onUndoDeferMonthBalance/);
  assert.doesNotMatch(homeSource, /Gộp →/);
  assert.doesNotMatch(homeSource, /Hủy gộp/);
  assert.doesNotMatch(appSource, /type === 'deferMonthBalance'/);
  assert.doesNotMatch(appSource, /type: 'DEFER_MONTH_BALANCE'/);
  assert.doesNotMatch(appSource, /type === 'undoDeferMonthBalance'/);
  assert.doesNotMatch(appSource, /type: 'UNDO_DEFER_MONTH_BALANCE'/);
  assert.match(homeSource, /Tiến độ thu/);
  assert.match(homeSource, /Đã nhận/);
  assert.match(homeSource, /Chờ duyệt/);
  assert.match(homeSource, /Chưa thu/);
  assert.match(homeSource, /Danh sách member/);
  assert.match(homeSource, /buildTreasurerMemberRows/);
  assert.match(homeSource, /item\.paid \? 'Đã nhận' : 'TT'/);
  assert.match(homeSource, /onAction\?\.\('confirmPaymentNotice', record\)/);
  assert.match(homeSource, /onAction\?\.\('rejectPaymentNotice', record\)/);
  assert.match(homeSource, /onSelect=\{\(\) => setShareMember\(\{[\s\S]*memberId: record\.memberId \|\| record\.member_id/);
  assert.match(homeSource, /onShare=\{\(member\) => setShareMember\(member\)\}/);
  assert.match(homeSource, /function MemberShareLinkSheet\(\{ member, monthLabel, onAction, onClose \}\)/);
  assert.match(homeSource, /onAction\?\.\('createMemberBillShare', \{ groupId: member\.groupId, memberId: member\.memberId, copy: false \}\)/);
  assert.match(homeSource, /gridTemplateColumns: 'minmax\(0,1fr\) minmax\(0,1fr\) minmax\(0,1fr\)'/);
  assert.match(homeSource, /title=\{`Danh sách member · \$\{memberRows\.length\}/);
  assert.match(homeSource, /maxHeight: 340, overflowY: 'auto'/);
});

test('GroupDetail no longer shows treasurer pending approval alert outside activity', () => {
  const groupDetailHeroSource = groupDetailSource.slice(
    groupDetailSource.indexOf('{/* Treasurer actions */}'),
    groupDetailSource.indexOf('<SubTabs')
  );
  assert.doesNotMatch(groupDetailHeroSource, /ReviewAlert/);
  assert.doesNotMatch(groupDetailHeroSource, /Cần duyệt/);
  assert.match(groupDetailSource, /onAction\?\.\('approveExpense', \{ expenseId: expense\.id, groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /onAction\?\.\('rejectExpense', \{ expenseId: expense\.id, groupId: d\.id \}\)/);
});

test('AppV2 approves and rejects expenses with the reviewer member from the expense group', () => {
  assert.match(appSource, /function expenseGroupId\(state, expenseId\)/);
  assert.match(appSource, /const groupId = payload\?\.groupId \|\| expenseGroupId\(state, expenseId\)/);
  assert.match(appSource, /\.rpc\('review_expense_group_expense'/);
  assert.match(appSource, /p_status: 'approved'/);
  assert.match(appSource, /p_status: 'rejected'/);
});

test('Home hides monthly member balances and does not render attendance shortcut', () => {
  assert.match(homeSource, /<Screen style=\{\{ paddingBottom: '72px' \}\}>/);
  assert.match(homeSource, /export default function Home\(\{ data, isTreasurer, paymentOpen = false, onPaymentClose, onAction \}\)/);
  assert.doesNotMatch(homeSource, /<PaymentBalanceSection balances=\{d\.memberBalances \|\| \[\]\} onAction=\{onAction\} \/>/);
  assert.doesNotMatch(homeSource, /isTreasurer && d\.todaySession/);
  assert.doesNotMatch(homeSource, /onAction\?\.\('attend', d\.todaySession\.id\)/);
  assert.doesNotMatch(homeSource, /Điểm danh Buổi/);
  assert.match(screenDataSource, /memberBalances: buildHomeMemberBalances\(pickleballState, pickle, today\)/);
  assert.match(screenDataSource, /function buildHomeMemberBalances\(state, pickle, monthDate\)/);
  assert.match(screenDataSource, /buildMemberMonthBalance\(state, pickle, monthSessions, member\.id\)/);
});

test('shared screens and AddExpense sheet define scrollable containers with bottom padding', () => {
  assert.match(primitivesSource, /minHeight: 0/);
  assert.match(primitivesSource, /overflowY: 'auto'/);
  assert.match(primitivesSource, /padding: '0 16px 72px'/);
  assert.match(addExpenseSource, /height: 812/);
  assert.match(addExpenseSource, /overflowY: 'auto'/);
  assert.match(addExpenseSource, /paddingBottom: '72px'/);
});

test('Home data exposes member identity and current-month normalized expense rows', () => {
  assert.match(screenDataSource, /currentUserId,\s*\n\s*currentUserName: state\?\.currentUserName \|\| 'Bạn'/);
  assert.match(screenDataSource, /expenses: buildHomeExpenses\(expenseGroups, currentUserId, members, state\?\.currentUserName, today\)/);
  assert.match(screenDataSource, /function buildHomeExpenses\(groups, currentUserId, members, currentUserName, monthDate\)/);
  assert.match(screenDataSource, /const meForGroup = memberIdForGroup\(group, currentUserId, members, currentUserName\)/);
  assert.match(screenDataSource, /paidBy: expense\.paidBy \|\| expense\.paid_by_member_id/);
  assert.match(screenDataSource, /participants: safeArray\(expense\.participants\)/);
  assert.match(screenDataSource, /splits: safeArray\(expense\.splits\)\.map\(normalizeHomeSplit\)\.filter\(split => split\.memberId\)/);
  assert.match(screenDataSource, /currentMemberId: meForGroup/);
});

test('Home transactions carry relationship metadata for the Của tôi filter', () => {
  assert.match(screenDataSource, /const group = groups\.find\(g => g\.id === expense\.groupId\)/);
  assert.match(screenDataSource, /const normalizedExpense = \{ \.\.\.expense, paidBy, participants, splits \}/);
  assert.match(screenDataSource, /isMine: isExpenseRelatedToMember\(normalizedExpense, meForGroup\)/);
  assert.match(screenDataSource, /function isExpenseRelatedToMember\(expense, memberId\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.participants\)\.some\(member => String\(member\) === id\)/);
  assert.match(screenDataSource, /safeArray\(expense\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === id\)/);
});

test('Home does not render personal balance inside the main hero card', () => {
  assert.doesNotMatch(homeSource, /const memberName = d\.currentUserName \|\| d\.user\.name \|\| d\.user\.firstName/);
  assert.doesNotMatch(homeSource, /const personalBalance = d\.currentUserId\s*\?\s*calculatePersonalBalance\(d\.expenses, d\.currentUserId\)\s*:\s*null/);
  assert.doesNotMatch(homeSource, /\{personalBalance && \(/);
  assert.doesNotMatch(homeSource, /\{memberName \|\| 'Bạn'\}/);
  assert.doesNotMatch(homeSource, /\{formatPersonalBalanceNet\(personalBalance\.net\)\}/);
  assert.doesNotMatch(homeSource, /personalBalance\.owes > 0 \|\| personalBalance\.owed > 0/);
  assert.doesNotMatch(homeSource, /Nợ: \{formatDong\(personalBalance\.owes\)\} · Được nợ: \{formatDong\(personalBalance\.owed\)\}/);
  assert.doesNotMatch(homeSource, /<PersonalBalance/);
  assert.doesNotMatch(homeSource, /function PersonalBalance/);
  assert.doesNotMatch(homeSource, /background: '#1e293b'/);
});

test('Home removes unused personal balance helpers', () => {
  assert.doesNotMatch(homeSource, /function calculatePersonalBalance\(expenses, currentUserId\)/);
  assert.doesNotMatch(homeSource, /function shareForMember\(expense, memberId\)/);
  assert.doesNotMatch(homeSource, /function isBalanceStatus\(status\)/);
  assert.doesNotMatch(homeSource, /function formatDong\(value\)/);
  assert.doesNotMatch(homeSource, /function formatPersonalBalanceNet\(value\)/);
});

test('Home has a controlled Của tôi filter that composes with existing filters', () => {
  assert.match(homeSource, /const \[mineOnly, setMineOnly\] = useState\(true\)/);
  assert.match(homeSource, /const mineMatches = !mineOnly \|\| transactionBelongsToCurrentUser\(tx, d\.currentUserId\)/);
  assert.match(homeSource, /return titleMatches && statusMatches && categoryMatches && mineMatches/);
  assert.match(homeSource, /onClick=\{\(\) => setMineOnly\(value => !value\)\}/);
  assert.match(homeSource, />Của tôi<\/button>/);
});

test('Home Của tôi helper falls back from isMine to paidBy, participants, and splits', () => {
  assert.match(homeSource, /function transactionBelongsToCurrentUser\(tx, currentUserId\)/);
  assert.match(homeSource, /if \(tx\?\.isMine === true\) return true/);
  assert.match(homeSource, /const memberId = tx\.currentMemberId \|\| currentUserId/);
  assert.match(homeSource, /if \(String\(tx\?\.paidBy \|\| ''\) === String\(memberId\)\) return true/);
  assert.match(homeSource, /safeArray\(tx\?\.participants\)\.some\(id => String\(id\) === String\(memberId\)\)/);
  assert.match(homeSource, /safeArray\(tx\?\.splits\)\.some\(split => String\(split\.memberId \|\| split\.member_id\) === String\(memberId\)\)/);
});

test('Home expense rows open expense detail instead of edit form', () => {
  assert.match(homeSource, /onAction\?\.\('viewExpense', \{ expenseId: tx\.id \}\)/);
  assert.match(homeSource, /onClick=\{onView\}/);
  assert.match(homeSource, />›<\/div>/);
  assert.doesNotMatch(homeSource, /onAction\?\.\('editExpense'/);
  assert.doesNotMatch(homeSource, />Sửa<\/button>/);
});

test('GroupDetail activity cards open expense detail for members', () => {
  assert.match(groupDetailSource, /function ActivityCard\(\{ item, isTreasurer, currentMemberId, onAction, onMenu \}\)/);
  assert.match(groupDetailSource, /role="button"/);
  assert.match(groupDetailSource, /tabIndex=\{0\}/);
  assert.match(groupDetailSource, /onClick=\{\(\) => onAction\?\.\('viewExpense', \{ expenseId: item\.id \}\)\}/);
  assert.match(groupDetailSource, /if \(event\.key === 'Enter' \|\| event\.key === ' '\) onAction\?\.\('viewExpense', \{ expenseId: item\.id \}\)/);
  assert.match(groupDetailSource, /event\.stopPropagation\(\); onMenu\?\.\(item\);/);
});

test('Home source breakdown rows open their related module', () => {
  assert.match(homeSource, /<SourceBreakdown[\s\S]*sources=\{heroSourceBreakdown\}[\s\S]*onOpenPayment=\{\(\) => setPaymentSheetOpen\(true\)\}[\s\S]*onAction=\{onAction\}[\s\S]*\/>/);
  assert.match(homeSource, /function SourceBreakdown\(\{ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, paymentStatus = '', pendingSettlementCheckpoint = null, onOpenPayment, onAction, viewedMonthKey = '', onViewMonth \}\)/);
  assert.match(homeSource, /const isPickleball = sourceType === 'pickleball'/);
  assert.match(homeSource, /aria-label=\{`\$\{sourceExpanded \? 'Thu gọn' : 'Mở'\} \$\{source\.sourceLabel\}`\}/);
  assert.match(homeSource, /onClick=\{toggleSource\}/);
  assert.match(homeSource, /onViewMonth\?\.\(row\.month, source\)/);
  assert.match(homeSource, /screen: 'pickleball-overview'/);
  assert.match(homeSource, /screen: 'group-detail'/);
});

test('Home source breakdown highlights pickleball rows', () => {
  const sourceBreakdownSource = homeSource.slice(
    homeSource.indexOf('function SourceBreakdown'),
    homeSource.indexOf('function safeArray')
  );
  assert.match(sourceBreakdownSource, /background: isPickleball \? 'rgba\(52,211,153,0\.10\)' : 'transparent'/);
  assert.match(sourceBreakdownSource, /border: isPickleball \? '1px solid rgba\(52,211,153,0\.26\)' : '1px solid transparent'/);
  assert.match(sourceBreakdownSource, /boxShadow: isPickleball \? '0 10px 24px rgba\(16,185,129,0\.10\)' : 'none'/);
});

test('App routes AddExpense with current member data and existing expense data', () => {
  assert.match(screenDataSource, /getAddExpenseData: \(params\) => buildAddExpenseData\(state, params\)/);
  assert.match(screenDataSource, /const requestedGroupId = normalizeId\(params, 'groupId'\)/);
  assert.match(screenDataSource, /const requestedGroup = requestedGroupId \? safeArray\(state\?\.groups\)\.find/);
  assert.match(screenDataSource, /memberCount: members\.length/);
  assert.match(screenDataSource, /currentMemberId: selectedGroup\.currentMemberId \|\| state\?\.currentUserId/);
  assert.match(screenDataSource, /currentMemberName: currentMember\?\.displayName \|\| currentMember\?\.name \|\| state\?\.currentUserName/);
  assert.match(screenDataSource, /editExpense: expense \? \{/);
  assert.match(appSource, /type === 'editExpense'/);
  assert.match(appSource, /screen: 'add-expense', params: \{ expenseId: payload\.expenseId \}/);
  assert.match(appSource, /<AddExpense data=\{getAddExpenseData\(route\.params\)\} onAction=\{handle\} \/>/);
  assert.match(appSource, /\.rpc\('update_expense_group_expense'/);
});

test('App routes Home viewExpense actions to ExpenseDetail', () => {
  assert.match(appSource, /type === 'viewExpense'/);
  assert.match(appSource, /screen: 'expense-detail', params: \{ expenseId: payload\.expenseId \}/);
});

test('ExpenseDetail data includes permission flags from current user role and submitted expense state', () => {
  assert.match(screenDataSource, /getExpenseDetailData: \(params\) => buildExpenseDetailData\(state, params\)/);
  assert.match(screenDataSource, /const currentUserId = state\?\.currentUserId/);
  assert.match(screenDataSource, /const role = safeArray\(state\?\.members\)\.find\(member => String\(member\.id\) === String\(currentUserId\)\)\?\.role/);
  assert.match(screenDataSource, /const reviewStatus = String\(expense\.status \|\| ''\)\.toLowerCase\(\)/);
  assert.match(screenDataSource, /const canSubmitterRevise = isCurrentSubmitter && \['pending', 'rejected', 'declined'\]\.includes\(reviewStatus\)/);
  assert.match(screenDataSource, /const canEdit = role === 'treasurer' \|\| canSubmitterRevise/);
  assert.match(screenDataSource, /canDelete: role === 'treasurer' \|\| canSubmitterRevise/);
  assert.match(screenDataSource, /status: reviewStatus === 'rejected' \|\| reviewStatus === 'declined' \? 'rejected'/);
});

test('ExpenseDetail hides edit and delete actions unless permission flags are true', () => {
  assert.match(expenseDetailSource, /\{d\.canEdit === true && \(/);
  assert.match(expenseDetailSource, /\{d\.canDelete === true && \(/);
});

test('ExpenseDetail deletes the opened expense and shows receipt images', () => {
  assert.match(screenDataSource, /groupId: group\.id/);
  assert.match(screenDataSource, /receiptImages: safeArray\(expense\.receiptImages \|\| expense\.receipt_images\)/);
  assert.match(expenseDetailSource, /const receiptImages = d\.receiptImages \|\| \[\]/);
  assert.match(expenseDetailSource, /const \[showDeleteConfirm, setShowDeleteConfirm\] = useState\(false\)/);
  assert.match(expenseDetailSource, /Ảnh hóa đơn/);
  assert.match(expenseDetailSource, /receiptImages\.map\(image =>/);
  assert.match(expenseDetailSource, /src=\{image\.url\}/);
  assert.match(expenseDetailSource, /title="Xóa chi tiêu\?"/);
  assert.match(expenseDetailSource, /setShowDeleteConfirm\(true\)/);
  assert.match(expenseDetailSource, /onAction\?\.\('deleteExpense', \{ expenseId: d\.expenseId \|\| d\.id, groupId: d\.groupId, returnToPrevious: true \}\)/);
});

test('ExpenseDetail removes direct payment action and shows rejected status', () => {
  assert.match(expenseDetailSource, /rejected: \{ bg:/);
  assert.match(expenseDetailSource, /Đã từ chối/);
  assert.doesNotMatch(expenseDetailSource, /payNow/);
  assert.doesNotMatch(expenseDetailSource, /Thanh toán \{formatVND/);
});
