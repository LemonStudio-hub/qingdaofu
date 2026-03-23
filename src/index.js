#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { createInterface } = require('readline');

// 导入模块
const {
  getConfig,
  setConfig,
  resetConfig,
  validateConfig,
  CONFIG_FILE,
  ERROR_CODES,
  ERROR_SOLUTIONS
} = require('./config');

const { setVerbose, log } = require('./logger');

const { formatFileSize } = require('./file-utils');

const {
  setProgressBar,
  resetCounters,
  getCounters,
  scanGarbageFiles,
  scanCacheDirectories
} = require('./scanner');

const {
  createBackup,
  cleanupOldBackups,
  getBackupInfo,
  restoreFromBackup
} = require('./backup');

const { recordHistory, showHistory } = require('./history');

const {
  EnhancedProgressBar,
  displayGarbageFiles,
  showHelp,
  showError,
  showSuccess,
  showWarning
} = require('./ui');

// 主函数
async function main() {
  const startTime = Date.now();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  // 显示帮助
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // 设置配置
  let scanPath = args[0] || os.homedir();
  let dryRun = args.includes('--dry-run') || args.includes('-d');
  let verbose = args.includes('--verbose') || args.includes('-v');
  let backupEnabled = !args.includes('--no-backup');
  let interactive = args.includes('--interactive');
  
  // 设置详细输出
  setVerbose(verbose);
  
  // 解析过滤器参数
  const minSizeIndex = args.indexOf('--min-size');
  if (minSizeIndex !== -1 && args[minSizeIndex + 1]) {
    const size = args[minSizeIndex + 1];
    const match = size.match(/^(\d+)(B|KB|MB|GB)?$/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = (match[2] || 'B').toUpperCase();
      const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      setConfig({ minFileSize: value * units[unit] });
    }
  }

  const maxSizeIndex = args.indexOf('--max-size');
  if (maxSizeIndex !== -1 && args[maxSizeIndex + 1]) {
    const size = args[maxSizeIndex + 1];
    const match = size.match(/^(\d+)(B|KB|MB|GB)?$/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = (match[2] || 'B').toUpperCase();
      const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
      setConfig({ maxFileSize: value * units[unit] });
    }
  }

  const olderThanIndex = args.indexOf('--older-than');
  if (olderThanIndex !== -1 && args[olderThanIndex + 1]) {
    const days = parseInt(args[olderThanIndex + 1]);
    if (!isNaN(days)) {
      setConfig({ olderThanDays: days });
    }
  }

  // 加载配置文件（如果指定了验证参数，则进行验证）
  const validateConfigFlag = args.includes('--validate-config');
  if (validateConfigFlag) {
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf8');
      const userConfig = JSON.parse(configData);
      const errors = validateConfig(userConfig);
      
      if (errors.length > 0) {
        console.log('❌ 配置文件验证失败:');
        errors.forEach(err => console.log(`  - ${err}`));
        process.exit(1);
      }
      
      console.log('✓ 配置文件验证通过');
      console.log(`配置文件路径: ${CONFIG_FILE}`);
      process.exit(0);
    } catch (err) {
      console.log(`❌ 配置文件验证失败: ${err.message}`);
      process.exit(1);
    }
  }
  
  // 尝试加载配置文件
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf8');
    const userConfig = JSON.parse(configData);
    const errors = validateConfig(userConfig);
    
    if (errors.length > 0) {
      showWarning('配置文件存在错误，使用默认配置');
      errors.forEach(err => log(`配置错误: ${err}`, 'WARN'));
    } else {
      setConfig(userConfig);
    }
  } catch (err) {
    // 配置文件不存在或读取失败，使用默认配置
  }

  // 清理备份
  if (args.includes('--cleanup-backups')) {
    console.log('清道夫 - Termux空间清理工具 v2.1.0');
    console.log('='.repeat(50));
    console.log('\n正在清理过期备份...\n');
    
    const result = await cleanupOldBackups();
    
    console.log(`\n✓ 清理完成！`);
    console.log(`  清理备份: ${result.cleanedCount} 个`);
    console.log(`  释放空间: ${formatFileSize(result.freedSpace)}`);
    process.exit(0);
  }

  // 恢复文件
  if (args.includes('--restore')) {
    const restoreIndex = args.indexOf('--restore');
    const backupName = args[restoreIndex + 1];
    
    if (!backupName) {
      // 显示备份列表
      console.log('清道夫 - Termux空间清理工具 v2.1.0');
      console.log('='.repeat(50));
      console.log('\n备份列表:\n');
      
      const backupInfo = await getBackupInfo();
      
      if (backupInfo.count === 0) {
        console.log('暂无备份');
      } else {
        backupInfo.backups.forEach((backup, index) => {
          const date = new Date(backup.createdAt).toLocaleString('zh-CN');
          console.log(`${index + 1}. ${backup.name}`);
          console.log(`   创建时间: ${date}`);
          console.log(`   文件数: ${backup.files}`);
          console.log(`   大小: ${formatFileSize(backup.size)}\n`);
        });
        
        console.log(`总计: ${backupInfo.count} 个备份, ${formatFileSize(backupInfo.totalSize)}`);
        console.log('\n使用 --restore <备份名称> 恢复文件');
      }
    } else {
      // 恢复文件
      console.log('清道夫 - Termux空间清理工具 v2.1.0');
      console.log('='.repeat(50));
      console.log(`\n正在从备份恢复: ${backupName}\n`);
      
      const result = await restoreFromBackup(backupName);
      
      if (result.success) {
        console.log(`\n✓ 恢复完成！`);
        console.log(`  恢复文件: ${result.restoredFiles.length} 个`);
        
        if (result.errors.length > 0) {
          console.log(`\n⚠ 部分文件恢复失败 (${result.errors.length} 个):`);
          result.errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
          if (result.errors.length > 5) {
            console.log(`  ... 还有 ${result.errors.length - 5} 个错误`);
          }
        }
      } else {
        console.log(`\n❌ 恢复失败: ${result.error}`);
      }
    }
    
    process.exit(0);
  }

  // 显示历史
  if (args.includes('--history')) {
    const historyIndex = args.indexOf('--history');
    const limit = parseInt(args[historyIndex + 1]) || 10;
    
    await showHistory(limit);
    process.exit(0);
  }

  // 应用配置
  setConfig({ scanPath, dryRun, backupEnabled });

  console.log('清道夫 - Termux空间清理工具 v2.1.0');
  console.log('='.repeat(50));
  const config = getConfig();
  console.log(`扫描路径: ${config.scanPath}`);
  console.log(`备份: ${config.backupEnabled ? '启用' : '禁用'}`);
  console.log(`预览模式: ${config.dryRun ? '是' : '否'}`);
  console.log(`交互模式: ${interactive ? '是' : '否'}`);
  
  if (config.minFileSize > 0) {
    console.log(`最小文件大小: ${formatFileSize(config.minFileSize)}`);
  }
  if (config.maxFileSize < Infinity) {
    console.log(`最大文件大小: ${formatFileSize(config.maxFileSize)}`);
  }
  if (config.olderThanDays > 0) {
    console.log(`文件时间: ${config.olderThanDays} 天前`);
  }

  console.log('\n正在扫描垃圾文件...\n');

  // 重置计数器
  resetCounters();

  // 创建进度条
  const progressBar = new EnhancedProgressBar(10000);
  setProgressBar(progressBar);

  // 扫描垃圾文件
  const garbageFiles = await scanGarbageFiles(config.scanPath);
  
  // 扫描缓存目录
  const cacheFiles = await scanCacheDirectories();
  
  // 停止进度条
  progressBar.stop();
  
  // 获取计数器
  const { scannedCount, foundCount } = getCounters();
  console.log(`扫描完成: ${scannedCount} 个文件, 发现 ${foundCount} 个垃圾文件\n`);

  // 合并结果并去重
  const allFiles = [...garbageFiles, ...cacheFiles];
  const uniqueFiles = Array.from(
    new Map(allFiles.map(f => [f.path, f])).values()
  );

  // 交互模式：选择文件类型
  if (interactive && uniqueFiles.length > 0) {
    console.log('\n交互模式：选择要清理的文件类型');
    console.log('='.repeat(50));

    // 按类型分组
    const groupedFiles = {};
    uniqueFiles.forEach(file => {
      if (!groupedFiles[file.type]) {
        groupedFiles[file.type] = [];
      }
      groupedFiles[file.type].push(file);
    });

    const types = Object.keys(groupedFiles);
    console.log('\n可清理的文件类型:');
    types.forEach((type, index) => {
      const size = groupedFiles[type].reduce((sum, f) => sum + f.size, 0);
      console.log(`  ${index + 1}. ${type} - ${groupedFiles[type].length} 个文件, ${formatFileSize(size)}`);
    });

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const selectedTypes = [];
    const typeIndices = await new Promise(resolve => {
      rl.question('\n请输入要清理的类型编号（多个编号用空格分隔，例如: 1 3 5，或输入 all 清理所有）: ', resolve);
    });
    rl.close();

    if (typeIndices.toLowerCase() === 'all') {
      selectedTypes.push(...types);
    } else {
      const indices = typeIndices.split(/\s+/).map(i => parseInt(i.trim()) - 1);
      indices.forEach(i => {
        if (i >= 0 && i < types.length) {
          selectedTypes.push(types[i]);
        }
      });
    }

    if (selectedTypes.length === 0) {
      console.log('\n未选择任何类型，取消清理');
      process.exit(0);
    }

    // 过滤选中的类型
    const filteredFiles = uniqueFiles.filter(f => selectedTypes.includes(f.type));
    console.log(`\n已选择 ${filteredFiles.length} 个文件进行清理\n`);
    
    // 显示选中的文件
    const totalSize = displayGarbageFiles(filteredFiles);
    
    // 更新要清理的文件列表
    uniqueFiles.length = 0;
    uniqueFiles.push(...filteredFiles);
  } else {
    // 显示结果
    const totalSize = displayGarbageFiles(uniqueFiles);
  }

  if (uniqueFiles.length === 0) {
    console.log('\n系统很干净，无需清理！');
    await log('扫描完成: 未发现垃圾文件');
    process.exit(0);
  }

  // 预览模式不询问
  if (config.dryRun) {
    console.log('\n[预览模式] 文件未被删除');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`扫描耗时: ${elapsed} 秒`);
    const totalSize = uniqueFiles.reduce((sum, f) => sum + f.size, 0);
    await log(`预览完成: ${uniqueFiles.length} 个文件, ${formatFileSize(totalSize)}`);
    process.exit(0);
  }

  // 询问用户确认
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise(resolve => {
    rl.question('\n是否确认清理这些文件? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n正在清理...');
    
    // 创建备份
    const backedUpFiles = await createBackup(uniqueFiles);

    // 删除文件
    let deletedCount = 0;
    let freedSpace = 0;
    const errors = [];

    for (const file of uniqueFiles) {
      try {
        if (!config.dryRun) {
          await fs.unlink(file.path);
        }
        deletedCount++;
        freedSpace += file.size;
        await log(`删除文件: ${file.path} (${formatFileSize(file.size)})`, 'INFO');
      } catch (err) {
        const errorMsg = `${file.path}: ${err.message}`;
        errors.push(errorMsg);
        await log(`删除失败: ${errorMsg}`, 'ERROR');
      }
    }

    console.log(`\n✓ 清理完成！`);
    console.log(`  删除文件: ${deletedCount} 个`);
    console.log(`  释放空间: ${formatFileSize(freedSpace)}`);
    
    if (config.backupEnabled) {
      console.log(`  备份文件: ${backedUpFiles.length} 个`);
    }

    if (errors.length > 0) {
      console.log(`\n⚠ 部分文件删除失败 (${errors.length} 个):`);
      errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      if (errors.length > 5) {
        console.log(`  ... 还有 ${errors.length - 5} 个错误`);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n总耗时: ${elapsed} 秒`);
    
    await log(`清理完成: 删除 ${deletedCount} 个文件, 释放 ${formatFileSize(freedSpace)}`);
    
    // 记录历史
    await recordHistory({
      scanPath: config.scanPath,
      deletedCount: deletedCount,
      freedSpace: freedSpace,
      backedUpCount: backedUpFiles.length,
      errors: errors
    });
  } else {
    console.log('\n已取消清理操作');
    await log('用户取消清理操作');
  }
}

// 运行主函数
main().catch(err => {
  console.error(`\n❌ 程序运行出错: ${err.message}`);
  
  if (err.code && ERROR_SOLUTIONS[err.code]) {
    console.log(`解决方案: ${ERROR_SOLUTIONS[err.code]}`);
  }
  
  log(`程序错误: ${err.message}`, 'ERROR');
  process.exit(1);
});