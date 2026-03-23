const path = require('path');
const { formatFileSize } = require('./file-utils');

// 增强的进度条类
class EnhancedProgressBar {
  constructor(total) {
    this.total = total;
    this.current = 0;
    this.startTime = Date.now();
    this.lastUpdate = 0;
    this.updateInterval = 500; // 每500ms更新一次
  }

  update(current) {
    this.current = current;
    const now = Date.now();
    
    // 减少更新频率
    if (now - this.lastUpdate < this.updateInterval && current < this.total) {
      return;
    }
    
    this.lastUpdate = now;
    
    const percentage = Math.min((current / this.total) * 100, 100).toFixed(1);
    const elapsed = ((now - this.startTime) / 1000).toFixed(1);
    
    // 计算预估剩余时间
    let remaining = '';
    if (current > 0) {
      const rate = current / (now - this.startTime); // 文件/毫秒
      const remainingFiles = this.total - current;
      const remainingMs = remainingFiles / rate;
      const remainingSeconds = Math.floor(remainingMs / 1000);
      remaining = `[剩余: ${this.formatTime(remainingSeconds)}]`;
    }
    
    process.stdout.write(`\r扫描进度: ${percentage}% (${current}/${this.total} 文件) [用时: ${elapsed}s] ${remaining}`);
  }

  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}分${secs}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}小时${minutes}分`;
    }
  }

  stop() {
    process.stdout.write('\n');
  }
}

// 显示垃圾文件列表
function displayGarbageFiles(files) {
  if (files.length === 0) {
    console.log('\n✓ 没有发现垃圾文件');
    return 0;
  }

  console.log('\n发现以下垃圾文件:');
  console.log('\n类型                  大小          路径');
  console.log('-'.repeat(80));

  // 按类型分组
  const groupedFiles = {};
  let totalSize = 0;

  files.forEach(file => {
    if (!groupedFiles[file.type]) {
      groupedFiles[file.type] = [];
    }
    groupedFiles[file.type].push(file);
    totalSize += file.size;
  });

  // 显示每种类型
  for (const [type, typeFiles] of Object.entries(groupedFiles)) {
    const typeSize = typeFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n[${type}] ${typeFiles.length} 个文件, 总计: ${formatFileSize(typeSize)}`);
    
    // 只显示前10个文件
    typeFiles.slice(0, 10).forEach(file => {
      console.log(`  ${formatFileSize(file.size).padEnd(10)} ${file.path}`);
    });
    
    if (typeFiles.length > 10) {
      console.log(`  ... 还有 ${typeFiles.length - 10} 个文件`);
    }
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`总计: ${files.length} 个文件, ${formatFileSize(totalSize)}`);
  
  return totalSize;
}

// 显示帮助信息
function showHelp() {
  console.log(`
清道夫 - Termux空间清理工具 v2.1.0

用法:
  node index.js [路径] [选项]

选项:
  --dry-run, -d           预览模式，只扫描不删除
  --verbose, -v           显示详细输出
  --no-backup             禁用备份功能
  --min-size SIZE         最小文件大小 (例如: 1KB, 10MB)
  --max-size SIZE         最大文件大小 (例如: 100MB, 1GB)
  --older-than DAYS       只清理N天前的文件
  --validate-config       验证配置文件格式
  --cleanup-backups       清理过期备份
  --restore [NAME]        恢复文件（不带参数显示备份列表）
  --history [N]           查看历史记录（显示最近N条，默认10条）
  --interactive           交互模式，选择文件类型
  --help, -h              显示此帮助信息

示例:
  node index.js ~/Downloads
  node index.js /tmp --dry-run
  node index.js ~ --min-size 1MB --older-than 7
  node index.js --cleanup-backups
  node index.js --restore
  node index.js --history 20

配置文件:
  ~/.qingdaofu.json        用户配置文件
  ~/.qingdaofu.log         日志文件
  ~/.qingdaofu-history.json 历史记录
  ~/.qingdaofu-backup/     备份目录

更多信息:
  https://github.com/LemonStudio-hub/qingdaofu
`);
}

// 显示错误提示
function showError(errorCode, errorMessage) {
  console.error(`\n❌ 错误: [${errorCode}] ${errorMessage}`);
}

// 显示成功提示
function showSuccess(message) {
  console.log(`\n✓ ${message}`);
}

// 显示警告提示
function showWarning(message) {
  console.log(`\n⚠ ${message}`);
}

module.exports = {
  EnhancedProgressBar,
  displayGarbageFiles,
  showHelp,
  showError,
  showSuccess,
  showWarning
};