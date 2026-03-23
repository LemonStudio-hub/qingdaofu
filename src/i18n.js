// 语言包
const LOCALES = {
  'zh-CN': {
    // 通用
    appName: '清道夫',
    appDescription: 'Termux空间清理工具',
    version: '版本',
    
    // 状态
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    
    // 扫描
    scanning: '正在扫描垃圾文件...',
    scanComplete: '扫描完成',
    filesScanned: '个文件, 发现',
    garbageFiles: '个垃圾文件',
    noGarbageFiles: '没有发现垃圾文件',
    systemClean: '系统很干净，无需清理！',
    
    // 文件类型
    logFiles: '日志文件',
    tempFiles: '临时文件',
    editorBackup: '编辑器备份文件',
    vimSwap: 'Vim交换文件',
    systemFile: '系统文件',
    thumbnailCache: '缩略图缓存',
    custom: '自定义',
    
    // 清理
    cleaning: '正在清理...',
    cleanComplete: '清理完成！',
    deletedFiles: '删除文件',
    freedSpace: '释放空间',
    backedUpFiles: '备份文件',
    deleteFailed: '部分文件删除失败',
    cancel: '已取消清理操作',
    confirmClean: '是否确认清理这些文件? (y/n)',
    
    // 备份
    backupEnabled: '备份: 启用',
    backupDisabled: '备份: 禁用',
    backupCreated: '创建备份',
    backupCleanup: '清理过期备份',
    backupRestored: '恢复完成',
    backupRestoreFailed: '恢复失败',
    noBackups: '暂无备份',
    backupList: '备份列表',
    
    // 配置
    configValid: '配置文件验证通过',
    configInvalid: '配置文件验证失败',
    configPath: '配置文件路径',
    
    // 统计
    statistics: '统计',
    history: '历史记录',
    noHistory: '暂无历史记录',
    totalRecords: '总计',
    
    // 时间
    seconds: '秒',
    minutes: '分',
    hours: '小时',
    days: '天',
    ago: '前',
    remaining: '剩余',
    
    // 大小
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    gigabytes: 'GB',
    terabytes: 'TB',
    
    // 错误
    permissionDenied: '权限被拒绝',
    fileNotFound: '文件不存在',
    fileInUse: '文件正在使用',
    diskFull: '磁盘空间不足',
    backupFailed: '备份失败',
    restoreFailed: '恢复失败',
    scanError: '扫描错误',
    deleteError: '删除错误',
    
    // 帮助
    help: '帮助',
    usage: '用法',
    options: '选项',
    examples: '示例',
    configFiles: '配置文件',
    moreInfo: '更多信息',
    
    // 插件
    pluginLoaded: '加载插件成功',
    pluginLoadFailed: '加载插件失败',
    pluginUnloaded: '卸载插件成功',
    pluginHookFailed: '插件钩子执行失败',
    
    // 规则
    ruleAdded: '添加规则',
    ruleRemoved: '删除规则',
    ruleEvaluated: '规则评估',
    noRules: '暂无规则',
    
    // 缓存
    cacheCleared: '缓存已清空',
    cacheExpired: '清理过期缓存',
    cacheStats: '缓存统计',
    
    // 界面
    scanPath: '扫描路径',
    previewMode: '预览模式',
    interactiveMode: '交互模式',
    minFileSize: '最小文件大小',
    maxFileSize: '最大文件大小',
    olderThan: '文件时间',
    totalTime: '总耗时',
    scanProgress: '扫描进度'
  },
  
  'en-US': {
    // Common
    appName: 'Qingdaofu',
    appDescription: 'Termux Space Cleaner',
    version: 'Version',
    
    // Status
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    
    // Scan
    scanning: 'Scanning for garbage files...',
    scanComplete: 'Scan complete',
    filesScanned: 'files scanned, found',
    garbageFiles: 'garbage files',
    noGarbageFiles: 'No garbage files found',
    systemClean: 'System is clean, no need to clean!',
    
    // File types
    logFiles: 'Log files',
    tempFiles: 'Temporary files',
    editorBackup: 'Editor backup files',
    vimSwap: 'Vim swap files',
    systemFile: 'System files',
    thumbnailCache: 'Thumbnail cache',
    custom: 'Custom',
    
    // Clean
    cleaning: 'Cleaning...',
    cleanComplete: 'Clean complete!',
    deletedFiles: 'Deleted files',
    freedSpace: 'Freed space',
    backedUpFiles: 'Backed up files',
    deleteFailed: 'Some files failed to delete',
    cancel: 'Clean operation cancelled',
    confirmClean: 'Confirm cleaning these files? (y/n)',
    
    // Backup
    backupEnabled: 'Backup: Enabled',
    backupDisabled: 'Backup: Disabled',
    backupCreated: 'Backup created',
    backupCleanup: 'Cleaning expired backups',
    backupRestored: 'Restore complete',
    backupRestoreFailed: 'Restore failed',
    noBackups: 'No backups available',
    backupList: 'Backup list',
    
    // Config
    configValid: 'Config file validation passed',
    configInvalid: 'Config file validation failed',
    configPath: 'Config file path',
    
    // Statistics
    statistics: 'Statistics',
    history: 'History',
    noHistory: 'No history records',
    totalRecords: 'Total',
    
    // Time
    seconds: 'seconds',
    minutes: 'minutes',
    hours: 'hours',
    days: 'days',
    ago: 'ago',
    remaining: 'remaining',
    
    // Size
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    gigabytes: 'GB',
    terabytes: 'TB',
    
    // Error
    permissionDenied: 'Permission denied',
    fileNotFound: 'File not found',
    fileInUse: 'File in use',
    diskFull: 'Disk full',
    backupFailed: 'Backup failed',
    restoreFailed: 'Restore failed',
    scanError: 'Scan error',
    deleteError: 'Delete error',
    
    // Help
    help: 'Help',
    usage: 'Usage',
    options: 'Options',
    examples: 'Examples',
    configFiles: 'Config files',
    moreInfo: 'More info',
    
    // Plugin
    pluginLoaded: 'Plugin loaded successfully',
    pluginLoadFailed: 'Failed to load plugin',
    pluginUnloaded: 'Plugin unloaded successfully',
    pluginHookFailed: 'Plugin hook execution failed',
    
    // Rule
    ruleAdded: 'Rule added',
    ruleRemoved: 'Rule removed',
    ruleEvaluated: 'Rule evaluated',
    noRules: 'No rules available',
    
    // Cache
    cacheCleared: 'Cache cleared',
    cacheExpired: 'Cleaned expired cache',
    cacheStats: 'Cache statistics',
    
    // UI
    scanPath: 'Scan path',
    previewMode: 'Preview mode',
    interactiveMode: 'Interactive mode',
    minFileSize: 'Min file size',
    maxFileSize: 'Max file size',
    olderThan: 'File age',
    totalTime: 'Total time',
    scanProgress: 'Scan progress'
  }
};

