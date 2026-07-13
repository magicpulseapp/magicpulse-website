(function () {
  document.documentElement.classList.add('js');

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
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // One-shot: once revealed, stop observing so the callback isn't
            // re-invoked on every subsequent scroll.
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    document.querySelectorAll('.reveal, .section, .section-alt').forEach(function (el) {
      revealObserver.observe(el);
    });

    window.setTimeout(revealAllNow, 4000);
  }

  var menuBtn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-navigation') || document.querySelector('.site-nav');

  if (menuBtn && nav) {
    var mobileNavQuery = window.matchMedia('(max-width: 900px)');
    menuBtn.setAttribute('aria-controls', 'site-navigation');
    menuBtn.setAttribute('aria-expanded', 'false');

    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
    var lastFocusedBeforeMenu = null;

    function menuIsOpen() {
      return nav.classList.contains('is-open');
    }

    function syncNavigationAccessibility() {
      if (mobileNavQuery.matches) {
        var isHidden = !menuIsOpen();
        nav.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
        nav.inert = isHidden;
        return;
      }

      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      nav.removeAttribute('aria-hidden');
      nav.inert = false;
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
    }

    function visibleFocusableMenuItems() {
      return [menuBtn].concat(
        navLinks.filter(function (item) {
          var style = window.getComputedStyle(item);
          return style.visibility !== 'hidden' && style.display !== 'none';
        })
      );
    }

    function closeMenu(options) {
      var shouldRestoreFocus = !options || options.restoreFocus !== false;
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
      syncNavigationAccessibility();
      if (shouldRestoreFocus && lastFocusedBeforeMenu && document.contains(lastFocusedBeforeMenu)) {
        lastFocusedBeforeMenu.focus();
      }
    }

    function openMenu() {
      lastFocusedBeforeMenu = document.activeElement;
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close menu');
      nav.setAttribute('aria-hidden', 'false');
      nav.inert = false;
      menuBtn.focus();
    }

    menuBtn.addEventListener('click', function () {
      if (menuIsOpen()) closeMenu({ restoreFocus: false });
      else openMenu();
    });

    overlay.addEventListener('click', closeMenu);

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu({ restoreFocus: false });
      });
    });

    if (typeof mobileNavQuery.addEventListener === 'function') {
      mobileNavQuery.addEventListener('change', syncNavigationAccessibility);
    } else if (typeof mobileNavQuery.addListener === 'function') {
      mobileNavQuery.addListener(syncNavigationAccessibility);
    }
    syncNavigationAccessibility();

    document.addEventListener('keydown', function (event) {
      if (!menuIsOpen()) return;
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;

      var focusable = visibleFocusableMenuItems();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === first && focusable.length > 1) {
        event.preventDefault();
        focusable[1].focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (focusable.indexOf(document.activeElement) === -1) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  // One rAF-throttled scroll handler shared by header-elevation + sticky CTA bar.
  // Native scroll fires up to once per frame on macOS/iOS, so the unthrottled
  // version was running getBoundingClientRect on every wheel tick.
  (function () {
    var header = document.querySelector('.site-header');
    var ctaBar = document.getElementById('mobile-cta-bar');
    var downloadSection = document.getElementById('download');
    if (!header && !ctaBar) return;

    var ctaLink = ctaBar && ctaBar.querySelector('a');
    var ctaShown = false;
    var headerElevated = false;
    var ticking = false;

    function update() {
      ticking = false;
      var scrollY = window.scrollY || window.pageYOffset;

      if (header) {
        var shouldElevate = scrollY > 8;
        if (shouldElevate !== headerElevated) {
          headerElevated = shouldElevate;
          header.classList.toggle('is-scrolled', headerElevated);
        }
      }

      if (ctaBar) {
        var heroHeight = 320;
        var nearBottom = false;
        if (downloadSection) {
          var rect = downloadSection.getBoundingClientRect();
          nearBottom = rect.top < window.innerHeight * 0.85;
        }
        var shouldShow = scrollY > heroHeight && !nearBottom;

        if (shouldShow && !ctaShown) {
          ctaShown = true;
          ctaBar.classList.add('is-visible');
          ctaBar.removeAttribute('aria-hidden');
          if (ctaLink) ctaLink.removeAttribute('tabindex');
          document.body.classList.add('has-mobile-cta');
        } else if (!shouldShow && ctaShown) {
          ctaShown = false;
          ctaBar.classList.remove('is-visible');
          ctaBar.setAttribute('aria-hidden', 'true');
          if (ctaLink) ctaLink.setAttribute('tabindex', '-1');
          document.body.classList.remove('has-mobile-cta');
        }
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }());

  (function () {
    var form = document.getElementById('support-form');
    var status = document.getElementById('form-status');
    if (!form || !status) return;

    var SUPPORT_FORM_ENDPOINT = 'https://formspree.io/f/xjgeljqp';
    var submit = form.querySelector('button[type="submit"]');
    if (!submit) return;

    var requestedTopic = new URLSearchParams(window.location.search).get('topic');
    var topicSelect = form.querySelector('#topic');
    if (
      requestedTopic &&
      topicSelect &&
      Array.prototype.some.call(topicSelect.options, function (option) {
        return option.value === requestedTopic;
      })
    ) {
      topicSelect.value = requestedTopic;
    }

    function formEndpointIsAllowed() {
      try {
        var endpoint = new URL(form.action, window.location.href);
        return endpoint.origin === 'https://formspree.io' && endpoint.pathname === '/f/xjgeljqp';
      } catch (err) {
        return false;
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Sending...';
      status.hidden = true;
      status.className = 'form-status';

      if (!formEndpointIsAllowed()) {
        status.textContent = 'Unable to send right now. Please reload the page and try again.';
        status.className = 'form-status form-status--error';
        status.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Send message';
        return;
      }

      fetch(SUPPORT_FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('failed');
          status.textContent = 'Thanks - your message has been sent. We will get back to you soon.';
          status.className = 'form-status form-status--success';
          form.reset();
        })
        .catch(function () {
          status.textContent =
            'Unable to send right now. Please try again in a moment, use a different network, or open the Privacy Policy and use any alternate contact instructions there.';
          status.className = 'form-status form-status--error';
        })
        .finally(function () {
          status.hidden = false;
          submit.disabled = false;
          submit.textContent = 'Send message';
        });
    });
  }());

  var waitsRoot = document.getElementById('live-waits');
  if (!waitsRoot) return;

  var MAGICPULSE_API_BASE =
    typeof window.MAGICPULSE_API_BASE === 'string' ? window.MAGICPULSE_API_BASE : 'https://api.magicpulse.app';
  var MAGICPULSE_SNAPSHOT_SOURCE =
    typeof window.MAGICPULSE_SNAPSHOT_SOURCE === 'string' ? window.MAGICPULSE_SNAPSHOT_SOURCE : 'magicpulse';
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
      : 4500;

  var LIVE_SNAPSHOT_BUDGET_MS =
    typeof window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS === 'number' && !Number.isNaN(window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS)
      ? Math.max(4000, Math.min(120000, window.MAGICPULSE_LIVE_SNAPSHOT_BUDGET_MS))
      : 8000;

  /** Default hero data: ThemeParks Wiki public API (same source labels as the iOS app). */
  var THEMEPARKS_WIKI_LIVE_BASE = 'https://api.themeparks.wiki/v1/entity';
  var SNAPSHOT_SOURCE_MAGICPULSE =
    MAGICPULSE_SNAPSHOT_SOURCE === 'magicpulse' &&
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
    '/api/parks/public/featured/snapshot';

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
      updatedISO: now.toISOString(),
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

  function resolveThemeParksSnapshot(parkId, budgetEnd) {
    return fetchThemeParksLive(parkId, budgetEnd).then(function (payload) {
      var rides = themeParksPayloadToRides(payload);
      if (!rides.length) return { snapshot: null, selectedParkId: parkId, source: 'themeparks' };
      return {
        snapshot: buildSyntheticSnapshot(parkId, rides),
        selectedParkId: parkId,
        source: 'themeparks'
      };
    });
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

  function isSnapshotUsable(snapshot) {
    return snapshot && Array.isArray(snapshot.rides) && snapshot.rides.length > 0;
  }

  function fetchFeaturedSnapshot(budgetEndTs) {
    var opts = { method: 'GET' };
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

    return fetch(apiUrl, opts)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status === 401 ? 'API token required' : 'Request failed');
        return res.json();
      })
      .then(function (payload) {
        if (!payload || !payload.snapshot) return null;
        var selectedParkId = parseInt(String(payload.selectedParkId || payload.snapshot.park.id), 10);
        return {
          snapshot: payload.snapshot,
          selectedParkId: Number.isNaN(selectedParkId) ? MAGICPULSE_PARK_ID : selectedParkId,
          source: 'magicpulse'
        };
      })
      .finally(function () {
        window.clearTimeout(timerId);
      });
  }

  function resolveSnapshot(primaryParkId) {
    var budgetEnd = Date.now() + LIVE_SNAPSHOT_BUDGET_MS;
    if (!SNAPSHOT_SOURCE_MAGICPULSE) {
      return resolveThemeParksSnapshot(primaryParkId, budgetEnd);
    }

    return fetchFeaturedSnapshot(budgetEnd)
      .then(function (result) {
        if (result && isSnapshotUsable(result.snapshot)) {
          return result;
        }
        return resolveThemeParksSnapshot(primaryParkId, budgetEnd);
      })
      .catch(function () {
        return resolveThemeParksSnapshot(primaryParkId, budgetEnd);
      });
  }

  function snapshotTimestamp(snapshot) {
    var parsed = snapshot && snapshot.updatedISO ? Date.parse(snapshot.updatedISO) : NaN;
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }

  function formatAge(timestamp) {
    var minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 min ago';
    return minutes + ' min ago';
  }

  function snapshotReportsStale(snapshot) {
    return !!(
      snapshot &&
      snapshot.status &&
      snapshot.status.rides &&
      snapshot.status.rides.isStale
    );
  }

  function setPanelMeta(snapshot, timestamp) {
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (parkEl && snapshot && snapshot.park && snapshot.park.name) {
      var icon = snapshot.park.icon ? snapshot.park.icon + ' ' : '';
      parkEl.textContent = icon + snapshot.park.name;
    }
    if (updatedEl) updatedEl.textContent = 'Updated ' + formatAge(timestamp);
  }

  function waitValueClass(waitTime) {
    if (waitTime == null) return '';
    if (waitTime < 20) return ' value--low';
    if (waitTime <= 45) return ' value--med';
    return ' value--high';
  }

  function setLiveBadge(label, state) {
    var badge = document.getElementById('live-badge');
    if (!badge) return;
    badge.classList.toggle('live-badge--demo', state === 'demo');
    badge.classList.toggle('live-badge--stale', state === 'stale');
    badge.textContent = '';
    var dot = document.createElement('span');
    dot.className = state === 'live' ? 'live-dot' : 'live-dot live-dot--muted';
    dot.setAttribute('aria-hidden', 'true');
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode(label));
  }

  var HERO_STATIC_FALLBACK_RIDES = [
    { name: 'Seven Dwarfs Mine Train' },
    { name: 'Space Mountain' },
    { name: 'TRON Lightcycle / Run' },
    { name: "Peter Pan's Flight" }
  ];
  var lastSuccessfulSnapshotAt = null;
  var insights = document.getElementById('live-insights');
  var bestMove = document.getElementById('live-best-move');
  var dataSignal = document.getElementById('live-data-signal');

  function updateInsights(items, snapshot, timestamp, source) {
    if (insights) insights.hidden = false;
    var lowest = items.reduce(function (best, item) {
      if (item.waitTime == null) return best;
      return !best || item.waitTime < best.waitTime ? item : best;
    }, null);
    if (bestMove) {
      bestMove.textContent = lowest ? lowest.name + ' · ' + lowest.waitTime + ' min' : 'No posted waits';
    }
    if (dataSignal) {
      var sourceLabel = source === 'themeparks' ? 'ThemeParks Wiki' : 'Magic Pulse';
      dataSignal.textContent = snapshotReportsStale(snapshot)
        ? 'Source reports delayed data'
        : sourceLabel + ' · ' + formatAge(timestamp);
    }
  }

  function markLiveDataStale() {
    waitsRoot.classList.add('live-waits--stale');
    setLiveBadge('Delayed', 'stale');
    var updatedEl = document.getElementById('live-updated');
    if (updatedEl) {
      updatedEl.textContent = lastSuccessfulSnapshotAt
        ? 'Last update ' + formatAge(lastSuccessfulSnapshotAt)
        : 'Live update unavailable';
    }
    if (dataSignal) dataSignal.textContent = 'Refresh delayed';
  }

  function clearHeroFallbackState() {
    waitsRoot.classList.remove('live-waits--fallback');
    waitsRoot.classList.remove('live-waits--stale');
    var note = document.getElementById('live-waits-fallback-note');
    if (note) note.hidden = true;
    if (insights) insights.hidden = false;
  }

  function renderHeroStaticFallback() {
    if (!rows) return;
    var list = HERO_STATIC_FALLBACK_RIDES.map(function (r) {
      return { name: r.name, waitTime: null, rideId: null };
    });
    render(list);
    waitsRoot.classList.add('live-waits--fallback');
    waitsRoot.classList.remove('live-waits--stale');
    setLiveBadge('Example', 'demo');
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (parkEl) parkEl.textContent = 'Magic Kingdom (example)';
    if (updatedEl) updatedEl.textContent = 'Illustrative sample';
    var note = document.getElementById('live-waits-fallback-note');
    if (note) note.hidden = false;
    if (insights) insights.hidden = true;
    if (loading) loading.hidden = true;
    if (error) {
      error.textContent = '';
      error.hidden = true;
    }
    waitsRoot.setAttribute('aria-busy', 'false');
  }

  function render(list) {
    if (!rows) return;
    rows.textContent = '';
    list.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'waits-row is-hero';
      if (item.rideId) row.setAttribute('data-ride-id', item.rideId);

      var rank = document.createElement('span');
      rank.className = 'rank';
      rank.setAttribute('aria-hidden', 'true');
      rank.textContent = String(idx + 1);

      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name || '';

      var value = document.createElement('span');
      value.className = 'value' + waitValueClass(item.waitTime);
      value.textContent = item.waitTime != null ? item.waitTime + ' min' : '-';

      row.appendChild(rank);
      row.appendChild(name);
      row.appendChild(value);
      rows.appendChild(row);
    });
    rows.hidden = false;
  }

  function showError(message, isRefresh) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Magic Pulse]', message || 'Live wait snapshot failed');
    }
    if (isRefresh && rows && rows.children.length) {
      markLiveDataStale();
      return;
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
    lastSuccessfulSnapshotAt = snapshotTimestamp(snapshot);
    var isStale = snapshotReportsStale(snapshot);
    setLiveBadge(isStale ? 'Delayed' : 'Live', isStale ? 'stale' : 'live');
    if (isStale) waitsRoot.classList.add('live-waits--stale');
    setPanelMeta(snapshot, lastSuccessfulSnapshotAt);
    updateInsights(items, snapshot, lastSuccessfulSnapshotAt, result.source);
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
    waitsRoot.setAttribute('aria-busy', 'true');
    if (isRefresh) waitsRoot.classList.add('is-refreshing');

    return resolveSnapshot(MAGICPULSE_PARK_ID)
      .then(function (result) {
        applyLiveResult(result, options);
      })
      .catch(function (err) {
        showError(getFetchErrorMessage(err), isRefresh);
        waitsRoot.classList.remove('is-refreshing');
      })
      .finally(function () {
        liveFetchInFlight = false;
        waitsRoot.setAttribute('aria-busy', 'false');
        waitsRoot.classList.remove('is-refreshing');
      });
  }

  loadLiveWaits({ refresh: false });

  // Only poll while the tab is in view — saves battery and trims a 3 min/tab
  // baseline of API calls from inactive background pages.
  var refreshTimerId = null;

  function startRefreshTimer() {
    if (refreshTimerId != null) return;
    refreshTimerId = window.setInterval(function () {
      loadLiveWaits({ refresh: true });
    }, LIVE_REFRESH_MS);
  }

  function stopRefreshTimer() {
    if (refreshTimerId == null) return;
    window.clearInterval(refreshTimerId);
    refreshTimerId = null;
  }

  if (document.visibilityState === 'visible') startRefreshTimer();

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      loadLiveWaits({ refresh: true });
      startRefreshTimer();
    } else {
      stopRefreshTimer();
    }
  });
})();
