// 快捷键绑定
export interface KeyBinding {
  key: string;
  description: string;
  action: string;
}

// 快捷键分组
export interface KeyBindingGroup {
  title: string;
  items: KeyBinding[];
}

// 默认快捷键配置
export const defaultKeyBindings: KeyBindingGroup[] = [
  {
    title: 'Navigation',
    items: [
      { key: '↑/k', description: 'Move up', action: 'navigate_up' },
      { key: '↓/j', description: 'Move down', action: 'navigate_down' },
      { key: 'Enter', description: 'View details', action: 'select' },
      { key: 'Tab', description: 'Switch panel', action: 'switch_panel' },
    ],
  },
  {
    title: 'Task Actions',
    items: [
      { key: 'n', description: 'New task', action: 'new_task' },
      { key: 'e', description: 'Edit task', action: 'edit_task' },
      { key: 'd', description: 'Delete task', action: 'delete_task' },
      { key: 'x', description: 'Toggle complete', action: 'toggle_complete' },
    ],
  },
  {
    title: 'Other',
    items: [
      { key: '/', description: 'Search', action: 'search' },
      { key: '?', description: 'Help', action: 'help' },
      { key: 'q', description: 'Quit', action: 'quit' },
      { key: 'ESC', description: 'Back', action: 'back' },
    ],
  },
];

// 主题颜色
export interface ThemeColors {
  // 主色
  primary: string;
  secondary: string;
  accent: string;

  // 状态色
  success: string;
  warning: string;
  error: string;
  info: string;

  // 中性色
  gray: {
    light: string;
    medium: string;
    dark: string;
  };
}

// 默认主题（类似 lazygit）
export const defaultTheme: ThemeColors = {
  primary: '#06b6d4',      // cyan-500
  secondary: '#64748b',    // slate-500
  accent: '#fbbf24',       // amber-400

  success: '#22c55e',      // green-500
  warning: '#f97316',      // orange-500
  error: '#ef4444',        // red-500
  info: '#3b82f6',         // blue-500

  gray: {
    light: '#94a3b8',      // slate-400
    medium: '#64748b',     // slate-500
    dark: '#475569',       // slate-600
  },
};
