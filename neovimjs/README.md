# NeovimJS

A Neovim-like editor implemented in Node.js with JavaScript plugin support and LazyVim-style configuration.

## Features

- **Neovim-style keybindings** - Full Normal, Insert, Visual, and Command modes
- **JavaScript plugins** - Write plugins in JavaScript/TypeScript
- **LazyVim-inspired** - Modern configuration system with `spec()` imports
- **TUI interface** - Terminal UI built with blessed
- **Buffer/Window management** - Tabs, splits, and multiple buffers
- **Extensible** - Plugin API with commands, keymaps, autocmds, and highlights

## Installation

```bash
npm install -g neovimjs
```

Or clone and run directly:

```bash
git clone <repo>
cd neovimjs
npm install
npm start
```

## Usage

```bash
# Open a file
nvjs file.js

# Open multiple files
nvjs file1.js file2.js file3.js

# Use custom config
nvjs -c ~/.nvjs/config.js file.js

# Load a plugin
nvjs -p ./plugins/my-plugin file.js
```

## Configuration

NeovimJS uses a JavaScript configuration file, similar to LazyVim's Lua config.

### Default Config Location

- `~/.nvjs/config.js`
- `.nvjsrc.js` in project root
- `nvjs.config.js` in project root

### Example Config

```javascript
// ~/.nvjs/config.js
export default {
  options: {
    number: true,
    relativenumber: true,
    cursorline: true,
    expandtab: true,
    tabstop: 2,
    shiftwidth: 2,
  },

  setup: (api) => {
    // Set leader key
    if (api.editor.keymap) {
      api.editor.keymap.setLeader(' ');
    }

    // Keymaps
    api.nmap('<Leader>w', ':write<CR>', { silent: true });
    api.nmap('<Leader>q', ':quit<CR>', { silent: true });

    // Custom command
    api.createCommand('Hello', () => {
      api.notify('Hello from config!', 'success');
    });
  },
};
```

## Keybindings

### Normal Mode

| Key | Action |
|-----|--------|
| `h`, `j`, `k`, `l` | Move cursor |
| `w`, `b`, `e` | Word movement |
| `0`, `^`, `$` | Line positions |
| `gg`, `G` | File positions |
| `i`, `I`, `a`, `A` | Enter insert mode |
| `o`, `O` | New line |
| `dd`, `dw`, `d$` | Delete |
| `yy`, `yw` | Yank (copy) |
| `p`, `P` | Paste |
| `v`, `V` | Visual mode |
| `:` | Command mode |
| `/`, `?` | Search |
| `n`, `N` | Next/prev search |
| `u`, `Ctrl-r` | Undo/redo |
| `Ctrl-w` | Window commands |

### Insert Mode

| Key | Action |
|-----|--------|
| `Esc`, `Ctrl-c` | Exit to normal mode |
| `Ctrl-h` | Backspace |
| `Enter` | New line |
| `Tab` | Insert tab/spaces |

### Command Mode

| Command | Action |
|---------|--------|
| `:w` | Write file |
| `:q` | Quit |
| `:wq` | Write and quit |
| `:e [file]` | Edit file |
| `:bn`, `:bp` | Next/prev buffer |
| `:ls` | List buffers |
| `:sp`, `:vs` | Split window |
| `:tabn`, `:tabp` | Next/prev tab |

## Plugin Development

### Creating a Plugin

```javascript
// my-plugin/index.js
export const meta = {
  name: 'my-plugin',
  version: '0.1.0',
};

export function setup(api, config) {
  // Keymaps
  api.nmap('<Leader>m', ':MyCommand<CR>');

  // Commands
  api.createCommand('MyCommand', () => {
    api.notify('Hello from plugin!', 'info');
  });

  // Autocmds
  api.createAutocmd('BufEnter', () => {
    const buffer = api.getCurrentBuffer();
    console.log('Entered buffer:', buffer.name);
  });

  // Highlights
  api.defineHighlight('MyHighlight', {
    fg: '#7aa2f7',
    bg: '#1a1b26',
  });
}

export default { setup };
```

### Plugin API

The `api` object provides:

- **Keymaps**: `nmap()`, `imap()`, `vmap()`, `cmap()`, `keymap()`
- **Commands**: `createCommand()`
- **Autocmds**: `createAutocmd()`
- **Options**: `setOption()`, `getOption()`
- **Buffers**: `getCurrentBuffer()`, `createBuffer()`
- **Windows**: `getCurrentWindow()`
- **UI**: `notify()`, `defineHighlight()`
- **Timers**: `setInterval()`, `setTimeout()`

## Project Structure

```
neovimjs/
├── src/
│   ├── core/           # Editor core (Buffer, Window, Editor, Tab)
│   ├── keymaps/        # Mode handlers (Normal, Insert, Visual, Command)
│   ├── ui/             # TUI (Screen)
│   ├── plugins/        # Plugin system
│   ├── config/         # Default configs (LazyVim style)
│   ├── cli.js          # CLI entry point
│   └── index.js        # Module exports
├── examples/
│   ├── config-example.js
│   └── plugin-hello-world.js
└── package.json
```

## License

MIT
