#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { createInterface } = require('readline');

// 默认配置
const DEFAULT_CONFIG = {
  garbagePatterns: [
    { pattern: /\.log$/, description: '日志文件' },
    { pattern: /\.tmp$/, description: '临时文件' },
    { pattern: /\.temp$/, description: '临时文件' },
    { pattern: /~$/, description: '编辑器备份文件' },
    { pattern: /\.swp$/, description: 'Vim交换文件' },
    { pattern: /\.DS_Store$/, description: 'macOS系统文件' },
    { pattern: /Thumbs\.db$/, description: 'Windows缩略图缓存' },
  ],
  cacheDirectories: [
    path.join(os.homedir(), '.cache'),
    path.join(os.homedir(), '.npm/_cacache'),
    path.join(os.homedir(), '.npm/_logs'),
    path.join(os.homedir(), '.npm/_npx'),
    path.join(os.homedir(), '.config/yarn/cache'),
    path.join(os.tmpdir()),
  ],
  protectedDirectories: ['/system', '/data', '/proc', '/sys', '/dev'],
  backupEnabled: true,
  backupRetentionDays: 7,
  minFileSize: 0,
  maxFileSize: Infinity,
  olderThanDays: 0,
  whitelist: [],
};

// 配置文件路径
const CONFIG_FILE = path.join(os.homedir(), '.qingdaofu.json');
const BACKUP_DIR = path.join(os.homedir(), '.qingdaofu-backup');
const LOG_FILE = path.join(os.homedir(), '.qingdaofu.log');
const HISTORY_FILE = path.join(os.homedir(), '.qingdaofu-history.json');

// 错误代码
const ERROR_CODES = {
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  CONFIG_PARSE_ERROR: 'CONFIG_PARSE_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_IN_USE: 'FILE_IN_USE',
  DISK_FULL: 'DISK_FULL',
  BACKUP_FAILED: 'BACKUP_FAILED',
  RESTORE_FAILED: 'RESTORE_FAILED',
  SCAN_ERROR: 'SCAN_ERROR',
  DELETE_ERROR: 'DELETE_ERROR'
};

// 错误解决方案
const ERROR_SOLUTIONS = {
  [ERROR_CODES.PERMISSION_DENIED]: '请检查文件权限，确保有足够的访问权限',
  [ERROR_CODES.FILE_IN_USE]: '文件正在被其他程序使用，请关闭相关程序后重试',
  [ERROR_CODES.DISK_FULL]: '磁盘空间不足，请清理磁盘空间',
  [ERROR_CODES.BACKUP_FAILED]: '备份失败，请检查备份目录权限和磁盘空间',
  [ERROR_CODES.RESTORE_FAILED]: '恢复失败，请检查备份文件是否完整',
  [ERROR_CODES.SCAN_ERROR]: '扫描错误，请检查路径是否正确',
  [ERROR_CODES.DELETE_ERROR]: '删除失败，请检查文件权限和磁盘空间'
};

// 状态管理
let config = { ...DEFAULT_CONFIG };
let scannedCount = 0;
let foundCount = 0;
let progressBar = null;

// 验证配置文件
function validateConfig(userConfig) {
  const errors = [];
  
  // 验证垃圾文件模式
  if (userConfig.garbagePatterns) {
    if (!Array.isArray(userConfig.garbagePatterns)) {
      errors.push('garbagePatterns 必须是数组');
    } else {
      userConfig.garbagePatterns.forEach((item, index) => {
        if (!item.pattern || !item.description) {
          errors.push(`garbagePatterns[${index}] 缺少 pattern 或 description 字段`);
        }
      });
    }
  }
  
  // 验证缓存目录
  if (userConfig.cacheDirectories) {
    if (!Array.isArray(userConfig.cacheDirectories)) {
      errors.push('cacheDirectories 必须是数组');
    }
  }
  
  // 验证受保护目录
  if (userConfig.protectedDirectories) {
    if (!Array.isArray(userConfig.protectedDirectories)) {
      errors.push('protectedDirectories 必须是数组');
    }
  }
  
  // 验证数值参数
  if (userConfig.backupRetentionDays !== undefined) {
    if (typeof userConfig.backupRetentionDays !== 'number' || userConfig.backupRetentionDays < 0) {
      errors.push('backupRetentionDays 必须是非负整数');
    }
  }
  
  if (userConfig.minFileSize !== undefined) {
    if (typeof userConfig.minFileSize !== 'number' || userConfig.minFileSize < 0) {
      errors.push('minFileSize 必须是非负整数');
    }
  }
  
  if (userConfig.maxFileSize !== undefined) {
    if (typeof userConfig.maxFileSize !== 'number' || userConfig.maxFileSize < 0) {
      errors.push('maxFileSize 必须是非负整数');
    }
  }
  
  if (userConfig.olderThanDays !== undefined) {
    if (typeof userConfig.olderThanDays !== 'number' || userConfig.olderThanDays < 0) {
      errors.push('olderThanDays 必须是非负整数');
    }
  }
  
  // 验证白名单
  if (userConfig.whitelist) {
    if (!Array.isArray(userConfig.whitelist)) {
      errors.push('whitelist 必须是数组');
    }
  }
  
  return errors;
}

