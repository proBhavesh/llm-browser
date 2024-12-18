# LLM Browser - Offline Knowledge Management System

An Electron-based browser that automatically categorizes and summarizes your browsing content using a local LLM.

## Features

- Built-in web browser
- Automatic content extraction
- Local LLM processing
- Automatic content categorization
- Knowledge base management
- Fully offline operation
- Source reference tracking

## Prerequisites

- Node.js (v18 or higher)
- Git
- 16GB RAM minimum (for running local LLM)
- 10GB disk space (for LLM models and knowledge base)

## Installation

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/llm-browser.git
   cd llm-browser
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Download LLM model:
   Create a \`models\` directory and download your preferred LLAMA model.

4. Start the application:
   \`\`\`bash
   npm start
   \`\`\`

## Project Structure

- \`src/main\`: Electron main process
- \`src/renderer\`: Electron renderer process
- \`src/browser\`: Browser integration
- \`src/llm\`: LLM integration
- \`src/storage\`: Database and storage
- \`src/utils\`: Helper functions

## Development

- Build: \`npm run build\`
- Test: \`npm test\`

## License

MIT
