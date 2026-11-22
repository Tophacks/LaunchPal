// Founder screen: upload/paste a setup guide, publish it, get the customer support link.
import { useState, type ChangeEvent } from "react";
import { publishGuide, listPublishedGuides, useQuery } from "wasp/client/operations";
import { PYTHON_WINDOWS_GUIDE } from "./founder/exampleGuides";
import "./panel.css";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

export function FounderPage() {
  const [productName, setProductName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<{ slug: string; productName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: guides, refetch } = useQuery(listPublishedGuides);
  const slug = slugify(productName);
  const link = published ? `${window.location.origin}/help/${published.slug}` : "";

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setContent(await f.text());
    if (!productName) setProductName(f.name.replace(/\.(md|txt)$/i, "").replace(/[-_]+/g, " "));
  }

  async function onPublish() {
    setError("");
    setBusy(true);
    try {
      const g = await publishGuide({ productName, slug, content });
      setPublished({ slug: g.slug, productName: g.productName });
      setCopied(false);
      void refetch();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't publish — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lp lp-founder">
      <header className="lp-head">
        <div className="lp-brand">
          <span className="lp-logo" aria-hidden>◎</span>
          <div>
            <h1>LaunchPal for founders</h1>
            <p className="lp-sub">Upload your setup guide. LaunchPal guides every customer through it on their own screen.</p>
          </div>
        </div>
      </header>

      <section className="lp-card">
        <label className="lp-label" htmlFor="pn">Product name</label>
        <input id="pn" className="lp-input" value={productName} placeholder="e.g. Python for Windows"
          onChange={(e) => setProductName(e.target.value)} />
        {slug && <p className="lp-muted">Customer link: /help/{slug}</p>}

        <div className="lp-row">
          <label className="lp-label" htmlFor="guide">Setup guide</label>
          <div className="lp-row-actions">
            <label className="lp-btn lp-btn-small lp-file">
              Upload .md
              <input type="file" accept=".md,.txt,text/markdown,text/plain" onChange={onFile} />
            </label>
            <button className="lp-btn lp-btn-small" onClick={() => {
              setProductName("Python for Windows");
              setContent(PYTHON_WINDOWS_GUIDE);
            }}>Use example: Python</button>
          </div>
        </div>
        <textarea id="guide" className="lp-textarea" value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={"Describe each setup screen, the control to click, the blocker, and what success looks like."} />
        <p className="lp-muted">{content.length.toLocaleString()} / 20,000 characters</p>

        {error && <p className="lp-status lp-tone-error" role="alert">{error}</p>}
        <button className="lp-btn lp-btn-primary" onClick={onPublish} disabled={busy || !productName || !content}>
          {busy ? "Publishing…" : "Publish guide"}
        </button>
      </section>

      {published && (
        <section className="lp-card lp-published" aria-live="polite">
          <p className="lp-status lp-tone-done">Published ✅ {published.productName}</p>
          <p className="lp-muted">Put this link on your download or help page:</p>
          <div className="lp-linkrow">
            <code className="lp-code">{link}</code>
            <button className="lp-btn lp-btn-small" onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => {});
            }}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <div className="lp-row-actions">
            <a className="lp-btn lp-link-btn" href={`launchpal://guide/${published.slug}`}>Open in LaunchPal helper</a>
            <a className="lp-btn lp-link-btn" href={`/help/${published.slug}`} target="_blank" rel="noreferrer">Preview customer page</a>
          </div>
        </section>
      )}

      {guides && guides.length > 0 && (
        <section className="lp-card">
          <p className="lp-label">Published guides</p>
          {guides.map((g) => (
            <p key={g.slug} className="lp-muted">{g.productName} — <a href={`/help/${g.slug}`}>/help/{g.slug}</a></p>
          ))}
        </section>
      )}
    </main>
  );
}
