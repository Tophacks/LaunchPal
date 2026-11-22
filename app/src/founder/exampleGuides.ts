// Example founder guide used in the demo: the real python.org installer for Windows.
export const PYTHON_WINDOWS_GUIDE = `# Setup guide: Python for Windows (python.org installer)

**Goal:** the customer installs Python from python.org so that \`python\` works in a terminal.
**Only the customer clicks and types. Never claim to click anything yourself.**
The version number on screen may differ (for example 3.15.2). Labels below are exact apart from the version.

## Screens and controls

### 1. python.org download page (in a web browser)
- Visible: the python.org website, heading "Download the latest version for Windows", a yellow button "Download Python 3.x.x".
- Next step: click the yellow **Download Python 3.x.x** button. Do NOT point at "Download Python install manager" or at other operating systems.

### 2. Download finished (in the web browser)
- Visible: the browser's downloads list or download bubble showing "python-3.x.x-amd64.exe".
- Next step: click **python-3.x.x-amd64.exe** in the browser's downloads to open it.
- If Windows asks "Do you want to run this file?", click **Run**.

### 3. Installer start screen - "Install Python 3.x.x (64-bit)" (THE BLOCKER)
- Visible: the Python setup window with "Install Now", "Customize installation", and two checkboxes at the bottom:
  "Use admin privileges when installing py.exe" and "Add python.exe to PATH".
- This is the step people get wrong: if "Add python.exe to PATH" is NOT checked, \`python\` will not work in the terminal afterwards.
- If the **Add python.exe to PATH** checkbox is NOT checked: the next step is to check **Add python.exe to PATH** (point at that checkbox).
- If it IS checked: the next step is to click **Install Now**.
- Never point at "Cancel" or "Customize installation".

### 4. Windows permission prompt (User Account Control)
- The screen may look dark or blank while Windows asks "Do you want to allow this app to make changes to your device?".
- Next step: click **Yes**.

### 5. Installing - "Setup Progress"
- Visible: "Setup Progress", "Installing:" and a green progress bar.
- Nothing to click. Answer with status "unclear" and the instruction "Python is installing. Please wait a moment."
- Never point at "Cancel".

### 6. Success screen - "Setup was successful"
- Visible success evidence: the heading **"Setup was successful"** in the Python setup window.
- Status \`done\` is allowed only when "Setup was successful" is visible. The progress bar or the start screen is NOT success.
- When done, the instruction is: "Python is installed. Click Close to finish."

## Out of scope
Any other screen (other apps, the desktop, the setup window hidden or only partly visible) is \`unclear\`.
Ask for one specific action, for example "Please bring the Python setup window to the front."
`;
