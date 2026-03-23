/**
 * 彩色输出模块测试
 */

const { describe, it, expect, beforeEach } = require('vitest');
const {
  COLORS,
  setTheme,
  getTheme,
  colorize,
  success,
  error,
  warning,
  info,
  progressbar,
  formatFileSize
} = require('../src/colors');

describe('Colors Module', () => {
  beforeEach(() => {
    setTheme('default');
  });

  describe('COLORS', () => {
    it('should have all color codes', () => {
      expect(COLORS.red).toBeDefined();
      expect(COLORS.green).toBeDefined();
      expect(COLORS.yellow).toBeDefined();
      expect(COLORS.blue).toBeDefined();
      expect(COLORS.bold).toBeDefined();
    });

    it('should have reset code', () => {
      expect(COLORS.reset).toBe('\x1b[0m');
    });
  });

  describe('setTheme and getTheme', () => {
    it('should set and get theme', () => {
      setTheme('dark');
      const theme = getTheme();
      expect(theme).toBeDefined();
      expect(theme.success).toBe('brightGreen');
    });

    it('should use default theme for invalid theme', () => {
      setTheme('invalid-theme');
      const theme = getTheme();
      expect(theme).toBeDefined();
    });
  });

  describe('colorize', () => {
    it('should apply color to text', () => {
      const colored = colorize('test', 'red');
      expect(colored).toContain(COLORS.red);
      expect(colored).toContain('test');
      expect(colored).toContain(COLORS.reset);
    });

    it('should return plain text for invalid color', () => {
      const colored = colorize('test', 'invalid-color');
      expect(colored).toBe('test');
    });

    it('should return plain text for null color', () => {
      const colored = colorize('test', null);
      expect(colored).toBe('test');
    });
  });

  describe('success', () => {
    it('should colorize with success color', () => {
      const text = success('操作成功');
      expect(text).toContain('操作成功');
    });
  });

  describe('error', () => {
    it('should colorize with error color', () => {
      const text = error('操作失败');
      expect(text).toContain('操作失败');
    });
  });

  describe('warning', () => {
    it('should colorize with warning color', () => {
      const text = warning('警告信息');
      expect(text).toContain('警告信息');
    });
  });

  describe('info', () => {
    it('should colorize with info color', () => {
      const text = info('提示信息');
      expect(text).toContain('提示信息');
    });
  });

  describe('progressbar', () => {
    it('should create progress bar', () => {
      const bar = progressbar(50);
      expect(bar).toBeDefined();
      expect(bar).toContain('50%');
    });

    it('should use custom width', () => {
      const bar = progressbar(50, { width: 20 });
      const bars = bar.split('█').length - 1;
      expect(bars).toBeLessThanOrEqual(20);
    });

    it('should not show percent when disabled', () => {
      const bar = progressbar(50, { showPercent: false });
      expect(bar).not.toContain('%');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
    });

    it('should format large files', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });
  });
});