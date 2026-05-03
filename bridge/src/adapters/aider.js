const BaseAdapter = require('./base');

class AiderAdapter extends BaseAdapter {
  get command() { return 'aider'; }
  get args() { return ['--no-pretty']; }
  get displayName() { return 'Aider'; }
}

module.exports = AiderAdapter;
