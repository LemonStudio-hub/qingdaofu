const { formatFileSize } = require('./file-utils');
const { log } = require('./logger');

// 统计数据存储
const statistics = {
  scans: [],
  cleanups: [],
  errors: []
};

/**
 * 记录扫描统计
 */
function recordScan(data) {
  const scanRecord = {
    timestamp: new Date().toISOString(),
    path: data.path,
    filesScanned: data.filesScanned,
    filesFound: data.filesFound,
    duration: data.duration,
    types: data.types || {}
  };
  
  statistics.scans.push(scanRecord);
  
  // 只保留最近100条记录
  if (statistics.scans.length > 100) {
    statistics.scans.shift();
  }
  
  log(`记录扫描统计: ${data.path} - ${data.filesFound} 个文件`, 'INFO');
}

/**
 * 记录清理统计
 */
function recordCleanup(data) {
  const cleanupRecord = {
    timestamp: new Date().toISOString(),
    path: data.path,
    filesDeleted: data.filesDeleted,
    spaceFreed: data.spaceFreed,
    backedUp: data.backedUp || false,
    errors: data.errors || [],
    duration: data.duration
  };
  
  statistics.cleanups.push(cleanupRecord);
  
  // 只保留最近100条记录
  if (statistics.cleanups.length > 100) {
    statistics.cleanups.shift();
  }
  
  log(`记录清理统计: ${data.path} - ${data.filesDeleted} 个文件, ${formatFileSize(data.spaceFreed)}`, 'INFO');
}

/**
 * 记录错误统计
 */
function recordError(data) {
  const errorRecord = {
    timestamp: new Date().toISOString(),
    type: data.type,
    message: data.message,
    code: data.code,
    path: data.path
  };
  
  statistics.errors.push(errorRecord);
  
  // 只保留最近100条记录
  if (statistics.errors.length > 100) {
    statistics.errors.shift();
  }
  
  log(`记录错误统计: ${data.type} - ${data.message}`, 'ERROR');
}

/**
 * 获取磁盘使用趋势
 */
function getDiskUsageTrend(days = 30) {
  const now = Date.now();
  const cutoffTime = now - (days * 24 * 60 * 60 * 1000);
  
  const relevantCleanups = statistics.cleanups.filter(
    c => new Date(c.timestamp).getTime() >= cutoffTime
  );
  
  const trend = [];
  const dailyData = {};
  
  // 按天分组
  for (const cleanup of relevantCleanups) {
    const date = new Date(cleanup.timestamp).toISOString().split('T')[0];
    
    if (!dailyData[date]) {
      dailyData[date] = {
        date: date,
        filesDeleted: 0,
        spaceFreed: 0,
        cleanups: 0
      };
    }
    
    dailyData[date].filesDeleted += cleanup.filesDeleted;
    dailyData[date].spaceFreed += cleanup.spaceFreed;
    dailyData[date].cleanups += 1;
  }
  
  // 生成趋势数据
  for (const date of Object.keys(dailyData).sort()) {
    trend.push(dailyData[date]);
  }
  
  return trend;
}

/**
 * 获取清理效果统计
 */
function getCleanupEffectiveness(days = 30) {
  const now = Date.now();
  const cutoffTime = now - (days * 24 * 60 * 60 * 1000);
  
  const relevantCleanups = statistics.cleanups.filter(
    c => new Date(c.timestamp).getTime() >= cutoffTime
  );
  
  if (relevantCleanups.length === 0) {
    return {
      totalCleanups: 0,
      totalFilesDeleted: 0,
      totalSpaceFreed: 0,
      avgFilesPerCleanup: 0,
      avgSpacePerCleanup: 0,
      successRate: 0
    };
  }
  
  const totalFilesDeleted = relevantCleanups.reduce((sum, c) => sum + c.filesDeleted, 0);
  const totalSpaceFreed = relevantCleanups.reduce((sum, c) => sum + c.spaceFreed, 0);
  const successfulCleanups = relevantCleanups.filter(c => c.errors.length === 0).length;
  
  return {
    totalCleanups: relevantCleanups.length,
    totalFilesDeleted: totalFilesDeleted,
    totalSpaceFreed: totalSpaceFreed,
    avgFilesPerCleanup: Math.round(totalFilesDeleted / relevantCleanups.length),
    avgSpacePerCleanup: Math.round(totalSpaceFreed / relevantCleanups.length),
    successRate: Math.round((successfulCleanups / relevantCleanups.length) * 100)
  };
}

/**
 * 获取文件类型统计
 */
function getFileTypeStatistics(days = 30) {
  const now = Date.now();
  const cutoffTime = now - (days * 24 * 60 * 60 * 1000);
  
  const relevantScans = statistics.scans.filter(
    s => new Date(s.timestamp).getTime() >= cutoffTime
  );
  
  const typeStats = {};
  
  for (const scan of relevantScans) {
    for (const [type, count] of Object.entries(scan.types || {})) {
      if (!typeStats[type]) {
        typeStats[type] = {
          type: type,
          count: 0,
          appearances: 0
        };
      }
      
      typeStats[type].count += count;
      typeStats[type].appearances += 1;
    }
  }
  
  // 转换为数组并排序
  return Object.values(typeStats).sort((a, b) => b.count - a.count);
}

/**
 * 获取错误统计
 */
function getErrorStatistics(days = 30) {
  const now = Date.now();
  const cutoffTime = now - (days * 24 * 60 * 60 * 1000);
  
  const relevantErrors = statistics.errors.filter(
    e => new Date(e.timestamp).getTime() >= cutoffTime
  );
  
  const errorStats = {};
  
  for (const error of relevantErrors) {
    if (!errorStats[error.type]) {
      errorStats[error.type] = {
        type: error.type,
        count: 0,
        messages: []
      };
    }
    
    errorStats[error.type].count += 1;
    
    if (errorStats[error.type].messages.length < 5) {
      errorStats[error.type].messages.push(error.message);
    }
  }
  
  return Object.values(errorStats).sort((a, b) => b.count - a.count);
}

