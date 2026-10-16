// Builds the public site (privacy policy, support, home) into _site/ for GitHub Pages.
// The contact email comes from src/lib/links.ts, so it lives in one place for the app and the site.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = path.join(root, 'site');
const out = path.join(root, '_site');

const links = fs.readFileSync(path.join(root, 'src/lib/links.ts'), 'utf8');
const email = (/CONTACT_EMAIL\s*=\s*'([^']*)'/.exec(links)?.[1] ?? '').trim();
const updated = '16 жовтня 2026';
const year = String(new Date().getFullYear());

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(src)) {
  const from = path.join(src, name);
  let data = fs.readFileSync(from);
  if (name.endsWith('.html')) {
    let html = data.toString('utf8');
    html = email
      ? html.replace(/<!--\/?contact-->\n?/g, '')
      : html.replace(/<!--contact-->[\s\S]*?<!--\/contact-->\n?/g, '');
    html = html.replaceAll('{{EMAIL}}', email).replaceAll('{{YEAR}}', year).replaceAll('{{UPDATED}}', updated);
    data = Buffer.from(html);
  }
  fs.writeFileSync(path.join(out, name), data);
}
fs.copyFileSync(path.join(root, 'assets/icon.png'), path.join(out, 'icon.png'));
fs.copyFileSync(path.join(root, 'assets/favicon.png'), path.join(out, 'favicon.png'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log(`Site ready in _site/ (${email ? 'with' : 'without'} contact email)`);
