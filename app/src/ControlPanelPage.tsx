import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import { mockNextUnclear } from "./launchpal/mock";
import { getLaunchpal, getStatus, guideIdFromLocation, MOCK_INSPECT, subscribeStatus } from "./launchpal/setup";
import { QUESTION_ASK, STEP_EVENT, type InspectResponse, type StatusKind } from "./launchpal/types";
import { stopSharing } from "./launchpal/browserAdapter";
import { ScreenPreview } from "./launchpal/ScreenPreview";
import { VoiceSession } from "./voice/VoiceSession";
import "./panel.css";

const TONE: Record<StatusKind, string> = {
  ready: "neutral",
  guiding: "busy",
  looking: "busy",
  point: "good",
  unclear: "warn",
  done: "done",
  error: "error",
};

function titleFromSlug(slug?: string) {
  if (!slug) return "Acme Sync";
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ControlPanelPage() {
  const { guideSlug } = useParams();
  const guideId = guideIdFromLocation();
  const lp = getLaunchpal();
  const status = useSyncExternalStore(subscribeStatus, getStatus);
  const [asking, setAsking] = useState(false);
  const [lastStep, setLastStep] = useState<InspectResponse | null>(null);
  const [talking, setTalking] = useState(false);

  function startTalking() {
    lp.startGuided(); // starting a voice session starts guided mode (AGENTS.md)
    setTalking(true);
  }

  useEffect(() => {
    const onStep = (e: CustomEvent<InspectResponse>) => setLastStep(e.detail);
    window.addEventListener(STEP_EVENT, onStep);
    return () => window.removeEventListener(STEP_EVENT, onStep);
  }, []);

  // Stop guiding (and clear the ring) if the panel goes away.
  useEffect(() => () => lp.stopGuided(), [lp]);

  async function ask() {
    setAsking(true);
    try {
      await lp.inspectScreen(QUESTION_ASK);
    } catch {
      /* the status strip already shows a friendly message */
    } finally {
      setAsking(false);
    }
  }

  const busy = status.kind === "looking" || asking;
  const showInstruction = status.instruction && (status.kind === "point" || status.kind === "unclear" || status.kind === "done");

  function stop() {
    lp.stopGuided();
    if (lp.mode === "browser") stopSharing(); // stop means stop looking at the screen
  }

  const controls = (
    <div className="lp-stack">
      <header className="lp-head">
        <div className="lp-brand">
          <span className="lp-logo" aria-hidden>◎</span>
          <div>
            <h1>LaunchPal</h1>
            <p className="lp-sub">Setup help for {titleFromSlug(guideSlug)}</p>
          </div>
        </div>
        <div className="lp-badges">
          <span className="lp-badge">{lp.mode}</span>
          {MOCK_INSPECT && <span className="lp-badge lp-badge-mock">mock</span>}
        </div>
      </header>

      <section className={`lp-status lp-tone-${TONE[status.kind]}`} role="status" aria-live="polite">
        <span className="lp-dot" aria-hidden />
        <span className="lp-status-text">{status.text}</span>
      </section>

      {showInstruction && <p className="lp-instruction">{status.instruction}</p>}

      <div className="lp-actions">
        {status.guided ? (
          <button className="lp-btn lp-btn-stop" onClick={stop}>
            Stop
          </button>
        ) : (
          <button className="lp-btn lp-btn-primary" onClick={() => lp.startGuided()}>
            Start guided setup
          </button>
        )}
        <button className="lp-btn" onClick={ask} disabled={busy}>
          Ask: Where do I click?
        </button>
      </div>

      <section className="lp-voice" aria-label="Voice assistant">
        <p className="lp-voice-title">Voice assistant</p>
        {talking ? (
          <VoiceSession onEnd={() => setTalking(false)} />
        ) : (
          <>
            <p className="lp-muted">Talk to LaunchPal and it will walk you through each step out loud.</p>
            <button className="lp-btn" onClick={startTalking}>
              Talk
            </button>
          </>
        )}
      </section>

      {MOCK_INSPECT && (
        <details className="lp-dev">
          <summary>Dev</summary>
          <button className="lp-btn lp-btn-small" onClick={() => mockNextUnclear()}>
            Next response: unclear
          </button>
          {lastStep && (
            <p className="lp-muted">
              Last step event: {lastStep.status} — {lastStep.instruction}
            </p>
          )}
        </details>
      )}
    </div>
  );

  if (lp.mode !== "browser") return <main className="lp">{controls}</main>;

  return (
    <main className="lp lp-browser">
      <div className="lp-col">
        {controls}
        <section className="lp-helper">
          <p className="lp-muted">Want the highlight right on your screen instead of in this preview?</p>
          <a className="lp-btn lp-link-btn" href={`launchpal://guide/${guideId ?? "acme-sync"}`}>
            Open LaunchPal helper
          </a>
        </section>
      </div>
      <ScreenPreview />
    </main>
  );
}
