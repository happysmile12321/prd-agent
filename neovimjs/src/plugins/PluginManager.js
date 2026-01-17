/**
 * PluginManager - 插件系统
 * 支持 JavaScript/TypeScript 插件加载和管理
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync } from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * API 暴露给插件
 */
export class PluginAPI {
  constructor(editor, plugin) {
    this.editor = editor;
    this.plugin = plugin;
    this.name = plugin.name;
  }

  // ========== 键位映射 ==========

  // 设置键位映射
  keymap(lhs, rhs, options = {}) {
    const { keymap } = this.editor;
    if (keymap) {
      keymap.set(lhs, rhs, {
        ...options,
        plugin: this.name
      });
    }
  }

  // Normal 模式映射
  nmap(lhs, rhs, options = {}) {
    this.keymap(lhs, rhs, { ...options, mode: 'n' });
  }

  // Insert 模式映射
  imap(lhs, rhs, options = {}) {
    this.keymap(lhs, rhs, { ...options, mode: 'i' });
  }

  // Visual 模式映射
  vmap(lhs, rhs, options = {}) {
    this.keymap(lhs, rhs, { ...options, mode: 'v' });
  }

  // Command 模式映射
  cmap(lhs, rhs, options = {}) {
    this.keymap(lhs, rhs, { ...options, mode: 'c' });
  }

  // Terminal 模式映射
  tmap(lhs, rhs, options = {}) {
    this.keymap(lhs, rhs, { ...options, mode: 't' });
  }

  // ========== 命令 ==========

  // 创建用户命令
  createCommand(name, fn, opts = {}) {
    const cmd = opts;
    cmd.callback = fn;
    cmd.plugin = this.name;
    this.editor.commands[name] = cmd;
  }

  // ========== 自动命令 ==========

  // 创建自动命令
  createAutocmd(event, callback, opts = {}) {
    const autocmd = {
      event,
      callback,
      pattern: opts.pattern || '*',
      nested: opts.nested || false,
      once: opts.once || false,
      plugin: this.name
    };
    this.editor.autocmds.push(autocmd);
  }

  // ========== 选项 ==========

  // 设置本地选项
  setOption(name, value) {
    this.editor.setOption(name, value);
  }

  // 获取选项
  getOption(name) {
    return this.editor.getOption(name);
  }

  // ========== 缓冲区 ==========

  // 获取当前缓冲区
  getCurrentBuffer() {
    return this.editor.getCurrentBuffer();
  }

  // 创建新缓冲区
  createBuffer(content, opts) {
    return this.editor.createBuffer(content, opts);
  }

  // ========== 窗口 ==========

  // 获取当前窗口
  getCurrentWindow() {
    return this.editor.getActiveWindow();
  }

  // ========== 高亮 ==========

  // 定义高亮组
  defineHighlight(name, opts) {
    this.editor.highlights.push({
      name,
      ...opts
    });
  }

  // ========== 通知 ==========

  // 显示通知
  notify(msg, level = 'info') {
    this.editor.ui?.showMessage(`[${this.name}] ${msg}`, level);
  }

  // ========== 实用工具 ==========

  // 执行 VimScript 表达式（简化）
  eval(expr) {
    // 简化实现，可以扩展
    return null;
  }

  // 调用 Vim 函数
  call(fn, ...args) {
    // 简化实现
    return null;
  }

  // 定时器
  setInterval(fn, ms) {
    return setInterval(fn, ms);
  }

  setTimeout(fn, ms) {
    return setTimeout(fn, ms);
  }
}

/**
 * Plugin - 插件类
 */
export class Plugin {
  constructor(name, entry, config = {}) {
    this.name = name;
    this.entry = entry;
    this.config = config;
    this.enabled = false;
    this.module = null;
    this.api = null;
  }

  async load(editor) {
    if (this.enabled) return;

    try {
      // 创建 API
      this.api = new PluginAPI(editor, this);

      // 加载插件模块
      const pluginPath = this.entry;
      const module = await import(pluginPath);

      // 调用插件的 setup 函数或 default
      if (typeof module.setup === 'function') {
        await module.setup(this.api, this.config);
      } else if (typeof module.default === 'function') {
        await module.default(this.api, this.config);
      } else if (typeof module.default === 'object') {
        // 配置式插件
        module.default.setup?.(this.api, this.config);
      }

      this.module = module;
      this.enabled = true;
      return true;
    } catch (err) {
      console.error(`Failed to load plugin ${this.name}:`, err);
      return false;
    }
  }

