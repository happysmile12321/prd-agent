# PRD Agent

一个集成智谱AI 的 CLI 任务管理工具。

## 功能特性

- 📝 简洁的命令行界面
- 🤖 AI 生成任务、分析任务、智能总结
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

## 配置 AI

首先设置智谱AI的 API Key：

```bash
prd set-api f6608b1468ac4416bb69ec9c6a7d99f7.EdbqnjW2wcg2i13U
```

或通过环境变量：

```bash
export ZHIPU_API_KEY=f6608b1468ac4416bb69ec9c6a7d99f7.EdbqnjW2wcg2i13U
```

查看配置：

```bash
prd config
```

## AI 功能

### 生成任务

```bash
# AI 根据描述生成任务
prd gen "准备下个月的产品发布"

prd generate "实现用户登录功能，包括注册、登录、找回密码"
```

### 分析任务

```bash
prd analyze 1
prd ai 1
```

### 智能总结

```bash
prd summary
```

## 常规命令

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
prd complete 1
prd done 1
```

### 删除任务

```bash
prd delete 1
prd rm 1

# 强制删除
prd delete 1 --force
```

### 搜索

```bash
prd search "bug"
prd search "login"
```

### 标签

```bash
prd tags
```

## 技术栈

- TypeScript + Node.js
- [commander](https://github.com/tj/commander.js) - CLI 框架
- [inquirer](https://github.com/SBoudrias/Inquirer.js) - 交互式提示
- [chalk](https://github.com/chalk/chalk) - 样式输出
- 智谱AI API

## 数据存储

任务数据存储在 `~/.prd-agent/`：
- `tasks.json` - 任务数据
- `config.json` - 配置文件（API Key）
