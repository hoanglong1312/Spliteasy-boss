// Data helpers for Spliteasy

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

const MEMBERS = []; // Cleared — users are now dynamic via state.members

const M = Object.fromEntries(MEMBERS.map(m => [m.id, m]));

// Build a member lookup map from a members array.
// Call this at the top of any component that needs M:
//   const M = getMemberMap(state.members);
function getMemberMap(members) {
  return Object.fromEntries((members || []).map(m => [m.id, m]));
}

const ME = ''; // fallback — not used after login


// helper to compute splits
const splitEqual = (amount, ids) => {
  const per = Math.round(amount / ids.length);
  return ids.map((id, i) => ({ memberId: id, amount: i === ids.length - 1 ? amount - per * (ids.length - 1) : per }));
};

// Returns { memberId: amount } for one expense.
// Uses expense.splits if present (custom split), otherwise splits equally.
function getShareMap(e) {
  if (e.splits && e.splits.length > 0) {
    return Object.fromEntries(e.splits.map(s => [s.memberId, s.amount]));
  }
  const splits = splitEqual(e.amount, e.participants);
  return Object.fromEntries(splits.map(s => [s.memberId, s.amount]));
}

// Compute balances for a group from "me" perspective
function groupBalance(g, me = ME) {
  const bal = {}; // memberId -> +/- amount (positive = they owe me)
  g.members.forEach(id => { if (id !== me) bal[id] = 0; });
  for (const e of g.expenses) {
    if (!e.participants || e.participants.length === 0) continue;
    const share = getShareMap(e);
    if (e.paidBy === me) {
      for (const id of e.participants) {
        if (id !== me) bal[id] = (bal[id] || 0) + (share[id] || 0);
      }
    } else if (e.participants && e.participants.includes(me)) {
      if (g.members.includes(e.paidBy)) {
        bal[e.paidBy] = (bal[e.paidBy] || 0) - (share[me] || 0);
      }
    }
  }
  // Apply settlements (subtract from owed amounts)
  const settlements = g.settlements || [];
  for (const s of settlements) {
    if (s.fromId === me) {
      bal[s.toId] = (bal[s.toId] || 0) + s.amount;
    } else if (s.toId === me) {
      bal[s.fromId] = (bal[s.fromId] || 0) - s.amount;
    }
  }
  return bal; // positive = they owe you; negative = you owe them
}

function groupNet(g, me = ME) {
  const b = groupBalance(g, me);
  return Object.values(b).reduce((a,b)=>a+b, 0);
}

// All-up balance per member
function totalBalances(groups = [], me = ME) {
  const totals = {};
  for (const g of groups) {
    const b = groupBalance(g, me);
    for (const id in b) {
      totals[id] = (totals[id] || 0) + b[id];
    }
  }
  return totals;
}

// Recent activity feed (across groups)
function recentActivity(groups = [], limit = 8) {
  const out = [];
  for (const g of groups) {
    for (const e of g.expenses) {
      out.push({ ...e, groupName: g.name, groupEmoji: g.emoji, groupColor: g.color, groupId: g.id });
    }
  }
  // crude: keep document order, slice
  return out.slice(0, limit);
}

// Compute member's monthly pickleball cost
function pickleSummary(pickle = {}) {
  const fixed = pickle.fixedMembers || [];
  const sessions = pickle.sessions || [];
  const courtPerMember = fixed.length ? Math.round((pickle.monthlyCourtFee || 0) / fixed.length) : 0;
  // Guest fees collected this month
  const totalGuests = sessions.reduce((a, s) => a + (s.guests || []).length, 0);
  const guestRevenue = totalGuests * (pickle.guestFeePerSession || 0);
  const guestCreditPer = fixed.length ? Math.round(guestRevenue / fixed.length) : 0;
  // Per-member expense reimbursements from session expenses (paid by, split among attendees)
  const memberOwes = Object.fromEntries(fixed.map(id => [id, 0]));
  for (const s of sessions) {
    const splitAmong = s.attendees || s.attended || [];
    for (const ex of s.expenses || []) {
      if (splitAmong.length === 0) continue;
      const per = Math.round(ex.amount / splitAmong.length);
      for (const id of splitAmong) {
        if (memberOwes[id] !== undefined) memberOwes[id] = (memberOwes[id]||0) - per;
      }
      const payerId = ex.payerId || ex.paidBy;
      if (memberOwes[payerId] !== undefined) memberOwes[payerId] = (memberOwes[payerId]||0) + ex.amount;
    }
  }
  return { courtPerMember, totalGuests, guestRevenue, guestCreditPer, memberOwes };
}

Object.assign(window, {
  MEMBERS, M, ME, getMemberMap,
  fmtVND, fmtVNDFull, fmtDate,
  splitEqual, groupBalance, groupNet, totalBalances, recentActivity, pickleSummary,
});
