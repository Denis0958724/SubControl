// Builds a single self-contained HTML page of the app for a quick look in any browser.
// Fonts and JavaScript are inlined so the page works from any address without extra files.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist-preview';
const tmp = join(out, '.export');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execSync(`npx expo export -p web --output-dir ${tmp} --clear`, {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_PREVIEW: '1', CI: '1' },
});

let html = readFileSync(join(tmp, 'index.html'), 'utf8');

const fonts = {
  Unbounded_400Regular: 'node_modules/@expo-google-fonts/unbounded/400Regular/Unbounded_400Regular.ttf',
  Unbounded_600SemiBold: 'node_modules/@expo-google-fonts/unbounded/600SemiBold/Unbounded_600SemiBold.ttf',
  Onest_400Regular: 'node_modules/@expo-google-fonts/onest/400Regular/Onest_400Regular.ttf',
  Onest_500Medium: 'node_modules/@expo-google-fonts/onest/500Medium/Onest_500Medium.ttf',
  Onest_600SemiBold: 'node_modules/@expo-google-fonts/onest/600SemiBold/Onest_600SemiBold.ttf',
};
const fontCss = Object.entries(fonts)
  .map(
    ([family, file]) =>
      `@font-face{font-family:'${family}';src:url(data:font/ttf;base64,${readFileSync(file).toString('base64')}) format('truetype');font-display:block;}`,
  )
  .join('\n');

const frameCss = `
:root{color-scheme:light dark}
html,body{background:#F4F5F9}
@media (prefers-color-scheme: dark){html,body{background:#10132A}}
@media (min-width: 640px){
  html,body{background:#DCE0EC}
  @media (prefers-color-scheme: dark){html,body{background:#070918}}
  #root{max-width:400px;height:min(860px,calc(100vh - 48px));margin:24px auto;border-radius:40px;overflow:hidden;
    box-shadow:0 30px 80px rgba(27,33,64,.28),0 0 0 10px #1B2140;}
}`;

const favicon = `data:image/png;base64,${readFileSync('assets/favicon.png').toString('base64')}`;
html = html
  .replace('<html lang="en">', '<html lang="uk">')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${favicon}"/>`)
  .replace('</head>', `<style>${fontCss}\n${frameCss}</style></head>`);

html = html.replace(/<script src="([^"]+)" defer><\/script>/g, (_, src) => {
  const code = readFileSync(join(tmp, src)).toString('utf8').replace(/<\/script/gi, '<\\/script');
  return `<script>${code}</script>`;
});

writeFileSync(join(out, 'index.html'), html);
rmSync(tmp, { recursive: true, force: true });
console.log(`Preview ready: ${join(out, 'index.html')} (${Math.round(html.length / 1024)} KB)`);
