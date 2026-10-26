(() => {
  'use strict';

  if (window.__catalogVoteSwapInstalled) return;
  window.__catalogVoteSwapInstalled = true;

  const css = document.createElement('style');
  css.textContent = `
    .catalog-vote-buttons > button.catalog-vote-down {
      color: #c56a73 !important;
      margin-left: 0 !important;
    }

    .catalog-vote-buttons > button.catalog-vote-up {
      color: #27845c !important;
      margin-left: auto !important;
    }

    .catalog-vote-buttons > button {
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      text-decoration: none !important;
    }

    .catalog-vote-buttons > button svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .catalog-vote-buttons .catalog-thumb-down {
      transform: rotate(180deg);
    }
  `;
  document.head.appendChild(css);

  const ns = 'http://www.w3.org/2000/svg';

  function icon(down) {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    if (down) svg.classList.add('catalog-thumb-down');

    const p1 = document.createElementNS(ns, 'path');
    p1.setAttribute('d', 'M7 10v12');

    const p2 = document.createElementNS(ns, 'path');
    p2.setAttribute(
      'd',
      'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z'
    );

    svg.append(p1, p2);
    return svg;
  }

  function enhance(row) {
    if (row.dataset.catalogVoteSwapped === '1') return;

    const buttons = Array.from(row.children).filter(
      el => el.tagName === 'BUTTON'
    );

    const up = buttons.find(
      el => /\bupvote\b/i.test(el.textContent)
    );
    const down = buttons.find(
      el => /\bdownvote\b/i.test(el.textContent)
    );

    if (!up || !down || up === down) return;

    row.dataset.catalogVoteSwapped = '1';

    up.classList.add('catalog-vote-up');
    down.classList.add('catalog-vote-down');

    up.insertBefore(icon(false), up.firstChild);
    down.insertBefore(icon(true), down.firstChild);

    // Move the existing buttons, preserving listeners and states.
    row.append(down, up);
  }

  let pending = false;

  function scan() {
    pending = false;
    document.querySelectorAll('.catalog-vote-buttons')
      .forEach(enhance);
  }

  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(scan);
  }

  function start() {
    const app = document.getElementById('app');
    if (!app) return;

    new MutationObserver(schedule).observe(app, {
      childList: true,
      subtree: true
    });

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