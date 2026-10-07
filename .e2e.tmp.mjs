import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE; const SHARE = process.env.SHARE;
const out = (...a) => console.log(...a);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)) });
p.on('request', r => { if (r.url().includes('/api/chat')) fs.writeFileSync('/tmp/e2e/chat-req.json', r.postData() || '') });
p.on('response', async r => { if (r.url().includes('/api/chat')) { try { fs.writeFileSync('/tmp/e2e/chat-res.json', await r.text()) } catch {} } });
let t3 = null;
const bad = []; p.on('response', r => { if (r.status() >= 400 && !r.url().includes('_vercel/insights')) bad.push(r.status() + ' ' + r.url().slice(0, 140)) });
await p.goto(SHARE, { waitUntil: 'networkidle' });
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
const t0 = Date.now();
await p.fill('input[placeholder*="your-landing-page"]', process.env.TARGET);
await p.getByRole('button', { name: /generate/i }).first().click();
await p.waitForURL(/\/create\/editor/, { timeout: 120000 }).catch(e => out('no editor redirect', e.message));
out('editor after', ((Date.now() - t0) / 1000).toFixed(1), 's');
let done = false, first = null;
for (let i = 0; i < 80 && !done; i++) {
  await p.waitForTimeout(3000);
  const txt = await p.evaluate(() => document.body.innerText);
  if (!first && /\b[1-9] total\b/i.test(txt)) { first = ((Date.now() - t0) / 1000).toFixed(1); await p.screenshot({ path: '/tmp/e2e/first-email.png' }); }
  if (!t3 && /\b3 total\b/i.test(txt)) t3 = ((Date.now() - t0) / 1000).toFixed(1);
  done = new RegExp('\\b' + (process.env.DAYS || '5') + ' total\\b', 'i').test(txt) || /generation failed/i.test(txt);
}
out('3 emails at', t3, 'first email at', first, 's; finished:', done, ((Date.now() - t0) / 1000).toFixed(1), 's');
await p.waitForTimeout(3000);
await p.screenshot({ path: '/tmp/e2e/editor-done.png' });
const editorUrl = p.url();
const emails = [];
for (let d = 1; d <= 5; d++) {
  const u = new URL(editorUrl); u.searchParams.set('email', String(d)); u.searchParams.delete('autogen');
  await p.goto(u.toString(), { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  emails.push(`### EMAIL ${d}\n` + await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText));
}
fs.writeFileSync('/tmp/e2e/emails.txt', emails.join('\n\n'));
await p.getByText(/full context ready/i).waitFor({ timeout: 30000 }).catch(() => out('context never ready'));
const before = await p.evaluate(() => document.querySelector('main')?.innerText ?? '');
const box = p.getByPlaceholder(/ask me anything/i);
if (await box.count()) {
  await box.fill('Make the subject line of this email shorter and punchier.');
  await box.press('Enter');
  await p.waitForTimeout(45000);
  await p.screenshot({ path: '/tmp/e2e/chat.png' });
  fs.writeFileSync('/tmp/e2e/chat.txt', await p.evaluate(() => document.body.innerText));
  const after = await p.evaluate(() => document.querySelector('main')?.innerText ?? '');
  out('chat changed email:', before !== after);
} else out('no chat input');
await p.goto(BASE + '/campaigns', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/e2e/campaigns.png' });
const m = await b.newPage({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS } });
await m.goto(editorUrl.replace('autogen=1', ''), { waitUntil: 'networkidle' }).catch(() => {});
await m.waitForTimeout(2500); await m.screenshot({ path: '/tmp/e2e/editor-mobile.png' });
out('ERRORS', errs.slice(0, 15)); out('BAD RESPONSES', bad.slice(0, 20));
await b.close();
