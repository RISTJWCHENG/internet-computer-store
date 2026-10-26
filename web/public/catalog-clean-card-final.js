/* CATALOG_CLEAN_CARD_FINAL_V1 */
(() => {
  'use strict';
  if (window.__catalogCleanCardFinal) return;
  window.__catalogCleanCardFinal = true;
  const style = document.createElement('style');
  style.textContent = `
    #app .grid > .card.catalog-clean-card {
      position:relative !important;
      display:flex !important;
      flex-direction:column !important;
      height:auto !important;
      min-height:0 !important;
      max-height:none !important;
      padding-bottom:15px !important;
    }
    #app .grid > .card.catalog-clean-card > .catalog-card-more-slot,
    #app .grid > .card.catalog-clean-card > .acts {display:none !important;}
    #app .grid > .card.catalog-clean-card .catalog-hidden-fav,
    #app .grid > .card.catalog-clean-card .catalog-hidden-detail {display:none !important;}
    #app .grid > .card.catalog-clean-card > .catalog-website-top {
      display:inline-flex !important;
      align-items:center !important;
      position:absolute !important;
      top:15px !important;
      right:15px !important;
      z-index:3 !important;
      padding:0 !important;
      margin:0 !important;
      min-height:26px !important;
      border:0 !important;
      border-radius:0 !important;
      background:transparent !important;
      box-shadow:none !important;
      color:#3466be !important;
      font-size:12px !important;
      font-weight:600 !important;
      line-height:1.3 !important;
      text-decoration:none !important;
      white-space:nowrap !important;
      animation:none !important;
      transform:none !important;
    }
    #app .grid > .card.catalog-clean-card > .catalog-website-top:hover {
      color:#754cc9 !important;
      text-decoration:none !important;
    }
    #app .grid > .card.catalog-clean-card > .catalog-website-top:focus-visible {
      outline:2px solid #6e63d8 !important;
      outline-offset:3px !important;
    }
    #app .grid > .card.catalog-clean-card > .row:first-child {
      padding-right:96px !important;
    }
        /* CATALOG_DIVIDER_GAP_SAFE_V4 */
    #app .grid > .card.catalog-clean-card > p {
      margin-bottom:0 !important;
    }
#app .grid > .card.catalog-clean-card > .catalog-vote-panel {
      margin-top:8px !important;
      padding-top:8px !important;
      border-top:1px solid #e5e7eb !important;
      gap:8px !important;
      flex:0 0 auto !important;
    }
    #app .grid > .card.catalog-clean-card .catalog-vote-divider {
      display:none !important;
    }
    #app .grid:has(> .card.catalog-clean-card) {align-items:stretch !important;}
  `;
  /* CATALOG_CARD_PRECISION_V5 */
  style.textContent += `
    #app .grid > .card.catalog-clean-card {
      row-gap: 0 !important;
      justify-content: flex-start !important;
    }

    #app .grid > .card.catalog-clean-card > p {
      margin-bottom: 0 !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-vote-panel {
      margin-top: 8px !important;
      padding-top: 8px !important;
      border-top: 1px solid #e5e7eb !important;
      gap: 8px !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top {
      right: 15px !important;
      top: 15px !important;
      border: none !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0 !important;
      min-height: 0 !important;
      text-decoration: none !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top:hover {
      text-decoration: none !important;
    }
  `;
  /* CATALOG_WEBSITE_CIRCLE_FIX_V2 */
  style.textContent += `
    #app .grid > .card.catalog-clean-card
      > .row:first-child button {
      display: none !important;
    }

    #app .grid > .card.catalog-clean-card
      .catalog-hidden-fav {
      display: none !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top {
      display: inline-flex !important;
      position: absolute !important;
      top: 15px !important;
      right: 15px !important;
      align-items: center !important;
      justify-content: flex-end !important;
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      background-image: none !important;
      box-shadow: none !important;
      text-decoration: none !important;
      color: #3466be !important;
      z-index: 5 !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top::before,
    #app .grid > .card.catalog-clean-card
      > .catalog-website-top::after {
      content: none !important;
      display: none !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top:hover {
      color: #754cc9 !important;
      background: transparent !important;
      border: 0 !important;
      box-shadow: none !important;
      text-decoration: none !important;
    }

    #app .grid > .card.catalog-clean-card
      > .catalog-website-top:focus-visible {
      outline: 2px solid #6e63d8 !important;
      outline-offset: 3px !important;
    }
  `;
  document.head.appendChild(style);

  function linkDetail(element, details) {
    if (!element || element.closest('a,button') ||
        element.dataset.catalogDetailTarget === '1' ||
        element.dataset.catalogCleanDetail === '1') return;
    element.dataset.catalogCleanDetail = '1';
    element.setAttribute('role','link');
    element.setAttribute('tabindex','0');
    element.style.cursor = 'pointer';
    const go = () => details.click();
    element.addEventListener('click',go);
    element.addEventListener('keydown',ev => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault(); go();
      }
    });
  }
  function enhance(card) {
    if (card.dataset.catalogCleanCard === '1') return;
    const panel = card.querySelector(':scope > .catalog-vote-panel');
    if (!panel) return;
    const anchors = Array.from(card.querySelectorAll('a[href]'));
    const website = anchors.find(a => /^visit website\b/i.test(a.textContent.trim()));
    const details = anchors.find(a => /^project details$/i.test(a.textContent.trim()));
    if (!website || !details) return;
    const href = details.getAttribute('href');
    if (!href || href === '#' || /^javascript:/i.test(href)) return;
    card.dataset.catalogCleanCard = '1';
    card.classList.add('catalog-clean-card');
    // Reuse the original external link, retaining its destination.
    // ORDOWORLD_REMOVE_WEBSITE_LINK_V4: delete the original card Website anchor from the DOM.
    website.remove();


    details.classList.add('catalog-hidden-detail');
    const header = card.querySelector(':scope > .row') || card.firstElementChild;
    if (header) {
      const favorite = Array.from(header.querySelectorAll('button')).find(b =>
        /^[\s\u2661\u2665]*$/.test(b.textContent) ||
        /favou?rite|wishlist|save/i.test(b.getAttribute('aria-label') || '')
      );
      if (favorite) favorite.remove();
            // CATALOG_REMOVE_HEADER_CIRCLE_V3
      // The original card header has one favorite button.
      // Remove that node, not just the heart icon or styling.
      const headerButtons = Array.from(
        header.querySelectorAll('button')
      );
      if (headerButtons.length === 1) {
        headerButtons[0].remove();
      }
            // CATALOG_REMOVE_RESIDUAL_FAVORITE_NODE_V1
      // Card header buttons are obsolete favorite controls.
      // Website is a separate anchor outside the header.
      for (const button of Array.from(
        header.querySelectorAll('button')
      )) {
        button.remove();
      }

            // CATALOG_DELETE_HEADER_FAVORITE_V1
      // Delete the obsolete favorite controls from the DOM.
      // The external Website link is outside this header.
      for (const oldButton of Array.from(
        header.querySelectorAll('button')
      )) {
        oldButton.remove();
      }
      const heading = header.querySelector('h3');
      linkDetail(heading, details);
      const logo = header.querySelector('img, svg, .logo');
      if (logo && (!heading || !heading.contains(logo))) linkDetail(logo, details);
    }
  }
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      document.querySelectorAll('#app .grid > .card').forEach(enhance);
    });
  }
  function start() {
    const app = document.getElementById('app');
    if (!app) return;
    new MutationObserver(records => {
      if (records.some(r => Array.from(r.addedNodes).some(n =>
        n.nodeType === 1 && (
          n.matches?.('.card, .catalog-vote-panel') ||
          n.querySelector?.('.card, .catalog-vote-panel')
        )
      ))) schedule();
    }).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',schedule);
    schedule();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',start,{once:true});
  } else start();
})();