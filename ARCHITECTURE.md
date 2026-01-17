# PRD Agent - Node.js TUI 架构

## 项目概述

一个类似 lazygit 风格的通用任务管理 TUI 工具。

## 技术栈

- **语言**: TypeScript + Node.js
- **TUI 框架**: [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- **样式**: chalk
- **图标**: figures
- **架构模式**: React + Hooks + Context

## 目录结构

```
prd-agent/
├── src/
│   ├── cli.ts                    # CLI 入口
│   ├── app.tsx                   # 主应用组件
│   │
│   ├── types/                    # 类型定义
│   │   ├── task.ts               # 任务类型
│   │   ├── state.ts              # 状态类型
│   │   └── config.ts             # 配置类型
│   │
│   ├── store/                    # 状态管理
│   │   ├── context.tsx           # React Context
│   │   ├── reducer.ts            # 状态 reducer
│   │   └── actions.ts            # Action 定义
│   │
│   ├── components/               # UI 组件
│   │   ├── layout/               # 布局组件
│   │   │   ├── AppLayout.tsx     # 应用布局
│   │   │   ├── Sidebar.tsx       # 侧边栏
│   │   │   └── StatusBar.tsx     # 状态栏
│   │   │
│   │   ├── task/                 # 任务组件
│   │   │   ├── TaskList.tsx      # 任务列表
│   │   │   ├── TaskItem.tsx      # 任务项
│   │   │   └── TaskDetail.tsx    # 任务详情
│   │   │
│   │   ├── common/               # 通用组件
│   │   │   ├── Box.tsx           # 容器
│   │   │   ├── Text.tsx          # 文本
│   │   │   ├── Border.tsx        # 边框
│   │   │   └── HelpPanel.tsx     # 帮助面板
│   │   │
│   │   └── hooks/                # 自定义 Hooks
│   │       ├── useInput.ts       # 键盘输入
│   │       ├── useFocus.ts       # 焦点管理
│   │       └── useDimensions.ts  # 尺寸获取
│   │
│   ├── utils/                    # 工具函数
│   │   ├── storage.ts            # 本地存储
│   │   ├── keymap.ts             # 按键映射
│   │   └── theme.ts              # 主题配置
│   │
│   └── config/                   # 配置文件
│       ├── keybindings.ts        # 快捷键配置
│       └── theme.ts              # 主题定义
│
├── package.json
├── tsconfig.json
└── tsup.config.ts

```

## UI 布局

```
┌─────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────┐  ┌──────────┐  │
│  │          │  │                 │  │          │  │
│  │ Sidebar  │  │   Task List     │  │ Detail   │  │
│  │          │  │                 │  │          │  │
│  │          │  │                 │  │          │  │
│  └──────────┘  └─────────────────┘  └──────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │              Status Bar                      │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  ↑↓ navigate  | n new | e edit | ? help      │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 核心概念

### 1. Component 组件

所有 UI 组件都是 React 组件，使用 Ink 渲染。

```tsx
import { Box, Text } from 'ink'

const TaskItem = ({ task, isSelected }: TaskItemProps) => (
  <Box>
    <Text color={isSelected ? 'blue' : 'gray'}>{task.title}</Text>
  </Box>
)
```

### 2. Context 状态管理

使用 React Context 进行全局状态管理。

```tsx
const AppContext = createContext<AppState>()

const useApp = () => useContext(AppContext)
```

### 3. 自定义 Hooks

封装常用逻辑。

```tsx
const useKeymap = (keymap: KeyMap) => {
  useInput((input, key) => {
    // 处理按键
  })
}
```

## 快捷键设计

| 按键 | 功能 |
|------|------|
| `q` / `ESC` | 退出/返回 |
| `↑` / `k` | 上移 |
| `↓` / `j` | 下移 |
| `Enter` | 打开详情 |
| `n` | 新建任务 |
| `e` | 编辑任务 |
| `d` | 删除任务 |
| `/` | 搜索/过滤 |
| `?` | 帮助 |
| `x` | 标记完成 |
| `tab` | 切换面板 |

## 开发流程

1. 安装依赖: `npm install`
2. 开发模式: `npm run dev`
3. 构建: `npm run build`
4. 运行: `npm start`
