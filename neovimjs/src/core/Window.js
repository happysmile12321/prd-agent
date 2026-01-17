/**
 * Window - 窗口系统
 * 负责管理屏幕区域、缓冲区显示等
 */
export class Window {
  constructor(options = {}) {
    this.id = Window.generateId();
    this.buffer = options.buffer || null;
    this.parent = options.parent || null;

    // 窗口位置和大小
    this.row = options.row || 0;
    this.col = options.col || 0;
    this.height = options.height || 24;
    this.width = options.width || 80;

    // 滚动位置
    this.scrollLine = 0;
    this.scrollCol = 0;

    // 视口偏移（用于显示行号等）
    this.widthOffset = 0;  // 行号宽度

    // 子窗口（分割）
    this.children = [];
    this.splitType = null; // 'horizontal' | 'vertical'
    this.splitRatio = 0.5; // 分割比例

    // 状态
    this.focus = options.focus !== false;
    this.valid = true;     // 窗口是否有效（未关闭）
  }

  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // ========== 尺寸和位置 ==========

  setSize(height, width) {
    this.height = height;
    this.width = width;
    this.updateChildren();
  }

  setPosition(row, col) {
    this.row = row;
    this.col = col;
    this.updateChildren();
  }

  getGeometry() {
    return {
      row: this.row,
      col: this.col,
      height: this.height,
      width: this.width
    };
  }

  // ========== 滚动 ==========

  scrollTo(line, col = 0) {
    this.scrollLine = Math.max(0, line);
    this.scrollCol = Math.max(0, col);
  }

  scroll(deltaLines, deltaCols = 0) {
    this.scrollTo(this.scrollLine + deltaLines, this.scrollCol + deltaCols);
  }

  ensureCursorVisible(cursor) {
    const { row, col } = cursor;
    const topLine = this.scrollLine;
    const bottomLine = this.scrollLine + this.height - 1;
    const leftCol = this.scrollCol;
    const rightCol = this.scrollCol + this.width - this.widthOffset - 1;

    // 垂直滚动
    if (row < topLine) {
      this.scrollLine = row;
    } else if (row > bottomLine - 2) {  // 保留2行边距
      this.scrollLine = row - this.height + 3;
    }
    this.scrollLine = Math.max(0, this.scrollLine);

    // 水平滚动
    if (col < leftCol) {
      this.scrollCol = col;
    } else if (col > rightCol - 5) {  // 保留5列边距
      this.scrollCol = col - this.width + this.widthOffset + 6;
    }
    this.scrollCol = Math.max(0, this.scrollCol);
  }

  // ========== 窗口分割 ==========

  split(direction = 'horizontal') {
    if (this.children.length > 0) {
      return null; // 已经分割过
    }

    this.splitType = direction;

    const child1 = new Window({
      buffer: this.buffer,
      parent: this,
      focus: true
    });

    const child2 = new Window({
      buffer: this.buffer?.clone(),
      parent: this,
      focus: false
    });

    this.children = [child1, child2];
    this.updateChildren();

    return { first: child1, second: child2 };
  }

  close() {
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      if (index !== -1) {
        this.parent.children.splice(index, 1);
        if (this.parent.children.length === 1) {
          // 只剩一个子窗口，合并
          const sibling = this.parent.children[0];
          this.parent.buffer = sibling.buffer;
          this.parent.children = [];
          this.parent.splitType = null;
        }
      }
    }
    this.valid = false;
  }

  updateChildren() {
    if (this.children.length !== 2) return;

    const [first, second] = this.children;

    if (this.splitType === 'horizontal') {
      const halfHeight = Math.floor(this.height * this.splitRatio);
      first.setPosition(this.row, this.col);
      first.setSize(halfHeight, this.width);
      second.setPosition(this.row + halfHeight, this.col);
      second.setSize(this.height - halfHeight, this.width);
    } else {
      const halfWidth = Math.floor(this.width * this.splitRatio);
      first.setPosition(this.row, this.col);
      first.setSize(this.height, halfWidth);
      second.setPosition(this.row, this.col + halfWidth);
      second.setSize(this.height, this.width - halfWidth);
    }
  }

  // ========== 焦点 ==========

  setFocus(focus) {
    this.focus = focus;
  }

  isFocused() {
    return this.focus && this.valid;
  }

  // ========== 实用方法 ==========

  getVisibleLines() {
    if (!this.buffer) return [];

    const startLine = Math.floor(this.scrollLine);
    const endLine = Math.min(startLine + this.height, this.buffer.getLineCount());

    const lines = [];
    for (let i = startLine; i < endLine; i++) {
      const line = this.buffer.getLine(i);
      const displayLine = line.slice(this.scrollCol);
      lines.push({
        number: i + 1,
        text: displayLine,
        indent: this.scrollCol
      });
    }
    return lines;
  }

  getBuffer() {
    return this.buffer;
  }

  setBuffer(buffer) {
    this.buffer = buffer;
  }
}
