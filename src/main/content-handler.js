import contentExtractor from "../browser/content-extractor.js";
import { llmManager } from "../llm/llm-manager.js";
import database from "../storage/database.js";

class ContentHandler {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize LLM
      const llmInitialized = await llmManager.initialize();
      if (!llmInitialized) {
        console.error("Failed to initialize LLM");
        return false;
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing ContentHandler:", error);
      return false;
    }
  }

  async processContent(url, htmlContent, metadata) {
    if (!this.initialized) {
      console.error("ContentHandler not initialized");
      return null;
    }

    console.log("Processing content for URL:", url);
    console.log("Content length:", htmlContent.length);
    console.log("Metadata:", metadata);

    try {
      // Process with LLM
      const analysis = await llmManager.categorizeContent(
        htmlContent,
        metadata
      );
      if (!analysis) {
        console.error("Failed to analyze content");
        return null;
      }

      console.log("Content analyzed successfully");
      console.log("Categories:", analysis.categories);
      console.log("Topics:", analysis.topics);

      // Store content
      const contentId = await database.addContent(
        url,
        metadata.title,
        analysis.summary,
        htmlContent
      );

      // Process categories
      for (const category of analysis.categories) {
        const categoryId = await database.addCategory(category, "");
        await database.linkContentToCategory(contentId, categoryId);

        // Update category knowledge
        await llmManager.updateCategoryKnowledge(
          category,
          `Title: ${metadata.title}\nSummary: ${analysis.summary}`
        );
      }

      return {
        categories: analysis.categories,
        summary: analysis.summary,
        topics: analysis.topics,
      };
    } catch (error) {
      console.error("Error processing content:", error);
      return null;
    }
  }

  async getCategoryContent(categoryId) {
    try {
      return await database.getContentByCategory(categoryId);
    } catch (error) {
      console.error("Error getting category content:", error);
      return [];
    }
  }

  async searchContent(query) {
    try {
      return await database.searchContent(query);
    } catch (error) {
      console.error("Error searching content:", error);
      return [];
    }
  }

  async getCategories() {
    try {
      return await database.getCategories();
    } catch (error) {
      console.error("Error getting categories:", error);
      return [];
    }
  }
}

export default new ContentHandler();
