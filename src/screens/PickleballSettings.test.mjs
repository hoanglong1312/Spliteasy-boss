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
  assert.match(appSource, /type === 'addPickleballMember'/);
  assert.match(appSource, /type === 'removePickleballMember'/);
  assert.match(appSource, /\.from\('members'\)/);
  assert.match(appSource, /is_active: false/);
});

test('PickleballSettings edits schedule time and start date before saving', () => {
  assert.match(settingsSource, /function splitTimeRange\(value\)/);
  assert.match(settingsSource, /const \[\[timeStart, timeEnd\], setTimeParts\] = useState\(\(\) => splitTimeRange\(d\.timeRange\)\)/);
  assert.match(settingsSource, /const \[startDate, setStartDate\] = useState\(d\.startDate \|\| ''\)/);
  assert.match(settingsSource, /setTimeParts\(splitTimeRange\(d\.timeRange\)\)/);
  assert.match(settingsSource, /setStartDate\(d\.startDate \|\| ''\)/);
  assert.match(settingsSource, /type="time"[\s\S]*?value=\{timeStart\}[\s\S]*?onChange=\{\(e\) => setTimeParts\(\[e\.target\.value, timeEnd\]\)\}/);
  assert.match(settingsSource, /type="time"[\s\S]*?value=\{timeEnd\}[\s\S]*?onChange=\{\(e\) => setTimeParts\(\[timeStart, e\.target\.value\]\)\}/);
  assert.match(settingsSource, /type="date"/);
  assert.match(settingsSource, /value=\{startDate \? \(startDate\.includes\('-'\) \? startDate : startDate\.split\('\/'\)\.reverse\(\)\.join\('-'\)\) : ''\}/);
  assert.match(settingsSource, /setStartDate\(parts\.length === 3 \? `\$\{parts\[2\]\}\/\$\{parts\[1\]\}\/\$\{parts\[0\]\}` : e\.target\.value\)/);
  assert.match(settingsSource, /startDate,\s*\n\s*scheduleTime: `\$\{timeStart\} – \$\{timeEnd\}`,/);
  assert.doesNotMatch(settingsSource, /courtFee,/);
  assert.doesNotMatch(settingsSource, /ticketPrice,/);
  assert.doesNotMatch(settingsSource, /startDate: d\.startDate/);
});

test('PickleballSettings no longer owns monthly money inputs', () => {
  assert.doesNotMatch(settingsSource, /const \[courtFee, setCourtFee\]/);
  assert.doesNotMatch(settingsSource, /const \[ticketPrice, setTicketPrice\]/);
  assert.doesNotMatch(settingsSource, /Tiền sân tháng/);
  assert.doesNotMatch(settingsSource, /Giá vé lẻ/);
  assert.doesNotMatch(settingsSource, /đ \/ buổi/);
  assert.doesNotMatch(settingsSource, /đ \/ người/);
});

test('PickleballSettings computes the schedule summary from locally selected weekdays', () => {
  assert.match(settingsSource, /function computeSessionsCount\(weekdaySet, yearMonth\)/);
  assert.match(settingsSource, /const liveSessionsCount = computeSessionsCount\(weekdays, d\.currentYearMonth\)/);
  assert.match(settingsSource, /\{liveSessionsCount\} buổi theo lịch tháng này/);
  assert.doesNotMatch(settingsSource, /const perSession = Math\.round/);
  assert.doesNotMatch(settingsSource, /\{liveSessionsCount\} buổi × \{d\.memberCount\} thành viên/);
  assert.doesNotMatch(settingsSource, /courtFee \/ d\.sessionsCount/);
  assert.doesNotMatch(settingsSource, /\{d\.sessionsCount\} buổi ×/);
});

test('PickleballSettings removes next-month preview and explains monthly schedule scope', () => {
  assert.doesNotMatch(settingsSource, /function buildLiveNextMonthPreview\(today, weekdaySet\)/);
  assert.doesNotMatch(settingsSource, /liveNextMonthPreview/);
  assert.doesNotMatch(settingsSource, /Xem trước/);
  assert.match(settingsSource, /Áp dụng cho tháng này và lịch tương lai chưa chốt\. Buổi đã chốt không đổi\./);
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
  assert.match(appSource, /const scheduleStartChanged = oldScheduleStartDay !== newScheduleStartDay/);
  assert.match(appSource, /const shouldRegenerateSchedule = !sameScheduleWeekdays\(oldWeekdays, newWeekdays\) \|\| scheduleTimeChanged \|\| scheduleStartChanged \|\| hasScheduledSessionsWithOldDays/);
  assert.match(appSource, /\.from\('pickle_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('group_id', groupId\)[\s\S]*?\.eq\('status', 'scheduled'\)[\s\S]*?\.gte\('session_date', `\$\{yearMonth\}-01`\)[\s\S]*?\.lte\('session_date', `\$\{yearMonth\}-31`\)/);
  assert.match(appSource, /type: 'AUTO_GENERATE_SESSIONS'[\s\S]*?yearMonth[\s\S]*?config: generationConfig/);
});
