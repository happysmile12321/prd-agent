#!/usr/bin/env node
/**
 * NeovimJS - CLI 入口
 */
import { Editor } from './core/Editor.js';
import { Screen } from './ui/Screen.js';
import { NormalMode } from './keymaps/NormalMode.js';
import { InsertMode } from './keymaps/InsertMode.js';
import { VisualMode } from './keymaps/VisualMode.js';
import { CommandMode } from './keymaps/CommandMode.js';
import { Keymap } from './keymaps/Keymap.js';
import { PluginManager, spec } from './plugins/PluginManager.js';
import { createLazyVimConfig } from './config/LazyVimConfig.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * NeovimJS 主应用
 */
class NeovimJS {
  constructor(args) {
    this.args = args;
    this.files = args.files || [];
    this.configPath = args.config || null;
    this.pluginPaths = args.plugins || [];

    // 创建核心组件
    this.screen = new Screen();
    this.editor = new Editor({ screen: this.screen.screen });
    this.keymap = new Keymap();

    // 创建模式处理器
    this.normalMode = new NormalMode(this.editor);
    this.insertMode = new InsertMode(this.editor);
    this.visualMode = new VisualMode(this.editor);
    this.commandMode = new CommandMode(this.editor);

    // 插件管理器
    this.pluginManager = new PluginManager(this.editor);

    // 连接组件
    this.editor.ui = this.screen;
    this.editor.keymap = this.keymap;
    this.editor.commands = {};
    this.editor.autocmds = [];

    this.setup();
  }

  async setup() {
    // 初始化 UI
    this.screen.init(this.editor);

    // 监听编辑器事件
    this.screen.on('editorAction', (data) => this.handleAction(data));

    // 监听编辑器变化
    this.editor.on('modeChange', () => {
      this.screen.render();
    });

    this.editor.on('bufferChange', () => {
      this.screen.render();
    });

    this.editor.on('optionChange', () => {
      this.screen.render();
    });

    // 加载配置
    await this.loadConfig();

    // 加载插件
    await this.loadPlugins();

    // 打开文件
    await this.openFiles();

    // 初始渲染
    this.screen.render();
  }

