/**
 * NormalMode - Normal 模式动作处理器
 * 实现 Neovim 风格的光标移动和编辑操作
 */

// 单词边界检测
function isWordChar(char) {
  return /[a-zA-Z0-9_]/.test(char);
}

function isNonWordChar(char) {
  return char && !isWordChar(char) && !/\s/.test(char);
}

// 查找下一个单词边界
function findWordEnd(buffer, cursor, count = 1) {
  const { row, col } = cursor;
  const lines = buffer.lines;
  let currentRow = row;
  let currentCol = col;
  let found = 0;

  while (found < count && currentRow < lines.length) {
    const line = lines[currentRow];
    const lineLen = line.length;

    // 跳过当前字符
    if (currentCol < lineLen - 1) {
      currentCol++;
    } else {
      // 移动到下一行
      currentRow++;
      currentCol = 0;
      continue;
    }

    // 检查是否到达单词末尾
    if (currentCol <= lineLen) {
      const prevChar = currentCol > 0 ? line[currentCol - 1] : ' ';
      const currChar = line[currentCol] || ' ';
      const nextChar = currentCol < lineLen - 1 ? line[currentCol + 1] : ' ';

      // 从单词内部到单词结尾
      if (isWordChar(prevChar) && !isWordChar(currChar)) {
        found++;
        if (found >= count) return { row: currentRow, col: currentCol };
      }
      // 从非单词到空格
      else if (isNonWordChar(prevChar) && /\s/.test(currChar)) {
        found++;
        if (found >= count) return { row: currentRow, col: currentCol };
      }
      // 从空格到单词/非单词
      else if (/\s/.test(prevChar) && (isWordChar(currChar) || isNonWordChar(currChar))) {
        found++;
        if (found >= count) return { row: currentRow, col: currentCol };
      }
    }
  }

  return { row: currentRow, col: currentCol };
}

// 查找下一个单词开头
function findWordStart(buffer, cursor, count = 1) {
  const lines = buffer.lines;
  let currentRow = cursor.row;
  let currentCol = cursor.col;
  let found = 0;

  while (found < count && currentRow < lines.length) {
    const line = lines[currentRow];
    const lineLen = line.length;

    if (currentCol < lineLen - 1) {
      currentCol++;
    } else {
      currentRow++;
      currentCol = 0;
      continue;
    }

    const prevChar = currentCol > 0 ? line[currentCol - 1] : ' ';
    const currChar = line[currentCol] || ' ';

    // 从非单词字符到单词字符
    if (/\s/.test(prevChar) && (isWordChar(currChar) || isNonWordChar(currChar))) {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    }
  }

  return { row: currentRow, col: currentCol };
}

// 查找上一个单词开头
function findPrevWordStart(buffer, cursor, count = 1) {
  const lines = buffer.lines;
  let currentRow = cursor.row;
  let currentCol = cursor.col;
  let found = 0;

  while (found < count && currentRow >= 0) {
    const line = lines[currentRow];

    if (currentCol > 0) {
      currentCol--;
    } else {
      currentRow--;
      if (currentRow >= 0) {
        currentCol = lines[currentRow].length;
      }
      continue;
    }

    const currChar = line[currentCol] || ' ';
    const nextChar = currentCol < line.length - 1 ? line[currentCol + 1] : ' ';

    // 从单词字符到空格
    if ((isWordChar(currChar) || isNonWordChar(currChar)) && /\s/.test(nextChar)) {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    }
  }

  return { row: currentRow, col: currentCol };
}

// 查找行内匹配的括号
function findMatchingPair(buffer, row, col) {
  const line = buffer.getLine(row);
  const pairs = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
  const open = '([{';
  const close = ')]}';

  const char = line[col];
  if (!pairs[char]) return null;

  const isClosing = close.includes(char);
  const targetChar = pairs[char];
  const direction = isClosing ? -1 : 1;

  let depth = 0;
  let c = col;
  let r = row;

  while (r >= 0 && r < buffer.getLineCount()) {
    const currentLine = buffer.getLine(r);
    const maxCol = direction > 0 ? currentLine.length : -1;

    while (c !== maxCol) {
      const currentChar = currentLine[c];

      if (currentChar === char) {
        depth++;
      } else if (currentChar === targetChar) {
        depth--;
        if (depth === 0) {
          return { row: r, col: c };
        }
      }

      c += direction;
    }

    r += direction;
    c = direction > 0 ? 0 : (r >= 0 ? buffer.getLine(r).length - 1 : 0);
  }

  return null;
}

