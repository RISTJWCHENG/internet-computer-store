(() => {
  "use strict";

  const MESSAGE =
    "Projects are indexed from public sources. " +
    "Listing does not imply security verification or endorsement.";

  const css = document.createElement("style");
  css.textContent = `
    .catalog-centered-notice {
      display: block;
      max-width: 900px;
      width: calc(100% - 32px);
      margin: 14px auto 0 !important;
      padding: 0 !important;
      border: none !important;
      border-left: none !important;
      background: transparent !important;
      box-shadow: none !important;
      color: #667085;
      text-align: center !important;
      font-size: 12.5px;
      font-weight: 400;
      line-height: 1.7;
    }

    @media (max-width: 640px) {
      .catalog-centered-notice {
        font-size: 11.5px;
        max-width: 95%;
        margin-top: 12px !important;
      }
    }
  `;
  document.head.appendChild(css);

  function update() {
    const nav = document.querySelector("#mast .navrow") ||
                document.querySelector(".navrow");

    if (!nav) return;

    let notice = document.querySelector(".catalog-centered-notice");

    if (!notice) {
      notice = document.createElement("p");
      notice.className = "catalog-centered-notice";
    }

    notice.textContent = MESSAGE;

    if (notice.previousElementSibling !== nav) {
      nav.insertAdjacentElement("afterend", notice);
    }

    // Remove duplicate disclaimer in page content.
    document.querySelectorAll("#app .note").forEach(p => {
      const text = (p.textContent || "").trim();

      if (
        text.includes("Projects are indexed from public sources") ||
        text.includes("Listing does not imply security verification") ||
        text.includes("Collected automatically from public sources")
      ) {
        p.remove();
      }
    });
  }

  let scheduled = false;

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  new MutationObserver(scheduleUpdate).observe(
    document.body,
    { childList: true, subtree: true }
  );

  window.addEventListener("hashchange", scheduleUpdate);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", update, { once: true });
  } else {
    update();
  }
})();