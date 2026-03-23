# 清道夫 API 文档

## 版本
**v3.0.0**

## 概述
清道夫是一个功能强大的Termux空间清理CLI工具，支持插件系统、规则引擎、统计分析、多语言等高级功能。

## 模块列表

### 1. config.js - 配置管理模块

管理应用程序配置和常量。

#### 常量

- `DEFAULT_CONFIG`: 默认配置对象
- `CONFIG_FILE`: 配置文件路径
- `BACKUP_DIR`: 备份目录路径
- `LOG_FILE`: 日志文件路径
- `HISTORY_FILE`: 历史记录文件路径
- `ERROR_CODES`: 错误代码常量
- `ERROR_SOLUTIONS`: 错误解决方案映射

#### 函数

##### `getConfig()`
获取当前配置。

**返回**: `Object` - 当前配置对象

**示例**:
```javascript
const config = getConfig();
console.log(config.scanPath);
```

##### `setConfig(newConfig)`
设置配置。

**参数**:
- `newConfig` (Object): 要设置的配置对象

**返回**: `void`

**示例**:
```javascript
setConfig({
  scanPath: '/custom/path',
  minFileSize: 1024
});
```

##### `resetConfig()`
重置为默认配置。

**返回**: `void`

**示例**:
```javascript
resetConfig();
```

##### `validateConfig(userConfig)`
验证配置对象。

**参数**:
- `userConfig` (Object): 要验证的配置对象

**返回**: `Array<string>` - 错误消息数组，空数组表示验证通过

**示例**:
```javascript
const errors = validateConfig({
  garbagePatterns: [
    { pattern: /\.log$/, description: '日志文件' }
  ]
});
```

---

### 2. logger.js - 日志管理模块

管理应用程序日志。

#### 函数

##### `setVerbose(v)`
设置详细输出模式。

**参数**:
- `v` (Boolean): 是否启用详细输出

**返回**: `void`

##### `isVerbose()`
检查是否启用详细输出。

**返回**: `Boolean`

##### `log(message, level)`
记录日志。

**参数**:
- `message` (String): 日志消息
- `level` (String): 日志级别（INFO, WARN, ERROR）

**返回**: `Promise<void>`

##### `logError(message, code)`
记录错误日志。

**参数**:
- `message` (String): 错误消息
- `code` (String): 错误代码

**返回**: `Promise<void>`

##### `logWarn(message)`
记录警告日志。

**参数**:
- `message` (String): 警告消息

**返回**: `Promise<void>`

##### `logInfo(message)`
记录信息日志。

**参数**:
- `message` (String): 信息消息

**返回**: `Promise<void>`

---

### 3. file-utils.js - 文件工具模块

提供文件操作的工具函数。

#### 函数

##### `fileExists(filePath)`
检查文件是否存在。

**参数**:
- `filePath` (String): 文件路径

**返回**: `Promise<Boolean>`

##### `normalizePath(dirPath)`
规范化路径。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `String` - 规范化后的路径

##### `formatFileSize(bytes)`
格式化文件大小。

**参数**:
- `bytes` (Number): 字节数

**返回**: `String` - 格式化后的大小（如 "1.5 KB"）

##### `getDirectorySize(dirPath)`
计算目录大小。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Promise<Number>` - 目录大小（字节）

##### `countFilesInDirectory(dirPath)`
计算目录中的文件数。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Promise<Number>` - 文件数量

##### `copyDirectory(src, dest)`
复制目录。

**参数**:
- `src` (String): 源目录路径
- `dest` (String): 目标目录路径

**返回**: `Promise<void>`

##### `removeDirectory(dirPath)`
删除目录。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Promise<void>`

---

### 4. scanner.js - 扫描模块

扫描垃圾文件。

#### 函数

##### `setProgressBar(pb)`
设置进度条对象。

**参数**:
- `pb` (Object): 进度条对象

**返回**: `void`

##### `resetCounters()`
重置扫描计数器。

**返回**: `void`

##### `getCounters()`
获取扫描计数器。

**返回**: `Object` - 包含 `scannedCount` 和 `foundCount`

##### `isProtectedDirectory(dirPath)`
检查是否为受保护目录。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Boolean`

