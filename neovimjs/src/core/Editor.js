/**
 * Editor - 核心编辑器
 * 整合缓冲区、窗口、标签页等组件
 */
import { Buffer } from './Buffer.js';
import { Window } from './Window.js';
import { TabManager } from './Tab.js';

export class Editor {
  constructor(options = {}) {
    this.screen = options.screen || null;
    this.ui = options.ui || null;

    // 标签页管理
    this.tabManager = new TabManager();

    // 缓冲区列表
    this.buffers = [];

    // 当前模式
    this.mode = 'normal'; // normal | insert | visual | command | replace

    // 可选模式的子模式
    this.visualMode = null; // 'v' | 'V' | '<C-v>'

    // 寄存器（yank/paste）
    this.registers = {
      '":': '',     // 最后执行的命令
      '*': '',      // 剪贴板
      '+': '',      // 剪贴板（同上）
      '0': '',      // 最近复制
      '1': '',      // 最近删除
      '2-9': [],    // 历史删除
      'default': '' // 未指定寄存器
    };

    // 搜索模式
    this.searchPattern = '';
    this.searchOffset = 0;

    // 替换模式
    this.replacePattern = '';
    this.replaceFlags = '';

    // 命令历史
    this.commandHistory = [];
    this.commandHistoryIndex = -1;

    // 计数（用于命令如 3dd）
    this.count = 0;

    // 当前操作符（如 d, y, c）
    this.operator = null;

    // 当前动作（如 w, e, b）
    this.motion = null;

    // 选项
    this.options = {
      number: false,          // 显示行号
      relativenumber: false,  // 相对行号
      wrap: false,            // 自动换行
      scrolloff: 5,           // 滚动边距
      sidescrolloff: 5,       // 水平滚动边距
      tabstop: 4,             // Tab 宽度
      shiftwidth: 4,          // 自动缩进宽度
      expandtab: false,       // Tab 转空格
      smartindent: true,      // 智能缩进
      ignorecase: false,      // 忽略大小写
      smartcase: true,        // 智能大小写
      hlsearch: false,        // 高亮搜索
      incsearch: true,        // 增量搜索
      mouse: 'a',             // 鼠标支持
      clipboard: 'unnamedplus', // 剪贴板
      timeout: true,          // 超时映射
      timeoutlen: 1000,       // 映射超时(ms)
      updatetime: 2000,       // 更新时间(ms)
      conceallevel: 0,        // 隐藏级别
      cmdheight: 1,           // 命令行高度
      laststatus: 2,          // 状态行显示
      showmode: true,         // 显示模式
      showcmd: true,          // 显示命令
      ruler: true,            // 显示光标位置
      list: false,            // 显示隐藏字符
      signcolumn: 'auto',     // 符号列
      cursorline: false,      // 高亮当前行
      cursorcolumn: false,    // 高亮当前列
      colorcolumn: '',        // 颜色列
      foldmethod: 'manual',   // 折叠方法
      foldlevel: 0,           // 折叠级别
    };

    // 高亮匹配
    this.highlights = [];

    // 监听器
    this.listeners = {
      modeChange: [],
      bufferChange: [],
      optionChange: [],
      keyEvent: []
    };

    // 创建初始标签页和缓冲区
    this.init();
  }

  init() {
    // 创建初始缓冲区
    const buf = this.createBuffer('', { name: '[No Name]' });
    this.tabManager.addTab({ buffer: buf });
  }

  // ========== 模式管理 ==========

  getMode() {
    if (this.mode === 'visual') {
      return `visual ${this.visualMode || 'v'}`;
    }
    return this.mode;
  }

  setMode(mode, visualMode = null) {
    const oldMode = this.mode;
    this.mode = mode;
    this.visualMode = visualMode;

    // 清除选择
    if (mode !== 'visual' && mode !== 'select') {
      const sel = this.getSelection();
      if (sel && sel.buffer) {
        sel.buffer.selection = null;
      }
    }

    this.emit('modeChange', { old: oldMode, new: mode, visualMode });
  }

  isMode(...modes) {
    return modes.includes(this.mode);
  }

  // ========== 缓冲区管理 ==========

  createBuffer(content = '', options = {}) {
    const buffer = new Buffer(content, options);
    this.buffers.push(buffer);
    this.emit('bufferChange', { action: 'create', buffer });
    return buffer;
  }

  getBuffer(id) {
    return this.buffers.find(b => b.id === id) || null;
  }

  getCurrentBuffer() {
    const win = this.tabManager.getActiveWindow();
    return win ? win.getBuffer() : null;
  }

