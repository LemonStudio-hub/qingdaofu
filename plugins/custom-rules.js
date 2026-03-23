/**
 * 自定义规则插件示例
 * 允许用户添加自定义的垃圾文件匹配规则
 */

const path = require('path');
const fs = require('fs').promises;

// 自定义规则配置文件
const RULES_FILE = path.join(require('os').homedir(), '.qingdaofu-custom-rules.json');

// 自定义规则
let customRules = [];

/**
 * 初始化插件
 */
async function init() {
  try {
    const rulesData = await fs.readFile(RULES_FILE, 'utf8');
    customRules = JSON.parse(rulesData);
  } catch {
    // 配置文件不存在，使用空规则
    customRules = [];
  }
}

/**
 * 清理插件
 */
async function cleanup() {
  customRules = [];
}

/**
 * 获取自定义规则
 */
function getCustomRules() {
  return customRules;
}

/**
 * 添加自定义规则
 */
async function addRule(rule) {
  if (!rule.pattern || !rule.description) {
    throw new Error('规则必须包含 pattern 和 description');
  }
  
  customRules.push(rule);
  await saveRules();
}

/**
 * 删除自定义规则
 */
async function removeRule(index) {
  if (index < 0 || index >= customRules.length) {
    throw new Error('规则索引超出范围');
  }
  
  customRules.splice(index, 1);
  await saveRules();
}

/**
 * 保存规则到文件
 */
async function saveRules() {
  await fs.writeFile(RULES_FILE, JSON.stringify(customRules, null, 2));
}

/**
 * 扫描前钩子
 */
async function beforeScan(data) {
  // 在扫描前可以做一些准备工作
  return { customRules: customRules.length };
}

/**
 * 扫描后钩子
 */
async function afterScan(data) {
  // 在扫描后可以处理扫描结果
  return { filesScanned: data.files.length };
}

module.exports = {
  name: 'custom-rules',
  version: '1.0.0',
  description: '自定义垃圾文件匹配规则',
  author: 'Qingdaofu',
  
  hooks: {
    beforeScan,
    afterScan
  },
  
  methods: {
    init,
    cleanup,
    getCustomRules,
    addRule,
    removeRule
  }
};