##### `isGarbageFile(filename)`
检查是否为垃圾文件。

**参数**:
- `filename` (String): 文件名

**返回**: `Boolean`

##### `getGarbageType(filename)`
获取垃圾文件类型。

**参数**:
- `filename` (String): 文件名

**返回**: `String` - 文件类型描述

##### `matchesFilters(stats)`
检查文件是否符合过滤条件。

**参数**:
- `stats` (Object): 文件统计信息

**返回**: `Boolean`

##### `scanGarbageFiles(basePath, options)`
扫描垃圾文件。

**参数**:
- `basePath` (String): 基础路径
- `options` (Object): 扫描选项
  - `maxDepth` (Number): 最大扫描深度

**返回**: `Promise<Array>` - 垃圾文件数组

##### `scanCacheDirectories()`
扫描缓存目录。

**返回**: `Promise<Array>` - 垃圾文件数组

---

### 5. backup.js - 备份管理模块

管理文件备份。

#### 函数

##### `createBackup(files)`
创建备份。

**参数**:
- `files` (Array): 文件数组

**返回**: `Promise<Array>` - 备份文件数组

##### `cleanupOldBackups()`
清理过期备份。

**返回**: `Promise<Object>` - 清理结果

##### `getBackupInfo()`
获取备份信息。

**返回**: `Promise<Object>` - 备份信息对象

##### `restoreFromBackup(backupName)`
从备份恢复文件。

**参数**:
- `backupName` (String): 备份名称

**返回**: `Promise<Object>` - 恢复结果

---

### 6. history.js - 历史记录模块

管理清理历史记录。

#### 函数

##### `recordHistory(data)`
记录历史。

**参数**:
- `data` (Object): 历史数据

**返回**: `Promise<void>`

##### `loadHistory()`
加载历史记录。

**返回**: `Promise<Array>` - 历史记录数组

##### `showHistory(limit)`
显示历史记录。

**参数**:
- `limit` (Number): 显示条数

**返回**: `Promise<void>`

##### `clearHistory()`
清空历史记录。

**返回**: `Promise<Boolean>`

---

### 7. ui.js - 用户界面模块

提供用户界面功能。

#### 类

##### `EnhancedProgressBar`

增强的进度条类。

**方法**:
- `update(current)`: 更新进度
- `stop()`: 停止进度条

#### 函数

##### `displayGarbageFiles(files)`
显示垃圾文件列表。

**参数**:
- `files` (Array): 文件数组

**返回**: `Number` - 总大小

##### `showHelp()`
显示帮助信息。

**返回**: `void`

##### `showError(errorCode, errorMessage)`
显示错误提示。

**参数**:
- `errorCode` (String): 错误代码
- `errorMessage` (String): 错误消息

**返回**: `void`

##### `showSuccess(message)`
显示成功提示。

**参数**:
- `message` (String): 消息

**返回**: `void`

##### `showWarning(message)`
显示警告提示。

**参数**:
- `message` (String): 消息

**返回**: `void`

---

### 8. plugins.js - 插件系统模块

管理插件。

#### 常量

- `PLUGIN_INTERFACE`: 插件接口规范

#### 函数

##### `loadPlugin(pluginPath)`
加载插件。

**参数**:
- `pluginPath` (String): 插件文件路径

**返回**: `Promise<Object>` - 插件对象

##### `unloadPlugin(pluginName)`
卸载插件。

**参数**:
- `pluginName` (String): 插件名称

**返回**: `Promise<void>`

##### `getPlugin(pluginName)`
获取插件。

**参数**:
- `pluginName` (String): 插件名称

**返回**: `Object | undefined`

##### `getAllPlugins()`
获取所有插件。

**返回**: `Array<Object>`

##### `executeHook(hookName, data)`
执行插件钩子。

**参数**:
- `hookName` (String): 钩子名称
- `data` (Object): 数据对象

**返回**: `Promise<Array>` - 执行结果数组

##### `executeMethod(pluginName, methodName, ...args)`
执行插件方法。

