# PRD Agent

一个类似 Claude Code 风格的 CLI 任务管理工具 - 命令行交互模式。

## 功能特性

- 📝 简洁的命令行界面
- 🏷️ 标签分类管理
- 🔍 快速搜索过滤
- 💾 本地数据存储
- 🎨 彩色输出显示

## 安装

```bash
npm install
npm run build
npm link
```

## 使用方法

### 添加任务

```bash
# 快速添加
prd add "Fix the login bug"

# 带优先级和标签
prd add "Update docs" -p high -t documentation

# 完整选项
prd add "New feature" -d "Implement user auth" -p urgent -t feature,auth
```

### 列出任务

```bash
# 列出所有任务
prd list
prd ls

# 过滤状态
prd list --status todo
prd list --status in-progress
prd list --status done

# 过滤优先级
prd list --priority high

# 过滤标签
prd list --tag bug
```

### 显示详情

```bash
# 按索引显示
prd show 1

# 按任务 ID 显示
prd show l3k2j4h5
```

### 更新任务

```bash
# 更新标题
prd update 1 --title "New title"

# 更新状态
prd update 1 --status in-progress
prd update 1 --status done

# 更新优先级
prd update 1 --priority urgent

# 更新标签
prd update 1 --tags bug,urgent

# 组合更新
prd edit 1 --status done --priority high
```

### 完成任务

```bash
# 切换完成状态
prd complete 1
prd done 1
```

### 删除任务

```bash
# 删除（会确认）
prd delete 1
prd rm 1

# 强制删除（不确认）
prd delete 1 --force
```

### 搜索

```bash
prd search "bug"
prd search "login"
```

### 标签

```bash
# 列出所有标签
prd tags
```

## 技术栈

- TypeScript + Node.js
- [commander](https://github.com/tj/commander.js) - CLI 框架
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - 交互式提示
- [chalk](https://github.com/chalk/chalk) - 样式输出

## 数据存储

任务数据默认存储在 `~/.prd-agent/tasks.json`。

可通过环境变量 `PRD_AGENT_DATA` 自定义数据目录。
