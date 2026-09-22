// Records one agent dispatch into docs/build-log/. Usage:
//   node scripts/log-dispatch.mjs <nn> <agent> <model> <round> <promptFile> [reportFile] [outcome]
import fs from 'node:fs';
const [nn, agent, model, round, promptFile, reportFile, outcome] = process.argv.slice(2);
const p = `docs/build-log/${nn}-${agent}.json`;
const prev = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
const rec = {
  ...prev, order: parseInt(nn, 10), agent, model, round: Number(round),
  startedAt: prev.startedAt ?? new Date().toISOString(),
  prompt: promptFile ? fs.readFileSync(promptFile, 'utf8') : prev.prompt,
};
if (reportFile) { rec.report = fs.readFileSync(reportFile, 'utf8'); rec.finishedAt = new Date().toISOString(); }
if (outcome) rec.outcome = outcome;
fs.writeFileSync(p, JSON.stringify(rec, null, 2));
console.log('logged', p);
