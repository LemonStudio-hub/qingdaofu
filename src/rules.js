const { log } = require('./logger');

// 规则类型
const RULE_TYPES = {
  PATTERN: 'pattern',      // 正则表达式匹配
  SIZE: 'size',            // 文件大小
  AGE: 'age',              // 文件年龄
  EXTENSION: 'extension',  // 文件扩展名
  CUSTOM: 'custom'         // 自定义函数
};

// 规则比较操作符
const OPERATORS = {
  EQUAL: '==',
  NOT_EQUAL: '!=',
  GREATER_THAN: '>',
  LESS_THAN: '<',
  GREATER_EQUAL: '>=',
  LESS_EQUAL: '<=',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  MATCHES: 'matches',
  NOT_MATCHES: 'not_matches'
};

// 规则组
const ruleGroups = new Map();

/**
 * 创建规则
 */
function createRule(options) {
  return {
    id: options.id || generateId(),
    name: options.name || '未命名规则',
    type: options.type || RULE_TYPES.PATTERN,
    enabled: options.enabled !== false,
    priority: options.priority || 0,
    condition: options.condition || {},
    action: options.action || 'delete',
    description: options.description || ''
  };
}

/**
 * 创建规则组
 */
function createRuleGroup(name, rules = []) {
  return {
    id: generateId(),
    name: name,
    rules: rules,
    enabled: true,
    description: ''
  };
}

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 添加规则组
 */
function addRuleGroup(group) {
  ruleGroups.set(group.id, group);
  log(`添加规则组: ${group.name}`, 'INFO');
}

/**
 * 删除规则组
 */
function removeRuleGroup(groupId) {
  const deleted = ruleGroups.delete(groupId);
  if (deleted) {
    log(`删除规则组: ${groupId}`, 'INFO');
  }
  return deleted;
}

/**
 * 获取所有规则组
 */
function getRuleGroups() {
  return Array.from(ruleGroups.values());
}

/**
 * 获取启用的规则
 */
function getEnabledRules() {
  const enabledRules = [];
  
  for (const group of ruleGroups.values()) {
    if (group.enabled) {
      for (const rule of group.rules) {
        if (rule.enabled) {
          enabledRules.push({ rule, group });
        }
      }
    }
  }
  
  // 按优先级排序
  return enabledRules.sort((a, b) => b.rule.priority - a.rule.priority);
}

/**
 * 评估文件是否匹配规则
 */
function evaluateFile(fileInfo) {
  const results = [];
  const enabledRules = getEnabledRules();
  
  for (const { rule, group } of enabledRules) {
    const matches = evaluateRule(rule, fileInfo);
    
    if (matches) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        groupName: group.name,
        priority: rule.priority,
        action: rule.action
      });
    }
  }
  
  // 返回优先级最高的匹配规则
  if (results.length > 0) {
    results.sort((a, b) => b.priority - a.priority);
    return results[0];
  }
  
  return null;
}

/**
 * 评估单个规则
 */
function evaluateRule(rule, fileInfo) {
  const condition = rule.condition;
  
  switch (rule.type) {
    case RULE_TYPES.PATTERN:
      return evaluatePatternRule(condition, fileInfo);
      
    case RULE_TYPES.SIZE:
      return evaluateSizeRule(condition, fileInfo);
      
    case RULE_TYPES.AGE:
      return evaluateAgeRule(condition, fileInfo);
      
    case RULE_TYPES.EXTENSION:
      return evaluateExtensionRule(condition, fileInfo);
      
    case RULE_TYPES.CUSTOM:
      return evaluateCustomRule(condition, fileInfo);
      
    default:
      return false;
  }
}

/**
 * 评估正则表达式规则
 */
function evaluatePatternRule(condition, fileInfo) {
  const { pattern, operator = OPERATORS.MATCHES, value } = condition;
  
  if (operator === OPERATORS.MATCHES) {
    return new RegExp(pattern).test(fileInfo.name);
  } else if (operator === OPERATORS.NOT_MATCHES) {
    return !new RegExp(pattern).test(fileInfo.name);
  }
  
  return false;
}

/**
 * 评估大小规则
 */
