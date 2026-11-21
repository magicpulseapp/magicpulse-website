(function (root) {
  'use strict';

  var ZONE = 'America/New_York';
  var MAX_AGE = 36 * 60 * 60 * 1000;
  var SOURCES = [
    { id: 'veryMerry', parkId: 6, name: "Mickey's Very Merry Christmas Party",
      url: 'https://disneyworld.disney.go.com/events-tours/magic-kingdom/mickeys-very-merry-christmas-party/' },
    { id: 'jollywood', parkId: 7, name: 'Disney Jollywood Nights',
      url: 'https://disneyworld.disney.go.com/events-tours/hollywood-studios/jollywood-nights/' }
  ];

  function parkDate(now) {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    function part(type) { return parts.find(function (item) { return item.type === type; }).value; }
    return part('year') + '-' + part('month') + '-' + part('day');
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var time = Date.parse(value + 'T12:00:00Z');
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  }

  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)) return NaN;
    var time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19) ? time : NaN;
  }

  function seasonal(now) {
    var monthDay = parkDate(now).slice(5);
    return monthDay >= '11-01' || monthDay <= '01-06';
  }

  function read(payload, now) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.events) || payload.events.length > 1500 ||
        !Array.isArray(payload.sources) || payload.sources.length > 16 ||
        ['official-cache', 'mixed', 'bundled-fallback'].indexOf(payload.source) === -1) return null;
    var updated = timestamp(payload.updatedAt);
    if (!Number.isFinite(updated) || updated > now + 300000 || now - updated > MAX_AGE) return null;
    var events = [];
    var seen = new Set();
    for (var i = 0; i < payload.events.length; i++) {
      var item = payload.events[i];
      if (!item || item.kind !== 'christmasParty') continue;
      var source = SOURCES.find(function (entry) { return entry.id === item.source; });
      if (!source) continue;
      var entry = timestamp(item.earlyEntryAt), start = timestamp(item.startsAt), end = timestamp(item.endsAt);
      var key = source.id + ':' + item.date;
      if (item.parkId !== source.parkId || item.timeZone !== ZONE || item.ticketRequired !== true ||
          item.accessRestriction != null || !validDate(item.date) || !Number.isFinite(entry) || !Number.isFinite(start) ||
          !Number.isFinite(end) || !(entry < start && start < end) || end - entry > 12 * 3600000 ||
          parkDate(entry) !== item.date || parkDate(start) !== item.date || seen.has(key)) return null;
      seen.add(key);
      events.push({ source: source.id, date: item.date, earlyEntryAt: entry, startsAt: start, endsAt: end });
    }
    var verified = {};
    for (var j = 0; j < SOURCES.length; j++) {
      var id = SOURCES[j].id;
      var statuses = payload.sources.filter(function (status) { return status && status.id === id; });
      if (statuses.length !== 1 || statuses[0].dateCount !== events.filter(function (event) { return event.source === id; }).length) return null;
      var success = timestamp(statuses[0].lastSuccessAt);
      verified[id] = payload.source !== 'bundled-fallback' && statuses[0].usingFallback === false && Number.isFinite(success) && success <= now + 300000 && now - success <= MAX_AGE;
    }
    return { events: events.sort(function (a, b) { return a.startsAt - b.startsAt; }), verified: verified, updatedAt: updated };
  }

  function view(schedule, source, date, now) {
    if (!validDate(date)) return { state: 'invalid', event: null };
    if (!schedule) return { state: 'unavailable', event: null };
    var events = schedule.events.filter(function (item) { return item.source === source; });
    var event = events.find(function (item) { return item.date === date; });
    // An after-midnight party belongs to the previous park date, not the next night.
    var active = date === parkDate(now) && schedule.verified[source] && events.find(function (item) { return item.startsAt <= now && now < item.endsAt; });
    if (active) event = active;
    if (!event) return { state: 'none', event: null,
      next: events.find(function (item) { return item.date >= date && item.endsAt > now; }) || null };
    var state = !schedule.verified[source] ? 'unverified' : now >= event.endsAt ? 'ended' : now >= event.startsAt ? 'active'
      : now >= event.earlyEntryAt ? 'entry' : date === parkDate(now) ? 'tonight' : 'scheduled';
    return { state: state, event: event };
  }

  root.MagicPulseHoliday = { sources: SOURCES, parkDate: parkDate, validDate: validDate, seasonal: seasonal, read: read, view: view };
  if (typeof document === 'undefined') return;

  var preferenceKey = 'magicpulse-holiday-look';
  var preference = null;
  function savedPreference() {
    try { var value = localStorage.getItem(preferenceKey); return value === 'on' || value === 'off' ? value : null; }
    catch (_) { return null; }
  }
  preference = savedPreference();
  function applyTheme() {
    var enabled = preference === null ? seasonal(Date.now()) : preference === 'on';
    document.documentElement.classList.toggle('holiday-season', enabled);
    var input = document.getElementById('holiday-look');
    if (input) input.checked = enabled;
  }
  applyTheme();

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && new URL(canonical.href).pathname === '/') {
    [false, true].forEach(function (mobile) {
      var holiday = document.documentElement.classList.contains('holiday-season');
      var file = holiday ? (mobile ? 'holiday-hero-mobile-20261109.webp' : 'magic-pulse-atmosphere-christmas-v1.webp')
        : (mobile ? 'storybook-header-mobile-20261007.webp' : 'storybook-header-20261007.webp');
      var link = document.createElement('link');
      link.rel = 'preload'; link.as = 'image'; link.type = 'image/webp';
      link.href = 'assets/brand/' + file;
      link.media = mobile ? '(max-width: 760px)' : '(min-width: 761px)';
      document.head.appendChild(link);
    });
  }

  function init() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var bar = document.createElement('div'); bar.className = 'holiday-bar';
    var inner = document.createElement('div'); inner.className = 'container holiday-bar-inner';
    var link = document.createElement('a'); link.href = document.querySelector('[data-holiday-planner]') ? '#special-nights' : '/#special-nights';
    link.textContent = 'Holiday parties';
    var label = document.createElement('label'); label.className = 'holiday-switch';
    var toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.id = 'holiday-look';
    label.appendChild(toggle); label.appendChild(document.createTextNode('Holiday look'));
    inner.appendChild(link); inner.appendChild(label); bar.appendChild(inner); header.after(bar);
    var snow = document.createElement('div'); snow.className = 'holiday-snow'; snow.setAttribute('aria-hidden', 'true'); snow.inert = true;
    for (var i = 0; i < 8; i++) { var flake = document.createElement('span'); flake.textContent = '\u2744'; snow.appendChild(flake); }
    document.body.appendChild(snow);
    toggle.addEventListener('change', function () {
      preference = toggle.checked ? 'on' : 'off';
      try { localStorage.setItem(preferenceKey, preference); } catch (_) { /* Keep the choice for this page when storage is blocked. */ }
      applyTheme();
    });
    window.addEventListener('storage', function (event) {
      if (event.key === preferenceKey || event.key === null) { preference = savedPreference(); applyTheme(); }
    });
    applyTheme();

    var planner = document.querySelector('[data-holiday-planner]');
    if (!planner) return;
    var dateInput = planner.querySelector('[data-holiday-date]');
    var status = planner.querySelector('[data-holiday-status]');
    var refresh = planner.querySelector('[data-holiday-refresh]');
    var payload = null, loading = false, touched = false, lastFetch = 0;
    var dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric', year: 'numeric' });
    var timeFormat = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });
    var states = { invalid: 'Choose a valid date', unavailable: 'Check official dates', none: 'No party listed for this date',
      unverified: 'Listed date · verify with Disney', ended: 'Party ended', active: 'Party in progress · ticket required',
      entry: 'Early entry open · ticket required', tonight: 'Party tonight · ticket required', scheduled: 'Scheduled party · ticket required' };
    function put(element, text) { if (element.textContent !== text) element.textContent = text; }
    function render() {
      if (!touched) dateInput.value = parkDate(Date.now());
      var schedule = read(payload, Date.now());
      planner.querySelectorAll('[data-holiday-source]').forEach(function (card) {
        var result = view(schedule, card.getAttribute('data-holiday-source'), dateInput.value, Date.now());
        put(card.querySelector('[data-party-state]'), loading && !schedule ? 'Checking dates…' : states[result.state]);
        card.setAttribute('data-party-phase', result.state);
        var event = result.event || result.next;
        var dates = card.querySelector('[data-party-date]');
        put(dates, event ? (result.event ? 'Party date · ' : 'Next listed party · ') + dateFormat.format(event.startsAt) : 'Select nights. Confirm your date and ticket availability with Disney.');
        var times = card.querySelector('[data-party-times]'); times.hidden = !event;
        if (event) {
          put(card.querySelector('[data-party-entry]'), timeFormat.format(event.earlyEntryAt));
          put(card.querySelector('[data-party-hours]'), timeFormat.format(event.startsAt) + ' – ' + timeFormat.format(event.endsAt) + (parkDate(event.endsAt) !== event.date ? ' next day' : ''));
        }
      });
      var verified = schedule && SOURCES.every(function (source) { return schedule.verified[source.id]; });
      put(status, loading ? 'Checking party schedules…' : !schedule ? 'Schedule unavailable. Use the official links below to confirm dates and admission.'
        : verified ? 'Official schedule checked ' + dateFormat.format(schedule.updatedAt) + '. All times Eastern; schedules may change.'
        : 'Unverified or fallback schedule. Confirm all dates and hours with Disney. All times Eastern.');
      planner.setAttribute('aria-busy', loading ? 'true' : 'false');
      refresh.disabled = loading;
    }
    async function load() {
      if (loading) return;
      loading = true; render();
      var controller = new AbortController();
      var timer = window.setTimeout(function () { controller.abort(); }, 5000);
      try {
        var response = await fetch('https://api.magicpulse.app/api/app/seasonal-events', { credentials: 'omit', redirect: 'error', cache: 'no-cache', signal: controller.signal });
        if (!response.ok || !response.body || Number(response.headers.get('Content-Length')) > 524288) throw new Error('Unavailable schedule');
        var reader = response.body.getReader(), chunks = [], total = 0;
        while (true) {
          var chunk = await reader.read(); if (chunk.done) break;
          total += chunk.value.length;
          if (total > 524288) { await reader.cancel(); throw new Error('Oversized schedule'); }
          chunks.push(chunk.value);
        }
        var bytes = new Uint8Array(total), offset = 0;
        chunks.forEach(function (chunk) { bytes.set(chunk, offset); offset += chunk.length; });
        var candidate = JSON.parse(new TextDecoder().decode(bytes));
        if (!read(candidate, Date.now())) throw new Error('Invalid or expired schedule');
        payload = candidate;
      } catch (_) { payload = null; }
      finally { window.clearTimeout(timer); loading = false; lastFetch = Date.now(); render(); }
    }
    planner.querySelector('[data-holiday-controls]').hidden = false;
    dateInput.value = parkDate(Date.now());
    dateInput.addEventListener('change', function () { touched = true; render(); });
    refresh.addEventListener('click', load);
    window.addEventListener('online', load);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { render(); if (Date.now() - lastFetch > 900000) load(); } });
    window.setInterval(function () { if (!document.hidden) { applyTheme(); render(); if (Date.now() - lastFetch > 900000) load(); } }, 60000);
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}(globalThis));
