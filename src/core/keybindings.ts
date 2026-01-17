/**
 * 键位绑定系统 - 支持 Vim 风格
 * 可通过配置文件自定义，支持热重载
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { getDataDir } from './config.js';
import { watch } from 'chokidar';

// ===== 类型定义 =====

export type KeymapMode = 'normal' | 'insert' | 'visual' | 'command';
export type KeymapAction =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'move_top'
  | 'move_bottom'
  | 'page_up'
  | 'page_down'
  | 'select'
  | 'confirm'
  | 'cancel'
  | 'back'
  | 'quit'
  | 'save'
  | 'delete'
  | 'yank'
  | 'paste'
  | 'undo'
  | 'redo'
  | 'search'
  | 'search_next'
  | 'search_prev'
  | 'command_mode'
  | 'panel_spr'
  | 'panel_practice'
  | 'panel_agent'
  | 'panel_help'
  | 'panel_menu'
  | 'custom';

export interface Keybinding {
  keys: string[];
  action: KeymapAction;
  description?: string;
  mode?: KeymapMode;
}

export interface KeymapConfig {
  normal: Keybinding[];
  insert: Keybinding[];
  visual: Keybinding[];
  command: Keybinding[];
  customActions?: Record<string, { description: string; handler: string }>;
}

// ===== 默认 Vim 风格键位 =====

const DEFAULT_KEYMAP: KeymapConfig = {
  // 普通模式
  normal: [
    // 移动
    { keys: ['k', 'C-p'], action: 'move_up', description: '向上移动' },
    { keys: ['j', 'C-j', 'C-n'], action: 'move_down', description: '向下移动' },
    { keys: ['h', 'C-h'], action: 'move_left', description: '向左移动' },
    { keys: ['l', ' ', 'C-l'], action: 'move_right', description: '向右移动' },

    // 快速移动
    { keys: ['gg'], action: 'move_top', description: '跳到顶部' },
    { keys: ['G'], action: 'move_bottom', description: '跳到底部' },
    { keys: ['C-b'], action: 'page_up', description: '向上翻页' },
    { keys: ['C-f'], action: 'page_down', description: '向下翻页' },
    { keys: ['C-u'], action: 'page_up', description: '向上半页' },
    { keys: ['C-d'], action: 'page_down', description: '向下半页' },

    // 操作
    { keys: ['Enter', 'o'], action: 'select', description: '选择/确认' },
    { keys: ['i', 'a'], action: 'confirm', description: '进入编辑模式' },
    { keys: ['escape', '^['], action: 'cancel', description: '取消/返回' },

    // 删除
    { keys: ['dd', 'x'], action: 'delete', description: '删除' },
    { keys: ['dw'], action: 'delete', description: '删除单词' },

    // 复制粘贴
    { keys: ['yy', 'Y'], action: 'yank', description: '复制' },
    { keys: ['p'], action: 'paste', description: '粘贴' },

    // 撤销重做
    { keys: ['u'], action: 'undo', description: '撤销' },
    { keys: ['C-r'], action: 'redo', description: '重做' },

    // 搜索
    { keys: ['/'], action: 'search', description: '搜索' },
    { keys: ['n'], action: 'search_next', description: '下一个搜索结果' },
    { keys: ['N'], action: 'search_prev', description: '上一个搜索结果' },

    // 命令模式
    { keys: [':'], action: 'command_mode', description: '命令模式' },

    // 退出
    { keys: ['ZZ', 'ZQ'], action: 'quit', description: '退出' },
    { keys: ['q'], action: 'quit', description: '退出' },

    // 面板快捷键
    { keys: ['s'], action: 'panel_spr', description: 'SPR 面板' },
    { keys: ['p'], action: 'panel_practice', description: 'Practice 面板' },
    { keys: ['a'], action: 'panel_agent', description: 'Agent 面板' },
    { keys: ['?', 'h'], action: 'panel_help', description: '帮助面板' },
    { keys: ['b'], action: 'back', description: '返回' },
  ],

  // 插入模式
  insert: [
    { keys: ['escape', 'C-c'], action: 'cancel', description: '退出插入模式' },
    { keys: ['C-w'], action: 'delete', description: '删除单词' },
    { keys: ['C-u'], action: 'undo', description: '撤销' },
  ],

  // 可视模式
  visual: [
    { keys: ['j'], action: 'move_down', description: '向下选择' },
    { keys: ['k'], action: 'move_up', description: '向上选择' },
    { keys: ['escape'], action: 'cancel', description: '退出可视模式' },
    { keys: ['y'], action: 'yank', description: '复制选择' },
    { keys: ['d'], action: 'delete', description: '删除选择' },
  ],

  // 命令模式
  command: [
    { keys: ['escape'], action: 'cancel', description: '取消命令' },
    { keys: ['Enter'], action: 'confirm', description: '执行命令' },
    { keys: ['w'], action: 'save', description: '保存' },
    { keys: ['q'], action: 'quit', description: '退出' },
    { keys: ['wq', 'x'], action: 'quit', description: '保存并退出' },
    { keys: ['q!'], action: 'quit', description: '强制退出' },
  ],
};

// ===== 键位管理器 =====

class KeymapManager {
  private config: KeymapConfig;
  private configPath: string;
  private mode: KeymapMode = 'normal';
  private keyBuffer: string[] = [];
  private keyBufferTimeout: NodeJS.Timeout | null = null;
  private listeners: Set<(config: KeymapConfig) => void> = new Set();
  private watcher: any = null;

  constructor() {
    this.configPath = resolve(getDataDir(), 'keybindings.json');
    this.config = this.loadConfig();
  }

  // 加载配置
  private loadConfig(): KeymapConfig {
    if (existsSync(this.configPath)) {
      try {
        const custom = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        // 合并默认配置和自定义配置
        return {
          normal: [...DEFAULT_KEYMAP.normal, ...(custom.normal || [])],
          insert: [...DEFAULT_KEYMAP.insert, ...(custom.insert || [])],
          visual: [...DEFAULT_KEYMAP.visual, ...(custom.visual || [])],
          command: [...DEFAULT_KEYMAP.command, ...(custom.command || [])],
          customActions: custom.customActions,
        };
      } catch (error) {
        console.error('Failed to load keybindings, using defaults:', error);
        return DEFAULT_KEYMAP;
      }
    }
    return DEFAULT_KEYMAP;
  }

  // 保存默认配置到文件
  saveDefaultConfig(): void {
    const dir = resolve(getDataDir());
    if (!existsSync(dir)) {
      writeFileSync(this.configPath, JSON.stringify(DEFAULT_KEYMAP, null, 2));
    }
  }

  // 获取当前配置
  getConfig(): KeymapConfig {
    return this.config;
  }

  // 设置模式
  setMode(mode: KeymapMode): void {
    this.mode = mode;
    this.keyBuffer = [];
  }

  // 获取当前模式
  getMode(): KeymapMode {
    return this.mode;
  }

  // 查找按键对应的动作
  lookup(key: string): KeymapAction | null {
    const modeBindings = this.config[this.mode];

    // 处理组合键
    this.keyBuffer.push(key);

    // 清除超时的按键缓冲
    if (this.keyBufferTimeout) {
      clearTimeout(this.keyBufferTimeout);
    }
    this.keyBufferTimeout = setTimeout(() => {
      this.keyBuffer = [];
    }, 1000);

    const keySequence = this.keyBuffer.join('');

    // 查找精确匹配
    for (const binding of modeBindings) {
      for (const bindingKey of binding.keys) {
        if (keySequence === bindingKey) {
          this.keyBuffer = [];
          return binding.action;
        }
      }
    }

    // 检查是否可能有更长的匹配
    const hasLongerMatch = modeBindings.some(binding =>
      binding.keys.some(k => k.startsWith(keySequence) && k !== keySequence)
    );

    if (!hasLongerMatch) {
      this.keyBuffer = [];
    }

    return null;
  }

  // 获取动作描述
  getActionDescription(action: KeymapAction): string | undefined {
    for (const mode of ['normal', 'insert', 'visual', 'command'] as KeymapMode[]) {
      const bindings = this.config[mode];
      const binding = bindings.find(b => b.action === action);
      if (binding?.description) {
        return binding.description;
      }
    }
    return undefined;
  }

  // 获取模式下的所有键位
  getBindingsForMode(mode: KeymapMode): Keybinding[] {
    return this.config[mode];
  }

  // 重新加载配置
  reload(): void {
    this.config = this.loadConfig();
    this.notifyListeners();
  }

  // 监听配置变化
  onChange(callback: (config: KeymapConfig) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.config));
  }

  // 启动配置文件监听
  watchConfig(): void {
    if (this.watcher) return;

    this.watcher = watch(this.configPath).on('change', () => {
      console.log('Keybindings config changed, reloading...');
      this.reload();
    });
  }

  // 停止监听
  unwatchConfig(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  // 解析命令
  parseCommand(cmd: string): { action: KeymapAction | null; args: string[] } {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0];

    switch (command) {
      case 'w':
      case 'write':
        return { action: 'save', args: parts.slice(1) };
      case 'wq':
      case 'x':
        return { action: 'save', args: [] };
      case 'q':
      case 'quit':
        if (parts[0] === 'q!') {
          return { action: 'quit', args: ['!'] };
        }
        return { action: 'quit', args: parts.slice(1) };
      case 'spr':
        return { action: 'panel_spr', args: parts.slice(1) };
      case 'practice':
        return { action: 'panel_practice', args: parts.slice(1) };
      case 'agent':
        return { action: 'panel_agent', args: parts.slice(1) };
      case 'help':
        return { action: 'panel_help', args: parts.slice(1) };
      case 'edit':
        return { action: 'confirm', args: parts.slice(1) };
      default:
        return { action: null, args: [] };
    }
  }

  // 格式化键位显示
  formatKey(key: string): string {
    return key
      .replace(/C-/g, 'Ctrl+')
      .replace(/M-/g, 'Alt+')
      .replace(/</g, '<')
      .replace(/>/g, '>');
  }

  // 生成帮助文本
  getHelpText(mode: KeymapMode): string {
    const bindings = this.getBindingsForMode(mode);
    const lines: string[] = [];

    // 按动作分组
    const groups: Record<string, Keybinding[]> = {
      '移动 (Motion)': [],
      '操作 (Action)': [],
      '编辑 (Edit)': [],
      '搜索 (Search)': [],
      '面板 (Panel)': [],
      '其他 (Other)': [],
    };

    bindings.forEach(binding => {
      const action = binding.action;
      if (action.startsWith('move') || action.startsWith('page')) {
        groups['移动 (Motion)'].push(binding);
      } else if (action === 'select' || action === 'confirm' || action === 'cancel' || action === 'quit') {
        groups['操作 (Action)'].push(binding);
      } else if (action === 'delete' || action === 'yank' || action === 'paste' || action === 'undo' || action === 'redo') {
        groups['编辑 (Edit)'].push(binding);
      } else if (action.startsWith('search')) {
        groups['搜索 (Search)'].push(binding);
      } else if (action.startsWith('panel')) {
        groups['面板 (Panel)'].push(binding);
      } else {
        groups['其他 (Other)'].push(binding);
      }
    });

    for (const [groupName, items] of Object.entries(groups)) {
      if (items.length > 0) {
        lines.push(`\x1b[33m${groupName}:\x1b[0m`);
        items.forEach(binding => {
          const keys = binding.keys.map(k => `\x1b[36m${this.formatKey(k)}\x1b[0m`).join(', ');
          const desc = binding.description || binding.action;
          lines.push(`  ${keys.padEnd(20)} - ${desc}`);
        });
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

// ===== 导出单例 =====

const keymapManager = new KeymapManager();

export { keymapManager, KeymapManager, DEFAULT_KEYMAP };
export type { Keybinding as KeybindingType, KeymapConfig as KeymapConfigType };