/**
 * 生成文本报告
 */
function generateTextReport(days = 30) {
  const cleanupEffectiveness = getCleanupEffectiveness(days);
  const diskUsageTrend = getDiskUsageTrend(days);
  const fileTypeStats = getFileTypeStatistics(days);
  const errorStats = getErrorStatistics(days);
  
  let report = '清道夫 - 清理效果统计报告\n';
  report += '='.repeat(80) + '\n\n';
  
  // 概览
  report += '概览\n';
  report += '-'.repeat(40) + '\n';
  report += `统计周期: 最近 ${days} 天\n`;
  report += `清理次数: ${cleanupEffectiveness.totalCleanups}\n`;
  report += `删除文件: ${cleanupEffectiveness.totalFilesDeleted}\n`;
  report += `释放空间: ${formatFileSize(cleanupEffectiveness.totalSpaceFreed)}\n`;
  report += `成功率: ${cleanupEffectiveness.successRate}%\n\n`;
  
  // 趋势
  if (diskUsageTrend.length > 0) {
    report += '磁盘清理趋势\n';
    report += '-'.repeat(40) + '\n';
    
    for (const day of diskUsageTrend.slice(-7)) {
      report += `${day.date}: ${day.filesDeleted} 个文件, ${formatFileSize(day.spaceFreed)}\n`;
    }
    
    report += '\n';
  }
  
  // 文件类型
  if (fileTypeStats.length > 0) {
    report += '文件类型统计\n';
    report += '-'.repeat(40) + '\n';
    
    for (const type of fileTypeStats.slice(0, 10)) {
      report += `${type.type}: ${type.count} 个文件 (出现 ${type.appearances} 次)\n`;
    }
    
    report += '\n';
  }
  
  // 错误统计
  if (errorStats.length > 0) {
    report += '错误统计\n';
    report += '-'.repeat(40) + '\n';
    
    for (const error of errorStats.slice(0, 5)) {
      report += `${error.type}: ${error.count} 次\n`;
      for (const message of error.messages) {
        report += `  - ${message}\n`;
      }
    }
    
    report += '\n';
  }
  
  report += '='.repeat(80) + '\n';
  report += `报告生成时间: ${new Date().toISOString()}\n`;
  
  return report;
}

/**
 * 生成JSON报告
 */
function generateJSONReport(days = 30) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    period: `${days} days`,
    cleanupEffectiveness: getCleanupEffectiveness(days),
    diskUsageTrend: getDiskUsageTrend(days),
    fileTypeStatistics: getFileTypeStatistics(days),
    errorStatistics: getErrorStatistics(days)
  }, null, 2);
}

/**
 * 生成CSV报告
 */
function generateCSVReport(days = 30) {
  const cleanupEffectiveness = getCleanupEffectiveness(days);
  
  let csv = '日期,清理次数,删除文件数,释放空间\n';
  
  const dailyData = {};
  for (const cleanup of statistics.cleanups) {
    const date = new Date(cleanup.timestamp).toISOString().split('T')[0];
    
    if (!dailyData[date]) {
      dailyData[date] = {
        cleanups: 0,
        files: 0,
        space: 0
      };
    }
    
    dailyData[date].cleanups += 1;
    dailyData[date].files += cleanup.filesDeleted;
    dailyData[date].space += cleanup.spaceFreed;
  }
  
  for (const date of Object.keys(dailyData).sort()) {
    const data = dailyData[date];
    csv += `${date},${data.cleanups},${data.files},${formatFileSize(data.space)}\n`;
  }
  
  return csv;
}

/**
 * 导出统计图表
 */
function generateChart(chartType, days = 30) {
  // 这里可以集成图表库，如cli-chart或asciichart
  // 简化版：返回ASCII图表
  const trend = getDiskUsageTrend(days);
  
  if (trend.length === 0) {
    return '暂无数据';
  }
  
  let chart = `清理效果趋势 (${days}天)\n`;
  chart += '='.repeat(50) + '\n';
  
  const maxSpace = Math.max(...trend.map(t => t.spaceFreed));
  const maxHeight = 15;
  
  for (let i = maxHeight; i >= 0; i--) {
    let line = '';
    for (const day of trend.slice(-15)) {
      const height = Math.round((day.spaceFreed / maxSpace) * maxHeight);
      if (height >= i) {
        line += '█';
      } else {
        line += ' ';
      }
    }
    chart += line + '\n';
  }
  
  // X轴标签
  let labels = '';
  for (const day of trend.slice(-15)) {
    labels += day.date.slice(5);
  }
  chart += labels + '\n';
  
  return chart;
}

/**
 * 获取所有统计数据
 */
function getAllStatistics() {
  return {
    scans: statistics.scans,
    cleanups: statistics.cleanups,
    errors: statistics.errors
  };
}

/**
 * 清空统计数据
 */
function clearStatistics() {
  statistics.scans = [];
  statistics.cleanups = [];
  statistics.errors = [];
  
  log('清空统计数据', 'INFO');
}

module.exports = {
  recordScan,
  recordCleanup,
  recordError,
  getDiskUsageTrend,
  getCleanupEffectiveness,
  getFileTypeStatistics,
  getErrorStatistics,
  generateTextReport,
  generateJSONReport,
  generateCSVReport,
  generateChart,
  getAllStatistics,
  clearStatistics
};