/* CATALOG_FOUR_HEADINGS_CONSISTENT_V2 */
(() => {
  'use strict';

  if (window.__catalogFourHeadingsV2) return;
  window.__catalogFourHeadingsV2 = true;

  const style = document.createElement('style');
  style.textContent = `
    #app .catalog-consistent-heading {
      font-size: 20px !important;
      font-weight: 600 !important;
      line-height: 1.3 !important;
      letter-spacing: normal !important;
      text-align: left !important;
      text-transform: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      width: auto !important;
    }
  `;
  document.head.appendChild(style);

  let previousPage = null;
  let originalPadding = '';
  let originalPriority = '';
  let queued = false;

  function restore() {
    if (!previousPage || !previousPage.isConnected) return;

    if (originalPadding) {
      previousPage.style.setProperty(
        'padding-top',
        originalPadding,
        originalPriority
      );
    } else {
      previousPage.style.removeProperty('padding-top');
    }
  }

  function findTitle(page) {
    const hash = location.hash || '#/explore';
    const route = hash.slice(1).split('?')[0] || '/explore';
    const query = new URLSearchParams(
      hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : ''
    );

    if (route === '/explore') {
      if (query.get('source') === 'sns') {
        return page.querySelector(':scope > h1');
      }

      if (!query.has('source') && !query.has('cat')) {
        return page.querySelector(':scope > section > h2');
      }
    }

    if (
      route === '/search' &&
      query.get('sort') === 'updated'
    ) {
      return page.querySelector(':scope > h1');
    }

    if (route === '/submit') {
      return page.querySelector(':scope > h1');
    }

    return null;
  }

  function align() {
    queued = false;
    restore();

    const app = document.getElementById('app');
    const nav = document.querySelector('.navrow');
    const page = app && app.querySelector(':scope > .page');

    previousPage = null;

    if (!app || !nav || !page) return;

    const title = findTitle(page);
    if (!title) return;

    title.classList.add('catalog-consistent-heading');

    // Leave the mobile layout intact.
    if (window.innerWidth < 1024) return;

    previousPage = page;
    originalPadding = page.style.getPropertyValue('padding-top');
    originalPriority = page.style.getPropertyPriority('padding-top');

    // All four headings share one desktop reference line.
    const targetTop = nav.getBoundingClientRect().bottom + 116;
    const actualTop = title.getBoundingClientRect().top;
    const difference = Math.round(targetTop - actualTop);

    if (Math.abs(difference) <= 1) return;

    const padding = parseFloat(
      getComputedStyle(page).paddingTop
    ) || 0;

    const adjusted = Math.max(0, padding + difference);

    page.style.setProperty(
      'padding-top',
      `${adjusted}px`,
      'important'
    );
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => requestAnimationFrame(align));
  }

  function start() {
    const app = document.getElementById('app');
    if (!app) return;

    new MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) {
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