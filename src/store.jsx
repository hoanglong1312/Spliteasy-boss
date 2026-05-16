// store.jsx — "Kho trạng thái trung tâm" của toàn bộ app
const { createContext, useContext, useReducer, useEffect } = React;

const STORAGE_KEY = 'spliteasy_v3_state';

// ─── Initial State ────────────────────────────────────────────────────────────
// Trạng thái ban đầu — rỗng, user phải đăng nhập để tạo dữ liệu
function buildInitialState() {
  return {
    currentUserId: null,
    currentUserName: null,
    members: [],
    groups: [],
    pickle: {
      sessions: [],
      upcoming: [],
      fixedMembers: [],
      externalTickets: [],
      monthlyCourtFee: 0,
      guestFeePerSession: 0,
    },
    notifications: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {

    // ── User ──────────────────────────────────────────────────────────────────
    case 'SET_CURRENT_USER': {
      const shortName = action.userName.trim().split(' ').pop();
      const initials = action.userName.trim().split(' ')
        .map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const newMember = {
        id: action.userId,
        name: action.userName.trim(),
        short: shortName,
        initials,
        color: '#574EFA',
        isMe: true,
      };
      const alreadyExists = state.members.some(m => m.id === action.userId);
      return {
        ...state,
        currentUserId: action.userId,
        currentUserName: action.userName.trim(),
        members: alreadyExists ? state.members : [...state.members, newMember],
      };
    }

    // ── Members ───────────────────────────────────────────────────────────────
    case 'ADD_MEMBER': {
      const { member } = action;
      const alreadyExists = state.members.some(m => m.id === member.id);
      return {
        ...state,
        members: alreadyExists ? state.members : [...state.members, member],
      };
    }

    // ── Groups ────────────────────────────────────────────────────────────────
    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.group] };

    case 'EDIT_GROUP':
      return {
        ...state,
        groups: state.groups.map(g => g.id === action.group.id ? { ...g, ...action.group } : g),
      };

    case 'DELETE_GROUP':
      return { ...state, groups: state.groups.filter(g => g.id !== action.groupId) };

    // ── Expenses ──────────────────────────────────────────────────────────────
    case 'ADD_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: [...g.expenses, action.expense] }
            : g
        ),
      };

    case 'EDIT_EXPENSE': {
      const { groupId, expense } = action;
      // Find the group that currently contains this expense so moving groups
      // removes the stale copy from the source group.
      const sourceGroup = state.groups.find(g => g.expenses.some(e => e.id === expense.id));
      const sourceGroupId = sourceGroup?.id;
      if (sourceGroupId && sourceGroupId !== groupId) {
        return {
          ...state,
          groups: state.groups.map(g => {
            if (g.id === sourceGroupId) return { ...g, expenses: g.expenses.filter(e => e.id !== expense.id) };
            if (g.id === groupId) return { ...g, expenses: [...g.expenses, expense] };
            return g;
          }),
        };
      }
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, expenses: g.expenses.map(e => e.id === expense.id ? expense : e) }
            : g
        ),
      };
    }

    case 'DELETE_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: g.expenses.filter(e => e.id !== action.expenseId) }
            : g
        ),
      };

    // ── Settle Debt ───────────────────────────────────────────────────────────
    case 'SETTLE_DEBT': {
      // action.settlement = { id, fromId, toId, amount, date }
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, settlements: [...(g.settlements || []), action.settlement] }
            : g
        ),
      };
    }

    // ── Pickleball ────────────────────────────────────────────────────────────
    case 'CONFIRM_ATTENDANCE': {
      const sessions = (state.pickle.sessions || []).map(s =>
        s.id === action.sessionId
          ? {
              ...s,
              attendees: action.attending
                ? [...new Set([...(s.attendees || []), action.memberId])]
                : (s.attendees || []).filter(id => id !== action.memberId)
            }
          : s
      );
      return { ...state, pickle: { ...state.pickle, sessions } };
    }

    case 'ADD_PICKLE_EXPENSE': {
      const sessions = (state.pickle.sessions || []).map(s =>
        s.id === action.sessionId
          ? { ...s, expenses: [...(s.expenses || []), action.expense] }
          : s
      );
      return { ...state, pickle: { ...state.pickle, sessions } };
    }

    case 'ADD_EXTERNAL_TICKET': {
      return {
        ...state,
        pickle: {
          ...state.pickle,
          externalTickets: [...(state.pickle.externalTickets || []), action.ticket]
        }
      };
    }

    case 'TOGGLE_UPCOMING': {
      const upcoming = (state.pickle.upcoming || []).map(s =>
        s.id === action.sessionId
          ? {
              ...s,
              going: (s.going || []).includes(action.memberId)
                ? (s.going || []).filter(id => id !== action.memberId)
                : [...new Set([...(s.going || []), action.memberId])]
            }
          : s
      );
      return { ...state, pickle: { ...state.pickle, upcoming } };
    }

    case 'ADD_PICKLE_MEMBER': {
      const fixedMembers = state.pickle.fixedMembers || [];
      if (fixedMembers.includes(action.memberId)) return state;
      return {
        ...state,
        pickle: { ...state.pickle, fixedMembers: [...fixedMembers, action.memberId] }
      };
    }

    case 'LOGOUT':
      return buildInitialState();

    default:
      return state;
  }
}

// ─── localStorage sync ────────────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[store] Failed to load state from localStorage:', e);
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // bỏ qua nếu localStorage đầy
  }
}

// ─── Context & Provider ───────────────────────────────────────────────────────
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => loadState() || buildInitialState());

  // Sync xuống localStorage mỗi khi state thay đổi
  useEffect(() => {
    saveState(state);
  }, [state]);

  return React.createElement(AppContext.Provider, { value: { state, dispatch, genId } }, children);
}

// Hook tiện dụng dùng trong mọi component
function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