function evaluateSizeRule(condition, fileInfo) {
  const { operator, value } = condition;
  const size = fileInfo.size;
  
  switch (operator) {
    case OPERATORS.EQUAL:
      return size === value;
    case OPERATORS.NOT_EQUAL:
      return size !== value;
    case OPERATORS.GREATER_THAN:
      return size > value;
    case OPERATORS.LESS_THAN:
      return size < value;
    case OPERATORS.GREATER_EQUAL:
      return size >= value;
    case OPERATORS.LESS_EQUAL:
      return size <= value;
    default:
      return false;
  }
}

/**
 * 评估年龄规则
 */
function evaluateAgeRule(condition, fileInfo) {
  const { operator, value } = condition;
  const age = Date.now() - fileInfo.mtime.getTime();
  
  switch (operator) {
    case OPERATORS.GREATER_THAN:
      return age > value;
    case OPERATORS.LESS_THAN:
      return age < value;
    case OPERATORS.GREATER_EQUAL:
      return age >= value;
    case OPERATORS.LESS_EQUAL:
      return age <= value;
    default:
      return false;
  }
}

/**
 * 评估扩展名规则
 */
function evaluateExtensionRule(condition, fileInfo) {
  const { operator, value } = condition;
  const ext = fileInfo.name.split('.').pop().toLowerCase();
  
  switch (operator) {
    case OPERATORS.EQUAL:
      return ext === value.toLowerCase();
    case OPERATORS.NOT_EQUAL:
      return ext !== value.toLowerCase();
    case OPERATORS.CONTAINS:
      return ext.includes(value.toLowerCase());
    case OPERATORS.NOT_CONTAINS:
      return !ext.includes(value.toLowerCase());
    default:
      return false;
  }
}

/**
 * 评估自定义规则
 */
function evaluateCustomRule(condition, fileInfo) {
  if (typeof condition.function === 'function') {
    try {
      return condition.function(fileInfo);
    } catch (err) {
      log(`自定义规则执行失败: ${err.message}`, 'ERROR');
      return false;
    }
  }
  
  return false;
}

/**
 * 加载规则模板
 */
function loadRuleTemplate(templateName) {
  const templates = {
    // 日志文件模板
    'log-files': createRule({
      name: '日志文件',
      type: RULE_TYPES.PATTERN,
      condition: { pattern: '\\.log$', operator: OPERATORS.MATCHES },
      description: '匹配所有.log文件'
    }),
    
    // 临时文件模板
    'temp-files': createRule({
      name: '临时文件',
      type: RULE_TYPES.PATTERN,
      condition: { pattern: '\\.(tmp|temp)$', operator: OPERATORS.MATCHES },
      description: '匹配所有.tmp和.temp文件'
    }),
    
    // 大文件模板
    'large-files': createRule({
      name: '大文件',
      type: RULE_TYPES.SIZE,
      priority: 10,
      condition: { operator: OPERATORS.GREATER_THAN, value: 100 * 1024 * 1024 }, // 100MB
      description: '匹配大于100MB的文件'
    }),
    
    // 旧文件模板
    'old-files': createRule({
      name: '旧文件',
      type: RULE_TYPES.AGE,
      priority: 5,
      condition: { operator: OPERATORS.GREATER_THAN, value: 30 * 24 * 60 * 60 * 1000 }, // 30天
      description: '匹配30天前的文件'
    })
  };
  
  return templates[templateName];
}

/**
 * 导出规则配置
 */
function exportRules() {
  const groups = Array.from(ruleGroups.values());
  return JSON.stringify(groups, null, 2);
}

/**
 * 导入规则配置
 */
function importRules(config) {
  try {
    const groups = JSON.parse(config);
    ruleGroups.clear();
    
    for (const group of groups) {
      ruleGroups.set(group.id, group);
    }
    
    log(`导入规则配置: ${groups.length} 个规则组`, 'INFO');
    return true;
  } catch (err) {
    log(`导入规则配置失败: ${err.message}`, 'ERROR');
    return false;
  }
}

module.exports = {
  RULE_TYPES,
  OPERATORS,
  createRule,
  createRuleGroup,
  addRuleGroup,
  removeRuleGroup,
  getRuleGroups,
  getEnabledRules,
  evaluateFile,
  evaluateRule,
  loadRuleTemplate,
  exportRules,
  importRules
};