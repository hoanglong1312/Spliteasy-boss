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

test('treasurer dashboard can create one bill from selected items across members', () => {
  const dashboardSource = sliceBetween('function TreasurerPaymentDashboard(', 'function buildTreasurerMemberRows');
  const rowBuilderSource = sliceBetween('function paymentRowFromTreasurerItems(', 'function TreasurerMemberPaymentRow');
  assert.match(dashboardSource, /selectedTreasurerItems = memberRows\.flatMap/);
  assert.match(dashboardSource, /TT đã chọn/);
  assert.match(dashboardSource, /setPaymentRow\(paymentRowFromTreasurerItems\(selectedTreasurerItems, data\)\)/);
  assert.match(rowBuilderSource, /profileGroups/);
  assert.match(rowBuilderSource, /paymentGroups/);
  assert.match(rowBuilderSource, /defaultPaymentItemKeys: paymentItems\.map\(item => item\.key\)/);
  assert.match(homeSource, /paymentDisplayGroups = row\?\.paymentGroups \|\| \[/);
});

test('bill card only renders checked payment items grouped by profile source and month', () => {
  const billContentSource = sliceBetween('function PaymentBillCardContent(', 'function PaymentBillCardSheet');
  const billCardSource = sliceBetween('function PaymentBillCardSheet(', 'function signedVND');
  assert.match(homeSource, /function PaymentBillCardContent\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, actions = null \}\)/);
  assert.match(homeSource, /function PaymentBillCardSheet\(\{ memberName, amount, transferDescription, qrUrl, paymentDisplayGroups, onClose \}\)/);
  assert.match(billCardSource, /<PaymentBillCardContent[\s\S]*paymentDisplayGroups=\{paymentDisplayGroups\}/);
  assert.match(homeSource, /group\.items\.filter\(item => group\.checkedKeys\?\.has\?\.\(item\.key\)\)/);
  assert.match(homeSource, /groupPaymentItemsBySource\(selectedItems\)/);
  assert.match(homeSource, /item\.monthLabel \|\| fullMonthLabel\(item\.month\)/);
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
  assert.match(billCardSource, /Đang share\.\.\./);
  assert.match(homeSource, /import \{ toPng \} from 'html-to-image';/);
  assert.match(homeSource, /billFilename = `\$\{safeFilename\(memberName \|\| 'bill'\)\}-bill\.png`/);
  assert.match(homeSource, /await toPng\(cardRef\.current/);
  assert.match(billCardSource, /new File\(\[blob\], billFilename, \{ type: 'image\/png' \}\)/);
  assert.match(billCardSource, /navigator\?\.share/);
  assert.match(billCardSource, /navigator\?\.canShare\?\.\(\{ files: \[file\] \}\)/);
  assert.match(billCardSource, /await navigator\.share\(/);
  assert.match(homeSource, /function buildElementImageBlob/);
  assert.match(homeSource, /function triggerDownload/);
  assert.match(billCardSource, /triggerDownload\(dataUrl, billFilename\)/);
  assert.doesNotMatch(billCardSource, /showSaveFilePicker/);
});
