// Dev-only panel for exercising window.launchpalNative without the Wasp app.
(function () {
  const n = window.launchpalNative;
  const $ = (id) => document.getElementById(id);
  const status = (s) => ($("status").textContent = s);
  const info = (o) => ($("info").textContent = typeof o === "string" ? o : JSON.stringify(o, null, 1));
  let lastThumb = null;

  $("capture").onclick = async () => {
    status("Capturing…");
    const t0 = performance.now();
    const r = await n.captureFrame();
    const ms = Math.round(performance.now() - t0);
    if (!r.ok) return status(r.message), info(r);
    const bytes = Math.round(((r.frame.imageDataUrl.length - 23) * 3) / 4);
    info({ width: r.frame.width, height: r.frame.height, kb: Math.round(bytes / 1024), blank: r.frame.blank, ms });
    $("preview").src = r.frame.imageDataUrl;
    $("preview").hidden = false;
    status(r.frame.blank ? "Capture looks blank" : "Captured");
  };
  $("ring").onclick = () =>
    n.showRing({ x: 0.552, y: 0.266, width: 0.135, height: 0.053 }, "Click Connect workspace.");
  $("clear").onclick = () => n.clearRing();
  $("thumb").onclick = async () => {
    const t0 = performance.now();
    const r = await n.captureThumb();
    if (!r.ok) return info(r);
    let diff = null;
    if (lastThumb) {
      let sum = 0;
      for (let i = 0; i < r.thumb.gray.length; i++) sum += Math.abs(r.thumb.gray[i] - lastThumb[i]);
      diff = +(sum / r.thumb.gray.length).toFixed(2);
    }
    lastThumb = r.thumb.gray;
    info({ w: r.thumb.width, h: r.thumb.height, meanAbsDiffVsLast: diff, exclude: r.exclude, ms: Math.round(performance.now() - t0) });
  };

  // `#auto`: show the mock ring, then capture (the ring must NOT appear in the preview).
  if (location.hash === "#auto") {
    setTimeout(async () => {
      await $("ring").onclick();
      await new Promise((r) => setTimeout(r, 500));
      await $("capture").onclick();
      console.log("[devpanel] " + $("info").textContent.replace(/\s+/g, " "));
    }, 800);
  }
})();
