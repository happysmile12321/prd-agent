/**
 * TUI Mode - Terminal User Interface with Vim-style keybindings
 * Similar to lazygit's interface with panels and keyboard navigation
 */

import blessed, { Widgets } from 'blessed';
import { keymapManager, type KeymapAction, type KeymapMode } from '../../core/keybindings.js';

// ===== 类型定义 =====

export type PanelType = 'menu' | 'spr' | 'practice' | 'agent' | 'help' | 'keybindings';

export interface Panel {
  type: PanelType;
  title: string;
  render: () => void;
  handleKey: (action: KeymapAction) => boolean;
}

// ===== TUI 类 =====

export class TUI {
  private screen: Widgets.Screen;
  private currentPanel: PanelType = 'menu';
  private currentMode: KeymapMode = 'normal';
  private panels: Map<PanelType, Panel> = new Map();

  // UI 元素
  private sidebar: Widgets.BoxElement;
  private mainContent: Widgets.BoxElement;
  private statusBar: Widgets.BoxElement;
  private menuList: Widgets.ListElement;
  private helpBar: Widgets.BoxElement;
  private commandBox: Widgets.TextboxElement;
  private modeIndicator: Widgets.BoxElement;

  // 菜单项
  private menuItems = [
    { name: 'SPR 学习', panel: 'spr' as PanelType, description: '结构化渐进提取学习' },
    { name: '刻意练习', panel: 'practice' as PanelType, description: '刻意练习模板管理' },
    { name: 'AI Agent', panel: 'agent' as PanelType, description: '智能代理 (PDA)' },
    { name: '键位绑定', panel: 'keybindings' as PanelType, description: '查看和编辑键位' },
    { name: '帮助', panel: 'help' as PanelType, description: '查看帮助' },
  ];

  private commandMode = false;

