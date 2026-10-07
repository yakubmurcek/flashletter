import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = process.env.BASE; const SHARE = process.env.SHARE;
const out = (...a) => console.log(...a);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.BYPASS } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)) });
const bad = []; p.on('response', r => { if (r.status() >= 400 && !r.url().includes('_vercel/insights') ) bad.push(r.status() + ' ' + r.url().slice(0, 140)) });
await p.goto(SHARE, { waitUntil: 'networkidle' });
await p.goto(BASE + '/', { waitUntil: 'networkidle' });
// 1. links on landing
const links = await p.$$eval('a[href]', as => [...new Set(as.map(a => a.getAttribute('href')))]);
out('landing links', links);
for (const l of links.filter(l => l.startsWith('/') && !l.startsWith('/#'))) {
  const r = await ctx.request.get(BASE + l); out('  ', l, r.status());
}
// 2. hero generation
const t0 = Date.now();
await p.fill('input[placeholder*="your-landing-page"]', process.env.TARGET);
await p.getByRole('button', { name: /generate/i }).first().click();
await p.waitForURL(/\/create\/editor/, { timeout: 120000 }).catch(e => out('no editor redirect', e.message));
out('editor after', ((Date.now() - t0) / 1000).toFixed(1), 's', p.url());
await p.screenshot({ path: '/tmp/flshots/e2e-editor-early.png' });
// wait for 5 emails / generation to finish
let done = false;
for (let i = 0; i < 60 && !done; i++) {
  await p.waitForTimeout(5000);
  const txt = await p.evaluate(() => document.body.innerText);
  done = !/generating|writing/i.test(txt) && /Day 5|5 \/ 5|Email 5/i.test(txt);
  if (i % 6 === 0) out('  waiting', i * 5, 's');
}
out('generation finished:', done, ((Date.now() - t0) / 1000).toFixed(1), 's');
await p.screenshot({ path: '/tmp/flshots/e2e-editor-done.png' });
fs.writeFileSync('/tmp/flshots/e2e-editor.txt', await p.evaluate(() => document.body.innerText));
// collect each email by clicking through list items with "Day" labels
const emails = [];
for (let d = 1; d <= 5; d++) {
  const u = new URL(p.url()); u.searchParams.set('email', String(d)); u.searchParams.delete('autogen');
  await p.goto(u.toString(), { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  emails.push(await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText));
}
fs.writeFileSync('/tmp/flshots/e2e-emails.txt', emails.join('\n\n=========\n\n'));
await p.screenshot({ path: '/tmp/flshots/e2e-email5.png' });
// 3. AI chat edit
const fab = p.getByRole('button', { name: /open ai assistant/i });
if (await fab.count()) {
  await fab.click(); await p.waitForTimeout(800);
  const box = p.locator('textarea').last();
  await box.fill('Make the subject line of this email shorter and punchier.');
  await box.press('Enter');
  await p.waitForTimeout(25000);
  await p.screenshot({ path: '/tmp/flshots/e2e-chat.png' });
  fs.writeFileSync('/tmp/flshots/e2e-chat.txt', await p.evaluate(() => document.body.innerText));
} else out('no chat fab');
// 4. send-test button
const st = p.getByRole('button', { name: /send to my inbox/i });
out('send-test buttons', await st.count());
out('ERRORS', errs.slice(0, 15)); out('BAD RESPONSES', bad.slice(0, 20));
await b.close();