  setBuffer(buffer) {
    const win = this.tabManager.getActiveWindow();
    if (win) {
      win.setBuffer(buffer);
      this.emit('bufferChange', { action: 'switch', buffer });
    }
  }

  closeBuffer(buffer) {
    const index = this.buffers.indexOf(buffer);
    if (index !== -1) {
      this.buffers.splice(index, 1);
      this.emit('bufferChange', { action: 'close', buffer });
    }
  }

  // ========== 窗口和标签页 ==========

  getActiveWindow() {
    return this.tabManager.getActiveWindow();
  }

  splitWindow(direction = 'horizontal') {
    const buffer = this.getCurrentBuffer()?.clone();
    return this.tabManager.getActiveTab()?.splitWindow(direction, buffer);
  }

  closeWindow() {
    const tab = this.tabManager.getActiveTab();
    const win = this.getActiveWindow();
    if (tab && win) {
      const index = tab.windows.indexOf(win);
      return tab.closeWindow(index);
    }
    return false;
  }

  newTab() {
    const buf = this.createBuffer('', { name: '[No Name]' });
    return this.tabManager.addTab({ buffer: buf });
  }

  closeTab() {
    return this.tabManager.closeTab(this.tabManager.activeTabIndex);
  }

  gotoTab(index) {
    return this.tabManager.setActiveTab(index);
  }

  // ========== 寄存器操作 ==========

  yank(text, register = null) {
    const reg = register || 'default';
    this.registers[reg] = text;
    this.registers['0'] = text;
  }

  paste(register = null) {
    const reg = register || 'default';
    return this.registers[reg] || this.registers['default'] || '';
  }

  delete(text, register = null) {
    // 移动删除历史
    for (let i = 9; i >= 2; i--) {
      this.registers[`${i}`] = this.registers[`${i - 1}`];
    }
    this.registers['1'] = this.registers['1'] || text;

    if (register) {
      this.registers[register] = text;
    }
  }

  // ========== 选项管理 ==========

  setOption(name, value) {
    const oldValue = this.options[name];
    this.options[name] = value;
    this.emit('optionChange', { name, oldValue, newValue: value });
  }

  getOption(name) {
    return this.options[name];
  }

  // ========== 搜索 ==========

  search(pattern, options = {}) {
    this.searchPattern = pattern;
    const buffer = this.getCurrentBuffer();
    if (!buffer) return null;

    const opts = {
      caseSensitive: !this.options.ignorecase,
      ...options
    };

    return buffer.find(pattern, opts);
  }

  searchNext() {
    if (!this.searchPattern) return null;
    return this.search(this.searchPattern, { backwards: false });
  }

  searchPrev() {
    if (!this.searchPattern) return null;
    return this.search(this.searchPattern, { backwards: true });
  }

  // ========== 选择/可视模式 ==========

  getSelection() {
    const buf = this.getCurrentBuffer();
    if (!buf || !buf.selection) return null;

    const { start, end } = buf.selection;
    if (!start || !end) return null;

    // 确保开始在结束之前
    const sRow = Math.min(start.row, end.row);
    const sCol = Math.min(start.col, end.col);
    const eRow = Math.max(start.row, end.row);
    const eCol = Math.max(start.col, end.col);

    return {
      buffer: buf,
      start: { row: sRow, col: sCol },
      end: { row: eRow, col: eCol },
      mode: buf.selection.visualMode
    };
  }

  setSelection(start, end, mode = 'v') {
    const buf = this.getCurrentBuffer();
    if (buf) {
      buf.selection = { start, end, visualMode: mode };
    }
  }

  getSelectedText() {
    const sel = this.getSelection();
    if (!sel) return '';

    return sel.buffer.getRange(
      sel.start.row, sel.start.col,
      sel.end.row, sel.end.col
    );
  }

  // ========== 命令 ==========

  executeCommand(command) {
    this.commandHistory.push(command);
    this.commandHistoryIndex = this.commandHistory.length;
    this.registers['":'] = command;

    // 解析和执行命令
    // 这将在命令系统中实现
  }

  getCommandHistory() {
    return [...this.commandHistory];
  }

  // ========== 事件系统 ==========

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  // ========== 光标操作（快捷方法） ==========

  getCursor() {
    return this.getCurrentBuffer()?.getCursor() || { row: 0, col: 0 };
  }

  setCursor(row, col) {
    this.getCurrentBuffer()?.setCursor(row, col);
    this.getActiveWindow()?.ensureCursorVisible(this.getCursor());
  }

  moveCursor(dRow, dCol) {
    this.getCurrentBuffer()?.moveCursor(dRow, dCol);
    this.getActiveWindow()?.ensureCursorVisible(this.getCursor());
  }
}
