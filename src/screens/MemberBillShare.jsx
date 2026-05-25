import React, { useState } from 'react';
import { colors, type, formatVND } from '../tokens';
import { PhoneFrame, Screen, Card, SearchInput, SubTabs, Badge } from '../primitives';

export default function MemberBillShare({ data, loading = false }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const bill = data || {};
  const invalid = !loading && (bill.error || !bill.memberId);
  const rows = safeArray(bill.transactions);
  const summary = bill.summary || summarizeRows(rows);
  const visibleRows = rows.filter(row => {
    const query = normalizeSearch(search);
    const haystack = normalizeSearch(`${row.title} ${row.category} ${row.paidByName} ${row.status}`);
    const net = Number(row.netAmount || 0);
    return (!query || haystack.includes(query)) && (
      filter === 'all' ||
      (filter === 'owes' && net < 0) ||
      (filter === 'advanced' && net > 0) ||
      (filter === 'settled' && net === 0)
    );
  });

  return (
    <PhoneFrame statusBar={false}>
      <Screen style={{ top: 0, paddingTop: 18, paddingBottom: 28 }}>
        {loading && <Card><div style={{ fontSize: 14, fontWeight: 800 }}>Đang tải bill...</div></Card>}
        {invalid && (
          <Card>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Link không còn hiệu lực</div>
            <div style={{ marginTop: 8, fontSize: 13, color: colors.textSecondary, lineHeight: 1.5 }}>
              Hãy nhờ thủ quỹ gửi lại link mới.
            </div>
          </Card>
        )}
        {!loading && !invalid && (
          <>
            <div style={{ padding: '4px 2px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#fcd34d', letterSpacing: '1.6px', textTransform: 'uppercase' }}>{bill.groupName}</div>
              <div style={{ fontSize: 25, fontWeight: 900, marginTop: 4 }}>{bill.memberName}</div>
              <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 5 }}>{bill.monthLabel || 'Tháng hiện tại'}</div>
            </div>
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <MiniShareStat label="Cần trả" value={summary.owes} tone={colors.danger} />
                <MiniShareStat label="Đã ứng" value={summary.advanced} tone="#6ee7b7" />
                <MiniShareStat label="Net" value={summary.net} tone={(summary.net || 0) < 0 ? colors.danger : '#6ee7b7'} signed />
              </div>
            </Card>
            <Card style={{ marginTop: 12 }}>
              <SearchInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm giao dịch..." />
              <SubTabs
                items={[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'owes', label: 'Cần trả' },
                  { key: 'advanced', label: 'Đã ứng' },
                  { key: 'settled', label: 'Cân bằng' },
                ]}
                active={filter}
                onChange={setFilter}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visibleRows.map(row => <ShareTransactionRow key={row.id} row={row} />)}
                {visibleRows.length === 0 && (
                  <div style={{ fontSize: 12, color: colors.textSecondary, padding: '10px 0' }}>Không có giao dịch phù hợp.</div>
                )}
              </div>
            </Card>
          </>
        )}
      </Screen>
    </PhoneFrame>
  );
}

function MiniShareStat({ label, value, tone, signed = false }) {
  const amount = Number(value || 0);
  const prefix = signed && amount > 0 ? '+' : signed && amount < 0 ? '-' : '';
  return (
    <div style={{ padding: 9, borderRadius: 12, background: colors.inputBg }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: colors.textSecondary }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 13, fontWeight: 900, color: tone, ...type.mono }}>{prefix}{formatVND(Math.abs(amount))}</div>
    </div>
  );
}

function ShareTransactionRow({ row }) {
  const net = Number(row.netAmount || 0);
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: `1px solid ${colors.borderSubtle}` }}>
      <div style={{ width: 42, color: colors.textSecondary, fontSize: 11, fontWeight: 800 }}>{row.date}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{row.title}</div>
        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge tone={net < 0 ? 'danger' : net > 0 ? 'success' : 'muted'}>{net < 0 ? 'Cần trả' : net > 0 ? 'Đã ứng' : 'Cân bằng'}</Badge>
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{row.paidByName} trả</span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: net < 0 ? colors.danger : net > 0 ? '#6ee7b7' : colors.textSecondary, ...type.mono }}>
        {net < 0 ? '-' : net > 0 ? '+' : ''}{formatVND(Math.abs(net))}
      </div>
    </div>
  );
}

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim()
    .toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeRows(rows) {
  const owes = safeArray(rows).reduce((sum, row) => sum + Math.max(0, -Number(row.netAmount || 0)), 0);
  const advanced = safeArray(rows).reduce((sum, row) => sum + Math.max(0, Number(row.netAmount || 0)), 0);
  return { owes, advanced, net: advanced - owes };
}
