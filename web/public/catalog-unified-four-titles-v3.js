/* CATALOG_UNIFIED_FOUR_TITLES_V3 */
(() => {
  "use strict";

  const titles = new Set([
    "Explore the Internet Computer Ecosystem",
    "Discover the ICP Community & Social Ecosystem",
    "Discover Newly Indexed Projects",
    "Submit Your Project to the ICP Ecosystem"
  ]);

  const style = document.createElement("style");
  style.textContent = `
    #app .catalog-four-title-v3 {
      font-family: inherit !important;
      font-size: 20px !important;
      font-weight: 600 !important;
      line-height: 26px !important;
      letter-spacing: normal !important;
      text-align: left !important;
      text-transform: none !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
  `;
  document.head.appendChild(style);

  let current = null;
  let savedMargin = "";
  let savedPriority = "";
  let queued = false;

  function restore() {
    if (!current || !current.isConnected) return;

    if (savedMargin) {
      current.style.setProperty(
        "margin-top", savedMargin, savedPriority
      );
    } else {
      current.style.removeProperty("margin-top");
    }
  }

  function findHeading() {
    const page = document.querySelector("#app.wrap > .page");
    if (!page) return null;

    const candidates = page.querySelectorAll("h1, section > h2");

    for (const heading of candidates) {
      if (titles.has(heading.textContent.trim())) {
        return heading;
      }
    }

    return null;
  }

  function align() {
    queued = false;
    restore();
    current = null;

    const nav = document.querySelector(".navrow");
    const heading = findHeading();

    if (!nav || !heading) return;

    heading.classList.add("catalog-four-title-v3");

    // Do not force desktop positioning on narrow screens.
    if (window.innerWidth < 1024) return;

    current = heading;
    savedMargin = heading.style.getPropertyValue("margin-top");
    savedPriority = heading.style.getPropertyPriority("margin-top");

    // One shared top reference for all four headings.
    const desiredTop = nav.getBoundingClientRect().bottom + 116;
    const actualTop = heading.getBoundingClientRect().top;
    const difference = Math.round(desiredTop - actualTop);

    if (Math.abs(difference) <= 1) return;

    const originalMargin =
      parseFloat(getComputedStyle(heading).marginTop) || 0;

    heading.style.setProperty(
      "margin-top",
      `${originalMargin + difference}px`,
      "important"
    );
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
      if (records.some(record => record.type === "childList")) {
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