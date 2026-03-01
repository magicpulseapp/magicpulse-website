(function () {
  var menuToggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-label', nav.classList.contains('is-open') ? 'Close menu' : 'Open menu');
    });

    // Close menu when clicking a nav link (mobile)
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
      });
    });
  }

  // Live wait times from ThemeParks Wiki API (Magic Kingdom, Orlando)
  var liveWaitsEl = document.getElementById('live-waits');
  if (liveWaitsEl) {
    var loadingEl = liveWaitsEl.querySelector('.live-waits-loading');
    var rowsEl = liveWaitsEl.querySelector('.live-waits-rows');
    var errorEl = liveWaitsEl.querySelector('.live-waits-error');
    var apiUrl = 'https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live';

    function escapeHtml(s) {
      var div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }

    function renderRows(attractions) {
      if (!attractions.length) {
        if (loadingEl) loadingEl.hidden = false;
        if (rowsEl) { rowsEl.hidden = true; rowsEl.innerHTML = ''; }
        if (errorEl) { errorEl.hidden = true; }
        return;
      }
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) errorEl.hidden = true;
      rowsEl.innerHTML = attractions.map(function (a) {
        var wait = a.waitTime != null ? a.waitTime + ' min' : '—';
        return '<span class="app-card-row"><span class="app-card-row-name">' + escapeHtml(a.name) + '</span><span class="app-card-row-value">' + wait + '</span></span>';
      }).join('');
      rowsEl.hidden = false;
    }

    function showError(msg) {
      if (loadingEl) loadingEl.hidden = true;
      if (rowsEl) { rowsEl.hidden = true; rowsEl.innerHTML = ''; }
      if (errorEl) { errorEl.textContent = msg || 'Could not load live waits.'; errorEl.hidden = false; }
    }

    fetch(apiUrl)
      .then(function (res) { if (!res.ok) throw new Error(); return res.json(); })
      .then(function (data) {
        var popularNames = ['Space Mountain', 'Big Thunder Mountain', 'Haunted Mansion', 'Splash Mountain', 'Seven Dwarfs', 'Peter Pan', 'Thunder Mountain'];
        var operating = (data.liveData || [])
          .filter(function (e) {
            return e.entityType === 'ATTRACTION' && e.status === 'OPERATING' && e.queue && e.queue.STANDBY && typeof e.queue.STANDBY.waitTime === 'number';
          })
          .map(function (e) { return { name: e.name, waitTime: e.queue.STANDBY.waitTime }; });
        var popular = operating.filter(function (a) {
          return popularNames.some(function (p) { return a.name.indexOf(p) !== -1; });
        }).sort(function (a, b) { return a.waitTime - b.waitTime; });
        var rest = operating.filter(function (a) {
          return !popularNames.some(function (p) { return a.name.indexOf(p) !== -1; });
        }).sort(function (a, b) { return a.waitTime - b.waitTime; });
        var list = popular.slice(0, 3);
        while (list.length < 3 && rest.length) list.push(rest.shift());
        renderRows(list);
      })
      .catch(function () { showError('Live data unavailable. Check back soon.'); });
  }
})();
