/**
 * 通知插件示例
 * 支持钉钉、飞书等通知方式
 */

/**
 * 初始化插件
 */
async function init(options = {}) {
  this.options = {
    enabled: false,
    webhook: '',
    type: 'dingtalk', // dingtalk 或 feishu
    ...options
  };
}

/**
 * 清理插件
 */
async function cleanup() {
  this.options = {};
}

/**
 * 发送钉钉通知
 */
async function sendDingtalk(message) {
  if (!this.options.webhook) {
    console.log('钉钉webhook未配置，跳过通知');
    return;
  }
  
  try {
    const fetch = require('node-fetch');
    const data = {
      msgtype: 'text',
      text: {
        content: message
      }
    };
    
    const response = await fetch(this.options.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.errcode !== 0) {
      throw new Error(result.errmsg);
    }
    
    return { success: true };
  } catch (err) {
    console.error('发送钉钉通知失败:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送飞书通知
 */
async function sendFeishu(message) {
  if (!this.options.webhook) {
    console.log('飞书webhook未配置，跳过通知');
    return;
  }
  
  try {
    const fetch = require('node-fetch');
    const data = {
      msg_type: 'text',
      content: {
        text: message
      }
    };
    
    const response = await fetch(this.options.webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.code !== 0) {
      throw new Error(result.msg);
    }
    
    return { success: true };
  } catch (err) {
    console.error('发送飞书通知失败:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 发送通知
 */
async function sendNotification(message) {
  if (!this.options.enabled) {
    return { success: false, message: '通知未启用' };
  }
  
  if (this.options.type === 'dingtalk') {
    return await sendDingtalk.call(this, message);
  } else if (this.options.type === 'feishu') {
    return await sendFeishu.call(this, message);
  } else {
    return { success: false, message: '不支持的通知类型' };
  }
}

/**
 * 配置通知
 */
async function configure(options) {
  this.options = { ...this.options, ...options };
  return { success: true };
}

/**
 * 删除前钩子
 */
async function beforeDelete(data) {
  const message = `[清道夫] 即将删除 ${data.files.length} 个文件，释放空间 ${formatBytes(data.totalSize)}`;
  await sendNotification.call(this, message);
}

/**
 * 删除后钩子
 */
async function afterDelete(data) {
  const message = `[清道夫] 已删除 ${data.deletedCount} 个文件，释放空间 ${formatBytes(data.freedSpace)}`;
  await sendNotification.call(this, message);
}

/**
 * 错误钩子
 */
async function onError(data) {
  const message = `[清道夫] 发生错误: ${data.error.message}`;
  await sendNotification.call(this, message);
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  name: 'notification',
  version: '1.0.0',
  description: '清理通知插件（钉钉/飞书）',
  author: 'Qingdaofu',
  
  hooks: {
    beforeDelete,
    afterDelete,
    onError
  },
  
  methods: {
    init,
    cleanup,
    sendNotification,
    configure
  }
};