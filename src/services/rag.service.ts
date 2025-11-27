import { RAGApplicationBuilder } from "@llm-tools/embedjs";
import { LibSqlDb } from "@llm-tools/embedjs-libsql";
import { MarkdownLoader } from "@llm-tools/embedjs-loader-markdown";
import { PdfLoader } from "@llm-tools/embedjs-loader-pdf";
import { WebLoader } from "@llm-tools/embedjs-loader-web";
import { OllamaEmbeddings } from "@llm-tools/embedjs-ollama";
import { OpenAi } from "@llm-tools/embedjs-openai";
import * as fs from "fs/promises";
import { appConfig } from "../config/app.config";
import type { FileType, RAGResponse } from "../types";
export class RAGService {
  private static instance: RAGService;
  private ragApplication: any;

  private constructor() {}

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  /**
   * Initialize RAG Application
   */
  public async initialize(): Promise<void> {
    try {
      this.ragApplication = await new RAGApplicationBuilder()
        .setModel(
          new OpenAi({
            modelName: appConfig.openai.modelName,
            apiKey: appConfig.openai.apiKey,
            verbose: appConfig.openai.verbose,
            configuration: {
              baseURL: appConfig.openai.baseURL,
            },
          })
        )
        .setEmbeddingModel(
          new OllamaEmbeddings({
            model: appConfig.embeddings.model,
            baseUrl: appConfig.embeddings.baseURL,
          })
        )
        .setVectorDatabase(
          new LibSqlDb({
            path: appConfig.database.path,
          })
        )
        .build();
    } catch (error) {
      console.error("Error initializing RAG application:", error);
      throw new Error("Failed to initialize RAG application");
    }
  }

  /**
   * Add web source to RAG application
   */
  public async addWebSource(url: string): Promise<string> {
    if (!this.ragApplication) {
      throw new Error("RAG application not initialized");
    }

    try {
      console.log(`Loading web page: ${url}`);
      await this.ragApplication.addLoader(
        new WebLoader({
          urlOrContent: url,
          chunkSize: appConfig.chat.chunkSize,
          chunkOverlap: appConfig.chat.chunkOverlap,
        })
      );
      console.log(`Web page loaded: ${url}`);

      const hostname = new URL(url).hostname;
      return `<div>- ${hostname}</div>`;
    } catch (error) {
      console.error("Error loading web source:", error);
      throw new Error(`Failed to load web source: ${url}`);
    }
  }

  /**
   * Add file source to RAG application and delete the file after processing
   */
  public async addFileSource(
    filePath: string,
    fileType: FileType,
    fileName: string
  ): Promise<string> {
    if (!this.ragApplication) {
      throw new Error("RAG application not initialized");
    }

    try {
      console.log(`Loading file: ${fileName}`);

      const loader = this.createLoader(filePath, fileType);
      await this.ragApplication.addLoader(loader);

      console.log(`File loaded: ${fileName}`);

      // Delete the file after successful processing
      try {
        await fs.unlink(filePath);
        console.log(`Deleted temporary file: ${fileName}`);
      } catch (deleteError) {
        console.warn(
          `Could not delete temporary file ${fileName}:`,
          deleteError
        );
        // Don't throw error - file processing was successful
      }

      return `<div>- ${fileName}</div>`;
    } catch (error) {
      console.error("Error loading file source:", error);

      // Try to clean up the file even if processing failed
      try {
        await fs.unlink(filePath);
        console.log(`Cleaned up failed file: ${fileName}`);
      } catch (deleteError) {
        console.warn(
          `Could not clean up failed file ${fileName}:`,
          deleteError
        );
      }

      throw new Error(`Failed to load file: ${fileName}`);
    }
  }

  /**
   * Query RAG application
   */
  public async query(question: string): Promise<string> {
    if (!this.ragApplication) {
      throw new Error("RAG application not initialized");
    }

    try {
      const answer = await this.ragApplication.query(question);
      return this.formatResponse(answer);
    } catch (error) {
      console.error("Error querying RAG application:", error);
      throw new Error("Failed to process query");
    }
  }

  /**
   * Clear all sources and reinitialize
   */
  public async clearSources(): Promise<void> {
    try {
      console.log("Clearing all sources and removing DB file...");

      try {
        await fs.unlink(appConfig.database.path);
        console.log("Database file removed.");
      } catch (e) {
        console.log("Database file did not exist or could not be removed.");
      }

      await this.initialize();
      console.log("All sources cleared and new DB created.");
    } catch (error) {
      console.error("Error clearing sources:", error);
      throw new Error("Failed to clear sources");
    }
  }

  /**
   * Create appropriate loader based on file type
   */
  private createLoader(filePath: string, fileType: FileType) {
    switch (fileType) {
      case "application/pdf":
        return new PdfLoader({ filePathOrUrl: filePath });
      case "text/markdown":
      case "text/plain":
        return new MarkdownLoader({ filePathOrUrl: filePath });
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Format RAG response to string
   */
  private formatResponse(answer: RAGResponse): string {
    if (
      answer &&
      typeof answer === "object" &&
      "content" in answer &&
      answer.content
    ) {
      return String(answer.content);
    } else if (
      answer &&
      typeof answer === "object" &&
      "text" in answer &&
      answer.text
    ) {
      return String(answer.text);
    } else if (typeof answer === "string") {
      return answer;
    } else {
      return JSON.stringify(answer);
    }
  }

  /**
   * Check if RAG application is initialized
   */
  public isInitialized(): boolean {
    return !!this.ragApplication;
  }
}
