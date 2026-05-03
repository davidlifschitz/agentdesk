const BaseAdapter = require('./base');

class ClaudeCodeAdapter extends BaseAdapter {
  get command() { return 'claude'; }
  get args() { return []; }
  get displayName() { return 'Claude Code'; }
}

module.exports = ClaudeCodeAdapter;
