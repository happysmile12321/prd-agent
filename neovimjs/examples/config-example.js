/**
 * NeovimJS 配置示例
 * 类似 LazyVim 的配置风格
 *
 * 使用方法:
 * 1. 将此文件复制到 ~/.nvjs/config.js
 * 2. 或使用 nvjs -c /path/to/config.js file.js
 */

// 导入插件（示例）
// import helloWorld from './examples/plugin-hello-world.js';

export default {
  // ========== 选项配置 ==========
  options: {
    // 行号
    number: true,
    relativenumber: true,

    // 光标
    cursorline: true,
    cursorcolumn: false,

    // 滚动
    scrolloff: 8,
    sidescrolloff: 8,

    // 缩进
    expandtab: true,
    tabstop: 2,
    shiftwidth: 2,
    smartindent: true,

    // 搜索
    ignorecase: true,
    smartcase: true,
    hlsearch: true,
    incsearch: true,

    // 其他
    wrap: false,
    signcolumn: 'yes',
    laststatus: 2,
    timeout: true,
    timeoutlen: 300,
    updatetime: 200,
    mouse: 'a',
  },

  // ========== 键位映射 ==========
  keymaps: {
    // Leader 键在 setup 中设置
  },

  // ========== 插件规范（LazyVim 风格）==========
  specs: [
    // 示例插件
    // 'hello-world',
    // { 'my-plugin': { enabled: true } },

    // 可以导入本地或 npm 插件
    // './plugins/my-plugin',
    // 'nvjs-plugin-example',
  ],

  // ========== Setup 函数 ==========
  setup: (api) => {
    const { editor } = api;

    // ========== 设置 Leader 键 ==========
    if (editor.keymap) {
      editor.keymap.setLeader(' ');
    }

    // ========== 键位映射 ==========

    // 快速保存
    api.nmap('<Leader>w', ':write<CR>', { silent: true });
    api.nmap('<Leader>q', ':quit<CR>', { silent: true });

    // Buffer 切换
    api.nmap('<S-h>', ':bprevious<CR>', { silent: true });
    api.nmap('<S-l>', ':bnext<CR>', { silent: true });

    // Tab 切换
    api.nmap(']t', ':tabnext<CR>', { silent: true });
    api.nmap('[t', ':tabprevious<CR>', { silent: true });

    // 窗口导航
    api.nmap('<C-h>', '<C-w>h', { silent: true });
    api.nmap('<C-j>', '<C-w>j', { silent: true });
    api.nmap('<C-k>', '<C-w>k', { silent: true });
    api.nmap('<C-l>', '<C-w>l', { silent: true });

    // 取消搜索高亮
    api.nmap('<Leader>uh', ':nohlsearch<CR>', { silent: true });

    // Insert 模式快捷键
    api.imap('jk', '<Esc>', { silent: true });
    api.imap('kj', '<Esc>', { silent: true });

    // ========== 自定义命令 ==========

    // 快速操作
    api.createCommand('W', 'write', {});
    api.createCommand('Q', 'quit', {});

    // Hello 命令
    api.createCommand('Hello', () => {
      api.notify('Hello from NeovimJS config!', 'success');
    }, {});

    // Edit config
    api.createCommand('EditConfig', () => {
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(process.env.HOME || '', '.nvjs', 'config.js');
      if (fs.existsSync(configPath)) {
        api.notify(`Editing config: ${configPath}`, 'info');
        // 这里可以添加打开文件的逻辑
      } else {
        api.notify('Config file not found', 'error');
      }
    }, {});

    // ========== 自动命令 ==========

    // 进入 JavaScript 文件时
    api.createAutocmd('BufEnter', () => {
      const buffer = api.getCurrentBuffer();
      if (buffer?.filetype === 'javascript') {
        // 可以在这里做特定语言的处理
      }
    });

    // 文件保存前
    api.createAutocmd('BufWritePre', () => {
      const buffer = api.getCurrentBuffer();
      // 可以在这里做保存前的处理，比如去除行尾空格
    });

    // ========== 状态行增强 ==========

    // 可以添加自定义状态行组件

    // ========== 高亮 ==========

    api.defineHighlight('CustomHighlight', {
      fg: '#7aa2f7',
      bg: '#1a1b26',
    });
  },
};

// 也可以导出 setup 函数作为主入口
export async function setup(api) {
  // 等同于上面的 setup
  api.notify('NeovimJS config loaded!', 'success');
}