// 加载配置文件
async function loadConfig(validate = false) {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const userConfig = JSON.parse(configData);
    
    // 验证配置
    if (validate) {
      const errors = validateConfig(userConfig);
      if (errors.length > 0) {
        console.error('配置文件验证失败:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\n请检查配置文件格式是否正确');
        console.error(`配置文件路径: ${CONFIG_FILE}`);
        console.error('\n示例配置格式:');
        console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
        process.exit(1);
      }
    }
    
    config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // 合并垃圾文件模式
    if (userConfig.garbagePatterns) {
      config.garbagePatterns = userConfig.garbagePatterns;
    }
    
    // 合并缓存目录
    if (userConfig.cacheDirectories) {
      config.cacheDirectories = [...DEFAULT_CONFIG.cacheDirectories, ...userConfig.cacheDirectories];
    }
    
    await log(`配置文件加载成功: ${CONFIG_FILE}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 配置文件不存在，使用默认配置
      await log('配置文件不存在，使用默认配置');
    } else if (err instanceof SyntaxError) {
      // JSON 解析错误
      console.error(`配置文件格式错误: ${err.message}`);
      console.error(`配置文件路径: ${CONFIG_FILE}`);
      console.error('\n请检查 JSON 格式是否正确');
      console.error('\n示例配置格式:');
      console.log(JSON.stringify(DEFAULT_CONFIG, null, 2));
      process.exit(1);
    } else {
      // 其他错误
      await log(`配置文件加载失败: ${err.message}`, 'WARN');
    }
  }
}

// 记录日志
async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  if (config.verbose) {
    console.log(logMessage.trim());
  }
  
  try {
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (err) {
    // 忽略日志写入错误
  }
}

// 检查文件是否存在
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 规范化路径
function normalizePath(dirPath) {
  const normalized = path.normalize(dirPath);
  const resolved = path.resolve(normalized);
  return resolved;
}

// 检查是否为受保护目录
function isProtectedDirectory(dirPath) {
  const normalizedPath = normalizePath(dirPath);
  return config.protectedDirectories.some(protected => 
    normalizedPath.startsWith(normalizePath(protected))
  );
}

// 检查是否为垃圾文件
function isGarbageFile(filename) {
  // 检查白名单
  if (config.whitelist.includes(filename)) {
    return false;
  }
  return config.garbagePatterns.some(({ pattern }) => pattern.test(filename));
}

// 获取垃圾文件类型
function getGarbageType(filename) {
  for (const { pattern, description } of config.garbagePatterns) {
    if (pattern.test(filename)) {
      return description;
    }
  }
  return '未知类型';
}

// 检查文件是否符合过滤条件
function matchesFilters(stats) {
  // 大小过滤
  if (stats.size < config.minFileSize || stats.size > config.maxFileSize) {
    return false;
  }
  
  // 时间过滤
  if (config.olderThanDays > 0) {
    const fileAge = Date.now() - stats.mtimeMs;
    const minAge = config.olderThanDays * 24 * 60 * 60 * 1000;
    if (fileAge < minAge) {
      return false;
    }
  }
  
  return true;
}

// 扫描垃圾文件
async function scanGarbageFiles(basePath, options = {}) {
  const files = [];
  const maxDepth = options.maxDepth || 5;
  
  try {
    const exists = await fileExists(basePath);
    if (!exists) {
      return files;
    }

    const scanDir = async (dir, depth) => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // 跳过符号链接
          if (entry.isSymbolicLink()) continue;
          
          scannedCount++;
          
          if (entry.isDirectory()) {
            // 跳过系统关键目录
            if (isProtectedDirectory(fullPath)) continue;
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            if (isGarbageFile(entry.name)) {
              const stats = await fs.stat(fullPath);
              
              // 应用过滤器
              if (matchesFilters(stats)) {
                files.push({
                  path: fullPath,
                  name: entry.name,
                  size: stats.size,
                  type: getGarbageType(entry.name),
                  modified: stats.mtime
                });
                foundCount++;
              }
            }
          }
          
          // 更新进度条（进度条类会自动控制更新频率）
          if (progressBar) {
            progressBar.update(scannedCount);
          }
        }
      } catch (err) {
        await log(`无法访问目录: ${dir} - ${err.message}`, 'WARN');
      }
    };

    await scanDir(basePath, 0);
  } catch (err) {
    await log(`扫描目录错误: ${basePath} - ${err.message}`, 'ERROR');
    console.error(`扫描目录错误: ${err.message}`);
  }

  return files;
}

// 扫描缓存目录
async function scanCacheDirectories() {
  const files = [];
  
  for (const cacheDir of config.cacheDirectories) {
    const exists = await fileExists(cacheDir);
    if (exists) {
      const cacheFiles = await scanGarbageFiles(cacheDir, { maxDepth: 3 });
      files.push(...cacheFiles);
    }
  }

  return files;
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 创建备份
async function createBackup(files) {
  if (!config.backupEnabled || config.dryRun) {
    return [];
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, timestamp);
  const backedUpFiles = [];

  try {
    await fs.mkdir(backupPath, { recursive: true });
    
    for (const file of files) {
      try {
        const relativePath = path.relative(path.dirname(file.path), file.path);
        const backupFilePath = path.join(backupPath, relativePath);
        await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
        await fs.copyFile(file.path, backupFilePath);
        backedUpFiles.push({ original: file.path, backup: backupFilePath });
      } catch (err) {
        await log(`备份失败: ${file.path} - ${err.message}`, 'WARN');
      }
    }
    
    await log(`创建备份: ${backupPath} - ${backedUpFiles.length} 个文件`);
  } catch (err) {
    await log(`备份目录创建失败: ${err.message}`, 'ERROR');
  }

  return backedUpFiles;
}

// 清理过期备份
async function cleanupOldBackups(retentionDays = config.backupRetentionDays) {
  if (!await fileExists(BACKUP_DIR)) {
    return { cleaned: 0, freedSpace: 0 };
  }

  const now = Date.now();
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  let cleanedCount = 0;
  let freedSpace = 0;

  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const backupPath = path.join(BACKUP_DIR, entry.name);
      const stats = await fs.stat(backupPath);
      const backupAge = now - stats.birthtimeMs;

      // 如果备份超过保留期限，则删除
      if (backupAge > retentionMs) {
        const backupSize = await getDirectorySize(backupPath);
        await fs.rm(backupPath, { recursive: true, force: true });
        cleanedCount++;
        freedSpace += backupSize;
        await log(`删除过期备份: ${entry.name} (${formatFileSize(backupSize)})`);
      }
    }

    if (cleanedCount > 0) {
      await log(`清理完成: ${cleanedCount} 个备份, 释放 ${formatFileSize(freedSpace)}`);
    } else {
      await log('没有需要清理的过期备份');
    }
  } catch (err) {
    await log(`清理备份失败: ${err.message}`, 'ERROR');
  }

  return { cleaned: cleanedCount, freedSpace: freedSpace };
}

// 计算目录大小
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  } catch (err) {
    // 忽略无法访问的文件
  }

  return totalSize;
}

// 获取备份信息
async function getBackupInfo() {
  if (!await fileExists(BACKUP_DIR)) {
    return { count: 0, totalSize: 0, backups: [] };
  }

  const backups = [];
  let totalSize = 0;

  try {
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const backupPath = path.join(BACKUP_DIR, entry.name);
      const stats = await fs.stat(backupPath);
      const size = await getDirectorySize(backupPath);
      const filesCount = await countFilesInDirectory(backupPath);

      backups.push({
        name: entry.name,
        path: backupPath,
        size: size,
        files: filesCount,
        createdAt: stats.birthtime,
        age: Date.now() - stats.birthtimeMs
      });

      totalSize += size;
    }
  } catch (err) {
    await log(`获取备份信息失败: ${err.message}`, 'ERROR');
  }

  // 按创建时间倒序排列
  backups.sort((a, b) => b.createdAt - a.createdAt);

  return { count: backups.length, totalSize: totalSize, backups: backups };
}

// 从备份恢复文件
async function restoreFromBackup(backupName, targetDir = null) {
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!await fileExists(backupPath)) {
    throw new Error(`备份不存在: ${backupName}`);
  }

  let restoredCount = 0;
  const errors = [];

  try {
    const entries = await fs.readdir(backupPath, { withFileTypes: true });

    for (const entry of entries) {
      const restorePath = targetDir ? path.join(targetDir, entry.name) : entry.name;
      
      try {
        if (entry.isDirectory()) {
          // 递归恢复目录
          const subResult = await restoreFromBackup(path.join(backupName, entry.name), restorePath);
          restoredCount += subResult.restored;
        } else {
          // 恢复文件
          const sourcePath = path.join(backupPath, entry.name);
          await fs.copyFile(sourcePath, restorePath);
          restoredCount++;
          await log(`恢复文件: ${restorePath}`);
        }
      } catch (err) {
        errors.push(`${entry.name}: ${err.message}`);
        await log(`恢复失败: ${entry.name} - ${err.message}`, 'ERROR');
      }
    }
  } catch (err) {
    await log(`恢复备份失败: ${err.message}`, 'ERROR');
    throw err;
  }

  return { restored: restoredCount, errors: errors };
}

// 计算目录中的文件数
async function countFilesInDirectory(dirPath) {
  let count = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        count += await countFilesInDirectory(fullPath);
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch (err) {
    // 忽略无法访问的文件
  }

  return count;
}

// 删除文件
async function deleteFiles(files) {
  let deletedCount = 0;
  let freedSpace = 0;
  const errors = [];

  // 创建备份
  const backedUpFiles = await createBackup(files);

  for (const file of files) {
    try {
      if (!config.dryRun) {
        await fs.unlink(file.path);
      }
      deletedCount++;
      freedSpace += file.size;
      await log(`删除文件: ${file.path} (${formatFileSize(file.size)})`, 'INFO');
    } catch (err) {
      const errorMsg = `${file.path}: ${err.message}`;
      errors.push(errorMsg);
      await log(`删除失败: ${errorMsg}`, 'ERROR');
    }
  }

  // 自动清理过期备份
  let cleanupResult = { cleaned: 0, freedSpace: 0 };
  if (config.backupEnabled && !config.dryRun && backedUpFiles.length > 0) {
    cleanupResult = await cleanupOldBackups();
  }

  return { deletedCount, freedSpace, errors, backedUpFiles, cleanupResult };
}

// 显示垃圾文件列表
function displayGarbageFiles(files) {
  if (files.length === 0) {
    console.log('\n✓ 没有发现垃圾文件');
    return 0;
  }

  let totalSize = 0;
  console.log('\n发现以下垃圾文件:\n');
  console.log('类型'.padEnd(20) + '大小'.padEnd(12) + '路径');
  console.log('-'.repeat(80));

  // 按类型分组显示
  const groupedFiles = {};
  files.forEach(file => {
    if (!groupedFiles[file.type]) {
      groupedFiles[file.type] = [];
    }
    groupedFiles[file.type].push(file);
    totalSize += file.size;
  });

  for (const [type, typeFiles] of Object.entries(groupedFiles)) {
    const typeSize = typeFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n[${type}] ${typeFiles.length} 个文件, 总计: ${formatFileSize(typeSize)}`);
    
    // 只显示前10个文件
    typeFiles.slice(0, 10).forEach(file => {
      console.log(`  ${formatFileSize(file.size).padEnd(10)} ${file.path}`);
    });
    
    if (typeFiles.length > 10) {
      console.log(`  ... 还有 ${typeFiles.length - 10} 个文件`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`总计: ${files.length} 个文件, ${formatFileSize(totalSize)}`);
  
  return totalSize;
}

// 增强的进度条类
class EnhancedProgressBar {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.updateInterval = 500; // 每500ms更新一次
  }

  update(current) {
    this.current = current;
    const now = Date.now();
    
    // 减少更新频率
    if (now - this.lastUpdate < this.updateInterval && current < this.total) {
      return;
    }
    
    this.lastUpdate = now;
    
    const percentage = Math.min((current / this.total) * 100, 100).toFixed(1);
    const elapsed = ((now - this.startTime) / 1000).toFixed(1);
    
    // 计算预估剩余时间
    let remaining = '';
    if (current > 0) {
      const rate = current / (now - this.startTime); // 文件/毫秒
      const remainingFiles = this.total - current;
      const remainingMs = remainingFiles / rate;
      const remainingSeconds = Math.floor(remainingMs / 1000);
      remaining = `[剩余: ${this.formatTime(remainingSeconds)}]`;
    }
    
    process.stdout.write(`\r扫描进度: ${percentage}% (${current}/${this.total} 文件) [用时: ${elapsed}s] ${remaining}`);
  }

  formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  stop() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    process.stdout.write(`\r扫描完成: ${this.current} 个文件, 用时 ${elapsed} 秒\n`);
  }
}

