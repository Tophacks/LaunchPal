// Shared Acme Sync FIXTURE markup (a clearly labelled fake product).
export const W = 1280, H = 800;
export const css = `
*{box-sizing:border-box}body{margin:0;width:${W}px;height:${H}px;font:16px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1c2333;background:#f4f6fb;display:flex;overflow:hidden}
aside{width:220px;background:#1c2333;color:#c9d1e6;padding:24px 16px}aside h1{color:#fff;font-size:18px;margin:0 0 24px}aside div{padding:10px 12px;border-radius:6px}aside .on{background:#2c3650;color:#fff}
main{flex:1;padding:48px 64px;position:relative}h2{font-size:30px;margin:0 0 8px}p.sub{color:#5b667f;margin:0 0 32px}
.steps{background:#fff;border:1px solid #dfe4f0;border-radius:12px;padding:28px;width:620px}
.step{display:flex;gap:14px;align-items:center;padding:12px 0;border-bottom:1px solid #eef1f8}.step:last-of-type{border:0}
.n{width:28px;height:28px;border-radius:50%;background:#e3e8f6;display:grid;place-items:center;font-weight:600}
button{font:600 16px inherit;font-family:inherit;border-radius:8px;padding:12px 22px;border:1px solid #c5cce0;background:#fff;color:#1c2333}
button.primary{background:#2f5bea;border-color:#2f5bea;color:#fff}
.spacer{height:20px}.banner{position:absolute;top:0;left:0;right:0;background:#fff7e0;color:#7a5a00;padding:8px 64px;font-size:13px;border-bottom:1px solid #f0dfa6}
.scrim{position:absolute;inset:0;background:rgba(20,26,43,.55);display:grid;place-items:center}
.dlg{background:#fff;border-radius:14px;padding:32px;width:520px;box-shadow:0 20px 60px rgba(0,0,0,.35)}.dlg h3{margin:0 0 10px;font-size:22px}.dlg p{color:#5b667f;margin:0 0 28px}.row{display:flex;justify-content:flex-end;gap:12px}
.ok{text-align:center;background:#fff;border:1px solid #dfe4f0;border-radius:12px;padding:48px;width:620px}.check{width:72px;height:72px;border-radius:50%;background:#1fa971;color:#fff;font-size:44px;display:grid;place-items:center;margin:0 auto 16px}
.status{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;background:#e5f7ee;color:#137a4d;font-weight:600}
.spin{width:56px;height:56px;border:6px solid #dfe4f0;border-top-color:#2f5bea;border-radius:50%;margin:0 auto 16px}
`;
export const shell = (inner: string, extra = "") => `<style>${css}</style><aside><h1>Acme Sync</h1><div>Dashboard</div><div class="on">Setup</div><div>Reports</div><div>Settings</div></aside><main><div class="banner">Fixture product for LaunchPal integration - not a real service</div>${inner}${extra}</main>`;
export const start = `<div class="spacer"></div><h2>Set up Acme Sync</h2><p class="sub">Two quick steps and your data starts syncing.</p>
<div class="steps"><div class="step"><span class="n">1</span><span style="flex:1">Connect workspace</span><button class="primary" id="connect">Connect workspace</button></div>
<div class="step"><span class="n">2</span><span style="flex:1">Invite teammates</span><button disabled style="opacity:.5">Invite teammates</button></div></div>
<div style="margin-top:24px"><button id="skip" style="border:0;background:none;color:#5b667f">Skip for now</button></div>`;
export const dialog = `<div class="scrim"><div class="dlg"><h3>Acme Sync needs access to your workspace</h3><p>Allow Acme Sync to read your workspace so it can start syncing. You can revoke access at any time.</p><div class="row"><button id="cancel">Cancel</button><button class="primary" id="allow">Allow access</button></div></div></div>`;
export const success = `<div class="spacer"></div><h2>Set up Acme Sync</h2><p class="sub">Step 1 of 2 complete.</p><div class="ok"><div class="check">&#10003;</div><h2 style="font-size:26px">Workspace connected</h2><div class="status">Sync status: Active</div></div>`;
export const loading = `<div class="spacer"></div><h2>Set up Acme Sync</h2><p class="sub">Hang tight.</p><div class="ok"><div class="spin"></div><h2 style="font-size:24px">Connecting&hellip;</h2><p class="sub" style="margin:0">This can take a few seconds.</p></div>`;
export const unrelated = `<style>body{background:#0e1116;color:#c9d1d9;font:14px/1.5 ui-monospace,Menlo,monospace;padding:28px;display:block}.t{color:#7ee787}.c{color:#8b949e}</style>
<div class="c"># terminal - ~/projects/inventory-api</div><div><span class="t">$</span> npm run build</div><div class="c">&gt; inventory-api@2.4.1 build</div><div class="c">&gt; tsc -p .</div><div><span class="t">$</span> git status</div><div>On branch main</div><div>nothing to commit, working tree clean</div><div><span class="t">$</span> <span style="background:#c9d1d9;color:#0e1116">&nbsp;</span></div>`;

