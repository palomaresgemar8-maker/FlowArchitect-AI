# FlowArchitect AI — Automation Blueprint & Mind Map Studio

FlowArchitect AI is an interactive automation architecture & visual blueprint studio for **n8n**, **Make.com**, **Zapier**, and **GoHighLevel (GHL)**.

## Features
- **Interactive Blueprint Canvas & Mind Map Mode**: Toggle between structured workflow architecture and radial/tree Mind Map mode.
- **AI Agent Sub-Node Architecture**: Attach **Chat Model (LLM)**, **Memory**, **MCP / Tools**, and **Output Parser** sub-nodes directly to AI Agent nodes.
- **Universal LLM & Uno Router Support (`PARAM` | `VALUE`)**: Configure Google Gemini, Uno Router, DeepSeek (`deepseek-flash`, `deepseek-v4-pro`), OpenAI, OpenRouter, Anthropic, or Ollama endpoints with custom `base_url (OpenAI)`, `base_url (Anthropic)`, and dynamic `PARAM` / `VALUE` pairs.
- **Animated GIF, PNG, SVG & Native JSON Export**: Export animated data-flow GIFs, high-DPI diagrams, or native platform JSON blueprints.
- **1-Click Scope of Work (SOW) Generator**: Generate client-ready technical proposals and ROI projections from any workflow graph.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and configure your API keys:
   ```bash
   cp .env.example .env
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
