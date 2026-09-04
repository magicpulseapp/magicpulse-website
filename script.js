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

  var siteHostname = window.location.hostname.toLowerCase();
  var siteRunsOnWorker =
    siteHostname.endsWith('.chatgpt.site') ||
    siteHostname === 'www.magicpulse.app' ||
    siteHostname === 'magicpulse.app';
  var hasExplicitSiteApiBase = typeof window.MAGICPULSE_SITE_API_BASE === 'string';
  var MAGICPULSE_SITE_API_BASE =
    hasExplicitSiteApiBase
      ? window.MAGICPULSE_SITE_API_BASE.replace(/\/$/, '')
      : (siteRunsOnWorker ? window.location.origin : 'https://api.magicpulse.app');
  var siteEventTrackingEnabled = siteRunsOnWorker || hasExplicitSiteApiBase;

  (function () {
    var banner = document.createElement('div');
    banner.className = 'connection-banner';
    banner.hidden = true;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');

    var message = document.createElement('span');
    message.textContent = 'You are offline. Live data and forms may be unavailable.';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Check again';
    retry.addEventListener('click', function () {
      if (window.navigator.onLine) {
        banner.hidden = true;
        document.body.classList.remove('is-offline');
      } else {
        message.textContent = 'Still offline. Your connection has not returned yet.';
      }
    });
    banner.appendChild(message);
    banner.appendChild(retry);
    document.body.appendChild(banner);

    function updateConnectionState() {
      var offline = window.navigator.onLine === false;
      banner.hidden = !offline;
      document.body.classList.toggle('is-offline', offline);
      if (offline) message.textContent = 'You are offline. Live data and forms may be unavailable.';
    }

    window.addEventListener('online', updateConnectionState);
    window.addEventListener('offline', updateConnectionState);
    updateConnectionState();

    document.querySelectorAll('img').forEach(function (img) {
      function markLoaded() { img.classList.add('is-loaded'); }
      if (img.complete) markLoaded();
      else img.addEventListener('load', markLoaded, { once: true });
    });
  }());

  (function () {
    var allowedEvents = [
      'app_store_click',
      'park_preview_change',
      'gallery_navigate',
      'feature_open',
      'status_check',
      'support_start'
    ];
    var privacyOptOut =
      window.navigator.doNotTrack === '1' || window.navigator.globalPrivacyControl === true;

    function trackSiteEvent(eventName, context) {
      if (!siteEventTrackingEnabled || privacyOptOut || allowedEvents.indexOf(eventName) === -1) return;
      var safeContext = String(context || 'none').slice(0, 40);
      fetch(MAGICPULSE_SITE_API_BASE + '/api/site/events', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ event: eventName, context: safeContext })
      }).catch(function () {
        // Measurement must never interrupt navigation or the live preview.
      });
    }

    window.magicPulseTrack = trackSiteEvent;
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest
        ? event.target.closest('[data-event]')
        : null;
      if (!target) return;
      trackSiteEvent(target.getAttribute('data-event'), target.getAttribute('data-event-context'));
    });
  }());

  (function () {
    var gallery = document.getElementById('product-gallery');
    var controls = document.querySelector('[data-gallery-controls]');
    if (!gallery || !controls) return;

    var slides = Array.prototype.slice.call(gallery.querySelectorAll('[data-gallery-slide]'));
    var previous = controls.querySelector('[data-gallery-previous]');
    var next = controls.querySelector('[data-gallery-next]');
    var counter = controls.querySelector('[data-gallery-counter]');
    if (!slides.length || !previous || !next || !counter) return;

    var activeIndex = 0;
    var scrollFrame = null;

    function updateControls(index, announce) {
      var safeIndex = Math.max(0, Math.min(slides.length - 1, index));
      if (safeIndex === activeIndex && !announce) return;
      activeIndex = safeIndex;
      counter.textContent = String(activeIndex + 1) + ' of ' + String(slides.length);
      previous.disabled = activeIndex === 0;
      next.disabled = activeIndex === slides.length - 1;
      if (announce && typeof window.magicPulseTrack === 'function') {
        window.magicPulseTrack('gallery_navigate', 'slide_' + String(activeIndex + 1));
      }
    }

    function closestSlideIndex() {
      var galleryLeft = gallery.getBoundingClientRect().left;
      var bestIndex = 0;
      var bestDistance = Infinity;
      slides.forEach(function (slide, index) {
        var distance = Math.abs(slide.getBoundingClientRect().left - galleryLeft);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestIndex;
    }

    function goTo(index) {
      var safeIndex = Math.max(0, Math.min(slides.length - 1, index));
      var galleryRect = gallery.getBoundingClientRect();
      var slideRect = slides[safeIndex].getBoundingClientRect();
      var left = gallery.scrollLeft + slideRect.left - galleryRect.left;
      gallery.scrollTo({ left: left, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      updateControls(safeIndex, true);
    }

    previous.addEventListener('click', function () { goTo(activeIndex - 1); });
    next.addEventListener('click', function () { goTo(activeIndex + 1); });
    gallery.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      goTo(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
    });
    gallery.addEventListener('scroll', function () {
      if (scrollFrame != null) return;
      scrollFrame = window.requestAnimationFrame(function () {
        scrollFrame = null;
        updateControls(closestSlideIndex(), false);
      });
    }, { passive: true });

    updateControls(0, false);
  }());

  (function () {
    var forms = document.querySelectorAll('[data-site-form]');
    if (!forms.length) return;

    Array.prototype.forEach.call(forms, function (form) {
      var status = form.querySelector('[data-form-status]') || form.querySelector('.form-status');
      var submit = form.querySelector('button[type="submit"]');
      var kind = form.getAttribute('data-form-kind');
      if (!status || !submit || (kind !== 'support' && kind !== 'android-waitlist')) return;

      var expectedEndpoint = MAGICPULSE_SITE_API_BASE + '/api/site/forms/' + kind;
      if (MAGICPULSE_SITE_API_BASE === window.location.origin) form.action = expectedEndpoint;
      var challenge = null;
      var challengeLoadedAt = 0;
      var challengeRequest = null;
      var idleLabel = form.getAttribute('data-submit-label') || submit.textContent.trim();
      var sendingLabel = form.getAttribute('data-submitting-label') || 'Sending...';
      var successMessage =
        form.getAttribute('data-success-message') ||
        'Thanks - your message has been sent. We will get back to you soon.';
      var errorMessage =
        form.getAttribute('data-error-message') ||
        'Unable to send right now. Please try again in a moment or use a different network.';
      var cooldownKey = 'magicpulse.formSent.' + kind;

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

      function fieldValue(name) {
        var field = form.elements.namedItem(name);
        return field && typeof field.value === 'string' ? field.value.trim() : '';
      }

      function supportMessage() {
        var message = fieldValue('message');
        if (kind !== 'support') return message;
        var labels = [
          ['App version', fieldValue('app_version')],
          ['Device', fieldValue('device_model')],
          ['OS version', fieldValue('os_version')],
          ['Park', fieldValue('park')],
          ['Steps to reproduce', fieldValue('steps')]
        ].filter(function (item) { return item[1]; });
        if (!labels.length) return message;
        var details = labels.map(function (item) { return item[0] + ': ' + item[1]; }).join('\n');
        return (message + '\n\nTechnical details supplied by the visitor:\n' + details).slice(0, 5000);
      }

      function formEndpointIsAllowed() {
        try {
          return new URL(form.action, window.location.href).href === expectedEndpoint;
        } catch (_err) {
          return false;
        }
      }

      function loadChallenge(force) {
        if (!force && challenge && Date.now() - challengeLoadedAt < 90 * 60 * 1000) {
          return Promise.resolve(challenge);
        }
        if (challengeRequest) return challengeRequest;
        challengeRequest = fetch(MAGICPULSE_SITE_API_BASE + '/api/site/form-token', {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          headers: { Accept: 'application/json' }
        })
          .then(function (res) {
            if (!res.ok) throw new Error('challenge');
            return res.json();
          })
          .then(function (body) {
            if (!body || typeof body.challenge !== 'string') throw new Error('challenge');
            challenge = body.challenge;
            challengeLoadedAt = Date.now();
            return challenge;
          })
          .finally(function () {
            challengeRequest = null;
          });
        return challengeRequest;
      }

      function recentSuccessfulSubmit() {
        try {
          var sentAt = Number(window.localStorage.getItem(cooldownKey));
          return Number.isFinite(sentAt) && Date.now() - sentAt < 30 * 1000;
        } catch (_err) {
          return false;
        }
      }

      function rememberSuccessfulSubmit() {
        try {
          window.localStorage.setItem(cooldownKey, String(Date.now()));
        } catch (_err) {
          // Server-side limits still protect the endpoint when storage is blocked.
        }
      }

      if (siteRunsOnWorker || hasExplicitSiteApiBase) {
        loadChallenge(false).catch(function () {
          // A fresh attempt is made when the visitor submits.
        });
      }

      var supportInteractionTracked = false;
      form.addEventListener('focusin', function () {
        if (supportInteractionTracked || typeof window.magicPulseTrack !== 'function') return;
        supportInteractionTracked = true;
        window.magicPulseTrack('support_start', kind);
      });

      var diagnostics = form.querySelector('[data-support-diagnostics]');
      if (topicSelect && diagnostics) {
        if (topicSelect.value === 'bug') diagnostics.open = true;
        topicSelect.addEventListener('change', function () {
          if (topicSelect.value === 'bug') diagnostics.open = true;
        });
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        submit.disabled = true;
        submit.textContent = sendingLabel;
        status.hidden = true;
        status.className = 'form-status';

        if (!formEndpointIsAllowed()) {
          status.textContent = 'Unable to send right now. Please reload the page and try again.';
          status.className = 'form-status form-status--error';
          status.hidden = false;
          submit.disabled = false;
          submit.textContent = idleLabel;
          return;
        }

        if (recentSuccessfulSubmit()) {
          status.textContent = 'That was already sent. Please wait a moment before sending another.';
          status.className = 'form-status form-status--error';
          status.hidden = false;
          submit.disabled = false;
          submit.textContent = idleLabel;
          return;
        }

        loadChallenge(false)
          .then(function (formChallenge) {
            var elapsed = Date.now() - challengeLoadedAt;
            var waitMs = Math.max(0, 3200 - elapsed);
            return new Promise(function (resolve) {
              window.setTimeout(function () { resolve(formChallenge); }, waitMs);
            });
          })
          .then(function (formChallenge) {
            var payload = {
              challenge: formChallenge,
              honeypot: fieldValue('_gotcha'),
              email: fieldValue('email')
            };
            if (kind === 'support') {
              payload.name = fieldValue('name');
              payload.topic = fieldValue('topic');
              payload.message = supportMessage();
            }
            return fetch(expectedEndpoint, {
              method: 'POST',
              mode: 'cors',
              credentials: 'omit',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify(payload)
            });
          })
          .then(function (res) {
            if (res.ok) return res.json().catch(function () { return {}; });
            return res.json().catch(function () { return null; }).then(function (body) {
              var message = body && typeof body.error === 'string' ? body.error : errorMessage;
              var failure = new Error(message);
              failure.status = res.status;
              throw failure;
            });
          })
          .then(function (body) {
            rememberSuccessfulSubmit();
            status.textContent = successMessage + (
              body && typeof body.requestId === 'string'
                ? ' Reference: ' + body.requestId + '.'
                : ''
            );
            status.className = 'form-status form-status--success';
            form.reset();
            challenge = null;
            loadChallenge(true).catch(function () {});
          })
          .catch(function (err) {
            status.textContent = err && err.status === 429
              ? 'Too many attempts from this network. Please wait a few minutes and try again.'
              : (err && err.message && err.message !== 'challenge' ? err.message : errorMessage);
            status.className = 'form-status form-status--error';
          })
          .finally(function () {
            status.hidden = false;
            submit.disabled = false;
            submit.textContent = idleLabel;
          });
      });
    });
  }());

  (function () {
    var root = document.querySelector('[data-status-page]');
    if (!root) return;

    var overall = root.querySelector('[data-status-overall]');
    var checked = root.querySelector('[data-status-checked]');
    var refresh = root.querySelector('[data-status-refresh]');
    var historyState = root.querySelector('[data-status-history-state]');
    var historyList = root.querySelector('[data-status-history-list]');
    var historyStarted = root.querySelector('[data-status-history-started]');
    var statusRequest = null;

    function statusLabel(state) {
      if (state === 'operational') return 'Operational';
      if (state === 'degraded') return 'Delayed';
      if (state === 'unavailable') return 'Unavailable';
      return 'Unknown';
    }

    function historyDate(value) {
      if (typeof value !== 'string' || !value) return null;
      var dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (dateOnly) {
        return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
      }
      var date = new Date(value);
      return Number.isFinite(date.getTime()) ? date : null;
    }

    function formatHistoryDate(value, includeTime) {
      var date = historyDate(value);
      if (!date) return 'Date unavailable';
      return date.toLocaleString(undefined, includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' });
    }

    function historyStatusLabel(status) {
      if (status === 'investigating') return 'Investigating';
      if (status === 'monitoring') return 'Monitoring';
      if (status === 'resolved') return 'Resolved';
      if (status === 'completed') return 'Completed';
      return 'Update';
    }

    function historyStatusState(status) {
      if (status === 'investigating') return 'unavailable';
      if (status === 'monitoring') return 'degraded';
      if (status === 'resolved' || status === 'completed') return 'operational';
      return 'unknown';
    }

    function historyKindLabel(kind) {
      if (kind === 'incident') return 'Incident';
      if (kind === 'maintenance') return 'Maintenance';
      return 'Notice';
    }

    function renderStatusHistory(payload) {
      if (!historyState || !historyList) return;
      var startedAt = payload && typeof payload.historyStartedAt === 'string'
        ? payload.historyStartedAt
        : '';
      var startedDate = historyDate(startedAt);
      if (historyStarted && startedDate) {
        historyStarted.setAttribute('datetime', startedAt);
        historyStarted.textContent = formatHistoryDate(startedAt, false);
      }

      var entries = payload && Array.isArray(payload.entries)
        ? payload.entries.filter(function (entry) {
            return entry && typeof entry.title === 'string' && historyDate(entry.startedAt);
          })
        : [];
      entries.sort(function (a, b) {
        return historyDate(b.startedAt).getTime() - historyDate(a.startedAt).getTime();
      });

      historyList.textContent = '';
      if (!entries.length) {
        historyList.hidden = true;
        historyState.hidden = false;
        historyState.textContent = 'No confirmed incidents or maintenance notices have been posted in this record.';
        return;
      }

      entries.forEach(function (entry) {
        var item = document.createElement('li');
        item.className = 'status-history-entry';
        item.setAttribute('data-state', historyStatusState(entry.status));

        var dateBlock = document.createElement('div');
        dateBlock.className = 'status-history-date';
        var date = document.createElement('time');
        date.dateTime = entry.startedAt;
        date.textContent = formatHistoryDate(entry.startedAt, entry.startedAt.indexOf('T') !== -1);
        var kind = document.createElement('span');
        kind.textContent = historyKindLabel(entry.kind);
        dateBlock.appendChild(date);
        dateBlock.appendChild(kind);

        var main = document.createElement('div');
        main.className = 'status-history-entry-main';
        var title = document.createElement('h3');
        title.textContent = entry.title;
        var service = document.createElement('p');
        service.className = 'status-history-service';
        service.textContent = typeof entry.service === 'string' && entry.service
          ? entry.service
          : 'Magic Pulse';
        var summary = document.createElement('p');
        summary.textContent = typeof entry.summary === 'string' ? entry.summary : '';
        main.appendChild(title);
        main.appendChild(service);
        if (summary.textContent) main.appendChild(summary);

        if (Array.isArray(entry.updates) && entry.updates.length) {
          var updates = document.createElement('div');
          updates.className = 'status-history-updates';
          entry.updates.forEach(function (update) {
            if (!update || typeof update.message !== 'string') return;
            var updateLine = document.createElement('p');
            if (historyDate(update.at)) {
              var updateTime = document.createElement('time');
              updateTime.dateTime = update.at;
              updateTime.textContent = formatHistoryDate(update.at, true);
              updateLine.appendChild(updateTime);
            }
            var updateMessage = document.createElement('span');
            updateMessage.textContent = update.message;
            updateLine.appendChild(updateMessage);
            updates.appendChild(updateLine);
          });
          if (updates.childNodes.length) main.appendChild(updates);
        }

        var result = document.createElement('strong');
        result.className = 'status-history-result';
        var indicator = document.createElement('span');
        indicator.className = 'status-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        result.appendChild(indicator);
        result.appendChild(document.createTextNode(historyStatusLabel(entry.status)));

        item.appendChild(dateBlock);
        item.appendChild(main);
        item.appendChild(result);
        historyList.appendChild(item);
      });

      historyState.hidden = true;
      historyList.hidden = false;
    }

    function loadStatusHistory() {
      if (!historyState || !historyList) return Promise.resolve();
      return fetch('status-history.json', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('history');
          return res.json();
        })
        .then(renderStatusHistory)
        .catch(function () {
          historyList.hidden = true;
          historyState.hidden = false;
          historyState.textContent = 'Incident history is temporarily unavailable. Current service checks above are unaffected.';
        });
    }

    function ingestionLooksDelayed(ingestion) {
      if (!ingestion) return true;
      var startedAt = Date.parse(ingestion.startedAt || '');
      var completedAt = Date.parse(ingestion.completedAt || '');
      var isRecent = Number.isFinite(startedAt) && Date.now() - startedAt < 10 * 60 * 1000;
      var isActiveRefresh = !ingestion.completedAt && /progress|refresh|running/i.test(String(ingestion.message || ''));
      if (isRecent && isActiveRefresh) return false;
      if (ingestion.ok !== true || !Number.isFinite(completedAt)) return true;
      return Date.now() - completedAt > 15 * 60 * 1000;
    }

    function serviceFallback() {
      var apiCheck = fetch('https://api.magicpulse.app/api/health', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('api');
        return res.json();
      });
      var sourceCheck = fetch(
        'https://api.themeparks.wiki/v1/entity/75ea578a-adc8-4116-a54d-dccb60765ef9/live',
        { cache: 'no-store', headers: { Accept: 'application/json' } }
      ).then(function (res) {
        if (!res.ok) throw new Error('source');
        return res.json();
      });

      return Promise.allSettled([apiCheck, sourceCheck]).then(function (results) {
        var apiState = results[0].status === 'fulfilled' ? 'operational' : 'unavailable';
        var apiValue = results[0].status === 'fulfilled' ? results[0].value : null;
        var liveState = results[1].status === 'fulfilled' ? 'operational' : 'unavailable';
        var pushState = apiValue && apiValue.push && apiValue.push.configured === true
          ? 'operational'
          : (apiValue ? 'degraded' : 'unavailable');
        if (apiValue && ingestionLooksDelayed(apiValue.ingestion)) liveState = 'degraded';
        return {
          overall: apiState === 'operational' && liveState === 'operational' && pushState === 'operational'
            ? 'operational'
            : 'degraded',
          checkedAt: new Date().toISOString(),
          services: {
            website: { state: 'operational' },
            api: { state: apiState },
            liveData: { state: liveState },
            push: { state: pushState }
          }
        };
      });
    }

    function updateStatus(payload) {
      var services = payload && payload.services ? payload.services : {};
      ['website', 'api', 'liveData', 'push'].forEach(function (key) {
        var row = root.querySelector('[data-status-service="' + key + '"]');
        if (!row) return;
        var state = services[key] && services[key].state ? services[key].state : 'unknown';
        row.setAttribute('data-state', state);
        var value = row.querySelector('[data-status-value]');
        if (value) value.textContent = statusLabel(state);
      });
      var overallState = payload && payload.overall ? payload.overall : 'unknown';
      if (overall) {
        overall.setAttribute('data-state', overallState);
        var overallValue = overall.querySelector('strong');
        if (overallValue) {
          overallValue.textContent = overallState === 'operational'
            ? 'All checked services are operational'
            : overallState === 'degraded'
              ? 'One or more services are delayed'
              : 'One or more services are unavailable';
        }
      }
      var checkedAt = payload && payload.checkedAt ? new Date(payload.checkedAt) : new Date();
      if (checked) {
        checked.textContent = checkedAt.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
      }
      if (typeof window.magicPulseTrack === 'function') {
        window.magicPulseTrack('status_check', overallState);
      }
    }

    function loadStatus() {
      if (statusRequest) return statusRequest;
      if (refresh) {
        refresh.disabled = true;
        refresh.textContent = 'Checking...';
      }
      var primaryStatus = siteRunsOnWorker
        ? fetch(window.location.origin + '/api/site/status', {
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
          })
        : Promise.reject(new Error('site-status-route-unavailable'));
      statusRequest = primaryStatus
        .then(function (res) {
          if (!res.ok) throw new Error('status');
          return res.json();
        })
        .catch(serviceFallback)
        .then(updateStatus)
        .catch(function () {
          updateStatus({
            overall: 'unavailable',
            checkedAt: new Date().toISOString(),
            services: {
              website: { state: 'operational' },
              api: { state: 'unknown' },
              liveData: { state: 'unknown' },
              push: { state: 'unknown' }
            }
          });
        })
        .finally(function () {
          statusRequest = null;
          if (refresh) {
            refresh.disabled = false;
            refresh.textContent = 'Refresh status';
          }
        });
      return statusRequest;
    }

    if (refresh) refresh.addEventListener('click', loadStatus);
    loadStatus();
    loadStatusHistory();
  }());

  (function () {
    var root = document.querySelector('[data-insights-dashboard]');
    if (!root) return;
    var state = root.querySelector('[data-insights-state]');
    var report = root.querySelector('[data-insights-report]');
    var refresh = root.querySelector('[data-insights-refresh]');
    var eventLabels = {
      app_store_click: 'App Store opens',
      park_preview_change: 'Park preview changes',
      gallery_navigate: 'Gallery navigation',
      feature_open: 'Feature guide opens',
      status_check: 'Status checks',
      support_start: 'Support form starts',
      support_submit: 'Support requests',
      android_signup: 'Android signups'
    };

    function renderBars(container, items) {
      if (!container) return;
      container.textContent = '';
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'insights-empty';
        empty.textContent = 'No activity in this period.';
        container.appendChild(empty);
        return;
      }
      var maximum = Math.max.apply(null, items.map(function (item) { return item.count; }).concat([1]));
      items.forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'insights-bar-row';
        var heading = document.createElement('div');
        var label = document.createElement('span');
        label.textContent = item.label;
        var count = document.createElement('strong');
        count.textContent = String(item.count);
        heading.appendChild(label);
        heading.appendChild(count);
        var progress = document.createElement('progress');
        progress.max = maximum;
        progress.value = item.count;
        progress.setAttribute('aria-label', item.label + ': ' + String(item.count));
        row.appendChild(heading);
        row.appendChild(progress);
        container.appendChild(row);
      });
    }

    function renderInsights(payload) {
      var totals = payload && payload.totals ? payload.totals : {};
      root.querySelectorAll('[data-metric]').forEach(function (element) {
        var metric = element.getAttribute('data-metric');
        element.textContent = String(totals[metric] || 0);
      });

      var actionItems = Object.keys(totals)
        .filter(function (eventName) { return eventName !== 'support_submit'; })
        .map(function (eventName) {
          return { label: eventLabels[eventName] || eventName, count: Number(totals[eventName] || 0) };
        })
        .filter(function (item) { return item.count > 0; })
        .sort(function (a, b) { return b.count - a.count; });
      renderBars(root.querySelector('[data-insights-bars]'), actionItems);

      var supportByTopic = {};
      (payload.rows || []).forEach(function (row) {
        if (row.event !== 'support_submit') return;
        supportByTopic[row.context] = (supportByTopic[row.context] || 0) + Number(row.count || 0);
      });
      renderBars(
        root.querySelector('[data-support-bars]'),
        Object.keys(supportByTopic).map(function (topic) {
          return { label: topic, count: supportByTopic[topic] };
        }).sort(function (a, b) { return b.count - a.count; })
      );

      var tbody = root.querySelector('[data-insights-rows]');
      if (tbody) {
        tbody.textContent = '';
        (payload.rows || []).slice(0, 120).forEach(function (item) {
          var tr = document.createElement('tr');
          [item.day, eventLabels[item.event] || item.event, item.context, item.count].forEach(function (value) {
            var td = document.createElement('td');
            td.textContent = String(value);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }
      var windowLabel = root.querySelector('[data-insights-window]');
      if (windowLabel) windowLabel.textContent = String(payload.days || 30) + ' days';
      var generated = root.querySelector('[data-insights-generated]');
      if (generated) generated.textContent = 'Updated ' + new Date(payload.generatedAt).toLocaleString();
      if (state) state.hidden = true;
      if (report) report.hidden = false;
    }

    function loadInsights() {
      if (refresh) refresh.disabled = true;
      if (state) {
        state.hidden = false;
        state.textContent = 'Loading the last 30 days...';
      }
      return fetch('/api/site/report?days=30', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) {
            var error = new Error(res.status === 403 || res.status === 404 ? 'This report is private.' : 'Report unavailable.');
            error.status = res.status;
            throw error;
          }
          return res.json();
        })
        .then(renderInsights)
        .catch(function (error) {
          if (report) report.hidden = true;
          if (state) {
            state.hidden = false;
            state.textContent = error.message || 'Report unavailable.';
          }
        })
        .finally(function () { if (refresh) refresh.disabled = false; });
    }

    if (refresh) refresh.addEventListener('click', loadInsights);
    loadInsights();
  }());

  var waitsRoot = document.getElementById('live-waits');
  if (!waitsRoot) return;

  var MAGICPULSE_API_BASE =
    typeof window.MAGICPULSE_API_BASE === 'string' ? window.MAGICPULSE_API_BASE : 'https://api.magicpulse.app';
  var MAGICPULSE_SNAPSHOT_SOURCE =
    typeof window.MAGICPULSE_SNAPSHOT_SOURCE === 'string' ? window.MAGICPULSE_SNAPSHOT_SOURCE : 'magicpulse';
  var rawConfiguredParkId = window.MAGICPULSE_PARK_ID;
  var HAS_CONFIGURED_PARK_ID =
    (typeof rawConfiguredParkId === 'number' && !Number.isNaN(rawConfiguredParkId)) ||
    (rawConfiguredParkId != null &&
      String(rawConfiguredParkId).trim() !== '' &&
      !Number.isNaN(parseInt(String(rawConfiguredParkId), 10)));
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

  // Keep IDs/entity IDs in sync with the apps and API. Display names may normalize a current public name.
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
    { id: 28, name: 'Disney Adventure World', theme: 'wdsp', resort: 'DLP', icon: '🎬', entityId: 'ca888437-ebb4-4d50-aed2-d227f7096968' }
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
      { rideName: 'Pirates of the Caribbean' },
      { rideName: 'Phantom Manor' },
      { rideName: 'Indiana Jones™ and the Temple of Peril' },
      { rideName: 'Peter Pan\'s Flight' }
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
  var featuredApiUrl =
    (MAGICPULSE_API_BASE ? MAGICPULSE_API_BASE.replace(/\/$/, '') : '') +
    '/api/parks/public/featured/snapshot';
  var LIVE_PARK_STORAGE_KEY = 'magicpulse.previewParkId';
  var parkSelect = document.getElementById('live-park-select');
  var openAppLink = document.getElementById('live-open-app');
  var retryButton = document.getElementById('live-waits-retry');
  var liveRequestSequence = 0;

  function publicSnapshotApiUrl(parkId) {
    return (
      (MAGICPULSE_API_BASE ? MAGICPULSE_API_BASE.replace(/\/$/, '') : '') +
      '/api/parks/public/' +
      encodeURIComponent(String(parkId)) +
      '/snapshot'
    );
  }

  function readSavedLiveParkId() {
    try {
      var stored = window.localStorage.getItem(LIVE_PARK_STORAGE_KEY);
      if (!stored) return null;
      var parkId = parseInt(stored, 10);
      return Number.isNaN(parkId) || !parkMetaById(parkId) ? null : parkId;
    } catch (_err) {
      return null;
    }
  }

  function saveLiveParkId(parkId) {
    try {
      window.localStorage.setItem(LIVE_PARK_STORAGE_KEY, String(parkId));
    } catch (_err) {
      // The preview still works when storage is unavailable or blocked.
    }
  }

  var savedLiveParkId = readSavedLiveParkId();
  var activeLiveParkId = savedLiveParkId || MAGICPULSE_PARK_ID;
  var initialUseFeaturedSnapshot = savedLiveParkId == null && !HAS_CONFIGURED_PARK_ID;

  function syncLiveParkControls(parkId) {
    var meta = parkMetaById(parkId);
    if (!meta) return;
    if (parkSelect && parkSelect.value !== String(parkId)) {
      parkSelect.value = String(parkId);
    }
    if (openAppLink) {
      openAppLink.setAttribute('data-deep-link', 'magicpulse://park/' + parkId);
      var openAppLabel = 'Open ' + meta.name + ' in Magic Pulse';
      var openAppLabelElement = document.getElementById('live-open-app-label');
      if (openAppLabelElement) openAppLabelElement.textContent = openAppLabel;
      openAppLink.setAttribute('aria-label', openAppLabel);
    }
  }

  function prepareLiveParkLoad(parkId) {
    var meta = parkMetaById(parkId);
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    if (meta && parkEl) parkEl.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name;
    if (updatedEl) updatedEl.textContent = 'Loading current waits...';
    setLiveBadge('Loading', 'demo');
    waitsRoot.classList.add('is-refreshing');
    waitsRoot.setAttribute('aria-busy', 'true');
  }

  syncLiveParkControls(activeLiveParkId);

  if (parkSelect) {
    parkSelect.addEventListener('change', function () {
      var nextParkId = parseInt(parkSelect.value, 10);
      if (Number.isNaN(nextParkId) || !parkMetaById(nextParkId)) return;
      activeLiveParkId = nextParkId;
      saveLiveParkId(nextParkId);
      if (typeof window.magicPulseTrack === 'function') {
        window.magicPulseTrack('park_preview_change', String(nextParkId));
      }
      syncLiveParkControls(nextParkId);
      prepareLiveParkLoad(nextParkId);
      loadLiveWaits({ refresh: false, parkId: nextParkId, useFeatured: false });
    });
  }

  if (openAppLink) {
    openAppLink.addEventListener('click', function (event) {
      if (!/(iPhone|iPad|iPod)/i.test(window.navigator.userAgent || '')) return;
      var deepLink = openAppLink.getAttribute('data-deep-link');
      if (!deepLink) return;
      event.preventDefault();
      var appStoreUrl = openAppLink.href;
      window.location.href = deepLink;
      window.setTimeout(function () {
        if (document.visibilityState === 'visible') window.location.href = appStoreUrl;
      }, 1100);
    });
  }

  if (retryButton) {
    retryButton.addEventListener('click', function () {
      retryButton.disabled = true;
      retryButton.textContent = 'Checking...';
      prepareLiveParkLoad(activeLiveParkId);
      loadLiveWaits({ refresh: false, parkId: activeLiveParkId, useFeatured: false })
        .finally(function () {
          retryButton.disabled = false;
          retryButton.textContent = 'Try again';
        });
    });
  }

  function themeParksLiveUrl(entityId) {
    return THEMEPARKS_WIKI_LIVE_BASE + '/' + encodeURIComponent(entityId) + '/live';
  }

  function isProbablyNotARide(name) {
    var n = String(name || '').toLowerCase();
    var exactNonRides = [
      'adventure isle',
      "le passage enchanté d'aladdin",
      'les mystères du nautilus',
      'la cabane des robinson',
      "pirates' beach",
      'toon park',
      'zootopia: better zoogether!'
    ];
    if (exactNonRides.indexOf(n.trim()) !== -1) return true;
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
      'exhibit',
      'gallery',
      'trail',
      'walkthrough',
      'treehouse',
      'playground',
      'play area',
      'splash zone',
      'transport',
      'transportation',
      'monorail',
      'bus',
      'ferry',
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
    var latestUpdatedAt = NaN;
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
      var updatedAt = Date.parse(item.lastUpdated || '');
      if (Number.isFinite(updatedAt) && (!Number.isFinite(latestUpdatedAt) || updatedAt > latestUpdatedAt)) {
        latestUpdatedAt = updatedAt;
      }
      rides.push({
        id: item.id || null,
        name: nm,
        wait: wait,
        is_open: isOpen
      });
    }
    return {
      rides: rides,
      sourceUpdatedISO: Number.isFinite(latestUpdatedAt) ? new Date(latestUpdatedAt).toISOString() : null
    };
  }

  function buildSyntheticSnapshot(parkId, rides, sourceUpdatedISO) {
    var meta = parkMetaById(parkId);
    var sourceUpdatedAt = Date.parse(sourceUpdatedISO || '');
    var hasSourceTimestamp = Number.isFinite(sourceUpdatedAt);
    var displayDate = hasSourceTimestamp ? new Date(sourceUpdatedAt) : null;
    var isStale = !hasSourceTimestamp || Date.now() - sourceUpdatedAt > 15 * 60 * 1000;
    return {
      park: {
        id: String(parkId),
        name: meta ? meta.name : 'Park',
        icon: meta && meta.icon ? meta.icon : '',
        theme: meta ? meta.theme : ''
      },
      updated: displayDate
        ? displayDate.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
        : 'Update time unavailable',
      updatedISO: hasSourceTimestamp ? new Date(sourceUpdatedAt).toISOString() : null,
      status: { rides: { isStale: isStale } },
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
      var parsed = themeParksPayloadToRides(payload);
      if (!parsed.rides.length) return { snapshot: null, selectedParkId: parkId, source: 'themeparks' };
      return {
        snapshot: buildSyntheticSnapshot(parkId, parsed.rides, parsed.sourceUpdatedISO),
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
      var apiIsHttp = MAGICPULSE_API_BASE.indexOf('http://') === 0;
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

  function rideMatchesTarget(ride, target) {
    if (target.rideId && typeof ride.id === 'string' && ride.id === target.rideId) {
      return true;
    }
    if (!target.rideName) return false;
    var rideName = normalizedRideName(ride.name);
    var targetName = normalizedRideName(target.rideName);
    return (
      rideName === targetName ||
      (targetName.length >= 6 &&
        (rideName.indexOf(targetName) !== -1 || targetName.indexOf(rideName) !== -1))
    );
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
    var usableRides = snapshotRides.filter(function (ride) {
      return ride.is_open && ride.wait != null && !isProbablyNotARide(ride.name);
    });
    var openRides = usableRides.filter(function (ride) {
      return ride.wait > 0;
    });
    var walkOnRides = usableRides.filter(function (ride) {
      return ride.wait === 0;
    });

    var selected = [];
    var selectedKeys = {};
    configuredPopularRidesForPark(parkId).forEach(function (target) {
      if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
      var match = openRides.find(function (ride) {
        return rideMatchesTarget(ride, target);
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

    walkOnRides.forEach(function (ride) {
      if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
      var key = typeof ride.id === 'string' && ride.id ? ride.id : ride.name;
      if (selectedKeys[key]) return;
      selectedKeys[key] = true;
      selected.push(ride);
    });

    var mapped = selected.slice(0, SNAPSHOT_RIDE_COUNT).map(function (ride) {
      return {
        rideId: typeof ride.id === 'string' && ride.id ? ride.id : null,
        name: ride.name,
        waitTime: ride.wait,
        predictedWaitIn30Min: Number.isFinite(Number(ride.predictedWaitIn30Min))
          ? Number(ride.predictedWaitIn30Min)
          : null,
        waitAnomaly: typeof ride.waitAnomaly === 'string' ? ride.waitAnomaly : null,
        trend: typeof ride.trend === 'string' ? ride.trend : null
      };
    });

    if (mapped.length < SNAPSHOT_RIDE_COUNT) {
      var mappedKeys = {};
      mapped.forEach(function (ride) {
        mappedKeys[ride.rideId || ride.name] = true;
      });
      selectClosedSnapshotRides(snapshotRides, parkId).forEach(function (ride) {
        if (mapped.length >= SNAPSHOT_RIDE_COUNT) return;
        var key = ride.rideId || ride.name;
        if (mappedKeys[key]) return;
        mappedKeys[key] = true;
        mapped.push(ride);
      });
    }

    return mapped;
  }

  function selectClosedSnapshotRides(snapshotRides, parkId) {
    var candidates = snapshotRides.filter(function (ride) {
      return ride && ride.name && ride.is_open === false && !isProbablyNotARide(ride.name);
    });
    var selected = [];
    var selectedKeys = {};

    configuredPopularRidesForPark(parkId).forEach(function (target) {
      if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
      var match = candidates.find(function (ride) {
        return rideMatchesTarget(ride, target);
      });
      if (!match) return;
      var key = typeof match.id === 'string' && match.id ? match.id : match.name;
      if (selectedKeys[key]) return;
      selectedKeys[key] = true;
      selected.push(match);
    });

    candidates.forEach(function (ride) {
      if (selected.length >= SNAPSHOT_RIDE_COUNT) return;
      var key = typeof ride.id === 'string' && ride.id ? ride.id : ride.name;
      if (selectedKeys[key]) return;
      selectedKeys[key] = true;
      selected.push(ride);
    });

    return selected.map(function (ride) {
      return {
        rideId: typeof ride.id === 'string' && ride.id ? ride.id : null,
        name: ride.name,
        waitTime: null,
        statusText: 'Closed'
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

  function fetchMagicPulseSnapshot(parkId, budgetEndTs) {
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

    var requestUrl = parkId == null ? featuredApiUrl : publicSnapshotApiUrl(parkId);

    return fetch(requestUrl, opts)
      .then(function (res) {
        if (!res.ok) throw new Error(res.status === 401 ? 'API token required' : 'Request failed');
        return res.json();
      })
      .then(function (payload) {
        if (!payload || !payload.snapshot) return null;
        var selectedParkId = parseInt(
          String(payload.selectedParkId || (payload.snapshot.park && payload.snapshot.park.id) || parkId),
          10
        );
        return {
          snapshot: payload.snapshot,
          selectedParkId: Number.isNaN(selectedParkId) ? parkId || MAGICPULSE_PARK_ID : selectedParkId,
          source: 'magicpulse'
        };
      })
      .finally(function () {
        window.clearTimeout(timerId);
      });
  }

  function resolveSnapshot(primaryParkId, useFeatured) {
    var budgetEnd = Date.now() + LIVE_SNAPSHOT_BUDGET_MS;
    if (!SNAPSHOT_SOURCE_MAGICPULSE) {
      return resolveThemeParksSnapshot(primaryParkId, budgetEnd);
    }

    return fetchMagicPulseSnapshot(useFeatured ? null : primaryParkId, budgetEnd)
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
      var currentMeta = parkMetaFromSnapshot(snapshot);
      var icon = currentMeta && currentMeta.icon ? currentMeta.icon : snapshot.park.icon;
      var name = currentMeta && currentMeta.name ? currentMeta.name : snapshot.park.name;
      parkEl.textContent = (icon ? icon + ' ' : '') + name;
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
    badge.classList.toggle('live-badge--closed', state === 'closed');
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
  var bestLabel = document.getElementById('live-best-label');
  var bestMove = document.getElementById('live-best-move');
  var dataSignal = document.getElementById('live-data-signal');

  function updateInsights(items, snapshot, timestamp, source) {
    if (insights) insights.hidden = false;
    if (bestLabel) bestLabel.textContent = 'Best move';
    var lowest = items.reduce(function (best, item) {
      if (item.waitTime == null) return best;
      return !best || item.waitTime < best.waitTime ? item : best;
    }, null);
    var largestDrop = items.reduce(function (best, item) {
      if (item.waitTime == null || item.predictedWaitIn30Min == null) return best;
      var drop = item.waitTime - item.predictedWaitIn30Min;
      return !best || drop > best.drop ? { item: item, drop: drop } : best;
    }, null);
    if (bestMove) {
      bestMove.textContent = largestDrop && largestDrop.drop >= 10
        ? 'Wait on ' + largestDrop.item.name + ' · forecast down ' + largestDrop.drop + ' min'
        : (lowest ? 'Ride ' + lowest.name + ' · ' + lowest.waitTime + ' min' : 'No posted waits');
    }
    if (dataSignal) {
      var sourceLabel = source === 'themeparks' ? 'ThemeParks Wiki' : 'Magic Pulse';
      dataSignal.textContent = snapshotReportsStale(snapshot)
        ? 'Source reports delayed data'
        : sourceLabel + ' · ' + formatAge(timestamp);
    }
  }

  function updateClosedInsights(snapshot, timestamp, source) {
    if (insights) insights.hidden = false;
    if (bestLabel) bestLabel.textContent = 'Park status';
    var hours = snapshot && snapshot.parkHours;
    if (bestMove) {
      bestMove.textContent = hours && hours.nextOpen ? 'Closed · Opens ' + hours.nextOpen : 'Closed now';
    }
    if (dataSignal) {
      var sourceLabel = source === 'themeparks' ? 'ThemeParks Wiki' : 'Magic Pulse';
      dataSignal.textContent = sourceLabel + ' · ' + formatAge(timestamp);
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

  function staticFallbackRidesForPark(parkId) {
    var configured = configuredPopularRidesForPark(parkId)
      .map(function (ride) {
        return ride.rideName ? { name: ride.rideName } : null;
      })
      .filter(Boolean)
      .slice(0, SNAPSHOT_RIDE_COUNT);
    return configured.length ? configured : HERO_STATIC_FALLBACK_RIDES;
  }

  function renderHeroStaticFallback(parkId) {
    if (!rows) return;
    var fallbackParkId = parkMetaById(parkId) ? parkId : MAGICPULSE_PARK_ID;
    var list = staticFallbackRidesForPark(fallbackParkId).map(function (r) {
      return { name: r.name, waitTime: null, rideId: null };
    });
    render(list);
    waitsRoot.classList.add('live-waits--fallback');
    waitsRoot.classList.remove('live-waits--stale');
    setLiveBadge('Example', 'demo');
    var parkEl = document.getElementById('live-park-name');
    var updatedEl = document.getElementById('live-updated');
    var meta = parkMetaById(fallbackParkId);
    if (parkEl && meta) parkEl.textContent = (meta.icon ? meta.icon + ' ' : '') + meta.name + ' (example)';
    if (updatedEl) updatedEl.textContent = 'Illustrative sample';
    activeLiveParkId = fallbackParkId;
    syncLiveParkControls(fallbackParkId);
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
    var lowestWait = list.reduce(function (lowest, item) {
      if (item.waitTime == null) return lowest;
      return lowest == null || item.waitTime < lowest ? item.waitTime : lowest;
    }, null);

    function guidanceFor(item) {
      if (item.statusText) return { label: 'Not operating', state: 'closed' };
      if (item.waitTime == null) return { label: 'Example ride', state: 'steady' };
      if (item.predictedWaitIn30Min != null) {
        var delta = item.predictedWaitIn30Min - item.waitTime;
        if (delta <= -5) return { label: 'Forecast down ' + Math.abs(delta) + ' min', state: 'down' };
        if (delta >= 5) return { label: 'Forecast up ' + delta + ' min', state: 'up' };
      }
      if (item.waitAnomaly === 'low') return { label: 'Lower than usual', state: 'down' };
      if (item.waitAnomaly === 'high') return { label: 'Higher than usual', state: 'up' };
      return { label: item.waitTime === lowestWait ? 'Shortest shown now' : 'Holding steady', state: 'steady' };
    }

    list.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'waits-row is-hero';
      if (item.rideId) row.setAttribute('data-ride-id', item.rideId);

      var rank = document.createElement('span');
      rank.className = 'rank';
      rank.setAttribute('aria-hidden', 'true');
      rank.textContent = String(idx + 1);

      var rideCopy = document.createElement('span');
      rideCopy.className = 'ride-copy';
      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name || '';
      var guidance = guidanceFor(item);
      var trend = document.createElement('span');
      trend.className = 'ride-trend ride-trend--' + guidance.state;
      trend.textContent = guidance.label;
      rideCopy.appendChild(name);
      rideCopy.appendChild(trend);

      var value = document.createElement('span');
      value.className = 'value' + (item.statusText ? ' value--closed' : waitValueClass(item.waitTime));
      value.textContent = item.statusText || (item.waitTime != null ? item.waitTime + ' min' : '-');

      row.appendChild(rank);
      row.appendChild(rideCopy);
      row.appendChild(value);
      rows.appendChild(row);
    });
    rows.hidden = false;
  }

  function showError(message, isRefresh, parkId) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Magic Pulse]', message || 'Live wait snapshot failed');
    }
    if (isRefresh && rows && rows.children.length) {
      markLiveDataStale();
      return;
    }
    renderHeroStaticFallback(parkId);
  }

  function applyLiveResult(result, options) {
    var isRefresh = options && options.refresh;
    var requestedParkId = options && options.parkId ? options.parkId : activeLiveParkId;
    var snapshot = result && result.snapshot;
    if (!snapshot || !Array.isArray(snapshot.rides)) {
      showError('Live data unavailable right now.', isRefresh, requestedParkId);
      return;
    }
    var selectedParkId = result && result.selectedParkId ? result.selectedParkId : MAGICPULSE_PARK_ID;
    var selectedParkMeta = parkMetaFromSnapshot(snapshot);
    if (selectedParkMeta) {
      selectedParkId = selectedParkMeta.id;
    }
    var parkIsClosed = !!(
      snapshot.parkHours &&
      snapshot.parkHours.isOpenNow === false
    );
    var items = parkIsClosed
      ? selectClosedSnapshotRides(snapshot.rides, selectedParkId)
      : selectSnapshotRides(snapshot.rides, selectedParkId);

    if (!items.length) {
      showError('Live data unavailable right now.', isRefresh, selectedParkId);
      return;
    }

    clearHeroFallbackState();
    activeLiveParkId = selectedParkId;
    syncLiveParkControls(selectedParkId);

    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    render(items);
    lastSuccessfulSnapshotAt = snapshotTimestamp(snapshot);
    var isStale = snapshotReportsStale(snapshot);
    setLiveBadge(
      parkIsClosed ? 'Closed' : isStale ? 'Delayed' : 'Live',
      parkIsClosed ? 'closed' : isStale ? 'stale' : 'live'
    );
    if (isStale) waitsRoot.classList.add('live-waits--stale');
    setPanelMeta(snapshot, lastSuccessfulSnapshotAt);
    if (parkIsClosed) {
      updateClosedInsights(snapshot, lastSuccessfulSnapshotAt, result.source);
    } else {
      updateInsights(items, snapshot, lastSuccessfulSnapshotAt, result.source);
    }
    waitsRoot.setAttribute('aria-busy', 'false');
    waitsRoot.classList.remove('is-refreshing');
  }

  function loadLiveWaits(options) {
    var isRefresh = options && options.refresh;
    var requestedParkId = options && options.parkId ? options.parkId : activeLiveParkId;
    var useFeatured = !!(options && options.useFeatured);
    if (isRefresh && document.visibilityState !== 'visible') {
      return Promise.resolve();
    }
    var requestId = ++liveRequestSequence;
    waitsRoot.setAttribute('aria-busy', 'true');
    if (isRefresh) waitsRoot.classList.add('is-refreshing');

    return resolveSnapshot(requestedParkId, useFeatured)
      .then(function (result) {
        if (requestId !== liveRequestSequence) return;
        applyLiveResult(result, options);
      })
      .catch(function (err) {
        if (requestId !== liveRequestSequence) return;
        showError(getFetchErrorMessage(err), isRefresh, requestedParkId);
        waitsRoot.classList.remove('is-refreshing');
      })
      .finally(function () {
        if (requestId !== liveRequestSequence) return;
        waitsRoot.setAttribute('aria-busy', 'false');
        waitsRoot.classList.remove('is-refreshing');
      });
  }

  loadLiveWaits({
    refresh: false,
    parkId: activeLiveParkId,
    useFeatured: initialUseFeaturedSnapshot
  });

  // Only poll while the tab is in view — saves battery and trims a 3 min/tab
  // baseline of API calls from inactive background pages.
  var refreshTimerId = null;

  function startRefreshTimer() {
    if (refreshTimerId != null) return;
    refreshTimerId = window.setInterval(function () {
      loadLiveWaits({ refresh: true, parkId: activeLiveParkId, useFeatured: false });
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
      loadLiveWaits({ refresh: true, parkId: activeLiveParkId, useFeatured: false });
      startRefreshTimer();
    } else {
      stopRefreshTimer();
    }
  });

  window.addEventListener('online', function () {
    loadLiveWaits({ refresh: true, parkId: activeLiveParkId, useFeatured: false });
  });
})();
