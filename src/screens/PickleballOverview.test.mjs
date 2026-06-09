import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const overviewSource = readFileSync(new URL('./PickleballOverview.jsx', import.meta.url), 'utf8');

test('PickleballOverview owns treasurer schedule config as a collapsible section', () => {
  assert.match(overviewSource, /import React, \{ useState, useEffect \} from 'react'/);
  assert.match(overviewSource, /const DAYS = \['T2','T3','T4','T5','T6','T7','CN'\]/);
  assert.match(overviewSource, /function computeSessionsCount\(weekdaySet, yearMonth\)/);
  assert.match(overviewSource, /const \[configExpanded, setConfigExpanded\] = useState\(false\)/);
  assert.match(overviewSource, /const sc = d\.scheduleConfig \|\| \{\}/);
  assert.match(overviewSource, /const liveSessionsCount = computeSessionsCount\(weekdays, d\.currentYearMonth\)/);
  assert.match(overviewSource, /Cài đặt lịch/);
  assert.match(overviewSource, /onClick=\{\(\) => setConfigExpanded\(prev => !prev\)\}/);
  assert.match(overviewSource, /await onAction\?\.\('save', \{/);
  assert.match(overviewSource, /scheduleTime: `\$\{timeStart\} – \$\{timeEnd\}`/);
  assert.doesNotMatch(overviewSource, /onAction\?\.\('settings'\)/);
});
