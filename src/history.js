const fs = require('fs').promises;
const path = require('path');
const { HISTORY_FILE } = require('./config');
const { log } = require('./logger');
const { formatFileSize } = require('./file-utils');

// 记录历史
async function recordHistory(data) {
  try {
    let history = [];
    
    try {
      const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
      history = JSON.parse(historyData);
    } catch {
      // 文件不存在，使用空数组
    }

    // 添加新记录
    history.push({
      timestamp: new Date().toISOString(),
      ...data
    });

    // 只保留最近100条记录
    if (history.length > 100) {
      history = history.slice(-100);
    }

    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
    await log(`记录历史: ${data.deletedCount || 0} 个文件, ${formatFileSize(data.freedSpace || 0)}`, 'INFO');
  } catch (err) {
    await log(`记录历史失败: ${err.message}`, 'ERROR');
  }
}

// 加载历史
async function loadHistory() {
  try {
    const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(historyData);
  } catch {
    return [];
  }
}

// 显示历史
async function showHistory(limit = 10) {
  const history = await loadHistory();
  
  if (history.length === 0) {
    console.log('\n暂无历史记录');
    return;
  }

  console.log('\n历史记录:');
  console.log('='.repeat(80));

  // 显示最近N条记录
  const recentHistory = history.slice(-limit).reverse();

  recentHistory.forEach((record, index) => {
    const date = new Date(record.timestamp);
    const formattedDate = date.toLocaleString('zh-CN');
    
    console.log(`\n#${index + 1} ${formattedDate}`);
    console.log(`  扫描路径: ${record.scanPath || 'N/A'}`);
    console.log(`  删除文件: ${record.deletedCount || 0} 个`);
    console.log(`  释放空间: ${formatFileSize(record.freedSpace || 0)}`);
    
    if (record.errors && record.errors.length > 0) {
      console.log(`  错误数: ${record.errors.length}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`总计: ${history.length} 条记录`);
}

// 清空历史
async function clearHistory() {
  try {
    await fs.writeFile(HISTORY_FILE, '[]');
    await log('清空历史记录', 'INFO');
    return true;
  } catch (err) {
    await log(`清空历史失败: ${err.message}`, 'ERROR');
    return false;
  }
}

module.exports = {
  recordHistory,
  loadHistory,
  showHistory,
  clearHistory
};