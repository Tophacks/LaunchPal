# Setup guide: Acme Sync — Connect your workspace

> **FIXTURE PRODUCT.** "Acme Sync" is a placeholder used so the team can integrate before a real
> product is chosen. To switch products, replace this file (or point `GUIDE_PATH` at another
> guide) and re-render the fixtures. The service code does not change.

**Goal:** the customer connects their workspace so Acme Sync can start syncing.
**Only the customer clicks and types. Never claim to click anything yourself.**

## Screens and controls

All labels below are exact, as they appear on screen.

### 1. Starting screen — "Set up Acme Sync"
- Visible: heading "Set up Acme Sync", step list ("1 Connect workspace", "2 Invite teammates"), and one blue primary button.
- Primary control: the button labelled **Connect workspace**.
- Next step: click **Connect workspace**.
- Do NOT point at the sidebar items ("Dashboard", "Reports", "Settings") or at "Skip for now".

### 2. Blocked screen — permission dialog
- Visible: a dialog titled "Acme Sync needs access to your workspace", with the buttons **Cancel** and **Allow access**.
- This is the setup blocker: the connection cannot finish until the customer grants permission.
- Next step: click **Allow access**. Never point at **Cancel**.

### 3. Success screen — "Workspace connected"
- Visible success evidence (ALL of these):
  - heading "Workspace connected" with a green check mark
  - a status line "Sync status: Active"
- Status `done` is allowed only when this evidence is visible in the current screenshot.
- A spinner, a "Connecting…" message, or the permission dialog still showing is NOT success.

## Out of scope
Any screen that is not one of the three above (other apps, desktop, setup window hidden, minimized or partly off-screen, a partial view where the
primary control or success evidence is not fully visible) is `unclear`. Ask the customer for one
specific action, e.g. "Please bring the Acme Sync setup window to the front."
