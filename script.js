(function () {
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

  var loading = waitsRoot.querySelector('.waits-loading');
  var rows = waitsRoot.querySelector('.waits-rows');
  var error = waitsRoot.querySelector('.waits-error');
  var apiUrl = 'https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
    if (error) {
      error.textContent = message || 'Could not load live wait times.';
      error.hidden = false;
    }
  }

  fetch(apiUrl)
    .then(function (res) {
      if (!res.ok) throw new Error('Request failed');
      return res.json();
    })
    .then(function (payload) {
      var items = (payload.liveData || [])
        .filter(function (entry) {
          return (
            entry.entityType === 'ATTRACTION' &&
            entry.status === 'OPERATING' &&
            entry.queue &&
            entry.queue.STANDBY &&
            typeof entry.queue.STANDBY.waitTime === 'number'
          );
        })
        .map(function (entry) {
          return { name: entry.name, waitTime: entry.queue.STANDBY.waitTime };
        })
        .sort(function (a, b) {
          return a.waitTime - b.waitTime;
        })
        .slice(0, 6);

      if (!items.length) {
        showError('Live data unavailable right now.');
        return;
      }

      if (loading) loading.hidden = true;
      if (error) error.hidden = true;
      render(items);
    })
    .catch(function () {
      showError('Live data unavailable right now.');
    });
})();
