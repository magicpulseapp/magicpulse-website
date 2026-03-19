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

  var loading = waitsRoot.querySelector('.waits-loading');
  var rows = waitsRoot.querySelector('.waits-rows');
  var error = waitsRoot.querySelector('.waits-error');
  var apiUrl =
    (MAGICPULSE_API_BASE ? MAGICPULSE_API_BASE.replace(/\/$/, '') : '') +
    '/api/parks/public/' +
    MAGICPULSE_PARK_ID +
    '/snapshot';

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
        return '<div class="waits-row"><span>' + escapeHtml(item.name) + '</span><span class="value">' + wait + '</span></div>';
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

  var fetchOpts = { method: 'GET' };
  if (MAGICPULSE_API_TOKEN) {
    fetchOpts.headers = { Authorization: 'Bearer ' + MAGICPULSE_API_TOKEN };
  }

  fetch(apiUrl, fetchOpts)
    .then(function (res) {
      if (!res.ok) throw new Error(res.status === 401 ? 'API token required' : 'Request failed');
      return res.json();
    })
    .then(function (payload) {
      var snapshot = payload.snapshot;
      if (!snapshot || !Array.isArray(snapshot.rides)) {
        showError('Live data unavailable right now.');
        return;
      }
      var items = snapshot.rides
        .filter(function (ride) {
          return ride.is_open && ride.wait != null;
        })
        .sort(function (a, b) {
          return (a.wait || 0) - (b.wait || 0);
        })
        .slice(0, 6)
        .map(function (ride) {
          return { name: ride.name, waitTime: ride.wait };
        });

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
