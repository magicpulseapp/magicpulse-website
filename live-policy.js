(function (root) {
  'use strict';

  var MAX_AGE_MS = 15 * 60 * 1000;

  function versionParts(value) {
    return typeof value === 'string' && /^\d{1,6}(\.\d{1,6}){0,2}$/.test(value)
      ? value.split('.').map(Number) : null;
  }

  function compareVersions(a, b) {
    for (var i = 0; i < 3; i++) {
      var delta = (a[i] || 0) - (b[i] || 0);
      if (delta) return delta;
    }
    return 0;
  }

  function unknownPolicy() {
    return { known: false, validUntil: 0, incidents: [] };
  }

  function readPolicy(payload, parkId, version, now, leaseMs) {
    var currentVersion = versionParts(version);
    if (!currentVersion || !payload || payload.schemaVersion !== 1 || payload.parkId !== parkId ||
        payload.locale !== 'en' || !Array.isArray(payload.entries) || payload.entries.length > 1000) return unknownPolicy();
    var validUntil = now + Math.max(0, Math.min(60000, leaseMs == null ? 60000 : leaseMs));
    var incidents = [];
    for (var i = 0; i < payload.entries.length; i++) {
      var entry = payload.entries[i];
      if (!entry || entry.kind !== 'incident') continue;
      if (entry.parkId !== parkId || entry.paused === true) continue;
      var target = entry.target || {};
      var minimum = target.minimumVersion == null ? null : versionParts(target.minimumVersion);
      var maximum = target.maximumVersion == null ? null : versionParts(target.maximumVersion);
      if ((target.minimumVersion != null && !minimum) || (target.maximumVersion != null && !maximum)) return unknownPolicy();
      if ((minimum && compareVersions(currentVersion, minimum) < 0) ||
          (maximum && compareVersions(currentVersion, maximum) > 0)) continue;
      var end = Date.parse(entry.endsAt || '');
      var start = entry.startsAt == null ? null : Date.parse(entry.startsAt);
      if (!Number.isFinite(end) || (start !== null && !Number.isFinite(start)) ||
          !Array.isArray(entry.disabledFeatures) || !entry.disabledFeatures.length ||
          entry.disabledFeatures.some(function (feature) {
            return ['forecasts', 'nowRecommendations', 'eventsPage', 'lightningLanePage'].indexOf(feature) === -1;
          }) || typeof entry.reason !== 'string' || !entry.reason.trim() || entry.reason.length > 4000) return unknownPolicy();
      if (end <= now) continue;
      if (start !== null && start > now) {
        validUntil = Math.min(validUntil, start);
        continue;
      }
      validUntil = Math.min(validUntil, end);
      incidents.push({ reason: entry.reason, disabledFeatures: entry.disabledFeatures.slice(), endsAt: end });
    }
    return { known: true, validUntil: validUntil, incidents: incidents };
  }

  function restrictions(policy, now) {
    var known = !!(policy && policy.known && now < policy.validUntil);
    var incidents = policy ? policy.incidents.filter(function (entry) { return entry.endsAt > now; }) : [];
    return {
      known: known,
      forecasts: known && !incidents.some(function (entry) { return entry.disabledFeatures.indexOf('forecasts') !== -1; }),
      recommendations: known && !incidents.some(function (entry) { return entry.disabledFeatures.indexOf('nowRecommendations') !== -1; }),
      lightningLane: known && !incidents.some(function (entry) { return entry.disabledFeatures.indexOf('lightningLanePage') !== -1; }),
      reasons: incidents.map(function (entry) { return entry.reason; })
    };
  }

  function freshness(snapshot, now) {
    var timestamp = Date.parse(snapshot && snapshot.updatedISO || '');
    var rides = snapshot && snapshot.status && snapshot.status.rides;
    var known = Number.isFinite(timestamp) && timestamp <= now + 5 * 60 * 1000;
    return {
      timestamp: known ? timestamp : null,
      stale: !known || now - timestamp > MAX_AGE_MS || !!(rides && (rides.isStale || rides.state === 'error'))
    };
  }

  function project(items, policy, fresh, now) {
    var allowed = restrictions(policy, now);
    var forecasts = !fresh.stale && allowed.forecasts;
    return items.map(function (item) {
      return Object.assign({}, item, {
        predictedWaitIn30Min: forecasts && item.isOpen !== false ? item.predictedWaitIn30Min : null,
        waitAnomaly: forecasts && item.isOpen !== false ? item.waitAnomaly : null,
        lightningLaneVerdict: forecasts && allowed.recommendations && allowed.lightningLane && item.isOpen !== false ? item.lightningLaneVerdict : null,
        guidanceUnavailable: fresh.stale ? 'Delayed data' : !forecasts ? 'Forecast unavailable' : null
      });
    });
  }

  root.MagicPulseLivePolicy = { read: readPolicy, unknown: unknownPolicy, restrictions: restrictions, freshness: freshness, project: project };
}(globalThis));
