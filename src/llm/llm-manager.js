class LLMManager {
  constructor() {
    this.initialized = false;
    this.ollamaEndpoint = "http://localhost:11434/api";
    this.model = "llama2:latest";
    this.retryAttempts = 3;
    this.debug = true; // Enable detailed logging
  }

  log(...args) {
    if (this.debug) {
      console.log("[LLM]", ...args);
    }
  }

  async initialize() {
    try {
      this.log("Initializing LLM Manager...");
      this.log("Checking Ollama connection...");

      // Test connection to Ollama
      const response = await fetch(`${this.ollamaEndpoint}/tags`);
      if (!response.ok) {
        throw new Error("Failed to connect to Ollama");
      }

      this.log("Connected to Ollama successfully");
      const data = await response.json();
      const models = data.models || [];

      this.log("Available models:", models.map((m) => m.name).join(", "));

      if (!models.some((m) => m.name === this.model)) {
        console.warn(
          `Model ${this.model} not found. Please run: ollama pull ${this.model}`
        );
        return false;
      }

      this.log(`Found required model: ${this.model}`);
      this.log("Testing model with simple prompt...");

      // Test model with a simple prompt
      const testResponse = await this.generateCompletion(
        'Hello, please respond with "OK" if you can read this.'
      );
      if (!testResponse?.includes("OK")) {
        throw new Error("Model response validation failed");
      }

      this.initialized = true;
      this.log(`Successfully initialized ${this.model} model`);
      this.log("LLM Manager is ready");
      return true;
    } catch (error) {
      console.error("Failed to initialize Ollama:", error);
      return false;
    }
  }

  async generateCompletion(prompt, attempt = 1) {
    try {
      this.log(
        `Generating completion (attempt ${attempt}/${this.retryAttempts})`
      );
      this.log("Prompt length:", prompt.length, "characters");

      const startTime = Date.now();
      const response = await fetch(`${this.ollamaEndpoint}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.5,
            top_k: 50,
            top_p: 0.95,
            num_predict: 2048,
            stop: ["</response>"],
            repeat_penalty: 1.1,
            presence_penalty: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate completion");
      }

      const result = await response.json();
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds

      this.log(`Completion generated in ${duration.toFixed(2)} seconds`);
      this.log("Response length:", result.response.length, "characters");

      return result.response;
    } catch (error) {
      console.error(
        `Error generating completion (attempt ${attempt}/${this.retryAttempts}):`,
        error
      );
      if (attempt < this.retryAttempts) {
        this.log(`Retrying... (attempt ${attempt + 1}/${this.retryAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        return this.generateCompletion(prompt, attempt + 1);
      }
      return null;
    }
  }

  async categorizeContent(content, metadata) {
    if (!this.initialized) {
      console.error("LLM not initialized");
      return null;
    }

    this.log("Starting content categorization");
    this.log("Content length:", content.length, "characters");
    this.log("Metadata:", {
      title: metadata.title?.substring(0, 50) + "...",
      description: metadata.description?.substring(0, 50) + "...",
      keywords: metadata.keywords,
    });

    const prompt = `<system>You are a precise content analysis assistant. Your task is to analyze content and provide structured categorization in valid JSON format.</system>

<input>
Title: ${metadata.title}
Description: ${metadata.description}
Keywords: ${metadata.keywords}

Content:
${content.substring(0, 2000)}
</input>

<task>
Analyze the content and provide a JSON response with:
1. 2-4 relevant categories that best describe the content
2. A concise 2-3 sentence summary
3. 3-5 specific topics covered in the content
</task>

<format>
{
    "categories": ["category1", "category2"],
    "summary": "brief summary of the content",
    "topics": ["topic1", "topic2", "topic3"]
}
</format>

<rules>
- Ensure response is valid JSON
- Keep categories and topics specific and relevant
- Summary should be clear and informative
- Do not include any text outside the JSON structure
</rules>

<response>`;

    try {
      this.log("Sending categorization prompt to LLM...");
      const response = await this.generateCompletion(prompt);
      if (!response) return null;

      this.log("Received response from LLM, extracting JSON...");
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Failed to extract JSON from response");
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!parsed.categories || !parsed.summary || !parsed.topics) {
        console.error("Invalid response structure");
        return null;
      }

      this.log("Successfully categorized content");
      this.log("Categories:", parsed.categories);
      this.log("Topics:", parsed.topics);
      this.log("Summary length:", parsed.summary.length, "characters");

      return parsed;
    } catch (error) {
      console.error("Error categorizing content:", error);
      return null;
    }
  }

  async updateCategoryKnowledge(category, newContent) {
    if (!this.initialized) {
      console.error("LLM not initialized");
      return null;
    }

    this.log(`Updating knowledge for category: ${category}`);
    this.log("New content length:", newContent.length, "characters");

    const prompt = `<system>You are a knowledgeable curator specializing in organizing and synthesizing information for the category: ${category}</system>

<input>
${newContent}
</input>

<task>
Analyze this new information and provide:
1. Key points and insights
2. Relationship to the ${category} category
3. Emerging patterns or trends
4. Potential sub-categories
</task>

<format>
Provide a structured response with clear headings and bullet points.
Focus on accuracy and relevance to the category.
</format>

<response>`;

    try {
      this.log("Sending knowledge update prompt to LLM...");
      const response = await this.generateCompletion(prompt);
      this.log("Knowledge update completed");
      return response;
    } catch (error) {
      console.error("Error updating category knowledge:", error);
      return null;
    }
  }

  async generateSummary(content, metadata) {
    if (!this.initialized) {
      console.error("LLM not initialized");
      return null;
    }

    this.log("Starting content summarization");
    this.log("Content length:", content.length, "characters");
    this.log("Title:", metadata.title);

    const prompt = `<system>You are an expert content summarizer focused on extracting key information and maintaining context.</system>

<input>
Title: ${metadata.title}
Content: ${content.substring(0, 1500)}
</input>

<task>
Create a comprehensive yet concise summary that:
1. Captures the main points and key ideas
2. Maintains the original context and meaning
3. Is easy to understand
4. Highlights significant findings or conclusions
</task>

<format>
- Keep the summary to 2-3 clear, informative sentences
- Focus on the most important information
- Maintain a neutral, professional tone
</format>

<response>`;

    try {
      this.log("Sending summarization prompt to LLM...");
      const response = await this.generateCompletion(prompt);
      this.log("Summary generated, length:", response?.length, "characters");
      return response;
    } catch (error) {
      console.error("Error generating summary:", error);
      return null;
    }
  }
}

export const llmManager = new LLMManager();
