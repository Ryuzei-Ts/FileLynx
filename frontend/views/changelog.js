export async function renderChangelog(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800;">Registro de Cambios (Change Log)</h3>
          <p style="font-size:0.8rem; color:var(--text-gray); margin-top:2px;">Versión instalada y sincronización con GitHub</p>
        </div>
        <button class="stat-btn" id="btnCheckUpdates"><i class="fas fa-sync-alt"></i> Comprobar Actualización</button>
      </div>

      <div class="changelog-card" style="border-left:4px solid var(--primary);">
        <span class="changelog-version-tag">INSTALADO ACTUALMENTE: v0.1.0</span>
        <h4 style="font-weight:800; font-size:1.05rem; margin-bottom:6px;">FileLynx Cloud Web IDE</h4>
        <p style="font-size:0.82rem; color:var(--text-gray); line-height:1.5;">
          Editor web ligero, terminal interactiva bash PTY sobre WebSockets, bloc de notas y explorador de archivos para VPS.
        </p>

        <div style="margin-top:14px;">
          <span style="font-size:0.75rem; font-weight:800; color:var(--text-gray); text-transform:uppercase;">Comando para actualizar en tu VPS:</span>
          <div class="command-copy-box" onclick="copyUpdateCommand()" title="Haz clic para copiar">
            <span id="cmdText">git pull origin main && pm2 restart filelynx</span>
            <i class="fas fa-copy"></i>
          </div>
        </div>
      </div>

      <div class="changelog-card" id="githubStatusCard">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:10px;">
          <i class="fab fa-github"></i> Estado del Repositorio
        </h4>
        <div id="ghFetchResult" style="font-size:0.82rem; color:var(--text-gray);">
          Haz clic en "Comprobar Actualización" para inspeccionar <code>https://github.com/Ryuzei-Ts/FileLynx</code>.
        </div>
      </div>

      <div class="changelog-card">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:12px;">Historial de Versiones (CHANGELOG.md)</h4>
        <div id="changelogMarkdownViewer" style="font-size:0.85rem; line-height:1.6; color:var(--text-dark); white-space:pre-wrap; background:var(--bg-params); padding:16px; border-radius:12px; border:1px solid var(--border);">
          Cargando CHANGELOG.md desde GitHub...
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnCheckUpdates').onclick = () => {
    checkRemoteGithub();
    loadRemoteChangelog();
  };

  window.copyUpdateCommand = () => {
    navigator.clipboard.writeText('git pull origin main && pm2 restart filelynx');
    window.showToast?.('Comando copiado al portapapeles ✰');
  };

  checkRemoteGithub();
  loadRemoteChangelog();
}

async function checkRemoteGithub() {
  const resultDiv = document.getElementById('ghFetchResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando con GitHub...';

  try {
    const res = await fetch('https://api.github.com/repos/Ryuzei-Ts/FileLynx', { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Código HTTP ${res.status}`);
    }

    const repo = await res.json();
    const lastUpdate = repo.pushed_at ? new Date(repo.pushed_at).toLocaleString('es-ES') : 'Reciente';

    resultDiv.innerHTML = `
      <div style="color:#10b981; font-weight:700; margin-bottom:10px;">
        <i class="fas fa-check-circle"></i> Repositorio conectado: <a href="https://github.com/Ryuzei-Ts/FileLynx" target="_blank" rel="noopener noreferrer" style="color:var(--primary); text-decoration:underline;">https://github.com/Ryuzei-Ts/FileLynx</a>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:8px;">
        <div><b>Rama por defecto:</b> ${repo.default_branch || 'main'}</div>
        <div><b>Última actualización:</b> ${lastUpdate}</div>
        <div><b>Estrellas:</b> ${repo.stargazers_count ?? 0} ✰</div>
        <div><b>Forks:</b> ${repo.forks_count ?? 0}</div>
      </div>
      <div style="margin-top:12px; color:var(--text-gray);">
        Para sincronizar los últimos cambios en tu VPS:
      </div>
      <div class="command-copy-box" onclick="copyUpdateCommand()" style="margin-top:8px;">
        <span>git pull origin main && pm2 restart filelynx</span>
        <i class="fas fa-copy"></i>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="color:#ef4444; font-weight:700;">
        <i class="fas fa-exclamation-triangle"></i> No se pudo consultar el repositorio remoto (${err.message}).
      </div>
      <div style="margin-top:4px;">
        Repositorio: <a href="https://github.com/Ryuzei-Ts/FileLynx" target="_blank" rel="noopener noreferrer" style="color:var(--primary); text-decoration:underline;">https://github.com/Ryuzei-Ts/FileLynx</a>
      </div>
    `;
  }
}

async function loadRemoteChangelog() {
  const viewer = document.getElementById('changelogMarkdownViewer');
  if (!viewer) return;

  try {
    const changelogUrl = 'https://raw.githubusercontent.com/Ryuzei-Ts/FileLynx/refs/heads/main/CHANGELOG.md';
    const res = await fetch(changelogUrl, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const markdownText = await res.text();
    viewer.textContent = markdownText || 'No hay contenido disponible en CHANGELOG.md.';
  } catch (err) {
    viewer.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Error al cargar CHANGELOG.md: ${err.message}</span>`;
  }
}
