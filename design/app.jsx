// SpliteasyBoss design canvas — 8 frames (4 screens × light/dark)

function App() {
  const screens = [
    { id: 'overview', label: '01 · Tổng quát', active: 'home', Comp: ScreenOverview },
    { id: 'group', label: '02 · Chi tiết nhóm', active: 'groups', Comp: ScreenGroupDetail },
    { id: 'approval', label: '03 · Duyệt chi tiêu', active: 'groups', Comp: ScreenApproval },
    { id: 'club', label: '04 · CLB Pickleball', active: 'pickle', Comp: ScreenClub },
  ];
  return (
    <DesignCanvas>
      <DCSection id="light" title="SpliteasyBoss — Light mode" subtitle="iPhone 14 · 390 × 844">
        {screens.map(({ id, label, active, Comp }) => (
          <DCArtboard key={id} id={`light-${id}`} label={label} width={390} height={844}>
            <div data-screen-label={`${label} (light)`}>
              <Phone t={SBTokens.light} active={active}><Comp t={SBTokens.light} /></Phone>
            </div>
          </DCArtboard>
        ))}
      </DCSection>
      <DCSection id="dark" title="SpliteasyBoss — Dark mode" subtitle="iPhone 14 · 390 × 844">
        {screens.map(({ id, label, active, Comp }) => (
          <DCArtboard key={id} id={`dark-${id}`} label={label} width={390} height={844}>
            <div data-screen-label={`${label} (dark)`}>
              <Phone t={SBTokens.dark} active={active}><Comp t={SBTokens.dark} /></Phone>
            </div>
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
