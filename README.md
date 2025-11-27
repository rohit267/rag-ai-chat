# RAG AI Chat

> **RAG AI Chat** is an intelligent document assistant that lets you upload
> documents or add web sources, then chat with an AI to extract insights and
> answer questions based on your content. Built with
> [Elysia](https://elysiajs.com/), [Bun](https://bun.sh/), and modern embedding
> models.

## Features

- Upload PDF, Markdown, or Text files as knowledge sources
- Add web pages as sources
- Chat with an AI assistant over your custom knowledge base
- Fast, modern UI (HTMX, Marked.js)
- Health check and configuration endpoints

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3.1 or later
- Node.js 18+ (for some dependencies)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/rohit267/rag-ai-chat.git
cd rag-ai-chat
bun install
```

### Environment Variables

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

See `.env.example` for all available configuration options (OpenAI, embeddings,
uploads, etc).

### Running the App

```bash
# Development
bun run dev

# Production
bun run start
```

The app will be available at [http://localhost:3000](http://localhost:3000) by
default.

## Project Structure

- `src/` — Main application code
  - `main.ts` — Elysia server and API endpoints
  - `config/app.config.ts` — Configuration and environment variables
  - `services/` — Database, file upload, and RAG logic
- `public/` — Frontend HTML and assets
- `uploads/` — Uploaded files
- `store/` — Vector database

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for
details.
