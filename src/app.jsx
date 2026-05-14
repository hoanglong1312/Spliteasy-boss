// Main app shell + navigation + theme + tweaks wiring

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "purple",
  "dark": false,
  "font": "inter",
  "avatarStyle": "initials",
  "showPickleball": true,
  "homeLayout": "overview",
  "balanceView": "cards",
  "pickleballStyle": "sporty",
  "addExpenseFlow": "single"
}/*EDITMODE-END*/;

const PALETTES = {
  purple: { c1: '#574EFA', c2: '#463EE3', soft: '#ECEBFF', shadow: 'rgba(87,78,250,0.35)' },
  teal:   { c1: '#0BA5A0', c2: '#067874', soft: '#DDF5F4', shadow: 'rgba(11,165,160,0.35)' },
  coral:  { c1: '#F26F4A', c2: '#D24C28', soft: '#FFE6DC', shadow: 'rgba(242,111,74,0.35)' },
  navy:   { c1: '#2A3B8C', c2: '#1A2766', soft: '#E1E4F4', shadow: 'rgba(42,59,140,0.35)' },
};

const FONTS = {
  inter:  { body: '"Inter", "Be Vietnam Pro", system-ui, sans-serif',  display: '"Inter", system-ui, sans-serif' },
  bevn:   { body: '"Be Vietnam Pro", "Inter", system-ui, sans-serif', display: '"Be Vietnam Pro", "Inter", sans-serif' },
  system: { body: 'system-ui, -apple-system, "Helvetica Neue", sans-serif', display: 'system-ui, -apple-system, sans-serif' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Nav state — each tab has its own stack
  const initStacks = () => ({
    home: [{ name: 'home' }],
    groups: [{ name: 'groups' }],
    pickle: [{ name: 'pickle' }],
    me: [{ name: 'me' }],
  });
  const [stacks, setStacks] = useState(initStacks);
  const [activeTab, setActiveTab] = useState('home');
  const [navDir, setNavDir] = useState('forward'); // forward | backward | tab
  const [animKey, setAnimKey] = useState(0);

  const push = (name, params) => {
    setNavDir('forward');
    setAnimKey(k => k + 1);
    setStacks(s => ({ ...s, [activeTab]: [...s[activeTab], { name, params }] }));
  };
  const pop = () => {
    setNavDir('backward');
    setAnimKey(k => k + 1);
    setStacks(s => ({ ...s, [activeTab]: s[activeTab].slice(0, -1) }));
  };
  const switchTab = (tab) => {
    if (tab === activeTab) {
      // Pop to root
      if (stacks[tab].length > 1) {
        setNavDir('backward');
        setAnimKey(k => k + 1);
        setStacks(s => ({ ...s, [tab]: [s[tab][0]] }));
      }
      return;
    }
    setNavDir('tab');
    setAnimKey(k => k + 1);
    setActiveTab(tab);
  };

  // Build CSS variables for theme
  const pal = PALETTES[t.palette] || PALETTES.purple;
  const dark = t.dark;
  const font = FONTS[t.font] || FONTS.inter;

  const themeVars = {
    '--brand-1': pal.c1,
    '--brand-2': pal.c2,
    '--brand-soft': dark ? hexA(pal.c1, 0.18) : pal.soft,
    '--brand-shadow': pal.shadow,
    '--surface-1': dark ? '#1A1B1F' : '#FFFFFF',
    '--surface-2': dark ? '#24262C' : '#F1F5F9',
    '--text-1':    dark ? '#F2F3F5' : '#101828',
    '--text-2':    dark ? '#9CA3AF' : '#62748E',
    '--text-3':    dark ? '#6B7280' : '#9CA3AF',
    '--border-1':  dark ? '#2A2D33' : '#E5E5E7',
    '--border-strong': dark ? '#3A3D44' : '#99A1AF',
    '--vb-font-body': font.body,
    '--vb-font-display': font.display,
    // Re-tint dark mode utilities
    '--vb-success-100': dark ? 'rgba(46,191,67,0.16)' : '#F3FFF6',
    '--vb-success-700': dark ? '#5DD477' : '#1F8A4C',
    '--vb-danger-50':   dark ? 'rgba(231,0,11,0.16)' : '#FEF2F2',
    '--vb-danger-700':  dark ? '#FF7A85' : '#C8322B',
    '--vb-warn-100':    dark ? 'rgba(238,162,62,0.16)' : '#FFFAF2',
    '--vb-gray-75':     dark ? '#1F2126' : '#EFEFF1',
  };

  const stack = stacks[activeTab];
  const current = stack[stack.length - 1];

  const renderScreen = () => {
    const p = current.params || {};
    switch (current.name) {
      case 'home':     return <ScreenHome tweaks={t} push={push} switchTab={switchTab}/>;
      case 'groups':   return <ScreenGroups tweaks={t} push={push}/>;
      case 'pickle':   return <ScreenPickleball tweaks={t} push={push}/>;
      case 'me':       return <ScreenProfile tweaks={t} push={push} setTweak={setTweak}/>;
      case 'group-detail':    return <ScreenGroupDetail params={p} tweaks={t} push={push} pop={pop}/>;
      case 'expense-detail':  return <ScreenExpenseDetail params={p} tweaks={t} push={push} pop={pop}/>;
      case 'add-expense':     return <ScreenAddExpense params={p} tweaks={t} push={push} pop={pop}/>;
      case 'settle-all':      return <ScreenSettleAll tweaks={t} pop={pop}/>;
      case 'settle-group':    return <ScreenSettleAll tweaks={t} pop={pop}/>;
      case 'new-group':       return <ScreenNewGroup pop={pop}/>;
      case 'notifications':   return <ScreenNotifications pop={pop} tweaks={t}/>;
      case 'session-detail':  return <ScreenSessionDetail params={p} pop={pop} tweaks={t}/>;
      case 'add-session-expense': return <ScreenAddSessionExpense pop={pop} tweaks={t}/>;
      case 'settings':        return <ScreenSettings pop={pop}/>;
      default: return null;
    }
  };

  const tabs = [
    { id: 'home', label: 'Trang chủ', icon: 'home' },
    { id: 'groups', label: 'Nhóm', icon: 'users' },
    ...(t.showPickleball ? [{ id: 'pickle', label: 'Pickleball', icon: 'pickle' }] : []),
    { id: 'me', label: 'Cá nhân', icon: 'user' },
  ];

  return (
    <div style={{ ...themeVars, fontFamily: 'var(--vb-font-body)', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-2)' }}>
      <div className="screen-scroll" data-screen-label={`${activeTab} • ${current.name}`} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 60 }}>
        <ScreenTransition direction={navDir === 'tab' ? 'fade' : navDir} screenKey={`${activeTab}-${stack.length}-${animKey}`}>
          {renderScreen()}
        </ScreenTransition>
      </div>

      {/* Bottom tab bar */}
      <TabBar tabs={tabs} active={activeTab} onSwitch={switchTab} onAdd={() => push('add-expense')}/>

      {/* Tweaks */}
      <SpliteasyTweaks t={t} setTweak={setTweak}/>
    </div>
  );
}

