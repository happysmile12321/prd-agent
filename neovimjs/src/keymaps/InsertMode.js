/**
 * InsertMode - Insert 模式处理器
 * 实现文本插入和编辑
 */

export class InsertMode {
  constructor(editor) {
    this.editor = editor;
  }

  // 处理输入
  handle(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return false;

    switch (input) {
      // 退出插入模式
      case '<Esc>':
      case '<C-c>':
      case '<C-[': {
        this.editor.setMode('normal');
        // 退出时将光标回退一格（如果在行尾）
        const cursor = buffer.getCursor();
        if (cursor.col > 0 && cursor.col >= buffer.getLineLength(cursor.row)) {
          buffer.moveCursor(0, -1);
        }
        break;
      }

      // 回车 - 新建行
      case '<CR>':
        buffer.insert('\n');
        break;

      // Tab
      case '<Tab>':
        if (this.editor.options.expandtab) {
          buffer.insert(' '.repeat(this.editor.options.tabstop));
        } else {
          buffer.insert('\t');
        }
        break;

      // 退格
      case '<BS>':
      case '<C-h>': {
        const cursor = buffer.getCursor();
        if (cursor.col > 0) {
          buffer.moveCursor(0, -1);
          buffer.delete(1);
        } else if (cursor.row > 0) {
          // 合并到上一行
          const prevLineLen = buffer.getLineLength(cursor.row - 1);
          buffer.lines[cursor.row - 1] += buffer.lines[cursor.row];
          buffer.lines.splice(cursor.row, 1);
          buffer.setCursor(cursor.row - 1, prevLineLen);
        }
        break;
      }

      // 删除
      case '<Del>':
        buffer.delete(1);
        break;

      // 删除到行尾
      case '<C-k>': {
        const cursor = buffer.getCursor();
        const line = buffer.getLine(cursor.row);
        buffer.lines[cursor.row] = line.slice(0, cursor.col);
        break;
      }

      // 删除到行首
      case '<C-u>': {
        const cursor = buffer.getCursor();
        const line = buffer.getLine(cursor.row);
        buffer.lines[cursor.row] = line.slice(cursor.col);
        buffer.setCursor(cursor.row, 0);
        break;
      }

      // 上下左右
      case '<Up>':
        buffer.moveCursor(-1, 0);
        break;
      case '<Down>':
        buffer.moveCursor(1, 0);
        break;
      case '<Left>':
        buffer.moveCursor(0, -1);
        break;
      case '<Right>':
        buffer.moveCursor(0, 1);
        break;

      // 行首行尾
      case '<Home>': {
        const cursor = buffer.getCursor();
        buffer.setCursor(cursor.row, 0);
        break;
      }
      case '<End>':
      case '<C-e>': {
        const cursor = buffer.getCursor();
        buffer.setCursor(cursor.row, buffer.getLineLength(cursor.row));
        break;
      }

      // 翻页
      case '<PageUp>': {
        const win = this.editor.getActiveWindow();
        if (win) {
          win.scroll(-(win.height - 2));
        }
        break;
      }
      case '<PageDown>': {
        const win = this.editor.getActiveWindow();
        if (win) {
          win.scroll(win.height - 2);
        }
        break;
      }

      // 特殊字符插入
      case '<C-v>':
        // 等待下一个字符（字面插入）
        return true;

      // 自动缩进
      case '<C-t>': {
        const cursor = buffer.getCursor();
        const indent = ' '.repeat(this.editor.options.shiftwidth);
        buffer.lines[cursor.row] = indent + buffer.lines[cursor.row];
        buffer.moveCursor(0, indent.length);
        break;
      }
      case '<C-d>': {
        const cursor = buffer.getCursor();
        const line = buffer.getLine(cursor.row);
        const indent = ' '.repeat(this.editor.options.shiftwidth);
        if (line.startsWith(indent)) {
          buffer.lines[cursor.row] = line.slice(indent.length);
          buffer.moveCursor(0, -indent.length);
        }
        break;
      }

      // 普通字符输入
      default:
        if (input.length === 1) {
          buffer.insert(input);
        } else {
          return false;
        }
    }

    return true;
  }
}
