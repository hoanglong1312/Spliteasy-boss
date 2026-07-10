import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(new URL('./Home.jsx', import.meta.url), 'utf8');

test('member payment sheet uses full unpaid source breakdown, not month-capped hero data', () => {
  assert.match(homeSource, /const heroSourceBreakdown = isTreasurer \? \(d\.sourceBreakdown \|\| \[\]\) : \(d\.cappedSourceBreakdown \|\| d\.sourceBreakdown \|\| \[\]\)/);
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
  assert.doesNotMatch(paymentSheetSource, /copyPaymentSummary/);
  assert.doesNotMatch(paymentSheetSource, /Thẻ bill/);
  assert.doesNotMatch(paymentSheetSource, /<PaymentBillCardSheet/);
  assert.match(paymentSheetSource, /<PaymentBillCardContent[\s\S]*memberName=\{paymentNames\.join\(' \+ '\)\}/);
  assert.match(paymentSheetSource, /amount=\{amountToPay\}/);
  assert.match(paymentSheetSource, /qrUrl=\{qrUrl\}/);
  assert.match(paymentSheetSource, /paymentDisplayGroups=\{paymentDisplayGroups\}/);
  assert.match(paymentSheetSource, /actions=\{\(/);
  assert.match(paymentSheetSource, /Lưu QR/);
  assert.match(paymentSheetSource, /Đã thanh toán/);
  assert.doesNotMatch(paymentSheetSource, /width: 210, height: 210/);
});

test('treasurer confirm payment sheet can share selected payment items as text and bill card', () => {
  const treasurerConfirmSource = sliceBetween('function TreasurerConfirmPaymentSheet(', 'function groupPaymentItemsBySource');
  assert.match(homeSource, /function buildPaymentShareText\(\{ memberName, amount, transferDescription, paymentTarget, items \}\)/);
  assert.match(treasurerConfirmSource, /navigator\.clipboard\.writeText\(buildPaymentShareText\(\{[\s\S]*items: selectedItems/);
  assert.match(treasurerConfirmSource, /Copy nội dung/);
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
  assert.match(treasurerConfirmSource, /coveredItems: selectedItems\.flatMap\(paymentItemToCoveredItems\)/);
  assert.match(coveredItemSource, /function paymentItemToCoveredSource\(item\)/);
  assert.match(coveredItemSource, /function paymentItemToCoveredItems\(item\)/);
  assert.match(coveredItemSource, /payableItemKey/);
  assert.match(coveredItemSource, /expenseId/);
});

test('treasurer dashboard can create one bill from selected items across members', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function paymentRowFromTreasurerItems(', 'function TreasurerMemberPaymentRow');
  assert.match(dashboardSource, /selectedTreasurerItems = memberRows\.flatMap/);
  assert.match(dashboardSource, /TT đã chọn/);
  assert.match(dashboardSource, /const selectedTreasurerTotal = paymentItemsAmountDue\(selectedTreasurerItems\)/);
  assert.match(dashboardSource, /setPaymentRow\(\{ \.\.\.paymentRowFromTreasurerItems\(selectedTreasurerItems, data\), collapseRowKeys: selectedTreasurerRowKeys \}\)/);
  assert.match(rowBuilderSource, /profileGroups/);
  assert.match(rowBuilderSource, /paymentGroups/);
  assert.match(rowBuilderSource, /defaultPaymentItemKeys: paymentItems\.map\(item => item\.key\)/);
  assert.match(rowBuilderSource, /const amount = paymentItemsAmountDue\(paymentItems\)/);
  assert.match(homeSource, /paymentDisplayGroups = row\?\.paymentGroups \|\| \[/);
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
  assert.match(dashboardSource, /onCancelRefund=\{\(item\) => onCancelRefund\?\.\(item\.refundRow\)\}/);
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
  assert.match(homeSource, /function PaymentBillCardContent\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, actions = null, qrFallbackAction = null, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5' \}\)/);
  assert.match(homeSource, /function PaymentBillCardSheet\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, caption = 'Cần chuyển cho thủ quỹ', amountColor = '#fca5a5', footerActions = null, onClose \}\)/);
  assert.match(billCardSource, /<PaymentBillCardContent[\s\S]*paymentDisplayGroups=\{paymentDisplayGroups\}/);
  assert.match(homeSource, /group\.items\.filter\(item => group\.checkedKeys\?\.has\?\.\(item\.key\)\)/);
  assert.match(homeSource, /groupPaymentItemsBySource\(selectedItems\)/);
  assert.match(homeSource, /item\.monthLabel \|\| fullMonthLabel\(item\.month\)/);
  assert.match(billContentSource, /Các khoản của<\/span>/);
  assert.match(billContentSource, /border: '1px solid rgba\(147,197,253,0\.48\)'/);
  assert.doesNotMatch(billContentSource, /paymentTarget/);
  assert.doesNotMatch(billContentSource, /STK|Chủ TK|NH/);
  assert.doesNotMatch(billContentSource, /Nội dung CK/);
  assert.match(billContentSource, /\{actions && <div style=\{\{ marginTop: 10 \}\}>\{actions\}<\/div>\}/);
  assert.doesNotMatch(billContentSource, /width: 230, height: 230/);
  assert.match(billContentSource, /width: 96, height: 96/);
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
  assert.match(homeSource, /function readBlobAsDataUrl\(blob\)/);
  assert.match(homeSource, /function waitForElementImages\(element\)/);
  assert.match(homeSource, /function drawBillQrOnImage\(dataUrl, cardElement, qrDataUrl\)/);
  assert.match(billContentSource, /data-bill-qr/);
  assert.match(billCardSource, /const \[billQrUrl, setBillQrUrl\] = useState\(qrUrl \|\| ''\)/);
  assert.match(billCardSource, /readBlobAsDataUrl\(blob\)/);
  assert.match(billCardSource, /qrUrl=\{billQrUrl\}/);
  assert.match(billCardSource, /await waitForElementImages\(cardRef\.current\)/);
  assert.match(billCardSource, /const capturedDataUrl = await toPng\(cardRef\.current/);
  assert.match(billCardSource, /const dataUrl = await drawBillQrOnImage\(capturedDataUrl, cardRef\.current, billQrUrl\)/);
  assert.match(homeSource, /canvas\.getContext\('2d'\)/);
  assert.match(homeSource, /context\.drawImage\(baseImage, 0, 0\)/);
  assert.match(homeSource, /context\.drawImage\(qrImage, x, y, width, height\)/);
});
