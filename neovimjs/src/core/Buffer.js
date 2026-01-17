/**
 * Buffer - 文本缓冲区管理
 * 负责文本存储、编辑操作、光标移动等
 */
export class Buffer {
  constructor(content = '', options = {}) {
    this.id = Buffer.generateId();
    this.name = options.name || `buffer-${this.id}`;
    this.path = options.path || null;
    this.filetype = options.filetype || 'text';
    this.modified = false;
    this.readonly = options.readonly || false;

    // 存储文本行
    this.lines = content.length > 0 ? content.split('\n') : [''];

    // 光标位置 (0-indexed)
    this.cursor = { row: 0, col: 0 };

    // 可选区域（可视模式）
    this.selection = {
      start: null,  // {row, col}
      end: null,     // {row, col}
      visualMode: null // 'v' | 'V' | '<C-v>'
    };

    // 标记
    this.marks = {};

    // 折叠
    this.folds = [];

    // 变更历史（用于 undo/redo）
    this.history = [];
    this.historyIndex = -1;
    this.historyLimit = 1000;

    // 监听器
    this.listeners = {
      change: [],
      cursorMove: []
    };
  }

  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // ========== 内容获取 ==========

  getLineCount() {
    return this.lines.length;
  }

  getLine(row) {
    return this.lines[row] || '';
  }

  getLineLength(row) {
    return this.getLine(row).length;
  }

  getContent() {
    return this.lines.join('\n');
  }

  getRange(startRow, startCol, endRow, endCol) {
    if (startRow === endRow) {
      return this.lines[startRow].slice(startCol, endCol);
    }

    const result = [this.lines[startRow].slice(startCol)];
    for (let i = startRow + 1; i < endRow; i++) {
      result.push(this.lines[i]);
    }
    result.push(this.lines[endRow].slice(0, endCol));
    return result.join('\n');
  }

  // ========== 光标操作 ==========

  getCursor() {
    return { ...this.cursor };
  }

  setCursor(row, col) {
    const oldCursor = { ...this.cursor };
    this.cursor.row = Math.max(0, Math.min(row, this.lines.length - 1));
    this.cursor.col = Math.max(0, Math.min(col, this.getLineLength(this.cursor.row)));
    this.emit('cursorMove', { old: oldCursor, new: { ...this.cursor } });
  }

  moveCursor(dRow, dCol) {
    this.setCursor(this.cursor.row + dRow, this.cursor.col + dCol);
  }

  // ========== 编辑操作 ==========

  insert(text, pos = null) {
    const position = pos || this.cursor;
    this.saveHistory();

    const { row, col } = position;
    const line = this.lines[row];

    if (text.includes('\n')) {
      const newLines = text.split('\n');
      this.lines[row] = line.slice(0, col) + newLines[0];
      this.lines.splice(row + 1, 0, ...newLines.slice(1).map((l, i) =>
        i === newLines.length - 2 ? l + line.slice(col) : l
      ));
    } else {
      this.lines[row] = line.slice(0, col) + text + line.slice(col);
    }

    this.modified = true;
    this.emit('change', { type: 'insert', text, position });
  }

  delete(length = 1, pos = null) {
    const position = pos || this.cursor;
    this.saveHistory();

    const { row, col } = position;
    const line = this.lines[row];
    const deleted = line.slice(col, col + length);
    this.lines[row] = line.slice(0, col) + line.slice(col + length);

    this.modified = true;
    this.emit('change', { type: 'delete', text: deleted, position });
    return deleted;
  }

  deleteLine(row) {
    this.saveHistory();
    const deleted = this.lines.splice(row, 1)[0];
    if (this.lines.length === 0) {
      this.lines.push('');
    }
    this.modified = true;
    this.emit('change', { type: 'deleteLine', row, text: deleted });
    return deleted;
  }

  replaceLine(row, text) {
    this.saveHistory();
    const old = this.lines[row];
    this.lines[row] = text;
    this.modified = true;
    this.emit('change', { type: 'replaceLine', row, old, new: text });
  }

  appendLine(row, text) {
    this.saveHistory();
    this.lines.splice(row + 1, 0, text);
    this.modified = true;
    this.emit('change', { type: 'appendLine', row, text });
  }

  // ========== 搜索与替换 ==========

  find(pattern, options = {}) {
    const {
      startRow = 0,
      startCol = 0,
      caseSensitive = false,
      regex = false,
      backwards = false
    } = options;

    let searchRegex;
    try {
      const flags = caseSensitive ? 'g' : 'gi';
      searchRegex = regex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch (e) {
      return null;
    }

    if (backwards) {
      for (let i = startRow; i >= 0; i--) {
        const line = this.lines[i];
        const searchCol = i === startRow ? startCol : line.length;
        const matches = [...line.matchAll(searchRegex)];
        const match = matches.find(m => m.index < searchCol);
        if (match) {
          return { row: i, col: match.index, text: match[0], length: match[0].length };
        }
      }
    } else {
      for (let i = startRow; i < this.lines.length; i++) {
        const line = this.lines[i];
        const searchCol = i === startRow ? startCol : 0;
        searchRegex.lastIndex = searchCol;
        const match = searchRegex.exec(line);
        if (match) {
          return { row: i, col: match.index, text: match[0], length: match[0].length };
        }
      }
    }

    return null;
  }

  findAll(pattern, options = {}) {
    const { caseSensitive = false, regex = false } = options;
    const flags = caseSensitive ? 'g' : 'gi';
    let searchRegex;
    try {
      searchRegex = regex ? new RegExp(pattern, flags) : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch (e) {
      return [];
    }

    const results = [];
    for (let i = 0; i < this.lines.length; i++) {
      const matches = [...this.lines[i].matchAll(searchRegex)];
      for (const match of matches) {
        results.push({ row: i, col: match.index, text: match[0], length: match[0].length });
      }
    }
    return results;
  }

  // ========== 撤销/重做 ==========

  saveHistory() {
    // 删除当前位置之后的历史
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      lines: [...this.lines],
      cursor: { ...this.cursor }
    });
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex >= 0) {
      const state = this.history[this.historyIndex];
      this.lines = [...state.lines];
      this.cursor = { ...state.cursor };
      this.historyIndex--;
      this.modified = true;
      this.emit('change', { type: 'undo' });
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.lines = [...state.lines];
      this.cursor = { ...state.cursor };
      this.modified = true;
      this.emit('change', { type: 'redo' });
      return true;
    }
    return false;
  }

  // ========== 标记 ==========

  setMark(name, pos = null) {
    this.marks[name] = pos || { ...this.cursor };
  }

  getMark(name) {
    return this.marks[name] || null;
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

  // ========== 实用方法 ==========

  clone() {
    const buffer = new Buffer(this.getContent(), {
      name: this.name,
      path: this.path,
      filetype: this.filetype,
      readonly: this.readonly
    });
    buffer.cursor = { ...this.cursor };
    return buffer;
  }

  clear() {
    this.saveHistory();
    this.lines = [''];
    this.cursor = { row: 0, col: 0 };
    this.modified = true;
    this.emit('change', { type: 'clear' });
  }
}
