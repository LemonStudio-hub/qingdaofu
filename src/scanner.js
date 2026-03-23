const fs = require('fs').promises;
const path = require('path');
const { getConfig } = require('./config');
const { log } = require('./logger');
const { normalizePath } = require('./file-utils');

// 扫描计数器
let scannedCount = 0;
let foundCount = 0;
let progressBar = null;

// 设置进度条
function setProgressBar(pb) {
  progressBar = pb;
}

// 重置计数器
function resetCounters() {
  scannedCount = 0;
  foundCount = 0;
}

// 获取计数器
function getCounters() {
  return { scannedCount, foundCount };
}

// 检查是否为受保护目录
function isProtectedDirectory(dirPath) {
  const config = getConfig();
  const normalizedPath = normalizePath(dirPath);
  return config.protectedDirectories.some(protected => 
    normalizedPath.startsWith(normalizePath(protected))
  );
}

// 检查是否为垃圾文件
function isGarbageFile(filename) {
  const config = getConfig();
  
  // 检查白名单
  if (config.whitelist.includes(filename)) {
    return false;
  }
  
  return config.garbagePatterns.some(({ pattern }) => pattern.test(filename));
}

// 获取垃圾文件类型
function getGarbageType(filename) {
  const config = getConfig();
  for (const { pattern, description } of config.garbagePatterns) {
    if (pattern.test(filename)) {
      return description;
    }
  }
  return '未知类型';
}

// 检查文件是否符合过滤条件
function matchesFilters(stats) {
  const config = getConfig();
  
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
    const scanDir = async (dir, depth) => {
      if (depth > maxDepth) return;
      
      // 跳过受保护目录
      if (isProtectedDirectory(dir)) {
        await log(`跳过受保护目录: ${dir}`, 'WARN');
        return;
      }

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          scannedCount++;
          
          // 更新进度条
          if (progressBar && scannedCount % 50 === 0) {
            progressBar.update(scannedCount);
          }

          if (entry.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (entry.isFile() && !entry.isSymbolicLink()) {
            try {
              const stats = await fs.stat(fullPath);
              
              // 检查是否为垃圾文件
              if (isGarbageFile(entry.name)) {
                // 检查过滤条件
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
            } catch (err) {
              // 忽略单个文件错误
            }
          }
        }
      } catch (err) {
        await log(`无法访问目录: ${dir} - ${err.message}`, 'WARN');
      }
    };

    await scanDir(basePath, 0);
  } catch (err) {
    await log(`扫描目录错误: ${basePath} - ${err.message}`, 'ERROR');
  }

  return files;
}

// 扫描缓存目录
async function scanCacheDirectories() {
  const files = [];
  const config = getConfig();

  for (const cacheDir of config.cacheDirectories) {
    try {
      if (await fs.access(cacheDir).then(() => true).catch(() => false)) {
        const cacheFiles = await scanGarbageFiles(cacheDir);
        files.push(...cacheFiles);
      }
    } catch (err) {
      await log(`扫描缓存目录失败: ${cacheDir} - ${err.message}`, 'WARN');
    }
  }

  return files;
}

module.exports = {
  setProgressBar,
  resetCounters,
  getCounters,
  isProtectedDirectory,
  isGarbageFile,
  getGarbageType,
  matchesFilters,
  scanGarbageFiles,
  scanCacheDirectories
};