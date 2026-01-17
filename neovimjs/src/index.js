/**
 * NeovimJS - 模块入口
 * 导出所有公共 API
 */

// 核心
export { Editor } from './core/Editor.js';
export { Buffer } from './core/Buffer.js';
export { Window } from './core/Window.js';
export { Tab, TabManager } from './core/Tab.js';

// UI
export { Screen } from './ui/Screen.js';

// 键位映射
export { Keymap, parseKey, formatKey } from './keymaps/Keymap.js';
export { NormalMode } from './keymaps/NormalMode.js';
export { InsertMode } from './keymaps/InsertMode.js';
export { VisualMode } from './keymaps/VisualMode.js';
export { CommandMode } from './keymaps/CommandMode.js';

// 插件系统
export { PluginManager, Plugin, PluginAPI, spec } from './plugins/PluginManager.js';

// 配置
export { createLazyVimConfig } from './config/LazyVimConfig.js';
