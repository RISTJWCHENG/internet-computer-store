/* CATALOG_TITLE_GEOMETRY_V4 */
(() => {
  "use strict";

  if (window.__catalogTitleGeometryV4) return;
  window.__catalogTitleGeometryV4 = true;

  const names = new Set([
    "Explore the Internet Computer Ecosystem",
    "Discover the ICP Community & Social Ecosystem",
    "Discover Newly Indexed Projects",
    "Submit Your Project to the ICP Ecosystem"
  ]);

  const style = document.createElement("style");
  style.textContent = `
    #app.wrap .catalog-title-geometry-v4 {
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

  let lastPage = null;
  let initialTranslate = "";
  let initialPriority = "";
  let pending = false;

  function restore() {
    if (!lastPage || !lastPage.isConnected) return;

    if (initialTranslate) {
      lastPage.style.setProperty(
        "translate", initialTranslate, initialPriority
      );
    } else {
      lastPage.style.removeProperty("translate");
    }
  }

  function findHeading(page) {
    for (const node of page.querySelectorAll("h1, h2")) {
      if (names.has(node.textContent.trim())) return node;
    }
    return null;
  }

  function align() {
    pending = false;

    restore();
    lastPage = null;

    const app = document.getElementById("app");
    const nav = document.querySelector(".navrow");
    const page = app &&
      app.querySelector(":scope > .page");

    if (!page || !nav) return;

    const heading = findHeading(page);
    if (!heading) return;

    heading.classList.add("catalog-title-geometry-v4");

    // Use existing responsive layout on mobile.
    if (window.innerWidth < 1024) return;

    lastPage = page;
    initialTranslate =
      page.style.getPropertyValue("translate");
    initialPriority =
      page.style.getPropertyPriority("translate");

    // Exactly the same screen coordinate on all four routes.
    const targetX = app.getBoundingClientRect().left;
    const targetY = nav.getBoundingClientRect().bottom + 116;

    const box = heading.getBoundingClientRect();

    const dx = Math.round(targetX - box.left);
    const dy = Math.round(targetY - box.top);

    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return;

    // Move the entire page content together.
    // This does not alter sidebar or navbar positioning.
    page.style.setProperty(
      "translate",
      `${dx}px ${dy}px`,
      "important"
    );
  }

  function schedule() {
    if (pending) return;
    pending = true;

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
      subtree: true
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