  async loadConfig() {
    // 配置文件搜索路径
    const configPaths = [
      this.configPath,
      join(process.env.HOME || '', '.nvjs', 'config.js'),
      join(process.cwd(), '.nvjsrc.js'),
      join(process.cwd(), 'nvjs.config.js'),
    ];

    for (const path of configPaths) {
      if (path && existsSync(path)) {
        try {
          const configModule = await import(path);
          const config = configModule.default || configModule;

          // 应用配置
          if (config.options) {
            for (const [key, value] of Object.entries(config.options)) {
              this.editor.setOption(key, value);
            }
          }

          // 应用键位映射
          if (config.keymaps) {
            for (const [lhs, rhs] of Object.entries(config.keymaps)) {
              this.keymap.set(lhs, rhs);
            }
          }

          // 调用 setup
          if (config.setup) {
            const api = {
              editor: this.editor,
              setOption: (n, v) => this.editor.setOption(n, v),
              getOption: (n) => this.editor.getOption(n),
              nmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'n' }),
              imap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'i' }),
              vmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'v' }),
              cmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'c' }),
              keymap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, opts),
              createCommand: (name, fn, opts) => {
                this.editor.commands[name] = { callback: fn, ...opts };
              },
              notify: (msg, level) => this.screen.showMessage(msg, level),
            };
            await config.setup(api);
          }

          console.log(`Loaded config: ${path}`);
        } catch (err) {
          console.error(`Failed to load config ${path}:`, err.message);
        }
        return;
      }
    }

    // 默认使用 LazyVim 配置
    const api = {
      editor: this.editor,
      setOption: (n, v) => this.editor.setOption(n, v),
      getOption: (n) => this.editor.getOption(n),
      nmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'n' }),
      imap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'i' }),
      vmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'v' }),
      cmap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, { ...opts, mode: 'c' }),
      keymap: (lhs, rhs, opts) => this.keymap.set(lhs, rhs, opts),
      createCommand: (name, fn, opts) => {
        this.editor.commands[name] = { callback: fn, ...opts };
      },
      createAutocmd: (event, callback, opts = {}) => {
        this.editor.autocmds.push({ event, callback, ...opts });
      },
      defineHighlight: (name, opts = {}) => {
        this.editor.highlights.push({ name, ...opts });
      },
      notify: (msg, level) => this.screen.showMessage(msg, level),
    };
    createLazyVimConfig(api);
  }

  async loadPlugins() {
    // 从配置目录加载插件
    const pluginDir = join(process.env.HOME || '', '.nvjs', 'plugins');

    // 如果有插件目录，加载所有插件
    // 这里简化处理，实际应该递归查找

    // 加载命令行指定的插件
    for (const pluginPath of this.pluginPaths) {
      await this.pluginManager.loadPlugin(pluginPath);
    }
  }

  async openFiles() {
    if (this.files.length === 0) {
      // 创建空缓冲区
      return;
    }

    // 打开第一个文件作为主缓冲区
    const firstFile = this.files[0];
    await this.openFile(firstFile);

    // 其他文件作为隐藏缓冲区
    for (let i = 1; i < this.files.length; i++) {
      this.openFile(this.files[i], true);
    }
  }

  async openFile(filePath, hidden = false) {
    const fs = await import('fs');

    try {
      let content = '';
      let path = filePath;

      // 处理相对路径
      if (!filePath.startsWith('/')) {
        path = join(process.cwd(), filePath);
      }

      if (existsSync(path)) {
        content = fs.readFileSync(path, 'utf-8');
      }

      const buffer = this.editor.createBuffer(content, {
        name: filePath.split('/').pop(),
        path: path,
      });

      if (!hidden) {
        this.editor.setBuffer(buffer);
      }
    } catch (err) {
      this.screen.showMessage(`Error opening file: ${err.message}`, 'error');
    }
  }

  async handleAction(data) {
    const { type, data: actionData } = data;

    switch (type) {
      case 'normal':
        this.handleNormalInput(actionData);
        break;
      case 'insert':
        this.handleInsertInput(actionData);
        break;
      case 'command':
        await this.handleCommandInput(actionData);
        break;
      case 'commandInput':
        this.handleCommandLineInput(actionData);
        break;
    }

    this.screen.render();
  }

  handleNormalInput(input) {
    const mode = this.editor.getMode();

    if (mode === 'normal') {
      this.normalMode.handle(input);
    } else if (mode.startsWith('visual')) {
      this.visualMode.handle(input);
    }
  }

  handleInsertInput(input) {
    this.insertMode.handle(input);
  }

  async handleCommandInput(cmd) {
    const result = this.commandMode.handle(cmd);
    if (result && typeof result.then === 'function') {
      await result;
    }
  }

  handleCommandLineInput(input) {
    this.commandMode.handle(input);
    // 更新命令行显示
    if (this.screen.cmdline) {
      this.screen.cmdline.setValue(':' + this.commandMode.commandBuffer);
    }
  }

  run() {
    // 主循环由 blessed 处理
  }
}

/**
 * 解析命令行参数
 */
function parseArgs(argv) {
  const args = {
    files: [],
    config: null,
    plugins: [],
  };

  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '-c' || arg === '--config') {
      args.config = argv[++i];
    } else if (arg === '-p' || arg === '--plugin') {
      args.plugins.push(argv[++i]);
    } else if (arg === '-h' || arg === '--help') {
      console.log(`
NeovimJS - A Neovim-like editor in JavaScript

Usage:
  nvjs [options] [files...]

Options:
  -c, --config <path>    Load config from path
  -p, --plugin <path>    Load plugin from path
  -h, --help             Show this help

Examples:
  nvjs file.js
  nvjs -c ~/.nvjs/config.js file1.js file2.js
  nvjs -p ./plugins/my-plugin index.js
      `);
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else {
      args.files.push(arg);
    }

    i++;
  }

  return args;
}

/**
 * 主入口
 */
async function main() {
  const args = parseArgs(process.argv);

  try {
    const app = new NeovimJS(args);
    app.run();
  } catch (err) {
    console.error('Failed to start NeovimJS:', err);
    process.exit(1);
  }
}

// 运行
main();
