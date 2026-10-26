(() => {
  "use strict";

  const grey = "#8290a3";
  const colors = [
    "#ff4d6d", "#ff9f1c", "#ffd166",
    "#06d6a0", "#00bbf9", "#4361ee",
    "#9b5de5", "#f15bb5", "#00c49a"
  ];

  const css = document.createElement("style");
  css.textContent = `
    .ow-apps-btn.catalog-grid-ready {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      min-height: 40px !important;
      padding: 0 !important;
      line-height: 1 !important;
      box-sizing: border-box !important;
    }

    .catalog-grid-svg {
      display: block !important;
      width: 36px !important;
      height: 36px !important;
      flex: 0 0 36px !important;
    }

    .catalog-sort-wrap {
      display: inline-flex;
      align-items: center;
      position: relative;
      vertical-align: middle;
      height: 30px;
    }

    .catalog-sort-original {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      opacity: 0 !important;
      pointer-events: none !important;
      border: 0 !important;
      padding: 0 !important;
    }

    .catalog-sort-trigger {
      height: 30px;
      min-width: 145px;
      padding: 0 12px 0 14px;
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-radius: 999px;
      border: 1px solid #e1e6ee;
      background: #fff;
      color: #26354a;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      box-sizing: border-box;
      transition: border-color .16s, box-shadow .16s;
    }

    .catalog-sort-trigger:hover {
      border-color: #b9c6d7;
      box-shadow: 0 2px 7px rgba(25,40,65,.06);
    }

    .catalog-sort-trigger:focus-visible {
      outline: 2px solid #92b2ff;
      outline-offset: 2px;
    }

    .catalog-sort-chevron {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      transition: transform .16s;
    }

    .catalog-sort-trigger[aria-expanded="true"]
    .catalog-sort-chevron {
      transform: rotate(180deg);
    }

    .catalog-sort-menu {
      position: fixed;
      z-index: 99999;
      min-width: 180px;
      max-height: min(330px, 70vh);
      overflow-y: auto;
      padding: 6px;
      border: 1px solid #e7ebf2;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 14px 38px rgba(20,34,60,.14);
      box-sizing: border-box;
    }

    .catalog-sort-option {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 12px;
      border: 0;
      border-radius: 11px;
      background: transparent;
      color: #344054;
      text-align: left;
      font-size: 13px;
      cursor: pointer;
    }

    .catalog-sort-option:hover,
    .catalog-sort-option[aria-selected="true"] {
      background: #f2f5fa;
    }

    .catalog-sort-option[aria-selected="true"] {
      color: #2459af;
      font-weight: 600;
    }
  `;
  document.head.appendChild(css);

  function makeGrid() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 40 40");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("catalog-grid-svg");

    for (let i = 0; i < 9; i++) {
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", String(8 + (i % 3) * 12));
      dot.setAttribute("cy", String(8 + Math.floor(i / 3) * 12));
      dot.setAttribute("r", "3.4");
      dot.setAttribute("fill", grey);
      svg.appendChild(dot);
    }
    return svg;
  }

  function enhanceGrid(btn) {
    if (btn.dataset.catalogGridV2) return;
    btn.dataset.catalogGridV2 = "1";
    btn.classList.add("catalog-grid-ready");

    const svg = makeGrid();
    const old = btn.querySelector("svg, img, i");
    if (old) old.replaceWith(svg);
    else btn.prepend(svg);

    const dots = [...svg.querySelectorAll("circle")];
    let timer = null;

    const reset = () => dots.forEach(d => d.setAttribute("fill", grey));

    function flash() {
      reset();
      const positions = Array.from({ length: 9 }, (_, i) => i);

      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        dots[positions[i]].setAttribute(
          "fill",
          colors[Math.floor(Math.random() * colors.length)]
        );
      }
    }

    btn.addEventListener("pointerenter", () => {
      if (timer !== null) return;
      flash();
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = setInterval(flash, 100);
      }
    });

    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
      reset();
    };
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("blur", stop);
  }

  function findSortSelect() {
    const candidates = [...document.querySelectorAll("select")];

    return candidates.find(s => {
      const attrs = [
        s.id, s.name, s.className,
        s.getAttribute("aria-label") || ""
      ].join(" ");

      if (/sort/i.test(attrs)) return true;

      const nearby = s.parentElement?.textContent || "";
      return /sort/i.test(nearby.slice(0, 120));
    });
  }

  function enhanceSort(select) {
    if (select.dataset.catalogSortV2) return;
    select.dataset.catalogSortV2 = "1";

    const parent = select.parentNode;
    const wrap = document.createElement("span");
    wrap.className = "catalog-sort-wrap";
    parent.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.classList.add("catalog-sort-original");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "catalog-sort-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `
      <span class="catalog-sort-label"></span>
      <svg class="catalog-sort-chevron" viewBox="0 0 24 24"
           fill="none" stroke="currentColor"
           stroke-width="2" aria-hidden="true">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    `;
    wrap.appendChild(trigger);

    const label = trigger.querySelector(".catalog-sort-label");
    const menu = document.createElement("div");
    menu.className = "catalog-sort-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    document.body.appendChild(menu);

    function updateLabel() {
      label.textContent =
        select.selectedOptions[0]?.textContent?.trim() || "Relevance";
    }

    function close() {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    function drawOptions() {
      menu.replaceChildren();

      [...select.options].forEach(option => {
        if (option.disabled || option.hidden) return;

        const row = document.createElement("button");
        row.type = "button";
        row.className = "catalog-sort-option";
        row.setAttribute("role", "option");
        row.setAttribute(
          "aria-selected",
          String(option.value === select.value)
        );

        const title = document.createElement("span");
        title.textContent = option.textContent.trim();
        row.appendChild(title);

        if (option.value === select.value) {
          const check = document.createElement("span");
          check.textContent = "✓";
          check.setAttribute("aria-hidden", "true");
          row.appendChild(check);
        }

        row.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(
            new Event("input", { bubbles: true })
          );
          select.dispatchEvent(
            new Event("change", { bubbles: true })
          );
          updateLabel();
          close();
          trigger.focus();
        });

        menu.appendChild(row);
      });
    }

    function position() {
      const box = trigger.getBoundingClientRect();
      const width = Math.max(180, box.width);
      menu.style.width = width + "px";

      const left = Math.max(
        8, Math.min(box.left, innerWidth - width - 8)
      );
      menu.style.left = left + "px";

      const below = innerHeight - box.bottom;
      const above = box.top;
      if (below < 240 && above > below) {
        menu.style.top = "auto";
        menu.style.bottom = (innerHeight - box.top + 6) + "px";
      } else {
        menu.style.bottom = "auto";
        menu.style.top = (box.bottom + 6) + "px";
      }
    }

    trigger.addEventListener("click", () => {
      if (!menu.hidden) {
        close();
        return;
      }
      drawOptions();
      position();
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
    });

    trigger.addEventListener("keydown", e => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown" && menu.hidden) {
        e.preventDefault();
        trigger.click();
      }
    });

    document.addEventListener("pointerdown", e => {
      if (!wrap.contains(e.target) && !menu.contains(e.target)) {
        close();
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !menu.hidden) {
        close();
        trigger.focus();
      }
    });

    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    select.addEventListener("change", updateLabel);
    updateLabel();
  }

  function scan() {
    document.querySelectorAll(".ow-apps-btn").forEach(enhanceGrid);
    const sort = findSortSelect();
    if (sort) enhanceSort(sort);
  }

  let pending = false;
  new MutationObserver(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });

  scan();
})();