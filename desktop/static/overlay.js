// Overlay renderer: draws rings for fractional targets over the full primary display.
(function () {
  const PAD = 8; // px of breathing room around the target
  const GAP = 8; // px between ring and label
  const layer = document.getElementById("layer");
  const bridge = window.overlayBridge;

  function afterPaint(cb) {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function render(rings) {
    layer.replaceChildren();
    const W = window.innerWidth;
    const H = window.innerHeight;
    for (const r of rings || []) {
      const t = r.target;
      const left = clamp(t.x * W - PAD, 0, W);
      const top = clamp(t.y * H - PAD, 0, H);
      const right = clamp((t.x + t.width) * W + PAD, 0, W);
      const bottom = clamp((t.y + t.height) * H + PAD, 0, H);

      const ring = document.createElement("div");
      ring.className = "ring";
      ring.style.left = left + "px";
      ring.style.top = top + "px";
      ring.style.width = Math.max(right - left, 12) + "px";
      ring.style.height = Math.max(bottom - top, 12) + "px";
      layer.appendChild(ring);

      if (r.label) {
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = r.label;
        layer.appendChild(label);
        const lw = label.offsetWidth;
        const lh = label.offsetHeight;
        // Above the ring if it fits, otherwise below; keep fully on screen.
        let ly = top - GAP - lh;
        if (ly < 4) ly = bottom + GAP;
        ly = clamp(ly, 4, H - lh - 4);
        const lx = clamp(left + (right - left) / 2 - lw / 2, 4, W - lw - 4);
        label.style.left = lx + "px";
        label.style.top = ly + "px";
      }
    }
  }

  let current = [];

  bridge.onShow((rings, id) => {
    current = rings || [];
    render(current);
    afterPaint(() => bridge.ack(id));
  });
  bridge.onClear((id) => {
    current = [];
    layer.replaceChildren();
    afterPaint(() => bridge.ack(id));
  });
  // The window is resized to the full display after load (and on display changes): re-map rings.
  window.addEventListener("resize", () => render(current));
})();
