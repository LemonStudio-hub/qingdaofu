/**
 * 配置模块测试
 */

const { describe, it, expect, beforeEach } = require('vitest');
const {
  DEFAULT_CONFIG,
  CONFIG_FILE,
  ERROR_CODES,
  getConfig,
  setConfig,
  resetConfig,
  validateConfig
} = require('../src/config');

describe('Config Module', () => {
  beforeEach(() => {
    resetConfig();
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have garbagePatterns array', () => {
      expect(Array.isArray(DEFAULT_CONFIG.garbagePatterns)).toBe(true);
      expect(DEFAULT_CONFIG.garbagePatterns.length).toBeGreaterThan(0);
    });

    it('should have cacheDirectories array', () => {
      expect(Array.isArray(DEFAULT_CONFIG.cacheDirectories)).toBe(true);
    });

    it('should have protectedDirectories array', () => {
      expect(Array.isArray(DEFAULT_CONFIG.protectedDirectories)).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('should return current config', () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('setConfig', () => {
    it('should set custom config', () => {
      setConfig({ scanPath: '/test/path' });
      const config = getConfig();
      expect(config.scanPath).toBe('/test/path');
    });

    it('should merge with default config', () => {
      setConfig({ minFileSize: 1024 });
      const config = getConfig();
      expect(config.minFileSize).toBe(1024);
      expect(config.garbagePatterns).toEqual(DEFAULT_CONFIG.garbagePatterns);
    });
  });

  describe('resetConfig', () => {
    it('should reset to default config', () => {
      setConfig({ scanPath: '/custom/path', minFileSize: 2048 });
      resetConfig();
      const config = getConfig();
      expect(config.minFileSize).toBe(DEFAULT_CONFIG.minFileSize);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = {
        garbagePatterns: [
          { pattern: /\.log$/, description: '日志文件' }
        ],
        backupRetentionDays: 7
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it('should detect invalid garbagePatterns', () => {
      const config = {
        garbagePatterns: 'not an array'
      };
      const errors = validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect missing pattern field', () => {
      const config = {
        garbagePatterns: [
          { description: '日志文件' }
        ]
      };
      const errors = validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid backupRetentionDays', () => {
      const config = {
        backupRetentionDays: -1
      };
      const errors = validateConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ERROR_CODES', () => {
    it('should have all error codes', () => {
      expect(ERROR_CODES.CONFIG_INVALID).toBe('CONFIG_INVALID');
      expect(ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      expect(ERROR_CODES.FILE_NOT_FOUND).toBe('FILE_NOT_FOUND');
    });
  });
});