#!/usr/bin/env node

import { Command } from 'commander';
import { REPL } from './core/repl.js';

const program = new Command();

program
  .name('prd')
  .description('AI REPL - Powered by Zhipu AI')
  .version('0.1.0');

// 默认启动 REPL
program
  .command('interactive', { isDefault: true })
  .alias('repl')
  .alias('shell')
  .description('Start AI REPL mode')
  .action(async () => {
    const repl = new REPL();
    await repl.start();
  });

// 解析参数
program.parseAsync(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
