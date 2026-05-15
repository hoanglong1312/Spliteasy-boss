// Mock data for Spliteasy
// 9 members across the company, multiple groups, a populated Pickleball month

const fmtVND = (n) => {
  if (n === 0) return '0 ₫';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace('.0','') + ' tr';
  if (abs >= 1_000) return sign + Math.round(abs / 1_000) + 'k';
  return sign + abs + ' ₫';
};

const fmtVNDFull = (n) => {
  const abs = Math.abs(n);
  const s = abs.toLocaleString('vi-VN');
  return (n < 0 ? '-' : '') + s + ' ₫';
};

const fmtDate = (d) => {
  if (typeof d === 'string') return d;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const MEMBERS = [
  { id: 'u1', name: 'Bạn',          short: 'Bạn',  initials: 'NA', color: '#574EFA', photo: 'https://i.pravatar.cc/120?img=12', isMe: true },
  { id: 'u2', name: 'Minh Hoàng',   short: 'Minh', initials: 'MH', color: '#0BA5A0', photo: 'https://i.pravatar.cc/120?img=33' },
  { id: 'u3', name: 'Thu Trang',    short: 'Trang',initials: 'TT', color: '#F26F4A', photo: 'https://i.pravatar.cc/120?img=47' },
  { id: 'u4', name: 'Quốc Anh',     short: 'Anh',  initials: 'QA', color: '#7839EE', photo: 'https://i.pravatar.cc/120?img=15' },
  { id: 'u5', name: 'Phương Vy',    short: 'Vy',   initials: 'PV', color: '#E11D74', photo: 'https://i.pravatar.cc/120?img=44' },
  { id: 'u6', name: 'Tuấn Kiệt',    short: 'Kiệt', initials: 'TK', color: '#155DFC', photo: 'https://i.pravatar.cc/120?img=11' },
  { id: 'u7', name: 'Hải Đăng',     short: 'Đăng', initials: 'HĐ', color: '#1F8A4C', photo: 'https://i.pravatar.cc/120?img=68' },
  { id: 'u8', name: 'Bảo Ngọc',     short: 'Ngọc', initials: 'BN', color: '#EEA23E', photo: 'https://i.pravatar.cc/120?img=49' },
  { id: 'u9', name: 'Đức Mạnh',     short: 'Mạnh', initials: 'ĐM', color: '#0B7CBF', photo: 'https://i.pravatar.cc/120?img=8' },
];

const M = Object.fromEntries(MEMBERS.map(m => [m.id, m]));
const ME = 'u1';

// helper to compute splits
const splitEqual = (amount, ids) => {
  const per = Math.round(amount / ids.length);
  return ids.map((id, i) => ({ memberId: id, amount: i === ids.length - 1 ? amount - per * (ids.length - 1) : per }));
};

// Groups
const GROUPS = [
  {
    id: 'g1',
    name: 'Ăn trưa team Eng',
    emoji: '🍜',
    color: '#574EFA',
    members: ['u1','u2','u3','u4','u6','u8'],
    description: 'Ăn trưa hằng ngày của team kỹ thuật',
    expenses: [
      { id: 'e1',  title: 'Cơm tấm Sài Gòn', amount: 540_000, paidBy: 'u2', splitMode: 'equal', participants: ['u1','u2','u3','u4','u6','u8'], date: '14/05', cat: 'food' },
      { id: 'e2',  title: 'Bún bò Huế',       amount: 420_000, paidBy: 'u1', splitMode: 'equal', participants: ['u1','u2','u3','u4','u8'],     date: '13/05', cat: 'food' },
      { id: 'e3',  title: 'Trà sữa Phúc Long',amount: 285_000, paidBy: 'u3', splitMode: 'equal', participants: ['u1','u2','u3','u4','u6','u8'], date: '12/05', cat: 'drink'},
      { id: 'e4',  title: 'Phở Lý Quốc Sư',   amount: 510_000, paidBy: 'u6', splitMode: 'equal', participants: ['u1','u2','u3','u6','u8'],     date: '10/05', cat: 'food' },
      { id: 'e5',  title: 'Cà phê chiều',     amount: 168_000, paidBy: 'u1', splitMode: 'equal', participants: ['u1','u4','u6'],               date: '08/05', cat: 'drink'},
      { id: 'e6',  title: 'Cơm văn phòng',    amount: 360_000, paidBy: 'u4', splitMode: 'equal', participants: ['u1','u2','u3','u4'],          date: '06/05', cat: 'food' },
    ],
  },
  {
    id: 'g2',
    name: 'Du lịch Đà Lạt 5/2026',
    emoji: '🏔️',
    color: '#0BA5A0',
    members: ['u1','u2','u3','u5','u7','u8','u9'],
    description: 'Trip 3 ngày 2 đêm — 24–26/05',
    expenses: [
      { id: 'e7', title: 'Vé máy bay khứ hồi', amount: 12_600_000, paidBy: 'u9', splitMode: 'equal', participants: ['u1','u2','u3','u5','u7','u8','u9'], date: '12/05', cat: 'travel' },
      { id: 'e8', title: 'Homestay Cầu Đất',   amount: 4_200_000,  paidBy: 'u3', splitMode: 'equal', participants: ['u1','u2','u3','u5','u7','u8','u9'], date: '11/05', cat: 'travel' },
      { id: 'e9', title: 'Thuê xe 3 ngày',     amount: 1_800_000,  paidBy: 'u1', splitMode: 'equal', participants: ['u1','u2','u3','u5','u7','u8','u9'], date: '10/05', cat: 'travel' },
    ],
  },
  {
    id: 'g3',
    name: 'Sinh nhật sếp Hoàng',
    emoji: '🎂',
    color: '#F26F4A',
    members: ['u1','u3','u4','u5','u6','u7','u8','u9'],
    description: 'Quỹ chung mua quà cho sếp',
    expenses: [
      { id: 'e10', title: 'Bánh kem Anh Hòa',  amount: 850_000,   paidBy: 'u5', splitMode: 'equal', participants: ['u1','u3','u4','u5','u6','u7','u8','u9'], date: '13/05', cat: 'gift' },
      { id: 'e11', title: 'Hoa & quà',          amount: 1_400_000, paidBy: 'u3', splitMode: 'equal', participants: ['u1','u3','u4','u5','u6','u7','u8','u9'], date: '12/05', cat: 'gift' },
    ],
  },
  {
    id: 'g4',
    name: 'Team building Vũng Tàu',
    emoji: '🏖️',
    color: '#7839EE',
    members: ['u1','u2','u3','u4','u5','u6','u7','u8','u9'],
    description: 'Team building Q2',
    expenses: [
      { id: 'e12', title: 'Đặt cọc resort', amount: 6_300_000, paidBy: 'u2', splitMode: 'equal', participants: ['u1','u2','u3','u4','u5','u6','u7','u8','u9'], date: '05/05', cat: 'travel' },
    ],
  },
];

// Compute balances for a group from "me" perspective
function groupBalance(g) {
  const me = ME;
  const bal = {}; // memberId -> +/- amount (positive = they owe me)
  g.members.forEach(id => { if (id !== me) bal[id] = 0; });
  for (const e of g.expenses) {
    const splits = splitEqual(e.amount, e.participants);
    const share = Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
    if (e.paidBy === me) {
      for (const id of e.participants) {
        if (id !== me) bal[id] = (bal[id] || 0) + share[id];
      }
    } else if (e.participants.includes(me)) {
      bal[e.paidBy] = (bal[e.paidBy] || 0) - share[me];
    }
  }
  return bal; // positive = they owe you; negative = you owe them
}

function groupNet(g) {
  const b = groupBalance(g);
  return Object.values(b).reduce((a,b)=>a+b, 0);
}

// All-up balance per member
function totalBalances(groups = GROUPS) {
  const totals = {};
  for (const g of groups) {
    const b = groupBalance(g);
    for (const id in b) {
      totals[id] = (totals[id] || 0) + b[id];
    }
  }
  return totals;
}

// Recent activity feed (across groups)
function recentActivity(groups = GROUPS, limit = 8) {
  const out = [];
  for (const g of groups) {
    for (const e of g.expenses) {
      out.push({ ...e, groupName: g.name, groupEmoji: g.emoji, groupColor: g.color, groupId: g.id });
    }
  }
  // crude: keep document order, slice
  return out.slice(0, limit);
}

// ── Pickleball ─────────────────────────────────────────────────────────────
const PICKLE = {
  clubName: 'CLB Pickleball Spliteasy',
  monthlyCourtFee: 4_800_000,   // chia đều cho cố định
  guestFeePerSession: 50_000,
  fixedMembers: ['u1','u2','u4','u6','u7','u9'],   // 6 cố định
  // Sessions in May 2026 — buổi đánh cố định Thứ 3/Thứ 5
  sessions: [
    { id: 's1', date: '15/05', day: 'T6', time: '19:00', court: 'Sân 3', attended: ['u1','u2','u4','u6','u7'], guests: ['Anh Bảo', 'Chị Lan'], expenses: [
      { kind: 'ball', label: 'Bóng Joola', amount: 240_000, paidBy: 'u2' },
      { kind: 'drink', label: 'Nước suối + cam', amount: 95_000, paidBy: 'u1' },
    ]},
    { id: 's2', date: '13/05', day: 'T4', time: '19:00', court: 'Sân 1', attended: ['u1','u4','u6','u7','u9'], guests: ['Anh Phúc'], expenses: [
      { kind: 'food', label: 'Phở sau trận',   amount: 380_000, paidBy: 'u9' },
      { kind: 'drink', label: 'Bia + nước',    amount: 220_000, paidBy: 'u4' },
    ]},
    { id: 's3', date: '10/05', day: 'CN', time: '17:30', court: 'Sân 3', attended: ['u1','u2','u4','u7','u9'], guests: ['Anh Bảo'], expenses: [
      { kind: 'ball', label: 'Bóng thay mới',  amount: 180_000, paidBy: 'u7' },
    ]},
    { id: 's4', date: '08/05', day: 'T5', time: '19:00', court: 'Sân 2', attended: ['u2','u4','u6','u7','u9'], guests: [], expenses: [
      { kind: 'drink', label: 'Nước sau trận', amount: 60_000, paidBy: 'u6' },
    ]},
    { id: 's5', date: '06/05', day: 'T3', time: '19:00', court: 'Sân 1', attended: ['u1','u2','u4','u6','u9'], guests: ['Chị Lan','Anh Tâm'], expenses: [
      { kind: 'ball', label: 'Bóng Joola',     amount: 240_000, paidBy: 'u1' },
      { kind: 'food', label: 'Cơm tối sau trận', amount: 540_000, paidBy: 'u2' },
    ]},
  ],
  upcoming: [
    { id: 'u1s', date: '18/05', day: 'T2', time: '19:00', court: 'Sân 1', going: ['u1','u2','u4','u7','u9'] },
    { id: 'u2s', date: '20/05', day: 'T4', time: '19:00', court: 'Sân 3', going: ['u1','u4','u6','u7'] },
    { id: 'u3s', date: '22/05', day: 'T6', time: '19:00', court: 'Sân 1', going: ['u1','u2','u4','u6','u7','u9'] },
  ],
  // Xé vé lẻ — đánh ngoài CLB
  external: [
    { id: 'x1', date: '11/05', label: 'Sân Nguyễn Khoái', amount: 420_000, paidBy: 'u1', participants: ['u1','u4','u6','u7'] },
    { id: 'x2', date: '07/05', label: 'Sân Phú Mỹ Hưng',  amount: 540_000, paidBy: 'u4', participants: ['u1','u2','u4','u9'] },
  ],
};

// Compute member's monthly pickleball cost
function pickleSummary() {
  const fixed = PICKLE.fixedMembers;
  const courtPerMember = Math.round(PICKLE.monthlyCourtFee / fixed.length);
  // Guest fees collected this month
  const totalGuests = PICKLE.sessions.reduce((a, s) => a + s.guests.length, 0);
  const guestRevenue = totalGuests * PICKLE.guestFeePerSession;
  const guestCreditPer = Math.round(guestRevenue / fixed.length);
  // Per-member expense reimbursements from session expenses (paid by, split among attendees)
  const memberOwes = Object.fromEntries(fixed.map(id => [id, 0]));
  for (const s of PICKLE.sessions) {
    const splitAmong = s.attended;
    for (const ex of s.expenses) {
      const per = Math.round(ex.amount / splitAmong.length);
      for (const id of splitAmong) {
        if (memberOwes[id] !== undefined) memberOwes[id] = (memberOwes[id]||0) - per;
      }
      if (memberOwes[ex.paidBy] !== undefined) memberOwes[ex.paidBy] = (memberOwes[ex.paidBy]||0) + ex.amount;
    }
  }
  return { courtPerMember, totalGuests, guestRevenue, guestCreditPer, memberOwes };
}

Object.assign(window, {
  MEMBERS, M, ME, GROUPS, PICKLE,
  fmtVND, fmtVNDFull, fmtDate,
  splitEqual, groupBalance, groupNet, totalBalances, recentActivity, pickleSummary,
});
