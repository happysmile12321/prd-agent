/**
 * TUI Mode - Terminal User Interface
 * Similar to lazygit's interface with panels and keyboard navigation
 */

import blessed, { Widgets } from 'blessed';

// ===== 类型定义 =====

export type PanelType = 'menu' | 'spr' | 'practice' | 'agent' | 'help';

export interface Panel {
  type: PanelType;
  title: string;
  render: () => void;
  handleKey: (key: string) => boolean;
}

// ===== TUI 类 =====

export class TUI {
  private screen: Widgets.Screen;
  private currentPanel: PanelType = 'menu';
  private panels: Map<PanelType, Panel> = new Map();
  private sidebar: Widgets.BoxElement;
  private mainContent: Widgets.BoxElement;
  private statusBar: Widgets.BoxElement;
  private menuList: Widgets.ListElement;
  private helpBar: Widgets.BoxElement;

  // 菜单项
  private menuItems = [
    { name: 'SPR 学习', key: 's', panel: 'spr' as PanelType, description: '结构化渐进提取学习' },
    { name: '刻意练习', key: 'p', panel: 'practice' as PanelType, description: '刻意练习模板管理' },
    { name: 'AI Agent', key: 'a', panel: 'agent' as PanelType, description: '智能代理 (PDA)' },
    { name: '帮助', key: '?', panel: 'help' as PanelType, description: '查看帮助' },
    { name: '退出', key: 'q', panel: 'menu' as PanelType, description: '退出程序' },
  ];

  private selectedMenuIndex = 0;

