// Browser mode: live preview of the shared screen with the ring drawn on it (object-fit: contain letterbox math).
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getShareState, subscribeShare } from "./browserAdapter";

export function ScreenPreview() {
  const { stream, ring } = useSyncExternalStore(subscribeShare, getShareState);
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [media, setMedia] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    if (stream) void v.play().catch(() => {});
    const onMeta = () => setMedia({ w: v.videoWidth, h: v.videoHeight });
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("resize", onMeta);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("resize", onMeta);
    };
  }, [stream]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // object-fit: contain → displayed size and letterbox offsets.
  let ringStyle: React.CSSProperties | null = null;
  let labelAbove = true;
  if (ring && media.w && media.h && box.w && box.h) {
    const s = Math.min(box.w / media.w, box.h / media.h);
    const dw = media.w * s;
    const dh = media.h * s;
    const ox = (box.w - dw) / 2;
    const oy = (box.h - dh) / 2;
    const pad = 4;
    const top = oy + ring.target.y * dh - pad;
    ringStyle = {
      left: ox + ring.target.x * dw - pad,
      top,
      width: ring.target.width * dw + pad * 2,
      height: ring.target.height * dh + pad * 2,
    };
    labelAbove = top > 28;
  }

  return (
    <div className="lp-preview" ref={boxRef} aria-label="Your shared screen">
      <video ref={videoRef} muted playsInline className="lp-preview-video" />
      {!stream && <p className="lp-preview-empty">Your screen will appear here after you press Start and share it.</p>}
      {ringStyle && ring && (
        <div className="lp-preview-ring" style={ringStyle}>
          <span className={`lp-preview-label ${labelAbove ? "above" : "below"}`}>{ring.label}</span>
        </div>
      )}
    </div>
  );
}