// 当前语言
let currentLocale = 'zh-CN';

/**
 * 设置语言
 */
function setLocale(locale) {
  if (LOCALES[locale]) {
    currentLocale = locale;
  } else {
    currentLocale = 'zh-CN';
  }
}

/**
 * 获取当前语言
 */
function getLocale() {
  return currentLocale;
}

/**
 * 获取翻译文本
 */
function t(key, params = {}) {
  const locale = LOCALES[currentLocale];
  let text = key.split('.').reduce((obj, k) => obj ? obj[k] : null, locale);
  
  if (!text) {
    // 尝试从英文获取
    const enLocale = LOCALES['en-US'];
    text = key.split('.').reduce((obj, k) => obj ? obj[k] : null, enLocale);
  }
  
  if (!text) {
    return key;
  }
  
  // 替换参数
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(`{${param}}`, value);
  }
  
  return text;
}

/**
 * 检测系统语言
 */
function detectSystemLocale() {
  const systemLocale = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || '';
  
  if (systemLocale.startsWith('zh')) {
    return 'zh-CN';
  } else if (systemLocale.startsWith('en')) {
    return 'en-US';
  }
  
  return 'zh-CN';
}

/**
 * 初始化语言
 */
function init() {
  const detectedLocale = detectSystemLocale();
  setLocale(detectedLocale);
}

/**
 * 获取可用语言列表
 */
function getAvailableLocales() {
  return Object.keys(LOCALES);
}

/**
 * 添加自定义语言包
 */
function addLocale(locale, translations) {
  LOCALES[locale] = translations;
}

/**
 * 移除语言包
 */
function removeLocale(locale) {
  if (locale !== 'zh-CN' && locale !== 'en-US') {
    delete LOCALES[locale];
    return true;
  }
  return false;
}

module.exports = {
  setLocale,
  getLocale,
  t,
  detectSystemLocale,
  init,
  getAvailableLocales,
  addLocale,
  removeLocale,
  LOCALES
};