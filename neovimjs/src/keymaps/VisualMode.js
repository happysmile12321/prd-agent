/**
 * VisualMode - Visual 模式处理器
 * 实现文本选择操作
 */

// 复用 NormalMode 的工具函数
function isWordChar(char) {
  return /[a-zA-Z0-9_]/.test(char);
}

function findWordEnd(buffer, cursor, count = 1) {
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

    if (isWordChar(prevChar) && !isWordChar(currChar)) {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    } else if (prevChar && !isWordChar(prevChar) && !isWordChar(currChar) && /\s/.test(currChar)) {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    } else if (/\s/.test(prevChar) && !isWordChar(currChar) && currChar !== ' ') {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    }
  }

  return { row: currentRow, col: currentCol };
}

function findWordStart(buffer, cursor, count = 1) {
  const lines = buffer.lines;
  let currentRow = cursor.row;
  let currentCol = cursor.col;
  let found = 0;

  while (found < count && currentRow < lines.length) {
    const line = lines[currentRow];

    if (currentCol < line.length - 1) {
      currentCol++;
    } else {
      currentRow++;
      currentCol = 0;
      continue;
    }

    const prevChar = currentCol > 0 ? line[currentCol - 1] : ' ';
    const currChar = line[currentCol] || ' ';

    if (/\s/.test(prevChar) && currChar !== ' ') {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    }
  }

  return { row: currentRow, col: currentCol };
}

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

    if (currChar !== ' ' && nextChar === ' ') {
      found++;
      if (found >= count) return { row: currentRow, col: currentCol };
    }
  }

  return { row: currentRow, col: currentCol };
}

/**
 * VisualMode 类
 */
export class VisualMode {
  constructor(editor) {
    this.editor = editor;
    this.count = 0;
    this.operator = null;
  }

  reset() {
    this.count = 0;
    this.operator = null;
  }

  handle(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer || !buffer.selection) return false;

    const { start, visualMode } = buffer.selection;
    const cursor = buffer.getCursor();

    // 处理数字
    if (/^[1-9]$/.test(input) || (this.count > 0 && /^[0-9]$/.test(input))) {
      this.count = this.count * 10 + parseInt(input, 10);
      return true;
    }

    // 处理操作符
    if (['d', 'y', 'c', 'p', '>', '<', '~'].includes(input)) {
      this.operator = input;
      return this.handleOperator();
    }

    // 处理移动
    return this.handleMotion(input);
  }

  handleMotion(input) {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer || !buffer.selection) return false;

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
      case 'l':
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
      case '$':
        buffer.setCursor(cursor.row, Math.max(0, buffer.getLineLength(cursor.row) - 1));
        break;

      // 文件位置
      case 'G':
        buffer.setCursor(Math.min(buffer.getLineCount() - 1, Math.max(0, count - 1)), 0);
        break;
      case 'g':
        this.operator = 'g';
        return true;
      case 'gg':
        buffer.setSelection({ ...buffer.selection.start }, { row: 0, col: 0 }, buffer.selection.visualMode);
        buffer.setCursor(0, 0);
        break;

      // 全选
      case '%': // 暂不实现
        break;

      // 退出可视模式
      case '<Esc>':
      case '<C-c>':
        this.editor.setMode('normal');
        buffer.selection = null;
        break;

      default:
        this.reset();
        return false;
    }

    // 更新选择结束位置
    if (buffer.selection) {
      buffer.selection.end = { ...buffer.getCursor() };
    }

    this.reset();
    return true;
  }

  handleOperator() {
    const buffer = this.editor.getCurrentBuffer();
    if (!buffer || !buffer.selection) return false;

    const { start, end } = buffer.selection;
    const sRow = Math.min(start.row, end.row);
    const sCol = Math.min(start.col, end.col);
    const eRow = Math.max(start.row, end.row);
    const eCol = Math.max(start.col, end.col);

    switch (this.operator) {
      case 'd': // 删除选择
      case 'x': // 同上
        const text = buffer.getRange(sRow, sCol, eRow, eCol);
        this.editor.delete(text, null);
        // 删除后清空选择
        if (sRow === eRow) {
          buffer.lines[sRow] = buffer.getLine(sRow).slice(0, sCol) +
            buffer.getLine(eRow).slice(eCol + 1);
        } else {
          // 多行删除
          for (let i = eRow; i >= sRow; i--) {
            if (i === sRow) {
              buffer.lines[sRow] = buffer.getLine(sRow).slice(0, sCol);
            } else if (i === eRow) {
              buffer.lines[sRow] += buffer.getLine(eRow).slice(eCol + 1);
              buffer.lines.splice(i, 1);
            } else {
              buffer.lines.splice(i, 1);
            }
          }
        }
        buffer.setCursor(sRow, Math.min(sCol, buffer.getLineLength(sRow) - 1));
        this.editor.setMode('normal');
        buffer.selection = null;
        break;

      case 'y': // 复制选择
        const yankText = buffer.getRange(sRow, sCol, eRow, eCol + 1);
        this.editor.yank(yankText, null);
        this.editor.setMode('normal');
        buffer.selection = null;
        buffer.setCursor(start.row, start.col);
        break;

      case 'c': // 修改选择
        const changeText = buffer.getRange(sRow, sCol, eRow, eCol);
        this.editor.delete(changeText, null);
        if (sRow === eRow) {
          buffer.lines[sRow] = buffer.getLine(sRow).slice(0, sCol) +
            buffer.getLine(eRow).slice(eCol);
        }
        buffer.setCursor(sRow, Math.min(sCol, buffer.getLineLength(sRow)));
        this.editor.setMode('insert');
        buffer.selection = null;
        break;

      case '>': // 增加缩进
        const indent = ' '.repeat(this.editor.options.shiftwidth);
        for (let i = sRow; i <= eRow; i++) {
          buffer.lines[i] = indent + buffer.lines[i];
        }
        this.editor.setMode('normal');
        buffer.selection = null;
        break;

      case '<': // 减少缩进
        for (let i = sRow; i <= eRow; i++) {
          const line = buffer.getLine(i);
          if (line.startsWith(' ')) {
            buffer.lines[i] = line.replace(/^ {1,4}/, '');
          }
        }
        this.editor.setMode('normal');
        buffer.selection = null;
        break;

      case '~': // 切换大小写
        for (let i = sRow; i <= eRow; i++) {
          const line = buffer.getLine(i);
          const startCol = i === sRow ? sCol : 0;
          const endCol = i === eRow ? eCol : line.length - 1;
          let newLine = '';
          for (let j = 0; j < line.length; j++) {
            if (j >= startCol && j <= endCol) {
              const char = line[j];
              newLine += char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase();
            } else {
              newLine += line[j];
            }
          }
          buffer.lines[i] = newLine;
        }
        this.editor.setMode('normal');
        buffer.selection = null;
        break;
    }

    this.reset();
    return true;
  }
}
