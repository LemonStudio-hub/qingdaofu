const { Worker } = require('worker_threads');
const path = require('path');
const os = require('os');
const { log } = require('./logger');

// 并发配置
const concurrencyConfig = {
  maxWorkers: Math.max(2, os.cpus().length - 1), // 保留一个CPU核心
  taskTimeout: 30000, // 30秒超时
  maxRetries: 3
};

// 活动的Worker池
const workerPool = [];
const taskQueue = [];

/**
 * 创建Worker
 */
function createWorker(workerPath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath);
    
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
    
    worker.on('online', () => resolve(worker));
  });
}

/**
 * 初始化Worker池
 */
async function initWorkerPool(size = concurrencyConfig.maxWorkers) {
  log(`初始化Worker池: ${size} 个worker`, 'INFO');
  
  const workerPath = path.join(__dirname, 'scan-worker.js');
  
  for (let i = 0; i < size; i++) {
    try {
      const worker = await createWorker(workerPath);
      workerPool.push({
        id: i,
        worker: worker,
        busy: false,
        task: null
      });
    } catch (err) {
      log(`创建Worker失败: ${err.message}`, 'ERROR');
    }
  }
  
  log(`Worker池初始化完成: ${workerPool.length} 个worker`, 'INFO');
}

/**
 * 关闭Worker池
 */
async function closeWorkerPool() {
  log('关闭Worker池', 'INFO');
  
  for (const poolItem of workerPool) {
    try {
      await poolItem.worker.terminate();
    } catch (err) {
      log(`关闭Worker失败: ${err.message}`, 'WARN');
    }
  }
  
  workerPool.length = 0;
}

/**
 * 获取空闲Worker
 */
function getAvailableWorker() {
  return workerPool.find(poolItem => !poolItem.busy);
}

/**
 * 分配任务给Worker
 */
function assignTask(worker, task) {
  worker.busy = true;
  worker.task = task;
  worker.worker.postMessage(task);
}

/**
 * 释放Worker
 */
function releaseWorker(worker) {
  worker.busy = false;
  worker.task = null;
}

/**
 * 并发扫描目录
 */
async function concurrentScan(basePath, options = {}) {
  const {
    maxDepth = 5,
    chunkSize = 100,
    concurrency = concurrencyConfig.maxWorkers
  } = options;
  
  log(`开始并发扫描: ${basePath}`, 'INFO');
  
  // 初始化Worker池
  if (workerPool.length === 0) {
    await initWorkerPool(concurrency);
  }
  
  const results = [];
  const directories = await collectDirectories(basePath, maxDepth);
  
  log(`发现 ${directories.length} 个目录`, 'INFO');
  
  // 分批处理目录
  const chunks = [];
  for (let i = 0; i < directories.length; i += chunkSize) {
    chunks.push(directories.slice(i, i + chunkSize));
  }
  
  log(`分为 ${chunks.length} 个批次处理`, 'INFO');
  
  // 并发处理每个批次
  const promises = chunks.map((chunk, index) => {
    return processChunk(chunk, index);
  });
  
  const chunkResults = await Promise.all(promises);
  
  // 合并结果
  for (const chunkResult of chunkResults) {
    results.push(...chunkResult);
  }
  
  log(`并发扫描完成: ${results.length} 个垃圾文件`, 'INFO');
  
  return results;
}

/**
 * 收集所有目录
 */
async function collectDirectories(basePath, maxDepth) {
  const fs = require('fs').promises;
  const directories = [];
  
  async function collect(dir, depth) {
    if (depth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          directories.push(fullPath);
          await collect(fullPath, depth + 1);
        }
      }
    } catch (err) {
      log(`收集目录失败: ${dir} - ${err.message}`, 'WARN');
    }
  }
  
  await collect(basePath, 0);
  return directories;
}

/**
 * 处理批次
 */
async function processChunk(directories, chunkIndex) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;
    const total = directories.length;
    
    const processDirectory = (dirPath) => {
      return new Promise((res, rej) => {
        const worker = getAvailableWorker();
        
        if (!worker) {
          // 没有空闲Worker，等待重试
          setTimeout(() => {
            processDirectory(dirPath).then(res).catch(rej);
          }, 100);
          return;
        }
        
        // 设置消息处理器
        const handleMessage = (message) => {
          if (message.type === 'result') {
            results.push(...message.data);
          } else if (message.type === 'error') {
            log(`Worker错误: ${message.error}`, 'WARN');
          }
        };
        
        const handleExit = () => {
          worker.worker.off('message', handleMessage);
          releaseWorker(worker);
          
          completed++;
          
          if (completed === total) {
            resolve(results);
          }
        };
        
        worker.worker.on('message', handleMessage);
        worker.worker.on('exit', handleExit);
        
        // 发送任务
        assignTask(worker, {
          type: 'scan',
          directory: dirPath,
          chunkIndex: chunkIndex
        });
      });
    };
    
    // 并发处理目录
    const promises = directories.map(dir => processDirectory(dir));
    
    Promise.all(promises)
      .then(() => resolve(results))
      .catch(reject);
  });
}

/**
 * 限制并发数
 */
async function withConcurrency(tasks, maxConcurrency) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const promise = task().then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= maxConcurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

/**
 * 扫描单个目录
 */
async function scanDirectory(dirPath) {
  return new Promise((resolve, reject) => {
    const worker = getAvailableWorker();
    
    if (!worker) {
      // 没有空闲Worker，使用同步扫描
      const { scanGarbageFiles } = require('./scanner');
      scanGarbageFiles(dirPath).then(resolve).catch(reject);
      return;
    }
    
    const handleMessage = (message) => {
      if (message.type === 'result') {
        worker.worker.off('message', handleMessage);
        worker.worker.off('exit', handleExit);
        releaseWorker(worker);
        resolve(message.data);
      } else if (message.type === 'error') {
        worker.worker.off('message', handleMessage);
        worker.worker.off('exit', handleExit);
        releaseWorker(worker);
        reject(new Error(message.error));
      }
    };
    
    const handleExit = () => {
      worker.worker.off('message', handleMessage);
      worker.worker.off('exit', handleExit);
      releaseWorker(worker);
      reject(new Error('Worker意外退出'));
    };
    
    worker.worker.on('message', handleMessage);
    worker.worker.on('exit', handleExit);
    
    assignTask(worker, {
      type: 'scan',
      directory: dirPath
    });
  });
}

/**
 * 获取Worker池统计信息
 */
function getPoolStats() {
  return {
    totalWorkers: workerPool.length,
    busyWorkers: workerPool.filter(w => w.busy).length,
    idleWorkers: workerPool.filter(w => !w.busy).length,
    queueLength: taskQueue.length
  };
}

module.exports = {
  initWorkerPool,
  closeWorkerPool,
  concurrentScan,
  scanDirectory,
  withConcurrency,
  getPoolStats,
  concurrencyConfig
};