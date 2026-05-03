const simpleGit = require('simple-git');

async function handleGitCommand(command, payload, workspace) {
  const git = simpleGit(workspace);

  switch (command) {
    case 'status': {
      const status = await git.status();
      const diff = await git.diff().catch(() => '');
      return { status, diff };
    }
    case 'commit': {
      const { message = 'AgentDesk commit', stageAll = true } = payload;
      if (stageAll) await git.add('-A');
      const result = await git.commit(message);
      return result;
    }
    case 'push': {
      const result = await git.push();
      return result;
    }
    case 'pull': {
      const result = await git.pull();
      return result;
    }
    case 'branches': {
      const result = await git.branch(['-a']);
      return result;
    }
    case 'checkout': {
      const { branch } = payload;
      if (!branch) throw new Error('branch is required');
      const result = await git.checkout(branch);
      return { switched: branch, result };
    }
    case 'createBranch': {
      const { branch } = payload;
      if (!branch) throw new Error('branch is required');
      await git.checkoutLocalBranch(branch);
      return { created: branch };
    }
    case 'log': {
      const result = await git.log({ maxCount: 20 });
      return result;
    }
    case 'stash': {
      const result = await git.stash();
      return result;
    }
    case 'stashPop': {
      const result = await git.stash(['pop']);
      return result;
    }
    case 'diff': {
      const { file } = payload;
      const result = file ? await git.diff([file]) : await git.diff();
      return { diff: result };
    }
    case 'remoteUrl': {
      const remotes = await git.getRemotes(true);
      return remotes;
    }
    default:
      throw new Error(`Unknown git command: ${command}`);
  }
}

module.exports = { handleGitCommand };
