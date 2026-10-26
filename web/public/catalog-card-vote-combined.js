(() => {
  'use strict';

  if (window.__catalogVoteLayoutInstalled) return;
  window.__catalogVoteLayoutInstalled = true;

  const style = document.createElement('style');

  style.textContent = `
    .grid > .catalog-project-card.catalog-vote-layout {
      display: flex !important;
      flex-direction: column !important;
      height: auto !important;
      min-height: 330px !important;
      max-height: none !important;
      overflow: visible !important;
    }

    .catalog-vote-layout > .catalog-card-more-slot {
      display: flex !important;
      align-items: center !important;
      flex-wrap: wrap !important;
      gap: 7px !important;
      height: auto !important;
      min-height: 36px !important;
      flex: 0 0 auto !important;
    }

    .catalog-vote-layout .catalog-card-toggle {
      display: inline-flex !important;
      align-items: center;
      border: 1px solid #d9e0ec !important;
      border-radius: 999px !important;
      padding: 7px 11px !important;
      background: white !important;
      color: #235ed3 !important;
      font-size: 12px !important;
      white-space: nowrap;
    }

    .catalog-vote-layout .catalog-inline-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 7px;
      min-width: 0;
    }

    .catalog-vote-layout .catalog-inline-actions .btn {
      padding: 7px 10px !important;
      font-size: 12px !important;
      white-space: nowrap;
    }

    .catalog-vote-layout > .acts {
      display: none !important;
    }

    .catalog-vote-layout .catalog-vote-panel {
      margin-top: auto;
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .catalog-vote-layout .catalog-vote-summary {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: #6b7280;
      font-size: 11px;
    }

    .catalog-vote-layout .catalog-vote-track {
      display: flex;
      width: 100%;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: #e8edf1;
    }

    .catalog-vote-layout .catalog-vote-up-bar {
      width: 0%;
      height: 100%;
      background: #71bda2;
    }

    .catalog-vote-layout .catalog-vote-down-bar {
      width: 0%;
      height: 100%;
      background: #e7a3a6;
    }

    .catalog-vote-layout .catalog-vote-buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding-top: 7px;
    }

    .catalog-vote-layout .catalog-vote-buttons button {
      appearance: none;
      background: transparent !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 6px 0 !important;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .catalog-vote-layout .catalog-vote-buttons button:first-child {
      color: #27845c;
    }

    .catalog-vote-layout .catalog-vote-buttons button:last-child {
      color: #bc5960;
      margin-left: auto;
    }

    .catalog-vote-layout .catalog-vote-buttons button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    @media (max-width: 520px) {
      .grid > .catalog-project-card.catalog-vote-layout {
        min-height: 330px !important;
      }
    }
  `;

  document.head.appendChild(style);

  function disabledButton(name) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.disabled = true;
    button.title = 'ICP voting backend not yet connected';
    return button;
  }

  function parseCount(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      return null;
    }
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : null;
  }

  function updateVotes(card) {
    const count = card.querySelector('.catalog-vote-count');
    const upBar = card.querySelector('.catalog-vote-up-bar');
    const downBar = card.querySelector('.catalog-vote-down-bar');
    const track = card.querySelector('.catalog-vote-track');

    if (!count || !upBar || !downBar || !track) return;

    const up = parseCount(card.dataset.voteUpCount);
    const down = parseCount(card.dataset.voteDownCount);

    if (up === null || down === null) {
      count.textContent = 'Votes unavailable';
      upBar.style.width = '0%';
      downBar.style.width = '0%';
      track.setAttribute('aria-label', 'Vote totals unavailable');
      return;
    }

    const total = up + down;

    if (total === 0) {
      count.textContent = 'No votes yet';
      upBar.style.width = '0%';
      downBar.style.width = '0%';
      track.setAttribute('aria-label', 'No votes yet');
      return;
    }

    const upPercent = up / total * 100;
    const downPercent = 100 - upPercent;

    upBar.style.width = upPercent + '%';
    downBar.style.width = downPercent + '%';

    count.textContent =
      Math.round(upPercent) + '% up / ' +
      Math.round(downPercent) + '% down (' +
      total + ' votes)';

    track.setAttribute(
      'aria-label',
      up + ' upvotes and ' + down + ' downvotes'
    );
  }

  function improve(card) {
    if (card.dataset.catalogVoteReady === '1') {
      updateVotes(card);
      return;
    }

    const slot = card.querySelector(':scope > .catalog-card-more-slot');
    const actions = card.querySelector(':scope > .acts');

    if (!slot || !actions) return;

    card.dataset.catalogVoteReady = '1';
    card.classList.add('catalog-vote-layout');

    const more = slot.querySelector('.catalog-card-toggle');

    if (more) {
      more.textContent = 'Read More';
    }

    const inline = document.createElement('div');
    inline.className = 'catalog-inline-actions';

    while (actions.firstChild) {
      inline.appendChild(actions.firstChild);
    }

    slot.appendChild(inline);

    const panel = document.createElement('div');
    panel.className = 'catalog-vote-panel';

    const summary = document.createElement('div');
    summary.className = 'catalog-vote-summary';

    const title = document.createElement('span');
    title.textContent = 'Community Votes';

    const count = document.createElement('span');
    count.className = 'catalog-vote-count';

    summary.append(title, count);

    const track = document.createElement('div');
    track.className = 'catalog-vote-track';
    track.setAttribute('role', 'img');

    const upBar = document.createElement('span');
    upBar.className = 'catalog-vote-up-bar';

    const downBar = document.createElement('span');
    downBar.className = 'catalog-vote-down-bar';

    track.append(upBar, downBar);

    const buttons = document.createElement('div');
    buttons.className = 'catalog-vote-buttons';

    const existingUp = card.querySelector(
      '[data-vote="up"], .catalog-upvote'
    );

    const existingDown = card.querySelector(
      '[data-vote="down"], .catalog-downvote'
    );

    buttons.append(
      existingUp || disabledButton('Upvote'),
      existingDown || disabledButton('Downvote')
    );

    panel.append(summary, track, buttons);
    card.appendChild(panel);

    updateVotes(card);
  }

  let queued = false;

  function scan() {
    queued = false;
    /* CATALOG_CARD_INIT_FIX_V2 */
document.querySelectorAll('.grid > .card').forEach(improve);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }

  function start() {
    const app = document.getElementById('app');
    if (!app) return;

    new MutationObserver(records => {
      const relevant = records.some(record => {
        if (record.type === 'attributes') return true;

        return Array.from(record.addedNodes).some(node =>
          node.nodeType === 1 && (
            node.matches?.('.catalog-project-card') ||
            node.querySelector?.('.catalog-project-card')
          )
        );
      });

      if (relevant) schedule();
    }).observe(app, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'data-vote-up-count',
        'data-vote-down-count'
      ]
    });

    schedule();
  }

  window.addEventListener('catalog:votes-updated', schedule);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();