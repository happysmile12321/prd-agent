import chalk from 'chalk';

// 打印成功消息
export function printSuccess(message: string): void {
  console.log(chalk.green(`  ✓ ${message}`));
  console.log();
}

// 打印错误消息
export function printError(message: string): void {
  console.error(chalk.red(`  ✗ ${message}`));
  console.log();
}

// 打印信息消息
export function printInfo(message: string): void {
  console.log(chalk.blue(`  ℹ ${message}`));
  console.log();
}
