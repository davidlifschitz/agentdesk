const BaseAdapter = require('./base');

class CodexAdapter extends BaseAdapter {
  get command() { return 'codex'; }
  get args() { return []; }
  get displayName() { return 'OpenAI Codex'; }
}

module.exports = CodexAdapter;
