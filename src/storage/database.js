import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
  constructor() {
    const dbPath = path.join(__dirname, "../../data/knowledge.db");

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error opening database:", err);
      } else {
        this.initialize();
      }
    });
  }

  initialize() {
    this.db.serialize(() => {
      // Categories table
      this.db.run(`
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

      // Content table
      this.db.run(`
                CREATE TABLE IF NOT EXISTS content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT,
                    title TEXT,
                    summary TEXT,
                    full_content TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

      // Content-Category relationship table
      this.db.run(`
                CREATE TABLE IF NOT EXISTS content_categories (
                    content_id INTEGER,
                    category_id INTEGER,
                    FOREIGN KEY (content_id) REFERENCES content(id),
                    FOREIGN KEY (category_id) REFERENCES categories(id),
                    PRIMARY KEY (content_id, category_id)
                )
            `);
    });
  }

  // Category operations
  async addCategory(name, description) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)",
        [name, description],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getCategories() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM categories ORDER BY name", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Content operations
  async addContent(url, title, summary, fullContent) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO content (url, title, summary, full_content) VALUES (?, ?, ?, ?)",
        [url, title, summary, fullContent],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async linkContentToCategory(contentId, categoryId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR IGNORE INTO content_categories (content_id, category_id) VALUES (?, ?)",
        [contentId, categoryId],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getContentByCategory(categoryId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT c.* FROM content c
                JOIN content_categories cc ON c.id = cc.content_id
                WHERE cc.category_id = ?
                ORDER BY c.created_at DESC
            `,
        [categoryId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async searchContent(query) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
                SELECT * FROM content
                WHERE title LIKE ? OR summary LIKE ?
                ORDER BY created_at DESC
            `,
        [`%${query}%`, `%${query}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  close() {
    this.db.close();
  }
}

export default new Database();
