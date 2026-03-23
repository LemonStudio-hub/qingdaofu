/**
 * 扫描Worker
 * 在独立线程中执行扫描任务
 */

const { parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');

// 导入扫描功能（需要相对路径）
const scannerPath = path.join(__dirname, 'scanner.js');
const { isGarbageFile, getGarbageType, matchesFilters } = require(scannerPath);

/**
 * 处理消息
 */
async function handleMessage(message) {
  try {
    switch (message.type) {
      case 'scan':
        const result = await scanDirectory(message.directory);
        parentPort.postMessage({
          type: 'result',
          data: result
        });
        break;
        
      default:
        parentPort.postMessage({
          type: 'error',
          error: `Unknown message type: ${message.type}`
        });
    }
  } catch (err) {
    parentPort.postMessage({
      type: 'error',
      error: err.message
    });
  }
}

/**
 * 扫描目录
 */
async function scanDirectory(dirPath) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && !entry.isSymbolicLink()) {
        try {
          const fullPath = path.join(dirPath, entry.name);
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
            }
          }
        } catch (err) {
          // 忽略单个文件错误
        }
      }
    }
  } catch (err) {
    // 忽略目录错误
  }
  
  return files;
}

// 监听消息
parentPort.on('message', handleMessage);