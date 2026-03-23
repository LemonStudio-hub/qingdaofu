const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { log } = require('./logger');

// 缓存目录
const CACHE_DIR = path.join(require('os').homedir(), '.qingdaofu-cache');

// 缓存存储
const cacheStore = new Map();

// 缓存配置
const cacheConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxAge: 24 * 60 * 60 * 1000, // 24小时
  maxItems: 1000
};

/**
 * 计算缓存键的哈希值
 */
function hashKey(key) {
  return crypto.createHash('md5').update(key).digest('hex');
}

/**
 * 获取缓存文件路径
 */
function getCacheFilePath(key) {
  return path.join(CACHE_DIR, hashKey(key) + '.cache');
}

/**
 * 检查缓存是否过期
 */
function isExpired(cacheEntry) {
  if (!cacheEntry) return true;
  return Date.now() - cacheEntry.timestamp > cacheConfig.maxAge;
}

/**
 * 设置缓存
 */
async function set(key, value, options = {}) {
  const ttl = options.ttl || cacheConfig.maxAge;
  const cacheEntry = {
    key: key,
    value: value,
    timestamp: Date.now(),
    ttl: ttl
  };
  
  // 存储到内存
  cacheStore.set(key, cacheEntry);
  
  // 检查缓存大小
  await checkCacheSize();
  
  // 存储到磁盘（异步）
  saveCacheToDisk(key, cacheEntry).catch(err => {
    log(`保存缓存到磁盘失败: ${key} - ${err.message}`, 'WARN');
  });
  
  return true;
}

/**
 * 获取缓存
 */
async function get(key) {
  // 先从内存获取
  let cacheEntry = cacheStore.get(key);
  
  if (cacheEntry && !isExpired(cacheEntry)) {
    return cacheEntry.value;
  }
  
  // 内存中没有或已过期，尝试从磁盘读取
  try {
    cacheEntry = await loadCacheFromDisk(key);
    
    if (cacheEntry && !isExpired(cacheEntry)) {
      // 加载到内存
      cacheStore.set(key, cacheEntry);
      return cacheEntry.value;
    }
  } catch (err) {
    // 磁盘读取失败，返回null
  }
  
  return null;
}

/**
 * 删除缓存
 */
async function remove(key) {
  // 从内存删除
  cacheStore.delete(key);
  
  // 从磁盘删除
  try {
    const filePath = getCacheFilePath(key);
    await fs.unlink(filePath);
  } catch (err) {
    // 文件不存在，忽略
  }
  
  return true;
}

/**
 * 检查缓存是否存在
 */
async function has(key) {
  // 先检查内存
  if (cacheStore.has(key)) {
    const cacheEntry = cacheStore.get(key);
    return !isExpired(cacheEntry);
  }
  
  // 检查磁盘
  try {
    const cacheEntry = await loadCacheFromDisk(key);
    return cacheEntry && !isExpired(cacheEntry);
  } catch (err) {
    return false;
  }
}

/**
 * 清空所有缓存
 */
async function clear() {
  // 清空内存缓存
  cacheStore.clear();
  
  // 清空磁盘缓存
  try {
    const entries = await fs.readdir(CACHE_DIR);
    for (const entry of entries) {
      if (entry.endsWith('.cache')) {
        const filePath = path.join(CACHE_DIR, entry);
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    log(`清空磁盘缓存失败: ${err.message}`, 'WARN');
  }
  
  log('清空所有缓存', 'INFO');
  return true;
}

/**
 * 清理过期缓存
 */
async function cleanExpired() {
  let cleanedCount = 0;
  
  // 清理内存中的过期缓存
  for (const [key, cacheEntry] of cacheStore.entries()) {
    if (isExpired(cacheEntry)) {
      cacheStore.delete(key);
      cleanedCount++;
    }
  }
  
  // 清理磁盘中的过期缓存
  try {
    const entries = await fs.readdir(CACHE_DIR);
    for (const entry of entries) {
      if (entry.endsWith('.cache')) {
        const filePath = path.join(CACHE_DIR, entry);
        const stats = await fs.stat(filePath);
        const age = Date.now() - stats.mtimeMs;
        
        if (age > cacheConfig.maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
    }
  } catch (err) {
    log(`清理磁盘缓存失败: ${err.message}`, 'WARN');
  }
  
  log(`清理过期缓存: ${cleanedCount} 项`, 'INFO');
  return cleanedCount;
}

/**
 * 检查缓存大小
 */
async function checkCacheSize() {
  let totalSize = 0;
  let totalItems = 0;
  
  // 计算内存缓存大小
  for (const cacheEntry of cacheStore.values()) {
    try {
      const size = JSON.stringify(cacheEntry).length;
      totalSize += size;
      totalItems++;
    } catch (err) {
      // 忽略无法序列化的缓存
    }
  }
  
  // 如果超过限制，删除最旧的缓存
  if (totalItems > cacheConfig.maxItems || totalSize > cacheConfig.maxSize) {
    const sortedEntries = Array.from(cacheStore.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const itemsToRemove = sortedEntries.slice(0, Math.floor(sortedEntries.length * 0.2));
    
    for (const [key] of itemsToRemove) {
      await remove(key);
    }
  }
  
  return { totalSize, totalItems };
}

/**
 * 保存缓存到磁盘
 */
async function saveCacheToDisk(key, cacheEntry) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const filePath = getCacheFilePath(key);
    const data = JSON.stringify(cacheEntry);
    await fs.writeFile(filePath, data);
  } catch (err) {
    throw err;
  }
}

/**
 * 从磁盘加载缓存
 */
async function loadCacheFromDisk(key) {
  const filePath = getCacheFilePath(key);
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

/**
 * 获取缓存统计信息
 */
async function getStats() {
  const memoryItems = cacheStore.size;
  let diskItems = 0;
  let diskSize = 0;
  
  try {
    const entries = await fs.readdir(CACHE_DIR);
    for (const entry of entries) {
      if (entry.endsWith('.cache')) {
        const filePath = path.join(CACHE_DIR, entry);
        const stats = await fs.stat(filePath);
        diskItems++;
        diskSize += stats.size;
      }
    }
  } catch (err) {
    // 忽略错误
  }
  
  return {
    memoryItems,
    diskItems,
    diskSize,
    config: cacheConfig
  };
}

/**
 * 缓存扫描结果
 */
async function cacheScanResults(scanPath, results) {
  const key = `scan:${scanPath}`;
  return await set(key, {
    path: scanPath,
    results: results,
    timestamp: Date.now()
  });
}

/**
 * 获取缓存的扫描结果
 */
async function getCachedScanResults(scanPath) {
  const key = `scan:${scanPath}`;
  const cached = await get(key);
  
  if (cached) {
    return cached.results;
  }
  
  return null;
}

/**
 * 缓存文件信息
 */
async function cacheFileInfo(filePath, fileInfo) {
  const key = `file:${filePath}`;
  return await set(key, fileInfo);
}

/**
 * 获取缓存的文件信息
 */
async function getCachedFileInfo(filePath) {
  const key = `file:${filePath}`;
  return await get(key);
}

module.exports = {
  set,
  get,
  remove,
  has,
  clear,
  cleanExpired,
  getStats,
  cacheScanResults,
  getCachedScanResults,
  cacheFileInfo,
  getCachedFileInfo,
  cacheConfig
};