**参数**:
- `pluginName` (String): 插件名称
- `methodName` (String): 方法名称
- `...args` (Any): 方法参数

**返回**: `Promise<Any>`

##### `loadPluginsFromDir(dirPath)`
从目录加载所有插件。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Promise<void>`

---

### 9. rules.js - 规则引擎模块

管理清理规则。

#### 常量

- `RULE_TYPES`: 规则类型
- `OPERATORS`: 操作符

#### 函数

##### `createRule(options)`
创建规则。

**参数**:
- `options` (Object): 规则选项

**返回**: `Object` - 规则对象

##### `createRuleGroup(name, rules)`
创建规则组。

**参数**:
- `name` (String): 规则组名称
- `rules` (Array): 规则数组

**返回**: `Object` - 规则组对象

##### `addRuleGroup(group)`
添加规则组。

**参数**:
- `group` (Object): 规则组对象

**返回**: `void`

##### `removeRuleGroup(groupId)`
删除规则组。

**参数**:
- `groupId` (String): 规则组ID

**返回**: `Boolean`

##### `getRuleGroups()`
获取所有规则组。

**返回**: `Array<Object>`

##### `getEnabledRules()`
获取启用的规则。

**返回**: `Array<Object>`

##### `evaluateFile(fileInfo)`
评估文件是否匹配规则。

**参数**:
- `fileInfo` (Object): 文件信息对象

**返回**: `Object | null` - 匹配的规则

##### `loadRuleTemplate(templateName)`
加载规则模板。

**参数**:
- `templateName` (String): 模板名称

**返回**: `Object | undefined` - 规则对象

---

### 10. statistics.js - 统计分析模块

提供统计分析功能。

#### 函数

##### `recordScan(data)`
记录扫描统计。

**参数**:
- `data` (Object): 扫描数据

**返回**: `void`

##### `recordCleanup(data)`
记录清理统计。

**参数**:
- `data` (Object): 清理数据

**返回**: `void`

##### `recordError(data)`
记录错误统计。

**参数**:
- `data` (Object): 错误数据

**返回**: `void`

##### `getDiskUsageTrend(days)`
获取磁盘使用趋势。

**参数**:
- `days` (Number): 天数

**返回**: `Array<Object>` - 趋势数据

##### `getCleanupEffectiveness(days)`
获取清理效果统计。

**参数**:
- `days` (Number): 天数

**返回**: `Object` - 统计信息

##### `getFileTypeStatistics(days)`
获取文件类型统计。

**参数**:
- `days` (Number): 天数

**返回**: `Array<Object>` - 文件类型统计

##### `generateTextReport(days)`
生成文本报告。

**参数**:
- `days` (Number): 天数

**返回**: `String` - 报告文本

##### `generateJSONReport(days)`
生成JSON报告。

**参数**:
- `days` (Number): 天数

**返回**: `String` - JSON字符串

##### `generateCSVReport(days)`
生成CSV报告。

**参数**:
- `days` (Number): 天数

**返回**: `String` - CSV字符串

---

### 11. cache.js - 缓存机制模块

提供缓存功能。

#### 函数

##### `set(key, value, options)`
设置缓存。

**参数**:
- `key` (String): 缓存键
- `value` (Any): 缓存值
- `options` (Object): 选项

**返回**: `Promise<Boolean>`

##### `get(key)`
获取缓存。

**参数**:
- `key` (String): 缓存键

**返回**: `Promise<Any>`

##### `remove(key)`
删除缓存。

**参数**:
- `key` (String): 缓存键

**返回**: `Promise<Boolean>`

##### `has(key)`
检查缓存是否存在。

**参数**:
- `key` (String): 缓存键

**返回**: `Promise<Boolean>`

##### `clear()`
清空所有缓存。

**返回**: `Promise<Boolean>`

##### `cleanExpired()`
清理过期缓存。

**返回**: `Promise<Number>` - 清理数量

##### `getStats()`
获取缓存统计信息。

**返回**: `Promise<Object>` - 统计信息

---

### 12. colors.js - 彩色输出模块

提供彩色输出功能。

#### 常量

- `COLORS`: 颜色代码常量
- `THEMES`: 颜色主题

#### 函数

##### `setTheme(themeName)`
设置颜色主题。

**参数**:
- `themeName` (String): 主题名称

**返回**: `void`

##### `getTheme()`
获取当前主题。

**返回**: `Object` - 主题对象

##### `colorize(text, color)`
应用颜色到文本。

**参数**:
- `text` (String): 文本
- `color` (String): 颜色名称

**返回**: `String` - 彩色文本

##### `success(text)`
成功消息（绿色）。

**参数**:
- `text` (String): 文本

**返回**: `String`

##### `error(text)`
错误消息（红色）。

**参数**:
- `text` (String): 文本

**返回**: `String`

##### `warning(text)`
警告消息（黄色）。

**参数**:
- `text` (String): 文本

**返回**: `String`

##### `info(text)`
信息消息（青色）。

**参数**:
- `text` (String): 文本

**返回**: `String`

##### `progressbar(percent, options)`
格式化进度条。

**参数**:
- `percent` (Number): 百分比
- `options` (Object): 选项

**返回**: `String`

---

### 13. i18n.js - 多语言支持模块

提供多语言支持。

#### 常量

- `LOCALES`: 语言包

#### 函数

##### `setLocale(locale)`
设置语言。

**参数**:
- `locale` (String): 语言代码

**返回**: `void`

##### `getLocale()`
获取当前语言。

**返回**: `String`

##### `t(key, params)`
获取翻译文本。

**参数**:
- `key` (String): 翻译键
- `params` (Object): 参数对象

**返回**: `String` - 翻译文本

##### `detectSystemLocale()`
检测系统语言。

**返回**: `String` - 语言代码

##### `init()`
初始化多语言支持。

**返回**: `void`

##### `getAvailableLocales()`
获取可用语言列表。

**返回**: `Array<String>`

##### `addLocale(locale, translations)`
添加自定义语言包。

**参数**:
- `locale` (String): 语言代码
- `translations` (Object): 翻译对象

**返回**: `void`

---

### 14. concurrent.js - 并发扫描模块

提供并发扫描功能。

#### 函数

##### `initWorkerPool(size)`
初始化Worker池。

**参数**:
- `size` (Number): Worker数量

**返回**: `Promise<void>`

##### `closeWorkerPool()`
关闭Worker池。

**返回**: `Promise<void>`

##### `concurrentScan(basePath, options)`
并发扫描目录。

**参数**:
- `basePath` (String): 基础路径
- `options` (Object): 扫描选项

**返回**: `Promise<Array>` - 垃圾文件数组

##### `scanDirectory(dirPath)`
扫描单个目录。

**参数**:
- `dirPath` (String): 目录路径

**返回**: `Promise<Array>` - 垃圾文件数组

##### `getPoolStats()`
获取Worker池统计信息。

**返回**: `Object` - 统计信息

---

## 使用示例

### 基本使用

```javascript
const { scanGarbageFiles } = require('./scanner');
const { displayGarbageFiles } = require('./ui');

// 扫描垃圾文件
const files = await scanGarbageFiles('/path/to/scan');

// 显示结果
displayGarbageFiles(files);
```

### 使用插件系统

```javascript
const { loadPlugin, executeHook } = require('./plugins');

// 加载插件
await loadPlugin('./plugins/notification.js');

// 执行钩子
await executeHook('beforeDelete', { files: files });
```

### 使用规则引擎

```javascript
const { createRule, addRuleGroup, evaluateFile } = require('./rules');

// 创建规则
const rule = createRule({
  name: '大文件',
  type: 'size',
  condition: { operator: '>', value: 1024 * 1024 }
});

// 评估文件
const fileInfo = { name: 'test.txt', size: 2048 * 1024, mtime: new Date() };
const result = evaluateFile(fileInfo);
```

### 使用多语言

```javascript
const { init, t } = require('./i18n');

// 初始化
init();

// 使用翻译
console.log(t('appName')); // 输出: 清道夫
```

---

## 许可证
MIT

## 贡献
欢迎贡献代码！请阅读项目根目录的 CONTRIBUTING.md 文件。