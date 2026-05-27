import { screen, BrowserWindow, ipcMain, nativeImage, Tray, Menu, app, dialog, powerMonitor } from "electron";
import { join } from "path";
import { appendFileSync, writeFileSync } from "node:fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let mainWindow = null;
let cursorTimer = null;
let characterInteractionBounds = null;
let mousePassthroughEnabled = true;
let lastOverCharacter = null;
let lastCursorLogAt = 0;
let lastBoundsLogAt = 0;
const debugLogPath = join(process.env.APPDATA || process.cwd(), "desktop-shimeji", "input-debug.log");
function debugLog(message, data) {
  try {
    const line = `[${new Date().toISOString()}] ${message}${data === void 0 ? "" : " " + JSON.stringify(data)}\n`;
    appendFileSync(debugLogPath, line, "utf8");
  } catch (_error) {
  }
}
function getMainWindow() {
  return mainWindow;
}
function getVirtualWorkArea() {
  const displays = screen.getAllDisplays();
  const bounds = displays.map((display) => display.workArea);
  const left = Math.min(...bounds.map((b) => b.x));
  const top = Math.min(...bounds.map((b) => b.y));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function applyWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = getVirtualWorkArea();
  mainWindow.setBounds(bounds, false);
  mainWindow.webContents.send("display-metrics-changed", bounds);
}
function setMousePassthrough(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const next = Boolean(enabled);
  if (mousePassthroughEnabled === next) return;
  mousePassthroughEnabled = next;
  debugLog("setMousePassthrough", { passthrough: next, action: next ? "ignoreMouseEvents(true, forward)" : "ignoreMouseEvents(false)" });
  if (next) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
}
function isPointInCharacterBounds(x, y) {
  if (!characterInteractionBounds) return false;
  if (Date.now() - characterInteractionBounds.updatedAt > 1e3) return false;
  return x >= characterInteractionBounds.left && x <= characterInteractionBounds.right && y >= characterInteractionBounds.top && y <= characterInteractionBounds.bottom;
}
function setCharacterVisible(visible) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (visible) {
    applyWindowBounds();
    mainWindow.showInactive();
    startCursorPolling();
  } else {
    stopCursorPolling();
    characterInteractionBounds = null;
    setMousePassthrough(true);
    mainWindow.webContents.send("character-hidden");
    mainWindow.hide();
  }
  rebuildTrayMenu();
}
function installIpcHandlers() {
  ipcMain.removeAllListeners("set-ignore-mouse");
  ipcMain.removeAllListeners("character-bounds");
  ipcMain.on("set-ignore-mouse", (_event, ignore, forward = true) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const shouldIgnore = Boolean(ignore);
      debugLog("ipc:set-ignore-mouse", { ignore: shouldIgnore, forward: Boolean(forward) });
      if (shouldIgnore) {
        setMousePassthrough(true);
      } else {
        setMousePassthrough(false);
      }
    }
  });
  ipcMain.on("character-bounds", (_event, bounds) => {
    if (!bounds || typeof bounds !== "object") return;
    const left = Number(bounds.left);
    const right = Number(bounds.right);
    const top = Number(bounds.top);
    const bottom = Number(bounds.bottom);
    if (![left, right, top, bottom].every(Number.isFinite)) return;
    characterInteractionBounds = { left, right, top, bottom, updatedAt: Date.now() };
    const now = Date.now();
    if (now - lastBoundsLogAt > 1e3) {
      lastBoundsLogAt = now;
      debugLog("ipc:character-bounds", { left, right, top, bottom, width: right - left, height: bottom - top });
    }
  });
}
function createWindow() {
  const { x, y, width, height } = getVirtualWorkArea();
  mainWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    backgroundColor: "#00000000",
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });
  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  debugLog("createWindow", { bounds: { x, y, width, height }, preload: join(__dirname, "../preload/index.mjs") });
  mainWindow.webContents.on("did-finish-load", () => debugLog("webContents:did-finish-load"));
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => debugLog("webContents:did-fail-load", { errorCode, errorDescription, validatedURL }));
  mainWindow.webContents.on("render-process-gone", (_event, details) => debugLog("webContents:render-process-gone", details));
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => debugLog("webContents:preload-error", { preloadPath, message: error?.message, stack: error?.stack }));
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => debugLog("renderer:console", { level, message, line, sourceId }));
  mainWindow.on("close", (event) => {
    if (!shouldQuit()) {
      event.preventDefault();
      hideWindow();
    }
  });
  mainWindow.on("closed", () => {
    stopCursorPolling();
    mainWindow = null;
  });
  installIpcHandlers();
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    setCharacterVisible(true);
  });
  return mainWindow;
}
function startCursorPolling() {
  if (cursorTimer) return;
  cursorTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    const point = screen.getCursorScreenPoint();
    const bounds = mainWindow.getBounds();
    const relativePoint = {
      x: point.x - bounds.x,
      y: point.y - bounds.y
    };
    const overCharacter = isPointInCharacterBounds(relativePoint.x, relativePoint.y);
    const now = Date.now();
    if (lastOverCharacter !== overCharacter || now - lastCursorLogAt > 1e3) {
      lastOverCharacter = overCharacter;
      lastCursorLogAt = now;
      debugLog("cursor", {
        point: relativePoint,
        overCharacter,
        hasBounds: Boolean(characterInteractionBounds),
        bounds: characterInteractionBounds && {
          left: characterInteractionBounds.left,
          right: characterInteractionBounds.right,
          top: characterInteractionBounds.top,
          bottom: characterInteractionBounds.bottom,
          ageMs: now - characterInteractionBounds.updatedAt
        },
        passthrough: mousePassthroughEnabled
      });
    }
    setMousePassthrough(!overCharacter);
    mainWindow.webContents.send("cursor-position", relativePoint);
  }, 50);
}
function stopCursorPolling() {
  if (!cursorTimer) return;
  clearInterval(cursorTimer);
  cursorTimer = null;
}
function showWindow() {
  setCharacterVisible(true);
}
function toggleAlwaysOnTop() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const next = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(next, next ? "screen-saver" : "normal");
  rebuildTrayMenu();
}
function showSettings() {
  dialog.showMessageBox({
    type: "info",
    title: "Diana Shimeji Settings",
    message: "Diana Shimeji",
    detail: "Desktop companion is running in the background.\n\nRight-click the tray icon to hide/show the character, toggle always-on-top, or exit.",
    buttons: ["OK"]
  });
}
function hideWindow() {
  setCharacterVisible(false);
}
let tray = null;
let trayHandlers = null;
function rebuildTrayMenu() {
  if (!tray || !trayHandlers) return;
  const alwaysOnTop = mainWindow?.isAlwaysOnTop() ?? true;
  const visible = mainWindow?.isVisible() ?? false;
  const contextMenu = Menu.buildFromTemplate([
    { label: visible ? "Hide Character" : "Show Character", click: visible ? trayHandlers.onHide : trayHandlers.onShow },
    { label: "Always On Top", type: "checkbox", checked: alwaysOnTop, click: trayHandlers.onToggleAlwaysOnTop },
    { label: "Settings", click: trayHandlers.onSettings },
    { type: "separator" },
    { label: "Exit", click: trayHandlers.onQuit }
  ]);
  tray.setContextMenu(contextMenu);
}
function createTray(handlers) {
  trayHandlers = handlers;
  const iconPath = join(__dirname, "../../resources/tray-icon.png");
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(createFallbackIcon()) : icon);
  tray.setToolTip("Diana Shimeji");
  rebuildTrayMenu();
  tray.on("click", handlers.onShow);
  tray.on("double-click", handlers.onShow);
  return tray;
}
function destroyTray() {
  tray?.destroy();
  tray = null;
  trayHandlers = null;
}
function createFallbackIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#2266dd"/><circle cx="8" cy="6" r="3" fill="#f5e6a8"/><rect x="4" y="9" width="8" height="5" rx="1" fill="#2266dd"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
let isQuitting = false;
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = getMainWindow();
    if (win) {
      showWindow();
    }
  });
  app.whenReady().then(() => {
    try {
      writeFileSync(debugLogPath, `[${new Date().toISOString()}] input debug log started ${JSON.stringify({ debugLogPath, appPath: app.getAppPath(), userData: app.getPath("userData") })}\n`, "utf8");
    } catch (_error) {
    }
    app.setLoginItemSettings({ openAtLogin: false });
    createWindow();
    createTray({
      onShow: showWindow,
      onHide: hideWindow,
      onToggleAlwaysOnTop: toggleAlwaysOnTop,
      onSettings: showSettings,
      onQuit: () => {
        isQuitting = true;
        app.quit();
      }
    });
    screen.on("display-added", applyWindowBounds);
    screen.on("display-removed", applyWindowBounds);
    screen.on("display-metrics-changed", applyWindowBounds);
    powerMonitor.on("resume", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        applyWindowBounds();
        mainWindow.webContents.send("system-resumed");
      }
    });
  });
  app.on("activate", () => {
    if (!mainWindow) createWindow();
    showWindow();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") ;
  });
  app.on("before-quit", () => {
    isQuitting = true;
  });
  app.on("will-quit", () => {
    destroyTray();
  });
}
function shouldQuit() {
  return isQuitting;
}
