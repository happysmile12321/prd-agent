/**
 * TUI Mode - LazyVim 风格
 * 纯 Vim 键位操作，类似 Neovim 编辑器界面
 */

import blessed, { Widgets } from 'blessed';
import { keymapManager, type KeymapAction } from '../../core/keybindings.js';

// ===== 类型定义 =====

export type BufferType = 'dashboard' | 'spr' | 'practice' | 'agent' | 'keybindings' | 'help';

export interface Buffer {
  type: BufferType;
  name: string;
  content: () => string;
  filetype?: string;
  modifiable?: boolean;
}

// ===== TUI 类 =====

export class TUI {
  private screen: Widgets.Screen;
  private currentMode: 'normal' | 'insert' | 'command' = 'normal';
  private buffers: Map<BufferType, Buffer> = new Map();
  private currentBuffer: BufferType = 'dashboard';

  // UI 元素 - LazyVim 风格布局
  private tabline: Widgets.BoxElement;       // 顶部标签栏
  private mainContent: Widgets.BoxElement;   // 主编辑区
  private cmdline: Widgets.TextboxElement;   // 命令行
  private statusline: Widgets.BoxElement;   // 状态栏
  private winbar: Widgets.BoxElement;       // 底部窗口栏

  // 状态
  private commandMode = false;
  private leaderActive = false;
  private leaderTimeout: NodeJS.Timeout | null = null;
  private registerY = ''; // 寄存器

