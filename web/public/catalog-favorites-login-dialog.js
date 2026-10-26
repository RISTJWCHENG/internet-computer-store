(() => {
  const STYLE_ID = 'catalog-favorites-login-dialog-style';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* CATALOG_SAVE_MATCH_VOTE_DIALOG_V1 */

      .catalog-fav-login-dialog {
        position: relative !important;
        width: min(390px, calc(100vw - 32px)) !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        background: #ffffff !important;
        border: 2px solid #d1d5db !important;
        border-radius: 20px !important;
        box-shadow: 0 14px 45px rgba(15,23,42,.16) !important;
        padding: 46px 24px 24px !important;
      }

      .catalog-fav-login-copy {
        color: #6b7280 !important;
        font-size: 15px !important;
        line-height: 1.6 !important;
        text-align: center !important;
        margin: 0 0 22px !important;
        padding: 0 !important;
      }

      .catalog-fav-login-actions {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        align-self: stretch !important;
      }

      .catalog-fav-login-dialog
      .catalog-fav-login-actions button {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        height: 40px !important;
        min-height: 40px !important;
        box-sizing: border-box !important;
        padding: 0 12px !important;
        margin: 0 !important;
        border: none !important;
        border-radius: 999px !important;
        background: #243653 !important;
        color: #ffffff !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
      }

      .catalog-fav-login-close {
        position: absolute !important;
        top: 10px !important;
        right: 12px !important;
        width: 32px !important;
        height: 32px !important;
        border: none !important;
        border-radius: 50% !important;
        background: transparent !important;
        color: #6b7280 !important;
        cursor: pointer !important;
        font-size: 23px !important;
        line-height: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .catalog-fav-login-close:hover {
        background: #f3f4f6 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function textOf(el) {
    return (el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findCandidateDialogs() {
    const nodes = Array.from(
      document.querySelectorAll('[role="dialog"], dialog, .modal, .popup, .sheet')
    );

    return nodes.filter(node => {
      const t = textOf(node).toLowerCase();
      return (
        t.includes('internet identity') &&
        (t.includes('my favorites') || t.includes('save this app'))
      );
    });
  }

  /* CATALOG_SAVE_NATIVE_CLOSE_V1: preserve upstream dismiss state. */
  function closeDialog(dialog) {
    const buttons = Array.from(dialog.querySelectorAll('button'));

    // Use the original Cancel event handler.
    const cancel = buttons.find(btn =>
      /^cancel$/i.test(textOf(btn))
    );

    if (cancel) {
      cancel.click();
      return;
    }

    // Support versions with an original Close button.
    const originalClose = buttons.find(btn => {
      if (btn.classList.contains('catalog-fav-login-close')) {
        return false;
      }
      const label = btn.getAttribute('aria-label') || '';
      return /^(close|cancel|×|✕)$/i.test(textOf(btn)) ||
             /close/i.test(label);
    });

    if (originalClose) {
      originalClose.click();
      return;
    }

    // Preserve native dialog lifecycle.
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }

    // Ask original handlers to dismiss the dialog.
    // Never directly remove the overlay.
    const overlay = dialog.parentElement;

    if (overlay && overlay !== document.body) {
      overlay.click();
    } else {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true
        })
      );
    }
  }

  function patchDialog(dialog) {
    if (!dialog || dialog.dataset.catalogFavLoginPatched === '1') return;

    injectStyle();

    const allButtons = Array.from(dialog.querySelectorAll('button'));
    const continueBtn = allButtons.find(btn =>
      /internet identity|continue/i.test(textOf(btn))
    );

    if (!continueBtn) return;

    dialog.dataset.catalogFavLoginPatched = '1';
    dialog.classList.add('catalog-fav-login-dialog');

    const cancelBtn = allButtons.find(btn => /^cancel$/i.test(textOf(btn)));
    if (cancelBtn) {
      // Hide the original button without removing its handler.
      cancelBtn.style.setProperty('display', 'none', 'important');
      cancelBtn.setAttribute('aria-hidden', 'true');
      cancelBtn.tabIndex = -1;
    }

    const oldHeading = Array.from(dialog.querySelectorAll('h1,h2,h3,h4,strong')).find(el =>
      /sign in|save|favorites/i.test(textOf(el))
    );
    if (oldHeading) oldHeading.remove();

    let copyEl = Array.from(dialog.querySelectorAll('p,div,span')).find(el =>
      /please sign in with internet identity to save this app to my favorites/i.test(textOf(el))
    );

    if (!copyEl) {
      copyEl = document.createElement('p');
      copyEl.textContent =
        'Please sign in with Internet Identity to save it.';
      dialog.insertBefore(copyEl, continueBtn);
    } else {
      copyEl.textContent =
        'Please sign in with Internet Identity to save it.';
    }

    copyEl.className = 'catalog-fav-login-copy';

    let closeBtn = dialog.querySelector('.catalog-fav-login-close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'catalog-fav-login-close';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => closeDialog(dialog));
      dialog.appendChild(closeBtn);
    }

    let actionWrap = continueBtn.closest('.catalog-fav-login-actions');
    if (!actionWrap) {
      actionWrap = document.createElement('div');
      actionWrap.className = 'catalog-fav-login-actions';
      continueBtn.parentNode.insertBefore(actionWrap, continueBtn);
      actionWrap.appendChild(continueBtn);
    }

    continueBtn.textContent = 'Continue with Internet Identity';
  }

  function scan() {
    findCandidateDialogs().forEach(patchDialog);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  window.addEventListener('load', scan, { once: true });
})();