import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const memberSource = readFileSync(new URL('./PickleballMembers.jsx', import.meta.url), 'utf8')
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8')

describe('Pickleball members flex billing UI', () => {
  test('members data derives billing mode through the monthly flex helper', () => {
    expect(dataSource).toMatch(/billingMode: isBillingModeFlexForMonth\(state, yearMonth\) \? 'flex' : 'fixed'/)
  })

  test('flex mode renders one merged member section with one expander', () => {
    expect(memberSource).toMatch(/const filteredMembers = useMemo\(\(\) => filterMembers\(\[\.\.\.fixedMembers, \.\.\.casualMembers\]\.sort/)
    expect(memberSource).toMatch(/\{isFlexBilling \? \([\s\S]*?<MemberSection[\s\S]*?title=\{`Thành viên · \$\{filteredMembers\.length\} người`\}[\s\S]*?members=\{filteredMembers\}[\s\S]*?expanded=\{expandedFixed\}/)
    expect(memberSource).toMatch(/\) : \([\s\S]*?<MemberSection[\s\S]*?title=\{`Cố định · \$\{filteredFixed\.length\} người`\}[\s\S]*?<MemberSection[\s\S]*?title=\{`Vãng lai · \$\{filteredCasual\.length\} người`\}/)
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
})
