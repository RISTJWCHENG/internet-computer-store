/* CATALOG_UNIFY_FOUR_TITLE_LAYOUT_V1 */
(() => {
  'use strict';

  if (window.__catalogFourTitlesInstalled) return;
  window.__catalogFourTitlesInstalled = true;

  const css = document.createElement('style');
  css.textContent = `
    #app.wrap > .page .catalog-unified-page-title {
      font-size: 20px !important;
      font-weight: 600 !important;
      line-height: 1.3 !important;
      letter-spacing: normal !important;
      text-align: left !important;
      text-transform: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      max-width: 100% !important;
    }
  `;
  document.head.appendChild(css);

  let currentPage = null;
  let savedTransform = '';
  let savedPriority = '';
  let pending = false;

  function reset() {
    if (!currentPage || !currentPage.isConnected) return;

    if (savedTransform) {
      currentPage.style.setProperty(
        'transform', savedTransform, savedPriority
      );
    } else {
      currentPage.style.removeProperty('transform');
    }
  }

  function align() {
    pending = false;
    reset();

    const app = document.getElementById('app');
    const nav = document.querySelector('.navrow');
    const page = app && app.querySelector(':scope > .page');

    currentPage = null;

    if (!app || !nav || !page) return;

    const route = (
      (window.location.hash || '#/explore')
        .slice(1).split('?')[0] || '/explore'
    );

    let title = null;

    if (route === '/explore') {
      const params = new URLSearchParams(
        (window.location.hash.split('?')[1] || '')
      );

      if (
        !params.has('source') &&
        !params.has('cat')
      ) {
        title = page.querySelector('section > h2');
      } else if (params.get('source') === 'sns') {
        title = page.querySelector(':scope > h1');
      }
    } else if (route === '/search') {
      const params = new URLSearchParams(
        (window.location.hash.split('?')[1] || '')
      );

      if (params.get('sort') === 'updated') {
        title = page.querySelector(':scope > h1');
      }
    } else if (route === '/submit') {
      title = page.querySelector(':scope > h1');
    }

    if (!title) return;

    title.classList.add('catalog-unified-page-title');

    if (window.innerWidth < 1024) return;

    currentPage = page;
    savedTransform = page.style.getPropertyValue('transform');
    savedPriority = page.style.getPropertyPriority('transform');

    // Shared position relative to the main navigation.
    // This is the SNS-style desktop title reference.
    const desiredTop = nav.getBoundingClientRect().bottom + 116;
    const actualTop = title.getBoundingClientRect().top;
    const delta = Math.round(desiredTop - actualTop);

    if (Math.abs(delta) > 1) {
      const existing = getComputedStyle(page).transform;

      if (existing === 'none') {
        page.style.setProperty(
          'transform',
          `translateY(${delta}px)`,
          'important'
        );
      } else {
        page.style.setProperty(
          'transform',
          `${existing} translateY(${delta}px)`,
          'important'
        );
      }
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(align);
    });
  }

  function start() {
    const app = document.getElementById('app');
    if (!app) return;

    new MutationObserver(records => {
      if (records.some(r => r.type === 'childList')) {
        schedule();
      }
    }).observe(app, {
      childList: true,
      subtree: false
    });

    window.addEventListener('hashchange', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }

    schedule();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {
      once: true
    });
  } else {
    start();
  }
})();