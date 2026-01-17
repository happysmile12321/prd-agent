import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';
import { getTaskManager } from '../core/task-manager.js';
import { setApiKey } from '../core/config.js';
import { generateTasks, analyzeTask, summarizeTasks } from '../core/ai.js';
import { printSuccess, printError, printInfo, printTaskList, printTaskDetail, printTags, printStats } from '../ui/printer.js';
import { TaskStatus, TaskPriority } from '../types/task.js';

// 命令类型
interface Command {
  name: string;
  aliases: string[];
  description: string;
  handler: (args: string[]) => Promise<void> | void;
}

// REPL 环境
export class REPL {
  private rl: ReturnType<typeof createInterface>;
  private manager: ReturnType<typeof getTaskManager>;
  private commands: Map<string, Command> = new Map();
  private history: string[] = [];
  private running = true;

  constructor() {
    this.manager = getTaskManager();
    this.setupCommands();
    this.rl = this.createInterface();
  }

  // 创建 readline 接口
  private createInterface() {
    const rl = createInterface({
      input,
      output,
      completer: (line: string) => {
        const parts = line.trim().split(/\s+/);
        const command = parts[0];

        // 补全命令
        if (parts.length === 1) {
          const matches = Array.from(this.commands.keys())
            .filter((cmd) => cmd.startsWith(command))
            .sort();

          return [matches, line];
        }

        // 补全参数（状态）
        if (['list', 'ls'].includes(command) && (parts.includes('-s') || parts.includes('--status'))) {
          const statuses = ['todo', 'in-progress', 'done'];
          const lastPart = parts[parts.length - 1];
          const matches = statuses.filter((s) => s.startsWith(lastPart));
          if (matches.length > 0) {
            return [matches, line];
          }
        }

        // 补全参数（优先级）
        if (['list', 'ls', 'add'].includes(command) && (parts.includes('-p') || parts.includes('--priority'))) {
          const priorities = ['low', 'medium', 'high', 'urgent'];
          const lastPart = parts[parts.length - 1];
          const matches = priorities.filter((p) => p.startsWith(lastPart));
          if (matches.length > 0) {
            return [matches, line];
          }
        }

        return [[], line];
      },
    });

    rl.on('line', (line) => {
      if (line.trim()) {
        this.history.push(line.trim());
      }
    });

    return rl;
  }

  // 设置命令
  private setupCommands(): void {
    // 任务管理
    this.register({
      name: 'add',
      aliases: ['a', 'new'],
      description: 'Add a new task. Usage: add <title> [-p priority] [-t tags]',
      handler: async (args) => this.cmdAdd(args),
    });

    this.register({
      name: 'list',
      aliases: ['ls', 'l'],
      description: 'List tasks. Usage: list [--status| -s status] [--priority| -p priority] [--tag tag]',
      handler: async (args) => this.cmdList(args),
    });

    this.register({
      name: 'show',
      aliases: ['s', 'info'],
      description: 'Show task details. Usage: show <id>',
      handler: async (args) => this.cmdShow(args),
    });

    this.register({
      name: 'update',
      aliases: ['edit', 'u', 'e'],
      description: 'Update a task. Usage: update <id> [--title] [--status] [--priority] [--tags]',
      handler: async (args) => this.cmdUpdate(args),
    });

    this.register({
      name: 'delete',
      aliases: ['rm', 'del', 'd'],
      description: 'Delete a task. Usage: delete <id>',
      handler: async (args) => this.cmdDelete(args),
    });

    this.register({
      name: 'complete',
      aliases: ['done', 'x', 'c'],
      description: 'Mark task as complete. Usage: complete <id>',
      handler: async (args) => this.cmdComplete(args),
    });

    this.register({
      name: 'search',
      aliases: ['?'],
      description: 'Search tasks. Usage: search <query>',
      handler: async (args) => this.cmdSearch(args),
    });

    this.register({
      name: 'tags',
      aliases: ['t'],
      description: 'List all tags',
      handler: async () => this.cmdTags(),
    });

    this.register({
      name: 'stats',
      aliases: ['stat'],
      description: 'Show statistics',
      handler: async () => this.cmdStats(),
    });

    // AI 命令
    this.register({
      name: 'generate',
      aliases: ['gen', 'ai-gen'],
      description: 'AI generate tasks. Usage: generate <prompt>',
      handler: async (args) => this.cmdGenerate(args),
    });

    this.register({
      name: 'analyze',
      aliases: ['ai', 'analyse'],
      description: 'AI analyze a task. Usage: analyze <id>',
      handler: async (args) => this.cmdAnalyze(args),
    });

    this.register({
      name: 'summary',
      aliases: ['sum'],
      description: 'AI summarize your tasks',
      handler: async () => this.cmdSummary(),
    });

    // 配置
    this.register({
      name: 'set-api',
      aliases: ['config'],
      description: 'Set API key. Usage: set-api <key>',
      handler: async (args) => this.cmdSetApi(args),
    });

    // 系统
    this.register({
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show this help message',
      handler: async () => this.cmdHelp(),
    });

    this.register({
      name: 'clear',
      aliases: ['cls'],
      description: 'Clear screen',
      handler: async () => this.cmdClear(),
    });

    this.register({
      name: 'exit',
      aliases: ['quit', 'q'],
      description: 'Exit the REPL',
      handler: async () => this.cmdExit(),
    });
  }

