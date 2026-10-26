(() => {
  "use strict";

  const COLORS = [
    "#ff477e", "#ff9f1c", "#ffd166",
    "#06d6a0", "#00bbf9", "#4361ee",
    "#9b5de5", "#f15bb5", "#00c49a"
  ];

  const GREY = "#8994a5";
  const DOT_COUNT = 9;

  const style = document.createElement("style");
  style.textContent = `
    .catalog-nine-dots {
      width: 38px !important;
      height: 38px !important;
      display: block !important;
      flex-shrink: 0;
      overflow: visible;
    }

    .catalog-nine-dots circle {
      transition: fill 55ms linear;
    }

    .catalog-nine-button {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-width: 40px;
      min-height: 40px;
      padding: 0 !important;
      vertical-align: middle;
    }

    @media (prefers-reduced-motion: reduce) {
      .catalog-nine-dots circle {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  function findButton() {
    const selectors = [
      "#appsBtn",
      "#appsMenuBtn",
      "#appLauncherBtn",
      "[data-apps-button]",
      "[aria-label='Apps']",
      "[aria-label='Apps menu']",
      "[aria-label='Open apps']",
      "[title='Apps']"
    ];

    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }

    return null;
  }

  function createIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    svg.setAttribute("viewBox", "0 0 40 40");
    svg.setAttribute("width", "38");
    svg.setAttribute("height", "38");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("catalog-nine-dots");

    for (let i = 0; i < DOT_COUNT; i++) {
      const dot = document.createElementNS(ns, "circle");

      dot.setAttribute("cx", String(8 + (i % 3) * 12));
      dot.setAttribute("cy", String(8 + Math.floor(i / 3) * 12));
      dot.setAttribute("r", "3.45");
      dot.setAttribute("fill", GREY);

      svg.appendChild(dot);
    }

    return svg;
  }

  function install(button) {
    if (button.dataset.catalogNineInstalled === "yes") return;

    button.dataset.catalogNineInstalled = "yes";
    button.classList.add("catalog-nine-button");

    const oldIcon = button.querySelector("svg, img, i");
    const icon = createIcon();

    if (oldIcon) {
      oldIcon.replaceWith(icon);
    } else {
      button.prepend(icon);
    }

    const dots = [...icon.querySelectorAll("circle")];
    let timer = null;

    function reset() {
      for (const dot of dots) {
        dot.setAttribute("fill", GREY);
      }
    }

    function sparkle() {
      reset();

      const count = 1 + Math.floor(Math.random() * 3);
      const positions = [...Array(DOT_COUNT).keys()];

      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      for (let i = 0; i < count; i++) {
        const color = COLORS[
          Math.floor(Math.random() * COLORS.length)
        ];
        dots[positions[i]].setAttribute("fill", color);
      }
    }

    button.addEventListener("pointerenter", () => {
      if (timer !== null) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sparkle();
        return;
      }
      sparkle();
      timer = window.setInterval(sparkle, 100);
    });

    button.addEventListener("pointerleave", () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      reset();
    });

    button.addEventListener("blur", () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      reset();
    });
  }

  function scan() {
    const button = findButton();
    if (button) install(button);
  }

  scan();

  // Support apps rendered again after login/logout.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      scan();
    });
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
})();