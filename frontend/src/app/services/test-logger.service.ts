import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class TestLoggerService {
  private logEntries: {
    timestamp: string;
    level: string;
    category: string;
    message: string;
    details?: unknown;
  }[] = [];

  log(level: string, category: string, message: string, details?: unknown) {
    this.logEntries.push({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    });

    // Test loglarını dev.log'a yaz
    console.log(`[${level}] ${category}: ${message}`);
  }

  getLogEntries() {
    return this.logEntries;
  }

  clearLogs() {
    this.logEntries = [];
  }
}
