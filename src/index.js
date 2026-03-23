#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// 垃圾文件配置
const GARBAGE_PATTERNS = [
  { pattern: /\.log$/, description: '日志文件' },
  { pattern: /\.tmp$/, description: '临时文件' },
  { pattern: /\.temp$/, description: '临时文件' },
  { pattern: /~$/, description: '编辑器备份文件' },
  { pattern: /\.swp$/, description: 'Vim交换文件' },
  { pattern: /\.DS_Store$/, description: 'macOS系统文件' },
  { pattern: /Thumbs\.db$/, description: 'Windows缩略图缓存' },
];

// 缓存目录
const CACHE_DIRECTORIES = [
  path.join(os.homedir(), '.cache'),
  path.join(os.homedir(), '.npm/_cacache'),
  path.join(os.homedir(), '.npm/_logs'),
  path.join(os.homedir(), '.npm/_npx'),
  path.join(os.homedir(), '.config/yarn/cache'),
  path.join(os.tmpdir()),
];

// 扫描垃圾文件
function scanGarbageFiles(basePath, options = {}) {
  const files = [];
  const maxDepth = options.maxDepth || 5;
  
  try {
    if (!fs.existsSync(basePath)) {
      return files;
    }

    const scanDir = (dir, depth) => {
      if (depth > maxDepth) return;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // 跳过符号链接
          if (entry.isSymbolicLink()) continue;
          
          if (entry.isDirectory()) {
            // 跳过系统关键目录
            if (isProtectedDirectory(fullPath)) continue;
            scanDir(fullPath, depth + 1);
          } else if (entry.isFile()) {
            if (isGarbageFile(entry.name)) {
              const stats = fs.statSync(fullPath);
              files.push({
                path: fullPath,
                name: entry.name,
                size: stats.size,
                type: getGarbageType(entry.name),
                modified: stats.mtime
              });
            }
          }
        }
      } catch (err) {
        // 忽略无权限访问的目录
      }
    };

    scanDir(basePath, 0);
  } catch (err) {
    console.error(`扫描目录错误: ${err.message}`);
  }

  return files;
}

// 检查是否为垃圾文件
function isGarbageFile(filename) {
  return GARBAGE_PATTERNS.some(({ pattern }) => pattern.test(filename));
}

// 获取垃圾文件类型
function getGarbageType(filename) {
  for (const { pattern, description } of GARBAGE_PATTERNS) {
    if (pattern.test(filename)) {
      return description;
    }
  }
  return '未知类型';
}

// 检查是否为受保护目录
function isProtectedDirectory(dirPath) {
  const protectedDirs = ['/system', '/data', '/proc', '/sys', '/dev', '/root'];
  return protectedDirs.some(protected => dirPath.startsWith(protected));
}

// 扫描缓存目录
function scanCacheDirectories() {
  const files = [];
  
  for (const cacheDir of CACHE_DIRECTORIES) {
    if (fs.existsSync(cacheDir)) {
      const cacheFiles = scanGarbageFiles(cacheDir, { maxDepth: 3 });
      files.push(...cacheFiles);
    }
  }

  return files;
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 显示垃圾文件列表
function displayGarbageFiles(files) {
  if (files.length === 0) {
    console.log('✓ 没有发现垃圾文件');
    return 0;
  }

  let totalSize = 0;
  console.log('\n发现以下垃圾文件:\n');
  console.log('类型'.padEnd(20) + '大小'.padEnd(12) + '路径');
  console.log('-'.repeat(80));

  // 按类型分组显示
  const groupedFiles = {};
  files.forEach(file => {
    if (!groupedFiles[file.type]) {
      groupedFiles[file.type] = [];
    }
    groupedFiles[file.type].push(file);
    totalSize += file.size;
  });

  for (const [type, typeFiles] of Object.entries(groupedFiles)) {
    const typeSize = typeFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n[${type}] ${typeFiles.length} 个文件, 总计: ${formatFileSize(typeSize)}`);
    
    typeFiles.forEach(file => {
      console.log(`  ${formatFileSize(file.size).padEnd(10)} ${file.path}`);
    });
  }

  console.log('\n' + '-'.repeat(80));
  console.log(`总计: ${files.length} 个文件, ${formatFileSize(totalSize)}`);
  
  return totalSize;
}

// 删除文件
function deleteFiles(files) {
  let deletedCount = 0;
  let freedSpace = 0;
  const errors = [];

  files.forEach(file => {
    try {
      fs.unlinkSync(file.path);
      deletedCount++;
      freedSpace += file.size;
    } catch (err) {
      errors.push(`${file.path}: ${err.message}`);
    }
  });

  return { deletedCount, freedSpace, errors };
}

// 主函数
function main() {
  console.log('清道夫 - Termux空间清理工具 v1.0.0');
  console.log('='.repeat(50));

  const args = process.argv.slice(2);
  const scanPath = args[0] || os.homedir();

  console.log(`\n扫描路径: ${scanPath}`);
  console.log('正在扫描垃圾文件...\n');

  // 扫描垃圾文件
  const garbageFiles = scanGarbageFiles(scanPath);
  
  // 扫描缓存目录
  const cacheFiles = scanCacheDirectories();
  
  // 合并结果并去重
  const allFiles = [...garbageFiles, ...cacheFiles];
  const uniqueFiles = Array.from(
    new Map(allFiles.map(f => [f.path, f])).values()
  );

  // 显示结果
  const totalSize = displayGarbageFiles(uniqueFiles);

  if (totalSize === 0) {
    console.log('\n系统很干净，无需清理！');
    process.exit(0);
  }

  // 询问用户确认
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n是否确认清理这些文件? (y/n): ', (answer) => {
    rl.close();

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n正在清理...');
      const result = deleteFiles(uniqueFiles);

      console.log(`\n✓ 清理完成！`);
      console.log(`  删除文件: ${result.deletedCount} 个`);
      console.log(`  释放空间: ${formatFileSize(result.freedSpace)}`);

      if (result.errors.length > 0) {
        console.log(`\n⚠ 部分文件删除失败:`);
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
    } else {
      console.log('\n已取消清理操作');
    }
  });
}

// 运行主函数
main();