// ── Tab Bar ─────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onSwitch, onAdd }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--surface-1)',
      borderTop: '1px solid var(--border-1)',
      paddingTop: 6, paddingBottom: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      zIndex: 50,
    }}>
      {tabs.map((tab, i) => {
        const isActive = active === tab.id;
        const isMid = i === Math.floor(tabs.length / 2);
        return (
          <React.Fragment key={tab.id}>
            {isMid && (
              <button onClick={onAdd} style={{
                appearance: 'none', cursor: 'pointer',
                width: 52, height: 52, borderRadius: 16,
                background: 'var(--brand-1)', color: '#fff', border: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px -4px var(--brand-shadow)',
                marginTop: -8,
                transition: 'transform .15s ease',
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.94)'}
              onMouseUp={(e) => e.currentTarget.style.transform = ''}
              onMouseLeave={(e) => e.currentTarget.style.transform = ''}
              >
                <Icon name="plus" size={26} color="#fff" stroke={2.5}/>
              </button>
            )}
            <button onClick={() => onSwitch(tab.id)} style={{
              appearance: 'none', cursor: 'pointer',
              flex: 1, height: 52, background: 'transparent', border: 0,
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: isActive ? 'var(--brand-1)' : 'var(--text-2)',
            }}>
              <Icon name={tab.icon} size={22} color={isActive ? 'var(--brand-1)' : 'var(--text-2)'} stroke={isActive ? 2 : 1.8}/>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '-0.005em' }}>{tab.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Tweaks panel ───────────────────────────────────────────────────────────
function SpliteasyTweaks({ t, setTweak }) {
  return (
    <TweaksPanel title="Tweaks · Spliteasy">
      <TweakSection label="Giao diện"/>
      <TweakRadio label="Theme" value={t.dark ? 'dark' : 'light'} options={['light','dark']} onChange={(v) => setTweak('dark', v === 'dark')}/>
      <TweakColor label="Màu chủ đạo" value={t.palette}
        options={Object.keys(PALETTES).map(k => PALETTES[k].c1)}
        onChange={(v) => { const key = Object.keys(PALETTES).find(k => PALETTES[k].c1 === v); setTweak('palette', key); }}
      />
      <TweakSelect label="Font chữ" value={t.font}
        options={[
          { value: 'inter', label: 'Inter (mặc định)' },
          { value: 'bevn', label: 'Be Vietnam Pro' },
          { value: 'system', label: 'System UI' },
        ]}
        onChange={(v) => setTweak('font', v)}
      />
      <TweakRadio label="Avatar" value={t.avatarStyle} options={['photo','initials']} onChange={(v) => setTweak('avatarStyle', v)}/>

      <TweakSection label="Layout & nội dung"/>
      <TweakSelect label="Trang chủ" value={t.homeLayout}
        options={[
          { value: 'overview', label: 'Tổng quan (mặc định)' },
          { value: 'feed', label: 'Activity feed' },
          { value: 'compact', label: 'Tối giản' },
        ]}
        onChange={(v) => setTweak('homeLayout', v)}
      />
      <TweakSelect label="Ai nợ ai" value={t.balanceView}
        options={[
          { value: 'cards', label: 'Cards (scroll ngang)' },
          { value: 'list', label: 'List' },
          { value: 'graph', label: 'Biểu đồ' },
        ]}
        onChange={(v) => setTweak('balanceView', v)}
      />
      <TweakRadio label="Flow thêm chi" value={t.addExpenseFlow} options={['single','wizard']} onChange={(v) => setTweak('addExpenseFlow', v)}/>
      <TweakRadio label="Style Pickleball" value={t.pickleballStyle} options={['sporty','consistent']} onChange={(v) => setTweak('pickleballStyle', v)}/>
      <TweakToggle label="Bật tab Pickleball" value={t.showPickleball} onChange={(v) => setTweak('showPickleball', v)}/>
    </TweaksPanel>
  );
}

// Mount inside the iOS frame
function Mount() {
  return (
    <IOSDevice width={402} height={874} dark={false}>
      <App/>
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Mount/>);
