(() => {
  'use strict';
  const css = document.createElement('style');
  css.textContent = `
    .grid:has(> .catalog-project-card) {
      display: grid !important;
      grid-template-columns: repeat(3,minmax(0,1fr)) !important;
      align-items: stretch !important;
      gap: 16px;
    }
    .grid > .catalog-project-card {
      box-sizing: border-box !important;
      width: 100% !important;
      min-width: 0 !important;
      height: 248px !important;
      min-height: 248px !important;
      max-height: 248px !important;
      align-self: stretch !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px;
      padding: 16px !important;
      border-radius: 16px;
      overflow: hidden;
    }
    .grid > .catalog-project-card > p.catalog-description-clamped {
      display: -webkit-box !important;
      -webkit-box-orient: vertical !important;
      -webkit-line-clamp: 2 !important;
      line-clamp: 2;
      overflow: hidden !important;
      line-height: 1.55 !important;
      height: 3.1em !important;
      min-height: 3.1em !important;
      max-height: 3.1em !important;
      flex: 0 0 3.1em !important;
      margin: 0 !important;
    }
    .grid > .catalog-project-card > .catalog-card-more-slot {
      height: 20px !important;
      min-height: 20px !important;
      flex: 0 0 20px !important;
    }
    .grid > .catalog-project-card .acts {
      margin-top: auto !important;
      padding-top: 4px !important;
      flex-shrink: 0;
    }
    .catalog-card-toggle { border:0; background:transparent; padding:0; color:#3269d7;
      font:500 12px Inter,system-ui,sans-serif; cursor:pointer; }
    .catalog-card-toggle[hidden] { display:none !important; }
    .catalog-card-toggle:hover { text-decoration:underline; }
    .catalog-card-toggle:focus-visible { outline:2px solid #3269d7; outline-offset:3px; }
    .catalog-description-dialog { box-sizing:border-box; width:min(540px,calc(100vw - 32px));
      max-height:75vh; overflow:auto; border:1px solid #e1e5ed; border-radius:16px;
      padding:24px; background:#fff; color:#18202e; box-shadow:0 20px 70px #10182835; }
    .catalog-description-dialog::backdrop { background:#10182882; }
    .catalog-description-dialog h2 { margin:0 40px 16px 0; font-size:18px; }
    .catalog-description-dialog p { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.65; }
    .catalog-description-close { position:absolute; top:14px; right:16px; border:0;
      padding:5px 9px; border-radius:8px; background:#f1f3f7; font-size:18px; cursor:pointer; }
    @media (max-width:1050px) {
      .grid:has(> .catalog-project-card) { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
    }
    @media (max-width:640px) {
      .grid:has(> .catalog-project-card) { grid-template-columns:minmax(0,1fr) !important; }
    }
  `;
  document.head.appendChild(css);

  const dialog = document.createElement('dialog');
  dialog.className = 'catalog-description-dialog';
  dialog.innerHTML = '<button type="button" class="catalog-description-close" aria-label="Close description">×</button><h2></h2><p></p>';
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  function attachDialog() { if (!dialog.isConnected && document.body) document.body.appendChild(dialog); }

  // Measure the unclamped paragraph, not its scrollHeight under line-clamp.
  // Some browsers report scrollHeight larger than clientHeight even for short text.
  function hasOverflow(desc) {
    const width = desc.getBoundingClientRect().width;
    if (width <= 0) return false;
    const computed = getComputedStyle(desc);
    const clone = desc.cloneNode(true);
    clone.className = 'catalog-measure-clone';
    Object.assign(clone.style, {
      position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden',
      pointerEvents: 'none', boxSizing: 'border-box', width: `${width}px`,
      height: 'auto', minHeight: '0', maxHeight: 'none', overflow: 'visible',
      display: 'block', whiteSpace: 'normal',
      font: computed.font, letterSpacing: computed.letterSpacing,
      lineHeight: computed.lineHeight, overflowWrap: computed.overflowWrap,
      wordBreak: computed.wordBreak, padding: '0', margin: '0'
    });
    clone.style.setProperty('-webkit-line-clamp', 'unset', 'important');
    clone.style.setProperty('line-clamp', 'unset', 'important');
    document.body.appendChild(clone);
    try {
      const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.55;
      return clone.getBoundingClientRect().height > lineHeight * 2 + 2;
    } finally { clone.remove(); }
  }

  function measure(card) {
    const desc = card.querySelector(':scope > p.catalog-description-clamped');
    const button = card.querySelector(':scope > .catalog-card-more-slot > .catalog-card-toggle');
    if (desc && button) button.hidden = !hasOverflow(desc);
  }

  function enhance(card) {
    const desc = card.querySelector(':scope > p.mute');
    if (!desc || !card.querySelector(':scope > .acts')) return;
    if (card.dataset.catalogExpandable === '3') return;
    card.dataset.catalogExpandable = '3';
    card.classList.add('catalog-project-card');
    desc.classList.remove('is-expanded');
    desc.classList.add('catalog-description-clamped');
    // Remove stale buttons from the older expandable-card implementation.
    card.querySelectorAll(':scope > .catalog-card-toggle, :scope > .catalog-card-more-slot').forEach(el => el.remove());
    const slot = document.createElement('div');
    slot.className = 'catalog-card-more-slot';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-card-toggle';
    button.textContent = 'Read more';
    button.hidden = true;
    const heading = card.querySelector('h3')?.textContent?.trim() || 'Project description';
    button.setAttribute('aria-label', `Read full description for ${heading}`);
    button.addEventListener('click', () => {
      attachDialog();
      dialog.querySelector('h2').textContent = heading;
      dialog.querySelector('p').textContent = desc.textContent || '';
      dialog.showModal();
    });
    slot.appendChild(button);
    desc.after(slot);
    requestAnimationFrame(() => measure(card));
  }

  function scan() {
    document.querySelectorAll('.grid > .card').forEach(enhance);
    document.querySelectorAll('.grid > .catalog-project-card').forEach(measure);
  }
  let pending = false;
  function queue() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  }
  function start() {
    attachDialog(); scan();
    new MutationObserver(records => {
      if (records.every(record => [...record.addedNodes, ...record.removedNodes].every(node =>
        node.nodeType === 1 && node.classList.contains('catalog-measure-clone')))) return;
      queue();
    }).observe(document.body, {childList:true,subtree:true});
    window.addEventListener('resize', queue, {passive:true});
    document.fonts?.ready.then(queue).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();