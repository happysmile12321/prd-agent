import { createInterface } from 'readline';
import { stdin as input, stdout as output } from 'process';
import { setApiKey } from './config.js';
import { chat, clearHistory, getHistory, ask, generateCode, reviewCode, explainCode, summarizeText, polishText, translateText } from './ai.js';
import { printSuccess, printError, printInfo } from '../ui/printer.js';
import { initDB, analyzeMarkdown, generateSummary, generateQuizQuestions, evaluateAnswer, getAllTasks, getNotes, getQuizResults } from './circle/spr/index.js';

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
  private commands: Map<string, Command> = new Map();
  private running = true;

  constructor() {
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

        // 补全编程语言
        if (['code', 'review'].includes(command) && parts[1] === '-l' && parts.length === 3) {
          const languages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp', 'c'];
          const lastPart = parts[parts.length - 1];
          const matches = languages.filter((l) => l.startsWith(lastPart));
          if (matches.length > 0) {
            return [matches, line];
          }
        }

        // 补全目标语言
        if (['translate', 'trans'].includes(command) && parts[1] === '-t' && parts.length === 3) {
          const languages = ['English', 'Chinese', 'Japanese', 'Korean', 'French', 'German', 'Spanish'];
          const lastPart = parts[parts.length - 1];
          const matches = languages.filter((l) => l.startsWith(lastPart));
          if (matches.length > 0) {
            return [matches, line];
          }
        }

        return [[], line];
      },
    });

    return rl;
  }

  // 设置命令
  private setupCommands(): void {
    // AI 聊天
    this.register({
      name: 'ask',
      aliases: ['a', 'chat'],
      description: 'Ask AI a question (one-shot)',
      handler: async (args) => this.cmdAsk(args),
    });

    this.register({
      name: 'talk',
      aliases: ['t'],
      description: 'Chat with AI (conversational)',
      handler: async (args) => this.cmdTalk(args),
    });

    // 代码相关
    this.register({
      name: 'code',
      aliases: ['gen'],
      description: 'Generate code. Usage: code <prompt> [-l language]',
      handler: async (args) => this.cmdCode(args),
    });

    this.register({
      name: 'review',
      aliases: ['rev'],
      description: 'Review code. Usage: review <code> [-l language]',
      handler: async (args) => this.cmdReview(args),
    });

    this.register({
      name: 'explain',
      aliases: ['exp'],
      description: 'Explain code. Usage: explain <code>',
      handler: async (args) => this.cmdExplain(args),
    });

    // 文本处理
    this.register({
      name: 'summarize',
      aliases: ['sum'],
      description: 'Summarize text. Usage: summarize <text>',
      handler: async (args) => this.cmdSummarize(args),
    });

    this.register({
      name: 'polish',
      aliases: ['pol'],
      description: 'Polish text. Usage: polish <text>',
      handler: async (args) => this.cmdPolish(args),
    });

    this.register({
      name: 'translate',
      aliases: ['trans'],
      description: 'Translate text. Usage: translate <text> [-t language]',
      handler: async (args) => this.cmdTranslate(args),
    });

    // 历史管理
    this.register({
      name: 'history',
      aliases: ['hist'],
      description: 'Show chat history',
      handler: async () => this.cmdHistory(),
    });

    this.register({
      name: 'clear-history',
      aliases: ['clear-hist'],
      description: 'Clear chat history',
      handler: async () => this.cmdClearHistory(),
    });

    // SPR 模块
    this.register({
      name: 'spr',
      aliases: [],
      description: 'SPR learning module. Usage: spr <command> [args]',
      handler: async (args) => this.cmdSpr(args),
    });

    // 配置
    this.register({
      name: 'set-api',
      aliases: ['config'],
      description: 'Set Zhipu AI API Key',
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
    this.printWelcome();

    // 主循环
    while (this.running) {
      const prompt = this.getPrompt();
      const line = await this.readLine(prompt);

      if (line === null) {
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
    return '\x1b[36mAI>\x1b[0m ';
  }

  // 打印欢迎信息
  private printWelcome(): void {
    console.clear();
    console.log();
    console.log('\x1b[36m╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮');
    console.log('\x1b[36m╎  \x1b[1mAI REPL\x1b[0m\x1b[36m - Powered by Zhipu AI                   ╎');
    console.log('\x1b[36m╶┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯\x1b[0m');
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
      // 如果不是命令，直接当作 ask 命令处理
      await this.cmdAsk(parts);
      return;
    }

    try {
      await command.handler(args);
    } catch (error) {
      printError((error as Error).message);
    }
  }

  // ===== 命令实现 =====

  private async cmdAsk(args: string[]): Promise<void> {
    const prompt = args.join(' ');
    if (!prompt) {
      printError('Prompt is required. Usage: ask <your question>');
      return;
    }

    printInfo('Thinking...');

    try {
      const response = await ask(prompt);
      console.log();
      console.log(`  \x1b[33m${response}\x1b[0m`);
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdTalk(args: string[]): Promise<void> {
    const message = args.join(' ');
    if (!message) {
      // 进入对话模式
      this.enterChatMode();
      return;
    }

    printInfo('Thinking...');

    try {
      const response = await chat(message);
      console.log();
      console.log(`  \x1b[33m${response}\x1b[0m`);
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdCode(args: string[]): Promise<void> {
    let prompt = '';
    let language: string | undefined;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-l' && args[i + 1]) {
        language = args[++i];
      } else if (!prompt) {
        prompt = args[i];
      } else {
        prompt += ' ' + args[i];
      }
    }

    if (!prompt) {
      printError('Prompt is required. Usage: code <prompt> [-l language]');
      return;
    }

    printInfo('Generating code...');

    try {
      const code = await generateCode(prompt, language);
      console.log();
      console.log('  \x1b[37m' + code + '\x1b[0m');
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdReview(args: string[]): Promise<void> {
    let code = '';
    let language: string | undefined;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-l' && args[i + 1]) {
        language = args[++i];
      } else if (!code) {
        code = args[i];
      } else {
        code += ' ' + args[i];
      }
    }

    if (!code) {
      printError('Code is required. Usage: review <code> [-l language]');
      return;
    }

    printInfo('Reviewing code...');

    try {
      const review = await reviewCode(code, language);
      console.log();
      console.log('  ' + review.split('\n').join('\n  '));
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdExplain(args: string[]): Promise<void> {
    const code = args.join(' ');
    if (!code) {
      printError('Code is required. Usage: explain <code>');
      return;
    }

    printInfo('Explaining code...');

    try {
      const explanation = await explainCode(code);
      console.log();
      console.log('  ' + explanation.split('\n').join('\n  '));
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdSummarize(args: string[]): Promise<void> {
    const text = args.join(' ');
    if (!text) {
      printError('Text is required. Usage: summarize <text>');
      return;
    }

    printInfo('Summarizing...');

    try {
      const summary = await summarizeText(text);
      console.log();
      console.log('  ' + summary.split('\n').join('\n  '));
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdPolish(args: string[]): Promise<void> {
    const text = args.join(' ');
    if (!text) {
      printError('Text is required. Usage: polish <text>');
      return;
    }

    printInfo('Polishing...');

    try {
      const polished = await polishText(text);
      console.log();
      console.log('  ' + polished);
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdTranslate(args: string[]): Promise<void> {
    let text = '';
    let targetLanguage = 'English';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-t' && args[i + 1]) {
        targetLanguage = args[++i];
      } else if (!text) {
        text = args[i];
      } else {
        text += ' ' + args[i];
      }
    }

    if (!text) {
      printError('Text is required. Usage: translate <text> [-t language]');
      return;
    }

    printInfo(`Translating to ${targetLanguage}...`);

    try {
      const translated = await translateText(text, targetLanguage);
      console.log();
      console.log('  ' + translated);
      console.log();
    } catch (error) {
      printError((error as Error).message);
    }
  }

  private async cmdHistory(): Promise<void> {
    const history = getHistory();

    if (history.length === 0) {
      printInfo('No conversation history yet.');
      return;
    }

    console.log();
    console.log('  \x1b[36mConversation History:\x1b[0m');
    console.log();

    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      const role = msg.role === 'user' ? '\x1b[33mYou\x1b[0m' : '\x1b[36mAI\x1b[0m';
      const prefix = i === 0 ? '' : '  ';
      console.log(`${prefix} ${role}: ${msg.content.slice(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    }

    console.log();
  }

  private async cmdClearHistory(): Promise<void> {
    clearHistory();
    printSuccess('Conversation history cleared');
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

  // SPR 模块命令处理
  private async cmdSpr(args: string[]): Promise<void> {
    const subCommand = args[0]?.toLowerCase();

    if (!subCommand) {
      this.showSprHelp();
      return;
    }

    // 初始化数据库
    await initDB();

    switch (subCommand) {
      case 'analyze':
      case 'ana':
        await this.sprAnalyze(args.slice(1));
        break;
      case 'summary':
      case 'sum':
        await this.sprSummary(args.slice(1));
        break;
      case 'quiz':
        await this.sprQuiz(args.slice(1));
        break;
      case 'tasks':
        await this.sprTasks();
        break;
      case 'notes':
        await this.sprNotes();
        break;
      case 'results':
        await this.sprResults(args.slice(1));
        break;
      case 'evaluate':
      case 'eval':
        await this.sprEvaluate(args.slice(1));
        break;
      default:
        printError(`Unknown SPR command: ${subCommand}`);
        this.showSprHelp();
    }
  }

  private showSprHelp(): void {
    console.log();
    console.log('  \x1b[36mSPR (Structured Progressive Release) Module:\x1b[0m');
    console.log();
    console.log('  \x1b[33mCommands:\x1b[0m');
    console.log('    analyze <file>     Analyze Markdown file and extract skeleton');
    console.log('    summary <taskId>   Generate mind map and summary');
    console.log('    quiz [id] [count]  Generate quiz questions (default: 5)');
    console.log('    evaluate <quizId>  Evaluate answer for a quiz');
    console.log('    tasks              List all tasks');
    console.log('    notes              List all notes');
    console.log('    results [quizId]   Show quiz results');
    console.log();
  }

  private async sprAnalyze(args: string[]): Promise<void> {
    const filePath = args[0];
    if (!filePath) {
      printError('File path is required. Usage: spr analyze <file>');
      return;
    }

    try {
      const taskId = await analyzeMarkdown(filePath);
      printSuccess(`Task created with ID: ${taskId}`);
    } catch (error) {
      printError(`Failed to analyze: ${(error as Error).message}`);
    }
  }

  private async sprSummary(args: string[]): Promise<void> {
    const taskIdStr = args[0];
    if (!taskIdStr) {
      printError('Task ID is required. Usage: spr summary <taskId>');
      return;
    }

    const taskId = parseInt(taskIdStr, 10);
    if (isNaN(taskId)) {
      printError('Invalid task ID');
      return;
    }

    try {
      const result = await generateSummary(taskId);
      console.log();
      console.log('  \x1b[36mTitle:\x1b[0m', result.title);
      console.log();
      console.log('  \x1b[36mKey Points:\x1b[0m');
      result.keyPoints.forEach((point, i) => {
        console.log(`    ${i + 1}. ${point}`);
      });
      console.log();
      printSuccess('Summary generated');
    } catch (error) {
      printError(`Failed to generate summary: ${(error as Error).message}`);
    }
  }

  private async sprQuiz(args: string[]): Promise<void> {
    const skeletonId = args[0] ? parseInt(args[0], 10) : undefined;
    const count = args[1] ? parseInt(args[1], 10) : 5;

    try {
      const questions = await generateQuizQuestions(skeletonId, count);
      console.log();
      console.log('  \x1b[36mQuiz Questions:\x1b[0m');
      console.log();
      questions.forEach((q, i) => {
        console.log(`  \x1b[33m${i + 1}. [${q.type}] ${q.question}\x1b[0m`);
        console.log(`     Difficulty: ${'★'.repeat(q.difficulty)}${'☆'.repeat(5 - q.difficulty)}`);
        console.log(`     Hints: ${q.hints.join(', ') || 'None'}`);
        console.log();
      });
      printSuccess(`${questions.length} questions generated`);
    } catch (error) {
      printError(`Failed to generate quiz: ${(error as Error).message}`);
    }
  }

  private async sprEvaluate(args: string[]): Promise<void> {
    const quizIdStr = args[0];
    if (!quizIdStr) {
      printError('Quiz ID is required. Usage: spr evaluate <quizId>');
      return;
    }

    const quizId = parseInt(quizIdStr, 10);
    if (isNaN(quizId)) {
      printError('Invalid quiz ID');
      return;
    }

    console.log('  Enter your answer:');
    const userAnswer = await this.readLine('  > ');

    try {
      const result = await evaluateAnswer(quizId, userAnswer);
      console.log();
      if (result.isCorrect) {
        printSuccess(`Correct! Score: ${result.score}/100`);
      } else {
        printError(`Incorrect. Score: ${result.score}/100`);
      }
      console.log(`  Feedback: ${result.feedback}`);
      console.log();
    } catch (error) {
      printError(`Failed to evaluate: ${(error as Error).message}`);
    }
  }

  private async sprTasks(): Promise<void> {
    try {
      const tasks = await getAllTasks();
      console.log();
      console.log('  \x1b[36mTasks:\x1b[0m');
      console.log();

      if (tasks.length === 0) {
        console.log('  No tasks found. Use "spr analyze <file>" to create one.');
        console.log();
        return;
      }

      tasks.forEach((task: any) => {
        console.log(`  \x1b[33mID: ${task.id}\x1b[0m`);
        console.log(`    Type: ${task.type}`);
        console.log(`    File: ${task.file_path}`);
        console.log(`    Created: ${new Date(task.created_at).toLocaleString()}`);
        console.log();
      });
    } catch (error) {
      printError(`Failed to get tasks: ${(error as Error).message}`);
    }
  }

  private async sprNotes(): Promise<void> {
    try {
      const notes = await getNotes();
      console.log();
      console.log('  \x1b[36mNotes:\x1b[0m');
      console.log();

      if (notes.length === 0) {
        console.log('  No notes found.');
        console.log();
        return;
      }

      notes.forEach((note: any) => {
        console.log(`  \x1b[33mID: ${note.id}\x1b[0m`);
        console.log(`    Category: ${note.category}`);
        console.log(`    Content: ${note.content?.slice(0, 50)}...`);
        console.log(`    Created: ${new Date(note.created_at).toLocaleString()}`);
        console.log();
      });
    } catch (error) {
      printError(`Failed to get notes: ${(error as Error).message}`);
    }
  }

  private async sprResults(args: string[]): Promise<void> {
    const quizId = args[0] ? parseInt(args[0], 10) : undefined;

    try {
      const results = await getQuizResults(quizId);
      console.log();
      console.log('  \x1b[36mQuiz Results:\x1b[0m');
      console.log();

      if (results.length === 0) {
        console.log('  No quiz results found.');
        console.log();
        return;
      }

      results.forEach((result: any) => {
        console.log(`  \x1b[33mResult ID: ${result.id}\x1b[0m`);
        console.log(`    Question: ${result.question_text?.slice(0, 50)}...`);
        console.log(`    Your Answer: ${result.user_answer?.slice(0, 50)}...`);
        console.log(`    Score: ${result.score}/100`);
        console.log(`    Feedback: ${result.feedback}`);
        console.log();
      });
    } catch (error) {
      printError(`Failed to get results: ${(error as Error).message}`);
    }
  }

  private async cmdHelp(): Promise<void> {
    console.log();
    console.log('\x1b[33m  Available Commands:\x1b[0m');
    console.log();

    const groups = [
      {
        name: 'SPR Learning',
        commands: ['spr'],
      },
      {
        name: 'AI Chat',
        commands: ['ask', 'talk'],
      },
      {
        name: 'Code',
        commands: ['code', 'review', 'explain'],
      },
      {
        name: 'Text Processing',
        commands: ['summarize', 'polish', 'translate'],
      },
      {
        name: 'History',
        commands: ['history', 'clear-history'],
      },
      {
        name: 'Config',
        commands: ['set-api'],
      },
      {
        name: 'System',
        commands: ['help', 'clear', 'exit'],
      },
    ];

    for (const group of groups) {
      console.log(`  \x1b[36m${group.name}:\x1b[0m`);
      for (const cmdName of group.commands) {
        const cmd = this.commands.get(cmdName);
        if (cmd) {
          const aliases = cmd.aliases.length > 0 && cmd.aliases[0] !== cmdName
            ? ` (${cmd.aliases.slice(0, 2).join(', ')})`
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

  // 对话模式
  private async enterChatMode(): Promise<void> {
    console.log();
    console.log('  \x1b[36mEntering chat mode...\x1b[0m');
    console.log('  Type \x1b[33mexit\x1b[0m or \x1b[33mq\x1b[0m to leave chat mode.');
    console.log();

    while (this.running) {
      const prompt = '\x1b[35mchat>\x1b[0m ';
      const line = await this.readLine(prompt);

      if (line === null) {
        break;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (trimmed === 'exit' || trimmed === 'q') {
        break;
      }

      printInfo('Thinking...');

      try {
        const response = await chat(trimmed);
        console.log();
        console.log(`  \x1b[33m${response}\x1b[0m`);
        console.log();
      } catch (error) {
        printError((error as Error).message);
      }
    }

    printInfo('Exiting chat mode.');
  }
}
