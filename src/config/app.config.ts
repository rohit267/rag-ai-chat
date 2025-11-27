export interface AppConfig {
  server: {
    port: number;
    hostname: string;
  };
  openai: {
    apiKey: string;
    modelName: string;
    baseURL: string;
    verbose: boolean;
  };
  embeddings: {
    model: string;
    apiKey: string;
    dimensions: number;
    baseURL: string;
    verbose: boolean;
  };
  database: {
    path: string;
  };
  uploads: {
    directory: string;
    allowedTypes: string[];
    maxFileSize: number; // in bytes
    cleanupInterval: number; // in milliseconds
    maxFileAge: number; // in milliseconds
  };
  chat: {
    chunkSize: number;
    chunkOverlap: number;
  };
}

export const appConfig: AppConfig = {
  server: {
    port: Number(process.env.PORT) || 3000,
    hostname: process.env.HOST || "localhost",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    modelName: process.env.OPENAI_MODEL || "x-ai/grok-4.1-fast:free",
    baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
    verbose: process.env.OPENAI_VERBOSE === "true" || false,
  },
  embeddings: {
    model:
      process.env.EMBEDDINGS_MODEL || "nomic-embed-text:latest",
    apiKey: process.env.EMBEDDINGS_API_KEY || "lm-studio",
    dimensions: Number(process.env.EMBEDDINGS_DIMENSIONS) || 768,
    baseURL: process.env.EMBEDDINGS_BASE_URL || "http://localhost:11434",
    verbose: process.env.EMBEDDINGS_VERBOSE === "true" || false,
  },
  database: {
    path: process.env.DATABASE_PATH || "./store/vectors.db",
  },
  uploads: {
    directory: process.env.UPLOADS_DIR || "uploads",
    allowedTypes: ["application/pdf", "text/markdown", "text/plain"],
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    cleanupInterval: Number(process.env.CLEANUP_INTERVAL) || 60 * 1000, // 1 minute
    maxFileAge: Number(process.env.MAX_FILE_AGE) || 60 * 1000, // 1 minute
  },
  chat: {
    chunkSize: Number(process.env.CHUNK_SIZE) || 400,
    chunkOverlap: Number(process.env.CHUNK_OVERLAP) || 50,
  },
};
