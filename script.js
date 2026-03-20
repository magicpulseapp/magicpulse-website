(function () {
  // Scroll reveal: add .revealed when elements enter viewport
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

  var menuBtn = document.querySelector('.menu-btn') || document.querySelector('.menu-toggle');
  var nav = document.querySelector('.site-nav') || document.querySelector('.nav');

  if (menuBtn && nav) {
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);

    function closeMenu() {
      nav.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      menuBtn.setAttribute('aria-label', 'Open menu');
    }

    function openMenu() {
      nav.classList.add('is-open');
      document.body.classList.add('nav-open');
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

  var waitsRoot = document.getElementById('live-waits');
  if (!waitsRoot) return;

  // MagicPulseAPI — ride data from GET /api/parks/public/:parkId/snapshot (see MagicPulseAPI/src/routes/parks.ts)
  // Set window.MAGICPULSE_API_BASE before this script: '' = same origin (site served from API), or full HTTPS URL for GitHub Pages.
  var MAGICPULSE_API_BASE =
    typeof window.MAGICPULSE_API_BASE === 'string' ? window.MAGICPULSE_API_BASE : '';
  var MAGICPULSE_API_TOKEN = window.MAGICPULSE_API_TOKEN || '';
  var MAGICPULSE_PARK_ID = 6;
  if (typeof window.MAGICPULSE_PARK_ID === 'number' && !Number.isNaN(window.MAGICPULSE_PARK_ID)) {
    MAGICPULSE_PARK_ID = window.MAGICPULSE_PARK_ID;
  } else if (window.MAGICPULSE_PARK_ID != null && String(window.MAGICPULSE_PARK_ID).trim() !== '') {
    var parsed = parseInt(String(window.MAGICPULSE_PARK_ID), 10);
    if (!Number.isNaN(parsed)) MAGICPULSE_PARK_ID = parsed;
  }

  var PARKS = [
    { id: 6, name: 'MK', theme: 'mk', resort: 'WDW' },
    { id: 5, name: 'EP', theme: 'epcot', resort: 'WDW' },
    { id: 7, name: 'HS', theme: 'hs', resort: 'WDW' },
    { id: 8, name: 'AK', theme: 'ak', resort: 'WDW' },
    { id: 16, name: 'DL', theme: 'dl', resort: 'DLR' },
    { id: 17, name: 'DCA', theme: 'dca', resort: 'DLR' },
    { id: 274, name: 'TDL', theme: 'tdl', resort: 'TDR' },
    { id: 275, name: 'TDS', theme: 'tds', resort: 'TDR' },
    { id: 4, name: 'DLP', theme: 'dlp', resort: 'DLP' },
    { id: 28, name: 'WDSP', theme: 'wdsp', resort: 'DLP' }
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
    if (msg.indexOf('fetch') !== -1 || msg === 'Failed to fetch') {
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
      var key = (typeof match.id === 'string' && match.id) ? match.id : match.name;
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
        var key = (typeof ride.id === 'string' && ride.id) ? ride.id : ride.name;
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
    return PARKS.find(function (park) { return park.id === parkId; }) || null;
  }

  function parkMetaFromSnapshot(snapshot) {
    if (!snapshot || !snapshot.park) return null;
    var id = snapshot.park.id != null ? parseInt(String(snapshot.park.id), 10) : NaN;
    if (!Number.isNaN(id)) {
      var byId = parkMetaById(id);
      if (byId) return byId;
    }
    return PARKS.find(function (park) {
      return (snapshot.park.theme && park.theme === snapshot.park.theme) ||
        (snapshot.park.name && park.name === snapshot.park.name);
    }) || null;
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
          return park.resort === selectedMeta.resort &&
            ((status.theme && park.theme === status.theme) || (status.name && park.name === status.name));
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

  function fetchSnapshotForPark(parkId) {
    var opts = { method: 'GET' };
    if (MAGICPULSE_API_TOKEN) {
      opts.headers = { Authorization: 'Bearer ' + MAGICPULSE_API_TOKEN };
    }
    return fetch(apiSnapshotUrl(parkId), opts)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status === 401 ? 'API token required' : 'Request failed');
        return res.json();
      })
      .then(function (payload) {
        return payload && payload.snapshot ? payload.snapshot : null;
      });
  }

  function resolveSnapshotWithFallback(primaryParkId) {
    return fetchSnapshotForPark(primaryParkId).then(function (primarySnapshot) {
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
          return fetchSnapshotForPark(candidateParkId)
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

  function render(list) {
    if (!rows) return;
    rows.innerHTML = list
      .map(function (item) {
        var wait = item.waitTime != null ? item.waitTime + ' min' : '-';
        var rideAttrs = item.rideId ? ' data-ride-id="' + escapeHtml(item.rideId) + '"' : '';
        return '<div class="waits-row"' + rideAttrs + '><span>' + escapeHtml(item.name) + '</span><span class="value">' + wait + '</span></div>';
      })
      .join('');
    rows.hidden = false;
  }

  function showError(message) {
    if (loading) loading.hidden = true;
    if (rows) {
      rows.hidden = true;
      rows.innerHTML = '';
    }
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (parkEl) parkEl.textContent = '—';
    if (updatedEl) updatedEl.textContent = '—';
    if (error) {
      error.textContent = message || 'Could not load live wait times.';
      error.hidden = false;
    }
  }

  resolveSnapshotWithFallback(MAGICPULSE_PARK_ID)
    .then(function (result) {
      var snapshot = result && result.snapshot;
      if (!snapshot || !Array.isArray(snapshot.rides)) {
        showError('Live data unavailable right now.');
        return;
      }
      var selectedParkId = result && result.selectedParkId ? result.selectedParkId : MAGICPULSE_PARK_ID;
      var selectedParkMeta = parkMetaFromSnapshot(snapshot);
      if (selectedParkMeta) {
        selectedParkId = selectedParkMeta.id;
      }
      var items = selectSnapshotRides(snapshot.rides, selectedParkId);

      if (!items.length) {
        showError('Live data unavailable right now.');
        return;
      }

      if (loading) loading.hidden = true;
      if (error) error.hidden = true;
      render(items);
      setPanelMeta(snapshot);
    })
    .catch(function (err) {
      showError(getFetchErrorMessage(err));
    });
})();