/**
 * NormalMode 模式处理器
 */
export class NormalMode {
  constructor(editor) {
    this.editor = editor;

    // 解析状态
    this.count = 0;
    this.register = null;
    this.operator = null;
    this.operatorPending = false;
  }

  // 重置解析状态
  reset() {
    this.count = 0;
    this.register = null;
    this.operator = null;
    this.operatorPending = false;
  }

  // 处理按键输入
  handle(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return false;

    // 处理数字（计数）
    if (/^[1-9]$/.test(input) || (this.count > 0 && /^[0-9]$/.test(input))) {
      this.count = this.count * 10 + parseInt(input, 10);
      return true;
    }

    // 处理寄存器选择
    if (input === '"') {
      this.operatorPending = true;
      return true;
    }

    // 处理操作符
    if (['d', 'y', 'c', 'p', '>', '<', '=', 'g', 'z'].includes(input)) {
      this.operator = input;
      this.operatorPending = true;
      return true;
    }

    // 处理双字符操作
    if (this.operator === 'g') {
      return this.handleGOperator(input);
    }

    if (this.operator === 'z') {
      return this.handleZOperator(input);
    }

    // 处理操作符 + 动作
    if (this.operatorPending && this.operator) {
      return this.handleOperatorMotion(input);
    }

    // 处理简单动作
    return this.handleMotion(input);
  }

  // 处理 g 前缀操作
  handleGOperator(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return false;

    const count = this.count || 1;

    switch (input) {
      case 'g': // gg - 跳转到文件开头
        buffer.setCursor(Math.max(0, count - 1), 0);
        break;
      case 'e': // ge - 上一个单词结尾
        for (let i = 0; i < count; i++) {
          const pos = findPrevWordStart(buffer, buffer.getCursor());
          buffer.setCursor(pos.row, pos.col);
        }
        break;
      case 'f': // gf - 跳转到文件名（暂不实现）
        break;
      case 'u': // gu - 转小写
        break;
      case 'U': // gU - 转大写
        break;
      case 'd': // gd - 跳转到定义（暂不实现）
        break;
    }

    this.reset();
    return true;
  }

  // 处理 z 前缀操作
  handleZOperator(input) {
    const win = this.editor.getActiveWindow();
    if (!win) return false;

    switch (input) {
      case 'z': // zz - 居中当前行
      case 'z':
        const cursor = this.editor.getCursor();
        win.scrollTo(cursor.row - Math.floor(win.height / 2));
        break;
      case 't': // zt - 滚动到顶部
        win.scrollTo(this.editor.getCursor().row);
        break;
      case 'b': // zb - 滚动到底部
        const cursor2 = this.editor.getCursor();
        win.scrollTo(cursor2.row - win.height + 1);
        break;
    }

    this.reset();
    return true;
  }

  // 处理操作符 + 动作
  handleOperatorMotion(motion) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return false;

    const count = this.count || 1;
    const cursor = buffer.getCursor();
    let start = { ...cursor };
    let end = { ...cursor };

    // 执行动作获取目标位置
    switch (motion) {
      case 'l': case ' ':
        end.col = Math.min(buffer.getLineLength(cursor.row) - 1, cursor.col + count);
        break;
      case 'h':
        end.col = Math.max(0, cursor.col - count);
        break;
      case 'j': case '\n':
        end.row = Math.min(buffer.getLineCount() - 1, cursor.row + count);
        break;
      case 'k':
        end.row = Math.max(0, cursor.row - count);
        break;
      case 'w':
        end = findWordStart(buffer, cursor, count);
        break;
      case 'b':
        end = findPrevWordStart(buffer, cursor, count);
        break;
      case 'e':
        end = findWordEnd(buffer, cursor, count);
        break;
      case '0':
        end.col = 0;
        break;
      case '^':
        const line1 = buffer.getLine(cursor.row);
        end.col = line1.search(/\S/);
        if (end.col === -1) end.col = 0;
        break;
      case '$':
        end.col = buffer.getLineLength(cursor.row) - 1;
        break;
      case 'G':
        end.row = Math.min(buffer.getLineCount() - 1, count - 1);
        end.col = 0;
        break;
      case 'w': case 'W': case 'b': case 'B': case 'e': case 'E':
        // 大写版本（不区分单词）
        break;
      default:
        this.reset();
        return false;
    }

