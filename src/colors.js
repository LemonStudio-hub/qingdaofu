// 颜色代码
const COLORS = {
  reset: '\x1b[0m',
  
  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // 亮色
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // 背景色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  
  // 样式
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m'
};

// 颜色主题
const THEMES = {
  default: {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'cyan',
    debug: 'gray',
    title: 'brightBlue',
    subtitle: 'brightCyan',
    highlight: 'brightYellow'
  },
  dark: {
    success: 'brightGreen',
    error: 'brightRed',
    warning: 'brightYellow',
    info: 'brightCyan',
    debug: 'gray',
    title: 'brightBlue',
    subtitle: 'brightMagenta',
    highlight: 'brightWhite'
  },
  light: {
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    debug: 'black',
    title: 'blue',
    subtitle: 'magenta',
    highlight: 'black'
  },
  none: {
    success: null,
    error: null,
    warning: null,
    info: null,
    debug: null,
    title: null,
    subtitle: null,
    highlight: null
  }
};

// 当前主题
let currentTheme = 'default';

/**
 * 设置颜色主题
 */
function setTheme(themeName) {
  if (THEMES[themeName]) {
    currentTheme = themeName;
  } else {
    currentTheme = 'none';
  }
}

/**
 * 获取当前主题
 */
function getTheme() {
  return THEMES[currentTheme];
}

/**
 * 应用颜色到文本
 */
function colorize(text, color) {
  if (!color || !COLORS[color]) {
    return text;
  }
  
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * 成功消息（绿色）
 */
function success(text) {
  const theme = getTheme();
  return colorize(text, theme.success);
}

/**
 * 错误消息（红色）
 */
function error(text) {
  const theme = getTheme();
  return colorize(text, theme.error);
}

/**
 * 警告消息（黄色）
 */
function warning(text) {
  const theme = getTheme();
  return colorize(text, theme.warning);
}

/**
 * 信息消息（青色）
 */
function info(text) {
  const theme = getTheme();
  return colorize(text, theme.info);
}

/**
 * 调试消息（灰色）
 */
function debug(text) {
  const theme = getTheme();
  return colorize(text, theme.debug);
}

/**
 * 标题文本
 */
function title(text) {
  const theme = getTheme();
  return colorize(text, theme.title);
}

/**
 * 副标题文本
 */
function subtitle(text) {
  const theme = getTheme();
  return colorize(text, theme.subtitle);
}

/**
 * 高亮文本
 */
function highlight(text) {
  const theme = getTheme();
  return colorize(text, theme.highlight);
}

/**
 * 粗体文本
 */
function bold(text) {
  return colorize(text, 'bold');
}

/**
 * 下划线文本
 */
function underline(text) {
  return colorize(text, 'underline');
}

/**
 * 创建彩虹文本
 */
function rainbow(text) {
  const rainbowColors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
  let result = '';
  
  for (let i = 0; i < text.length; i++) {
    const color = rainbowColors[i % rainbowColors.length];
    result += colorize(text[i], color);
  }
  
  return result;
}

/**
 * 检查终端是否支持颜色
 */
function supportsColor() {
  return process.stdout.isTTY && 
         process.env.TERM !== 'dumb' &&
         !process.env.NO_COLOR;
}

/**
 * 检查是否启用颜色
 */
function isEnabled() {
  return supportsColor() && currentTheme !== 'none';
}

/**
 * 禁用颜色输出
 */
function disable() {
  currentTheme = 'none';
}

/**
 * 启用颜色输出
 */
function enable(theme = 'default') {
  setTheme(theme);
}

/**
 * 格式化进度条
 */
function progressbar(percent, options = {}) {
  const {
    width = 40,
    completeChar = '█',
    incompleteChar = '░',
    showPercent = true,
    color = 'green'
  } = options;
  
  const filled = Math.floor((percent / 100) * width);
  const empty = width - filled;
  
  let bar = colorize(completeChar.repeat(filled), color);
  bar += incompleteChar.repeat(empty);
  
  if (showPercent) {
    bar += ` ${Math.round(percent)}%`;
  }
  
  return bar;
}

/**
 * 创建表格
 */
function table(headers, rows, options = {}) {
  const { colors = true } = options;
  
  if (!colors || !isEnabled()) {
    return createSimpleTable(headers, rows);
  }
  
  return createColoredTable(headers, rows);
}

/**
 * 创建简单表格
 */
function createSimpleTable(headers, rows) {
  const columnWidths = headers.map((h, i) => {
    const maxWidth = Math.max(h.length, ...rows.map(r => String(r[i]).length));
    return maxWidth + 2;
  });
  
  let result = '';
  
  // 标题行
  result += headers.map((h, i) => h.padEnd(columnWidths[i])).join(' ') + '\n';
  
  // 分隔线
  result += columnWidths.map(w => '-'.repeat(w - 1) + ' ').join(' ') + '\n';
  
  // 数据行
  for (const row of rows) {
    result += row.map((cell, i) => String(cell).padEnd(columnWidths[i])).join(' ') + '\n';
  }
  
  return result;
}

/**
 * 创建彩色表格
 */
function createColoredTable(headers, rows) {
  const columnWidths = headers.map((h, i) => {
    const maxWidth = Math.max(h.length, ...rows.map(r => String(r[i]).length));
    return maxWidth + 2;
  });
  
  let result = '';
  
  // 标题行
  result += headers.map((h, i) => bold(h.padEnd(columnWidths[i]))).join(' ') + '\n';
  
  // 分隔线
  result += columnWidths.map(w => '-'.repeat(w - 1) + ' ').join(' ') + '\n';
  
  // 数据行
  for (const row of rows) {
    result += row.map((cell, i) => String(cell).padEnd(columnWidths[i])).join(' ') + '\n';
  }
  
  return result;
}

/**
 * 格式化文件大小（带颜色）
 */
function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  
  let text = value.toFixed(2) + ' ' + units[i];
  
  // 根据大小应用不同颜色
  if (i >= 3) {
    text = warning(text); // GB或TB用黄色
  } else if (i >= 2) {
    text = info(text); // MB用青色
  } else if (i >= 1) {
    text = success(text); // KB用绿色
  }
  
  return text;
}

module.exports = {
  COLORS,
  THEMES,
  setTheme,
  getTheme,
  colorize,
  success,
  error,
  warning,
  info,
  debug,
  title,
  subtitle,
  highlight,
  bold,
  underline,
  rainbow,
  supportsColor,
  isEnabled,
  disable,
  enable,
  progressbar,
  table,
  formatFileSize
};
