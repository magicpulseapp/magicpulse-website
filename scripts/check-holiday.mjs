import assert from 'node:assert/strict';
import '../holiday.js';
import { holidaySchedule } from './fixtures/holiday-schedule.mjs';

const policy = globalThis.MagicPulseHoliday;
const now = Date.parse('2026-11-09T16:00:00Z');
const payload = holidaySchedule(now);
const original = JSON.stringify(payload);
const schedule = policy.read(payload, now);
assert.equal(schedule.events.length, 4);
assert.deepEqual(schedule.verified, { veryMerry: true, jollywood: true });
assert.equal(JSON.stringify(payload), original, 'Reading must not mutate source data');
for (const [date, active] of [['2026-10-31T16:00:00Z', false], ['2026-11-01T16:00:00Z', true],
  ['2027-01-06T16:00:00Z', true], ['2027-01-07T03:00:00Z', true], ['2027-01-07T05:00:00Z', false]]) {
  assert.equal(policy.seasonal(Date.parse(date)), active, date);
}
assert.equal(policy.parkDate(Date.parse('2026-11-10T01:00:00Z')), '2026-11-09');
for (const date of ['2026-02-30', '2026-02-29', '2026-11-31', 'bad', '', null, '2026-11-09T00:00:00Z']) assert.equal(policy.validDate(date), false);
assert.equal(policy.validDate('2028-02-29'), true);
for (const override of [{ schemaVersion: 2 }, { source: 'invented' }, { events: null }, { sources: null },
  { updatedAt: 'bad' }, { updatedAt: new Date(now + 360000).toISOString() },
  { updatedAt: new Date(now - 37 * 3600000).toISOString() }]) assert.equal(policy.read({ ...payload, ...override }, now), null);
for (const override of [{ date: '2026-11-08' }, { parkId: 7 }, { timeZone: 'UTC' }, { ticketRequired: false },
  { accessRestriction: 'members' }, { earlyEntryAt: payload.events[0].startsAt },
  { endsAt: payload.events[0].startsAt }, { startsAt: 'bad' }, { endsAt: '2026-11-11T00:00:00Z' }]) {
  assert.equal(policy.read({ ...payload, events: [{ ...payload.events[0], ...override }, ...payload.events.slice(1)] }, now), null);
}
assert.equal(policy.read({ ...payload, events: [...payload.events, payload.events[0]] }, now), null);
assert.equal(policy.read({ ...payload, sources: [...payload.sources, payload.sources[0]] }, now), null);
assert.equal(policy.read({ ...payload, events: payload.events.slice(1) }, now), null, 'Incomplete feed must not produce false non-party dates');
const invalidEnd = { ...payload.events[0], date: '2026-11-30', earlyEntryAt: '2026-11-30T21:00:00Z', startsAt: '2026-12-01T00:00:00Z', endsAt: '2026-11-31T05:00:00Z' };
assert.equal(policy.read({ ...payload, events: [invalidEnd, ...payload.events.slice(1)] }, now), null, 'Calendar-invalid ISO timestamps must not normalize silently');
assert.equal(policy.read({ ...payload, source: 'bundled-fallback' }, now).verified.veryMerry, false);
assert.equal(policy.view(null, 'veryMerry', '2026-11-09', now).state, 'unavailable');
assert.equal(policy.view(schedule, 'veryMerry', '', now).state, 'invalid');
assert.equal(policy.view(schedule, 'veryMerry', '2026-11-09', now).state, 'tonight');
assert.equal(policy.view(schedule, 'veryMerry', '2026-11-12', now).state, 'scheduled');
const none = policy.view(schedule, 'jollywood', '2026-11-09', now);
assert.equal(none.state, 'none');
assert.equal(none.next.date, '2026-11-14');
assert.equal(policy.view(schedule, 'veryMerry', '2026-11-09', Date.parse('2026-11-09T21:00:00Z')).state, 'entry');
assert.equal(policy.view(schedule, 'veryMerry', '2026-11-09', Date.parse('2026-11-10T00:00:00Z')).state, 'active');
assert.equal(policy.view(schedule, 'veryMerry', '2026-11-09', Date.parse('2026-11-10T05:00:00Z')).state, 'ended');
const midnight = Date.parse('2027-01-06T05:10:00Z');
const january = policy.read(holidaySchedule(midnight), midnight);
const overnight = policy.view(january, 'jollywood', '2027-01-06', midnight);
assert.equal(overnight.state, 'active');
assert.equal(overnight.event.date, '2027-01-05');
assert.equal(policy.view(january, 'jollywood', '2027-01-06', Date.parse('2027-01-06T05:30:00Z')).state, 'none');
const fallback = policy.read({ ...payload, sources: payload.sources.map(source => ({ ...source, usingFallback: true })) }, now);
assert.equal(policy.view(fallback, 'veryMerry', '2026-11-09', now).state, 'unverified');
const expiredSource = policy.read({ ...payload, sources: payload.sources.map(source => ({ ...source, lastSuccessAt: '2026-01-01T00:00:00Z' })) }, now);
assert.equal(expiredSource.verified.veryMerry, false);
assert.equal(policy.view(expiredSource, 'veryMerry', '2026-11-09', now).state, 'unverified');
assert.ok(policy.sources.every(source => source.url.startsWith('https://disneyworld.disney.go.com/')));
console.log('Holiday schedule validation, timezone/overnight boundaries, fallback safety and seasonal theme checks passed.');
