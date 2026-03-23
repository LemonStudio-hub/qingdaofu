/**
 * 规则引擎模块测试
 */

const { describe, it, expect, beforeEach } = require('vitest');
const {
  RULE_TYPES,
  OPERATORS,
  createRule,
  createRuleGroup,
  addRuleGroup,
  removeRuleGroup,
  getRuleGroups,
  evaluateFile,
  loadRuleTemplate
} = require('../src/rules');

describe('Rules Engine Module', () => {
  beforeEach(() => {
    // 清空规则组
    const groups = getRuleGroups();
    for (const group of groups) {
      removeRuleGroup(group.id);
    }
  });

  describe('RULE_TYPES', () => {
    it('should have all rule types', () => {
      expect(RULE_TYPES.PATTERN).toBe('pattern');
      expect(RULE_TYPES.SIZE).toBe('size');
      expect(RULE_TYPES.AGE).toBe('age');
      expect(RULE_TYPES.EXTENSION).toBe('extension');
      expect(RULE_TYPES.CUSTOM).toBe('custom');
    });
  });

  describe('OPERATORS', () => {
    it('should have all operators', () => {
      expect(OPERATORS.EQUAL).toBe('==');
      expect(OPERATORS.GREATER_THAN).toBe('>');
      expect(OPERATORS.MATCHES).toBe('matches');
      expect(OPERATORS.CONTAINS).toBe('contains');
    });
  });

  describe('createRule', () => {
    it('should create a rule with default values', () => {
      const rule = createRule({});
      expect(rule).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.priority).toBe(0);
    });

    it('should create a rule with custom values', () => {
      const rule = createRule({
        name: '测试规则',
        type: RULE_TYPES.PATTERN,
        priority: 10
      });
      expect(rule.name).toBe('测试规则');
      expect(rule.type).toBe(RULE_TYPES.PATTERN);
      expect(rule.priority).toBe(10);
    });

    it('should generate unique ID', () => {
      const rule1 = createRule({});
      const rule2 = createRule({});
      expect(rule1.id).not.toBe(rule2.id);
    });
  });

  describe('createRuleGroup', () => {
    it('should create a rule group', () => {
      const group = createRuleGroup('测试组', []);
      expect(group).toBeDefined();
      expect(group.name).toBe('测试组');
      expect(group.enabled).toBe(true);
    });
  });

  describe('addRuleGroup and getRuleGroups', () => {
    it('should add and retrieve rule groups', () => {
      const group = createRuleGroup('测试组', []);
      addRuleGroup(group);
      
      const groups = getRuleGroups();
      expect(groups.length).toBe(1);
      expect(groups[0].name).toBe('测试组');
    });
  });

  describe('removeRuleGroup', () => {
    it('should remove rule group', () => {
      const group = createRuleGroup('测试组', []);
      addRuleGroup(group);
      
      const removed = removeRuleGroup(group.id);
      expect(removed).toBe(true);
      
      const groups = getRuleGroups();
      expect(groups.length).toBe(0);
    });

    it('should return false for non-existing group', () => {
      const removed = removeRuleGroup('non-existing-id');
      expect(removed).toBe(false);
    });
  });

  describe('evaluateFile with PATTERN rule', () => {
    it('should match pattern rule', () => {
      const rule = createRule({
        name: '日志文件',
        type: RULE_TYPES.PATTERN,
        condition: { pattern: '\\.log$', operator: OPERATORS.MATCHES }
      });
      
      const fileInfo = {
        name: 'test.log',
        size: 1024,
        mtime: new Date()
      };
      
      const result = evaluateRule(rule, fileInfo);
      expect(result).toBe(true);
    });

    it('should not match pattern rule', () => {
      const rule = createRule({
        name: '日志文件',
        type: RULE_TYPES.PATTERN,
        condition: { pattern: '\\.log$', operator: OPERATORS.MATCHES }
      });
      
      const fileInfo = {
        name: 'test.txt',
        size: 1024,
        mtime: new Date()
      };
      
      const result = evaluateRule(rule, fileInfo);
      expect(result).toBe(false);
    });
  });

  describe('evaluateFile with SIZE rule', () => {
    it('should match size rule', () => {
      const rule = createRule({
        name: '大文件',
        type: RULE_TYPES.SIZE,
        condition: { operator: OPERATORS.GREATER_THAN, value: 1024 }
      });
      
      const fileInfo = {
        name: 'test.txt',
        size: 2048,
        mtime: new Date()
      };
      
      const result = evaluateRule(rule, fileInfo);
      expect(result).toBe(true);
    });
  });

  describe('loadRuleTemplate', () => {
    it('should load log files template', () => {
      const rule = loadRuleTemplate('log-files');
      expect(rule).toBeDefined();
      expect(rule.name).toBe('日志文件');
      expect(rule.type).toBe(RULE_TYPES.PATTERN);
    });

    it('should return undefined for non-existing template', () => {
      const rule = loadRuleTemplate('non-existing');
      expect(rule).toBeUndefined();
    });
  });
});
