// Preload for the control window. Exposes window.launchpalNative to the Wasp control panel.
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("launchpalNative", {
  platform: process.platform,
  /** Full primary screen → { ok, frame: { imageDataUrl, width, height, blank } } or { ok: false, code, message }. */
  captureFrame: () => ipcRenderer.invoke("native:captureFrame"),
  /** 64×36 grayscale frame for change detection → { ok, thumb: { width, height, gray[] }, exclude } */
  captureThumb: () => ipcRenderer.invoke("native:captureThumb"),
  showRing: (target: { x: number; y: number; width: number; height: number }, label?: string) =>
    ipcRenderer.invoke("native:showRing", target, label),
  clearRing: () => ipcRenderer.invoke("native:clearRing"),
});
