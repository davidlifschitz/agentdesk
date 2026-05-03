require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createAdapter } = require('./adapters');
const { handleGitCommand } = require('./git/gitHandler');
const { getSessionHistory, saveMessage, listSessions } = require('./sessions');

const PORT = process.env.PORT || 7700;
const AUTH_TOKEN = process.env.AUTH_TOKEN || null;
const WORKSPACE = process.env.WORKSPACE || process.cwd();

const app = express();
app.use(express.json());

const uiDist = path.join(__dirname, '../../ui/dist');
app.use(express.static(uiDist));

app.get('/api/sessions', (req, res) => {
  res.json(listSessions());
});

app.get('/api/sessions/:id', (req, res) => {
  res.json(getSessionHistory(req.params.id));
});

app.get('/api/workspace', (req, res) => {
  res.json({ path: WORKSPACE, agent: process.env.AGENT || 'claude-code' });
});

app.get('*', (req, res) => {
  const indexPath = path.join(uiDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).send(`
      <html><body style="font-family:monospace;background:#111;color:#0f0;padding:2rem">
      <h2>AgentDesk Bridge is running ✓</h2>
      <p>Build the UI with: <code>cd ui && npm install && npm run build</code></p>
      <p>Or run the UI dev server: <code>cd ui && npm run dev</code></p>
      <p>Bridge port: <strong>${PORT}</strong> | Workspace: <strong>${WORKSPACE}</strong></p>
      </body></html>`);
  });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const activeSessions = new Map();

wss.on('connection', (ws) => {
  let sessionId = null;
  let adapter = null;
  let authenticated = !AUTH_TOKEN;

  ws.on('message', async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (!authenticated) {
      if (msg.type === 'auth' && msg.token === AUTH_TOKEN) {
        authenticated = true;
        ws.send(JSON.stringify({ type: 'auth_ok' }));
      } else {
        ws.send(JSON.stringify({ type: 'auth_error', error: 'Invalid token' }));
        ws.close();
      }
      return;
    }

    switch (msg.type) {
      case 'session_start': {
        sessionId = msg.sessionId || uuidv4();
        const agentName = msg.agent || process.env.AGENT || 'claude-code';
        adapter = createAdapter(agentName, WORKSPACE);
        activeSessions.set(sessionId, { adapter, ws });

        adapter.on('output', (chunk) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'output', sessionId, chunk }));
          saveMessage(sessionId, { role: 'assistant', content: chunk, ts: Date.now() });
        });

        adapter.on('done', () => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'turn_done', sessionId }));
        });

        adapter.on('error', (err) => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: 'error', sessionId, error: err.message }));
        });

        adapter.start();
        ws.send(JSON.stringify({ type: 'session_ready', sessionId, agent: agentName }));

        const history = getSessionHistory(sessionId);
        if (history.length > 0)
          ws.send(JSON.stringify({ type: 'history', sessionId, messages: history }));
        break;
      }
      case 'prompt': {
        if (!adapter) break;
        saveMessage(sessionId, { role: 'user', content: msg.text, ts: Date.now() });
        adapter.sendPrompt(msg.text);
        break;
      }
      case 'interrupt': {
        if (!adapter) break;
        adapter.interrupt();
        ws.send(JSON.stringify({ type: 'interrupted', sessionId }));
        break;
      }
      case 'git': {
        try {
          const result = await handleGitCommand(msg.command, msg.payload || {}, WORKSPACE);
          ws.send(JSON.stringify({ type: 'git_result', command: msg.command, result }));
        } catch (err) {
          ws.send(JSON.stringify({ type: 'git_error', command: msg.command, error: err.message }));
        }
        break;
      }
      case 'session_end': {
        if (adapter) adapter.stop();
        activeSessions.delete(sessionId);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (adapter) adapter.stop();
    if (sessionId) activeSessions.delete(sessionId);
  });

  if (AUTH_TOKEN) {
    ws.send(JSON.stringify({ type: 'auth_required' }));
  } else {
    ws.send(JSON.stringify({ type: 'connected', server: 'agentdesk', version: '0.1.0' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 AgentDesk bridge running on http://localhost:${PORT}`);
  console.log(`   Workspace: ${WORKSPACE}`);
  console.log(`   Agent:     ${process.env.AGENT || 'claude-code'}`);
  console.log(`   Auth:      ${AUTH_TOKEN ? 'enabled' : 'disabled (set AUTH_TOKEN to enable)'}\n`);
});
