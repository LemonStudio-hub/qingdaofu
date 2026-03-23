/**
 * 文件工具模块测试
 */

const { describe, it, expect } = require('vitest');
const {
  fileExists,
  normalizePath,
  formatFileSize,
  getDirectorySize,
  countFilesInDirectory
} = require('../src/file-utils');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('File Utils Module', () => {
  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const exists = await fileExists(__filename);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await fileExists('/non/existing/file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('should normalize path', () => {
      const normalized = normalizePath('/test/../test/./file.txt');
      expect(normalized).toContain('file.txt');
    });

    it('should resolve relative path', () => {
      const normalized = normalizePath('file.txt');
      expect(path.isAbsolute(normalized)).toBe(true);
    });

    it('should handle parent directory references', () => {
      const normalized = normalizePath('/system/../../etc/passwd');
      expect(normalized).not.toContain('..');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should format large files', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('should format exact values', () => {
      expect(formatFileSize(512)).toBe('512.00 B');
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });
  });

  describe('getDirectorySize', () => {
    it('should calculate directory size', async () => {
      const tempDir = path.join(os.tmpdir(), 'qingdaofu-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });
      
      await fs.writeFile(path.join(tempDir, 'test.txt'), 'hello world');
      
      const size = await getDirectorySize(tempDir);
      expect(size).toBeGreaterThan(0);
      
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should return 0 for non-existing directory', async () => {
      const size = await getDirectorySize('/non/existing/directory');
      expect(size).toBe(0);
    });
  });

  describe('countFilesInDirectory', () => {
    it('should count files in directory', async () => {
      const tempDir = path.join(os.tmpdir(), 'qingdaofu-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });
      
      await fs.writeFile(path.join(tempDir, 'test1.txt'), 'hello');
      await fs.writeFile(path.join(tempDir, 'test2.txt'), 'world');
      
      const count = await countFilesInDirectory(tempDir);
      expect(count).toBe(2);
      
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should count files recursively', async () => {
      const tempDir = path.join(os.tmpdir(), 'qingdaofu-test-' + Date.now());
      await fs.mkdir(tempDir, { recursive: true });
      
      await fs.mkdir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'test1.txt'), 'hello');
      await fs.writeFile(path.join(tempDir, 'subdir', 'test2.txt'), 'world');
      
      const count = await countFilesInDirectory(tempDir);
      expect(count).toBe(2);
      
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  });
});