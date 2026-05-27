const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setIgnoreMouse: (ignore, forward = true) => {
    ipcRenderer.send("set-ignore-mouse", ignore, forward);
  },
  reportCharacterBounds: (bounds) => {
    ipcRenderer.send("character-bounds", bounds);
  },
  onCursorPosition: (callback) => {
    const listener = (_event, position) => {
      callback(position);
    };
    ipcRenderer.on("cursor-position", listener);
    return () => ipcRenderer.removeListener("cursor-position", listener);
  },
  onDisplayMetricsChanged: (callback) => {
    const listener = (_event, bounds) => callback(bounds);
    ipcRenderer.on("display-metrics-changed", listener);
    return () => ipcRenderer.removeListener("display-metrics-changed", listener);
  },
  onSystemResumed: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("system-resumed", listener);
    return () => ipcRenderer.removeListener("system-resumed", listener);
  },
  onCharacterHidden: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("character-hidden", listener);
    return () => ipcRenderer.removeListener("character-hidden", listener);
  }
});
