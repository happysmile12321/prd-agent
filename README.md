# PRD Agent

一个集成智谱AI的 CLI 任务管理工具，类似 Claude Code 的常驻 REPL 环境。

## 功能特性

- 📝 常驻 REPL 交互环境
- 🤖 AI 生成任务、分析任务、智能总结
- 🏷️ 标签分类管理
- 🔍 快速搜索过滤
- 💾 本地数据存储
- 🎨 彩色输出显示
- ⌨️ TAB 自动补全

## 安装

```bash
npm install
npm run build
```

## 使用

### 启动 REPL（默认模式）

```bash
npm start
# 或
npm run repl
```

### REPL 交互示例

```
prd> add "Fix login bug" -p high
✓ Task created: [l3k2j4h5] Fix login bug

prd> ls -s todo
[1] ─────────────────────────────────────
📌 Fix login bug
╎  Status: ⏸ todo  Priority: 🔴 high
...

prd> gen "准备发布产品"
AI generating tasks...
Added 3 tasks

prd> analyze 1
AI analyzing task...

prd> q
Goodbye! 👋
```

### 内置命令

| 命令 | 别名 | 说明 |
|------|------|------|
| `add` | a, new | 添加任务 |
| `list` | ls, l | 列出任务 |
| `show` | s, info | 显示详情 |
| `update` | edit, u, e | 更新任务 |
| `delete` | rm, del, d | 删除任务 |
| `complete` | done, x, c | 完成任务 |
| `search` | ? | 搜索任务 |
| `tags` | t | 列出标签 |
| `stats` | stat | 显示统计 |
| `generate` | gen | AI 生成任务 |
| `analyze` | ai | AI 分析任务 |
| `summary` | sum | AI 智能总结 |
| `set-api` | config | 设置 API Key |
| `help` | h, ? | 帮助 |
| `clear` | cls | 清屏 |
| `exit` | quit, q | 退出 |

### 命令格式

```
# 添加任务
add "任务标题" -p high -t tag1,tag2

# 列出任务
list -s todo
list -p high
list --tag bug

# 更新任务
update 1 --title "新标题"
update 1 --status done
update 1 --priority urgent

# 完成任务
complete 1
x 1

# 删除任务
delete 1
rm 1

# AI 功能
generate "准备发布产品"
analyze 1
ai 1
summary

# 设置 API Key
set-api f6608b1468ac4416bb69ec9c6a7d99f7.EdbqnjW2wcg2i13U
```

## 技术栈

- TypeScript + Node.js
- [commander](https://github.com/tj/commander.js) - CLI 框架
- [chalk](https://github.com/chalk/chalk) - 样式输出
- Node.js readline - REPL 环境
- 智谱AI API

## 数据存储

数据存储在 `~/.prd-agent/`：
- `tasks.json` - 任务数据
- `config.json` - 配置文件（API Key）
