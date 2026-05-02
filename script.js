(function () {
  function revealAllNow() {
    document.querySelectorAll('.reveal, .section, .section-alt').forEach(function (el) {
      el.classList.add('revealed');
    });
  }

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noIntersectionObserver = typeof window.IntersectionObserver === 'undefined';

  if (prefersReducedMotion || noIntersectionObserver) {
    revealAllNow();
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    document.querySelectorAll('.reveal, .section, .section-alt').forEach(function (el) {
      revealObserver.observe(el);
    });

    window.setTimeout(function () {
      revealAllNow();
    }, 4000);
  }

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-navigation') || document.querySelector('.site-nav');

  if (menuBtn && nav) {
    menuBtn.setAttribute('aria-controls', 'site-navigation');
    menuBtn.setAttribute('aria-expanded', 'false');

    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    function closeMenu() {
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
    }

    function openMenu() {
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close menu');
    }

    menuBtn.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) closeMenu();
      else openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // Sticky mobile CTA bar — show after hero, hide near download section
  (function () {
    var ctaBar = document.getElementById('mobile-cta-bar');
    var downloadSection = document.getElementById('download');
    if (!ctaBar) return;

    var shown = false;

    function updateCtaBar() {
      var scrollY = window.scrollY || window.pageYOffset;
      var heroHeight = 320;
      var nearBottom = false;

      if (downloadSection) {
        var rect = downloadSection.getBoundingClientRect();
        nearBottom = rect.top < window.innerHeight * 0.85;
      }

      var shouldShow = scrollY > heroHeight && !nearBottom;

      if (shouldShow && !shown) {
        shown = true;
        ctaBar.classList.add('is-visible');
        ctaBar.removeAttribute('aria-hidden');
        ctaBar.querySelector('a').removeAttribute('tabindex');
        document.body.classList.add('has-mobile-cta');
      } else if (!shouldShow && shown) {
        shown = false;
        ctaBar.classList.remove('is-visible');
        ctaBar.setAttribute('aria-hidden', 'true');
        ctaBar.querySelector('a').setAttribute('tabindex', '-1');
        document.body.classList.remove('has-mobile-cta');
      }
    }

    window.addEventListener('scroll', updateCtaBar, { passive: true });
    updateCtaBar();
  }());

  var waitsRoot = document.getElementById('live-waits');
  if (!waitsRoot) return;

  var MAGICPULSE_API_BASE =
    typeof window.MAGICPULSE_API_BASE === 'string' ? window.MAGICPULSE_API_BASE : '';
  var MAGICPULSE_API_TOKEN = window.MAGICPULSE_API_TOKEN || '';
  var MAGICPULSE_PARK_ID = 6;
  if (typeof window.MAGICPULSE_PARK_ID === 'number' && !Number.isNaN(window.MAGICPULSE_PARK_ID)) {
    MAGICPULSE_PARK_ID = window.MAGICPULSE_PARK_ID;
  } else if (window.MAGICPULSE_PARK_ID != null && String(window.MAGICPULSE_PARK_ID).trim() !== '') {
    var parsedId = parseInt(String(window.MAGICPULSE_PARK_ID), 10);
    if (!Number.isNaN(parsedId)) MAGICPULSE_PARK_ID = parsedId;
  }

  var LIVE_REFRESH_MS =
    typeof window.MAGICPULSE_LIVE_REFRESH_MS === 'number' && !Number.isNaN(window.MAGICPULSE_LIVE_REFRESH_MS)
      ? Math.max(60000, Math.min(600000, window.MAGICPULSE_LIVE_REFRESH_MS))
      : 180000;

  var LIVE_FETCH_TIMEOUT_MS =
    typeof window.MAGICPULSE_LIVE_FETCH_TIMEOUT_MS === 'number' && !Number.isNaN(window.MAGICPULSE_LIVE_FETCH_TIMEOUT_MS)
      ? Math.max(3000, Math.min(60000, window.MAGICPULSE_LIVE_FETCH_TIMEOUT_MS))
      : 8000;

  var LIVE_SNAPSHOT_BUDGET_MS =
    typeof window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS === 'number' && !Number.isNaN(window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS)
      ? Math.max(4000, Math.min(120000, window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS))
      : 14000;

  /** Default hero data: ThemeParks Wiki public API (same source labels as the iOS app). */
  var THEMEPARKS_WIKI_LIVE_BASE = 'https://api.themeparks.wiki/v1/entity';
  var SNAPSHOT_SOURCE_MAGICPULSE =
    window.MAGICPULSE_SNAPSHOT_SOURCE === 'magicpulse' &&
    typeof MAGICPULSE_API_BASE === 'string' &&
    MAGICPULSE_API_BASE.replace(/\s/g, '').length > 0;

  // Keep `name` / `entityId` in sync with `HUDConstants.parks` + MagicPulseAPI `src/constants/parks.ts`.
  var PARKS = [
    { id: 6, name: 'Magic Kingdom', theme: 'mk', resort: 'WDW', icon: '🎢', entityId: '75ea578a-adc8-4116-a54d-dccb60765ef9' },
    { id: 5, name: 'EPCOT', theme: 'epcot', resort: 'WDW', icon: '🌐', entityId: '47f90d2c-e191-4239-a466-5892ef59a88b' },
    { id: 7, name: "Disney's Hollywood Studios", theme: 'hs', resort: 'WDW', icon: '🎬', entityId: '288747d1-8b4f-4a64-867e-ea7c9b27bad8' },
    { id: 8, name: "Disney's Animal Kingdom", theme: 'ak', resort: 'WDW', icon: '🦁', entityId: '1c84a229-8862-4648-9c71-378ddd2c7693' },
    { id: 16, name: 'Disneyland Park', theme: 'dl', resort: 'DLR', icon: '🏛', entityId: '7340550b-c14d-4def-80bb-acdb51d49a66' },
    { id: 17, name: 'Disney California Adventure', theme: 'dca', resort: 'DLR', icon: '🌴', entityId: '832fcd51-ea19-4e77-85c7-75d5843b127c' },
    { id: 274, name: 'Tokyo Disneyland', theme: 'tdl', resort: 'TDR', icon: '🗼', entityId: '3cc919f1-d16d-43e0-8c3f-1dd269bd1a42' },
    { id: 275, name: 'Tokyo DisneySea', theme: 'tds', resort: 'TDR', icon: '🌊', entityId: '67b290d5-3478-4f23-b601-2f8fb71ba803' },
    { id: 4, name: 'Disneyland Park (Paris)', theme: 'dlp', resort: 'DLP', icon: '🏛', entityId: 'dae968d5-630d-4719-8b06-3d107e944401' },
    { id: 28, name: 'Walt Disney Studios Park', theme: 'wdsp', resort: 'DLP', icon: '🎬', entityId: 'ca888437-ebb4-4d50-aed2-d227f7096968' }
  ];

  var SNAPSHOT_RIDE_COUNT = 4;
  if (typeof window.MAGICPULSE_SNAPSHOT_RIDE_COUNT === 'number' && !Number.isNaN(window.MAGICPULSE_SNAPSHOT_RIDE_COUNT)) {
    SNAPSHOT_RIDE_COUNT = Math.max(1, Math.min(20, window.MAGICPULSE_SNAPSHOT_RIDE_COUNT));
  }

  var DEFAULT_POPULAR_RIDES_BY_PARK = {
    6: [
      { rideName: 'TRON Lightcycle / Run' },
      { rideName: 'Seven Dwarfs Mine Train' },
      { rideName: 'Space Mountain' },
      { rideName: 'Peter Pan\'s Flight' },
      { rideName: 'Tiana\'s Bayou Adventure' },
      { rideName: 'Jungle Cruise' }
    ],
    5: [
      { rideName: 'Guardians of the Galaxy: Cosmic Rewind' },
      { rideName: 'Frozen Ever After' },
      { rideName: 'Remy\'s Ratatouille Adventure' },
      { rideName: 'Soarin\' Around the World' },
      { rideName: 'Test Track' }
    ],
    7: [
      { rideName: 'Star Wars: Rise of the Resistance' },
      { rideName: 'Slinky Dog Dash' },
      { rideName: 'The Twilight Zone Tower of Terror' },
      { rideName: 'Rock \'n\' Roller Coaster Starring Aerosmith' },
      { rideName: 'Mickey & Minnie\'s Runaway Railway' }
    ],
    8: [
      { rideName: 'Avatar Flight of Passage' },
      { rideName: 'Na\'vi River Journey' },
      { rideName: 'Kilimanjaro Safaris' },
      { rideName: 'Expedition Everest - Legend of the Forbidden Mountain' }
    ],
    16: [
      { rideName: 'Star Wars: Rise of the Resistance' },
      { rideName: 'Indiana Jones Adventure' },
      { rideName: 'Space Mountain' },
      { rideName: 'Big Thunder Mountain Railroad' },
      { rideName: 'Matterhorn Bobsleds' }
    ],
    17: [
      { rideName: 'Radiator Springs Racers' },
      { rideName: 'Guardians of the Galaxy - Mission: BREAKOUT!' },
      { rideName: 'WEB SLINGERS: A Spider-Man Adventure' },
      { rideName: 'Incredicoaster' },
      { rideName: 'Soarin\' Around the World' }
    ],
    274: [
      { rideName: 'Beauty and the Beast' },
      { rideName: 'Pooh\'s Hunny Hunt' },
      { rideName: 'Monsters, Inc. Ride & Go Seek' },
      { rideName: 'Haunted Mansion' },
      { rideName: 'Space Mountain' }
    ],
    275: [
      { rideName: 'Soaring: Fantastic Flight' },
      { rideName: 'Journey to the Center of the Earth' },
      { rideName: 'Indiana Jones Adventure: Temple of the Crystal Skull' },
      { rideName: 'Tower of Terror' },
      { rideName: 'Toy Story Mania!' }
    ],
    4: [
      { rideName: 'Star Wars Hyperspace Mountain' },
      { rideName: 'Big Thunder Mountain' },
      { rideName: 'Ratatouille: The Adventure' },
      { rideName: 'Peter Pan\'s Flight' },
      { rideName: 'Crush\'s Coaster' }
    ],
    28: [
      { rideName: 'Spider-Man W.E.B. Adventure' },
      { rideName: 'The Twilight Zone Tower of Terror' },
      { rideName: 'Crush\'s Coaster' },
      { rideName: 'RC Racer' },
      { rideName: 'Ratatouille: The Adventure' }
    ]
  };

  var loading = waitsRoot.querySelector('.waits-loading');
  var rows = waitsRoot.querySelector('.waits-rows');
  var error = waitsRoot.querySelector('.waits-error');
  var apiUrl =
    (MAGICPULSE_API_BASE ? MAGICPULSE_API_BASE.replace(/\/$/, '') : '') +
    '/api/parks/public/' +
    MAGICPULSE_PARK_ID +
    '/snapshot';

  var liveFetchInFlight = false;

  function themeParksLiveUrl(entityId) {
    return THEMEPARKS_WIKI_LIVE_BASE + '/' + encodeURIComponent(entityId) + '/live';
  }

  function isProbablyNotARide(name) {
    var n = String(name || '').toLowerCase();
    var bad = [
      'meet ',
      'character',
      'dining',
      'restaurant',
      'table',
      'buffet',
      'cafe',
      'snack',
      'shop',
      'store',
      'photo',
      'photopass',
      'merch',
      'boutique',
      'parade',
      'fireworks',
      'show',
      'theater',
      'stage',
      'spectacular',
      'presentation',
      'tour',
      'experience',
      'exhibit',
      'gallery',
      'trail',
      'walkthrough',
      'playground',
      'play area',
      'splash',
      'splash zone',
      'transport',
      'transportation',
      'railroad',
      'train',
      'monorail',
      'bus',
      'ferry',
      'boat',
      'character dining',
      'meet and greet',
      'meet n greet'
    ];
    for (var i = 0; i < bad.length; i++) {
      if (n.indexOf(bad[i]) !== -1) return true;
    }
    return false;
  }

  /** ThemeParks Wiki `live` JSON → snapshot `rides` rows (`is_open`, `wait`, `id`, `name`). */
  function themeParksPayloadToRides(payload) {
    var items = (payload && payload.liveData) || [];
    var rides = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if ((item.entityType || '').toUpperCase() !== 'ATTRACTION') continue;
      var nm = item.name;
      if (!nm) continue;
      if (isProbablyNotARide(nm)) continue;
      var isOpen = (item.status || '').toUpperCase() === 'OPERATING';
      var q = item.queue || {};
      var standby = q.STANDBY || q.standby;
      var wait = standby && standby.waitTime != null ? standby.waitTime : null;
      rides.push({
        id: item.id || null,
        name: nm,
        wait: wait,
        is_open: isOpen
      });
    }
    return rides;
  }

  function buildSyntheticSnapshot(parkId, rides) {
    var meta = parkMetaById(parkId);
    var now = new Date();
    return {
      park: {
        id: String(parkId),
        name: meta ? meta.name : 'Park',
        icon: meta && meta.icon ? meta.icon : '',
        theme: meta ? meta.theme : ''
      },
      updated: now.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
      rides: rides
    };
  }

  function fetchThemeParksLive(parkId, budgetEndTs) {
    var meta = parkMetaById(parkId);
    if (!meta || !meta.entityId) {
      return Promise.reject(new Error('Unknown park'));
    }
    var msLeft =
      typeof budgetEndTs === 'number' ? budgetEndTs - Date.now() : LIVE_FETCH_TIMEOUT_MS;
    if (msLeft < 200) {
      return Promise.reject(new Error('Snapshot time budget exceeded'));
    }
    var timeoutMs = Math.min(LIVE_FETCH_TIMEOUT_MS, Math.max(400, msLeft - 80));
    var controller = new AbortController();
    var timerId = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    return fetch(themeParksLiveUrl(meta.entityId), {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('ThemeParks Wiki request failed');
        return res.json();
      })
      .finally(function () {
        window.clearTimeout(timerId);
      });
  }

  function resolveThemeParksWithFallback(primaryParkId) {
    var budgetEnd = Date.now() + LIVE_SNAPSHOT_BUDGET_MS;
    var order = buildFallbackParkOrder(primaryParkId, { parkStatuses: [] });
    var chain = Promise.resolve(null);

    order.forEach(function (candidateParkId) {
      chain = chain.then(function (resolved) {
        if (resolved) return resolved;
        return fetchThemeParksLive(candidateParkId, budgetEnd)
          .then(function (payload) {
            var rides = themeParksPayloadToRides(payload);
            if (!rides.length) return null;
            var snapshot = buildSyntheticSnapshot(candidateParkId, rides);
            var items = selectSnapshotRides(snapshot.rides, candidateParkId);
            if (items.length > 0) {
              return { snapshot: snapshot, selectedParkId: candidateParkId };
            }
            return null;
          })
          .catch(function () {
            return null;
          });
      });
    });

    return chain.then(function (resolved) {
      return resolved || { snapshot: null, selectedParkId: primaryParkId };
    });
  }

  function apiSnapshotUrl(parkId) {
    return (
      (MAGICPULSE_API_BASE ? MAGICPULSE_API_BASE.replace(/\/$/, '') : '') +
      '/api/parks/public/' +
      parkId +
      '/snapshot'
    );
  }

  function getFetchErrorMessage(err) {
    var msg = err && err.message ? err.message : '';
    if (err && (err.name === 'AbortError' || msg === 'Snapshot time budget exceeded')) {
      return 'Live data took too long. Showing example rides.';
    }
    if (msg.indexOf('fetch') !== -1 || msg === 'Failed to fetch') {
      if (!SNAPSHOT_SOURCE_MAGICPULSE) {
        return 'Could not reach ThemeParks Wiki (api.themeparks.wiki). Try again in a moment.';
      }
      var apiIsHttp = apiUrl.indexOf('http://') === 0;
      var pageIsHttps = typeof location !== 'undefined' && location.protocol === 'https:';
      if (pageIsHttps && apiIsHttp) {
        return 'API unreachable (HTTPS page cannot call HTTP API). Use HTTPS for the API or a same-origin proxy.';
      }
      return 'Could not reach the API. Check that it’s running and reachable, and that CORS is enabled.';
    }
    return msg || 'Could not load live wait times.';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function normalizedRideName(name) {
    return String(name || '').toLowerCase().trim();
  }

  function configuredPopularRides() {
    if (Array.isArray(window.MAGICPULSE_POPULAR_RIDES) && window.MAGICPULSE_POPULAR_RIDES.length) {
      return window.MAGICPULSE_POPULAR_RIDES.map(function (item) {
        if (typeof item === 'string') {
          return { rideId: item, rideName: item };
        }
        return item || {};
      });
    }
    return DEFAULT_POPULAR_RIDES_BY_PARK[MAGICPULSE_PARK_ID] || [];
  }

  function configuredPopularRidesForPark(parkId) {
    if (Array.isArray(window.MAGICPULSE_POPULAR_RIDES) && window.MAGICPULSE_POPULAR_RIDES.length) {
      return configuredPopularRides();
    }
    return DEFAULT_POPULAR_RIDES_BY_PARK[parkId] || [];
  }

  function selectSnapshotRides(snapshotRides, parkId) {
    var openRides = snapshotRides.filter(function (ride) {
      return ride.is_open && ride.wait != null;
    });

    var selected = [];
    var selectedKeys = {};
    configuredPopularRidesForPark(parkId).forEach(function (target) {
      if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
      var match = openRides.find(function (ride) {
        if (target.rideId && typeof ride.id === 'string' && ride.id === target.rideId) {
          return true;
        }
        if (target.rideName && normalizedRideName(ride.name) === normalizedRideName(target.rideName)) {
          return true;
        }
        return false;
      });
      if (!match) return;
      var key = typeof match.id === 'string' && match.id ? match.id : match.name;
      if (selectedKeys[key]) return;
      selectedKeys[key] = true;
      selected.push(match);
    });

    openRides
      .slice()
      .sort(function (a, b) {
        return (a.wait || 0) - (b.wait || 0);
      })
      .forEach(function (ride) {
        if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
        var key = typeof ride.id === 'string' && ride.id ? ride.id : ride.name;
        if (selectedKeys[key]) return;
        selectedKeys[key] = true;
        selected.push(ride);
      });

    return selected.slice(0, SNAPSHOT_RIDE_COUNT).map(function (ride) {
      return {
        rideId: typeof ride.id === 'string' && ride.id ? ride.id : null,
        name: ride.name,
        waitTime: ride.wait
      };
    });
  }

  function parkMetaById(parkId) {
    return PARKS.find(function (park) {
      return park.id === parkId;
    }) || null;
  }

  function parkMetaFromSnapshot(snapshot) {
    if (!snapshot || !snapshot.park) return null;
    var id = snapshot.park.id != null ? parseInt(String(snapshot.park.id), 10) : NaN;
    if (!Number.isNaN(id)) {
      var byId = parkMetaById(id);
      if (byId) return byId;
    }
    return (
      PARKS.find(function (park) {
        return (
          (snapshot.park.theme && park.theme === snapshot.park.theme) ||
          (snapshot.park.name && park.name === snapshot.park.name)
        );
      }) || null
    );
  }

  function buildSameResortCandidateIds(snapshot, selectedParkId) {
    var selectedMeta = parkMetaById(selectedParkId);
    if (!selectedMeta || !snapshot || !Array.isArray(snapshot.parkStatuses)) return [];

    var openStatuses = snapshot.parkStatuses.filter(function (status) {
      return status && status.status === 'OPEN';
    });

    return openStatuses
      .map(function (status) {
        var match = PARKS.find(function (park) {
          return (
            park.resort === selectedMeta.resort &&
            ((status.theme && park.theme === status.theme) || (status.name && park.name === status.name))
          );
        });
        return match ? match.id : null;
      })
      .filter(function (id) {
        return id != null && id !== selectedParkId;
      });
  }

  function buildFallbackParkOrder(primaryParkId, primarySnapshot) {
    var selectedMeta = parkMetaById(primaryParkId);
    var ordered = [];
    var seen = {};

    function pushParkId(parkId) {
      if (parkId == null || seen[parkId]) return;
      seen[parkId] = true;
      ordered.push(parkId);
    }

    pushParkId(primaryParkId);

    buildSameResortCandidateIds(primarySnapshot, primaryParkId).forEach(pushParkId);

    if (selectedMeta) {
      PARKS.filter(function (park) {
        return park.resort === selectedMeta.resort && park.id !== primaryParkId;
      }).forEach(function (park) {
        pushParkId(park.id);
      });
    }

    var resortOrder = ['WDW', 'DLR', 'TDR', 'DLP'];
    resortOrder.forEach(function (resort) {
      if (selectedMeta && resort === selectedMeta.resort) return;
      PARKS.filter(function (park) {
        return park.resort === resort;
      }).forEach(function (park) {
        pushParkId(park.id);
      });
    });

    return ordered;
  }

  function isSnapshotUsable(snapshot) {
    return snapshot && Array.isArray(snapshot.rides) && snapshot.rides.length > 0;
  }

  function isSnapshotOpen(snapshot) {
    return !!(snapshot && snapshot.parkHours && snapshot.parkHours.status === 'OPEN');
  }

  function fetchSnapshotForPark(parkId, budgetEndTs) {
    var opts = { method: 'GET' };
    if (MAGICPULSE_API_TOKEN) {
      opts.headers = { Authorization: 'Bearer ' + MAGICPULSE_API_TOKEN };
    }
    var msLeft =
      typeof budgetEndTs === 'number' ? budgetEndTs - Date.now() : LIVE_FETCH_TIMEOUT_MS;
    if (msLeft < 200) {
      return Promise.reject(new Error('Snapshot time budget exceeded'));
    }
    var timeoutMs = Math.min(LIVE_FETCH_TIMEOUT_MS, Math.max(400, msLeft - 80));
    var controller = new AbortController();
    var timerId = window.setTimeout(function () {
      controller.abort();
    }, timeoutMs);
    opts.signal = controller.signal;

    return fetch(apiSnapshotUrl(parkId), opts)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status === 401 ? 'API token required' : 'Request failed');
        return res.json();
      })
      .then(function (payload) {
        return payload && payload.snapshot ? payload.snapshot : null;
      })
      .finally(function () {
        window.clearTimeout(timerId);
      });
  }

  function resolveSnapshotWithFallback(primaryParkId) {
    var budgetEnd = Date.now() + LIVE_SNAPSHOT_BUDGET_MS;
    return fetchSnapshotForPark(primaryParkId, budgetEnd).then(function (primarySnapshot) {
      if (!isSnapshotUsable(primarySnapshot)) {
        return { snapshot: primarySnapshot, selectedParkId: primaryParkId };
      }
      if (isSnapshotOpen(primarySnapshot)) {
        return { snapshot: primarySnapshot, selectedParkId: primaryParkId };
      }

      var candidateIds = buildFallbackParkOrder(primaryParkId, primarySnapshot).slice(1);
      var chain = Promise.resolve(null);

      candidateIds.forEach(function (candidateParkId) {
        chain = chain.then(function (resolved) {
          if (resolved) return resolved;
          return fetchSnapshotForPark(candidateParkId, budgetEnd)
            .then(function (candidateSnapshot) {
              if (isSnapshotUsable(candidateSnapshot) && isSnapshotOpen(candidateSnapshot)) {
                return { snapshot: candidateSnapshot, selectedParkId: candidateParkId };
              }
              return null;
            })
            .catch(function () {
              return null;
            });
        });
      });

      return chain.then(function (resolved) {
        return resolved || { snapshot: primarySnapshot, selectedParkId: primaryParkId };
      });
    });
  }

  function setPanelMeta(snapshot) {
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (parkEl && snapshot && snapshot.park && snapshot.park.name) {
      var icon = snapshot.park.icon ? snapshot.park.icon + ' ' : '';
      parkEl.textContent = icon + snapshot.park.name;
    }
    if (updatedEl && snapshot && snapshot.updated) {
      updatedEl.textContent = 'Updated ' + snapshot.updated;
    } else if (updatedEl) {
      updatedEl.textContent = 'Updated just now';
    }
  }

  function waitValueClass(waitTime) {
    if (waitTime == null) return '';
    if (waitTime < 20) return ' value--low';
    if (waitTime <= 45) return ' value--med';
    return ' value--high';
  }

  var HERO_STATIC_FALLBACK_RIDES = [
    { name: 'Seven Dwarfs Mine Train' },
    { name: 'Space Mountain' },
    { name: 'TRON Lightcycle / Run' },
    { name: "Peter Pan's Flight" }
  ];

  function clearHeroFallbackState() {
    waitsRoot.classList.remove('live-waits--fallback');
    var note = document.getElementById('live-waits-fallback-note');
    if (note) note.hidden = true;
    var badge = document.getElementById('live-badge');
    if (badge) {
      badge.classList.remove('live-badge--demo');
      badge.innerHTML = '<span class="live-dot" aria-hidden="true"></span>Live';
    }
  }

  function renderHeroStaticFallback() {
    if (!rows) return;
    var list = HERO_STATIC_FALLBACK_RIDES.map(function (r) {
      return { name: r.name, waitTime: null, rideId: null };
    });
    render(list);
    waitsRoot.classList.add('live-waits--fallback');
    var badge = document.getElementById('live-badge');
    if (badge) {
      badge.classList.add('live-badge--demo');
      badge.innerHTML = '<span class="live-dot live-dot--muted" aria-hidden="true"></span>Example';
    }
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (parkEl) parkEl.textContent = 'Magic Kingdom (example)';
    if (updatedEl) updatedEl.textContent = 'Illustrative sample';
    var note = document.getElementById('live-waits-fallback-note');
    if (note) note.hidden = false;
    if (loading) loading.hidden = true;
    if (error) {
      error.textContent = '';
      error.hidden = true;
    }
    waitsRoot.setAttribute('aria-busy', 'false');
  }

  function render(list) {
    if (!rows) return;
    rows.innerHTML = list
      .map(function (item, idx) {
        var wait = item.waitTime != null ? item.waitTime + ' min' : '—';
        var rideAttrs = item.rideId ? ' data-ride-id="' + escapeHtml(item.rideId) + '"' : '';
        var valueClass = 'value' + waitValueClass(item.waitTime);
        // Top-3 get a hero treatment with a rank chip; rest are compact.
        // Mirrors the `heroRideRow` / `compactRideRow` split used by the
        // iOS share cards so the website hero feels like an app screenshot.
        var isHero = idx < 3;
        var rowClass = 'waits-row' + (isHero ? ' is-hero' : '');
        var rankChip = isHero
          ? '<span class="rank" aria-hidden="true">' + (idx + 1) + '</span>'
          : '';
        return (
          '<div class="' +
          rowClass +
          '"' +
          rideAttrs +
          '>' +
          rankChip +
          '<span class="name">' +
          escapeHtml(item.name) +
          '</span><span class="' +
          valueClass +
          '">' +
          wait +
          '</span></div>'
        );
      })
      .join('');
    rows.hidden = false;
  }

  function showError(message, isRefresh) {
    if (isRefresh) return;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Magic Pulse]', message || 'Live wait snapshot failed');
    }
    renderHeroStaticFallback();
  }

  function applyLiveResult(result, options) {
    var isRefresh = options && options.refresh;
    var snapshot = result && result.snapshot;
    if (!snapshot || !Array.isArray(snapshot.rides)) {
      showError('Live data unavailable right now.', isRefresh);
      return;
    }
    var selectedParkId = result && result.selectedParkId ? result.selectedParkId : MAGICPULSE_PARK_ID;
    var selectedParkMeta = parkMetaFromSnapshot(snapshot);
    if (selectedParkMeta) {
      selectedParkId = selectedParkMeta.id;
    }
    var items = selectSnapshotRides(snapshot.rides, selectedParkId);

    if (!items.length) {
      showError('Live data unavailable right now.', isRefresh);
      return;
    }

    clearHeroFallbackState();

    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    render(items);
    setPanelMeta(snapshot);
    waitsRoot.setAttribute('aria-busy', 'false');
    waitsRoot.classList.remove('is-refreshing');
  }

  function loadLiveWaits(options) {
    var isRefresh = options && options.refresh;
    if (isRefresh && document.visibilityState !== 'visible') {
      return Promise.resolve();
    }
    if (liveFetchInFlight) return Promise.resolve();
    liveFetchInFlight = true;
    if (isRefresh) waitsRoot.classList.add('is-refreshing');

    function isUsableResult(result) {
      return !!(result && result.snapshot && Array.isArray(result.snapshot.rides) && result.snapshot.rides.length);
    }

    var loadChain;
    if (SNAPSHOT_SOURCE_MAGICPULSE) {
      // Primary: MagicPulse API. If it's unreachable or returns nothing usable
      // (e.g. local API not running), transparently fall back to ThemeParks Wiki
      // so the hero panel still has live data.
      loadChain = resolveSnapshotWithFallback(MAGICPULSE_PARK_ID)
        .then(function (result) {
          if (isUsableResult(result)) return result;
          return resolveThemeParksWithFallback(MAGICPULSE_PARK_ID);
        })
        .catch(function () {
          return resolveThemeParksWithFallback(MAGICPULSE_PARK_ID);
        });
    } else {
      loadChain = resolveThemeParksWithFallback(MAGICPULSE_PARK_ID);
    }

    return loadChain
      .then(function (result) {
        applyLiveResult(result, options);
      })
      .catch(function (err) {
        if (!isRefresh) showError(getFetchErrorMessage(err), false);
        waitsRoot.classList.remove('is-refreshing');
      })
      .finally(function () {
        liveFetchInFlight = false;
        waitsRoot.classList.remove('is-refreshing');
      });
  }

  loadLiveWaits({ refresh: false });

  window.setInterval(function () {
    loadLiveWaits({ refresh: true });
  }, LIVE_REFRESH_MS);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      loadLiveWaits({ refresh: true });
    }
  });
})();
