import { renderFiles } from './views/files.js';
import { renderTerminal } from './views/terminal.js';
import { renderNotebooks } from './views/notebooks.js';
import { renderFTP } from './views/ftp.js';
import { renderS3 } from './views/s3.js';
import { renderChangelog } from './views/changelog.js';
import { renderDomains } from './views/domains.js';

const container = document.getElementById('view-container');
let currentUser = null;

const views = {
  files: renderFiles,
  terminal: renderTerminal,
  domains: renderDomains,
  notebooks: renderNotebooks,
  ftp: renderFTP,
  s3: renderS3,
  changelog: renderChangelog,
};

window.showToast = function (msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 2500);
};

window.toggleSidebar = function () {
  document.getElementById('sidebar').classList.toggle('active');
  document.getElementById('overlay').classList.toggle('active');
};

window.closeModal = function (id) {
  document.getElementById(id).classList.remove('active');
};

window.navigate = function (viewName, pushState = true) {
  if (!currentUser) return;
  const targetView = views[viewName] ? viewName : 'files';
  const renderer = views[targetView];

  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.id === `nav-${targetView}`);
  });

  if (document.getElementById('sidebar').classList.contains('active')) {
    window.toggleSidebar();
  }

  if (pushState && window.location.pathname.replace(/^\/+/, '') !== targetView) {
    window.history.pushState({ view: targetView }, '', `/${targetView}`);
  }

  container.innerHTML = '';
  renderer(container);
};

window.addEventListener('popstate', (event) => {
  if (!currentUser) return;
  const targetView = event.state?.view || window.location.pathname.replace(/^\/+/, '') || 'files';
  window.navigate(targetView, false);
});

window.logout = async function () {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('filelynx_user');
  currentUser = null;
  init();
};

document.getElementById('authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('authUsername').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const errBox = document.getElementById('authErr');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!data.success) {
      errBox.innerText = data.error || 'Credenciales incorrectas';
      errBox.style.display = 'block';
      return;
    }

    currentUser = data.user;
    localStorage.setItem('filelynx_user', JSON.stringify(currentUser));
    init();
  } catch {
    errBox.innerText = 'Error al comunicarse con el servidor';
    errBox.style.display = 'block';
  }
});

async function init() {
  const vpsHost = window.location.host;
  document.getElementById('loginHostSubtitle').innerText = `Servidor: ${vpsHost}`;

  const saved = localStorage.getItem('filelynx_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch {
      currentUser = null;
    }
  }

  if (!currentUser) {
    document.getElementById('view-auth').style.display = 'flex';
    document.getElementById('panelMainContent').style.display = 'none';
    document.getElementById('mainTopbar').style.display = 'none';
    return;
  }

  document.getElementById('view-auth').style.display = 'none';
  document.getElementById('panelMainContent').style.display = 'block';
  document.getElementById('mainTopbar').style.display = 'flex';
  document.getElementById('uEmail').innerText = currentUser.username;

  const currentPath = window.location.pathname.replace(/^\/+/, '');
  const initialRoute = currentPath.split('/')[0] || 'files';
  window.navigate(views[initialRoute] ? initialRoute : 'files', false);
}

window.onload = init;
