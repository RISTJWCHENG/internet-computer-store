(() => {
  'use strict';
  if (window.__catalogCardPillDetail) return;
  window.__catalogCardPillDetail = true;
  const css = document.createElement('style');
  css.textContent = `
    .grid > .card.catalog-project-card .catalog-card-more-slot {
      display:flex !important; flex-wrap:wrap !important; align-items:center !important;
      gap:7px !important; height:auto !important; min-height:34px !important;
      flex:0 0 auto !important; overflow:visible !important;
    }
    .grid > .card.catalog-project-card .catalog-inline-actions {
      display:flex !important; flex-wrap:wrap !important; gap:7px !important; align-items:center !important;
    }
    .grid > .card.catalog-project-card .catalog-card-toggle,
    .grid > .card.catalog-project-card .catalog-inline-actions a,
    .grid > .card.catalog-project-card .catalog-inline-actions button {
      box-sizing:border-box !important; display:inline-flex !important;
      align-items:center !important; justify-content:center !important;
      gap:5px !important; padding:7px 11px !important;
      min-height:32px !important; border:1px solid #dbe2ee !important;
      border-radius:999px !important; background:#fff !important;
      color:#285dbe !important; text-decoration:none !important;
      font-size:12px !important; font-weight:500 !important;
      line-height:1.2 !important; white-space:nowrap !important;
      box-shadow:none !important; transition:color .3s ease,border-color .3s ease,
        background-color .3s ease,box-shadow .3s ease,transform .3s ease !important;
    }
    .grid > .card.catalog-project-card .catalog-card-toggle[hidden] {display:none !important;}
    .grid > .card.catalog-project-card .catalog-card-toggle:hover,
    .grid > .card.catalog-project-card .catalog-inline-actions a:hover,
    .grid > .card.catalog-project-card .catalog-inline-actions button:hover {
      color:#7851cf !important; border-color:#8472eb !important;
      background:#f7f5ff !important; text-decoration:none !important;
      box-shadow:0 0 0 2px rgba(132,114,235,.09),0 3px 13px rgba(91,110,220,.12) !important;
      transform:translateY(-1px);
      animation:catalog-pill-hue 2s linear infinite !important;
    }
    .grid > .card.catalog-project-card .catalog-card-toggle:focus-visible,
    .grid > .card.catalog-project-card .catalog-inline-actions a:focus-visible,
    .grid > .card.catalog-project-card .catalog-inline-actions button:focus-visible,
    .grid > .card.catalog-project-card .catalog-detail-tap:focus-visible {
      outline:2px solid #725be8 !important; outline-offset:3px !important;
    }
    .grid > .card.catalog-project-card .catalog-card-toggle,
    .grid > .card.catalog-project-card .catalog-card-toggle:hover {text-decoration:none !important;}
    .grid > .card.catalog-project-card .catalog-detail-tap {cursor:pointer;}
    .grid > .card.catalog-project-card h3.catalog-detail-tap:hover {color:#5c59cc;}
    @keyframes catalog-pill-hue {
      0%,100% {border-color:#738de2;color:#3867bc;}
      50% {border-color:#bc69bd;color:#a14aa1;}
    }
    @media (prefers-reduced-motion:reduce) {
      .grid > .card.catalog-project-card .catalog-card-toggle:hover,
      .grid > .card.catalog-project-card .catalog-inline-actions a:hover,
      .grid > .card.catalog-project-card .catalog-inline-actions button:hover {
        animation:none !important; transform:none !important;
      }
    }
  `;
  document.head.appendChild(css);

  function enhance(card) {
    const heading = card.querySelector('h3');
    const details = Array.from(card.querySelectorAll('a[href]'))
      .find(a => a.textContent.trim().toLowerCase() === 'project details');
    if (!heading || !details) return;
    const href = details.getAttribute('href');
    if (!href || href === '#' || href.startsWith('javascript:')) return;

    function makeClickTarget(element) {
      if (!element || element.dataset.catalogDetailTarget === '1') return;
      if (element.closest('a,button')) return;
      element.dataset.catalogDetailTarget = '1';
      element.classList.add('catalog-detail-tap');
      element.setAttribute('role', 'link');
      element.setAttribute('tabindex', '0');
      element.setAttribute('aria-label', 'View details: ' + heading.textContent.trim());
      function open() { details.click(); }
      element.addEventListener('click', (event) => {
        if (event.target.closest('a,button') && event.target !== element) return;
        open();
      });
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault(); open();
        }
      });
    }
    makeClickTarget(heading);
    const header = heading.closest('.row') || heading.parentElement?.parentElement;
    if (header) {
      const logo = header.querySelector('img, svg, .logo');
      if (logo && !logo.contains(heading)) {
        if (logo.closest('a[href]')) {
          // Preserve existing logo link if there is one.
        } else {
          makeClickTarget(logo);
        }
      }
    }
    const readMore = card.querySelector('.catalog-card-toggle');
    if (readMore && readMore.textContent !== 'Read More') {
      readMore.textContent = 'Read More';
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.querySelectorAll('.grid > .card.catalog-project-card').forEach(enhance);
    });
  }
  function start() {
    const app = document.getElementById('app');
    if (!app) return;
    new MutationObserver(records => {
      if (records.some(r => r.type === 'childList' &&
        Array.from(r.addedNodes).some(n => n.nodeType === 1 &&
          (n.matches?.('.card, .catalog-card-more-slot, .catalog-inline-actions') ||
           n.querySelector?.('.card, .catalog-card-more-slot, .catalog-inline-actions'))))) schedule();
    }).observe(app, {subtree:true,childList:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();