  // 注册命令
  private register(cmd: Command): void {
    this.commands.set(cmd.name, cmd);
    for (const alias of cmd.aliases) {
      this.commands.set(alias, { ...cmd, name: cmd.name });
    }
  }

  // 启动 REPL
  async start(): Promise<void> {
    // 显示欢迎信息
    this.printWelcome();

    // 主循环
    while (this.running) {
      const prompt = this.getPrompt();
      const line = await this.readLine(prompt);

      if (line === null) {
        // EOF (Ctrl+D)
        this.cmdExit();
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      await this.execute(trimmed);
    }

    this.rl.close();
  }

  // 读取一行
  private readLine(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  // 获取提示符
  private getPrompt(): string {
    return '\x1b[36mprd>\x1b[0m ';
  }

  // 打印欢迎信息
  private printWelcome(): void {
    console.clear();
    console.log();
    console.log('\x1b[36m╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮');
    console.log('\x1b[36m╎  \x1b[1mPRD Agent REPL\x1b[0m\x1b[36m                                      ╎');
    console.log('\x1b[36m╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯\x1b[0m');
    console.log();
    console.log('  Type \x1b[33mhelp\x1b[0m or \x1b[33m?\x1b[0m to see available commands.');
    console.log('  Type \x1b[33mexit\x1b[0m or \x1b[33mq\x1b[0m to leave.');
    console.log();
  }

  // 执行命令
  private async execute(line: string): Promise<void> {
    const parts = line.trim().split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(cmdName);

    if (!command) {
      printError(`Unknown command: ${cmdName}. Type 'help' for available commands.`);
      return;
    }

    try {
      await command.handler(args);
    } catch (error) {
      printError((error as Error).message);
    }
  }

  // ===== 命令实现 =====

  private async cmdAdd(args: string[]): Promise<void> {
    let title = args[0];

    // 解析选项
    let priority: TaskPriority | undefined;
    let tags: string[] | undefined;
    let i = 0;

    while (i < args.length) {
      const arg = args[i];
      if (arg === '-p' || arg === '--priority') {
        const priorityMap: Record<string, TaskPriority> = {
          low: TaskPriority.Low,
          medium: TaskPriority.Medium,
          high: TaskPriority.High,
          urgent: TaskPriority.Urgent,
        };
        priority = priorityMap[args[i + 1]?.toLowerCase()];
        i += 2;
      } else if (arg === '-t' || arg === '--tags') {
        tags = (args[i + 1] || '').split(',').map((t) => t.trim());
        i += 2;
      } else if (!title) {
        title = arg;
        i++;
      } else {
        i++;
      }
    }

    if (!title) {
      printError('Title is required. Usage: add <title> [-p priority] [-t tags]');
      return;
    }

    const task = await this.manager.create({
      title,
      priority,
      tags,
    });

    printSuccess(`Task created: [${task.id.slice(0, 8)}] ${task.title}`);
  }

  private async cmdList(args: string[]): Promise<void> {
    const options: {
      status?: TaskStatus;
      priority?: TaskPriority;
      tags?: string[];
    } = {};

    // 解析选项
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-s' || arg === '--status') {
        const statusMap: Record<string, TaskStatus> = {
          todo: TaskStatus.Todo,
          'in-progress': TaskStatus.InProgress,
          progress: TaskStatus.InProgress,
          done: TaskStatus.Done,
        };
        options.status = statusMap[args[i + 1]?.toLowerCase()];
      } else if (arg === '-p' || arg === '--priority') {
        const priorityMap: Record<string, TaskPriority> = {
          low: TaskPriority.Low,
          medium: TaskPriority.Medium,
          high: TaskPriority.High,
          urgent: TaskPriority.Urgent,
        };
        options.priority = priorityMap[args[i + 1]?.toLowerCase()];
      } else if (arg === '--tag') {
        options.tags = [args[i + 1] || ''];
      }
    }

    const tasks = await this.manager.getAll(options);
    printTaskList(tasks);

    const stats = await this.manager.getStats();
    printStats(stats);
  }

