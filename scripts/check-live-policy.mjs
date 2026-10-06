import assert from 'node:assert/strict';
import '../live-policy.js';

const policy = globalThis.MagicPulseLivePolicy;
const now = Date.parse('2026-10-06T15:00:00Z');
const ride = { name: 'Ride', waitTime: 30, predictedWaitIn30Min: 10, waitAnomaly: 'low', lightningLaneVerdict: { verdict: 'buy' } };
const fresh = policy.freshness({ updatedISO: new Date(now).toISOString() }, now);
const envelope = (entries) => ({ schemaVersion: 1, parkId: 6, locale: 'en', entries });
const incident = { kind: 'incident', parkId: 6, target: { minimumVersion: '2.0', maximumVersion: null }, startsAt: null,
  endsAt: new Date(now + 30000).toISOString(), paused: false, reason: 'Forecasts temporarily paused', disabledFeatures: ['forecasts'] };
const read = (entries, version = '2.2') => policy.read(envelope(entries), 6, version, now);

assert.equal(policy.restrictions(read([]), now).forecasts, true);
assert.equal(policy.project([ride], read([]), fresh, now)[0].predictedWaitIn30Min, 10);
assert.equal(policy.project([ride], read([incident]), fresh, now)[0].predictedWaitIn30Min, null);
assert.equal(policy.project([ride], read([incident]), fresh, now)[0].waitTime, 30);
assert.equal(ride.predictedWaitIn30Min, 10, 'Projection must not mutate source data');
assert.equal(policy.project([{ ...ride, isOpen: false }], read([]), fresh, now)[0].predictedWaitIn30Min, null);
assert.equal(policy.restrictions(read([{ ...incident, disabledFeatures: ['nowRecommendations'] }]), now).forecasts, true);
assert.equal(policy.restrictions(read([{ ...incident, disabledFeatures: ['nowRecommendations'] }]), now).recommendations, false);
const lane = { price: 20, available: true };
const lanePaused = policy.project([{ ...ride, lightningLane: lane }], read([{ ...incident, disabledFeatures: ['lightningLanePage'] }]), fresh, now)[0];
assert.equal(lanePaused.lightningLaneVerdict, null, 'A Lightning Lane incident must hide purchase advice');
assert.equal(lanePaused.predictedWaitIn30Min, 10, 'A Lightning Lane incident must not suppress independent wait forecasts');
assert.equal(lanePaused.lightningLane, lane, 'Posted Lightning Lane details must remain unchanged');
for (const override of [{ paused: true }, { parkId: 5 }, { endsAt: new Date(now).toISOString() }, { target: { minimumVersion: '3.0' } }]) {
  assert.equal(policy.restrictions(read([{ ...incident, ...override }]), now).forecasts, true);
}
assert.equal(policy.restrictions(read([incident], '2.0'), now).forecasts, false);
assert.equal(policy.restrictions(read([incident]), now + 30000).forecasts, false, 'Expiry requires a fresh policy response, not stale recovery');
assert.equal(policy.restrictions(read([incident]), now + 30000).reasons.length, 0);
const scheduled = read([{ ...incident, startsAt: new Date(now + 10000).toISOString() }]);
assert.equal(policy.restrictions(scheduled, now).forecasts, true);
assert.equal(policy.restrictions(scheduled, now + 10000).forecasts, false);
for (const override of [{ endsAt: 'bad' }, { reason: '' }, { disabledFeatures: ['enableAds'] }, { target: { minimumVersion: 'bad' } }]) {
  assert.equal(read([{ ...incident, ...override }]).known, false);
}
for (const payload of [null, {}, { ...envelope([]), parkId: 5 }, { ...envelope([]), schemaVersion: 2 }, { ...envelope([]), locale: 'es' }]) {
  assert.equal(policy.read(payload, 6, '2.2', now).known, false);
}
for (const snapshot of [{}, { updatedISO: 'bad' }, { updatedISO: new Date(now - 16 * 60000).toISOString() },
  { updatedISO: new Date(now + 6 * 60000).toISOString() }, { updatedISO: new Date(now).toISOString(), status: { rides: { isStale: true } } }]) {
  const age = policy.freshness(snapshot, now);
  assert.equal(age.stale, true);
  assert.equal(policy.project([ride], read([]), age, now)[0].predictedWaitIn30Min, null);
}
assert.equal(policy.restrictions(read([]), now + 60000).known, false);
assert.equal(policy.restrictions(policy.read(envelope([]), 6, '2.2', now, 10000), now + 10000).known, false);
assert.equal(policy.project([ride], policy.unknown(), fresh, now)[0].lightningLaneVerdict, null);
console.log('Live policy audience, scheduling, expiry, unknown-state, projection and freshness checks passed.');
