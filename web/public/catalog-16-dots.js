(() => {
  "use strict";

  const GRAY = "#8996a8";
  const COLORS = [
    "#ff5577", "#f59e0b", "#ffd166",
    "#16c79a", "#00b8f0", "#4776ff",
    "#9a64f5", "#ed61c6"
  ];

  const style = document.createElement("style");
  style.textContent = `
    /* Keep the original icon button size */
    .ow-apps-btn,
    .ow-apps-btn:hover,
    .ow-apps-btn:active,
    .ow-apps-btn:focus,
    .ow-apps-btn:focus-visible {
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      background-color: transparent !important;
      box-shadow: none !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .ow-apps-btn:focus-visible {
      outline: 2px solid #9bb7ff !important;
      outline-offset: 2px;
      border-radius: 8px !important;
    }

    .ow-apps-btn::before,
    .ow-apps-btn::after {
      background: transparent !important;
      box-shadow: none !important;
    }

    .ow-apps-btn svg.catalog-dots16 {
      width: 36px !important;
      height: 36px !important;
      min-width: 36px !important;
      min-height: 36px !important;
      display: block !important;
      flex-shrink: 0 !important;
      overflow: visible;
    }

    .catalog-dots16 circle {
      transition: fill 50ms linear;
    }

    @media (prefers-reduced-motion: reduce) {
      .catalog-dots16 circle {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  function createIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    svg.setAttribute("viewBox", "0 0 40 40");
    svg.setAttribute("width", "36");
    svg.setAttribute("height", "36");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("catalog-dots16");

    // 4 x 4 evenly spaced dots
    for (let i = 0; i < 16; i++) {
      const dot = document.createElementNS(ns, "circle");

      dot.setAttribute("cx", String(7 + (i % 4) * 8.7));
      dot.setAttribute("cy", String(7 + Math.floor(i / 4) * 8.7));
      dot.setAttribute("r", "2.2");
      dot.setAttribute("fill", GRAY);

      svg.appendChild(dot);
    }

    return svg;
  }

  function enhance(button) {
    if (button.querySelector("svg.catalog-dots16")) return;

    const svg = createIcon();
    const old = button.querySelector("svg");

    if (old) old.replaceWith(svg);
    else button.prepend(svg);

    const dots = [...svg.querySelectorAll("circle")];
    let timer = null;

    function reset() {
      dots.forEach(dot => dot.setAttribute("fill", GRAY));
    }

    function flash() {
      reset();

      const positions = Array.from(
        { length: 16 }, (_, i) => i
      );

      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] =
          [positions[j], positions[i]];
      }

      const count = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const color = COLORS[
          Math.floor(Math.random() * COLORS.length)
        ];

        dots[positions[i]].setAttribute("fill", color);
      }
    }

    function start() {
      if (timer !== null) return;

      flash();

      if (!window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches) {
        timer = window.setInterval(flash, 100);
      }
    }

    function stop() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      reset();
    }

    button.addEventListener("pointerenter", start);
    button.addEventListener("pointerleave", stop);
    button.addEventListener("blur", stop);
  }

  function scan() {
    document.querySelectorAll(".ow-apps-btn")
      .forEach(enhance);
  }

  let scheduled = false;

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  function init() {
    scan();

    new MutationObserver(schedule).observe(
      document.body,
      { childList: true, subtree: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded", init, { once: true }
    );
  } else {
    init();
  }
})();