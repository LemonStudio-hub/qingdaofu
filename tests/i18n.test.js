/**
 * 多语言模块测试
 */

const { describe, it, expect, beforeEach } = require('vitest');
const {
  setLocale,
  getLocale,
  t,
  detectSystemLocale,
  init,
  getAvailableLocales,
  addLocale,
  LOCALES
} = require('../src/i18n');

describe('I18n Module', () => {
  beforeEach(() => {
    setLocale('zh-CN');
  });

  describe('setLocale and getLocale', () => {
    it('should set and get locale', () => {
      setLocale('en-US');
      expect(getLocale()).toBe('en-US');
    });

    it('should use default locale for invalid locale', () => {
      setLocale('invalid-locale');
      expect(getLocale()).toBe('zh-CN');
    });
  });

  describe('t', () => {
    it('should translate key', () => {
      setLocale('zh-CN');
      expect(t('appName')).toBe('清道夫');
    });

    it('should translate to English', () => {
      setLocale('en-US');
      expect(t('appName')).toBe('Qingdaofu');
    });

    it('should return key for non-existing translation', () => {
      const text = t('non.existing.key');
      expect(text).toBe('non.existing.key');
    });

    it('should replace parameters', () => {
      setLocale('zh-CN');
      expect(t('success')).toBe('成功');
    });
  });

  describe('detectSystemLocale', () => {
    it('should detect Chinese locale', () => {
      const originalLang = process.env.LANG;
      process.env.LANG = 'zh_CN.UTF-8';
      
      const locale = detectSystemLocale();
      expect(locale).toBe('zh-CN');
      
      process.env.LANG = originalLang;
    });

    it('should detect English locale', () => {
      const originalLang = process.env.LANG;
      process.env.LANG = 'en_US.UTF-8';
      
      const locale = detectSystemLocale();
      expect(locale).toBe('en-US');
      
      process.env.LANG = originalLang;
    });

    it('should fallback to Chinese for unknown locale', () => {
      const originalLang = process.env.LANG;
      process.env.LANG = 'fr_FR.UTF-8';
      
      const locale = detectSystemLocale();
      expect(locale).toBe('zh-CN');
      
      process.env.LANG = originalLang;
    });
  });

  describe('getAvailableLocales', () => {
    it('should return all available locales', () => {
      const locales = getAvailableLocales();
      expect(locales).toContain('zh-CN');
      expect(locales).toContain('en-US');
    });
  });

  describe('addLocale', () => {
    it('should add custom locale', () => {
      addLocale('test-Locale', {
        appName: 'Test App',
        success: 'Success'
      });
      
      setLocale('test-Locale');
      expect(t('appName')).toBe('Test App');
    });
  });

  describe('LOCALES', () => {
    it('should have zh-CN locale', () => {
      expect(LOCALES['zh-CN']).toBeDefined();
      expect(LOCALES['zh-CN'].appName).toBe('清道夫');
    });

    it('should have en-US locale', () => {
      expect(LOCALES['en-US']).toBeDefined();
      expect(LOCALES['en-US'].appName).toBe('Qingdaofu');
    });

    it('should have all required keys', () => {
      const keys = ['appName', 'success', 'error', 'warning', 'scanning'];
      for (const key of keys) {
        expect(LOCALES['zh-CN'][key]).toBeDefined();
        expect(LOCALES['en-US'][key]).toBeDefined();
      }
    });
  });

  describe('init', () => {
    it('should initialize with detected locale', () => {
      const originalLang = process.env.LANG;
      process.env.LANG = 'en_US.UTF-8';
      
      init();
      expect(getLocale()).toBe('en-US');
      
      process.env.LANG = originalLang;
    });
  });
});