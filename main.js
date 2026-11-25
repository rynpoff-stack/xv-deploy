const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { services } = require('./services');

let win;
let current = null; // текущий процесс деплоя

function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 620,
    minHeight: 560,
    backgroundColor: '#000000',
    title: 'xv-deploy',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (current) current.kill();
  if (process.platform !== 'darwin') app.quit();
});

// ---------- профили (хранятся в папке данных приложения) ----------

const storePath = () => path.join(app.getPath('userData'), 'profiles.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); }
  catch (_) { return {}; }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(store, null, 2));
}

function enc(v) {
  if (!v) return '';
  if (safeStorage.isEncryptionAvailable()) {
    return 'enc:' + safeStorage.encryptString(v).toString('base64');
  }
  return 'raw:' + Buffer.from(v).toString('base64');
}

function dec(v) {
  if (!v) return '';
  try {
    if (v.startsWith('enc:')) return safeStorage.decryptString(Buffer.from(v.slice(4), 'base64'));
    if (v.startsWith('raw:')) return Buffer.from(v.slice(4), 'base64').toString();
  } catch (_) { /* повреждено */ }
  return '';
}

const svcById = (id) => services.find((s) => s.id === id);

// В интерфейс секреты не уходят — только факт, что они заданы
function publicProfiles(serviceId) {
  const svc = svcById(serviceId);
  const list = loadStore()[serviceId] || [];
  return list.map((p) => {
    const values = {};
    const secretsSet = {};
    svc.fields.forEach((f) => {
      if (f.secret) secretsSet[f.key] = !!p.values[f.key];
      else values[f.key] = p.values[f.key] || '';
    });
    return { id: p.id, name: p.name, values, secretsSet };
  });
}

ipcMain.handle('profiles:list', (_e, serviceId) => {
  if (!svcById(serviceId)) return [];
  return publicProfiles(serviceId);
});

ipcMain.handle('profiles:save', (_e, { serviceId, id, name, values }) => {
  const svc = svcById(serviceId);
  if (!svc) return { ok: false };
  const store = loadStore();
  const list = store[serviceId] || [];
  const existing = list.find((p) => p.id === id);

  const saved = {};
  svc.fields.forEach((f) => {
    const v = String((values && values[f.key]) || '').trim();
    if (f.secret) saved[f.key] = v ? enc(v) : (existing ? existing.values[f.key] || '' : '');
    else saved[f.key] = v;
  });

  const profile = {
    id: existing ? existing.id : crypto.randomUUID(),
    name: String(name || '').trim() || `Профиль ${list.length + 1}`,
    values: saved,
  };
  store[serviceId] = existing
    ? list.map((p) => (p.id === profile.id ? profile : p))
    : [...list, profile];
  saveStore(store);
  return { ok: true, id: profile.id, profiles: publicProfiles(serviceId) };
});

ipcMain.handle('profiles:delete', (_e, { serviceId, id }) => {
  if (!svcById(serviceId)) return { ok: false };
  const store = loadStore();
  store[serviceId] = (store[serviceId] || []).filter((p) => p.id !== id);
  saveStore(store);
  return { ok: true, profiles: publicProfiles(serviceId) };
});

// ---------- IPC ----------

ipcMain.handle('services:list', () =>
  services.map(({ id, name, desc, fields }) => ({
    id,
    name,
    desc,
    fields: fields.map(({ key, label, secret, placeholder, hint }) => ({
      key, label, secret: !!secret, placeholder: placeholder || '', hint: hint || '',
    })),
  }))
);

ipcMain.handle('project:pick', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Выбери папку проекта',
    properties: ['openDirectory'],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  const dir = res.filePaths[0];
  return { dir, info: inspectProject(dir) };
});

ipcMain.handle('project:inspect', (_e, dir) => inspectProject(dir));

