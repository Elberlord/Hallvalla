"use strict";

const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const HALLVALLA_WINDOWS_VERSION = "1.0.143";
const HALLVALLA_WINDOW_TITLE = "HallValla";
let localServer = null;
let mainWindow = null;
let localOrigin = "";

const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
});

function getWebRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "web")
    : path.resolve(__dirname, "..", "web");
}

function getIntegrityManifestPath() {
  return path.join(__dirname, "web-integrity.json");
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function verifyWebIntegrity() {
  const manifestPath = getIntegrityManifestPath();
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Falta web-integrity.json.");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest?.schema !== "hallvalla-web-integrity-v1" || !Array.isArray(manifest.files)) {
    throw new Error("Manifest de integridad inválido.");
  }

  const root = path.resolve(getWebRoot());
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;

  for (const row of manifest.files) {
    const rel = String(row?.path || "").replace(/\\/g, "/");
    const full = path.resolve(root, rel);
    if (!rel || (full !== root && !full.startsWith(rootPrefix))) {
      throw new Error(`Ruta protegida inválida: ${rel}`);
    }
    if (!fs.existsSync(full)) {
      throw new Error(`Archivo protegido ausente: ${rel}`);
    }

    const stat = fs.statSync(full);
    if (!stat.isFile() || stat.size !== Number(row.size)) {
      throw new Error(`Archivo protegido alterado: ${rel}`);
    }

    const digest = await sha256File(full);
    if (digest !== String(row.sha256 || "").toLowerCase()) {
      throw new Error(`SHA-256 no coincide: ${rel}`);
    }
  }

  return true;
}

async function refuseTamperedBuild(error) {
  const detail = String(error?.message || error || "Integridad desconocida");
  console.error("[HallValla][Security] Integridad rechazada:", detail);
  try {
    await dialog.showMessageBox({
      type: "error",
      title: "HallValla · Integridad",
      message: "Esta instalación de HallValla fue modificada o está dañada.",
      detail: `${detail}\n\nReinstala HallValla desde una distribución oficial.`,
      buttons: ["Cerrar"],
      defaultId: 0,
      noLink: true
    });
  } catch (_) {}
  app.quit();
}

function resolveWebPath(requestUrl) {
  const root = path.resolve(getWebRoot());
  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname || "/");
  } catch (_) {
    return null;
  }

  if (pathname === "/") pathname = "/hallvalla-stage.html";
  const relative = pathname.replace(/^[/\\]+/, "");
  const absolute = path.resolve(root, relative);
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;

  if (absolute !== root && !absolute.startsWith(rootPrefix)) return null;
  return absolute;
}

function sendFile(req, res, filePath) {
  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("HallValla: recurso no encontrado.");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": app.isPackaged ? "public, max-age=3600" : "no-cache",
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("HallValla: no se pudo leer el recurso.");
    });
    stream.pipe(res);
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", "Allow": "GET, HEAD" });
        res.end("Method Not Allowed");
        return;
      }

      const filePath = resolveWebPath(req.url || "/");
      if (!filePath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      sendFile(req, res, filePath);
    });

    localServer.once("error", reject);
    localServer.listen(0, "localhost", () => {
      const address = localServer.address();
      const port = typeof address === "object" && address ? address.port : 0;
      if (!port) {
        reject(new Error("No se pudo reservar el puerto local de HallValla."));
        return;
      }
      localOrigin = `http://localhost:${port}`;
      resolve(localOrigin);
    });
  });
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return localOrigin && url.origin === localOrigin;
  } catch (_) {
    return false;
  }
}

function isTrustedPopup(value) {
  if (!value || value === "about:blank") return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    return (
      host === "accounts.google.com" ||
      host.endsWith(".google.com") ||
      host.endsWith(".googleapis.com") ||
      host.endsWith(".googleusercontent.com") ||
      host.endsWith(".firebaseapp.com") ||
      host.endsWith(".web.app") ||
      host === "paypal.com" ||
      host.endsWith(".paypal.com") ||
      host.endsWith(".paypalobjects.com")
    );
  } catch (_) {
    return false;
  }
}

function iconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "web", "assets", "branding", "hallvalla_logo_512.png")
    : path.resolve(__dirname, "..", "web", "assets", "branding", "hallvalla_logo_512.png");
}

async function createMainWindow(origin) {
  mainWindow = new BrowserWindow({
    title: HALLVALLA_WINDOW_TITLE,
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#05070d",
    icon: iconPath(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });

  mainWindow.webContents.setUserAgent(
    `${mainWindow.webContents.getUserAgent()} HallVallaWindows/${HALLVALLA_WINDOWS_VERSION}`
  );

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedPopup(url)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 560,
          height: 760,
          parent: mainWindow,
          modal: false,
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
          }
        }
      };
    }
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isLocalUrl(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      event.preventDefault();
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.on("did-finish-load", () => {
    void mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          globalThis.__HALLVALLA_DESKTOP__ = "windows";
          globalThis.__HALLVALLA_DESKTOP_VERSION__ = ${JSON.stringify(HALLVALLA_WINDOWS_VERSION)};
          document.documentElement.dataset.hallvallaDesktop = "windows";
          const download = document.getElementById("hallvallaAndroidDownloadBtn");
          if (download) download.hidden = true;
        } catch (_) {}
      })();
    `, true);
  });

  await mainWindow.loadURL(`${origin}/hallvalla-stage.html?desktop=windows`);
}

app.setAppUserModelId("com.hallvalla.game.windows");

app.whenReady().then(async () => {
  try {
    await verifyWebIntegrity();
    console.log("[HallValla][Security] Integridad web verificada.");
    const origin = await startLocalServer();
    await createMainWindow(origin);
  } catch (error) {
    await refuseTamperedBuild(error);
  }

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0 && localOrigin) {
      await createMainWindow(localOrigin);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServer) {
    try { localServer.close(); } catch (_) {}
    localServer = null;
  }
});
