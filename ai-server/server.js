// Endpoint: apply selected files (write + commit + optional push + run tests)
app.post('/api/apply', async (req, res) => {
  const { files, commitMessage } = req.body;
  if (!files || !Array.isArray(files)) return res.status(400).json({ error: 'files array required' });

  try {
    // write files
    for (const f of files) {
      const abs = path.join(process.cwd(), f.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, f.content, 'utf8');
    }

    // run tests if enabled
    if (RUN_TESTS_ON_APPLY) {
      try {
        await new Promise((resolve, reject) => {
          const t = exec('npm test', { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
            if (err) return reject({ err, stdout, stderr });
            resolve({ stdout, stderr });
          });
        });
      } catch (testErr) {
        return res.status(400).json({ ok: false, error: 'Tests failed', detail: testErr });
      }
    }

    // git commit
    await git.add(files.map(f => f.path));
    await git.commit(commitMessage || 'AI: apply changes');
    if (GIT_PUSH) {
      try { await git.push(GIT_REMOTE, GIT_BRANCH); } catch (pushErr) { console.warn('Push failed', pushErr); }
    }

    return res.json({ ok: true, applied: files.map(f => f.path) });
  } catch (e) {
    console.error('Apply error', e);
    return res.status(500).json({ ok: false, error: e.message || e });
  }
});

const PORT = process.env.AI_SERVER_PORT || 4000;
app.listen(PORT, () => console.log(`AI server listening on ${PORT}`));