  constructor() {
    // 创建屏幕
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'PRD Agent',
      fullUnicode: true,
    });

    // 样式配置
    const style = {
      bg: 'black',
      fg: 'white',
      border: {
        fg: '#666666',
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

    // 创建侧边栏
    this.sidebar = blessed.box({
      parent: this.screen,
      left: 0,
      top: 0,
      width: 25,
      height: '100%-2',
      border: { type: 'line' },
      style,
      label: ' 导航 ',
    });

    // 创建主内容区
    this.mainContent = blessed.box({
      parent: this.screen,
      left: 25,
      top: 0,
      width: '100%-25',
      height: '100%-2',
      border: { type: 'line' },
      style,
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
      label: ' 内容 ',
    });

    // 创建状态栏
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: '#333333',
        fg: 'white',
      },
    });

    // 创建帮助条
    this.helpBar = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: '#222222',
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
      items: this.menuItems.map((item) => `${item.key} - ${item.name}`),
    });

    // 注册面板
    this.registerPanels();

    // 绑定事件
    this.bindEvents();

    // 初始渲染
    this.renderMenu();
    this.updateStatus('欢迎');
    this.updateHelp('↑↓:导航 | Enter:选择 | q:退出 | ?:帮助');
  }

  // 注册所有面板
  private registerPanels(): void {
    // 菜单面板
    this.panels.set('menu', {
      type: 'menu',
      title: '主菜单',
      render: () => this.renderMenu(),
      handleKey: (key) => this.handleMenuKey(key),
    });

    // SPR 面板
    this.panels.set('spr', {
      type: 'spr',
      title: 'SPR 学习',
      render: () => this.renderSPR(),
      handleKey: (key) => this.handleSPRKey(key),
    });

    // Practice 面板
    this.panels.set('practice', {
      type: 'practice',
      title: '刻意练习',
      render: () => this.renderPractice(),
      handleKey: (key) => this.handlePracticeKey(key),
    });

    // Agent 面板
    this.panels.set('agent', {
      type: 'agent',
      title: 'AI Agent',
      render: () => this.renderAgent(),
      handleKey: (key) => this.handleAgentKey(key),
    });

    // 帮助面板
    this.panels.set('help', {
      type: 'help',
      title: '帮助',
      render: () => this.renderHelp(),
      handleKey: (key) => this.handleHelpKey(key),
    });
  }

  // 绑定键盘事件
  private bindEvents(): void {
    // 菜单列表选择事件
    this.menuList.on('select', (_, selected) => {
      this.selectedMenuIndex = selected;
      this.activateSelectedMenuItem();
    });

    // 全局键盘事件
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.quit();
    });

    // 菜单快捷键
    this.menuItems.forEach((item, index) => {
      this.screen.key(item.key, () => {
        if (item.key === 'q') {
          this.quit();
        } else {
          this.switchPanel(item.panel);
          this.selectedMenuIndex = index;
          this.menuList.select(index);
        }
      });
    });

    // 返回键
    this.screen.key(['backspace', 'b'], () => {
      if (this.currentPanel !== 'menu') {
        this.switchPanel('menu');
      }
    });
  }

  // 切换面板
  private switchPanel(panelType: PanelType): void {
    this.currentPanel = panelType;
    const panel = this.panels.get(panelType);
    if (panel) {
      this.mainContent.setLabel(` ${panel.title} `);
      panel.render();
      this.updateHelpForPanel(panelType);
    }
    this.screen.render();
  }

  // 激活选中的菜单项
  private activateSelectedMenuItem(): void {
    const item = this.menuItems[this.selectedMenuIndex];
    if (item.key === 'q') {
      this.quit();
    } else {
      this.switchPanel(item.panel);
    }
  }

  // 更新状态栏
  private updateStatus(message: string): void {
    this.statusBar.setContent(` ${message}`);
    this.screen.render();
  }

  // 更新帮助条
  private updateHelp(message: string): void {
    this.helpBar.setContent(` ${message}`);
    this.screen.render();
  }

  // 更新面板帮助信息
  private updateHelpForPanel(panel: PanelType): void {
    const helps: Record<PanelType, string> = {
      menu: '↑↓:选择 | Enter:确认 | q:退出',
      spr: 'a:分析 | s:摘要 | t:任务列表 | b:返回 | q:退出',
      practice: 'l:列表 | c:创建 | s:开始 | b:返回 | q:退出',
      agent: 'p:感知 | d:决策 | e:执行 | r:运行 | b:返回 | q:退出',
      help: 'b:返回 | q:退出',
    };
    this.updateHelp(helps[panel]);
  }

  // ===== 渲染方法 =====

  private renderMenu(): void {
    const content = `
╔════════════════════════════════════════════════════════════╗
║                    PRD Agent - TUI 模式                     ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  欢迎使用 PRD Agent！这是一个功能强大的 AI 辅助学习工具   ║
║                                                            ║
║  使用左侧菜单导航，或按快捷键：                            ║
║    s - SPR 学习模块                                        ║
║    p - 刻意练习模块                                        ║
║    a - AI Agent 模块                                       ║
║    ? - 帮助                                                ║
║    q - 退出                                                ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  Powered by Zhipu AI                                       ║
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
║  按键操作:                                                 ║
║    a - 分析文件     t - 查看任务                           ║
║    s - 生成摘要     b - 返回菜单                           ║
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
║  刻意练习 (Deliberate Practice) 是有目的的练习：            ║
║                                                            ║
║  1. 模板管理                                               ║
║     • 创建练习模板                                         ║
║     • 定义学习目标                                         ║
║     • 设置触发点和陷阱                                     ║
║     • 跟踪掌握状态                                         ║
║                                                            ║
║  2. 练习会话                                               ║
║     • 生成练习场景                                         ║
║     • 执行刻意练习                                         ║
║     • 记录练习结果                                         ║
║                                                            ║
║  3. 复盘反思                                               ║
║     • AI 辅助反思                                          ║
║     • 工作流改进建议                                       ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  按键操作:                                                 ║
║    l - 模板列表     c - 创建模板                           ║
║    s - 开始练习     b - 返回菜单                           ║
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
║    • 感知环境信息                                          ║
║    • 基于感知做出决策                                      ║
║    • 执行相应行动                                          ║
║    • 持久化状态和历史                                      ║
║                                                            ║
║  多 Agent 支持：                                           ║
║    • 创建命名 Agent                                        ║
║    • 独立状态管理                                          ║
║    • 历史记录查询                                          ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║  按键操作:                                                 ║
║    p - 感知    d - 决策    e - 执行                        ║
║    r - 运行    s - 状态    b - 返回菜单                    ║
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
║  全局快捷键：                                              ║
║    q / Ctrl+C - 退出程序                                   ║
║    b / Backspace - 返回上一级                              ║
║    ? - 显示帮助                                            ║
║                                                            ║
║  导航：                                                    ║
║    ↑ / k - 向上移动                                        ║
║    ↓ / j - 向下移动                                        ║
║    Enter - 确认选择                                        ║
║                                                            ║
║  模块快捷键：                                              ║
║    s - SPR 学习模块                                        ║
║    p - 刻意练习模块                                        ║
║    a - AI Agent 模块                                       ║
║                                                            ║
║  命令行模式：                                              ║
║    不带参数启动进入 TUI 模式                               ║
║    带 --repl 参数进入 REPL 模式                            ║
║                                                            ║
║  更多信息：                                                ║
║    https://github.com/anthropics/prd-agent                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`;
    this.mainContent.setContent(content);
    this.screen.render();
  }

  // ===== 键盘处理 =====

  private handleMenuKey(key: string): boolean {
    const handledKeys = ['up', 'down', 'k', 'j', 'enter'];
    return handledKeys.includes(key.toLowerCase());
  }

  private handleSPRKey(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'b':
      case 'escape':
        this.switchPanel('menu');
        return true;
      case 'a':
        this.updateStatus('请使用 REPL 模式进行文件分析');
        return true;
      case 's':
        this.updateStatus('请使用 REPL 模式生成摘要');
        return true;
      case 't':
        this.updateStatus('请使用 REPL 模式查看任务');
        return true;
      default:
        return false;
    }
  }

  private handlePracticeKey(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'b':
      case 'escape':
        this.switchPanel('menu');
        return true;
      case 'l':
        this.updateStatus('请使用 REPL 模式列出模板');
        return true;
      case 'c':
        this.updateStatus('请使用 REPL 模式创建模板');
        return true;
      case 's':
        this.updateStatus('请使用 REPL 模式开始练习');
        return true;
      default:
        return false;
    }
  }

  private handleAgentKey(key: string): boolean {
    switch (key.toLowerCase()) {
      case 'b':
      case 'escape':
        this.switchPanel('menu');
        return true;
      case 'p':
        this.updateStatus('请使用 REPL 模式进行感知');
        return true;
      case 'd':
        this.updateStatus('请使用 REPL 模式进行决策');
        return true;
      case 'e':
        this.updateStatus('请使用 REPL 模式执行行动');
        return true;
      case 'r':
        this.updateStatus('请使用 REPL 模式运行 Agent');
        return true;
      case 's':
        this.updateStatus('请使用 REPL 模式查看状态');
        return true;
      default:
        return false;
    }
  }

  private handleHelpKey(key: string): boolean {
    if (key.toLowerCase() === 'b' || key === 'escape') {
      this.switchPanel('menu');
      return true;
    }
    return false;
  }

  // ===== 公共方法 =====

  /**
   * 启动 TUI
   */
  start(): void {
    this.screen.render();
    this.updateStatus('按 ? 查看帮助');
  }

  /**
   * 退出 TUI
   */
  quit(): void {
    this.screen.destroy();
    process.exit(0);
  }

  /**
   * 获取当前面板类型
   */
  getCurrentPanel(): PanelType {
    return this.currentPanel;
  }
}

// ===== 导出 =====

export function createTUI(): TUI {
  return new TUI();
}
