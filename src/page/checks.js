// In-page layout checks, run by the sweep inside the browser with page.evaluate.
// Ported from the CHECKS in the author's earlier shoot_all.py, and extended.
// Plain JavaScript on purpose: it is sent to the page as source text.
//
// Known false positives are excluded, as real apps showed them: sticky, fixed and absolute
// text; clamped or ellipsised text; scroll boxes; hidden, screen-reader-only and aria-hidden text.
// Anything else can be excluded per element with data-ui-floors-ignore="check …" (empty means all),
// or per selector with an ignore entry in ui-floors.json.

async (opts) => {
  const { floors, phone, scheme, cap = 10 } = opts;
  await document.fonts.ready;
  const root = document.querySelector(opts.root || "main") || document.body;
  const findings = [];
  const counts = {};
  const gcs = (el) => getComputedStyle(el);

  const part = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) return s + "#" + el.id;
    const slot = el.getAttribute("data-slot");
    if (slot) return s + `[data-slot=${slot}]`;
    const cls = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return s + (cls.length ? "." + cls.join(".") : "");
  };
  const label = (el) => {
    if (!el) return undefined;
    const chain = [];
    for (let a = el; a && a !== document.body && chain.length < 3; a = a.parentElement) chain.unshift(part(a));
    return chain.join(" > ");
  };
  const ignoredBy = (el, check) => {
    if (!el) return undefined;
    // data-ui-checks-ignore is the old name, still read until apps migrate.
    const marked = el.closest("[data-ui-floors-ignore],[data-ui-checks-ignore]");
    if (marked) {
      const attr = marked.hasAttribute("data-ui-floors-ignore") ? "data-ui-floors-ignore" : "data-ui-checks-ignore";
      const v = marked.getAttribute(attr).trim();
      if (!v || v.split(/\s+/).includes(check) || v === "*") return attr === "data-ui-floors-ignore" ? attr : `${attr} (old name: use data-ui-floors-ignore)`;
    }
    for (const ig of opts.ignore || []) {
      if ((ig.check === check || ig.check === "*") && ig.selector && el.closest(ig.selector)) return ig.reason;
    }
    return undefined;
  };
  const add = (check, el, message, severity = "error") => {
    const ignored = ignoredBy(el, check);
    if (!ignored) {
      counts[check] = (counts[check] || 0) + 1;
      if (counts[check] > cap) return;
    }
    findings.push({ check, severity, message, where: label(el), ignored });
  };
  const snip = (s, n = 30) => {
    s = s.replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };
  const visible = (el) => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const textRects = (node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
  };
  const union = (rs) => rs.reduce((u, r) => ({ left: Math.min(u.left, r.left), top: Math.min(u.top, r.top), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  // Inside a visually hidden box (sr-only: clipped to 1 px, or clip-path inset(50%)), an element is for assistive
  // technology: it can't be seen or touched, though its own box still reports its full size. Used by clipped,
  // target-size and touch-action.
  const visuallyHidden = (el) => {
    // The control itself counts too: a skip link is often `sr-only` until focused.
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = gcs(a);
      if (cs.clipPath === "inset(50%)" || cs.clip === "rect(0px, 0px, 0px, 0px)") return true;
      if (CLIPS.includes(cs.overflowX) && CLIPS.includes(cs.overflowY) && (a.clientWidth <= 1 || a.clientHeight <= 1)) return true;
    }
    return false;
  };
  const innerBox = (el) => {
    const r = el.getBoundingClientRect();
    const left = r.left + el.clientLeft, top = r.top + el.clientTop;
    return { left, top, right: left + el.clientWidth, bottom: top + el.clientHeight };
  };
  const CLIPS = ["hidden", "clip"], SCROLLS = ["auto", "scroll"];

  // Gather visible text nodes once.
  const texts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode, el = t.parentElement;
    if (!el || !t.data.trim() || el.closest("script,style,noscript,template")) continue;
    if (!visible(el)) continue;
    texts.push({ node: t, el, inSvg: !!el.closest("svg") });
  }

  // hscroll: page-level horizontal scroll.
  const doc = document.scrollingElement;
  const hscroll = doc.scrollWidth - doc.clientWidth;
  if (hscroll > 0) add("hscroll", null, `page scrolls sideways by ${hscroll}px`);

  // body-size
  const bodyPx = parseFloat(gcs(document.body).fontSize);
  if (bodyPx < floors.bodyPx[0] || bodyPx > floors.bodyPx[1]) add("body-size", document.body, `body text is ${bodyPx}px, outside ${floors.bodyPx[0]}–${floors.bodyPx[1]}px`);

  // text-size: smallest text anywhere, SVG included. SVG text is drawn at its font size times the scale its viewBox
  // and transforms give it, so a chart that shrinks to fit a phone shrinks its labels too.
  const seenSize = new Set();
  for (const { node, el, inSvg } of texts) {
    if (seenSize.has(el)) continue;
    seenSize.add(el);
    let px = parseFloat(gcs(el).fontSize);
    if (inSvg && typeof el.getScreenCTM === "function") {
      const m = el.getScreenCTM();
      if (m) px *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    }
    px = Math.round(px * 10) / 10;
    if (px < floors.minTextPx - 0.1) add("text-size", el, `${px}px text "${snip(node.data, 25)}", under ${floors.minTextPx}px${inSvg ? " as drawn" : ""}`);
  }

  // overflow-right: elements past the right edge, outside any scroller. Outermost only.
  const vw = document.documentElement.clientWidth;
  const clippedByAncestor = (el) => {
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      if (gcs(a).overflowX !== "visible") return true;
    }
    return false;
  };
  const wide = new Set();
  for (const el of root.querySelectorAll("*")) {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.right > vw + 1)) continue;
    if (clippedByAncestor(el)) continue;
    let a = el.parentElement, nested = false;
    for (; a; a = a.parentElement) if (wide.has(a)) { nested = true; break; }
    if (nested) continue;
    wide.add(el);
    add("overflow-right", el, `ends at ${Math.round(r.right)}px, past the ${vw}px viewport`);
  }

  // clipped: text cut off by an ancestor that hides overflow (not a scroll box, not deliberate truncation).
  for (const { node, el, inSvg } of texts) {
    if (inSvg) continue;
    let clipper = null, clipX = false, clipY = false, skip = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = gcs(a);
      if (cs.textOverflow === "ellipsis" || (cs.webkitLineClamp && cs.webkitLineClamp !== "none")) { skip = true; break; }
      const ox = cs.overflowX, oy = cs.overflowY;
      if (SCROLLS.includes(ox) && SCROLLS.includes(oy)) break; // a scroll box: content is reachable
      if (CLIPS.includes(ox) || CLIPS.includes(oy)) { clipper = a; clipX = CLIPS.includes(ox); clipY = CLIPS.includes(oy); break; }
    }
    if (skip || !clipper || clipper.clientWidth <= 1 || clipper.clientHeight <= 1 || visuallyHidden(el)) continue;
    const rs = textRects(node);
    if (!rs.length) continue;
    const u = union(rs), b = innerBox(clipper);
    const over = (clipX && (u.right > b.right + 2 || u.left < b.left - 2)) || (clipY && (u.bottom > b.bottom + 2 || u.top < b.top - 2));
    if (over) add("clipped", el, `"${snip(node.data, 25)}" is cut off by ${part(clipper)}`);
  }

  // overlap: leaf text boxes in flow that overprint each other.
  const outOfFlow = new Map();
  const isOutOfFlow = (el) => {
    if (outOfFlow.has(el)) return outOfFlow.get(el);
    let v = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      if (a.getAttribute("aria-hidden") === "true" || a.getAttribute("role") === "tooltip") { v = true; break; }
      const p = gcs(a).position;
      if (p === "sticky" || p === "fixed" || p === "absolute") { v = true; break; }
    }
    outOfFlow.set(el, v);
    return v;
  };
  const visibleBox = (el) => {
    let box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = gcs(a);
      if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
        const b = innerBox(a);
        if (cs.overflowX !== "visible") { box.left = Math.max(box.left, b.left); box.right = Math.min(box.right, b.right); }
        if (cs.overflowY !== "visible") { box.top = Math.max(box.top, b.top); box.bottom = Math.min(box.bottom, b.bottom); }
      }
    }
    return box;
  };
  const flow = [];
  for (const t of texts) {
    if (t.inSvg || isOutOfFlow(t.el)) continue;
    const vb = visibleBox(t.el);
    const rects = textRects(t.node)
      .map((r) => ({ left: Math.max(r.left, vb.left), right: Math.min(r.right, vb.right), top: Math.max(r.top, vb.top), bottom: Math.min(r.bottom, vb.bottom) }))
      .filter((r) => r.right - r.left > 0.5 && r.bottom - r.top > 0.5);
    if (rects.length) flow.push({ ...t, rects });
  }
  const hit = (a, b, min) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > min && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > min;
  for (let i = 0; i < flow.length; i++) {
    for (let j = i + 1; j < Math.min(flow.length, i + 60); j++) {
      const A = flow[i], B = flow[j];
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (A.rects.some((a) => B.rects.some((b) => hit(a, b, 3))))
        add("overlap", A.el, `"${snip(A.node.data, 20)}" overprints "${snip(B.node.data, 20)}" (${part(B.el)})`);
    }
  }

  // label-collision: SVG text (chart labels) colliding inside one chart. Rotated labels are compared in their own
  // rotated frame, since their axis-aligned boxes overlap even when the text doesn't. Across the baseline, a
  // label's box includes its line gap, so overlap must exceed 3 px there (as overlap allows for HTML text).
  const frameBox = (t, angle) => {
    const b = t.getBBox(), m = t.getScreenCTM();
    if (!m) return null;
    const cos = Math.cos(-angle), sin = Math.sin(-angle);
    const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]].map(([x, y]) => {
      const sx = m.a * x + m.c * y + m.e, sy = m.b * x + m.d * y + m.f;
      return [sx * cos - sy * sin, sx * sin + sy * cos];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };
  const angleOf = (t) => { const m = t.getScreenCTM(); return m ? Math.atan2(m.b, m.a) : 0; };
  // Labels at different angles: separating-axis test on their rotated boxes, overlap over 1 px on every axis.
  const quad = (t) => {
    const b = t.getBBox(), m = t.getScreenCTM();
    if (!m) return null;
    return [[b.x, b.y], [b.x + b.width, b.y], [b.x + b.width, b.y + b.height], [b.x, b.y + b.height]].map(([x, y]) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]);
  };
  const quadsOverlap = (P, Q) => {
    for (const poly of [P, Q]) for (let k = 0; k < 4; k++) {
      const [x1, y1] = poly[k], [x2, y2] = poly[(k + 1) % 4];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      const proj = (pts) => pts.map(([x, y]) => x * nx + y * ny);
      const a = proj(P), b = proj(Q);
      if (Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b)) <= 1) return false;
    }
    return true;
  };
  for (const svg of root.querySelectorAll("svg")) {
    const labels = [...svg.querySelectorAll("text")].filter((t) => t.textContent.trim() && visible(t)).slice(0, 300);
    const angles = labels.map(angleOf);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) {
        let collide;
        if (Math.abs(angles[i] - angles[j]) < 0.02) {
          const A = frameBox(labels[i], angles[i]), B = frameBox(labels[j], angles[i]);
          if (!A || !B) continue;
          collide = Math.min(A.right, B.right) - Math.max(A.left, B.left) > 1 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 3;
        } else {
          const P = quad(labels[i]), Q = quad(labels[j]);
          if (!P || !Q) continue;
          collide = quadsOverlap(P, Q);
        }
        if (collide) add("label-collision", labels[i], `chart labels "${snip(labels[i].textContent, 15)}" and "${snip(labels[j].textContent, 15)}" collide`);
      }
  }

  // line-length: estimated characters per line of prose, from the measure and the face's mean advance.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  for (const el of root.querySelectorAll("p, li, dd, blockquote, figcaption")) {
    if (el.closest("table, pre, code, nav") || el.querySelector("p, ul, ol, div, li, blockquote, table")) continue;
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (text.length < 120 || !visible(el)) continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top / 4)));
    if (tops.size < 2) continue;
    const cs = gcs(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const sample = text.slice(0, 400);
    const advance = ctx.measureText(sample).width / sample.length + (parseFloat(cs.letterSpacing) || 0);
    const measure = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const chars = Math.round(measure / advance);
    if (chars > floors.maxLineChars + 3) add("line-length", el, `about ${chars} characters a line, over ${floors.maxLineChars}`);
  }

  // numeric-columns: number columns right-aligned with tabular figures, header included.
  const NUMERIC = /^[−–\-+±~≈<>]?\s?[$€£¥]?\s?\d[\d,.   ]*\s?(%|‰|[kKMGT]?B|[kKMBx×]|ms|s|px)?$/;
  const rightAligned = (cell) => {
    const rs = textRects(cell);
    if (!rs.length) return true;
    const u = union(rs), r = cell.getBoundingClientRect(), cs = gcs(cell);
    const right = r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
    return right - u.right <= 2; // text ends at the content edge
  };
  const tabular = (cell) => {
    const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      if (!w.currentNode.data.trim()) continue;
      const cs = gcs(w.currentNode.parentElement);
      return cs.fontVariantNumeric.includes("tabular-nums") || /["']tnum["']\s*(1|on)?/.test(cs.fontFeatureSettings);
    }
    return true;
  };
  for (const table of root.querySelectorAll("table")) {
    if (!visible(table) || [...table.querySelectorAll("td, th")].some((c) => c.rowSpan > 1)) continue;
    const grid = (row) => {
      const m = new Map();
      let i = 0;
      for (const c of row.cells) { if (c.colSpan === 1) m.set(i, c); i += c.colSpan; }
      return m;
    };
    const bodyRows = [...table.rows].filter((r) => r.parentElement.tagName !== "THEAD" && r.parentElement.tagName !== "TFOOT");
    const head = table.tHead && table.tHead.rows.length ? grid(table.tHead.rows[table.tHead.rows.length - 1]) : new Map();
    const cols = new Map();
    for (const r of bodyRows) for (const [i, c] of grid(r)) { if (!cols.has(i)) cols.set(i, []); cols.get(i).push(c); }
    for (const [i, cells] of cols) {
      const filled = cells.filter((c) => c.textContent.trim());
      const nums = filled.filter((c) => NUMERIC.test(c.textContent.replace(/\s+/g, " ").trim()));
      if (filled.length < 3 || nums.length / filled.length < 0.8) continue;
      const th = head.get(i);
      const name = th ? `"${snip(th.textContent, 20)}"` : `${i + 1}`;
      const notRight = nums.filter((c) => !rightAligned(c)).length;
      const notTab = nums.filter((c) => !tabular(c)).length;
      const problems = [];
      if (notRight) problems.push(`${notRight} of ${nums.length} cells not right-aligned`);
      if (notTab) problems.push(`${notTab} of ${nums.length} cells without tabular figures`);
      if (th && th.textContent.trim() && !rightAligned(th)) problems.push("header not right-aligned");
      if (problems.length) add("numeric-columns", th || nums[0], `number column ${name}: ${problems.join("; ")}`);
    }
  }

  // hidden-columns: on phones, a table in a scroll box doesn't hide whole columns at rest. A column counts as hidden
  // when less than half of its header (or first-row cell) shows inside the box. A fade is not a cue; the reader can't
  // see that the evidence column exists. Matrices that are meant to scroll are excepted, with a reason, by the app.
  if (phone) {
    for (const table of root.querySelectorAll("table")) {
      if (!visible(table)) continue;
      let box = null;
      for (let a = table.parentElement; a && a !== document.body; a = a.parentElement) {
        if (SCROLLS.includes(gcs(a).overflowX) || CLIPS.includes(gcs(a).overflowX)) { box = a; break; }
      }
      // A visually hidden box (sr-only: 1 px and clipped) holds a table for assistive technology, not for the eye.
      if (!box || box.clientWidth <= 1 || box.clientHeight <= 1 || box.scrollWidth <= box.clientWidth + 1) continue;
      const row = table.tHead?.rows[table.tHead.rows.length - 1] || table.rows[0];
      if (!row) continue;
      const cells = [...row.cells].filter(visible);
      const b = innerBox(box);
      const hidden = cells.filter((c) => {
        const r = c.getBoundingClientRect();
        const shown = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left));
        return r.width > 0 && shown < r.width / 2;
      });
      if (hidden.length) {
        const names = hidden.map((c) => `"${snip(c.textContent.trim() || "(blank)", 15)}"`).slice(0, 4).join(", ");
        add("hidden-columns", table, `${hidden.length} of ${cells.length} columns hidden at rest in a scroll box: ${names}`);
      }
    }
  }

  // Interaction checks look at the whole body: navigation sits outside main.
  const CONTROLS = "a[href], button, summary, select, textarea, input:not([type=hidden]), [role=button], [role=tab], [role=link], [role=checkbox], [role=switch], [role=menuitem]";
  const usable = (el) => visible(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true" && !el.closest("[aria-hidden=true], [inert]") && !visuallyHidden(el);

  if (phone) {
    // target-size: touch targets on phones, as WCAG 2.2 2.5.8 defines them. A target under the floor still passes
    // when a circle of the floor's diameter, centred on it, meets no other target and no other such circle.
    const targets = [];
    for (const el of document.body.querySelectorAll(CONTROLS)) {
      if (!usable(el)) continue;
      const cs = gcs(el);
      if (el.tagName === "A" && cs.display === "inline") {
        const block = el.parentElement;
        if (block && block.textContent.trim().length > el.textContent.trim().length + 1) continue; // inline link in a sentence
      }
      let rects = [el.getBoundingClientRect()];
      if (el.tagName === "INPUT" && /checkbox|radio/.test(el.type)) {
        const lab = el.closest("label") || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
        if (lab) rects.push(lab.getBoundingClientRect());
      }
      // Only the part a scroll or clip box shows counts: a control scrolled out of view isn't next to anything.
      const raw = union(rects), vb = visibleBox(el);
      const u = { left: Math.max(raw.left, vb.left), top: Math.max(raw.top, vb.top), right: Math.min(raw.right, vb.right), bottom: Math.min(raw.bottom, vb.bottom) };
      if (u.right - u.left < 1 || u.bottom - u.top < 1) continue;
      if (targets.some((t) => t.el.contains(el) || el.contains(t.el))) continue; // one target, nested controls
      targets.push({ el, u, w: u.right - u.left, h: u.bottom - u.top, cx: (u.left + u.right) / 2, cy: (u.top + u.bottom) / 2 });
    }
    const R = floors.targetPx / 2;
    const small = targets.filter((t) => Math.min(t.w, t.h) < floors.targetPx - 0.5);
    const circleHitsRect = (t, r) => {
      const dx = Math.max(r.left - t.cx, 0, t.cx - r.right), dy = Math.max(r.top - t.cy, 0, t.cy - r.bottom);
      return dx * dx + dy * dy < R * R;
    };
    for (const t of small) {
      const crowded = targets.some((o) => o !== t && circleHitsRect(t, o.u)) || small.some((o) => o !== t && Math.hypot(o.cx - t.cx, o.cy - t.cy) < 2 * R);
      if (crowded) add("target-size", t.el, `${Math.round(t.w)}×${Math.round(t.h)}px target, under ${floors.targetPx}px and too close to another`);
    }
    // touch-action: controls opt out of double-tap zoom.
    for (const el of document.body.querySelectorAll("a[href], button, summary, select, [role=button], [role=tab], input[type=checkbox], input[type=radio], input[type=submit], input[type=button]")) {
      if (!usable(el)) continue;
      if (gcs(el).touchAction === "auto") add("touch-action", el, "control without touch-action: manipulation");
    }
  }

  // search-input
  for (const el of document.body.querySelectorAll("input, [role=searchbox]")) {
    const hay = [el.getAttribute("type"), el.getAttribute("role"), el.name, el.id, el.getAttribute("placeholder"), el.getAttribute("aria-label")].join(" ");
    if (!/search/i.test(hay)) continue;
    const missing = [];
    if (el.getAttribute("autocomplete") !== "off") missing.push('autocomplete="off"');
    if (el.getAttribute("spellcheck") !== "false") missing.push('spellcheck="false"');
    if (missing.length) add("search-input", el, `search input without ${missing.join(" and ")}`);
  }

  // theme-color: a meta per scheme, matching the page background.
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const scoped = metas.find((m) => m.media && matchMedia(m.media).matches);
  if (!metas.length) add("theme-color", null, "no theme-color meta");
  else if (!scoped) add("theme-color", null, `no theme-color meta for ${scheme}; add one with media="(prefers-color-scheme: ${scheme})"`);
  else {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const x = c.getContext("2d", { willReadFrequently: true });
    const rgb = (color) => { x.clearRect(0, 0, 1, 1); x.fillStyle = "#000"; x.fillStyle = color; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
    let bg = null;
    for (const el of [document.documentElement, document.body]) {
      const v = gcs(el).backgroundColor;
      x.clearRect(0, 0, 1, 1);
      x.fillStyle = v;
      x.fillRect(0, 0, 1, 1);
      const d = [...x.getImageData(0, 0, 1, 1).data];
      if (d[3] > 0) { bg = d; break; }
    }
    bg = bg || [255, 255, 255, 255];
    const m = rgb(scoped.content);
    const dist = Math.hypot(m[0] - bg[0], m[1] - bg[1], m[2] - bg[2]);
    if (dist > 6) add("theme-color", null, `theme-color ${scoped.content} doesn't match the ${scheme} page background rgb(${bg.slice(0, 3).join(" ")})`, "warn");
  }

  for (const [check, n] of Object.entries(counts)) {
    if (n > cap) findings.push({ check, severity: "error", message: `and ${n - cap} more` });
  }
  return { findings, hscroll };
}
