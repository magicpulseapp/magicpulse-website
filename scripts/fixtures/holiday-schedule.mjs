export function holidaySchedule(now = Date.now()) {
  const event = (source, parkId, date, entry, start, end) => ({
    id: `${source}:${date}`, source, parkId, date, kind: 'christmasParty', name: 'Untrusted display name',
    timeZone: 'America/New_York', ticketRequired: true, accessRestriction: null,
    earlyEntryAt: entry, startsAt: start, endsAt: end, officialURL: 'https://example.invalid/untrusted'
  });
  return { schemaVersion: 1, source: 'official-cache', updatedAt: new Date(now).toISOString(), events: [
    event('veryMerry', 6, '2026-11-09', '2026-11-09T21:00:00Z', '2026-11-10T00:00:00Z', '2026-11-10T05:00:00Z'),
    event('veryMerry', 6, '2026-11-12', '2026-11-12T21:00:00Z', '2026-11-13T00:00:00Z', '2026-11-13T05:00:00Z'),
    event('jollywood', 7, '2026-11-14', '2026-11-14T22:30:00Z', '2026-11-15T00:30:00Z', '2026-11-15T05:30:00Z'),
    event('jollywood', 7, '2027-01-05', '2027-01-05T22:30:00Z', '2027-01-06T00:30:00Z', '2027-01-06T05:30:00Z')
  ], sources: ['veryMerry', 'jollywood'].map(id => ({ id, dateCount: 2, usingFallback: false, lastSuccessAt: new Date(now).toISOString() })) };
}
