/**
 * CommandMode - Command 模式处理器
 * 实现 : 命令行操作
 */

export class CommandMode {
  constructor(editor) {
    this.editor = editor;
    this.commandBuffer = '';
  }

  handle(input) {
    switch (input) {
      case '<CR>':
        return this.execute(this.commandBuffer);

      case '<Esc>':
      case '<C-c>':
        this.editor.setMode('normal');
        this.commandBuffer = '';
        return Promise.resolve(true);

      case '<BS>':
        this.commandBuffer = this.commandBuffer.slice(0, -1);
        return Promise.resolve(true);

      default:
        if (input.length === 1) {
          this.commandBuffer += input;
        }
        return Promise.resolve(true);
    }
  }

  async execute(command) {
    const cmd = command.trim();
    this.commandBuffer = '';

    if (!cmd) {
      this.editor.setMode('normal');
      return true;
    }

    // 解析命令
    const [cmdName, ...args] = cmd.split(/\s+/);
    const argStr = args.join(' ');

    switch (cmdName) {
      // 编辑操作
      case 'w': // 写入
      case 'write':
        await this.writeFile(argStr || null);
        break;
      case 'wq': // 写入并退出
        await this.writeFile(argStr || null);
        this.quit();
        break;
      case 'q': // 退出
        if (argStr === '!') {
          this.quit();
        } else {
          const buffer = this.editor.getCurrentBuffer();
          if (buffer && buffer.modified) {
            this.editor.ui?.showMessage('No write since last change', 'error');
            return true;
          }
          this.quit();
        }
        break;
      case 'qa': // 退出所有
      case 'qall':
        this.quit();
        break;
      case 'x': // 保存并退出
      case 'xit':
        await this.writeFile(null);
        this.quit();
        break;
      case 'x!':
        await this.writeFile(null);
        this.quit();
        break;

      // 编辑文件
      case 'e': // 编辑
      case 'edit':
        if (argStr) {
          await this.editFile(argStr);
        }
        break;
      case 'enew': // 新建
        this.editor.createBuffer('', { name: '[No Name]' });
        break;

      // 缓冲区操作
      case 'bn': // 下一个缓冲区
      case 'bnext':
        this.nextBuffer();
        break;
      case 'bp': // 上一个缓冲区
      case 'bprevious':
        this.prevBuffer();
        break;
      case 'ls': // 列出缓冲区
      case 'buffers':
      case 'files':
        this.listBuffers();
        break;
      case 'b': // 切换缓冲区
        if (argStr) {
          const num = parseInt(argStr, 10);
          if (!isNaN(num)) {
            this.gotoBuffer(num - 1);
          }
        }
        break;

      // 窗口操作
      case 'split': // 水平分割
      case 'sp':
        this.editor.splitWindow('horizontal');
        break;
      case 'vsplit': // 垂直分割
      case 'vs':
        this.editor.splitWindow('vertical');
        break;
      case 'close': // 关闭窗口
      case 'clo':
        this.editor.closeWindow();
        break;
      case 'only': // 只保留当前窗口
      case 'on':
        // TODO: 关闭其他窗口
        break;
      case 'wincmd':
        // 窗口命令
        break;

      // 标签页
      case 'tabnew': // 新标签页
        this.editor.newTab();
        break;
      case 'tabc': // 关闭标签页
      case 'tabclose':
        this.editor.closeTab();
        break;
      case 'tabn': // 下一个标签页
      case 'tabnext':
        this.editor.gotoTab((this.editor.tabManager.activeTabIndex + 1) % this.editor.tabManager.tabs.length);
        break;
      case 'tabp': // 上一个标签页
      case 'tabprevious':
        this.editor.gotoTab((this.editor.tabManager.activeTabIndex - 1 + this.editor.tabManager.tabs.length) % this.editor.tabManager.tabs.length);
        break;

      // 选项设置
      case 'set': {
        const [name, value] = argStr.split('=');
        if (name && value !== undefined) {
          this.setOption(name, value);
        } else if (name && name.startsWith('no')) {
          this.setOption(name.slice(2), false);
        } else if (name && name.startsWith('inv')) {
          const current = this.editor.getOption(name.slice(3));
          this.setOption(name.slice(3), !current);
        } else {
          // 显示选项值
          const value = this.editor.getOption(name);
          this.editor.ui?.showMessage(`${name}=${value}`, 'info');
        }
        break;
      }

      // 搜索和替换
      case 's': // 替换
      case 'substitute':
        this.substitute(argStr);
        break;
      case '%s': // 全局替换
        this.substitute(argStr, true);
        break;
      case 'nohl': // 取消高亮
      case 'nohlsearch':
        this.editor.options.hlsearch = false;
        break;

      // 撤销/重做
      case 'u': // 撤销
      case 'undo':
        this.editor.getCurrentBuffer()?.undo();
        break;
      case 'red': // 重做
      case 'redo':
        this.editor.getCurrentBuffer()?.redo();
        break;

      // 其他
      case '!': // Shell 命令
        if (argStr) {
          this.runShellCommand(argStr);
        }
        break;
      case 'sh': // Shell
        this.runShellCommand(process.env.SHELL || 'bash');
        break;
      case 'help':
        this.editor.ui?.showMessage('Help: Not implemented yet', 'info');
        break;
      case 'version':
        this.editor.ui?.showMessage('NeovimJS v0.1.0', 'info');
        break;

      default:
        this.editor.ui?.showMessage(`Not an editor command: ${cmdName}`, 'error');
    }

    this.editor.setMode('normal');
    return true;
  }

