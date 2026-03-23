/**
 * 数据库日志插件示例
 * 将清理记录保存到SQLite数据库
 */

const path = require('path');
const fs = require('fs').promises');
const Database = require('better-sqlite3');

// 数据库文件路径
const DB_FILE = path.join(require('os').homedir(), '.qingdaofu.db');

// 数据库连接
let db = null;

/**
 * 初始化插件
 */
async function init() {
  try {
    // 创建数据库目录
    const dbDir = path.dirname(DB_FILE);
    await fs.mkdir(dbDir, { recursive: true });
    
    // 连接数据库
    db = new Database(DB_FILE);
    
    // 创建表
    db.exec(`
      CREATE TABLE IF NOT EXISTS cleanup_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        scan_path TEXT,
        files_scanned INTEGER,
        files_found INTEGER,
        files_deleted INTEGER,
        space_freed INTEGER,
        errors_count INTEGER,
        duration_ms INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS deleted_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cleanup_id INTEGER,
        file_path TEXT,
        file_size INTEGER,
        file_type TEXT,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cleanup_id) REFERENCES cleanup_history(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_deleted_files_cleanup_id ON deleted_files(cleanup_id);
      CREATE INDEX IF NOT EXISTS idx_cleanup_history_timestamp ON cleanup_history(timestamp);
    `);
    
    console.log('数据库日志插件初始化成功');
  } catch (err) {
    console.error('数据库日志插件初始化失败:', err.message);
    throw err;
  }
}

/**
 * 清理插件
 */
async function cleanup() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 记录清理历史
 */
function recordCleanup(data) {
  try {
    const stmt = db.prepare(`
      INSERT INTO cleanup_history 
      (scan_path, files_scanned, files_found, files_deleted, space_freed, errors_count, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.scanPath,
      data.filesScanned,
      data.filesFound,
      data.deletedCount,
      data.freedSpace,
      data.errorsCount,
      data.durationMs
    );
    
    return result.lastInsertRowid;
  } catch (err) {
    console.error('记录清理历史失败:', err.message);
    throw err;
  }
}

/**
 * 记录删除的文件
 */
function recordDeletedFiles(cleanupId, files) {
  try {
    const stmt = db.prepare(`
      INSERT INTO deleted_files (cleanup_id, file_path, file_size, file_type)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((files) => {
      for (const file of files) {
        stmt.run(cleanupId, file.path, file.size, file.type);
      }
    });
    
    insertMany(files);
  } catch (err) {
    console.error('记录删除文件失败:', err.message);
    throw err;
  }
}

/**
 * 查询清理历史
 */
function getHistory(limit = 10, offset = 0) {
  try {
    const stmt = db.prepare(`
      SELECT * FROM cleanup_history
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);
    
    return stmt.all(limit, offset);
  } catch (err) {
    console.error('查询清理历史失败:', err.message);
    throw err;
  }
}

/**
 * 查询统计信息
 */
function getStatistics(days = 30) {
  try {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_cleanups,
        SUM(files_deleted) as total_files,
        SUM(space_freed) as total_space,
        AVG(files_deleted) as avg_files,
        AVG(space_freed) as avg_space
      FROM cleanup_history
      WHERE timestamp >= datetime('now', '-' || ? || ' days')
    `);
    
    return stmt.get(days);
  } catch (err) {
    console.error('查询统计信息失败:', err.message);
    throw err;
  }
}

/**
 * 删除后钩子
 */
async function afterDelete(data) {
  const cleanupId = recordCleanup({
    scanPath: data.scanPath,
    filesScanned: data.filesScanned,
    filesFound: data.filesFound,
    deletedCount: data.deletedCount,
    freedSpace: data.freedSpace,
    errorsCount: data.errors.length,
    durationMs: data.durationMs
  });
  
  if (data.files && data.files.length > 0) {
    recordDeletedFiles(cleanupId, data.files);
  }
}

/**
 * 执行查询
 */
function executeQuery(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('执行查询失败:', err.message);
    throw err;
  }
}

module.exports = {
  name: 'database-logger',
  version: '1.0.0',
  description: '数据库日志插件',
  author: 'Qingdaofu',
  
  hooks: {
    afterDelete
  },
  
  methods: {
    init,
    cleanup,
    recordCleanup,
    recordDeletedFiles,
    getHistory,
    getStatistics,
    executeQuery
  }
};