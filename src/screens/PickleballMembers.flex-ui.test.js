import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8')

describe('Pickleball members flex billing UI', () => {
  test('members data derives billing mode through the monthly flex helper', () => {
    expect(dataSource).toMatch(/const isFlexBilling = isBillingModeFlexForMonth\(state, yearMonth\)/)
    expect(dataSource).toMatch(/billingMode: isFlexBilling \? 'flex' : 'fixed'/)
  })

  test('members screen always renders one merged member section with one expander', () => {
    expect(memberSource).toMatch(/const filteredMembers = useMemo\(\(\) => filterMembers\(\[\.\.\.fixedMembers, \.\.\.casualMembers\]\.sort/)
    expect(memberSource).toMatch(/<MemberSection[\s\S]*?title=\{`Thành viên · \$\{filteredMembers\.length\} người`\}[\s\S]*?members=\{filteredMembers\}[\s\S]*?expanded=\{expandedFixed\}/)
    expect(memberSource).not.toMatch(/title=\{`Cố định · \$\{filteredFixed\.length\} người`\}/)
    expect(memberSource).not.toMatch(/title=\{`Vãng lai · \$\{filteredCasual\.length\} người`\}/)
  })

  test('flex mode hides fixed/casual controls while fixed mode uses a two-option member type segmented control', () => {
    expect(memberSource).toMatch(/\{!isFlexBilling && \([\s\S]*?\{isFixed \? 'Cố định' : 'Vãng lai'\}[\s\S]*?\)\}/)
    expect(memberSource).toMatch(/function MemberTypeSegmentedControl/)
    expect(memberSource).toMatch(/onSelect\('fixed'\)/)
    expect(memberSource).toMatch(/onSelect\('casual'\)/)
    expect(memberSource).not.toMatch(/→ Vãng lai|→ Cố định/)
  })

  test('flex add-member form hides fixed-casual switch and submits fixed fallback silently', () => {
    expect(memberSource).toMatch(/const memberType = isFlexBilling \? 'fixed' : newMemberType/)
    expect(memberSource).toMatch(/type: memberType/)
    expect(memberSource).toMatch(/\{!isFlexBilling && <TypeSwitch value=\{newMemberType\} onChange=\{setNewMemberType\} \/>\}/)
  })

  test('flex mode uses ticket stats and defaults missing ticket config to per-session', () => {
    expect(memberSource).toMatch(/isFlexBilling \? d\.stats\?\.monthlyTickets/)
    expect(memberSource).toMatch(/label=\{isFlexBilling \? 'Vé tháng' : 'Cố định'\}/)
    expect(memberSource).toMatch(/label=\{isFlexBilling \? 'Vé lượt' : 'Vãng lai'\}/)
    expect(memberSource).toMatch(/perSessionTicketIds\?\.has\(String\(member\.id\)\) \? 'per_session' : isFlexBilling \? 'per_session' : ''/)
  })

  test('flex member rows show attended over total sessions instead of rank text', () => {
    expect(memberSource).toMatch(/\{isFlexBilling \? \([\s\S]*?\{member\.sessionsAttended \|\| 0\}\/\{member\.sessionsTotal \|\| 0\} buổi/)
    expect(memberSource).toMatch(/\) : isCasual \? \(/)
  })
})
