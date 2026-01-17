#!/usr/bin/env node

import { Command } from 'commander';
import { add } from './commands/add.js';
import { list } from './commands/list.js';
import { show } from './commands/show.js';
import { update } from './commands/update.js';
import { deleteCmd } from './commands/delete.js';
import { complete } from './commands/complete.js';
import { search } from './commands/search.js';
import { listTags } from './commands/tags.js';
import { setApiCmd, showConfig, aiGenerate, aiAnalyze, aiSummary } from './commands/ai.js';
import { REPL } from './core/repl.js';
import { printInfo } from './ui/printer.js';

const program = new Command();

program
  .name('prd')
  .description('A CLI task management tool with AI')
  .version('0.1.0');

// 交互模式 (默认)
program
  .command('interactive', { isDefault: true })
  .alias('repl')
  .alias('shell')
  .description('Start interactive REPL mode')
  .action(async () => {
    const repl = new REPL();
    await repl.start();
  });

// 添加任务
program
  .command('add [title]')
  .description('Add a new task')
  .option('-d, --description <text>', 'Task description')
  .option('-p, --priority <level>', 'Task priority (low, medium, high, urgent)')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .action(add);

// 列出任务
program
  .command('list')
  .alias('ls')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status (todo, in-progress, done)')
  .option('-p, --priority <level>', 'Filter by priority (low, medium, high, urgent)')
  .option('--tag <tag>', 'Filter by tag')
  .option('-a, --all', 'Show all tasks including archived')
  .action(list);

// 显示任务详情
program
  .command('show <id-or-index>')
  .description('Show task details')
  .action(show);

// 更新任务
program
  .command('update <id-or-index>')
  .alias('edit')
  .description('Update a task')
  .option('--title <title>', 'New title')
  .option('-d, --description <text>', 'New description')
  .option('-s, --status <status>', 'New status (todo, in-progress, done)')
  .option('-p, --priority <level>', 'New priority (low, medium, high, urgent)')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .action(update);

// 删除任务
program
  .command('delete <id-or-index>')
  .alias('rm')
  .description('Delete a task')
  .option('-f, --force', 'Skip confirmation')
  .action(deleteCmd);

// 完成任务
program
  .command('complete <id-or-index>')
  .alias('done')
  .description('Mark task as complete (toggle)')
  .action(complete);

// 搜索任务
program
  .command('search <query>')
  .description('Search tasks')
  .action(search);

// 列出标签
program
  .command('tags')
  .description('List all tags')
  .action(listTags);

// ===== AI 命令 =====

// 配置
program
  .command('config')
  .description('Manage configuration')
  .action(showConfig);

program
  .command('set-api [key]')
  .description('Set Zhipu AI API Key')
  .action(setApiCmd);

// AI 生成任务
program
  .command('generate [prompt]')
  .alias('gen')
  .description('AI generate tasks from description')
  .action(aiGenerate);

// AI 分析任务
program
  .command('analyze <id-or-index>')
  .alias('ai')
  .description('AI analyze a task')
  .action(aiAnalyze);

// AI 总结
program
  .command('summary')
  .description('AI summarize your tasks')
  .action(aiSummary);

// 解析参数
program.parseAsync(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
