import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams } from "react-router";
import { mockNextUnclear } from "./launchpal/mock";
import { getLaunchpal, getStatus, MOCK_INSPECT, subscribeStatus } from "./launchpal/setup";
import { QUESTION_ASK, STEP_EVENT, type InspectResponse, type StatusKind } from "./launchpal/types";
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
  const lp = getLaunchpal();
  const status = useSyncExternalStore(subscribeStatus, getStatus);
  const [asking, setAsking] = useState(false);
  const [lastStep, setLastStep] = useState<InspectResponse | null>(null);

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

  return (
    <main className="lp">
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
          <button className="lp-btn lp-btn-stop" onClick={() => lp.stopGuided()}>
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
        <p className="lp-muted">Talk to LaunchPal hands-free. Coming soon.</p>
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
    </main>
  );
}
