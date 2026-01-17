/**
 * Screen - TUI 屏幕管理
 * 使用 blessed 创建终端 UI
 */
import blessed from 'blessed';

export class Screen {
  constructor(options = {}) {
    // 创建 blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'NeovimJS',
      fullUnicode: true,
      autoPadding: true,
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true,
        color: null
      },
      ...options
    });

    // 颜色主题（LazyVim 风格）
    this.colors = {
      bg: '#1a1b26',
      fg: '#c0caf5',
      primary: '#7aa2f7',
      secondary: '#bb9af7',
      success: '#9ece6a',
      warning: '#e0af68',
      error: '#f7768e',
      info: '#7dcfff',
      comment: '#565f89',
      selection: '#2ac3de',
      lineNr: '#414868',
      lineNrNr: '#737aa2',
      cursorLine: '#16161e',
      statusline: '#1a1b26',
      tabline: '#1a1b26',
      border: '#414868',
    };

    // 组件
    this.grid = null;
    this.editorBox = null;
    this.statusline = null;
    this.tabline = null;
    this.cmdline = null;
    this.cmdlineBox = null;

    // 编辑器引用
    this.editor = null;

    // 键输入缓冲区
    this.inputBuffer = '';
    this.inputTimeout = null;

    // 渲染锁
    this.renderPending = false;

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // 全局按键处理
    this.screen.on('key', (ch, key) => {
      this.handleKeyPress(ch, key);
    });

    // 响应终端大小变化
    this.screen.on('resize', () => {
      this.render();
    });
  }

  handleKeyPress(ch, key) {
    if (!this.editor) return;

    // 处理 Escape 键 - 退出 insert 模式
    if (key && key.name === 'escape') {
      if (this.editor.getMode() === 'insert') {
        this.editor.setMode('normal');
      }
      this.inputBuffer = '';
      this.render();
      return;
    }

    // Ctrl+C 退出
    if (key && key.ctrl && key.name === 'c') {
      if (this.editor.getMode() !== 'insert') {
        this.quit();
      }
      return;
    }

    // 构建按键字符串
    let keyStr = '';
    if (key && key.ctrl) {
      keyStr = `<C-${key.name}>`;
    } else if (key && key.shift && key.name.length === 1) {
      keyStr = `<S-${key.name.toLowerCase()}>`;
    } else if (key && key.name === 'return') {
      keyStr = '<CR>';
    } else if (key && key.name === 'backspace') {
      keyStr = '<BS>';
    } else if (key && key.name === 'delete') {
      keyStr = '<Del>';
    } else if (key && key.name === 'tab') {
      keyStr = '<Tab>';
    } else if (key && key.name === 'up') {
      keyStr = '<Up>';
    } else if (key && key.name === 'down') {
      keyStr = '<Down>';
    } else if (key && key.name === 'left') {
      keyStr = '<Left>';
    } else if (key && key.name === 'right') {
      keyStr = '<Right>';
    } else if (key && key.name === 'home') {
      keyStr = '<Home>';
    } else if (key && key.name === 'end') {
      keyStr = '<End>';
    } else if (key && key.name === 'pageup') {
      keyStr = '<PageUp>';
    } else if (key && key.name === 'pagedown') {
      keyStr = '<PageDown>';
    } else if (ch && typeof ch === 'string' && ch.length === 1) {
      keyStr = ch;
    }

    if (!keyStr) return;

    // 添加到输入缓冲区
    this.inputBuffer += keyStr;

    // 清除之前的超时
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }

    // 设置超时
    this.inputTimeout = setTimeout(() => {
      this.processInput(this.inputBuffer);
      this.inputBuffer = '';
      this.render();
    }, this.editor.options.timeoutlen || 1000);

    // 尝试立即处理
    const handled = this.processInput(this.inputBuffer);
    if (handled) {
      this.inputBuffer = '';
      if (this.inputTimeout) {
        clearTimeout(this.inputTimeout);
        this.inputTimeout = null;
      }
      this.render();
    }
  }

  processInput(input) {
    if (!this.editor) return false;

    const mode = this.editor.getMode().split(' ')[0];

    // Normal / Visual 模式 - 直接处理
    if (mode === 'normal' || mode === 'visual') {
      if (mode === 'normal') {
        this.normalMode.handle(input);
      } else {
        this.visualMode.handle(input);
      }
      return true;
    }

    // 插入模式直接发送字符
    if (mode === 'insert') {
      if (input.length === 1 || input === '<CR>' || input === '<Tab>' || input === '<BS>') {
        this.insertMode.handle(input);
        return true;
      }
      return true;
    }

    // 命令模式
    if (mode === 'command') {
      if (input === '<CR>') {
        const cmd = this.cmdline?.getValue() || '';
        this.commandMode.execute(cmd);
        this.editor.setMode('normal');
        return true;
      } else if (input === '<Esc>' || input === '<C-c>') {
        this.editor.setMode('normal');
        return true;
      } else if (input.length === 1 || input === '<BS>') {
        this.commandMode.handle(input);
        // 更新命令行显示
        if (this.cmdline) {
          this.cmdline.setValue(':' + this.commandMode.commandBuffer);
        }
        return true;
      }
      return true;
    }

    return false;
  }

  // ========== 初始化 UI 组件 ==========

  init(editor, modeHandlers) {
    this.editor = editor;

    // 设置模式处理器引用
    if (modeHandlers) {
      this.normalMode = modeHandlers.normalMode;
      this.insertMode = modeHandlers.insertMode;
      this.visualMode = modeHandlers.visualMode;
      this.commandMode = modeHandlers.commandMode;
    }

    // 清除现有元素
    this.screen.children.forEach(c => this.screen.remove(c));

    // 创建标签行
    this.tabline = blessed.box({
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      style: {
        bg: this.colors.tabline,
        fg: this.colors.fg,
      },
    });

    // 创建编辑器区域
    this.editorBox = blessed.box({
      top: 1,
      left: 0,
      right: 0,
      bottom: 2, // statusline + cmdline
      style: {
        bg: this.colors.bg,
        fg: this.colors.fg,
      },
      scrollable: false,
      alwaysScroll: false,
      input: false,
      mouse: true,
    });

    // 创建状态行
    this.statusline = blessed.box({
      bottom: 1,
      left: 0,
      right: 0,
      height: 1,
      style: {
        bg: this.colors.statusline,
        fg: this.colors.fg,
        bold: true,
      },
    });

    // 创建命令行
    this.cmdline = blessed.textbox({
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      input: true,
      mouse: true,
      keys: true,
      style: {
        bg: this.colors.bg,
        fg: this.colors.primary,
        focus: {
          bg: this.colors.bg,
          fg: this.colors.primary,
        },
      },
      hidden: true,
    });

    this.cmdlineBox = blessed.box({
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      style: {
        bg: this.colors.bg,
        fg: this.colors.fg,
      },
      hidden: true,
    });

    // 添加到屏幕
    this.screen.append(this.tabline);
    this.screen.append(this.editorBox);
    this.screen.append(this.statusline);
    this.screen.append(this.cmdlineBox);
    this.screen.append(this.cmdline);

    // 监听命令行输入
    this.cmdline.on('submit', () => {
      const cmd = this.cmdline.getValue();
      this.emit('editorAction', { type: 'command', data: cmd });
      this.editor?.setMode('normal');
      this.cmdline.hide();
      this.cmdlineBox.hide();
      this.cmdline.setValue('');
      this.render();
    });

    this.cmdline.on('cancel', () => {
      this.editor?.setMode('normal');
      this.cmdline.hide();
      this.cmdlineBox.hide();
      this.cmdline.setValue('');
      this.render();
    });

    // 首次渲染屏幕（让元素计算布局）
    this.screen.render();

    // 然后渲染内容
    this.render();
  }

  // ========== 渲染 ==========

  render() {
    if (!this.editor || this.renderPending) return;

    this.renderPending = true;

    try {
      this.renderEditor();
      this.renderStatusline();
      this.renderTabline();
      this.renderCmdline();
      this.screen.render();
    } finally {
      this.renderPending = false;
    }
  }

  renderEditor() {
    if (!this.editorBox || !this.editor) return;

    const win = this.editor.getActiveWindow();
    if (!win) return;

    const buffer = win.getBuffer();
    if (!buffer) return;

    const { width, height } = this.editorBox;
    const cursor = buffer.getCursor();

    // 更新滚动位置
    win.ensureCursorVisible(cursor);

    // 获取可见行
    const visibleLines = win.getVisibleLines();
    const lineNrWidth = Math.max(3, String(buffer.getLineCount()).length + 1);

    // 构建显示内容
    let content = '';
    let cursorLine = -1;
    let cursorCol = -1;

    for (let i = 0; i < visibleLines.length; i++) {
      const line = visibleLines[i];
      const relNum = i + 1;
      const absNum = line.number;

      // 行号
      let lineNr = '';
      if (this.editor.options.number || this.editor.options.relativenumber) {
        if (this.editor.options.relativenumber) {
          const rel = absNum - cursor.row - 1;
          lineNr = rel === 0
            ? `${absNum}`.padStart(lineNrWidth)
            : `${Math.abs(rel)}`.padStart(lineNrWidth);
        } else {
          lineNr = `${absNum}`.padStart(lineNrWidth);
        }
      }

      // 光标行高亮
      const isCursorLine = absNum === cursor.row + 1;
      const linePrefix = isCursorLine && this.editor.options.cursorline
        ? `{${this.colors.cursorLine}-bg}${' '.repeat(lineNrWidth)} `
        : lineNr ? ` ${lineNr} ` : '';

      // 行内容
      let lineText = line.text || '';
      // 截断到屏幕宽度
      const maxWidth = width - lineNrWidth - 2;
      if (lineText.length > maxWidth) {
        lineText = lineText.slice(0, maxWidth);
      }

      // 检测光标位置
      if (absNum === cursor.row + 1) {
        cursorLine = i;
        cursorCol = lineNrWidth + 2 + cursor.col - win.scrollCol;
      }

      content += `${linePrefix}${lineText}\n`;
    }

    this.editorBox.setContent(content);

    // 设置光标位置
    if (cursorLine >= 0 && cursorCol >= 0 && this.screen.program) {
      const program = this.screen.program;

      try {
        // 获取 box 的绝对位置
        const lpos = this.editorBox.lpos;
        if (lpos) {
          const boxLeft = lpos.xi;
          const boxTop = lpos.yi;

          program.hideCursor();
          // 设置光标位置（相对于屏幕）
          const absRow = boxTop + cursorLine;
          const absCol = boxLeft + cursorCol;
          program.cup(absRow, absCol);
          program.showCursor();
        }
      } catch (e) {
        // 忽略光标设置错误
      }
    }
  }

  renderStatusline() {
    if (!this.statusline || !this.editor) return;

    const mode = this.editor.getMode();
    const buffer = this.editor.getCurrentBuffer();

    // 模式显示
    const modeDisplay = {
      normal: 'NORMAL',
      insert: 'INSERT',
      visual: 'VISUAL',
      command: 'COMMAND',
      replace: 'REPLACE',
    };

    // 构建状态行
    const parts = [];

    // 模式（LazyVim 风格颜色）
    const modeColors = {
      normal: this.colors.primary,
      insert: this.colors.success,
      visual: this.colors.secondary,
      command: this.colors.warning,
      replace: this.colors.error,
    };
    const modeColor = modeColors[mode.split(' ')[0]] || this.colors.primary;
    parts.push(` {${modeColor}-fg}${modeDisplay[mode.split(' ')[0]] || mode} `);

    // 文件信息
    if (buffer) {
      const modified = buffer.modified ? '[+] ' : '';
      const readonly = buffer.readonly ? '[RO] ' : '';
      const name = buffer.name || '[No Name]';
      parts.push(` ${readonly}${modified}${name} `);
    }

    // 光标位置
    if (buffer) {
      const cursor = buffer.getCursor();
      const total = buffer.getLineCount();
      parts.push(` {${this.colors.comment}-fg}%l/%c{/${this.colors.comment}-fg} `);
      parts.push(` ${cursor.row + 1}:${cursor.col + 1}/${total} `);
    }

    // 文件类型
    if (buffer) {
      parts.push(` {${this.colors.comment}-fg}${buffer.filetype}{/${this.colors.comment}-fg} `);
    }

    this.statusline.setContent(parts.join(''));
  }

  renderTabline() {
    if (!this.tabline || !this.editor) return;

    const tabManager = this.editor.tabManager;
    if (!tabManager) return;

    const tabs = tabManager.tabs;
    const activeIndex = tabManager.activeTabIndex;

    let content = '';
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const isActive = i === activeIndex;
      const style = isActive
        ? `{${this.colors.primary}-bg}{${this.colors.bg}-fg}`
        : `{${this.colors.bg}-fg}{${this.colors.comment}-fg}`;

      const name = tab.name || `Tab ${i + 1}`;
      content += `${style} ${name} {/${this.colors.primary}-bg}{/${this.colors.bg}-fg}`;
    }

    this.tabline.setContent(content);
  }

  renderCmdline() {
    if (!this.editor) return;

    const mode = this.editor.getMode();
    const isCommandMode = mode === 'command';

    if (isCommandMode) {
      this.cmdline.show();
      this.cmdlineBox.show();
      this.cmdline.setValue(':');
      this.cmdline.focus();
      this.screen.render();
    } else {
      this.cmdline.hide();
      this.cmdlineBox.hide();
    }
  }

  // ========== 显示消息 ==========

  showMessage(msg, type = 'info') {
    const colors = {
      info: this.colors.info,
      warning: this.colors.warning,
      error: this.colors.error,
      success: this.colors.success,
    };
    const color = colors[type] || this.colors.info;

    if (this.cmdlineBox) {
      this.cmdlineBox.setContent(`{${color}-fg}${msg}{/${color}-fg}`);
      this.cmdlineBox.show();
      this.render();

      setTimeout(() => {
        this.cmdlineBox.hide();
        this.render();
      }, 3000);
    }
  }

  // ========== 事件系统 ==========

  on(event, callback) {
    this.screen.on(event, callback);
  }

  emit(event, data) {
    this.screen.emit(event, data);
  }

  // ========== 退出 ==========

  quit() {
    this.screen.destroy();
    process.exit(0);
  }
}
