import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const settingsSource = readFileSync(new URL('./PickleballSettings.jsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../app-v2.jsx', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../hooks/useScreenData.js', import.meta.url), 'utf8');
const storeSource = readFileSync(new URL('../store.jsx', import.meta.url), 'utf8');

test('PickleballSettings shell allocates remaining height to a scrollable content area', () => {
  assert.match(settingsSource, /display:\s*'flex'/);
  assert.match(settingsSource, /flexDirection:\s*'column'/);
  assert.match(settingsSource, /height:\s*'100%'/);
  assert.match(settingsSource, /maxHeight:\s*812/);
  assert.match(settingsSource, /overflowY:\s*'auto'/);
  assert.match(settingsSource, /flex:\s*1/);
});

test('PickleballSettings no longer renders current-month member participation toggles', () => {
  assert.match(storeSource, /pickleball_monthly_config/);
  assert.match(dataSource, /currentYearMonth/);
  assert.doesNotMatch(settingsSource, /Thành viên tháng này/);
  assert.doesNotMatch(settingsSource, /activeMemberIds/);
  assert.doesNotMatch(settingsSource, /activeMonthlyMemberIds:\s*Array\.from\(activeMemberIds\)/);
  assert.doesNotMatch(appSource, /activeMonthlyMemberIds: payload\?\.activeMonthlyMemberIds \|\| \[\]/);
  assert.match(appSource, /SAVE_PICKLEBALL_MONTHLY_CONFIG/);
});

test('PickleballSettings no longer owns add/delete member management', () => {
  assert.match(dataSource, /currentRole/);
  assert.doesNotMatch(settingsSource, /showAddMemberForm/);
  assert.doesNotMatch(settingsSource, /newMemberName/);
  assert.doesNotMatch(settingsSource, /onAction\?\.\('addMember'/);
  assert.doesNotMatch(settingsSource, /onAction\?\.\('deleteMember'/);
  assert.doesNotMatch(settingsSource, /Xác nhận xóa thành viên/);
  assert.match(appSource, /type === 'addMember'/);
  assert.match(appSource, /type === 'deleteMember'/);
  assert.match(appSource, /\.from\('members'\)/);
  assert.match(appSource, /is_active: false/);
});

test('PickleballSettings edits schedule time and start date before saving', () => {
  assert.match(settingsSource, /const \[timeRange, setTimeRange\] = useState\(d\.timeRange \|\| '19:00 – 21:00'\)/);
  assert.match(settingsSource, /const \[startDate, setStartDate\] = useState\(d\.startDate \|\| ''\)/);
  assert.match(settingsSource, /setTimeRange\(d\.timeRange \|\| '19:00 – 21:00'\)/);
  assert.match(settingsSource, /setStartDate\(d\.startDate \|\| ''\)/);
  assert.match(settingsSource, /value=\{timeRange\}/);
  assert.match(settingsSource, /onChange=\{\(e\) => setTimeRange\(e\.target\.value\)\}/);
  assert.match(settingsSource, /type="date"/);
  assert.match(settingsSource, /value=\{startDate \? \(startDate\.includes\('-'\) \? startDate : startDate\.split\('\/'\)\.reverse\(\)\.join\('-'\)\) : ''\}/);
  assert.match(settingsSource, /setStartDate\(parts\.length === 3 \? `\$\{parts\[2\]\}\/\$\{parts\[1\]\}\/\$\{parts\[0\]\}` : e\.target\.value\)/);
  assert.match(settingsSource, /startDate,\s*\n\s*scheduleTime: timeRange,/);
  assert.doesNotMatch(settingsSource, /startDate: d\.startDate/);
});

test('PickleballSettings computes the summary from locally selected weekdays', () => {
  assert.match(settingsSource, /function computeSessionsCount\(weekdaySet, yearMonth\)/);
  assert.match(settingsSource, /const liveSessionsCount = computeSessionsCount\(weekdays, d\.currentYearMonth\)/);
  assert.match(settingsSource, /const perSession = Math\.round\(courtFee \/ Math\.max\(liveSessionsCount, 1\)\)/);
  assert.match(settingsSource, /\{liveSessionsCount\} buổi × \{d\.memberCount\} thành viên/);
  assert.doesNotMatch(settingsSource, /courtFee \/ d\.sessionsCount/);
  assert.doesNotMatch(settingsSource, /\{d\.sessionsCount\} buổi ×/);
});

test('PickleballSettings recomputes next-month preview from local weekdays', () => {
  assert.match(settingsSource, /function buildLiveNextMonthPreview\(today, weekdaySet\)/);
  assert.match(settingsSource, /const liveNextMonthPreview = buildLiveNextMonthPreview\(new Date\(\), weekdays\)/);
  assert.match(settingsSource, /Xem trước \{liveNextMonthPreview\.label\}/);
  assert.match(settingsSource, /\{liveNextMonthPreview\.sessions\} buổi · Bắt đầu \{liveNextMonthPreview\.startLabel\}/);
  assert.match(settingsSource, /liveNextMonthPreview\.dates\.slice\(0, 5\)\.map/);
  assert.doesNotMatch(settingsSource, /d\.nextMonthPreview\.sessions/);
  assert.doesNotMatch(settingsSource, /d\.nextMonthPreview\.dates/);
});

test('PickleballSettings relies on save to regenerate schedules', () => {
  assert.doesNotMatch(settingsSource, /function regenerateSessions/);
  assert.doesNotMatch(settingsSource, /regenerateSessions/);
  assert.doesNotMatch(settingsSource, /Tạo lại lịch tháng này/);
  assert.match(settingsSource, /onAction\?\.\('save', \{/);

  assert.doesNotMatch(appSource, /type === 'regenerateSessions'/);
  assert.match(appSource, /await dispatch\(action\)/);
  assert.match(appSource, /shouldRegenerateSchedule/);
  assert.match(appSource, /const shouldRegenerateSchedule = !sameScheduleWeekdays\(oldWeekdays, newWeekdays\) \|\| hasScheduledSessionsWithOldDays/);
  assert.match(appSource, /\.from\('pickle_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.eq\('status', 'scheduled'\)[\s\S]*?\.gte\('session_date', `\$\{yearMonth\}-01`\)[\s\S]*?\.lte\('session_date', `\$\{yearMonth\}-31`\)/);
  assert.match(appSource, /type: 'AUTO_GENERATE_SESSIONS'[\s\S]*?yearMonth[\s\S]*?config: generationConfig/);
});
