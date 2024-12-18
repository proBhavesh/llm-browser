import { ipcRenderer } from "electron";
import path from "path";

// Initialize browser controls
document.addEventListener("DOMContentLoaded", () => {
  console.log("Renderer: Initializing...");

  const webview = document.getElementById("browser");
  const urlInput = document.getElementById("url-input");
  const backButton = document.getElementById("back");
  const forwardButton = document.getElementById("forward");
  const reloadButton = document.getElementById("reload");

  // Set preload script path
  const preloadPath = path.join(__dirname, "../preload.js");
  console.log("Setting preload path:", preloadPath);
  webview.setAttribute("preload", preloadPath);

  // Set initial URL
  webview.setAttribute("src", "https://www.google.com");

  // Navigation controls
  backButton.addEventListener("click", () => {
    if (webview.canGoBack()) {
      webview.goBack();
    }
  });

  forwardButton.addEventListener("click", () => {
    if (webview.canGoForward()) {
      webview.goForward();
    }
  });

  reloadButton.addEventListener("click", () => {
    webview.reload();
  });

  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      let url = urlInput.value;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      webview.loadURL(url);
    }
  });

  // Webview event handlers
  webview.addEventListener("did-start-loading", () => {
    console.log("Loading started");
  });

  webview.addEventListener("did-finish-load", async () => {
    try {
      console.log("Loading finished");
      urlInput.value = webview.getURL();

      // Get metadata first
      const metadata = await webview.executeJavaScript(
        "browserAPI.getMetadata();",
        false
      );
      console.log("Got metadata:", metadata);

      // Get page content as plain text
      const content = await webview.executeJavaScript(
        `
        (() => {
          const content = document.documentElement.innerText;
          return { text: content };
        })();
      `,
        false
      );

      console.log("Sending content for processing:", {
        url: metadata.url,
        contentLength: content.text.length,
        metadata: metadata,
      });

      // Send only serializable data
      ipcRenderer.send("process-content", {
        url: metadata.url,
        content: content.text,
        metadata: {
          title: metadata.title || "",
          description: metadata.description || "",
          keywords: metadata.keywords || "",
          url: metadata.url,
        },
      });
    } catch (error) {
      console.error("Error processing page:", error);
    }
  });

  // IPC handlers for updates
  ipcRenderer.on("update-categories", (event, categories) => {
    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = categories
      .map((cat) => `<div class="category">${cat}</div>`)
      .join("");
  });

  ipcRenderer.on("update-summary", (event, summary) => {
    const summaryContent = document.getElementById("summary-content");
    summaryContent.textContent = summary;
  });

  // Notify main process that renderer is ready
  ipcRenderer.send("app-ready");
  console.log("Renderer: Initialization complete");
});
