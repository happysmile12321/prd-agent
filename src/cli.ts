#!/usr/bin/env node

import { Command } from 'commander';
import { REPL } from './core/repl.js';
import { createTUI } from './ui/tui/index.js';

const program = new Command();

program
  .name('prd')
  .description('AI Agent CLI - Powered by Zhipu AI')
  .version('0.1.0');

// TUI 模式 (默认)
program
  .command('tui', { isDefault: true })
  .alias('ui')
  .description('Start TUI (Terminal User Interface) mode')
  .action(() => {
    const tui = createTUI();
    tui.start();
  });

// REPL 模式
program
  .command('repl')
  .alias('shell')
  .alias('interactive')
  .description('Start REPL (Read-Eval-Print Loop) mode')
  .action(async () => {
    const repl = new REPL();
    await repl.start();
  });

// 解析参数
program.parseAsync(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
