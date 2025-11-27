import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { Elysia, t } from "elysia";
import { appConfig } from "./config/app.config";
import { DatabaseService } from "./services/database.service";
import { FileUploadService } from "./services/file-upload.service";
import { RAGService } from "./services/rag.service";
import type { AddFileRequest, AddSourceRequest, ChatQuery } from "./types";

// Initialize services
const databaseService = DatabaseService.getInstance();
const fileUploadService = FileUploadService.getInstance();
const ragService = RAGService.getInstance();

// Initialize RAG application
async function initializeApp() {
  try {
    await ragService.initialize();
    await fileUploadService.initialize();

    // Start periodic cleanup of old files
    setInterval(() => {
      fileUploadService.cleanupOldFiles(appConfig.uploads.maxFileAge);
    }, appConfig.uploads.cleanupInterval);

    console.log("✅ Application initialized successfully");
    console.log(
      `🧹 File cleanup will run every ${
        appConfig.uploads.cleanupInterval / (60 * 1000)
      } minutes`
    );
  } catch (error) {
    console.error("❌ Failed to initialize application:", error);
    process.exit(1);
  }
}

await initializeApp();

// Error handling helper
function handleError(
  error: unknown,
  fallbackMessage: string = "An unexpected error occurred"
): string {
  console.error("Error:", error);
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  return `<div style="color: #f56565; padding: 10px; border: 1px solid #fed7d7; border-radius: 8px; background: #fef5e7;">⚠️ ${errorMessage}</div>`;
}

const app = new Elysia()
  .use(staticPlugin())
  .use(html())

  // Serve main HTML page
  .get("/", () => Bun.file("public/index.html").text())

  // Add web source endpoint
  .post(
    "/add-source",
    async ({ body }: { body: AddSourceRequest }) => {
      try {
        if (!body.url || typeof body.url !== "string") {
          throw new Error("Valid URL is required");
        }

        // Validate URL format
        try {
          new URL(body.url);
        } catch {
          throw new Error("Invalid URL format");
        }

        const result = await ragService.addWebSource(body.url);
        return result;
      } catch (error) {
        return handleError(error, "Failed to add web source");
      }
    },
    {
      body: t.Object({
        url: t.String({ minLength: 1 }),
      }),
    }
  )

  // Add file upload endpoint
  .post(
    "/add-file",
    async ({ body }: { body: AddFileRequest }) => {
      try {
        if (!body.file) {
          throw new Error("File is required");
        }

        console.log(
          `Received file: ${body.file.name} (${FileUploadService.formatFileSize(
            body.file.size
          )})`
        );

        const uploadedFile = await fileUploadService.saveFile(body.file);
        const result = await ragService.addFileSource(
          uploadedFile.path,
          uploadedFile.type,
          uploadedFile.name
        );
        return result;
      } catch (error) {
        return handleError(error, "Failed to upload file");
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  // Get sources endpoint
  .get("/sources", async () => {
    try {
      return await databaseService.getSourcesHTML();
    } catch (error) {
      return handleError(error, "Failed to load sources");
    }
  })

  // Clear sources endpoint
  .post("/clear-sources", async () => {
    try {
      await ragService.clearSources();
      return "";
    } catch (error) {
      return handleError(error, "Failed to clear sources");
    }
  })

  // Chat endpoint
  .post(
    "/chat",
    async ({ body }: { body: ChatQuery }) => {
      try {
        if (
          !body.query ||
          typeof body.query !== "string" ||
          body.query.trim().length === 0
        ) {
          throw new Error("Query cannot be empty");
        }

        if (!ragService.isInitialized()) {
          throw new Error("RAG service is not initialized");
        }

        const answer = await ragService.query(body.query.trim());

        return `<div class="assistant-message" data-markdown="${answer.replace(
          /"/g,
          "&quot;"
        )}">${answer}</div>`;
      } catch (error) {
        const errorHtml = handleError(error, "Failed to process your question");
        return `<div class="assistant-message">${errorHtml}</div>`;
      }
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1 }),
      }),
    }
  )

  // Get configuration endpoint
  .get("/config", () => {
    return {
      maxFileSize: appConfig.uploads.maxFileSize,
      maxFileSizeMB: Math.round(appConfig.uploads.maxFileSize / (1024 * 1024)),
      allowedTypes: appConfig.uploads.allowedTypes,
      allowedExtensions: [".pdf", ".md", ".txt"],
    };
  })

  // Health check endpoint
  .get("/health", () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        rag: ragService.isInitialized(),
        database: databaseService.databaseExists(),
      },
      config: {
        maxFileSize: appConfig.uploads.maxFileSize,
        cleanupInterval: appConfig.uploads.cleanupInterval,
        maxFileAge: appConfig.uploads.maxFileAge,
      },
    };
  })

  // Global error handler
  .onError(({ error, code }) => {
    console.error(`Error ${code}:`, error);

    switch (code) {
      case "VALIDATION":
        return new Response(handleError(error, "Invalid request data"), {
          status: 400,
        });
      case "NOT_FOUND":
        return new Response("Not Found", { status: 404 });
      case "INTERNAL_SERVER_ERROR":
        return new Response(handleError(error, "Internal server error"), {
          status: 500,
        });
      default:
        return new Response(handleError(error, "Something went wrong"), {
          status: 500,
        });
    }
  })

  .listen({
    port: appConfig.server.port,
  });

console.log(
  `🦊 Elysia is running at http://localhost:${appConfig.server.port}`
);
console.log(
  `📊 Health check available at http://localhost:${appConfig.server.port}/health`
);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  app.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  app.stop();
  process.exit(0);
});
