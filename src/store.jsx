// store.jsx — "Kho trạng thái trung tâm" của toàn bộ app
const { createContext, useContext, useReducer, useEffect } = React;

const STORAGE_KEY = 'spliteasy_v2_state';

// ─── Initial State ────────────────────────────────────────────────────────────
// Dùng mock data từ data.jsx làm dữ liệu mẫu ban đầu
function buildInitialState() {
  return {
    currentUserId: null,   // null = chưa chọn "tôi là ai"
    members: MEMBERS,      // từ data.jsx
    groups: GROUPS,        // từ data.jsx
    pickle: PICKLE,        // từ data.jsx
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
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.userId };

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

    case 'EDIT_EXPENSE':
      return {
        ...state,
        groups: state.groups.map(g =>
          g.id === action.groupId
            ? { ...g, expenses: g.expenses.map(e => e.id === action.expense.id ? action.expense : e) }
            : g
        ),
      };

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

    case 'ADD_PICKLE_MEMBER': {
      const fixedMembers = state.pickle.fixedMembers || [];
      if (fixedMembers.includes(action.memberId)) return state;
      return {
        ...state,
        pickle: { ...state.pickle, fixedMembers: [...fixedMembers, action.memberId] }
      };
    }

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
