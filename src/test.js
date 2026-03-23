#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('清道夫 - 测试脚本');
console.log('='.repeat(40));

// 创建测试垃圾文件
function createTestFiles() {
  const testDir = path.join(__dirname, 'test-files');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFiles = [
    'test.log',
    'temp.tmp',
    'backup~',
    'session.swp',
    'cache.temp'
  ];

  testFiles.forEach(filename => {
    const filePath = path.join(testDir, filename);
    const content = '这是测试垃圾文件内容'.repeat(100);
    fs.writeFileSync(filePath, content);
    console.log(`✓ 创建测试文件: ${filename}`);
  });

  console.log('\n测试文件已创建在: ' + testDir);
  console.log('运行清理命令进行测试:');
  console.log('  node src/index.js ' + testDir);
}

// 清理测试文件
function cleanTestFiles() {
  const testDir = path.join(__dirname, 'test-files');
  
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('✓ 测试文件已清理');
  } else {
    console.log('✓ 没有测试文件需要清理');
  }
}

// 运行测试
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create') {
  createTestFiles();
} else if (command === 'clean') {
  cleanTestFiles();
} else {
  console.log('\n使用方法:');
  console.log('  node src/test.js create  - 创建测试垃圾文件');
  console.log('  node src/test.js clean   - 清理测试文件');
  console.log('\n测试流程:');
  console.log('  1. node src/test.js create');
  console.log('  2. node src/index.js src/test-files');
  console.log('  3. node src/test.js clean');
}