  constructor() {
    // 创建屏幕
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'PRD Agent - LazyVim',
      fullUnicode: true,
      cursor: {
        artificial: true,
        shape: 'block',
        blink: true,
      } as any,
    });

    // 样式配置 - LazyVim 配色
    const colors = {
      bg: 'black',
      fg: 'white',
      gray: '#3b4261',
      blue: '#7aa2f7',
      cyan: '#7dcfff',
      green: '#9ece6a',
      orange: '#ff9e64',
      red: '#f7768e',
      purple: '#bb9af7',
      yellow: '#e0af68',
    };

    // 创建 Tabline (顶部标签栏)
    this.tabline = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: colors.bg,
        fg: colors.gray,
      },
    });

    // 创建主内容区
    this.mainContent = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-3',
      style: {
        bg: colors.bg,
        fg: colors.fg,
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      mouse: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: colors.gray,
        },
      },
    });

    // 创建 Winbar (底部窗口栏)
    this.winbar = blessed.box({
      parent: this.screen,
      bottom: 2,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: colors.bg,
        fg: colors.gray,
      },
    });

    // 创建 Cmdline (命令行)
    this.cmdline = blessed.textbox({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      inputOnFocus: true,
      style: {
        bg: colors.bg,
        fg: colors.fg,
        border: {
          fg: colors.gray,
        },
      },
      hidden: true,
    });

    // 创建 Statusline (状态栏)
    this.statusline = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: colors.blue,
        fg: colors.bg,
        bold: true,
      },
    });

    // 注册 buffers
    this.registerBuffers();

    // 绑定事件
    this.bindEvents();

    // 启动配置文件监听
    keymapManager.watchConfig();

    // 监听配置变化
    keymapManager.onChange(() => {
      this.renderStatusline();
      this.screen.render();
    });

    // 初始渲染
    this.renderTabline();
    this.renderCurrentBuffer();
    this.renderStatusline();
    this.renderWinbar();
  }

  // ===== 注册 Buffers =====

  private registerBuffers(): void {
    // Dashboard buffer
    this.buffers.set('dashboard', {
      type: 'dashboard',
      name: 'Dashboard',
      filetype: 'dashboard',
      modifiable: false,
      content: () => this.getDashboardContent(),
    });

    // SPR buffer
    this.buffers.set('spr', {
      type: 'spr',
      name: 'SPR.md',
      filetype: 'markdown',
      modifiable: false,
      content: () => this.getSPRContent(),
    });

    // Practice buffer
    this.buffers.set('practice', {
      type: 'practice',
      name: 'Practice.md',
      filetype: 'markdown',
      modifiable: false,
      content: () => this.getPracticeContent(),
    });

    // Agent buffer
    this.buffers.set('agent', {
      type: 'agent',
      name: 'Agent.lua',
      filetype: 'lua',
      modifiable: false,
      content: () => this.getAgentContent(),
    });

    // Keybindings buffer
    this.buffers.set('keybindings', {
      type: 'keybindings',
      name: 'Keybindings.md',
      filetype: 'markdown',
      modifiable: false,
      content: () => this.getKeybindingsContent(),
    });

    // Help buffer
    this.buffers.set('help', {
      type: 'help',
      name: 'Help.md',
      filetype: 'markdown',
      modifiable: false,
      content: () => this.getHelpContent(),
    });
  }

  // ===== Buffer 内容 =====

  private getDashboardContent(): string {
    return `╔══════════════════════════════════════════════════════════════════════════════╗
║                           🚀 PRD Agent - LazyVim Style                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   <Leader> = Space                                                              ║
║                                                                              ║
║   ┌────────────────────────────────────────────────────────────────────────┐   ║
║   │  Keybindings                                                              │   ║
║   │                                                                            │   ║
║   │  <Leader> f  │  Find / Telescope                                        │   ║
║   │  <Leader> e  │  NVIM Tree / File Explorer                               │   ║
║   │  <Leader> s  │  SPR Module                                              │   ║
║   │  <Leader> p  │  Practice Module                                         │   ║
║   │  <Leader> a  │  AI Agent                                                │   ║
║   │  <Leader> k  │  Keybindings                                              │   ║
║   │  <Leader> ?  │  Help                                                     │   ║
║   │                                                                            │   ║
║   │  :w          │  Save                                                     │   ║
║   │  :q          │  Quit                                                     │   ║
║   │  :wq         │  Save and Quit                                            │   ║
║   │                                                                            │   ║
║   └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║   ┌────────────────────────────────────────────────────────────────────────┐   ║
║   │  Buffers (Tabs)                                                          │   ║
║   │                                                                            │   ║
║   │  :buffer spr        │  Switch to SPR buffer                              │   ║
║   │  :buffer practice   │  Switch to Practice buffer                         │   ║
║   │  :b agent          │  Switch to Agent buffer                             │   ║
║   │  :bd               │  Close current buffer                               │   ║
║   │                                                                            │   ║
║   └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║   ┌────────────────────────────────────────────────────────────────────────┐   ║
║   │  Quick Reference                                                           │   ║
║   │                                                                            │   ║
║   │  Navigation:     hjkl │ gg  │ G   │ C-f │ C-b │ C-d │ C-u                │   ║
║   │  Operations:      i   │ Esc │ dd  │ yy  │ p   │ u   │ /                   │   ║
║   │                                                                            │   ║
║   └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Press <Space> for leader key commands, or : for command mode
`;
  }

  private getSPRContent(): string {
    return `# SPR 学习模块

## 结构化渐进提取 (Structured Progressive Release)

SPR 是一种认知训练方法，通过"良性困难"促进主动回忆。

### 核心概念

\`\`\`
Part (部分)
  └─ Chapter (章节)
      └─ Slot (槽位) - 信息遮蔽，只显示元认知标签
\`\`\`

### 工作流程

1. **分析** - 将 Markdown 文件转换为认知训练骨架
   \`\`\vim
   :SPRAnalyze path/to/file.md
   \`\`\`

2. **摘要** - 生成思维导图和关键要点
   \`\`\vim
   :SPRSummary <task_id>
   \`\`\`

3. **练习** - 生成并回答测试题
   \`\`\vim
   :SPRQuiz <task_id> <count>
   \`\`\`

### REPL 命令

\`\`vim
AI> spr analyze test.md
AI> spr summary 1
AI> spr quiz 1 5
AI> spr tasks
AI> spr evaluate <quiz_id>
\`\`\`

### 数据存储

数据库: \`~/Library/prd-agent/spr.db\`

表结构:
- \`tasks\` - 存储分析任务
- \`quiz_questions\` - 测试题
- \`quiz_results\` - 答题记录
- \`notes\` - 学习笔记

---
按 \`Escape\` 返回 dashboard，或输入命令...
`;
  }

  private getPracticeContent(): string {
    return `# 刻意练习模块

## Deliberate Practice

刻意练习是提高专业技能的系统性方法。

### 练习模板结构

\`\`\typescript
interface PracticeTemplate {
  name: string;           // 练习名称
  subject: string;        // 学科/领域
  chapter: string;        // 章节
  level: T1 | T2;        // 难度级别
  objectives: Objective[]; // 学习目标
  triggers: Trigger[];    // 触发点提示
  traps: Trap[];          // 常见陷阱
  workflow: string;       // 工作流程
  techniques: string[];   // 技术要点
}
\`\`\`

### 练习流程

\`\`
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  模板创建    │ -> │  场景生成    │ -> │  刻意练习    │
└──────────────┘    └──────────────┘    └──────────────┘
                                                │
                                                v
                                         ┌──────────────┐
                                         │  AI 复盘反思  │
                                         └──────────────┘
\`\`

### REPL 命令

\`\`vim
AI> practice list [filters]
AI> practice create <name> <subject>
AI> practice show <id>
AI> practice status <id> <pending|mastered|rework>
AI> practice start <templateId>
AI> practice scenario <templateId>
AI> practice reflect <groupId>
AI> practice recognize <input>
\`\`\`

### 状态跟踪

- **pending** - 待掌握
- **mastered** - 已掌握
- **rework** - 需要复习

---
按 \`Escape\` 返回 dashboard
`;
  }

  private getAgentContent(): string {
    return `-- AI Agent Module (PDA Cycle)

---@class Agent
---@field name string
---@field status string
local Agent = {}

-- Perceive-Decide-Act Cycle
function Agent:run(context)
  -- 1. 感知环境
  local perception = self:perceive(context)

  -- 2. 做出决策
  local decision = self:decide(perception)

  -- 3. 执行行动
  local result = self:act(decision)

  return result
end

-- 感知: 分析环境和上下文
function Agent:perceive(context)
  return {
    context = context,
    timestamp = os.time(),
    triggers = self:extract_triggers(context),
    user_intent = self:infer_intent(context)
  }
end

-- 决策: 基于感知选择行动
function Agent:decide(perception)
  local actions = {
    'respond',    -- 回应用户
    'query',      -- 查询更多信息
    'delegate',   -- 委托给其他模块
    'execute',    -- 执行任务
    'wait'        -- 等待输入
  }

  return self:ai_select_action(perception, actions)
end

-- 行动: 执行决策
function Agent:act(decision)
  local handlers = {
    respond = function(self) return self:respond_user() end,
    query = function(self) return self:query_info() end,
    delegate = function(self) return self:delegate_module() end,
    execute = function(self) return self:execute_task() end,
    wait = function(self) return self:wait_input() end
  }

  return handlers[decision.action](self)
end

-- REPL 命令
-- :agent perceive <context>
-- :agent decide
-- :agent act
-- :agent run <context>
-- :agent status [name]
-- :agent history [name]
-- :agent reset [name]

-- 多 Agent 管理
-- :agent new <name>
-- :agent list

--[[
  循环往复，持续学习
  每次循环都积累经验
  状态持久化到数据库
--]]
`;
  }

  private getKeybindingsContent(): string {
    const helpText = keymapManager.getHelpText('normal');
    return `# 键位绑定配置

## 当前模式: ${this.currentMode.toUpperCase()}

## Normal Mode

${helpText}

## 自定义配置

配置文件: \`~/Library/prd-agent/keybindings.json\`

\`\`\json
{
  "normal": [
    {
      "keys": ["custom_key"],
      "action": "panel_spr",
      "description": "我的自定义键位"
    }
  ]
}
\`\`\`

保存后自动生效，无需重启 TUI。

## 可用动作

| 动作 | 说明 |
|------|------|
| \`move_up\` / \`move_down\` | 移动 |
| \`move_top\` / \`move_bottom\` | 跳转 |
| \`select\` / \`confirm\` | 确认 |
| \`cancel\` / \`back\` | 返回 |
| \`quit\` | 退出 |
| \`panel_spr\` | SPR 面板 |
| \`panel_practice\` | Practice 面板 |
| \`panel_agent\` | Agent 面板 |

---
配置文件修改后立即生效 (热重载)
`;
  }

  private getHelpContent(): string {
    return `# 帮助文档

## PRD Agent - LazyVim 风格 TUI

### 导航

\`\`vim
h j k l     ← ↓ ↑ →   移动光标
w b         向前/向后移动单词
gg          跳到文件开头
G           跳到文件结尾
C-f         向下翻页
C-b         向上翻页
C-d         向下半页
C-u         向上半页
\`\`\`

### 操作模式

\`\`vim
i           进入插入模式
Esc         返回普通模式
v           进入可视模式
:           进入命令模式
\`\`\`

### Leader Key (Space)

\`\`vim
<Space> f    文件查找
<Space> e    文件浏览器
<Space> s    SPR 模块
<Space> p    刻意练习
<Space> a    AI Agent
<Space> k    键位绑定
<Space> ?    帮助
\`\`\`

### 命令模式

\`\`vim
:q           退出
:w           保存
:wq          保存并退出
:b <name>    切换 buffer
:bd          关闭当前 buffer
:spr         SPR 模块
:practice    刻意练习
:agent       AI Agent
:help        帮助
\`\`\`

### 编辑操作

\`\`vim
dd / x      删除当前行
yy / Y      复制当前行
p           粘贴
u           撤销
C-r         重做
/           搜索
n           下一个搜索结果
N           上一个搜索结果
\`\`\`

### 使用说明

\`\`bash
prd          # 启动 TUI 模式 (默认)
prd repl     # 启动 REPL 模式
prd tui      # 启动 TUI 模式
\`\`\`

### 配置

\`\`
~/Library/prd-agent/
├── keybindings.json    # 键位配置
├── spr.db              # SPR 数据库
└── config.json         # 主配置
\`\`\

---
按 \`Escape\` 返回 dashboard
`;
  }

  // ===== 事件绑定 =====

  private bindEvents(): void {
    // 全局按键处理
    this.screen.key(['C-c'], () => this.quit());

    // 命令行事件
    this.cmdline.on('submit', () => this.executeCommand());
    this.cmdline.on('cancel', () => this.exitCommandMode());

    // 主内容区按键处理
    this.mainContent.key(['escape'], () => {
      this.leaderActive = false;
      this.setMode('normal');
    });

    // 监听所有按键
    this.screen.on('keypress', (_ch, key) => {
      if (this.commandMode) return;

      const keyName = key.full || key.name || '';

      // Leader key 处理
      if (keyName === 'space' && this.currentMode === 'normal') {
        this.activateLeader();
        return;
      }

      // Leader + key 组合
      if (this.leaderActive) {
        this.handleLeaderCommand(keyName);
        return;
      }

      // 普通按键处理
      const action = keymapManager.lookup(keyName);
      if (action) {
        this.handleAction(action);
      }
    });
  }

  // ===== Leader Key 处理 =====

  private activateLeader(): void {
    this.leaderActive = true;
    this.renderStatusline();

    if (this.leaderTimeout) clearTimeout(this.leaderTimeout);
    this.leaderTimeout = setTimeout(() => {
      this.leaderActive = false;
      this.renderStatusline();
    }, 1000);
  }

  private handleLeaderCommand(key: string): void {
    this.leaderActive = false;
    if (this.leaderTimeout) clearTimeout(this.leaderTimeout);

    switch (key) {
      case 'f':
        this.updateStatus('Find: Not implemented in TUI mode');
        break;
      case 'e':
        // File explorer - 可以扩展
        this.switchBuffer('spr');
        break;
      case 's':
        this.switchBuffer('spr');
        break;
      case 'p':
        this.switchBuffer('practice');
        break;
      case 'a':
        this.switchBuffer('agent');
        break;
      case 'k':
        this.switchBuffer('keybindings');
        break;
      case '?':
        this.switchBuffer('help');
        break;
      default:
        this.updateStatus(`Unknown leader command: Space + ${key}`);
    }

    this.renderStatusline();
    this.screen.render();
  }

  // ===== 动作处理 =====

  private handleAction(action: KeymapAction): void {
    switch (action) {
      // 移动
      case 'move_up':
        (this.mainContent as any).scroll(-1);
        break;
      case 'move_down':
        (this.mainContent as any).scroll(1);
        break;
      case 'move_left':
        (this.mainContent as any).scroll(-5);
        break;
      case 'move_right':
        (this.mainContent as any).scroll(5);
        break;

      // 快速移动
      case 'move_top':
        (this.mainContent as any).setScrollP(0);
        break;
      case 'move_bottom':
        // Scroll to bottom (use a large number)
        (this.mainContent as any).scroll(1000);
        break;
      case 'page_up':
        (this.mainContent as any).scroll(-Math.floor((this.mainContent.height as number) / 2));
        break;
      case 'page_down':
        (this.mainContent as any).scroll(Math.floor((this.mainContent.height as number) / 2));
        break;

      // 操作
      case 'select':
      case 'confirm':
        // Enter insert mode for modifiable buffers
        if (this.buffers.get(this.currentBuffer)?.modifiable) {
          this.setMode('insert');
        }
        break;

      case 'cancel':
        if (this.currentMode === 'insert') {
          this.setMode('normal');
        } else {
          this.switchBuffer('dashboard');
        }
        break;

      case 'back':
        if (this.currentBuffer !== 'dashboard') {
          this.switchBuffer('dashboard');
        }
        break;

      case 'quit':
        this.quit();
        return;

      case 'command_mode':
        this.enterCommandMode();
        return;

      // 面板切换
      case 'panel_spr':
        this.switchBuffer('spr');
        break;
      case 'panel_practice':
        this.switchBuffer('practice');
        break;
      case 'panel_agent':
        this.switchBuffer('agent');
        break;
      case 'panel_help':
        this.switchBuffer('help');
        break;

      // 编辑操作
      case 'delete':
        this.updateStatus('Deleted (yank to register)');
        this.registerY = this.mainContent.getContent() || '';
        break;
      case 'yank':
        this.registerY = this.mainContent.getContent() || '';
        this.updateStatus('Yanked to register');
        break;
      case 'paste':
        if (this.registerY) {
          this.updateStatus('Pasted from register');
        }
        break;
      case 'undo':
        this.updateStatus('Undo');
        break;
      case 'redo':
        this.updateStatus('Redo');
        break;
      case 'search':
        this.updateStatus('Search: Use /pattern');
        break;
      case 'search_next':
        this.updateStatus('Next search result');
        break;
      case 'search_prev':
        this.updateStatus('Previous search result');
        break;

      default:
        this.updateStatus(`Action: ${action}`);
    }

    this.screen.render();
  }

  // ===== 命令模式 =====

  private enterCommandMode(): void {
    this.commandMode = true;
    this.cmdline.show();
    this.cmdline.setValue(':');
    this.cmdline.focus();
    this.setMode('command');
    this.screen.render();
  }

  private exitCommandMode(): void {
    this.commandMode = false;
    this.cmdline.hide();
    this.cmdline.setValue('');
    this.mainContent.focus();
    this.setMode('normal');
    this.screen.render();
  }

  private executeCommand(): void {
    const cmd = this.cmdline.getValue().slice(1); // 移除 :

    // 解析命令
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'q':
      case 'quit':
        this.quit();
        return;

      case 'w':
      case 'write':
        this.updateStatus('Saved');
        break;

      case 'wq':
      case 'x':
        this.updateStatus('Saved and quitting...');
        setTimeout(() => this.quit(), 500);
        return;

      case 'b':
      case 'buffer':
        if (args[0]) {
          this.switchBufferByName(args[0]);
        }
        break;

      case 'bd':
      case 'bdelete':
        // Close buffer (return to dashboard)
        this.switchBuffer('dashboard');
        break;

      case 'spr':
        this.switchBuffer('spr');
        break;

      case 'practice':
        this.switchBuffer('practice');
        break;

      case 'agent':
        this.switchBuffer('agent');
        break;

      case 'help':
        this.switchBuffer('help');
        break;

      case 'keybindings':
      case 'keys':
        this.switchBuffer('keybindings');
        break;

      case 'e':
      case 'edit':
        if (args[0]) {
          this.switchBufferByName(args[0]);
        }
        break;

      default:
        this.updateStatus(`Unknown command: ${cmd}`);
    }

    this.exitCommandMode();
  }

  // ===== Buffer 操作 =====

  private switchBuffer(type: BufferType): void {
    this.currentBuffer = type;
    this.renderCurrentBuffer();
    this.renderTabline();
    this.renderStatusline();
    this.renderWinbar();
    this.screen.render();
  }

  private switchBufferByName(name: string): void {
    const bufferMap: Record<string, BufferType> = {
      'dashboard': 'dashboard',
      'spr': 'spr',
      'practice': 'practice',
      'agent': 'agent',
      'keybindings': 'keybindings',
      'help': 'help',
    };

    const type = bufferMap[name.toLowerCase()];
    if (type) {
      this.switchBuffer(type);
    } else {
      this.updateStatus(`No buffer: ${name}`);
    }
  }

  private renderTabline(): void {
    const tabs = Array.from(this.buffers.values());
    const activeIndex = tabs.findIndex(t => t.type === this.currentBuffer);

    let content = '';
    tabs.forEach((tab, i) => {
      const isActive = i === activeIndex;
      const prefix = isActive ? '%#' + this.currentMode.toUpperCase() + ' #' : '';
      const suffix = isActive ? '#%' : '';
      const name = isActive ? ` ${tab.name} ` : ` ${tab.name} `;
      content += prefix + name + suffix;
    });

    this.tabline.setContent(content);
  }

  private renderCurrentBuffer(): void {
    const buffer = this.buffers.get(this.currentBuffer);
    if (buffer) {
      this.mainContent.setContent(buffer.content());
    }
  }

  private renderStatusline(): void {
    const buffer = this.buffers.get(this.currentBuffer);
    if (!buffer) return;

    const mode = this.leaderActive ? 'Leader' : this.currentMode.toUpperCase();

    // LazyVim 风格状态栏
    const content = `  ${mode}  |  ${buffer.name}  |  ${buffer.filetype || 'none'}  |  ${this.getCursorPosition()}  |  ${this.getPercentage()}`;

    this.statusline.setContent(content);
  }

  private renderWinbar(): void {
    const buffer = this.buffers.get(this.currentBuffer);
    if (!buffer) return;

    const content = `   ${buffer.name}  •  ${this.registerY ? 'Register: ' + this.registerY.slice(0, 20) + '...' : 'Register: [empty]'}`;

    this.winbar.setContent(content);
  }

  private getCursorPosition(): string {
    // 模拟光标位置
    return 'Ln 1, Col 1';
  }

  private getPercentage(): string {
    // 计算滚动百分比
    const scroll = this.mainContent.getScroll() || 0;
    const height = this.mainContent.getScrollHeight() || 100;
    const pct = Math.min(100, Math.round((scroll / height) * 100));
    return `${pct}%`;
  }

  // ===== 模式切换 =====

  private setMode(mode: 'normal' | 'insert' | 'command'): void {
    this.currentMode = mode;
    const keymapMode = mode as 'normal' | 'insert' | 'command';
    keymapManager.setMode(keymapMode);
    this.renderTabline();
    this.renderStatusline();
  }

  // ===== 辅助方法 =====

  private updateStatus(): void {
    this.renderStatusline();
    this.screen.render();
  }

  // ===== 公共方法 =====

  start(): void {
    this.screen.render();
  }

  quit(): void {
    keymapManager.unwatchConfig();
    this.screen.destroy();
    process.exit(0);
  }

  getCurrentBuffer(): BufferType {
    return this.currentBuffer;
  }

  getCurrentMode(): string {
    return this.currentMode;
  }
}

// ===== 导出 =====

export function createTUI(): TUI {
  return new TUI();
}
