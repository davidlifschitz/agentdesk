# AgentDesk

A browser-based remote control UI for AI coding agents (Claude Code, OpenAI Codex, Aider, and more). Run the bridge on your dev machine, open the web UI from any device on your network or via Tailscale.

## Features

- **Multi-agent** — Claude Code, Codex, Aider (plug-in adapters, easy to extend)
- **Streaming chat** — real-time terminal output in a clean web UI
- **Full Git panel** — status, diff viewer, commit, push, pull, branch management
- **Session history** — persistent sessions stored in `~/.agentdesk/sessions/`
- **Interrupt control** — stop a running agent turn mid-execution
- **Works on any browser** — phone, tablet, another laptop, no app install needed
- **Self-hostable** — local-only or via Tailscale / your own relay

## Architecture

```
Browser (any device)
      │  WebSocket (/ws)
      ▼
[agentdesk bridge — Node.js, runs on your dev machine]
      │  node-pty (stdin/stdout)
      ▼
Agent process (claude / codex / aider)
      │
      ▼
Your local filesystem + Git
```

## Quick Start

### 1. Install the bridge

```bash
git clone https://github.com/davidlifschitz/agentdesk.git
cd agentdesk/bridge
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — set AGENT=claude-code (or codex / aider)
```

### 3. Start the bridge

```bash
npm start
# → AgentDesk bridge running on http://localhost:7700
```

### 4. Build and open the UI

**Option A — production build (served by the bridge):**
```bash
cd ../ui
npm install
npm run build
# Now open http://localhost:7700
```

**Option B — dev mode (hot reload):**
```bash
cd ../ui
npm install
npm run dev
# → http://localhost:5173 (proxies API/WS to bridge on 7700)
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `AGENT` | `claude-code` | Active agent: `claude-code`, `codex`, `aider` |
| `PORT` | `7700` | Bridge server port |
| `AUTH_TOKEN` | _(none)_ | Optional shared secret — all WS connections must send this token |
| `WORKSPACE` | `process.cwd()` | Path to your project directory |

## Remote Access (Tailscale)

1. Install [Tailscale](https://tailscale.com) on your dev machine
2. Start the bridge: `npm start`
3. Open `http://<tailscale-ip>:7700` from any device on your tailnet

For HTTPS, use Tailscale's built-in HTTPS cert (`tailscale cert`) and a reverse proxy like Caddy.

## Adding a New Agent Adapter

Create `bridge/src/adapters/myagent.js`:

```js
const BaseAdapter = require('./base');

class MyAgentAdapter extends BaseAdapter {
  get command() { return 'myagent-cli'; }
  get args() { return ['--no-color']; }
  get displayName() { return 'My Agent'; }
}

module.exports = MyAgentAdapter;
```

Then register it in `bridge/src/adapters/index.js`:
```js
const ADAPTERS = {
  'claude-code': ClaudeCodeAdapter,
  'codex': CodexAdapter,
  'aider': AiderAdapter,
  'myagent': MyAgentAdapter,   // add here
};
```

## Requirements

- Node.js 18+
- At least one agent CLI installed and in PATH:
  - Claude Code: `npm install -g @anthropic-ai/claude-code`
  - Codex: `npm install -g @openai/codex`
  - Aider: `pip install aider-chat`

## License

MIT
