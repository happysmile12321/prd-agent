import inquirer from 'inquirer';
import { getTaskManager } from '../core/task-manager.js';
import { setApiKey, getApiKey } from '../core/config.js';
import { generateTasks, analyzeTask, summarizeTasks } from '../core/ai.js';
import { printSuccess, printError, printInfo } from '../ui/printer.js';
import { TaskPriority } from '../types/task.js';

// 设置 API Key
export async function setApiCmd(key?: string): Promise<void> {
  let apiKey = key;

  if (!key) {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'key',
        message: 'Enter your Zhipu AI API Key:',
        mask: '*',
      },
    ]);
    apiKey = answers.key;
  }

  if (!apiKey || apiKey.length < 10) {
    printError('Invalid API key');
    return;
  }

  await setApiKey(apiKey);
  printSuccess('API key saved');
}

// 查看配置
export async function showConfig(): Promise<void> {
  const apiKey = await getApiKey();

  console.log();
  if (apiKey) {
    console.log(`  API Key: ${apiKey.slice(0, 8)}${'*'.repeat(apiKey.length - 8)}`);
  } else {
    console.log('  API Key: Not configured');
    console.log('  Set it with: prd config set-api <your-key>');
  }
  console.log();
}

// AI 生成任务
export async function aiGenerate(prompt?: string): Promise<void> {
  const manager = getTaskManager();

  let inputPrompt = prompt;

  if (!inputPrompt) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'prompt',
        message: 'Describe what you want to do:',
        validate: (input: string) => input.trim().length > 0 || 'Prompt is required',
      },
    ]);
    inputPrompt = answers.prompt;
  }

  printInfo('Generating tasks...');

  try {
    const tasks = await generateTasks(inputPrompt);

    if (tasks.length === 0) {
      printInfo('No tasks generated');
      return;
    }

    console.log();
    console.log(`  Generated ${tasks.length} tasks:`);
    console.log();

    for (let i = 0; i < tasks.length; i++) {
      console.log(`    ${i + 1}. ${tasks[i]}`);
    }

    console.log();

    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Add these tasks?',
        default: true,
      },
    ]);

    if (answers.confirm) {
      for (const taskTitle of tasks) {
        await manager.create({
          title: taskTitle,
          priority: TaskPriority.Medium,
        });
      }
      printSuccess(`Added ${tasks.length} tasks`);
    } else {
      printInfo('Cancelled');
    }
  } catch (error) {
    printError((error as Error).message);
  }
}

// AI 分析任务
export async function aiAnalyze(idOrIndex: string): Promise<void> {
  const manager = getTaskManager();

  // 查找任务
  let task;
  const indexNum = parseInt(idOrIndex, 10);
  if (!isNaN(indexNum)) {
    task = await manager.getByIndex(indexNum);
  } else {
    task = await manager.getById(idOrIndex);
  }

  if (!task) {
    printError(`Task not found: ${idOrIndex}`);
    return;
  }

  printInfo('Analyzing task...');

  try {
    const analysis = await analyzeTask(task.title, task.description);

    const displayIndex = indexNum || task.id.slice(0, 8);

    console.log();
    console.log(`  ╭─────────────────────────────────────────────────────╮`);
    console.log(`  │  AI Analysis for Task #${displayIndex}                           │`);
    console.log(`  ╰─────────────────────────────────────────────────────╯`);
    console.log();
    console.log(`  ${task.title}`);
    console.log();

    // 显示分析结果
    const lines = analysis.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }

    console.log();
  } catch (error) {
    printError((error as Error).message);
  }
}

// AI 总结任务列表
export async function aiSummary(): Promise<void> {
  const manager = getTaskManager();
  const tasks = await manager.getAll();

  if (tasks.length === 0) {
    printInfo('No tasks to summarize');
    return;
  }

  printInfo('Analyzing your tasks...');

  try {
    const summary = await summarizeTasks(
      tasks.map((t) => ({ title: t.title, status: t.status }))
    );

    console.log();
    console.log(`  ╭─────────────────────────────────────────────────────╮`);
    console.log(`  │  AI Summary                                              │`);
    console.log(`  ╰─────────────────────────────────────────────────────╯`);
    console.log();

    const lines = summary.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }

    console.log();
  } catch (error) {
    printError((error as Error).message);
  }
}