ipcMain.handle('shell:open', (_e, url) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

ipcMain.handle('deploy:cancel', () => {
  if (current) {
    const c = current;
    current = null;
    c.kill();
    return true;
  }
  return false;
});

ipcMain.handle('deploy:start', (_e, { serviceId, profileId, projectDir, buildCmd, outDir }) => {
  if (current) return { ok: false, error: 'Деплой уже запущен' };

  const svc = svcById(serviceId);
  if (!svc) return { ok: false, error: 'Неизвестный сервис' };
  if (!projectDir || !fs.existsSync(projectDir)) {
    return { ok: false, error: 'Папка проекта не найдена' };
  }

  const dir = (outDir && outDir.trim()) || '.';
  const args = svc.args.map((a) => a.replace('{dir}', dir));
  const env = { ...process.env };
  let profileName = null;

  if (profileId) {
    const profile = (loadStore()[serviceId] || []).find((p) => p.id === profileId);
    if (!profile) return { ok: false, error: 'Профиль не найден' };
    profileName = profile.name;
    svc.fields.forEach((f) => {
      const raw = profile.values[f.key];
      const v = f.secret ? dec(raw) : raw;
      if (!v) return;
      if (f.env) env[f.env] = v;
      if (f.arg) args.push(f.arg, v);
    });
  }

  const steps = [];
  if (buildCmd && buildCmd.trim()) {
    steps.push({ label: `build: ${buildCmd.trim()}`, shell: buildCmd.trim() });
  }
  steps.push({
    label: `deploy: ${svc.name}${profileName ? ` · ${profileName}` : ''}`,
    cmd: svc.cmd,
    args,
    env,
  });

  runSteps(steps, projectDir);
  return { ok: true };
});

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function runSteps(steps, cwd) {
  let i = 0;
  const urls = new Set();
  const started = Date.now();

  const next = () => {
    if (i >= steps.length) {
      current = null;
      send('deploy:done', {
        ok: true,
        urls: [...urls],
        seconds: ((Date.now() - started) / 1000).toFixed(1),
      });
      return;
    }
    const step = steps[i++];
    send('deploy:log', { type: 'step', text: `› ${step.label}` });

    const isWin = process.platform === 'win32';
    const child = step.shell
      ? spawn(step.shell, { cwd, shell: true })
      : spawn(isWin && step.cmd === 'npx' ? 'npx.cmd' : step.cmd, step.args, {
          cwd,
          shell: isWin,
          env: step.env || process.env,
        });
    current = child;

    const onData = (type) => (buf) => {
      const text = buf.toString();
      const found = text.match(/https?:\/\/[^\s"'<>)]+/g);
      if (found) found.forEach((u) => urls.add(u.replace(/[.,;]+$/, '')));
      send('deploy:log', { type, text });
    };
    child.stdout.on('data', onData('out'));
    child.stderr.on('data', onData('err'));

    child.on('error', (err) => {
      if (current !== child) return;
      current = null;
      send('deploy:log', {
        type: 'err',
        text: `Не удалось запустить команду: ${err.message}\n`,
      });
      send('deploy:done', { ok: false, urls: [...urls] });
    });

    child.on('close', (code, signal) => {
      if (current !== child) return; // отменён
      if (code === 0) {
        next();
      } else {
        current = null;
        send('deploy:log', {
          type: 'err',
          text: `Завершилось с кодом ${code ?? signal}\n`,
        });
        send('deploy:done', { ok: false, urls: [...urls] });
      }
    });
  };

  next();
}

function inspectProject(dir) {
  const out = { name: path.basename(dir), build: '', outDir: '', framework: '' };
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      out.name = pkg.name || out.name;
      if (pkg.scripts && pkg.scripts.build) out.build = 'npm run build';
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.next) { out.framework = 'Next.js'; }
      else if (deps.vite) { out.framework = 'Vite'; out.outDir = 'dist'; }
      else if (deps['react-scripts']) { out.framework = 'Create React App'; out.outDir = 'build'; }
      else if (deps.astro) { out.framework = 'Astro'; out.outDir = 'dist'; }
      else if (deps.vue) { out.framework = 'Vue'; out.outDir = 'dist'; }
      else if (deps.svelte) { out.framework = 'Svelte'; }
    }
    if (!out.framework && fs.existsSync(path.join(dir, 'index.html'))) {
      out.framework = 'Static HTML';
    }
    if (out.outDir && !fs.existsSync(path.join(dir, out.outDir)) && !out.build) {
      out.outDir = '';
    }
  } catch (_) {
    /* ignore */
  }
  return out;
}