// 记录历史操作
async function recordHistory(action, details) {
  const history = await loadHistory();
  
  const record = {
    timestamp: new Date().toISOString(),
    action: action,
    details: details
  };
  
  history.push(record);
  
  // 只保留最近100条记录
  if (history.length > 100) {
    history.shift();
  }
  
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    await log(`记录历史失败: ${err.message}`, 'ERROR');
  }
}

// 加载历史记录
async function loadHistory() {
  try {
    const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(historyData);
  } catch (err) {
    return [];
  }
}

// 显示历史记录
async function showHistory(limit = 10) {
  const history = await loadHistory();
  
  if (history.length === 0) {
    console.log('没有历史记录');
    return;
  }
  
  console.log('清道夫 - 历史记录');
  console.log('='.repeat(50));
  console.log(`共 ${history.length} 条记录，显示最近 ${Math.min(limit, history.length)} 条:\n`);
  
  const recentHistory = history.slice(-limit).reverse();
  
  recentHistory.forEach((record, index) => {
    const date = new Date(record.timestamp);
    console.log(`${index + 1}. ${record.action}`);
    console.log(`   时间: ${date.toLocaleString()}`);
    
    if (record.details.deletedCount !== undefined) {
      console.log(`   删除: ${record.details.deletedCount} 个文件, 释放 ${formatFileSize(record.details.freedSpace)}`);
    }
    
    if (record.details.cleanupResult && record.details.cleanupResult.cleaned > 0) {
      console.log(`   清理备份: ${record.details.cleanupResult.cleaned} 个`);
    }
    
    console.log('');
  });
  
  // 统计信息
  const totalDeleted = history.reduce((sum, h) => sum + (h.details.deletedCount || 0), 0);
  const totalFreed = history.reduce((sum, h) => sum + (h.details.freedSpace || 0), 0);
  
  console.log('统计信息:');
  console.log(`  总删除: ${totalDeleted} 个文件`);
  console.log(`  总释放: ${formatFileSize(totalFreed)}`);
  console.log(`  操作次数: ${history.length}`);
}

