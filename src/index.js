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

// 状态管理
let config = { ...DEFAULT_CONFIG };
let scannedCount = 0;
let foundCount = 0;
let progressBar = null;

// 加载配置文件
async function loadConfig() {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const userConfig = JSON.parse(configData);
    config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // 合并垃圾文件模式
    if (userConfig.garbagePatterns) {
      config.garbagePatterns = userConfig.garbagePatterns;
    }
    
    // 合并缓存目录
    if (userConfig.cacheDirectories) {
      config.cacheDirectories = [...DEFAULT_CONFIG.cacheDirectories, ...userConfig.cacheDirectories];
    }
  } catch (err) {
    // 配置文件不存在或读取失败，使用默认配置
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
          
          // 更新进度条
          if (progressBar && scannedCount % 10 === 0) {
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

  return { deletedCount, freedSpace, errors, backedUpFiles };
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

// 简单的进度条类
class SimpleProgressBar {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
  }

  update(current) {
    this.current = current;
    const percentage = Math.min((current / this.total) * 100, 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r扫描进度: ${percentage}% (${current} 文件) [${elapsed}s]`);
  }

  stop() {
    process.stdout.write('\n');
  }
}

// 主函数
async function main() {
  const startTime = Date.now();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  config.scanPath = args[0] || os.homedir();
  config.dryRun = args.includes('--dry-run') || args.includes('-d');
  config.verbose = args.includes('--verbose') || args.includes('-v');
  config.backupEnabled = !args.includes('--no-backup');
  
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

  // 加载配置文件
  await loadConfig();

  console.log('清道夫 - Termux空间清理工具 v2.0.0');
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

  // 创建进度条
  progressBar = new SimpleProgressBar(1000);

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
