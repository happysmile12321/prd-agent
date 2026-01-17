/**
 * LazyVimConfig - LazyVim 风格配置
 * 提供类似 LazyVim 的键位绑定和配置选项
 */

export function createLazyVimConfig(api) {
  const { editor } = api;

  // ========== 选项设置 ==========

  // 基础选项
  api.setOption('number', true);
  api.setOption('relativenumber', true);
  api.setOption('cursorline', true);
  api.setOption('wrap', false);
  api.setOption('expandtab', true);
  api.setOption('shiftwidth', 2);
  api.setOption('tabstop', 2);
  api.setOption('ignorecase', true);
  api.setOption('smartcase', true);
  api.setOption('hlsearch', true);
  api.setOption('incsearch', true);
  api.setOption('scrolloff', 8);
  api.setOption('sidescrolloff', 8);
  api.setOption('signcolumn', 'yes');
  api.setOption('laststatus', 2);
  api.setOption('showmode', false); // 状态行显示模式
  api.setOption('showcmd', true);
  api.setOption('timeout', true);
  api.setOption('timeoutlen', 300);
  api.setOption('updatetime', 200);
  api.setOption('clipboard', 'unnamedplus');
  api.setOption('mouse', 'a');
  api.setOption('termguicolors', true);

  // 设置 Leader 键
  if (editor.keymap) {
    editor.keymap.setLeader(' ');
  }

  // ========== 键位映射 ==========

  // === Normal 模式 ===

  // 快速保存
  api.nmap('<Leader>w', ':write<CR>');

  // 快速退出
  api.nmap('<Leader>q', ':quit<CR>');
  api.nmap('<Leader>qq', ':qa<CR>');

  // Buffer 操作
  api.nmap('<Leader>bd', ':bdelete<CR>');
  api.nmap('<S-h>', ':bprevious<CR>');
  api.nmap('<S-l>', ':bnext<CR>');
  api.nmap('[b', ':bprevious<CR>');
  api.nmap(']b', ':bnext<CR>');

  // Tab 操作
  api.nmap('<Leader><tab>l', ':tablast<CR>');
  api.nmap('<Leader><tab>f', ':tabfirst<CR>');
  api.nmap('<Leader><tab><tab>', ':tabnew<CR>');
  api.nmap('<Leader>tn', ':tabnext<CR>');
  api.nmap('<Leader>tp', ':tabprevious<CR>');
  api.nmap(']t', ':tabnext<CR>');
  api.nmap('[t', ':tabprevious<CR>');

  // 窗口操作
  api.nmap('<Leader>ww', '<C-w>p');
  api.nmap('<Leader>wd', '<C-w>c');
  api.nmap('<Leader>w-', '<C-w>s');
  api.nmap('<Leader>w|', '<C-w>v');
  api.nmap('<Leader>-', '<C-w>s');
  api.nmap('<Leader>|', '<C-w>v');

  // 窗口导航
  api.nmap('<C-h>', '<C-w>h');
  api.nmap('<C-j>', '<C-w>j');
  api.nmap('<C-k>', '<C-w>k');
  api.nmap('<C-l>', '<C-w>l');

  // 窗口大小调整
  api.nmap('<C-Up>', '<C-w>+');
  api.nmap('<C-Down>', '<C-w>-');
  api.nmap('<C-Left>', '<C-w><');
  api.nmap('<C-Right>', '<C-w>>');

  // 取消搜索高亮
  api.nmap('<Leader>uh', ':nohlsearch<CR>');

  // === Insert 模式 ===

  // jk 退出插入模式
  api.imap('jk', '<Esc>');
  api.imap('kj', '<Esc>');

  // Ctrl+s/u 移动
  api.imap('<C-h>', '<Left>');
  api.imap('<C-j>', '<Down>');
  api.imap('<C-k>', '<Up>');
  api.imap('<C-l>', '<Right>');

  // === Visual 模式 ===

  // 移动选中的文本
  api.vmap('J', ":m '>+1<CR>gv=gv");
  api.vmap('K', ":m '<-2<CR>gv=gv");

  // === Command 模式 ===

  api.cmap('<C-b>', '<Left>');
  api.cmap('<C-f>', '<Right>');
  api.cmap('<C-a>', '<Home>');
  api.cmap('<C-e>', '<End>');
  api.cmap('<C-d>', '<Del>');
  api.cmap('<C-h>', '<BS>');

  // ========== 命令 ==========

  // 快速操作
  api.createCommand('W', 'write', {});
  api.createCommand('Q', 'quit', {});

  // ========== 自动命令 ==========

  // 文件类型检测
  api.createAutocmd('BufReadPost', () => {
    const buffer = api.getCurrentBuffer();
    if (buffer?.path) {
      const ext = buffer.path.split('.').pop();
      const filetypes = {
        js: 'javascript',
        ts: 'typescript',
        jsx: 'javascriptreact',
        tsx: 'typescriptreact',
        py: 'python',
        rs: 'rust',
        go: 'go',
        c: 'c',
        cpp: 'cpp',
        h: 'c',
        css: 'css',
        html: 'html',
        json: 'json',
        md: 'markdown',
        yaml: 'yaml',
        yml: 'yaml',
        toml: 'toml',
        sh: 'sh',
        vim: 'vim',
        lua: 'lua',
      };
      if (filetypes[ext]) {
        buffer.filetype = filetypes[ext];
      }
    }
  });

  // 新建行自动缩进
  api.createAutocmd('BufEnter', () => {
    api.setOption('smartindent', true);
  });

  // ========== 高亮组 ==========

  // LazyVim 风格的颜色
  api.defineHighlight('LazyVim', {
    bg: '#1a1b26',
    fg: '#c0caf5',
    primary: '#7aa2f7',
    secondary: '#bb9af7',
    success: '#9ece6a',
    warning: '#e0af68',
    error: '#f7768e',
    info: '#7dcfff',
  });
}

// 导出 spec 创建函数（LazyVim 风格）
export function import_plugin(name, config = {}) {
  return { name, config };
}

// 导出 LazyVim 插件规范
export const LazyVimSpec = {
  // 禁用插件
  disable: (name) => ({ disabled: true, name }),

  // 启用插件
  enable: (name) => ({ enabled: true, name }),
};
