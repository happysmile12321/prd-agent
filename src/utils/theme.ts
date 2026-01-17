// 颜色常量
export const colors = {
  // 主色
  primary: '#06b6d4',
  secondary: '#64748b',
  accent: '#fbbf24',

  // 状态色
  success: '#22c55e',
  warning: '#f97316',
  error: '#ef4444',
  info: '#3b82f6',

  // 中性色
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// 主题 hook
export const useTheme = () => {
  return {
    colors,

    // 便捷方法
    primary: (text: string) => `<color="${colors.primary}">${text}</color>`,
    success: (text: string) => `<color="${colors.success}">${text}</color>`,
    warning: (text: string) => `<color="${colors.warning}">${text}</color>`,
    error: (text: string) => `<color="${colors.error}">${text}</color>`,
    info: (text: string) => `<color="${colors.info}">${text}</color>`,
    muted: (text: string) => `<color="${colors.gray[500]}">${text}</color>`,

    // 状态相关
    statusColor: (status: string): string => {
      switch (status) {
        case 'done':
          return colors.success;
        case 'in_progress':
          return colors.info;
        case 'todo':
          return colors.gray[500];
        default:
          return colors.gray[500];
      }
    },

    // 优先级相关
    priorityColor: (priority: number): string => {
      switch (priority) {
        case 4: // urgent
          return colors.error;
        case 3: // high
          return colors.warning;
        case 2: // medium
          return colors.info;
        case 1: // low
          return colors.gray[500];
        default:
          return colors.gray[500];
      }
    },
  };
};
