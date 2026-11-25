const $ = (id) => document.getElementById(id);

const state = {
  dir: null,
  service: null,
  profileId: null,
  profiles: [],
  running: false,
  editingId: null,
};
let serviceList = [];

const els = {
  pick: $('pick'),
  pname: $('pname'),
  path: $('path'),
  ptag: $('ptag'),
  services: $('services'),
  profiles: $('profiles'),
  build: $('build'),
  outdir: $('outdir'),
  deploy: $('deploy'),
  cancel: $('cancel'),
  console: $('console'),
  log: $('log'),
  clear: $('clear'),
  result: $('result'),
  status: $('status'),
  modal: $('modal'),
  mTitle: $('m-title'),
  mName: $('m-name'),
  mFields: $('m-fields'),
  mSave: $('m-save'),
  mCancel: $('m-cancel'),
  mDelete: $('m-delete'),
};

// Минималистичные монохромные иконки (24x24)
const S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const icons = {
  vercel: `<svg viewBox="0 0 24 24"><path d="M12 4 22 20H2z" fill="currentColor"/></svg>`,
  netlify: `<svg viewBox="0 0 24 24" ${S}><path d="M12 2.5 21.5 12 12 21.5 2.5 12z"/><path d="M12 8v8M8 12h8"/></svg>`,
  cloudflare: `<svg viewBox="0 0 24 24" ${S}><path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5z"/></svg>`,
  firebase: `<svg viewBox="0 0 24 24" ${S}><path d="M12 2.5c1 4 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2 1-3.2 2.2-4.2.3 1.6 1 2.3 2.1 2.3 0-3.2-1-5.2 1.2-9.1z"/></svg>`,
  ghpages: `<svg viewBox="0 0 24 24" ${S}><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10M18 10c0 5-12 2-12 7"/></svg>`,
  surge: `<svg viewBox="0 0 24 24" ${S}><path d="M13 2.5 4.5 14H11l-1 7.5L19.5 10H13z"/></svg>`,
  railway: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>`,
  fly: `<svg viewBox="0 0 24 24" ${S}><path d="M21.5 2.5 10.5 13.5M21.5 2.5l-6.5 19-4.5-8-8-4.5z"/></svg>`,
};

const currentService = () => serviceList.find((s) => s.id === state.service);

function setStatus(text, cls = '') {
  els.status.className = 'status ' + cls;
  els.status.querySelector('b').textContent = text;
}

function refreshButtons() {
  els.deploy.disabled = !(state.dir && state.service) || state.running;
  els.cancel.hidden = !state.running;
  els.pick.disabled = state.running;
  els.services.classList.toggle('locked', state.running);
}

function showConsole() {
  if (els.console.hidden) els.console.hidden = false;
  els.console.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function appendLog(text, type = 'out') {
  const span = document.createElement('span');
  if (type !== 'out') span.className = type;
  span.textContent = type === 'step' ? text + '\n' : text;
  els.log.appendChild(span);
  els.log.scrollTop = els.log.scrollHeight;
}

// ---------- сервисы ----------

async function init() {
  serviceList = await window.xv.listServices();
  serviceList.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'svc';
    b.dataset.id = s.id;
    b.title = s.desc;
    b.innerHTML = `<span class="ico">${icons[s.id] || ''}</span><span class="name"></span>`;
    b.querySelector('.name').textContent = s.name;
    b.addEventListener('click', () => selectService(s.id));
    els.services.appendChild(b);
  });
  refreshButtons();
}

async function selectService(id) {
  if (state.running) return;
  state.service = id;
  document.querySelectorAll('.svc').forEach((x) =>
    x.classList.toggle('active', x.dataset.id === id)
  );
  state.profiles = await window.xv.listProfiles(id);
  // если профили есть — сразу выбираем первый
  state.profileId = state.profiles.length ? state.profiles[0].id : null;
  renderProfiles();
  refreshButtons();
}

// ---------- профили ----------

function pill(text, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pill ' + cls;
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

function renderProfiles() {
  const box = els.profiles;
  box.hidden = false;
  box.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'pf-label';
  label.textContent = 'Профиль';
  box.appendChild(label);

  box.appendChild(
    pill('По умолчанию', state.profileId ? '' : 'active', () => {
      state.profileId = null;
      renderProfiles();
    })
  );

  state.profiles.forEach((p) => {
    box.appendChild(
      pill(p.name, p.id === state.profileId ? 'active' : '', () => {
        state.profileId = p.id;
        renderProfiles();
      })
    );
  });

  if (state.profileId) {
    box.appendChild(pill('Изменить', 'edit', () => openModal(state.profileId)));
  }
  box.appendChild(pill('+ Профиль', 'add', () => openModal(null)));
}

function openModal(profileId) {
  const svc = currentService();
  if (!svc) return;
  const profile = state.profiles.find((p) => p.id === profileId) || null;
  state.editingId = profile ? profile.id : null;

  els.mTitle.textContent = `${profile ? 'Профиль' : 'Новый профиль'} · ${svc.name}`;
  els.mName.value = profile ? profile.name : '';
  els.mDelete.hidden = !profile;
  els.mFields.innerHTML = '';

  svc.fields.forEach((f) => {
    const label = document.createElement('label');
    label.className = 'field';

    const span = document.createElement('span');
    span.textContent = f.label;

    const input = document.createElement('input');
    input.dataset.key = f.key;
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.type = f.secret ? 'password' : 'text';
    input.placeholder = f.placeholder;

    if (profile) {
      if (f.secret) {
        if (profile.secretsSet[f.key]) input.placeholder = '•••••••• сохранено (пусто — не менять)';
      } else {
        input.value = profile.values[f.key] || '';
      }
    }

    label.append(span, input);
    if (f.hint) {
      const hint = document.createElement('em');
      hint.textContent = f.hint;
      label.appendChild(hint);
    }
    els.mFields.appendChild(label);
  });

  els.modal.hidden = false;
  els.mName.focus();
}

function closeModal() {
  els.modal.hidden = true;
}

els.mSave.addEventListener('click', async () => {
  const values = {};
  els.mFields.querySelectorAll('input').forEach((i) => {
    values[i.dataset.key] = i.value;
  });
  const res = await window.xv.saveProfile({
    serviceId: state.service,
    id: state.editingId,
    name: els.mName.value,
    values,
  });
  if (!res.ok) return;
  state.profiles = res.profiles;
  state.profileId = res.id;
  closeModal();
  renderProfiles();
});

els.mDelete.addEventListener('click', async () => {
  if (!state.editingId) return;
  const res = await window.xv.deleteProfile({
    serviceId: state.service,
    id: state.editingId,
  });
  if (!res.ok) return;
  state.profiles = res.profiles;
  state.profileId = state.profiles.length ? state.profiles[0].id : null;
  closeModal();
  renderProfiles();
});

els.mCancel.addEventListener('click', closeModal);
els.modal.addEventListener('mousedown', (e) => {
  if (e.target === els.modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.modal.hidden) closeModal();
});

// ---------- проект ----------

els.pick.addEventListener('click', async () => {
  const res = await window.xv.pickProject();
  if (!res) return;
  state.dir = res.dir;
  const { info } = res;

  els.pick.classList.add('set');
  els.pname.textContent = info.name;
  els.path.textContent = res.dir;
  els.path.title = res.dir;
  if (info.framework) {
    els.ptag.textContent = info.framework;
    els.ptag.hidden = false;
  } else {
    els.ptag.hidden = true;
  }
  els.build.value = info.build || '';
  els.outdir.value = info.outDir || '';
  refreshButtons();
});

// ---------- деплой ----------

els.deploy.addEventListener('click', async () => {
  els.result.hidden = true;
  els.result.innerHTML = '';
  showConsole();
  appendLog(`── ${new Date().toLocaleTimeString()} ──`, 'step');

  state.running = true;
  setStatus('деплой…', 'run');
  refreshButtons();

  const r = await window.xv.startDeploy({
    serviceId: state.service,
    profileId: state.profileId,
    projectDir: state.dir,
    buildCmd: els.build.value,
    outDir: els.outdir.value,
  });

  if (!r.ok) {
    appendLog(r.error + '\n', 'err');
    state.running = false;
    setStatus('ошибка', 'fail');
    refreshButtons();
  }
});

els.cancel.addEventListener('click', async () => {
  await window.xv.cancelDeploy();
  appendLog('Остановлено пользователем\n', 'err');
  state.running = false;
  setStatus('остановлено', 'fail');
  refreshButtons();
});

els.clear.addEventListener('click', () => {
  els.log.textContent = '';
  els.result.hidden = true;
  els.console.hidden = true;
});

window.xv.onLog(({ type, text }) => appendLog(text, type));

window.xv.onDone(({ ok, urls, seconds }) => {
  state.running = false;
  refreshButtons();
  if (ok) {
    setStatus('готово', 'ok');
    els.result.hidden = false;
    els.result.textContent = `Готово за ${seconds} c`;
    (urls || []).slice(-3).forEach((u) => {
      const a = document.createElement('a');
      a.textContent = u;
      a.addEventListener('click', () => window.xv.openExternal(u));
      els.result.appendChild(a);
    });
    showConsole();
  } else {
    setStatus('ошибка', 'fail');
  }
});

init();
