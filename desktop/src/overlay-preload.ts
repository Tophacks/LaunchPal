import { contextBridge, ipcRenderer } from "electron";

type Msg = { id: number; payload?: unknown };

contextBridge.exposeInMainWorld("overlayBridge", {
  onShow: (cb: (rings: unknown, id: number) => void) =>
    ipcRenderer.on("overlay:show", (_e, m: Msg) => cb(m.payload, m.id)),
  onClear: (cb: (id: number) => void) => ipcRenderer.on("overlay:clear", (_e, m: Msg) => cb(m.id)),
  ack: (id: number) => ipcRenderer.send("overlay:ack", id),
});
