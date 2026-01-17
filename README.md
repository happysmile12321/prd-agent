# AI REPL

一个集成智谱AI 的常驻 REPL 交互环境。

## 功能特性

- 🤖 智能对话 - 持续对话上下文
- 💻 代码生成 - 支持多种编程语言
- 🔍 代码审查 - 指出问题、改进建议
   - 📖 代码解释 - 解释代码逻辑
- 📝 文本处理 - 总结、润色、翻译
- ⌨️ TAB 自动补全
- 💬 聊天历史记录

## 安装

```bash
npm install
npm run build
```

## 启动

```bash
npm start
```

## 使用方法

```
╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮
╎  AI REPL - Powered by Zhipu AI                   ╎
╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯

Type help or ? to see available commands.
Type exit or q to leave.
```

## 命令

### AI 聊天

```bash
# 一次性提问
ask 如何实现快速排序

# 进入对话模式（持续对话）
talk

chat 退出对话模式
```

### 代码相关

```bash
# 生成代码
code 实现一个二叉树

# 指定语言
code 写一个冒泡排序 -l python

# 代码审查
review function add(a, b) { return a + b; }

# 指定语言审查
review const data = [1, 2, 3]; -l javascript

# 解释代码
explain for (let i = 0; i < n; i++)
```

### 文本处理

```bash
# 总结
summary 一段很长的文本...

# 润色
polish 这段话需要润色

# 翻译
translate Hello World -t Japanese
```

### 其他

```bash
# 查看对话历史
history

# 清空历史
clear-history

# 设置 API Key
set-api f6608b1468ac4416bb69ec9c6a7d99f7.EdbqnjW2wcg2i13U

# 清屏
clear / cls

# 退出
exit / quit / q
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| TAB | 自动补全命令和参数 |
| ↑↓ | 浏览命令历史 |
| Enter | 执行命令 |
| Ctrl+C | 退出程序 |
| Ctrl+D | 退出程序 |

## 数据存储

配置和历史存储在 `~/.prd-agent/config.json`：
- `zhipuApiKey` - 智谱AI API Key
- `history` - 聊天历史记录（最近50条）
- `prompts` - 保存的自定义提示词

## 技术栈

- TypeScript + Node.js
- Node.js readline - REPL 环境
- 智谱AI API (GLM-4-Flash)
- chalk - 样式输出
