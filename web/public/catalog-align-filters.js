/* CATALOG_ALIGN_FIVE_PAGES_V1 */
(() => {
  'use strict';

  let pending = false;
  let activePage = null;
  let savedMargin = '';
  let savedPriority = '';

  function restore() {
    if (activePage && activePage.isConnected) {
      if (savedMargin) {
        activePage.style.setProperty(
          'margin-top',
          savedMargin,
          savedPriority
        );
      } else {
        activePage.style.removeProperty('margin-top');
      }
    }
  }

  function align() {
    pending = false;

    restore();

    const search = document.getElementById('sf');
    const app = document.getElementById('app');
    const page = app && app.querySelector('.page');

    activePage = null;

    if (
      !search ||
      !page ||
      window.innerWidth < 1024
    ) {
      return;
    }

    const hash = window.location.hash || '#/explore';
    const route = hash.slice(1).split('?')[0] || '/explore';

    let target = null;
    let desiredOffset = 0;

    if (route === '/explore') {
      target = page.querySelector('.chips');
    } else if (
      route === '/search' &&
      new URLSearchParams(
        hash.includes('?') ? hash.split('?').slice(1).join('?') : ''
      ).get('sort') === 'updated'
    ) {
      target = page.querySelector('.chips');
    } else if (route === '/submit') {
      target = page.querySelector('h1');
      desiredOffset = -54;
    }

    if (!target) {
      return;
    }

    activePage = page;
    savedMargin = page.style.getPropertyValue('margin-top');
    savedPriority = page.style.getPropertyPriority('margin-top');

    const desiredTop =
      search.getBoundingClientRect().top + desiredOffset;
    const actualTop = target.getBoundingClientRect().top;
    const delta = Math.round(desiredTop - actualTop);

    if (Math.abs(delta) <= 1) {
      return;
    }

    const baseMargin = getComputedStyle(page).marginTop;

    page.style.setProperty(
      'margin-top',
      `calc(${baseMargin} + ${delta}px)`,
      'important'
    );
  }

  function schedule() {
    if (pending) return;

    pending = true;
    requestAnimationFrame(align);
  }

  const app = document.getElementById('app');

  if (app) {
    new MutationObserver(schedule).observe(app, {
      childList: true,
      subtree: true
    });
  }

  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule);
  }

  schedule();
})();