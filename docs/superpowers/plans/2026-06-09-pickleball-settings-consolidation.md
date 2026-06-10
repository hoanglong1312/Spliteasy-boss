# Pickleball Settings PIN Invite Card Redesign

**Status:** pending
**Commit:** —
**Target:** 1 commit

## Objective
Update `src/screens/JoinGroup.jsx` to improve the PIN verification UX when user clicks invite link requiring PIN. Replace generic PIN input with a session-card style layout showing member avatar, name, group name, and inline PIN input.

## Changes Required

### Change 1 — Add state for memberName (line ~21)
```javascript
const [pinRequiredMemberName, setPinRequiredMemberName] = useState(null);
```
Insert after line 21 where other PIN state is declared.

### Change 2 — Store memberName when PIN is required (line ~767)
In the handler where `result?.status === 'requires_pin'`, add:
```javascript
setPinRequiredMemberName(result.memberName || '');
```
After `setPinRequiredMemberId(result.memberId);`

### Change 3 — Replace entire PIN card block (lines ~684–724)
Remove the entire `{pinRequired && (...)}` block that contains SectionLabel, input field, error div, and Button.

Replace with session-card layout:
- **Top row** (border-top, bg: indigo light):
  - Avatar with initial from memberName
  - Member name + group name (formatted: "GROUP · Có PIN")
- **Bottom row** (border-bottom, bg: indigo lighter):
  - PIN input field (type="password", max 6 chars, inline error below)
  - Cancel button (hollow, left-aligned)
  - Confirm button (filled indigo, flex: 2, has spinner when loading)

Spinner uses CSS keyframe `pickleballLoadingSpin` (rotate 360deg).

### Change 4 — Hide main button when PIN required (line ~726)
Change:
```javascript
{hasGroupPreview && <Button ...
```
To:
```javascript
{hasGroupPreview && !pinRequired && <Button ...
```

## Verification
1. `npm run build` ✅
2. `node --test src/member-access.test.mjs` — expect 20 pass / 3 fail (no regression)
3. Localhost test:
   - Join group via invite link
   - If PIN required: verify session card shows correctly
   - Enter PIN: spinner visible during check
   - Cancel: returns to initial state

## Design Reference
- Border: `rgba(99,102,241,0.5)`
- Background light: `rgba(99,102,241,0.1)`
- Background lighter: `rgba(99,102,241,0.06)`
- Text: `colors.textPrimary`, `colors.textSecondary`
- Button disabled: `rgba(99,102,241,0.5)`
- Error color: `#fca5a5` / `rgba(248,113,113,0.5)`

## Files Involved
- `src/screens/JoinGroup.jsx` (only file changed)
- Imports: Avatar, colors (already present)

## Notes
- This is a UI-only change, no API/data flow changes
- PIN verification logic remains unchanged (`handleInvitePinSubmit` handler is reused)
- Error messaging and states preserved
- Backwards compatible with existing invite flow