  constructor() {
    // 创建屏幕
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'PRD Agent - Vim Mode',
      fullUnicode: true,
    });

    // 样式配置
    const style = {
      bg: 'black',
      fg: 'white',
      border: {
        fg: '#444444',
      },
      selected: {
        bg: '#0066cc',
        fg: 'white',
      },
      label: {
        fg: '#ffffff',
        bold: true,
      },
    };

    // 创建模式指示器
    this.modeIndicator = blessed.box({
      parent: this.screen,
      top: 0,
      right: 0,
      width: 10,
      height: 1,
      style: {
        bg: '#0066cc',
        fg: 'white',
      },
      content: ' NORMAL ',
    });

    // 创建侧边栏
    this.sidebar = blessed.box({
      parent: this.screen,
      left: 0,
      top: 1,
      width: 25,
      height: '100%-3',
      border: { type: 'line' },
      style,
      label: ' 导航 ',
    });

    // 创建主内容区
    this.mainContent = blessed.box({
      parent: this.screen,
      left: 25,
      top: 1,
      width: '100%-25',
      height: '100%-3',
      border: { type: 'line' },
      style,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      label: ' 内容 ',
    });

    // 创建命令输入框 (默认隐藏)
    this.commandBox = blessed.textbox({
      parent: this.screen,
      bottom: 2,
      left: 0,
      width: '100%',
      height: 1,
      inputOnFocus: true,
      style: {
        bg: '#333333',
        fg: 'white',
      },
      hidden: true,
    });

    // 创建帮助条
    this.helpBar = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: '#1a1a1a',
        fg: '#666666',
      },
    });

    // 创建状态栏
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: '#0a0a0a',
        fg: '#888888',
      },
    });

    // 创建菜单列表
    this.menuList = blessed.list({
      parent: this.sidebar,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      keys: true,
      vi: true,
      mouse: true,
      style: {
        fg: 'white',
        bg: 'black',
        selected: {
          fg: 'white',
          bg: '#0066cc',
        },
        item: {
          hover: {
            bg: '#222222',
          },
        },
      },
      items: this.menuItems.map((item) => `  ${item.name}`),
    });

    // 注册面板
    this.registerPanels();

    // 绑定事件
    this.bindEvents();

    // 启动配置文件监听
    keymapManager.watchConfig();

    // 监听配置变化
    keymapManager.onChange(() => {
      this.updateStatus('键位配置已重新加载');
      this.renderKeybindings();
      this.screen.render();
    });

    // 初始渲染
    this.renderMenu();
    this.updateStatus('欢迎 - 按 : 进入命令模式');
    this.updateHelp(keymapManager.getHelpText('normal').split('\n').slice(0, 3).join(' | '));
  }

  // ===== 面板注册 =====

  private registerPanels(): void {
    this.panels.set('menu', {
      type: 'menu',
      title: '主菜单',
      render: () => this.renderMenu(),
      handleKey: (action) => this.handleMenuAction(action),
    });

    this.panels.set('spr', {
      type: 'spr',
      title: 'SPR 学习',
      render: () => this.renderSPR(),
      handleKey: (action) => this.handleSPRAction(action),
    });

    this.panels.set('practice', {
      type: 'practice',
      title: '刻意练习',
      render: () => this.renderPractice(),
      handleKey: (action) => this.handlePracticeAction(action),
    });

    this.panels.set('agent', {
      type: 'agent',
      title: 'AI Agent',
      render: () => this.renderAgent(),
      handleKey: (action) => this.handleAgentAction(action),
    });

    this.panels.set('keybindings', {
      type: 'keybindings',
      title: '键位绑定',
      render: () => this.renderKeybindings(),
      handleKey: (action) => this.handleKeybindingsAction(action),
    });

    this.panels.set('help', {
      type: 'help',
      title: '帮助',
      render: () => this.renderHelp(),
      handleKey: (action) => this.handleHelpAction(action),
    });
  }

  // ===== 事件绑定 =====

  private bindEvents(): void {
    // 全局按键处理
    this.screen.key(['C-c'], () => this.quit());

    // 菜单列表选择事件
    this.menuList.on('select', () => this.activateSelectedMenuItem());

    // 命令输入框事件
    this.commandBox.on('submit', () => this.executeCommand());
    this.commandBox.on('cancel', () => this.exitCommandMode());

    // 监听所有按键
    this.screen.on('keypress', (_ch, key) => {
      if (this.commandMode) return;

      const keyName = key.full || key.name || '';
      const action = keymapManager.lookup(keyName);

      if (action) {
        this.handleAction(action);
        this.screen.render();
      } else {
        // 传递给面板处理
        const panel = this.panels.get(this.currentPanel);
        if (panel && action) {
          panel.handleKey(action);
        }
      }
    });
  }

  // ===== 动作处理 =====

  private handleAction(action: KeymapAction): boolean {
    switch (action) {
      // 移动
      case 'move_up':
      case 'move_down':
      case 'move_left':
      case 'move_right':
        if (this.currentPanel === 'menu') {
          if (action === 'move_up') this.menuList.up(1);
          if (action === 'move_down') this.menuList.down(1);
          this.screen.render();
        } else {
          if (action === 'move_up') this.mainContent.scroll(-1);
          if (action === 'move_down') this.mainContent.scroll(1);
          this.screen.render();
        }
        return true;

      // 快速移动
      case 'move_top':
        if (this.currentPanel === 'menu') {
          this.menuList.select(0);
          this.screen.render();
        } else {
          this.mainContent.scrollTo(0);
          this.screen.render();
        }
        return true;

      case 'move_bottom':
        if (this.currentPanel === 'menu') {
          this.menuList.select(this.menuItems.length - 1);
        } else {
          this.mainContent.scroll(this.mainContent.getScrollHeight() as number);
        }
        this.screen.render();
        return true;

      case 'page_up':
        this.mainContent.scroll(-Math.floor((this.mainContent.height as number) / 2));
        this.screen.render();
        return true;

      case 'page_down':
        this.mainContent.scroll(Math.floor((this.mainContent.height as number) / 2));
        this.screen.render();
        return true;

      // 选择和确认
      case 'select':
      case 'confirm':
        if (this.currentPanel === 'menu') {
          this.activateSelectedMenuItem();
        }
        return true;

      // 返回
      case 'cancel':
      case 'back':
        if (this.currentPanel !== 'menu') {
          this.switchPanel('menu');
        }
        return true;

      // 退出
      case 'quit':
        this.quit();
        return true;

      // 命令模式
      case 'command_mode':
        this.enterCommandMode();
        return true;

      // 面板切换
      case 'panel_spr':
        this.switchPanel('spr');
        return true;
      case 'panel_practice':
        this.switchPanel('practice');
        return true;
      case 'panel_agent':
        this.switchPanel('agent');
        return true;
      case 'panel_help':
        this.switchPanel('help');
        return true;

      default:
        // 传递给当前面板处理
        const panel = this.panels.get(this.currentPanel);
        if (panel) {
          return panel.handleKey(action);
        }
        return false;
    }
  }

  // ===== 面板动作处理 =====

  private handleMenuAction(action: KeymapAction): boolean {
    return ['move_up', 'move_down', 'move_top', 'move_bottom', 'select', 'confirm'].includes(action);
  }

  private handleSPRAction(action: KeymapAction): boolean {
    switch (action) {
      case 'cancel':
      case 'back':
        this.switchPanel('menu');
        return true;
      default:
        this.updateStatus(`动作: ${action} - 请使用 REPL 模式`);
        return true;
    }
  }

  private handlePracticeAction(action: KeymapAction): boolean {
    switch (action) {
      case 'cancel':
      case 'back':
        this.switchPanel('menu');
        return true;
      default:
        this.updateStatus(`动作: ${action} - 请使用 REPL 模式`);
        return true;
    }
  }

  private handleAgentAction(action: KeymapAction): boolean {
    switch (action) {
      case 'cancel':
      case 'back':
        this.switchPanel('menu');
        return true;
      default:
        this.updateStatus(`动作: ${action} - 请使用 REPL 模式`);
        return true;
    }
  }

  private handleKeybindingsAction(action: KeymapAction): boolean {
    switch (action) {
      case 'cancel':
      case 'back':
        this.switchPanel('menu');
        return true;
      case 'move_up':
      case 'move_down':
        this.mainContent.scroll(action === 'move_up' ? -1 : 1);
        this.screen.render();
        return true;
      default:
        return true;
    }
  }

  private handleHelpAction(action: KeymapAction): boolean {
    switch (action) {
      case 'cancel':
      case 'back':
        this.switchPanel('menu');
        return true;
      default:
        return true;
    }
  }

  // ===== 命令模式 =====

  private enterCommandMode(): void {
    this.commandMode = true;
    this.commandBox.show();
    this.commandBox.setValue(':');
    this.commandBox.focus();
    this.setMode('command');
    this.screen.render();
  }

  private exitCommandMode(): void {
    this.commandMode = false;
    this.commandBox.hide();
    this.commandBox.setValue('');
    this.mainContent.focus();
    this.setMode('normal');
    this.screen.render();
  }

  private executeCommand(): void {
    const cmd = this.commandBox.getValue().slice(1); // 移除 :
    const result = keymapManager.parseCommand(cmd);

    if (result.action) {
      this.handleAction(result.action);
    } else {
      this.updateStatus(`未知命令: ${cmd}`);
    }

    this.exitCommandMode();
  }

  // ===== 辅助方法 =====

  private setMode(mode: KeymapMode): void {
    this.currentMode = mode;
    keymapManager.setMode(mode);

    const modeLabels: Record<KeymapMode, string> = {
      normal: ' NORMAL ',
      insert: ' INSERT ',
      visual: ' VISUAL ',
      command: ' COMMAND ',
    };

    const modeColors: Record<KeymapMode, string> = {
      normal: '#0066cc',
      insert: '#00cc66',
      visual: '#cc6600',
      command: '#cc0066',
    };

    this.modeIndicator.setContent(modeLabels[mode]);
    (this.modeIndicator.style as any).bg = modeColors[mode];
    this.screen.render();
  }

  private switchPanel(panelType: PanelType): void {
    this.currentPanel = panelType;
    const panel = this.panels.get(panelType);
    if (panel) {
      this.mainContent.setLabel(` ${panel.title} `);
      panel.render();
    }
    this.screen.render();
  }

  private activateSelectedMenuItem(): void {
    // Use the childIndex property which blessed uses to track selection
    const selected = (this.menuList as any).childIndex || 0;

    if (selected >= 0 && selected < this.menuItems.length) {
      const item = this.menuItems[selected];
      this.switchPanel(item.panel);
    } else {
      // Default to first item if no selection
      if (this.menuItems.length > 0) {
        this.switchPanel(this.menuItems[0].panel);
      }
    }
  }

  private updateStatus(message: string): void {
    this.statusBar.setContent(` ${message}`);
    this.screen.render();
  }

  private updateHelp(message: string): void {
    this.helpBar.setContent(` ${message}`);
    this.screen.render();
  }

  // ===== 渲染方法 =====

  private renderMenu(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║              PRD Agent - Vim 风格 TUI 模式                   ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  欢迎使用 PRD Agent！支持 Vim 风格的键位绑定               ║
║                                                            ║
║  基本操作：                                                ║
║    k/↑    - 向上移动                                       ║
║    j/↓    - 向下移动                                       ║
║    h/←    - 向左移动                                       ║
║    l/→    - 向右移动                                       ║
║    gg     - 跳到顶部                                       ║
║    G      - 跳到底部                                       ║
║    Enter  - 选择/确认                                      ║
║    :      - 命令模式                                       ║
║                                                            ║
║  面板快捷键：                                              ║
║    s - SPR 学习    p - 刻意练习    a - AI Agent            ║
║                                                            ║
║  退出：                                                    ║
║    :q     - 退出                                          ║
║    ZZ     - 退出                                          ║
║    C-c    - 强制退出                                       ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  键位配置文件: ~/Library/prd-agent/keybindings.json        ║
║  修改后自动生效                                            ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  private renderSPR(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║                        SPR 学习模块                         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  结构化渐进提取 (SPR) 是一种认知训练方法：                  ║
║                                                            ║
║  1. 分析 Markdown 文件，提取认知训练骨架                    ║
║     • 层级结构：Part -> Chapter -> Slot                    ║
║     • 信息遮蔽：隐藏直接答案                               ║
║     • 元认知标签：抽象化学习内容                            ║
║                                                            ║
║  2. 生成思维导图和关键要点                                  ║
║     • 可视化知识结构                                       ║
║     • 提取核心概念                                         ║
║                                                            ║
║  3. 生成测试题进行练习                                      ║
║     • 填空题、判断题、简答题                               ║
║     • 评估理解程度                                         ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  使用 REPL 模式进行实际操作                                ║
║  运行: prd repl                                           ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  private renderPractice(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║                       刻意练习模块                         ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  刻意练习 (Deliberate Practice) 关键要素：                  ║
║                                                            ║
║  1. 明确的目标                                             ║
║     • 定义具体的技能提升目标                               ║
║     • 设定可衡量的进步指标                                 ║
║                                                            ║
║  2. 专注的练习                                             ║
║     • 全神贯注于练习内容                                   ║
║     • 避免自动化的重复操作                                 ║
║                                                            ║
║  3. 即时反馈                                               ║
║     • 了解自己的表现                                       ║
║     • 识别需要改进的地方                                   ║
║                                                            ║
║  4. 走出舒适区                                             ║
║     • 挑战略高于当前能力的任务                             ║
║     • 持续提升技能水平                                     ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  使用 REPL 模式进行实际操作                                ║
║  运行: prd repl                                           ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  private renderAgent(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║                       AI Agent 模块                        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  智能代理使用 Perceive-Decide-Act (PDA) 循环：              ║
║                                                            ║
║  ┌─────────┐    ┌─────────┐    ┌─────────┐                ║
║  │ Perceive│ -> │ Decide  │ -> │   Act   │                ║
║  │  感知   │    │  决策   │    │  行动   │                ║
║  └─────────┘    └─────────┘    └─────────┘                ║
║       │                              │                     ║
║       └──────────────────────────────┘                     ║
║                    循环往复                                 ║
║                                                            ║
║  功能：                                                    ║
║    • 感知环境信息 (perceive)                                ║
║    • 基于感知做出决策 (decide)                              ║
║    • 执行相应行动 (act)                                     ║
║    • 持久化状态和历史                                       ║
║                                                            ║
║  多 Agent 支持：                                           ║
║    • 创建命名 Agent (:agent new my-agent)                  ║
║    • 独立状态管理                                           ║
║    • 历史记录查询 (:agent history my-agent)                 ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  使用 REPL 模式进行实际操作                                ║
║  运行: prd repl                                           ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  private renderKeybindings(): void {
    const helpText = keymapManager.getHelpText('normal');
    const content = `
╔════════════════════════════════════════════════════════════╗
║                      键位绑定配置                          ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  当前模式: ${this.currentMode.toUpperCase().padEnd(40)} ║
║                                                            ║
║  ${helpText.split('\n').join('\n  ')}
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  自定义键位:                                                ║
║  1. 编辑配置文件:                                           ║
║     ~/Library/prd-agent/keybindings.json                   ║
║                                                            ║
║  2. 配置格式:                                               ║
║     {                                                       ║
║       "normal": [                                           ║
║         {"keys": ["custom_key"], "action": "panel_spr"}    ║
║       ]                                                     ║
║     }                                                       ║
║                                                            ║
║  3. 保存后自动生效                                          ║
║                                                            ║
║  可用动作: move_up, move_down, move_top, move_bottom,       ║
║    select, confirm, cancel, back, quit, save,              ║
║    panel_spr, panel_practice, panel_agent, panel_help     ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  private renderHelp(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║                          帮助                              ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Vim 基本操作：                                            ║
║    h j k l       ← ↓ ↑ → 移动                              ║
║    w b           向前/向后移动单词                          ║
║    gg G          跳到文件开头/结尾                          ║
║    C-f C-b        向下/向上翻页                              ║
║    i a           进入插入模式                              ║
║    Esc           返回普通模式                              ║
║    :             进入命令模式                              ║
║                                                            ║
║  命令模式命令：                                            ║
║    :w             保存 (配置)                              ║
║    :q             退出                                    ║
║    :wq :x         保存并退出                               ║
║    :spr           切换到 SPR 面板                           ║
║    :practice      切换到 Practice 面板                      ║
║    :agent         切换到 Agent 面板                         ║
║    :help          显示帮助                                  ║
║                                                            ║
║  配置热重载：                                              ║
║    修改 ~/Library/prd-agent/keybindings.json              ║
║    保存后立即生效，无需重启                                ║
║                                                            ║
║  使用说明：                                                ║
║    prd            启动 TUI 模式 (默认)                      ║
║    prd repl      启动 REPL 模式                            ║
║    prd tui       启动 TUI 模式                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  // ===== 公共方法 =====

  start(): void {
    this.screen.render();
    this.updateStatus('Vim 模式 - 按 : 进入命令模式');
  }

  quit(): void {
    keymapManager.unwatchConfig();
    this.screen.destroy();
    process.exit(0);
  }

  getCurrentPanel(): PanelType {
    return this.currentPanel;
  }

  getCurrentMode(): KeymapMode {
    return this.currentMode;
  }
}

// ===== 导出 =====

export function createTUI(): TUI {
  return new TUI();
}
