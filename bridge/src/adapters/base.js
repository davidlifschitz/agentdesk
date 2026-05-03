const { EventEmitter } = require('events');
const pty = require('node-pty');

/**
 * BaseAdapter — wraps a CLI agent process via node-pty.
 * Subclasses must implement:
 *   - get command() → string (e.g. 'claude')
 *   - get args() → string[]
 */
class BaseAdapter extends EventEmitter {
  constructor(workspace) {
    super();
    this.workspace = workspace;
    this.ptyProcess = null;
    this.buffer = '';
  }

  get command() { throw new Error('Subclass must implement command'); }
  get args() { return []; }
  get promptSuffix() { return '\n'; }

  start() {
    try {
      this.ptyProcess = pty.spawn(this.command, this.args, {
        name: 'xterm-color',
        cols: 220,
        rows: 50,
        cwd: this.workspace,
        env: process.env,
      });

      this.ptyProcess.onData((data) => {
        this.buffer += data;
        this.emit('output', data);
      });

      this.ptyProcess.onExit(() => {
        this.emit('done');
      });
    } catch (err) {
      this.emit('error', new Error(`Failed to start ${this.command}: ${err.message}. Is it installed and in PATH?`));
    }
  }

  sendPrompt(text) {
    if (this.ptyProcess) {
      this.ptyProcess.write(text + this.promptSuffix);
      this.emit('output', `\n> ${text}\n`);
    }
  }

  interrupt() {
    if (this.ptyProcess) {
      this.ptyProcess.write('\x03');
    }
  }

  stop() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}

module.exports = BaseAdapter;
