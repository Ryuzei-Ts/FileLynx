const container = document.getElementById('view-container');
let currentUser = null;

const viewLoaders = {
  files: () => import('/views/files.js').then((m) => m.renderFiles),
  terminal: () => import('/views/terminal.js').then((m) => m.renderTerminal),
  domains: () => import('/views/domains.js').then((m) => m.renderDomains),
  notebooks: () => import('/views/notebooks.js').then((m) => m.renderNotebooks),
  ftp: () => import('/views/ftp.js').then((m) => m.renderFTP),
  s3: () => import('/views/s3.js').then((m) => m.renderS3),
  changelog: () => import('/views/changelog.js').then((m) => m.renderChangelog),
};

let toastTimer = null;
window.showToast = function (msg) {
  const toast = document.getElementById('toast');
  if (!toast || !msg) return;
  toast.innerText = msg;
  toast.classList.add('active');

  toast.onclick = () => {
    toast.classList.remove('active');
    if (toastTimer) clearTimeout(toastTimer);
  };

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('active');
  }, 2500);
};

window.toggleSidebar = function () {
  document.getElementById('sidebar')?.classList.toggle('active');
  document.getElementById('overlay')?.classList.toggle('active');
};

window.closeModal = function (id) {
  document.getElementById(id)?.classList.remove('active');
};

window.navigate = async function (viewName, pushState = true, initialSubPath = '') {
  if (!currentUser) return;
  const targetView = viewLoaders[viewName] ? viewName : 'files';

  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.classList.toggle('active', item.id === `nav-${targetView}`);
  });

  if (document.getElementById('sidebar')?.classList.contains('active')) {
    window.toggleSidebar();
  }

  if (pushState && window.location.pathname.replace(/^\/+/, '') !== targetView) {
    const nextUrl = targetView === 'files' && initialSubPath ? `/files/${initialSubPath}` : `/${targetView}`;
    window.history.pushState({ view: targetView, dir: initialSubPath }, '', nextUrl);
  }

  if (container) {
    container.innerHTML = '<p style="padding:20px; color:var(--text-gray);">Cargando módulo...</p>';
    try {
      const renderFn = await viewLoaders[targetView]();
      container.innerHTML = '';
      await renderFn(container, initialSubPath);
    } catch (err) {
      container.innerHTML = `<div class="panel-box" style="color:#ef4444;"><h4>Error al cargar el módulo ${targetView}</h4><p>${err.message}</p></div>`;
    }
  }
};

window.addEventListener('popstate', (event) => {
  if (!currentUser) return;
  const targetView = event.state?.view || window.location.pathname.replace(/^\/+/, '').split('/')[0] || 'files';
  const subDir = event.state?.dir || (window.location.pathname.startsWith('/files/') ? window.location.pathname.replace(/^\/files\//, '') : '');
  window.navigate(targetView, false, subDir);
});

window.logout = async function () {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  localStorage.removeItem('filelynx_user');
  currentUser = null;
  init();
};

window.doLogin = async function () {
  const userInput = document.getElementById('authUsername');
  const passInput = document.getElementById('authPassword');
  const errBox = document.getElementById('authErr');
  const btn = document.getElementById('authSubmitBtn');

  const username = userInput ? userInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (!username || !password) {
    if (errBox) {
      errBox.innerText = 'Escribe tu usuario y contraseña';
      errBox.style.display = 'block';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Verificando...';
  }
  if (errBox) errBox.style.display = 'none';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (errBox) {
        errBox.innerText = data.error || 'Usuario o contraseña incorrectos';
        errBox.style.display = 'block';
      }
      return;
    }

    currentUser = data.user;
    localStorage.setItem('filelynx_user', JSON.stringify(currentUser));
    init();
  } catch (err) {
    if (errBox) {
      errBox.innerText = 'Fallo de conexión con el servidor: ' + err.message;
      errBox.style.display = 'block';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Ingresar';
    }
  }
};

async function init() {
  const vpsHost = window.location.host;
  const subTitle = document.getElementById('loginHostSubtitle');
  if (subTitle) subTitle.innerText = `Servidor: ${vpsHost}`;

  const saved = localStorage.getItem('filelynx_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
    } catch {
      currentUser = null;
    }
  }

  const viewAuth = document.getElementById('view-auth');
  const mainContent = document.getElementById('panelMainContent');
  const topbar = document.getElementById('mainTopbar');
  const sidebar = document.getElementById('sidebar');
  const uEmail = document.getElementById('uEmail');

  if (!currentUser) {
    if (viewAuth) viewAuth.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (topbar) topbar.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    return;
  }

  if (viewAuth) viewAuth.style.display = 'none';
  if (mainContent) mainContent.style.display = 'block';
  if (topbar) topbar.style.display = 'flex';
  if (sidebar) sidebar.style.display = 'flex';
  if (uEmail) uEmail.innerText = currentUser.username;

  const rawPath = window.location.pathname.replace(/^\/+/, '');
  const segments = rawPath.split('/');
  const initialSection = segments[0] || 'files';
  const initialSubPath = initialSection === 'files' && segments.length > 1 ? segments.slice(1).join('/') : '';

  window.navigate(viewLoaders[initialSection] ? initialSection : 'files', false, initialSubPath);
}

window.onload = init;