// 显示帮助信息
function showHelp() {
  console.log('清道夫 - Termux空间清理工具 v2.1.0');
  console.log('='.repeat(50));
  console.log('\n用法: qingdaofu [路径] [选项]\n');
  console.log('参数:');
  console.log('  路径              要扫描的目录路径（默认: 用户主目录）');
  console.log('\n选项:');
  console.log('  -d, --dry-run     预览模式，不实际删除文件');
  console.log('  -v, --verbose     显示详细输出');
  console.log('  --no-backup       禁用文件备份');
  console.log('  --min-size SIZE   最小文件大小（如: 1KB, 1MB, 1GB）');
  console.log('  --max-size SIZE   最大文件大小（如: 1KB, 1MB, 1GB）');
  console.log('  --older-than DAYS 只清理N天前的文件');
  console.log('  --validate-config 验证配置文件格式');
  console.log('  --cleanup-backups 清理过期备份');
  console.log('  --restore [NAME] 恢复文件（不带参数显示备份列表）');
  console.log('  -h, --help        显示此帮助信息');
  console.log('\n示例:');
  console.log('  qingdaofu                           # 清理用户主目录');
  console.log('  qingdaofu /tmp                     # 清理/tmp目录');
  console.log('  qingdaofu --dry-run                # 预览模式，不删除');
  console.log('  qingdaofu --min-size 1MB           # 只清理大于1MB的文件');
  console.log('  qingdaofu --older-than 7           # 只清理7天前的文件');
  console.log('  qingdaofu --cleanup-backups        # 清理过期备份');
  console.log('  qingdaofu --restore                # 查看可用备份');
  console.log('  qingdaofu --restore 2026-03-23...  # 恢复指定备份');
  console.log('\n配置文件:');
  console.log('  位置: ~/.qingdaofu.json');
  console.log('  使用: qingdaofu --validate-config 验证配置');
  console.log('\n更多信息: https://github.com/LemonStudio-hub/qingdaofu');
}

