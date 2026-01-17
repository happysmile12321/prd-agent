/**
 * 示例插件: Hello World
 * 演示如何创建 NeovimJS 插件
 *
 * 使用方法:
 * 1. 将此文件放到 ~/.nvjs/plugins/hello-world/
 * 2. 在配置中添加: import('hello-world')
 */

// 插件元数据
export const meta = {
  name: 'hello-world',
  version: '0.1.0',
  description: 'A simple hello world plugin',
  author: 'Your Name',
};

/**
 * 插件设置函数
 * @param {PluginAPI} api - 插件 API
 * @param {Object} config - 插件配置
 */
export function setup(api, config = {}) {
  const { editor } = api;

  // 显示加载消息
  api.notify('Hello World plugin loaded!', 'success');

  // ========== 键位映射 ==========

  // 创建 Hello 命令
  api.createCommand('Hello', () => {
    const name = config.name || 'World';
    api.notify(`Hello, ${name}!`, 'info');
  });

  // 映射 <Leader>h 到 Hello 命令
  api.nmap('<Leader>h', ':Hello<CR>', {
    silent: true,
    desc: 'Say Hello',
  });

  // ========== 自动命令 ==========

  // 进入缓冲区时显示消息
  api.createAutocmd('BufEnter', () => {
    const buffer = api.getCurrentBuffer();
    if (buffer && buffer.name?.endsWith('.js')) {
      // 可以在这里做特殊处理
      // console.log('Entered JavaScript file');
    }
  });

  // ========== 高亮 ==========

  // 自定义高亮组
  api.defineHighlight('HelloWorld', {
    fg: '#7aa2f7',
    bg: '#1a1b26',
    bold: true,
  });

  // ========== 工具函数 ==========

  // 添加全局函数
  api.hello = {
    greet: (name) => `Hello, ${name}!`,
    shout: (name) => `HELLO, ${name}!`,
  };

  // 插件配置示例
  if (config.enabled) {
    api.notify(`Hello World plugin is enabled!`, 'success');
  }
}

/**
 * 插件清理函数（可选）
 * @param {PluginAPI} api - 插件 API
 */
export function cleanup(api) {
  api.notify('Hello World plugin unloaded!', 'warning');
}

// 默认导出
export default {
  meta,
  setup,
  cleanup,
};
