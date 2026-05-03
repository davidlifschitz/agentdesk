const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSIONS_DIR = path.join(os.homedir(), '.agentdesk', 'sessions');

function ensureDir() {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionFile(id) {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

function getSessionHistory(id) {
  ensureDir();
  const file = sessionFile(id);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveMessage(id, message) {
  ensureDir();
  const history = getSessionHistory(id);
  history.push(message);
  fs.writeFileSync(sessionFile(id), JSON.stringify(history, null, 2));
}

function listSessions() {
  ensureDir();
  return fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const id = f.replace('.json', '');
      const messages = getSessionHistory(id);
      const last = messages[messages.length - 1];
      return {
        id,
        messageCount: messages.length,
        lastActivity: last?.ts || null,
        preview: messages.find(m => m.role === 'user')?.content?.slice(0, 80) || '(empty)',
      };
    })
    .sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
}

module.exports = { getSessionHistory, saveMessage, listSessions };
