import { Database } from "bun:sqlite";
import { appConfig } from "../config/app.config";
import type { DatabaseRow, SourceItem } from "../types";

export class DatabaseService {
  private static instance: DatabaseService;
  private dbPath: string;

  private constructor() {
    this.dbPath = appConfig.database.path;
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get unique sources from the vector database
   */
  public async getSources(): Promise<SourceItem[]> {
    try {
      const db = new Database(this.dbPath);
      const sources = db
        .query("SELECT DISTINCT source FROM vectors WHERE source IS NOT NULL")
        .all() as DatabaseRow[];
      db.close();

      return sources.map((row) => this.formatSource(row.source));
    } catch (error) {
      console.error("Error fetching sources:", error);
      return [];
    }
  }

  /**
   * Check if database exists and has data
   */
  public async databaseExists(): Promise<boolean> {
    try {
      const db = new Database(this.dbPath);
      const result = db
        .query("SELECT COUNT(*) as count FROM vectors")
        .get() as { count: number };
      db.close();
      return result.count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format source into SourceItem with appropriate icon and display name
   */
  private formatSource(source: string): SourceItem {
    let displayName = source;
    let icon = "📄";
    let type: SourceItem["type"] = "unknown";

    try {
      // Check if it's a URL
      const url = new URL(source);
      displayName = url.hostname;
      icon = "🌐";
      type = "web";
    } catch {
      // It's a file path
      if (source.endsWith(".pdf")) {
        icon = "📕";
        type = "pdf";
        displayName = source.split("/").pop() || source;
      } else if (source.endsWith(".md")) {
        icon = "📝";
        type = "markdown";
        displayName = source.split("/").pop() || source;
      } else if (source.endsWith(".txt")) {
        icon = "📝";
        type = "text";
        displayName = source.split("/").pop() || source;
      } else if (source.includes("/")) {
        displayName = source.split("/").pop() || source;
      }
    }

    return {
      source,
      displayName,
      icon,
      type,
    };
  }

  /**
   * Get formatted HTML for sources list
   */
  public async getSourcesHTML(): Promise<string> {
    const sources = await this.getSources();

    if (sources.length === 0) {
      return '<div style="color: #666; font-style: italic;">No sources added yet</div>';
    }

    return sources
      .map(
        (item) =>
          `<div class="source-item">${item.icon} ${item.displayName}</div>`
      )
      .join("");
  }
}
