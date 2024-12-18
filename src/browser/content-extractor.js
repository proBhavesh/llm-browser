import * as cheerio from "cheerio";
import { parse } from "node-html-parser";

class ContentExtractor {
  constructor() {
    // Tags to exclude from content extraction
    this.excludeTags = [
      "script",
      "style",
      "noscript",
      "iframe",
      "svg",
      "header",
      "footer",
      "nav",
      "aside",
    ];
  }

  extractContent(html) {
    const root = parse(html);
    const $ = cheerio.load(html);

    // Remove excluded tags
    this.excludeTags.forEach((tag) => {
      $(tag).remove();
    });

    // Extract main content
    const mainContent = this.findMainContent($);

    // Extract metadata
    const metadata = {
      title: $("title").text().trim(),
      description: $('meta[name="description"]').attr("content") || "",
      keywords: $('meta[name="keywords"]').attr("content") || "",
    };

    return {
      content: this.cleanText(mainContent),
      metadata,
    };
  }

  findMainContent($) {
    // Try to find main content container
    const contentSelectors = [
      "main",
      "article",
      "#content",
      ".content",
      ".main",
      ".post",
      ".article",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        return element.text();
      }
    }

    // Fallback to body content
    return $("body").text();
  }

  cleanText(text) {
    return text.replace(/\\s+/g, " ").replace(/\\n+/g, "\\n").trim();
  }
}

export default new ContentExtractor();