  // 写入文件
  async writeFile(path) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return;

    const fs = await import('fs');
    const targetPath = path || buffer.path;

    if (!targetPath) {
      this.editor.ui?.showMessage('No file name', 'error');
      return;
    }

    try {
      fs.writeFileSync(targetPath, buffer.getContent());
      buffer.path = targetPath;
      buffer.name = targetPath.split('/').pop();
      buffer.modified = false;
      this.editor.ui?.showMessage(`"${targetPath}" ${buffer.getLineCount()}L written`, 'success');
    } catch (err) {
      this.editor.ui?.showMessage(`Error writing file: ${err.message}`, 'error');
    }
  }

  // 编辑文件
  async editFile(path) {
    const fs = await import('fs');

    try {
      const content = fs.readFileSync(path, 'utf-8');
      const buffer = this.editor.createBuffer(content, {
        name: path.split('/').pop(),
        path: path,
        filetype: this.detectFileType(path)
      });
      this.editor.setBuffer(buffer);
    } catch (err) {
      this.editor.ui?.showMessage(`Error reading file: ${err.message}`, 'error');
    }
  }

  // 检测文件类型
  detectFileType(path) {
    const ext = path.split('.').pop();
    const types = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascriptreact',
      'tsx': 'typescriptreact',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'c': 'c',
      'h': 'c',
      'cpp': 'cpp',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'sh',
      'vim': 'vim',
      'lua': 'lua',
    };
    return types[ext] || 'text';
  }

  // 缓冲区操作
  nextBuffer() {
    const index = this.editor.buffers.findIndex(b => b === this.editor.getCurrentBuffer());
    const nextIndex = (index + 1) % this.editor.buffers.length;
    this.editor.setBuffer(this.editor.buffers[nextIndex]);
  }

  prevBuffer() {
    const index = this.editor.buffers.findIndex(b => b === this.editor.getCurrentBuffer());
    const prevIndex = (index - 1 + this.editor.buffers.length) % this.editor.buffers.length;
    this.editor.setBuffer(this.editor.buffers[prevIndex]);
  }

  gotoBuffer(index) {
    if (index >= 0 && index < this.editor.buffers.length) {
      this.editor.setBuffer(this.editor.buffers[index]);
    }
  }

  listBuffers() {
    let msg = '';
    this.editor.buffers.forEach((b, i) => {
      const current = b === this.editor.getCurrentBuffer() ? '%' : ' ';
      const modified = b.modified ? '+' : ' ';
      const name = b.name || '[No Name]';
      msg += `${current}  ${i + 1} ${modified} "${name}" line ${b.getCursor().row + 1}\n`;
    });
    this.editor.ui?.showMessage(msg.trim(), 'info');
  }

  // 设置选项
  setOption(name, value) {
    // 处理布尔选项
    if (value === '' || value === true) {
      this.editor.setOption(name, true);
    } else if (value === false) {
      this.editor.setOption(name, false);
    } else {
      // 处理数字和字符串选项
      if (/^\d+$/.test(value)) {
        this.editor.setOption(name, parseInt(value, 10));
      } else {
        this.editor.setOption(name, value);
      }
    }
  }

  // 替换命令
  substitute(pattern, global = false) {
    // 解析替换模式: /pattern/replacement/flags
    const match = pattern.match(/^\/(.*)\/(.*)\/(.*)$/);
    if (!match) {
      this.editor.ui?.showMessage('Invalid substitute pattern', 'error');
      return;
    }

    const [, searchPattern, replacement, flags] = match;
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return;

    const regex = new RegExp(searchPattern, flags.includes('i') ? 'gi' : 'g');
    let count = 0;

    if (global || pattern.startsWith('%')) {
      // 全局替换
      for (let i = 0; i < buffer.lines.length; i++) {
        const line = buffer.lines[i];
        const newLine = line.replace(regex, replacement);
        if (newLine !== line) {
          buffer.lines[i] = newLine;
          count++;
        }
      }
    } else {
      // 当前行替换
      const cursor = buffer.getCursor();
      const line = buffer.lines[cursor.row];
      const newLine = line.replace(regex, replacement);
      if (newLine !== line) {
        buffer.lines[cursor.row] = newLine;
        count++;
      }
    }

    if (count > 0) {
      buffer.modified = true;
      this.editor.ui?.showMessage(`${count} substitution(s)`, 'success');
    } else {
      this.editor.ui?.showMessage('No match found', 'warning');
    }
  }

  // 运行 Shell 命令
  runShellCommand(cmd) {
    try {
      const result = require('child_process').execSync(cmd, { encoding: 'utf-8' });
      this.editor.ui?.showMessage(result.trim(), 'info');
    } catch (err) {
      this.editor.ui?.showMessage(`Command failed: ${err.message}`, 'error');
    }
  }

  // 退出
  quit() {
    this.editor?.ui?.screen?.destroy();
    process.exit(0);
  }
}
