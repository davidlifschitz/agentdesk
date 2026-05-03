const ClaudeCodeAdapter = require('./claudeCode');
const CodexAdapter = require('./codex');
const AiderAdapter = require('./aider');

const ADAPTERS = {
  'claude-code': ClaudeCodeAdapter,
  'codex': CodexAdapter,
  'aider': AiderAdapter,
};

function createAdapter(name, workspace) {
  const Adapter = ADAPTERS[name];
  if (!Adapter) throw new Error(`Unknown agent adapter: "${name}". Available: ${Object.keys(ADAPTERS).join(', ')}`);
  return new Adapter(workspace);
}

module.exports = { createAdapter, ADAPTERS: Object.keys(ADAPTERS) };
