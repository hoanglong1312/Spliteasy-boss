import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');

test('member payment sheet uses full unpaid source breakdown, not month-capped hero data', () => {
  assert.match(homeSource, /const heroSourceBreakdown = isTreasurer[\s\S]*\? buildTreasurerOutstandingBreakdown\(progressRowsForHero\)[\s\S]*: \(d\.cappedSourceBreakdown \|\| d\.sourceBreakdown \|\| \[\]\)/);
  assert.match(homeSource, /const paymentSourceBreakdown = d\.paymentSummary\?\.sourceBreakdown \|\| d\.sourceBreakdown \|\| heroSourceBreakdown/);
  assert.match(homeSource, /sourceBreakdown: paymentSourceBreakdown/);
  assert.doesNotMatch(homeSource, /sourceBreakdown: heroSourceBreakdown/);
});

const sliceBetween = (start, end) => {
  const startIndex = homeSource.indexOf(start);
  const endIndex = homeSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, start);
  assert.notEqual(endIndex, -1, end);
  return homeSource.slice(startIndex, endIndex);
};

test('member payment sheet uses bill card layout without share buttons', () => {
  const paymentSheetSource = sliceBetween('function PaymentSheet(', 'function treasurerProfileStatKey');
  const billContentSource = sliceBetween('function PaymentBillCardContent(', 'function PaymentBillCardSheet');
  assert.doesNotMatch(paymentSheetSource, /copyPaymentSummary/);
  assert.doesNotMatch(paymentSheetSource, /Thẻ bill/);
  assert.doesNotMatch(paymentSheetSource, /<PaymentBillCardSheet/);
  assert.match(paymentSheetSource, /<PaymentBillCardContent[\s\S]*memberName=\{paymentNames\.join\(' \+ '\)\}/);
  assert.match(paymentSheetSource, /amount=\{amountToPay\}/);
  assert.match(paymentSheetSource, /qrUrl=\{qrUrl\}/);
  assert.match(paymentSheetSource, /paymentDisplayGroups=\{paymentDisplayGroups\}/);
  assert.match(paymentSheetSource, /selectable/);
  assert.match(paymentSheetSource, /actions=\{\(/);
  assert.match(paymentSheetSource, /Lưu QR/);
  assert.match(paymentSheetSource, /paymentConfirmed[\s\S]*\? 'Đã thanh toán'[\s\S]*: isTreasurer[\s\S]*\? 'Xác nhận đã nộp'[\s\S]*: 'Báo đã chuyển'/);
  assert.match(paymentSheetSource, /\{!canShowQr && \([\s\S]*<PaymentItemSection/);
  assert.match(billContentSource, /selectable = false/);
  assert.match(billContentSource, /selectable && group\.onToggle/);
  assert.doesNotMatch(paymentSheetSource, /width: 210, height: 210/);
});

test('treasurer can confirm own selected payable items directly', () => {
  const homeTopLevel = sliceBetween('export default function Home(', 'function PaymentManagementZone');
  const paymentSheetSource = sliceBetween('function PaymentSheet(', 'function treasurerProfileStatKey');
  const treasurerCardIndex = paymentSheetSource.indexOf("{showOwnPaymentCard && (");
  const dashboardIndex = paymentSheetSource.indexOf("{isTreasurer && (");

  assert.match(homeTopLevel, /onConfirmPayment=\{\(payload\) => onAction\?\.\(isTreasurer \? 'markMemberPaid' : 'confirmPaymentSent', payload\)\}/);
  assert.match(paymentSheetSource, /const hasOwnPaymentItems = ownPaymentItems\.length > 0/);
  assert.match(paymentSheetSource, /const showOwnPaymentCard = hasOwnPaymentItems && \(isTreasurer \|\| netBalance < 0\)/);
  assert.match(paymentSheetSource, /\{showOwnPaymentCard && \(/);
  assert.doesNotMatch(paymentSheetSource, /\{netBalance < 0 && \(/);
  assert.match(paymentSheetSource, /caption=\{isTreasurer \? 'Khoản của thủ quỹ' : undefined\}/);
  assert.match(paymentSheetSource, /isTreasurer[\s\S]*\? 'Xác nhận đã nộp'[\s\S]*: 'Báo đã chuyển'/);
  assert.match(paymentSheetSource, /memberId: data\?\.memberId \|\| data\?\.currentMemberId \|\| data\?\.currentUserId/);
  assert.match(paymentSheetSource, /groupId: data\?\.currentGroupId/);
  assert.match(paymentSheetSource, /\{canShowQr && !isTreasurer && payForRows\.length > 0 && \(/);
  assert.ok(treasurerCardIndex >= 0 && dashboardIndex > treasurerCardIndex);
  assert.match(paymentSheetSource, /!canShowQr[\s\S]*\{isTreasurer \? 'Khoản của thủ quỹ' : 'Thanh toán về thủ quỹ'\}/);
});

test('treasurer confirm payment sheet can snapshot selected items and share bill card', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const treasurerConfirmSource = sliceBetween('function TreasurerConfirmPaymentSheet(', 'function groupPaymentItemsBySource');
  assert.match(dashboardSource, /onRequestSnapshot=\{\(payload\) => onAction\?\.\('requestSettlementCheckpoint', payload\)\}/);
  assert.match(treasurerConfirmSource, /async function requestPaymentSnapshot\(\)/);
  assert.match(treasurerConfirmSource, /groups: \[\.\.\.snapshotGroups\.values\(\)\]/);
  assert.match(treasurerConfirmSource, /const groupId = item\.groupId \|\| item\.row\?\.linkGroupId \|\| item\.row\?\.groupId/);
  assert.match(treasurerConfirmSource, /const memberId = item\.memberId \|\| item\.row\?\.linkMemberId \|\| item\.row\?\.memberId/);
  assert.match(treasurerConfirmSource, /amount: paymentItemsAmountDue\(group\.items\)/);
  assert.match(treasurerConfirmSource, /coveredItems: group\.items\.flatMap\(paymentItemToCoveredItems\)/);
  assert.match(treasurerConfirmSource, /Chờ nhận tiền/);
  assert.doesNotMatch(treasurerConfirmSource, /Copy nội dung/);
  assert.match(treasurerConfirmSource, /Thẻ bill/);
  assert.match(treasurerConfirmSource, /<PaymentBillCardSheet[\s\S]*qrUrl=\{qrUrl\}[\s\S]*paymentDisplayGroups=\{paymentDisplayGroups\}/);
});

test('payment confirm payloads preserve covered items for exact allocation', () => {
  const paymentSheetSource = sliceBetween('function PaymentSheet(', 'function treasurerProfileStatKey');
  const treasurerConfirmSource = sliceBetween('function TreasurerConfirmPaymentSheet(', 'function groupPaymentItemsBySource');
  const sourceItemsSource = sliceBetween('function sourcePaymentItems(', 'function paymentItemsAmountDue');
  const coveredItemSource = sliceBetween('function paymentItemToCoveredSource(', 'function MemberShareLinkSheet');
  assert.match(sourceItemsSource, /sourcePayableItems/);
  assert.match(sourceItemsSource, /coveredItems/);
  assert.match(paymentSheetSource, /const coveredItems = selectedPaymentItems\.flatMap\(paymentItemToCoveredItems\)/);
  assert.match(paymentSheetSource, /coveredItems,/);
  assert.match(treasurerConfirmSource, /coveredItems: group\.items\.flatMap\(paymentItemToCoveredItems\)/);
  assert.match(coveredItemSource, /function paymentItemToCoveredSource\(item\)/);
  assert.match(coveredItemSource, /function paymentItemToCoveredItems\(item\)/);
  assert.match(coveredItemSource, /payableItemKey/);
  assert.match(coveredItemSource, /expenseId/);
});

test('treasurer dashboard can create one bill from selected items across members', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function paymentRowFromTreasurerItems(', 'function TreasurerMemberPaymentRow');
  const confirmSource = sliceBetween('function TreasurerConfirmPaymentSheet(', 'function groupPaymentItemsBySource');
  assert.match(dashboardSource, /selectedTreasurerItems = memberRows\.flatMap/);
  assert.match(dashboardSource, /TT đã chọn/);
  assert.match(dashboardSource, /const selectedTreasurerTotal = paymentItemsAmountDue\(selectedTreasurerItems\)/);
  assert.match(dashboardSource, /setPaymentRow\(\{ \.\.\.paymentRowFromTreasurerItems\(selectedTreasurerItems, data\), collapseRowKeys: selectedTreasurerRowKeys \}\)/);
  assert.match(rowBuilderSource, /profileGroups/);
  assert.match(rowBuilderSource, /paymentGroups/);
  assert.match(rowBuilderSource, /defaultPaymentItemKeys: paymentItems\.map\(item => item\.key\)/);
  assert.match(rowBuilderSource, /const amount = paymentItemsAmountDue\(paymentItems\)/);
  assert.match(homeSource, /paymentDisplayGroups = row\?\.paymentGroups \|\| \[/);
  assert.match(confirmSource, /const paymentGroups = new Map\(\)/);
  assert.match(confirmSource, /const key = `\$\{groupId\}:\$\{memberId\}`/);
  assert.match(confirmSource, /payments: \[\.\.\.paymentGroups\.values\(\)\]\.map/);
  assert.match(confirmSource, /memberId: group\.memberId/);
  assert.match(confirmSource, /coveredItems: group\.items\.flatMap\(paymentItemToCoveredItems\)/);
});

test('treasurer QR download does not change payment status', () => {
  const qrSource = sliceBetween('function MultiMemberQRSheet(', 'function ProgressStat');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');
  assert.doesNotMatch(qrSource, /onRequestSnapshot/);
  assert.match(qrSource, /await fetch\(qrUrl\)/);
  assert.match(qrSource, /Tải QR/);
  assert.match(rowSource, /Đang chờ nhận/);
  assert.match(rowSource, /Chưa chốt/);
});

test('treasurer dashboard derives pending state per payable item', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function buildTreasurerMemberRows', 'function paymentRowFromTreasurerItem');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');

  assert.match(dashboardSource, /buildTreasurerMemberRows\(\{[\s\S]*pendingCheckpoints/);
  assert.match(dashboardSource, /flatMap\(item => paymentItemToCoveredItems\(item\)\)/);
  assert.doesNotMatch(dashboardSource, /pendingCheckpointMemberIds/);
  assert.match(dashboardSource, /const pendingCheckpointsWithState = pendingCheckpoints\.map/);
  assert.match(dashboardSource, /const pendingCheckpointById = new Map\(pendingCheckpointsWithState\.map/);
  assert.doesNotMatch(dashboardSource, /Checkpoint chờ duyệt/);
  assert.match(dashboardSource, /pendingCheckpoints=\{\[\.\.\.new Set\(row\.items\.map\(item => item\.pendingCheckpointId\)\.filter\(Boolean\)\)\]/);
  assert.match(dashboardSource, /onConfirmPending=\{\(checkpointIds\) => withLoading\(\(\) => onAction\?\.\('confirmSettlementCheckpoint', \{ checkpointIds \}\)\)\}/);
  assert.match(dashboardSource, /onRejectPending=\{\(checkpointIds\) => withLoading\(\(\) => onAction\?\.\('rejectSettlementCheckpoint', \{ checkpointIds \}\)\)\}/);
  assert.match(homeSource, /groupName: item\.sourceLabel/);

  assert.doesNotMatch(rowBuilderSource, /items\.flatMap\(item => paymentItemToCoveredItems\(item\)/);
  assert.match(rowBuilderSource, /const coveredItems = paymentItemToCoveredItems\(item\)/);
  assert.match(rowBuilderSource, /const itemBuckets = new Map\(\)/);
  assert.match(rowBuilderSource, /coveredItems: bucket\.coveredItems/);
  assert.match(rowBuilderSource, /pendingCheckpointId/);
  assert.match(rowBuilderSource, /pendingAmount/);
  assert.match(rowBuilderSource, /unsettledAmount/);

  assert.match(rowSource, /const unpaidItems = row\.items\.filter\(item => !item\.paid && !item\.pending/);
  assert.match(rowSource, /const selected = !item\.paid && !item\.pending/);
  assert.match(rowSource, /item\.pending \? 'Đang chờ nhận' : 'Chưa chốt'/);
  assert.match(rowSource, /Đang chờ \$\{formatVND\(row\.pendingAmount\)\}/);
  assert.match(rowSource, /Chưa chốt \$\{formatVND\(row\.unsettledAmount\)\}/);
  assert.match(rowSource, /const pendingCheckpointIds = \[\.\.\.new Set\(safeArray\(pendingCheckpoints\)\.map\(checkpoint => checkpoint\.id\)\.filter\(Boolean\)\)\]/);
  assert.match(rowSource, /const pendingApprovalDisabled = safeArray\(pendingCheckpoints\)\.some\(checkpoint => checkpoint\.stale\)/);
  assert.match(rowSource, /disabled=\{pendingApprovalDisabled\}[\s\S]*Duyệt tất cả/);
  assert.match(rowSource, /onRejectPending\?\.\(pendingCheckpointIds\)[\s\S]*Từ chối tất cả/);
});

test('treasurer dashboard keeps confirmed checkpoint members as paid history', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function buildTreasurerMemberRows', 'function paymentRowFromTreasurerItem');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');

  assert.match(dashboardSource, /confirmedCheckpointsForTreasurer/);
  assert.match(dashboardSource, /buildTreasurerMemberRows\(\{[\s\S]*confirmedCheckpoints/);
  assert.match(rowBuilderSource, /safeArray\(confirmedCheckpoints\)\.forEach/);
  assert.match(rowBuilderSource, /const checkpointItems = safeArray\(checkpoint\.coveredItems \|\| checkpoint\.covered_items\)/);
  assert.match(rowBuilderSource, /paidPayableItemKeys/);
  assert.match(rowBuilderSource, /const checkpointMonthBuckets = new Map\(\)/);
  assert.match(rowBuilderSource, /const bucketKey = `\$\{sourceType\}:\$\{sourceId\}:\$\{itemMonth \|\| itemMonthLabel\}`/);
  assert.match(rowBuilderSource, /checkpointMonthBuckets\.forEach/);
  assert.match(rowBuilderSource, /coveredItems: bucket\.items/);
  assert.match(rowBuilderSource, /itemCount: bucket\.items\.length/);
  assert.match(rowBuilderSource, /amount: bucket\.items\.reduce/);
  assert.match(rowBuilderSource, /paid: true/);
  assert.match(rowBuilderSource, /memberRow\.amountPaid = paymentItemsAmountDue/);
  assert.match(rowSource, /group\.items\.reduce\(\(sum, item\) => sum \+ \(Number\(item\.itemCount\) \|\| 1\), 0\)/);
  assert.match(rowSource, /`\$\{item\.monthLabel \|\| fullMonthLabel\(item\.month\) \|\| 'Không rõ tháng'\} · \$\{item\.itemCount\} khoản`/);
  assert.match(dashboardSource, /onUndoPaid=\{\(item\) => withLoading\(\(\) => \{/);
  assert.match(dashboardSource, /window\.confirm\('Hoàn tác lần nhận tiền này\? Các khoản đã chốt sẽ quay lại trạng thái chờ duyệt\.'\)/);
  assert.match(dashboardSource, /item\.checkpoint \? onAction\?\.\('undoSettlementCheckpoint', \{ checkpointId: item\.checkpoint\.id \}\) : onAction\?\.\('cancelPaymentRecord', item\.record\)/);
  assert.match(rowSource, /onUndoPaid\?\.\(item\)/);
  assert.match(rowSource, />Đã nhận<\/span>/);
  assert.match(rowSource, />Hoàn tác<\/button>/);
  assert.match(rowSource, /const paidActionRow = item\.paid && !isRefund/);
  assert.match(rowSource, /gridTemplateColumns: paidActionRow \? '20px minmax\(0,1fr\) auto' : '20px minmax\(0,1fr\) auto auto'/);
  assert.match(rowSource, /gridColumn: paidActionRow \? '2 \/ -1' : 'auto'/);
  assert.doesNotMatch(rowSource, /if \(item\.paid\) return onCancelPaid\?\.\(item\.record\)/);
});

test('treasurer dashboard nets signed debt and credit items', () => {
  const rowBuilderSource = sliceBetween('function buildTreasurerMemberRows', 'function paymentRowFromTreasurerItem');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');
  const confirmSource = sliceBetween('function TreasurerConfirmPaymentSheet(', 'function groupPaymentItemsBySource');
  assert.match(rowBuilderSource, /memberRow\.amountDue = paymentItemsAmountDue\(memberRow\.items\.filter\(item => !item\.paid && item\.kind !== 'refund'\)\)/);
  assert.match(rowSource, /const selectedUnpaidTotal = paymentItemsAmountDue\(selectedUnpaidItems\)/);
  assert.match(rowSource, /const isCredit = Number\(item\.amount\) > 0/);
  assert.match(rowSource, /\{signedVND\(item\.amount\)\}/);
  assert.match(confirmSource, /const selectedTotal = paymentItemsAmountDue\(selectedItems\)/);
});

test('treasurer member cards can bulk select, clear all, and collapse after confirmed payment', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');
  assert.match(dashboardSource, /function setTreasurerRowSelection\(row, selected\)/);
  assert.match(dashboardSource, /selected \? next\.add\(item\.key\) : next\.delete\(item\.key\)/);
  assert.match(dashboardSource, /Bỏ chọn tất cả/);
  assert.match(dashboardSource, /setSelectedTreasurerItemKeys\(new Set\(\)\)/);
  assert.match(dashboardSource, /const selectedTreasurerRowKeys = memberRows\.filter/);
  assert.match(dashboardSource, /collapseRowKeys: selectedTreasurerRowKeys/);
  assert.match(dashboardSource, /setCollapsedTreasurerRows\(prev => \(\{ keys: safeArray\(paymentRow\?\.collapseRowKeys\), tick: prev\.tick \+ 1 \}\)\)/);
  assert.match(dashboardSource, /onToggleRowSelection=\{\(selected\) => setTreasurerRowSelection\(row, selected\)\}/);
  assert.match(rowSource, /collapseTick/);
  assert.match(rowSource, /const rowAllSelected = unpaidItems\.length > 0 && unpaidItems\.every\(item => selectedKeys\?\.has\?\.\(item\.key\)\)/);
  assert.match(rowSource, /onToggleRowSelection\?\.\(!rowAllSelected\)/);
  assert.match(rowSource, /useEffect\(\(\) => \{ if \(collapseTick\) setExpanded\(false\); \}, \[collapseTick\]\)/);
  assert.match(rowSource, /Chọn hết/);
  assert.match(rowSource, /Bỏ chọn/);
});

test('treasurer refund rows can open bill card and add missing bank info', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function buildTreasurerMemberRows', 'function paymentRowFromTreasurerItem');
  const rowSource = sliceBetween('function TreasurerMemberPaymentRow', 'function TreasurerConfirmPaymentSheet');
  const billContentSource = sliceBetween('function PaymentBillCardContent(', 'function PaymentBillCardSheet');
  assert.match(rowBuilderSource, /bank: row\.bank \|\| \{\}/);
  assert.match(rowBuilderSource, /memberName: memberRow\.name/);
  assert.match(dashboardSource, /const \[refundBillItem, setRefundBillItem\] = useState\(null\)/);
  assert.match(dashboardSource, /const \[refundBankItem, setRefundBankItem\] = useState\(null\)/);
  assert.match(dashboardSource, /const refundBillBankReady = refundBillItem \? Boolean\(resolveVietQrBank\(refundBillItem\.bank \|\| \{\}\) && refundBillItem\.bank\?\.account && refundBillItem\.bank\?\.holder\) : false/);
  assert.match(dashboardSource, /onRefundBill=\{\(item\) => setRefundBillItem\(item\)\}/);
  assert.match(dashboardSource, /onCancelRefund=\{\(item\) => onCancelRefund\?\.\(item\)\}/);
  assert.match(rowSource, /onRefundBill/);
  assert.match(rowSource, /onCancelRefund/);
  assert.match(rowSource, /Thẻ bill/);
  assert.doesNotMatch(rowSource, /Bổ sung STK/);
  assert.doesNotMatch(rowSource, /Sửa STK/);
  assert.match(dashboardSource, /footerActions=\{\(/);
  assert.match(dashboardSource, /setRefundBankItem\(refundBillItem\)/);
  assert.match(dashboardSource, /\{refundBillBankReady \? 'Sửa STK' : 'Bổ sung STK'\}/);
  assert.doesNotMatch(rowSource, /isRefund && !item\.paid && !refundBankReady/);
  assert.doesNotMatch(rowSource, /isRefund && !refundBankReady/);
  assert.match(rowSource, /if \(isRefund && item\.paid\) return onCancelRefund\?\.\(item\)/);
  assert.match(dashboardSource, /buildRefundBillData\(refundBillItem\)/);
  assert.match(dashboardSource, /<RefundBankSheet/);
  assert.match(homeSource, /function buildRefundBillData\(item\)/);
  assert.match(homeSource, /function RefundBankSheet\(\{ item, onAction, onClose, onSaved \}\)/);
  assert.match(rowBuilderSource, /profileId: row\.profileId \|\| row\.profile_id \|\| ''/);
  assert.match(rowBuilderSource, /memberId: row\.memberId \|\| row\.member_id \|\| ''/);
  assert.match(homeSource, /const profileId = item\?\.profileId \|\| item\?\.profile_id \|\| item\?\.refundRow\?\.profileId \|\| item\?\.refundRow\?\.profile_id \|\| ''/);
  assert.match(homeSource, /const canSave = Boolean\(profileId && resolveVietQrBank\(\{ name: bankName \}\) && bankAccount\.trim\(\) && bankAccountName\.trim\(\)\)/);
  assert.match(homeSource, /onAction\?\.\('editMember'/);
  assert.match(billContentSource, /caption = 'Cần chuyển cho thủ quỹ'/);
});

test('treasurer refund confirmation sends selected month sources for persistence', () => {
  const homeTopLevel = sliceBetween('export default function Home(', 'function PaymentManagementZone');
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');

  assert.match(homeTopLevel, /onAction\?\.\('markRefundPaid', item\)/);
  assert.match(dashboardSource, /onConfirmRefund=\{\(item\) => onConfirmRefund\?\.\(item\)\}/);
});

test('saving refund bank updates the open refund bill item so QR appears immediately', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const refundBankSource = sliceBetween('function RefundBankSheet(', 'function PaymentBillCardContent');
  assert.match(homeSource, /function RefundBankSheet\(\{ item, onAction, onClose, onSaved \}\)/);
  assert.match(refundBankSource, /const savedBank = \{[\s\S]*name: bankName\.trim\(\),[\s\S]*code: bankName\.trim\(\),[\s\S]*account: bankAccount\.trim\(\),[\s\S]*holder: bankAccountName\.trim\(\),[\s\S]*\}/);
  assert.match(refundBankSource, /onSaved\?\.\(savedBank\)/);
  assert.match(dashboardSource, /onSaved=\{\(bank\) => \{/);
  assert.match(dashboardSource, /setRefundBillItem\(item => item \? \{[\s\S]*\.\.\.item,[\s\S]*bank,[\s\S]*refundRow: item\.refundRow \? \{ \.\.\.item\.refundRow, bank \} : item\.refundRow,[\s\S]*\} : item\)/);
});

test('bill card only renders checked payment items grouped by profile source and month', () => {
  const billContentSource = sliceBetween('function PaymentBillCardContent(', 'function PaymentBillCardSheet');
  const billCardSource = sliceBetween('function PaymentBillCardSheet(', 'function signedVND');
  assert.match(homeSource, /function PaymentBillCardContent\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, selectable = false, actions = null, qrFallbackAction = null, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5' \}\)/);
  assert.match(homeSource, /function PaymentBillCardSheet\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5', footerActions = null, onClose \}\)/);
  assert.match(billCardSource, /<PaymentBillCardContent[\s\S]*paymentDisplayGroups=\{paymentDisplayGroups\}/);
  assert.match(homeSource, /group\.items\.filter\(item => group\.checkedKeys\?\.has\?\.\(item\.key\)\)/);
  assert.match(billContentSource, /groupPaymentItemsBySource\(selectable \? group\.items : selectedItems\)/);
  assert.match(homeSource, /item\.monthLabel \|\| fullMonthLabel\(item\.month\)/);
  assert.match(billContentSource, /Các khoản của<\/span>/);
  assert.match(billContentSource, /border: '1px solid rgba\(147,197,253,0\.48\)'/);
  assert.doesNotMatch(billContentSource, /paymentTarget/);
  assert.doesNotMatch(billContentSource, /STK|Chủ TK|NH/);
  assert.doesNotMatch(billContentSource, /Nội dung CK/);
  assert.match(billContentSource, /\{actions && <div style=\{\{ marginTop: 10 \}\}>\{actions\}<\/div>\}/);
  assert.doesNotMatch(billContentSource, /width: 230, height: 230/);
  assert.match(billContentSource, /width: 128, height: 128, padding: 5/);
  assert.match(billContentSource, /aria-label="Phóng to QR thanh toán"/);
  assert.match(billContentSource, /setQrPreviewOpen\(true\)/);
  assert.match(billContentSource, /BottomSheet title="QR thanh toán"/);
  assert.match(billCardSource, /Share ảnh/);
  assert.match(billContentSource, /\{qrFallbackAction\}/);
  assert.match(billContentSource, /data-bill-ui-only="true"/);
  assert.match(billCardSource, /qrFallbackAction=\{footerActions\}/);
  assert.match(billCardSource, /Đang share\.\.\./);
  assert.match(homeSource, /import \{ toPng \} from 'html-to-image';/);
  assert.match(homeSource, /billFilename = `\$\{safeFilename\(memberName \|\| 'bill'\)\}-bill\.png`/);
  assert.match(homeSource, /await toPng\(cardRef\.current/);
  assert.match(billCardSource, /new File\(\[blob\], billFilename, \{ type: 'image\/png' \}\)/);
  assert.match(billCardSource, /navigator\?\.share/);
  assert.match(billCardSource, /navigator\?\.canShare\?\.\(\{ files: \[file\] \}\)/);
  assert.match(billCardSource, /await navigator\.share\(\{\s*files: \[file\],\s*\}\)/);
  assert.doesNotMatch(billCardSource, /text: transferDescription/);
  assert.match(homeSource, /function buildElementImageBlob/);
  assert.match(homeSource, /filter: node => node\?\.getAttribute\?\.\('data-bill-ui-only'\) !== 'true'/);
  assert.match(homeSource, /clone\.querySelectorAll\('\[data-bill-ui-only="true"\]'\)\.forEach\(node => node\.remove\(\)\)/);
  assert.match(homeSource, /function triggerDownload/);
  assert.match(billCardSource, /triggerDownload\(dataUrl, billFilename\)/);
  assert.doesNotMatch(billCardSource, /showSaveFilePicker/);
});

test('bill image export embeds QR before capturing card', () => {
  const billCardSource = sliceBetween('function PaymentBillCardSheet(', 'function buildElementImageBlob');
  const billContentSource = sliceBetween('function PaymentBillCardContent(', 'function PaymentBillCardSheet');
  assert.match(homeSource, /function billQrOnlyUrl\(value\)/);
  assert.match(homeSource, /\.replace\(\/-compact2\\\.\(png\|jpg\|jpeg\)\(\?=\(\?:\\\?\|\$\)\)\/i, '-qr_only\.\$1'\)/);
  assert.match(billContentSource, /const displayQrUrl = billQrOnlyUrl\(qrUrl\)/);
  assert.match(billContentSource, /width: 128, height: 128, padding: 5/);
  assert.match(billContentSource, /maxWidth: 380, padding: 10/);
  assert.match(billContentSource, /<img data-bill-qr="true" src=\{displayQrUrl\}/);
  assert.match(billContentSource, /src=\{displayQrUrl\} alt="QR thanh toán phóng to"/);
  assert.match(homeSource, /function readBlobAsDataUrl\(blob\)/);
  assert.match(homeSource, /function waitForElementImages\(element\)/);
  assert.match(homeSource, /function drawBillQrOnImage\(dataUrl, cardElement, qrDataUrl\)/);
  assert.match(billCardSource, /const sourceQrUrl = billQrOnlyUrl\(qrUrl\)/);
  assert.match(billCardSource, /const \[billQrUrl, setBillQrUrl\] = useState\(sourceQrUrl\)/);
  assert.match(billCardSource, /readBlobAsDataUrl\(blob\)/);
  assert.match(billCardSource, /qrUrl=\{billQrUrl\}/);
  assert.match(billCardSource, /await waitForElementImages\(cardRef\.current\)/);
  assert.match(billCardSource, /const capturedDataUrl = await toPng\(cardRef\.current/);
  assert.match(billCardSource, /const dataUrl = await drawBillQrOnImage\(capturedDataUrl, cardRef\.current, billQrUrl\)/);
  assert.match(homeSource, /canvas\.getContext\('2d'\)/);
  assert.match(homeSource, /context\.drawImage\(baseImage, 0, 0\)/);
  assert.match(homeSource, /context\.drawImage\(qrImage, x, y, width, height\)/);
});