  private async cmdShow(args: string[]): Promise<void> {
    const idOrIndex = args[0];
    if (!idOrIndex) {
      printError('Task ID or index is required. Usage: show <id>');
      return;
    }

    const indexNum = parseInt(idOrIndex, 10);
    let task;
    let index: number;

    if (!isNaN(indexNum)) {
      task = await this.manager.getByIndex(indexNum);
      index = indexNum;
    } else {
      task = await this.manager.getById(idOrIndex);
      const allTasks = await this.manager.getAll();
      index = allTasks.findIndex((t) => t.id === idOrIndex) + 1;
    }

    if (!task) {
      printError(`Task not found: ${idOrIndex}`);
      return;
    }

    printTaskDetail(task, index);
  }

  private async cmdUpdate(args: string[]): Promise<void> {
    const idOrIndex = args[0];
    if (!idOrIndex) {
      printError('Task ID or index is required. Usage: update <id> [options]');
      return;
    }

    // 查找任务
    let task;
    const indexNum = parseInt(idOrIndex, 10);
    if (!isNaN(indexNum)) {
      task = await this.manager.getByIndex(indexNum);
    } else {
      task = await this.manager.getById(idOrIndex);
    }

    if (!task) {
      printError(`Task not found: ${idOrIndex}`);
      return;
    }

    // 解析选项
    const options: {
      title?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      tags?: string[];
    } = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--title' && args[i + 1]) {
        options.title = args[++i];
      } else if (arg === '--status' && args[i + 1]) {
        const statusMap: Record<string, TaskStatus> = {
          todo: TaskStatus.Todo,
          'in-progress': TaskStatus.InProgress,
          progress: TaskStatus.InProgress,
          done: TaskStatus.Done,
        };
        options.status = statusMap[args[++i]?.toLowerCase()];
      } else if (arg === '--priority' && args[i + 1]) {
        const priorityMap: Record<string, TaskPriority> = {
          low: TaskPriority.Low,
          medium: TaskPriority.Medium,
          high: TaskPriority.High,
          urgent: TaskPriority.Urgent,
        };
        options.priority = priorityMap[args[++i]?.toLowerCase()];
      } else if (arg === '--tags' && args[i + 1]) {
        options.tags = args[++i].split(',').map((t) => t.trim());
      }
    }

    const updated = await this.manager.update(task.id, options);
    if (updated) {
      printSuccess(`Task updated: [${updated.id.slice(0, 8)}] ${updated.title}`);
    } else {
      printError('Failed to update task');
    }
  }

  private async cmdDelete(args: string[]): Promise<void> {
    const idOrIndex = args[0];
    if (!idOrIndex) {
      printError('Task ID or index is required. Usage: delete <id>');
      return;
    }

    // 查找任务
    let task;
    const indexNum = parseInt(idOrIndex, 10);
    if (!isNaN(indexNum)) {
      task = await this.manager.getByIndex(indexNum);
    } else {
      task = await this.manager.getById(idOrIndex);
    }

    if (!task) {
      printError(`Task not found: ${idOrIndex}`);
      return;
    }

    const success = await this.manager.delete(task.id);
    if (success) {
      printSuccess(`Task deleted: ${task.title}`);
    } else {
      printError('Failed to delete task');
    }
  }

  private async cmdComplete(args: string[]): Promise<void> {
    const idOrIndex = args[0];
    if (!idOrIndex) {
      printError('Task ID or index is required. Usage: complete <id>');
      return;
    }

    // 查找任务
    let task;
    const indexNum = parseInt(idOrIndex, 10);
    if (!isNaN(indexNum)) {
      task = await this.manager.getByIndex(indexNum);
    } else {
      task = await this.manager.getById(idOrIndex);
    }

    if (!task) {
      printError(`Task not found: ${idOrIndex}`);
      return;
    }

    const updated = await this.manager.toggleComplete(task.id);
    if (updated) {
      if (updated.status === TaskStatus.Done) {
        printSuccess(`Task completed: ${updated.title}`);
      } else {
        printSuccess(`Task uncompleted: ${updated.title}`);
      }
    }
  }

  private async cmdSearch(args: string[]): Promise<void> {
    const query = args.join(' ');
    if (!query) {
      printError('Search query is required. Usage: search <query>');
      return;
    }

    const tasks = await this.manager.getAll({ search: query });
    printTaskList(tasks);
  }

  private async cmdTags(): Promise<void> {
    const tags = await this.manager.getTags();
    printTags(tags);
  }

  private async cmdStats(): Promise<void> {
    const stats = await this.manager.getStats();
    printStats(stats);
  }

  private async cmdGenerate(args: string[]): Promise<void> {
    const prompt = args.join(' ');
    if (!prompt) {
      printError('Prompt is required. Usage: generate <prompt>');
      return;
    }

    printInfo('AI generating tasks...');

    try {
      const tasks = await generateTasks(prompt);

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

      // 自动添加任务
      for (const taskTitle of tasks) {
        await this.manager.create({
          title: taskTitle,
          priority: TaskPriority.Medium,
        });
      }

      printSuccess(`Added ${tasks.length} tasks`);
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdAnalyze(args: string[]): Promise<void> {
    const idOrIndex = args[0];
    if (!idOrIndex) {
      printError('Task ID or index is required. Usage: analyze <id>');
      return;
    }

    // 查找任务
    let task;
    let displayIndex: string;
    const indexNum = parseInt(idOrIndex, 10);
    if (!isNaN(indexNum)) {
      task = await this.manager.getByIndex(indexNum);
      displayIndex = String(indexNum);
    } else {
      task = await this.manager.getById(idOrIndex);
      displayIndex = task?.id.slice(0, 8) || idOrIndex;
    }

    if (!task) {
      printError(`Task not found: ${idOrIndex}`);
      return;
    }

    printInfo('AI analyzing task...');

    try {
      const analysis = await analyzeTask(task.title, task.description);

      console.log();
      console.log('\x1b[36m  ╭─────────────────────────────────────────────────────╮\x1b[0m');
      console.log('\x1b[36m  │  \x1b[1mAI Analysis for Task #' + displayIndex + '\x1b[0m\x1b[36m                           │\x1b[0m');
      console.log('\x1b[36m  ╰─────────────────────────────────────────────────────╯\x1b[0m');
      console.log();
      console.log(`  \x1b[1m${task.title}\x1b[0m`);
      console.log();

      const lines = analysis.split('\n');
      for (const line of lines) {
        console.log(`  ${line}`);
      }
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdSummary(): Promise<void> {
    const tasks = await this.manager.getAll();

    if (tasks.length === 0) {
      printInfo('No tasks to summarize');
      return;
    }

    printInfo('AI analyzing your tasks...');

    try {
      const summary = await summarizeTasks(
        tasks.map((t) => ({ title: t.title, status: t.status }))
      );

      console.log();
      console.log('\x1b[36m  ╭─────────────────────────────────────────────────────╮\x1b[0m');
      console.log('\x1b[36m  │  \x1b[1mAI Summary\x1b[0m\x1b[36m                                              │\x1b[0m');
      console.log('\x1b[36m  ╰─────────────────────────────────────────────────────╯\x1b[0m');
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

  private async cmdSetApi(args: string[]): Promise<void> {
    const key = args[0];
    if (!key) {
      printError('API key is required. Usage: set-api <key>');
      return;
    }

    await setApiKey(key);
    printSuccess('API key saved');
  }

  private cmdHelp(): void {
    console.log();
    console.log('\x1b[33m  Available Commands:\x1b[0m');
    console.log();

    // 按类别分组
    const groups = [
      {
        name: 'Task Management',
        commands: ['add', 'list', 'show', 'update', 'delete', 'complete'],
      },
      {
        name: 'Search & Info',
        commands: ['search', 'tags', 'stats'],
      },
      {
        name: 'AI Features',
        commands: ['generate', 'analyze', 'summary'],
      },
      {
        name: 'System',
        commands: ['set-api', 'help', 'clear', 'exit'],
      },
    ];

    for (const group of groups) {
      console.log(`  \x1b[36m${group.name}:\x1b[0m`);
      for (const cmdName of group.commands) {
        const cmd = this.commands.get(cmdName);
        if (cmd) {
          const aliases = cmd.aliases.length > 0
            ? ` (${cmd.aliases.filter((a) => a !== cmdName).join(', ')})`
            : '';
          console.log(`    \x1b[33m${cmdName}\x1b[0m${aliases} - ${cmd.description}`);
        }
      }
      console.log();
    }
  }

  private cmdClear(): void {
    console.clear();
    this.printWelcome();
  }

  private cmdExit(): void {
    console.log();
    console.log('  Goodbye! 👋');
    console.log();
    this.running = false;
  }
}