// 主函数
async function main() {
  const startTime = Date.now();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  // 检查是否请求帮助
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // 检查是否请求历史记录
  if (args.includes('--history')) {
    const historyLimitIndex = args.indexOf('--history');
    const limit = historyLimitIndex !== -1 && args[historyLimitIndex + 1] ? 
      parseInt(args[historyLimitIndex + 1]) : 10;
    await showHistory(isNaN(limit) ? 10 : limit);
    process.exit(0);
  }
  
  // 设置交互模式
  const interactiveMode = args.includes('--interactive');
  
  config.scanPath = args[0] || os.homedir();
  config.dryRun = args.includes('--dry-run') || args.includes('-d');
  config.verbose = args.includes('--verbose') || args.includes('-v');
  config.backupEnabled = !args.includes('--no-backup');
  const validateConfigFlag = args.includes('--validate-config');
  
  // 解析过滤器参数
  const minSizeIndex = args.indexOf('--min-size');
  if (minSizeIndex !== -1 && args[minSizeIndex + 1]) {
    const size = args[minSizeIndex + 1];
    const match = size.match(/^(\d+)(B|KB|MB|GB)?$/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = (match[2] || 'B').toUpperCase();
      const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      config.minFileSize = value * units[unit];
    }
  }

  const maxSizeIndex = args.indexOf('--max-size');
  if (maxSizeIndex !== -1 && args[maxSizeIndex + 1]) {
    const size = args[maxSizeIndex + 1];
    const match = size.match(/^(\d+)(B|KB|MB|GB)?$/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = (match[2] || 'B').toUpperCase();
      const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      config.maxFileSize = value * units[unit];
    }
  }

  const olderThanIndex = args.indexOf('--older-than');
  if (olderThanIndex !== -1 && args[olderThanIndex + 1]) {
    const days = parseInt(args[olderThanIndex + 1]);
    if (!isNaN(days)) {
      config.olderThanDays = days;
    }
  }

  // 加载配置文件（如果指定了验证参数，则进行验证）
  await loadConfig(validateConfigFlag);
  
  // 如果只是验证配置，则退出
  if (validateConfigFlag) {
    console.log('✓ 配置文件验证通过');
    console.log(`配置文件路径: ${CONFIG_FILE}`);
    process.exit(0);
  }
  
  // 如果只是清理备份，则执行清理操作
  if (args.includes('--cleanup-backups')) {
    console.log('清道夫 - Termux空间清理工具 v2.1.0');
    console.log('='.repeat(50));
    console.log('\n正在清理过期备份...\n');
    
    // 显示当前备份信息
    const backupInfo = await getBackupInfo();
    console.log(`当前备份: ${backupInfo.count} 个`);
    console.log(`占用空间: ${formatFileSize(backupInfo.totalSize)}`);
    
    if (backupInfo.count > 0) {
      console.log('\n备份列表:');
      backupInfo.backups.forEach(backup => {
        const age = backup.age / (24 * 60 * 60 * 1000);
        console.log(`  ${backup.name}`);
        console.log(`    文件数: ${backup.files}, 大小: ${formatFileSize(backup.size)}, 创建于: ${Math.floor(age)} 天前`);
      });
    }
    
    console.log('\n开始清理...');
    const cleanupResult = await cleanupOldBackups();
    
    console.log(`\n清理完成:`);
    console.log(`  删除备份: ${cleanupResult.cleaned} 个`);
    console.log(`  释放空间: ${formatFileSize(cleanupResult.freedSpace)}`);
    
    // 显示清理后的备份信息
    const newBackupInfo = await getBackupInfo();
    console.log(`  剩余备份: ${newBackupInfo.count} 个`);
    console.log(`  剩余空间: ${formatFileSize(newBackupInfo.totalSize)}`);
    
    process.exit(0);
  }
  
  // 如果只是恢复备份，则执行恢复操作
  const restoreIndex = args.indexOf('--restore');
  if (restoreIndex !== -1) {
    const backupName = args[restoreIndex + 1];
    
    console.log('清道夫 - Termux空间清理工具 v2.0.0');
    console.log('='.repeat(50));
    
    if (!backupName) {
      // 没有指定备份名称，显示备份列表
      console.log('\n可用备份:\n');
      
      const backupInfo = await getBackupInfo();
      if (backupInfo.count === 0) {
        console.log('没有可用的备份');
        process.exit(0);
      }
      
      backupInfo.backups.forEach((backup, index) => {
        const age = backup.age / (24 * 60 * 60 * 1000);
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   文件数: ${backup.files}, 大小: ${formatFileSize(backup.size)}`);
        console.log(`   创建于: ${Math.floor(age)} 天前\n`);
      });
      
      console.log('使用方法: qingdaofu --restore <备份名称>');
      process.exit(0);
    }
    
    // 恢复指定的备份
    console.log(`\n正在恢复备份: ${backupName}\n`);
    
    const backupInfo = await getBackupInfo();
    const backup = backupInfo.backups.find(b => b.name === backupName);
    
    if (!backup) {
      console.error(`错误: 备份不存在: ${backupName}`);
      console.error('\n可用备份:');
      backupInfo.backups.forEach(b => {
        console.log(`  - ${b.name}`);
      });
      process.exit(1);
    }
    
    // 显示备份信息
    console.log(`备份信息:`);
    console.log(`  文件数: ${backup.files}`);
    console.log(`  大小: ${formatFileSize(backup.size)}`);
    console.log(`  创建于: ${backup.createdAt.toLocaleString()}`);
    
    // 确认恢复
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise(resolve => {
      rl.question('\n确认恢复此备份? (y/n): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('\n已取消恢复操作');
      process.exit(0);
    }
    
    console.log('\n正在恢复...');
    const restoreResult = await restoreFromBackup(backupName);
    
    console.log(`\n恢复完成:`);
    console.log(`  恢复文件: ${restoreResult.restored} 个`);
    
    if (restoreResult.errors.length > 0) {
      console.log(`\n⚠ 部分文件恢复失败 (${restoreResult.errors.length} 个):`);
      restoreResult.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      if (restoreResult.errors.length > 5) {
        console.log(`  ... 还有 ${restoreResult.errors.length - 5} 个错误`);
      }
    }
    
    process.exit(0);
  }

  console.log('清道夫 - Termux空间清理工具 v2.1.0');
  console.log('='.repeat(50));
  console.log(`扫描路径: ${config.scanPath}`);
  console.log(`备份: ${config.backupEnabled ? '启用' : '禁用'}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  
  if (config.minFileSize > 0) {
    console.log(`最小文件大小: ${formatFileSize(config.minFileSize)}`);
  }
  if (config.maxFileSize < Infinity) {
    console.log(`最大文件大小: ${formatFileSize(config.maxFileSize)}`);
  }
  if (config.olderThanDays > 0) {
    console.log(`文件时间: ${config.olderThanDays} 天前`);
  }

  console.log('\n正在扫描垃圾文件...\n');

  // 创建进度条（总数未知，使用大数值作为参考）
  progressBar = new EnhancedProgressBar(10000);

  // 扫描垃圾文件
  const garbageFiles = await scanGarbageFiles(config.scanPath);
  
  // 扫描缓存目录
  const cacheFiles = await scanCacheDirectories();
  
  // 停止进度条
  progressBar.stop();
  
  // 合并结果并去重
  const allFiles = [...garbageFiles, ...cacheFiles];
  const uniqueFiles = Array.from(
    new Map(allFiles.map(f => [f.path, f])).values()
  );

  console.log(`扫描完成: ${scannedCount} 个文件, 发现 ${foundCount} 个垃圾文件\n`);

  // 显示结果
  const totalSize = displayGarbageFiles(uniqueFiles);

  if (totalSize === 0) {
    console.log('\n系统很干净，无需清理！');
    await log('扫描完成: 未发现垃圾文件');
    process.exit(0);
  }

  // 预览模式不询问
  if (config.dryRun) {
    console.log('\n[预览模式] 文件未被删除');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`扫描耗时: ${elapsed} 秒`);
    await log(`预览完成: ${uniqueFiles.length} 个文件, ${formatFileSize(totalSize)}`);
    process.exit(0);
  }

  // 交互模式：按类型选择
  let filesToClean = uniqueFiles;
  if (interactiveMode) {
    // 按类型分组
    const groupedFiles = {};
    uniqueFiles.forEach(file => {
      if (!groupedFiles[file.type]) {
        groupedFiles[file.type] = [];
      }
      groupedFiles[file.type].push(file);
    });

    console.log('\n交互模式 - 选择要清理的文件类型:');
    console.log('-'.repeat(50));
    
    const types = Object.keys(groupedFiles);
    types.forEach((type, index) => {
      const typeSize = groupedFiles[type].reduce((sum, f) => sum + f.size, 0);
      console.log(`${index + 1}. ${type} (${groupedFiles[type].length} 个文件, ${formatFileSize(typeSize)})`);
    });
    console.log(`0. 全部 (${uniqueFiles.length} 个文件, ${formatFileSize(totalSize)})`);
    console.log('all. 全部 (同0)');
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\n请输入要清理的类型编号 (用逗号分隔): ', resolve);
    });
    rl.close();

    const selectedTypes = [];
    if (answer.toLowerCase() === 'all' || answer.trim() === '0') {
      selectedTypes.push(...types);
    } else {
      const indices = answer.split(',').map(s => parseInt(s.trim()));
      indices.forEach(index => {
        if (index > 0 && index <= types.length) {
          selectedTypes.push(types[index - 1]);
        }
      });
    }

    if (selectedTypes.length === 0) {
      console.log('\n未选择任何类型，已取消清理操作');
      await log('用户取消清理操作（未选择类型）');
      process.exit(0);
    }

    // 过滤文件
    filesToClean = uniqueFiles.filter(file => selectedTypes.includes(file.type));
    
    console.log(`\n已选择: ${filesToClean.length} 个文件, ${formatFileSize(
      filesToClean.reduce((sum, f) => sum + f.size, 0)
    )}`);
  }

  // 询问用户确认
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('\n是否确认清理这些文件? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n正在清理...');
    const result = await deleteFiles(uniqueFiles);

    console.log(`\n✓ 清理完成！`);
    console.log(`  删除文件: ${result.deletedCount} 个`);
    console.log(`  释放空间: ${formatFileSize(result.freedSpace)}`);
    
    if (config.backupEnabled) {
      console.log(`  备份文件: ${result.backedUpFiles.length} 个`);
    }
    
    if (result.cleanupResult && result.cleanupResult.cleaned > 0) {
      console.log(`  清理备份: ${result.cleanupResult.cleaned} 个, 释放 ${formatFileSize(result.cleanupResult.freedSpace)}`);
    }

    if (result.errors.length > 0) {
      console.log(`\n⚠ 部分文件删除失败 (${result.errors.length} 个):`);
      result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      if (result.errors.length > 5) {
        console.log(`  ... 还有 ${result.errors.length - 5} 个错误`);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n总耗时: ${elapsed} 秒`);
    
    await log(`清理完成: 删除 ${result.deletedCount} 个文件, 释放 ${formatFileSize(result.freedSpace)}`);
    
    // 记录历史
    await recordHistory('清理', {
      deletedCount: result.deletedCount,
      freedSpace: result.freedSpace,
      backupCount: result.backedUpFiles.length,
      cleanupResult: result.cleanupResult,
      scanPath: config.scanPath,
      filters: {
        minSize: config.minFileSize,
        maxSize: config.maxFileSize,
        olderThanDays: config.olderThanDays
      }
    });
  } else {
    console.log('\n已取消清理操作');
    await log('用户取消清理操作');
  }
}

// 运行主函数
main().catch(err => {
  console.error('程序错误:', err.message);
  process.exit(1);
});
