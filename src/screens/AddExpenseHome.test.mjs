import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const addExpenseSource = readFileSync(new URL('./AddExpense.jsx', import.meta.url), 'utf8');
const groupDetailSource = readFileSync(new URL('./GroupDetail.jsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');
const expenseDetailSource = readFileSync(new URL('./ExpenseDetail.jsx', import.meta.url), 'utf8');
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
  assert.match(groupDetailSource, /const \[menuOpen, setMenuOpen\] = useState\(false\)/);
  assert.match(groupDetailSource, /onAction\?\.\('addExpense', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /onAction\?\.\('settle', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /Sửa thông tin nhóm/);
  assert.match(groupDetailSource, /Mã mời thành viên/);
  assert.match(groupDetailSource, /Xóa nhóm/);
  assert.match(groupDetailSource, /onAction\?\.\('editGroup'/);
  assert.match(groupDetailSource, /action=\{<div[\s\S]*\{d\.emoji \|\| '👥'\}/);
  assert.match(groupDetailSource, /onAction\?\.\('deleteGroup', \{ groupId: d\.id \}\)/);
  assert.match(groupDetailSource, /const \[deleteConfirmGroup, setDeleteConfirmGroup\] = useState\(false\)/);
  assert.match(groupDetailSource, /<BottomSheet title="Xóa nhóm\?"/);
  assert.match(groupDetailSource, /Dữ liệu nhóm sẽ được ẩn khỏi danh sách nhóm/);
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

test('GroupDetail lets group creators manage members without treasurer role', () => {
  assert.match(groupDetailSource, /const canManageMembers = Boolean\(isTreasurer \|\| d\.isGroupCreator\)/);
  assert.match(groupDetailSource, /const canAddMembers = true/);
  assert.match(groupDetailSource, /<MemberDetailPanel[\s\S]*isTreasurer=\{canManageMembers\}/);
  assert.match(groupDetailSource, /\{canAddMembers && \(\s*<Button variant="ghost"[\s\S]*\+ Thêm thành viên/);
  assert.match(groupDetailSource, /<MemberRow[\s\S]*isTreasurer=\{canManageMembers\}/);
  assert.match(groupDetailSource, /\{memberMenu && canManageMembers && \(/);
  assert.match(groupDetailSource, /\{deleteConfirmMember && canManageMembers && \(/);
  assert.match(screenDataSource, /isGroupCreator,/);
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

test('GroupsList separates group metadata from balance and renders zero balance as 0', () => {
  const groupCardSource = groupDetailSource && homeSource
    ? readFileSync(new URL('./GroupsList.jsx', import.meta.url), 'utf8')
    : '';
  assert.match(groupCardSource, /const balanceLabel = g\.balance === 0 \? '0' : formatVNDShort\(g\.balance\)/);
  assert.doesNotMatch(groupCardSource, /\{g\.balance === 0 \? 'Cân bằng' : formatVNDShort\(g\.balance\)\}/);
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
  assert.match(groupDetailSource, /SỐ DƯ TRONG NHÓM/);
  assert.match(groupDetailSource, /THÔNG TIN THANH TOÁN/);
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
  assert.match(memberDetailSource, /<Button variant="brand" style=\{\{ fontSize: 13 \}\} onClick=\{onEdit\}>Chỉnh sửa thông tin<\/Button>/);
  assert.doesNotMatch(memberDetailSource, />Sửa thành viên<\/Button>/);
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
  assert.match(memberDetailSource, /\{isTreasurer && \(\s*<Card style=\{\{ marginTop: 14 \}\}>\s*<SectionTitle>THÔNG TIN THANH TOÁN<\/SectionTitle>/);
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
    groupDetailSource.indexOf('function MiniBillStat')
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
  assert.match(groupDetailSource, /placeholder="Tìm giao dịch/);
  assert.match(memberDetailSource, /<NetBillStat value=\{summary\.net\} \/>/);
  assert.match(memberDetailSource, /gridTemplateColumns: '1fr 1fr'/);
  assert.doesNotMatch(memberDetailSource, /\{ key: 'settled', label: 'Cân bằng' \}/);
  assert.match(groupDetailSource, /function MemberTransactionRow\(\{ transaction, onOpen \}\)/);
  assert.match(groupDetailSource, /function NetBillStat\(\{ value \}\)/);
  assert.match(groupDetailSource, /whiteSpace: 'nowrap'/);
  assert.match(memberTransactionSource, /<TransactionPill label=\{roleLabel\} tone=\{roleTone\} \/>/);
  assert.match(memberTransactionSource, /<TransactionPill label=\{statusLabel\} tone=\{statusTone\} \/>/);
  assert.match(memberTransactionSource, /transactionStatusLabel\(transaction\.status\)/);
  assert.match(groupDetailSource, /onAction\?\.\('expenseDetail', \{ expenseId: transaction\.id \}\)/);
  assert.doesNotMatch(screenDataSource, /payerTransactions: buildMemberPayerTransactions/);
  assert.doesNotMatch(groupDetailSource, /member\.payerTransactions/);
});

test('GroupDetail member detail exposes share link and member bill VietQR actions', () => {
  assert.match(groupDetailSource, /import \{ BANK_LIST, generateQRUrl \} from '\.\.\/lib\/vietqr\.js'/);
  assert.match(groupDetailSource, /const \[billQrOpen, setBillQrOpen\] = useState\(false\)/);
  assert.match(groupDetailSource, /onAction\?\.\('createMemberBillShare'/);
  assert.match(groupDetailSource, /Tạo QR thanh toán/);
  assert.match(groupDetailSource, /generateQRUrl\(\{/);
  assert.match(groupDetailSource, /member\.paymentTarget/);
  assert.match(groupDetailSource, /Cập nhật thông tin thanh toán/);
});

test('App supports public member bill tokens without requiring login', () => {
  assert.match(appSource, /import MemberBillShare from '\.\/screens\/MemberBillShare'/);
  assert.match(appSource, /useState\(\(\) => publicBillTokenFromLocation\(\)\)/);
  assert.match(appSource, /\.rpc\('get_member_bill_share'/);
  assert.match(appSource, /if \(publicBillToken\)/);
  assert.match(appSource, /<MemberBillShare data=\{publicBillData\}/);
  assert.match(appSource, /if \(type === 'createMemberBillShare'\)/);
  assert.match(appSource, /\.rpc\('create_member_bill_share_token'/);
});

test('App uses one selectedYearMonth across home, groups, group detail, and pickleball screens', () => {
  assert.match(storeSource, /selectedYearMonth: monthKey\(new Date\(\)\)/);
  assert.match(storeSource, /case 'SET_SELECTED_MONTH':/);
  assert.match(appSource, /dispatch\(\{ type: 'SET_SELECTED_MONTH', selectedYearMonth: nextYearMonth \}\)/);
  assert.match(screenDataSource, /selectedYearMonth = monthKey\(new Date\(\)\)/);
  assert.match(screenDataSource, /buildHomeData\(state, currentUserId, members, groups, pickle, pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupsListData\(groups, currentUserId, members, currentUserName, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildGroupDetailData\(group, currentUserId, members, currentUserName, selectedYearMonth, state\?\.profiles\)/);
  assert.match(screenDataSource, /buildPickleballOverviewData\(pickleballState, pickle, _allPickle, currentUserId, members, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildPickleballMembersData\(pickleballState, selectedYearMonth\)/);
  assert.match(screenDataSource, /buildMemberDetailData\(pickleballState, memberId, selectedYearMonth\)/);
});

test('GroupDetail uses group-specific treasurer role for normal expense groups', () => {
  assert.match(screenDataSource, /const currentGroupMember = groupMembers\.find\(member => String\(member\.id\) === String\(memberIdForGroup\(g, currentUserId, members, currentUserName\)\)\)/);
  assert.match(screenDataSource, /const isGroupCreator = isMemberGroupCreator\(g, currentGroupMember\) \|\| isMemberGroupCreator\(g, currentMember\)/);
  assert.match(screenDataSource, /const isSoloExpenseGroup = groupMembers\.length === 1 && groupKind\(g\) !== 'pickleball'/);
  assert.match(screenDataSource, /const isGroupTreasurer = Boolean\(isGroupCreator \|\| currentGroupMember\?\.role === 'treasurer' \|\| \(Boolean\(currentGroupMember\) && isSoloExpenseGroup\)\)/);
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
  assert.match(homeSource, /import React, \{ useState \} from 'react'/);
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
  assert.match(screenDataSource, /function buildPendingExpenseApprovals\(groups, members, currentUserId, currentUserName\)/);
  assert.match(screenDataSource, /filter\(group => canReviewPendingExpensesForGroup\(group, members, currentUserId, currentUserName\)\)/);
  assert.match(screenDataSource, /function canReviewPendingExpensesForGroup\(group, members, currentUserId, currentUserName\)/);
  assert.match(homeSource, /const pendingExpenses = d\.pendingExpenses \|\| \[\]/);
  assert.match(homeSource, /<PendingApprovalZone expenses=\{pendingExpenses\} onAction=\{onAction\} \/>/);
  assert.match(homeSource, /function PendingApprovalZone\(\{ expenses, onAction \}\)/);
  assert.match(homeSource, /const \[expanded, setExpanded\] = useState\(false\)/);
  assert.match(homeSource, /Cần duyệt · \{expenses\.length\} chi tiêu/);
  assert.match(homeSource, /aria-expanded=\{expanded\}/);
  assert.match(homeSource, /\{expanded && \(/);
  assert.match(homeSource, /onAction\?\.\('approveExpense', \{ expenseId: expense\.id, groupId: expense\.groupId \}\)/);
  assert.match(homeSource, /onAction\?\.\('rejectExpense', \{ expenseId: expense\.id, groupId: expense\.groupId \}\)/);
});

test('Home hero review chip is an explicit settle-all action', () => {
  assert.doesNotMatch(homeSource, /<ModuleHero/);
  assert.doesNotMatch(homeSource, /onAction\?\.\('addExpense'\)/);
  assert.doesNotMatch(homeSource, />\+ Thêm chi tiêu<\/Button>/);
  assert.doesNotMatch(homeSource, />Chi tiết quỹ<\/Button>/);
  assert.match(homeSource, /<SourceBreakdown[\s\S]*totalBalance=\{d\.totalBalance\}[\s\S]*balanceLabel=\{balanceLabel\}[\s\S]*owedTo=\{d\.owedTo\}/);
  assert.match(homeSource, /function SourceBreakdown\(\{ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, onAction \}\)/);
  assert.match(homeSource, /Tổng hợp tất cả nguồn tiền tháng này/);
  assert.match(homeSource, /formatVND\(Math\.abs\(totalBalance\)\)/);
  assert.match(homeSource, /aria-label=\{isNegativeTotal \? `Xem \$\{owedTo\} quỹ cần kiểm tra` : 'Xem nguồn tiền'\}/);
  assert.match(homeSource, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onAction\?\.\('settleAll'\); \}\}/);
  assert.match(homeSource, /Xem \{owedTo\} quỹ cần kiểm tra/);
  assert.doesNotMatch(homeSource, /<span style=\{\{ width: 6, height: 6/);
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
  assert.match(homeSource, /export default function Home\(\{ data, isTreasurer, onAction \}\)/);
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
  assert.match(homeSource, /<SourceBreakdown[\s\S]*sources=\{d\.sourceBreakdown \|\| \[\]\}[\s\S]*onAction=\{onAction\}[\s\S]*\/>/);
  assert.match(homeSource, /function SourceBreakdown\(\{ sources, totalBalance = 0, balanceLabel = '', owedTo = 0, onAction \}\)/);
  assert.match(homeSource, /const openSource = \(\) => \{/);
  assert.match(homeSource, /if \(isPickleball\) \{\s*onAction\?\.\('tab', 'pickleball'\)/);
  assert.match(homeSource, /onAction\?\.\('open', source\.sourceId\)/);
  assert.match(homeSource, /<button[\s\S]*type="button"[\s\S]*aria-label=\{`Mở \$\{source\.sourceLabel\}`\}[\s\S]*onClick=\{openSource\}/);
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
