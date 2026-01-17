/**
 * Tab - 标签页系统
 * 管理多个窗口布局
 */
import { Window } from './Window.js';

export class Tab {
  constructor(options = {}) {
    this.id = Tab.generateId();
    this.name = options.name || null;
    this.windows = [];
    this.activeWindowIndex = 0;

    // 创建初始窗口
    if (options.buffer) {
      const win = new Window({ buffer: options.buffer, focus: true });
      this.windows.push(win);
    }
  }

  static generateId() {
    return Math.random().toString(36).substring(2, 11);
  }

  // ========== 窗口管理 ==========

  addWindow(buffer) {
    const win = new Window({ buffer, focus: false });
    this.windows.push(win);
    return win;
  }

  getWindow(index) {
    return this.windows[index] || null;
  }

  getActiveWindow() {
    return this.windows[this.activeWindowIndex] || null;
  }

  setActiveWindow(index) {
    if (index >= 0 && index < this.windows.length) {
      this.windows.forEach((w, i) => w.setFocus(i === index));
      this.activeWindowIndex = index;
      return true;
    }
    return false;
  }

  closeWindow(index) {
    if (this.windows.length <= 1) {
      return false; // 不能关闭最后一个窗口
    }

    const closed = this.windows.splice(index, 1)[0];
    closed.close();

    if (this.activeWindowIndex >= this.windows.length) {
      this.activeWindowIndex = this.windows.length - 1;
    }
    this.windows[this.activeWindowIndex].setFocus(true);

    return true;
  }

  // ========== 窗口分割 ==========

  splitWindow(direction = 'horizontal', buffer = null) {
    const activeWin = this.getActiveWindow();
    if (!activeWin) return null;

    const result = activeWin.split(direction);
    if (result) {
      // 重新构建窗口列表
      this.rebuildWindowList();
      return result;
    }
    return null;
  }

  rebuildWindowList() {
    // 递归收集所有叶子窗口
    const collectLeaves = (win) => {
      if (win.children.length > 0) {
        return win.children.flatMap(collectLeaves);
      }
      return win.valid ? [win] : [];
    };

    // 从根窗口开始收集（这里简化处理，实际需要根窗口引用）
    // 暂时保留当前窗口列表
  }

  // ========== 实用方法 ==========

  getWindowCount() {
    return this.windows.length;
  }

  forEachWindow(callback) {
    this.windows.forEach(callback);
  }
}

/**
 * TabManager - 标签页管理器
 */
export class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTabIndex = 0;
  }

  // ========== 标签页管理 ==========

  addTab(options = {}) {
    const tab = new Tab(options);
    this.tabs.push(tab);
    this.setActiveTab(this.tabs.length - 1);
    return tab;
  }

  getTab(index) {
    return this.tabs[index] || null;
  }

  getActiveTab() {
    return this.tabs[this.activeTabIndex] || null;
  }

  setActiveTab(index) {
    if (index >= 0 && index < this.tabs.length) {
      this.activeTabIndex = index;
      return true;
    }
    return false;
  }

  closeTab(index) {
    if (this.tabs.length <= 1) {
      return false; // 不能关闭最后一个标签页
    }

    this.tabs.splice(index, 1);

    if (this.activeTabIndex >= this.tabs.length) {
      this.activeTabIndex = this.tabs.length - 1;
    }

    return true;
  }

  // ========== 实用方法 ==========

  getTabCount() {
    return this.tabs.length;
  }

  forEachTab(callback) {
    this.tabs.forEach(callback);
  }

  getActiveWindow() {
    const tab = this.getActiveTab();
    return tab ? tab.getActiveWindow() : null;
  }
}
