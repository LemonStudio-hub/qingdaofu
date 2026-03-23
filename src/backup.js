const fs = require('fs').promises;
const path = require('path');
const { getConfig, BACKUP_DIR } = require('./config');
const { log } = require('./logger');
const { formatFileSize, getDirectorySize, countFilesInDirectory, removeDirectory } = require('./file-utils');

// 创建备份
async function createBackup(files) {
  const config = getConfig();
  
  if (!config.backupEnabled) {
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
async function cleanupOldBackups() {
  const config = getConfig();
  let cleanedCount = 0;
  let freedSpace = 0;

  try {
    // 确保备份目录存在
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const backupPath = path.join(BACKUP_DIR, entry.name);
      const stats = await fs.stat(backupPath);
      const age = Date.now() - stats.birthtimeMs;
      const maxAge = config.backupRetentionDays * 24 * 60 * 60 * 1000;

      // 如果备份超过保留天数，则删除
      if (age > maxAge) {
        const size = await getDirectorySize(backupPath);
        await removeDirectory(backupPath);
        cleanedCount++;
        freedSpace += size;
        await log(`清理过期备份: ${entry.name} - ${formatFileSize(size)}`, 'INFO');
      }
    }
    
    await log(`清理完成: ${cleanedCount} 个备份, 释放 ${formatFileSize(freedSpace)}`);
  } catch (err) {
    await log(`清理备份失败: ${err.message}`, 'ERROR');
  }

  return { cleanedCount, freedSpace };
}

// 获取备份信息
async function getBackupInfo() {
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
async function restoreFromBackup(backupName) {
  const backupInfo = await getBackupInfo();
  const backup = backupInfo.backups.find(b => b.name === backupName);

  if (!backup) {
    return { success: false, error: '备份不存在' };
  }

  const restoredFiles = [];
  const errors = [];

  try {
    // 递归遍历备份目录
    async function traverseDir(dir, relativePath = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullBackupPath = path.join(dir, entry.name);
        const restorePath = path.join(os.homedir(), relativePath, entry.name);

        if (entry.isDirectory()) {
          await traverseDir(fullBackupPath, path.join(relativePath, entry.name));
        } else {
          try {
            await fs.mkdir(path.dirname(restorePath), { recursive: true });
            await fs.copyFile(fullBackupPath, restorePath);
            restoredFiles.push({ backup: fullBackupPath, restored: restorePath });
          } catch (err) {
            errors.push(`${fullBackupPath}: ${err.message}`);
          }
        }
      }
    }

    await traverseDir(backup.path);

    await log(`恢复完成: ${restoredFiles.length} 个文件`, 'INFO');
    return { success: true, restoredFiles, errors };
  } catch (err) {
    await log(`恢复失败: ${err.message}`, 'ERROR');
    return { success: false, error: err.message };
  }
}

module.exports = {
  createBackup,
  cleanupOldBackups,
  getBackupInfo,
  restoreFromBackup
};