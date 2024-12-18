import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import contentHandler from "./content-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow;

async function initialize() {
  try {
    await contentHandler.initialize();
    console.log("Content handler initialized successfully");
  } catch (error) {
    console.error("Failed to initialize content handler:", error);
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: false,
      experimentalFeatures: true,
      sandbox: false,
    },
  });

  // Configure session
  const webContents = mainWindow.webContents;
  const ses = webContents.session;

  // Set user agent
  ses.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  // Configure permissions
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = [
      "media",
      "geolocation",
      "notifications",
      "fullscreen",
      "clipboard-read",
      "clipboard-write",
    ];
    callback(allowedPermissions.includes(permission));
  });

  // Configure content security policy
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
        "Content-Security-Policy": [
          "default-src * 'unsafe-inline' 'unsafe-eval'; " +
            "img-src * data: blob: 'unsafe-inline'; " +
            "script-src * 'unsafe-inline' 'unsafe-eval'; " +
            "style-src * 'unsafe-inline';",
        ],
      },
    });
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Open the DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Handle new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open links in the same window
    if (url.startsWith("http")) {
      mainWindow.webContents.loadURL(url);
    }
    return { action: "deny" };
  });

  // Handle certificate errors
  app.on(
    "certificate-error",
    (event, webContents, url, error, certificate, callback) => {
      event.preventDefault();
      callback(true);
    }
  );
}

// Create window when app is ready
app.whenReady().then(() => {
  // Disable security warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

  createWindow();
  initialize();
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.on("app-ready", (event) => {
  console.log("Renderer process is ready");
});

ipcMain.on("process-content", async (event, data) => {
  try {
    console.log("Received content for processing:", {
      url: data.url,
      contentLength: data.content?.length,
      metadata: data.metadata,
    });

    // Ensure metadata has default values
    const metadata = {
      title: data.metadata?.title || "Untitled Page",
      description: data.metadata?.description || "",
      keywords: data.metadata?.keywords || "",
      url: data.url,
    };

    const result = await contentHandler.processContent(
      data.url,
      data.content,
      metadata
    );
    if (result) {
      console.log("Processing complete, sending results back to renderer");
      event.reply("update-categories", result.categories);
      event.reply("update-summary", result.summary);
    } else {
      console.error("Processing failed or returned no results");
      event.reply("update-summary", "Failed to process content");
    }
  } catch (error) {
    console.error("Error processing content:", error);
    event.reply("update-summary", "Error processing content");
  }
});

ipcMain.handle("get-categories", async () => {
  return await contentHandler.getCategories();
});

ipcMain.handle("get-category-content", async (event, categoryId) => {
  return await contentHandler.getCategoryContent(categoryId);
});

ipcMain.handle("search-content", async (event, query) => {
  return await contentHandler.searchContent(query);
});
