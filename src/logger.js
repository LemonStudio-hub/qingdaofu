const fs = require('fs').promises;
const path = require('path');
const { LOG_FILE } = require('./config');

// 详细输出开关
let verbose = false;

// 设置详细输出模式
function setVerbose(v) {
  verbose = v;
}

// 获取详细输出模式
function isVerbose() {
  return verbose;
}

// 记录日志
async function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  if (verbose) {
    console.log(logMessage.trim());
  }
  
  try {
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (err) {
    // 忽略日志写入错误
  }
}

// 记录错误日志
async function logError(message, code) {
  await log(`${message} [${code}]`, 'ERROR');
}

// 记录警告日志
async function logWarn(message) {
  await log(message, 'WARN');
}

// 记录信息日志
async function logInfo(message) {
  await log(message, 'INFO');
}

module.exports = {
  setVerbose,
  isVerbose,
  log,
  logError,
  logWarn,
  logInfo
};