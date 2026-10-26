/* CATALOG_EXACT_FOUR_TITLES_V1 */
(() => {
  "use strict";

  if (window.__catalogExactFourTitles) return;
  window.__catalogExactFourTitles = true;

  const names = new Set([
    "Explore the Internet Computer Ecosystem",
    "Discover the ICP Community & Social Ecosystem",
    "Discover Newly Indexed Projects",
    "Submit Your Project to the ICP Ecosystem"
  ]);

  const style = document.createElement("style");
  style.textContent = `
    #app.wrap .catalog-exact-four-title {
      font-family: inherit !important;
      font-size: 20px !important;
      font-weight: 600 !important;
      line-height: 26px !important;
      letter-spacing: normal !important;
      text-align: left !important;
      text-transform: none !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding: 0 !important;
    }
  `;
  document.head.appendChild(style);

  let previousPage = null;
  let originalMargin = "";
  let originalPriority = "";
  let queued = false;

  function restore() {
    if (!previousPage || !previousPage.isConnected) return;

    if (originalMargin) {
      previousPage.style.setProperty(
        "margin-top",
        originalMargin,
        originalPriority
      );
    } else {
      previousPage.style.removeProperty("margin-top");
    }
  }

  function align() {
    queued = false;
    restore();
    previousPage = null;

    const app = document.getElementById("app");
    const nav = document.querySelector(".navrow");
    const page = app &&
      app.querySelector(":scope > .page");

    if (!page || !nav) return;

    let heading = null;

    for (const el of page.querySelectorAll("h1, h2")) {
      if (names.has(el.textContent.trim())) {
        heading = el;
        break;
      }
    }

    if (!heading) return;

    heading.classList.add("catalog-exact-four-title");

    if (window.innerWidth < 1024) return;

    previousPage = page;
    originalMargin =
      page.style.getPropertyValue("margin-top");
    originalPriority =
      page.style.getPropertyPriority("margin-top");

    // SNS heading is the desktop reference:
    // 116px below the navigation's lower edge.
    const targetTop =
      nav.getBoundingClientRect().bottom + 116;

    const targetLeft =
      app.getBoundingClientRect().left;

    const box = heading.getBoundingClientRect();

    const deltaY = Math.round(targetTop - box.top);
    const deltaX = Math.round(targetLeft - box.left);

    if (Math.abs(deltaY) > 1) {
      const computed =
        parseFloat(getComputedStyle(page).marginTop) || 0;

      page.style.setProperty(
        "margin-top",
        `${computed + deltaY}px`,
        "important"
      );
    }

    // Correct only the heading's horizontal offset,
    // without moving the sidebar or entire card grid.
    if (Math.abs(deltaX) > 1) {
      heading.style.setProperty(
        "position", "relative", "important"
      );
      heading.style.setProperty(
        "left", `${deltaX}px`, "important"
      );
    } else {
      heading.style.removeProperty("left");
    }
  }

  function schedule() {
    if (queued) return;
    queued = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(align);
    });
  }

  function start() {
    const app = document.getElementById("app");
    if (!app) return;

    new MutationObserver(records => {
      if (records.some(r => r.type === "childList")) {
        schedule();
      }
    }).observe(app, {
      childList: true,
      subtree: false
    });

    window.addEventListener("hashchange", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("load", schedule);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(schedule);
    }

    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();