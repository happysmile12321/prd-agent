/**
 * Keymap - 键位映射系统
 * 支持 Neovim 风格的键位绑定
 */

// 按键解析
export function parseKey(key) {
  // 特殊键映射
  const specialKeys = {
    '<CR>': '\r',
    '<Enter>': '\r',
    '<Escape>': '\x1b',
    '<Esc>': '\x1b',
    '<Tab>': '\t',
    '<Space>': ' ',
    '<BS>': '\x7f',
    '<Backspace>': '\x7f',
    '<Delete>': '\x1b[3~',
    '<Insert>': '\x1b[2~',
    '<Home>': '\x1b[H',
    '<End>': '\x1b[F',
    '<PageUp>': '\x1b[5~',
    '<PageDown>': '\x1b[6~',
    '<Up>': '\x1b[A',
    '<Down>': '\x1b[B',
    '<Left>': '\x1b[D',
    '<Right>': '\x1b[C',
    '<C-a>': '\x01',
    '<C-b>': '\x02',
    '<C-c>': '\x03',
    '<C-d>': '\x04',
    '<C-e>': '\x05',
    '<C-f>': '\x06',
    '<C-g>': '\x07',
    '<C-h>': '\x08',
    '<C-i>': '\x09',
    '<C-j>': '\x0a',
    '<C-k>': '\x0b',
    '<C-l>': '\x0c',
    '<C-m>': '\x0d',
    '<C-n>': '\x0e',
    '<C-o>': '\x0f',
    '<C-p>': '\x10',
    '<C-q>': '\x11',
    '<C-r>': '\x12',
    '<C-s>': '\x13',
    '<C-t>': '\x14',
    '<C-u>': '\x15',
    '<C-v>': '\x16',
    '<C-w>': '\x17',
    '<C-x>': '\x18',
    '<C-y>': '\x19',
    '<C-z>': '\x1a',
    '<S-Tab>': '\x1b[Z',
    '<F1>': '\x1bOP',
    '<F2>': '\x1bOQ',
    '<F3>': '\x1bOR',
    '<F4>': '\x1bOS',
    '<F5>': '\x1b[15~',
    '<F6>': '\x1b[17~',
    '<F7>': '\x1b[18~',
    '<F8>': '\x1b[19~',
    '<F9>': '\x1b[20~',
    '<F10>': '\x1b[21~',
    '<F11>': '\x1b[23~',
    '<F12>': '\x1b[24~',
  };

  // 处理修饰键
  const modKeyRegex = /<([CMAS])-([a-zA-Z0-9])>/;
  const match = key.match(modKeyRegex);

  if (match) {
    const [, mod, char] = match;
    const base = char.toLowerCase();
    const shifted = char.toUpperCase();

    if (mod === 'C') { // Control
      const code = shifted.charCodeAt(0);
      if (code >= 64 && code <= 95) {
        return String.fromCharCode(code - 64);
      }
    }
  }

  if (specialKeys[key]) {
    return specialKeys[key];
  }

  // 处理 <Leader> 键
  if (key === '<Leader>') {
    return '\\'; // 默认 leader 为 \
  }

  return key;
}

// 格式化键用于显示
export function formatKey(key) {
  const formatMap = {
    '\r': '<CR>',
    '\x1b': '<Esc>',
    '\t': '<Tab>',
    ' ': '<Space>',
    '\x7f': '<BS>',
  };

  if (formatMap[key]) return formatMap[key];
  return key;
}

/**
 * KeymapEntry - 键位映射条目
 */
class KeymapEntry {
  constructor(lhs, rhs, options = {}) {
    this.lhs = lhs;           // 左侧键（触发键）
    this.rhs = rhs;           // 右侧键（映射到）
    this.options = {
      mode: options.mode || 'n',           // 模式: n(normal)/i(insert)/v(visual)/c(command)/t(terminal)
      silent: options.silent || false,     // 静默执行
      noremap: options.noremap !== false,  // 不递归映射
      expr: options.expr || false,         // 表达式映射
      nowait: options.nowait || false,     // 不等待更多按键
      buffer: options.buffer || null,      // 缓冲区本地
      ...options
    };
  }

  match(input, currentMode) {
    if (this.options.mode.includes(currentMode)) {
      if (input.startsWith(this.lhs)) {
        if (input === this.lhs) {
          return { complete: true, entry: this };
        }
        return { complete: false, entry: this };
      }
    }
    return null;
  }
}

/**
 * Keymap - 键位映射管理器
 */
export class Keymap {
  constructor() {
    this.keymaps = {
      n: [],  // normal
      i: [],  // insert
      v: [],  // visual
      c: [],  // command
      t: [],  // terminal
      x: [],  // visual block
      s: [],  // select
      o: [],  // operator pending
      l: [],  // langmap
      '': []  // all modes
    };

    this.leader = '\\';
    this.timeout = true;
    this.timeoutlen = 1000;
    this.lastInputTime = 0;
  }

  // 设置 Leader 键
  setLeader(key) {
    this.leader = key;
  }

  // 设置映射
  set(lhs, rhs, options = {}) {
    const modes = Array.isArray(options.mode) ? options.mode : [options.mode || 'n'];

    for (const mode of modes) {
      const modeKeymaps = this.keymaps[mode] || this.keymaps[''];
      const entry = new KeymapEntry(lhs, rhs, { ...options, mode });

      // 检查是否已存在
      const existingIndex = modeKeymaps.findIndex(e => e.lhs === lhs && e.options.mode === mode);
      if (existingIndex !== -1) {
        modeKeymaps[existingIndex] = entry;
      } else {
        modeKeymaps.push(entry);
      }

      // 按 lhs 长度排序（长的优先）
      modeKeymaps.sort((a, b) => b.lhs.length - a.lhs.length);
    }
  }

  // 获取映射
  get(lhs, mode = 'n') {
    const modeKeymaps = this.keymaps[mode] || this.keymaps[''];
    return modeKeymaps.find(e => e.lhs === lhs);
  }

  // 删除映射
  del(lhs, mode = 'n') {
    const modeKeymaps = this.keymaps[mode];
    if (modeKeymaps) {
      const index = modeKeymaps.findIndex(e => e.lhs === lhs);
      if (index !== -1) {
        modeKeymaps.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // 清空所有映射
  clear(mode = null) {
    if (mode) {
      this.keymaps[mode] = [];
    } else {
      for (const m of Object.keys(this.keymaps)) {
        this.keymaps[m] = [];
      }
    }
  }

  // 匹配输入
  match(input, mode = 'n') {
    const modeKeymaps = [
      ...(this.keymaps[mode] || []),
      ...(this.keymaps[''] || [])
    ];

    let partialMatch = null;
    let completeMatch = null;

    for (const entry of modeKeymaps) {
      const result = entry.match(input, mode);
      if (result) {
        if (result.complete) {
          completeMatch = result;
        } else {
          partialMatch = result;
        }
      }
    }

    return {
      complete: completeMatch,
      partial: partialMatch,
      isAmbiguous: !!completeMatch && !!partialMatch
    };
  }

  // 检查是否超时
  isTimeout() {
    if (!this.timeout) return false;
    return Date.now() - this.lastInputTime > this.timeoutlen;
  }

  // 重置超时
  resetTimeout() {
    this.lastInputTime = Date.now();
  }

  // 获取所有映射
  getAll(mode = null) {
    if (mode) {
      return [...this.keymaps[mode]];
    }
    const result = {};
    for (const [m, maps] of Object.entries(this.keymaps)) {
      result[m] = [...maps];
    }
    return result;
  }
}
