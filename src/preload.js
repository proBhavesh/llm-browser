// Preload script for webview
const { ipcRenderer } = require("electron");

// Initialize when the window is loaded
window.addEventListener("load", () => {
  console.log("Preload: Window loaded");
  initializePreload();
});

function initializePreload() {
  try {
    console.log("Preload: Initializing...");

    // Add CSS fixes
    const style = document.createElement("style");
    style.textContent = `
            * {
                box-sizing: border-box !important;
            }
            
            img {
                max-width: 100% !important;
                height: auto !important;
            }
            
            body {
                overflow-x: hidden !important;
            }
        `;
    document.head.appendChild(style);

    // Expose APIs directly to window since contextIsolation is false
    window.browserAPI = {
      getMetadata: () => {
        try {
          const metadata = {
            title: document.title || "",
            description:
              document.querySelector('meta[name="description"]')?.content ||
              document.querySelector('meta[property="og:description"]')
                ?.content ||
              "",
            keywords:
              document.querySelector('meta[name="keywords"]')?.content || "",
            url: window.location.href,
          };
          console.log("Preload: Extracted metadata:", metadata);
          return metadata;
        } catch (error) {
          console.error("Preload: Error extracting metadata:", error);
          return {
            title: "",
            description: "",
            keywords: "",
            url: window.location.href,
          };
        }
      },
    };

    console.log("Preload: Initialization complete");
  } catch (error) {
    console.error("Preload: Initialization error:", error);
  }
}

// Disable eval for security
window.eval = global.eval = () => {
  throw new Error("Eval is disabled for security reasons");
};
