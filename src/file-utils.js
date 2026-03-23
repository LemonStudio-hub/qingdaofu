const fs = require('fs').promises;
const path = require('path');

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

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + units[i];
}

// 计算目录大小
async function getDirectorySize(dirPath) {
  let size = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        size += stats.size;
      }
    }
  } catch (err) {
    // 忽略错误
  }

  return size;
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
      } else {
        count++;
      }
    }
  } catch (err) {
    // 忽略错误
  }

  return count;
}

// 复制目录
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// 删除目录
async function removeDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await removeDirectory(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }

  await fs.rmdir(dirPath);
}

module.exports = {
  fileExists,
  normalizePath,
  formatFileSize,
  getDirectorySize,
  countFilesInDirectory,
  copyDirectory,
  removeDirectory
};