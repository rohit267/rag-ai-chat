import * as fs from "fs/promises";
import { join } from "path";
import { appConfig } from "../config/app.config";
import type { FileType, UploadedFile } from "../types";

export class FileUploadService {
  private static instance: FileUploadService;
  private uploadsDir: string;

  private constructor() {
    this.uploadsDir = appConfig.uploads.directory;
  }

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  /**
   * Initialize uploads directory
   */
  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating uploads directory:", error);
      throw new Error("Failed to initialize uploads directory");
    }
  }

  /**
   * Validate uploaded file
   */
  public validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > appConfig.uploads.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${
          appConfig.uploads.maxFileSize / (1024 * 1024)
        }MB`,
      };
    }

    // Check file type
    if (!appConfig.uploads.allowedTypes.includes(file.type as FileType)) {
      return {
        valid: false,
        error: `File type ${
          file.type
        } is not supported. Allowed types: ${appConfig.uploads.allowedTypes.join(
          ", "
        )}`,
      };
    }

    // Check filename
    if (!file.name || file.name.length === 0) {
      return {
        valid: false,
        error: "File name is required",
      };
    }

    return { valid: true };
  }

  /**
   * Save uploaded file to disk
   */
  public async saveFile(file: File): Promise<UploadedFile> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Ensure uploads directory exists
      await this.initialize();

      // Generate safe filename
      const safeFilename = this.generateSafeFilename(file.name);
      const filePath = join(this.uploadsDir, safeFilename);
      const fullPath = join(process.cwd(), filePath);

      // Write file to disk
      await Bun.write(fullPath, file);

      return {
        name: safeFilename,
        type: file.type as FileType,
        size: file.size,
        path: fullPath,
      };
    } catch (error) {
      console.error("Error saving file:", error);
      throw new Error("Failed to save uploaded file");
    }
  }

  /**
   * Generate a safe filename by removing unsafe characters
   */
  private generateSafeFilename(originalName: string): string {
    // Remove unsafe characters and replace with underscores
    let safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Add timestamp if file exists
    const timestamp = Date.now();
    const parts = safeName.split(".");
    if (parts.length > 1) {
      const extension = parts.pop();
      const nameWithoutExt = parts.join(".");
      safeName = `${nameWithoutExt}_${timestamp}.${extension}`;
    } else {
      safeName = `${safeName}_${timestamp}`;
    }

    return safeName;
  }

  /**
   * Delete a specific file
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.log(`Deleted file: ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      // Don't throw error - file might already be deleted
    }
  }

  /**
   * Clean up uploaded files (optional utility method)
   */
  public async cleanupOldFiles(
    maxAgeMs: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAgeMs) {
          await this.deleteFile(filePath);
        }
      }
    } catch (error) {
      console.error("Error cleaning up files:", error);
    }
  }

  /**
   * Get file size in human-readable format
   */
  public static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
