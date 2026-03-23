const fs = require('fs').promises;
const path = require('path');
const { log } = require('./logger');

// 插件接口规范
const PLUGIN_INTERFACE = {
  // 插件元数据
  name: 'string',
  version: 'string',
  description: 'string',
  author: 'string',
  
  // 生命周期钩子
  hooks: {
    beforeScan: 'function',
    afterScan: 'function',
    beforeDelete: 'function',
    afterDelete: 'function',
    onError: 'function'
  },
  
  // 插件方法
  methods: {
    init: 'function',
    execute: 'function',
    cleanup: 'function'
  }
};

// 插件存储
const plugins = new Map();

// 加载插件
async function loadPlugin(pluginPath) {
  try {
    // 检查文件是否存在
    const exists = await fs.access(pluginPath).then(() => true).catch(() => false);
    if (!exists) {
      throw new Error(`插件文件不存在: ${pluginPath}`);
    }

    // 动态加载插件
    const plugin = require(pluginPath);
    
    // 验证插件接口
    validatePlugin(plugin);
    
    // 初始化插件
    if (plugin.init && typeof plugin.init === 'function') {
      await plugin.init();
    }
    
    // 注册插件
    plugins.set(plugin.name, plugin);
    
    await log(`加载插件成功: ${plugin.name} v${plugin.version}`, 'INFO');
    
    return plugin;
  } catch (err) {
    await log(`加载插件失败: ${pluginPath} - ${err.message}`, 'ERROR');
    throw err;
  }
}

// 验证插件
function validatePlugin(plugin) {
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('插件必须包含 name 属性');
  }
  
  if (!plugin.version || typeof plugin.version !== 'string') {
    throw new Error('插件必须包含 version 属性');
  }
  
  // 检查hooks
  if (plugin.hooks) {
    for (const [hookName, hookFunc] of Object.entries(plugin.hooks)) {
      if (typeof hookFunc !== 'function') {
        throw new Error(`Hook ${hookName} 必须是函数`);
      }
    }
  }
  
  // 检查methods
  if (plugin.methods) {
    for (const [methodName, methodFunc] of Object.entries(plugin.methods)) {
      if (typeof methodFunc !== 'function') {
        throw new Error(`Method ${methodName} 必须是函数`);
      }
    }
  }
}

// 卸载插件
async function unloadPlugin(pluginName) {
  const plugin = plugins.get(pluginName);
  
  if (!plugin) {
    throw new Error(`插件未加载: ${pluginName}`);
  }
  
  // 清理插件
  if (plugin.cleanup && typeof plugin.cleanup === 'function') {
    await plugin.cleanup();
  }
  
  // 从缓存中删除
  require.cache[require.resolve(plugin.path)] = null;
  
  plugins.delete(pluginName);
  
  await log(`卸载插件成功: ${pluginName}`, 'INFO');
}

// 获取插件
function getPlugin(pluginName) {
  return plugins.get(pluginName);
}

// 获取所有插件
function getAllPlugins() {
  return Array.from(plugins.values());
}

// 执行插件钩子
async function executeHook(hookName, data) {
  const results = [];
  
  for (const plugin of plugins.values()) {
    if (plugin.hooks && plugin.hooks[hookName]) {
      try {
        const result = await plugin.hooks[hookName](data);
        results.push({ plugin: plugin.name, result });
      } catch (err) {
        await log(`插件钩子执行失败: ${plugin.name}.${hookName} - ${err.message}`, 'ERROR');
        results.push({ plugin: plugin.name, error: err.message });
      }
    }
  }
  
  return results;
}

// 执行插件方法
async function executeMethod(pluginName, methodName, ...args) {
  const plugin = getPlugin(pluginName);
  
  if (!plugin) {
    throw new Error(`插件未加载: ${pluginName}`);
  }
  
  if (!plugin.methods || !plugin.methods[methodName]) {
    throw new Error(`插件方法不存在: ${pluginName}.${methodName}`);
  }
  
  try {
    return await plugin.methods[methodName](...args);
  } catch (err) {
    await log(`插件方法执行失败: ${pluginName}.${methodName} - ${err.message}`, 'ERROR');
    throw err;
  }
}

// 从目录加载所有插件
async function loadPluginsFromDir(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.js')) {
        const pluginPath = path.join(dirPath, entry.name);
        try {
          await loadPlugin(pluginPath);
        } catch (err) {
          // 继续加载其他插件
        }
      }
    }
  } catch (err) {
    await log(`加载插件目录失败: ${dirPath} - ${err.message}`, 'ERROR');
  }
}

module.exports = {
  loadPlugin,
  unloadPlugin,
  getPlugin,
  getAllPlugins,
  executeHook,
  executeMethod,
  loadPluginsFromDir,
  PLUGIN_INTERFACE
};