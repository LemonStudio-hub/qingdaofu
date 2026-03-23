const path = require('path');
const os = require('os');

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

// 当前配置状态
let config = { ...DEFAULT_CONFIG };

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

// 获取配置
function getConfig() {
  return config;
}

// 设置配置
function setConfig(newConfig) {
  config = { ...DEFAULT_CONFIG, ...newConfig };
}

// 重置配置
function resetConfig() {
  config = { ...DEFAULT_CONFIG };
}

module.exports = {
  DEFAULT_CONFIG,
  CONFIG_FILE,
  BACKUP_DIR,
  LOG_FILE,
  HISTORY_FILE,
  ERROR_CODES,
  ERROR_SOLUTIONS,
  getConfig,
  setConfig,
  resetConfig,
  validateConfig
};