    // 执行操作符
    switch (this.operator) {
      case 'd': // 删除
        const text = buffer.getRange(start.row, start.col, end.row, end.col);
        this.editor.delete(text, this.register);
        if (start.row === end.row) {
          buffer.lines[start.row] = buffer.getLine(start.row).slice(0, start.col) +
            buffer.getLine(end.row).slice(end.col + 1);
        } else {
          // 多行删除（简化）
          for (let i = start.row; i <= end.row; i++) {
            buffer.deleteLine(start.row);
          }
          buffer.lines[start.row] = '';
        }
        buffer.setCursor(start.row, Math.min(start.col, buffer.getLineLength(start.row) - 1));
        break;

      case 'y': // 复制
        const yankText = buffer.getRange(start.row, start.col, end.row, end.col + 1);
        this.editor.yank(yankText, this.register);
        break;

      case 'c': // 修改
        const changeText = buffer.getRange(start.row, start.col, end.row, end.col + 1);
        this.editor.delete(changeText, this.register);
        this.editor.setMode('insert');
        break;
    }

    this.reset();
    return true;
  }

  // 处理简单动作
  handleMotion(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer) return false;

    const cursor = buffer.getCursor();
    const count = this.count || 1;

    switch (input) {
      // 基本移动
      case 'h':
        buffer.moveCursor(0, -count);
        break;
      case 'j':
        buffer.moveCursor(count, 0);
        break;
      case 'k':
        buffer.moveCursor(-count, 0);
        break;
      case 'l': case ' ':
        buffer.moveCursor(0, count);
        break;

      // 单词移动
      case 'w': {
        const pos = findWordStart(buffer, cursor, count);
        buffer.setCursor(pos.row, pos.col);
        break;
      }
      case 'b': {
        const pos = findPrevWordStart(buffer, cursor, count);
        buffer.setCursor(pos.row, pos.col);
        break;
      }
      case 'e': {
        const pos = findWordEnd(buffer, cursor, count);
        buffer.setCursor(pos.row, Math.max(0, pos.col - 1));
        break;
      }

      // 行内移动
      case '0':
        buffer.setCursor(cursor.row, 0);
        break;
      case '^': {
        const line = buffer.getLine(cursor.row);
        const firstNonSpace = line.search(/\S/);
        buffer.setCursor(cursor.row, firstNonSpace === -1 ? 0 : firstNonSpace);
        break;
      }
      case '$': {
        buffer.setCursor(cursor.row, Math.max(0, buffer.getLineLength(cursor.row) - 1));
        break;
      }

      // 屏幕移动
      case 'H': // 移动到屏幕顶部
        const win = this.editor.getActiveWindow();
        if (win) {
          buffer.setCursor(win.scrollLine, 0);
        }
        break;
      case 'M': // 移动到屏幕中部
        const win2 = this.editor.getActiveWindow();
        if (win2) {
          buffer.setCursor(win2.scrollLine + Math.floor(win2.height / 2), 0);
        }
        break;
      case 'L': // 移动到屏幕底部
        const win3 = this.editor.getActiveWindow();
        if (win3) {
          buffer.setCursor(win3.scrollLine + win3.height - 1, 0);
        }
        break;

      // 滚动
      case '<C-f>': case '<PageDown>':
        const win4 = this.editor.getActiveWindow();
        if (win4) {
          win4.scroll(win4.height - 2);
        }
        break;
      case '<C-b>': case '<PageUp>':
        const win5 = this.editor.getActiveWindow();
        if (win5) {
          win5.scroll(-(win5.height - 2));
        }
        break;
      case '<C-d>':
        const win6 = this.editor.getActiveWindow();
        if (win6) {
          win6.scroll(Math.floor(win6.height / 2));
        }
        break;
      case '<C-u>':
        const win7 = this.editor.getActiveWindow();
        if (win7) {
          win7.scroll(-Math.floor(win7.height / 2));
        }
        break;

      // 文件位置
      case 'G':
        const targetLine = count > 1 ? count - 1 : buffer.getLineCount() - 1;
        buffer.setCursor(targetLine, 0);
        break;
      case 'gg':
        buffer.setCursor(Math.max(0, count - 1), 0);
        break;

      // 插入模式
      case 'i':
        this.editor.setMode('insert');
        break;
      case 'I': {
        const line = buffer.getLine(cursor.row);
        const firstNonSpace = line.search(/\S/);
        buffer.setCursor(cursor.row, firstNonSpace === -1 ? 0 : firstNonSpace);
        this.editor.setMode('insert');
        break;
      }
      case 'a':
        buffer.moveCursor(0, 1);
        this.editor.setMode('insert');
        break;
      case 'A':
        buffer.setCursor(cursor.row, buffer.getLineLength(cursor.row));
        this.editor.setMode('insert');
        break;
      case 'o':
        buffer.appendLine(cursor.row, '');
        buffer.setCursor(cursor.row + 1, 0);
        this.editor.setMode('insert');
        break;
      case 'O':
        buffer.lines.splice(cursor.row, 0, '');
        buffer.setCursor(cursor.row, 0);
        this.editor.setMode('insert');
        break;

      // 删除/修改
      case 'x':
        const deleted = buffer.delete(1);
        this.editor.delete(deleted, this.register);
        break;
      case 'X':
        buffer.moveCursor(0, -1);
        const deleted2 = buffer.delete(1);
        this.editor.delete(deleted2, this.register);
        break;
      case 'dd':
        const deletedLine = buffer.deleteLine(cursor.row);
        this.editor.delete(deletedLine + '\n', this.register);
        break;
      case 'cc':
        buffer.lines[cursor.row] = '';
        buffer.setCursor(cursor.row, 0);
        this.editor.setMode('insert');
        break;
      case 'C':
        buffer.lines[cursor.row] = '';
        buffer.setCursor(cursor.row, 0);
        this.editor.setMode('insert');
        break;
      case 's':
        buffer.delete(1);
        this.editor.setMode('insert');
        break;
      case 'S':
        buffer.lines[cursor.row] = '';
        this.editor.setMode('insert');
        break;

      // 粘贴
      case 'p': {
        const text = this.editor.paste(this.register);
        if (text) {
          buffer.insert(text, { row: cursor.row + 1, col: 0 });
        }
        break;
      }
      case 'P': {
        const text2 = this.editor.paste(this.register);
        if (text2) {
          buffer.insert(text2, cursor);
        }
        break;
      }

      // 替换
      case 'r':
        // 等待下一个字符
        this.operator = 'r';
        this.operatorPending = true;
        return true;
      case 'R':
        this.editor.setMode('replace');
        break;

      // 可视模式
      case 'v':
        this.editor.setMode('visual', 'v');
        buffer.selection = {
          start: { ...cursor },
          end: { ...cursor },
          visualMode: 'v'
        };
        break;
      case 'V':
        this.editor.setMode('visual', 'V');
        buffer.selection = {
          start: { ...cursor },
          end: { ...cursor },
          visualMode: 'V'
        };
        break;

      // 撤销/重做
      case 'u':
        buffer.undo();
        break;
      case '<C-r>':
        buffer.redo();
        break;

      // 命令模式
      case ':':
        this.editor.setMode('command');
        break;

      // 搜索
      case '/':
        this.editor.setMode('search');
        break;
      case '?':
        this.editor.setMode('search');
        break;
      case 'n':
        this.editor.searchNext();
        break;
      case 'N':
        this.editor.searchPrev();
        break;

      // 标记
      case 'm':
        this.operator = 'm';
        this.operatorPending = true;
        return true;
      case "'":
      case '`':
        this.operator = input;
        this.operatorPending = true;
        return true;

      // 跳转
      case '%':
        const match = findMatchingPair(buffer, cursor.row, cursor.col);
        if (match) {
          buffer.setCursor(match.row, match.col);
        }
        break;

      // 重复
      case '.':
        // 重复上一个命令（需要历史记录）
        break;

      // 窗口操作
      case '<C-w>':
        // 窗口命令前缀
        return true;

      // 折叠
      case 'z':
        this.operator = 'z';
        this.operatorPending = true;
        return true;

      // Tab 切换
      case 'gt':
        this.editor.gotoTab(this.count > 1 ? this.count - 1 : undefined);
        break;
      case 'gT':
        this.editor.gotoTab(this.editor.tabManager.activeTabIndex - (this.count || 1));
        break;

      default:
        return false;
    }

    this.reset();
    return true;
  }
}