  async unload(editor) {
    if (!this.enabled) return;

    try {
      if (this.module?.cleanup) {
        await this.module.cleanup(this.api);
      }
    } catch (err) {
      console.error(`Failed to unload plugin ${this.name}:`, err);
    }

    this.enabled = false;
    this.module = null;
    this.api = null;
  }
}

/**
 * PluginManager - 插件管理器
 */
export class PluginManager {
  constructor(editor) {
    this.editor = editor;
    this.plugins = new Map();
    this.loadOrder = [];

    // 插件搜索路径
    this.paths = [
      join(process.env.HOME || '', '.nvjs', 'plugins'),
      join(__dirname, '../../plugins'),
    ];
  }

  // 注册插件
  register(name, entry, config = {}) {
    const plugin = new Plugin(name, entry, config);
    this.plugins.set(name, plugin);
    return plugin;
  }

  // 从配置文件加载插件
  async loadFromConfig(configPath) {
    try {
      const configModule = await import(configPath);
      const config = configModule.default || configModule;

      // 加载 spec（类似 LazyVim 的 spec 系统）
      if (config.specs && Array.isArray(config.specs)) {
        for (const spec of config.specs) {
          if (typeof spec === 'string') {
            await this.loadSpec(spec);
          } else if (typeof spec === 'object') {
            const [name, pluginConfig] = Object.entries(spec)[0];
            await this.loadSpec(name, pluginConfig);
          }
        }
      }

      // 加载导入的插件
      if (config.imports && Array.isArray(config.imports)) {
        for (const imp of config.imports) {
          await this.loadPlugin(imp);
        }
      }

      // 调用配置的 setup 函数
      if (config.setup && typeof config.setup === 'function') {
        const api = new PluginAPI(this.editor, { name: 'config' });
        await config.setup(api);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  // 加载 spec（LazyVim 风格）
  async loadSpec(spec, config = {}) {
    // spec 格式: "plugin-name" 或 "author/plugin-name"
    // 这里简化为本地路径或 npm 包
    let pluginPath;

    if (spec.startsWith('./') || spec.startsWith('../')) {
      // 相对路径
      pluginPath = join(process.cwd(), spec);
    } else if (spec.startsWith('/')) {
      // 绝对路径
      pluginPath = spec;
    } else {
      // 从插件目录查找
      for (const path of this.paths) {
        const testPath = join(path, spec);
        try {
          if (statSync(testPath).isDirectory()) {
            pluginPath = testPath;
            break;
          }
        } catch {}
      }

      // 尝试直接导入（npm 包）
      if (!pluginPath) {
        pluginPath = spec;
      }
    }

    // 尝试加载 index.js 或 package.json main
    try {
      const indexPath = join(pluginPath, 'index.js');
      const pkgPath = join(pluginPath, 'package.json');

      if (statSync(indexPath).isFile()) {
        pluginPath = indexPath;
      } else if (statSync(pkgPath).isFile()) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.main) {
          pluginPath = join(pluginPath, pkg.main);
        } else {
          pluginPath = indexPath;
        }
      }
    } catch {}

    const name = spec.split('/').pop().replace(/\.js$/, '');
    const plugin = this.register(name, pluginPath, config);
    await plugin.load(this.editor);
    this.loadOrder.push(name);
  }

  // 加载插件
  async loadPlugin(nameOrPath) {
    if (this.plugins.has(nameOrPath)) {
      const plugin = this.plugins.get(nameOrPath);
      if (!plugin.enabled) {
        await plugin.load(this.editor);
        this.loadOrder.push(nameOrPath);
      }
      return true;
    }

    // 尝试作为路径加载
    const plugin = new Plugin(nameOrPath, nameOrPath, {});
    const success = await plugin.load(this.editor);
    if (success) {
      this.plugins.set(nameOrPath, plugin);
      this.loadOrder.push(nameOrPath);
    }
    return success;
  }

  // 卸载插件
  async unloadPlugin(name) {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.unload(this.editor);
      const index = this.loadOrder.indexOf(name);
      if (index !== -1) {
        this.loadOrder.splice(index, 1);
      }
      return true;
    }
    return false;
  }

  // 获取插件
  getPlugin(name) {
    return this.plugins.get(name);
  }

  // 获取所有插件
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  // 获取已启用的插件
  getEnabledPlugins() {
    return this.getAllPlugins().filter(p => p.enabled);
  }
}

// 便捷函数：创建 spec（LazyVim 风格）
export function spec(name, config = {}) {
  return { [name]: config };
}
