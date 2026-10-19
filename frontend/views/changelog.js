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

      <!-- Estado de la versión -->
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

      <!-- Estado en GitHub -->
      <div class="changelog-card" id="githubStatusCard">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:10px;">
          <i class="fab fa-github"></i> Estado en Repositorio GitHub
        </h4>
        <div id="ghFetchResult" style="font-size:0.82rem; color:var(--text-gray);">
          Haz clic en "Comprobar Actualización" para inspeccionar <code>frontend/views/files.js</code> en GitHub.
        </div>
      </div>

      <!-- Historial de versiones -->
      <div class="changelog-card">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:12px;">Historial de Versiones</h4>
        <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:12px; font-size:0.84rem;">
          <li style="border-bottom:1px solid var(--border); padding-bottom:10px;">
            <b>v0.1.0 (Versión Actual)</b> &bull; <small style="color:var(--text-gray);">Octubre 2026</small>
            <ul style="margin-left:18px; margin-top:4px; color:var(--text-gray); line-height:1.45;">
              <li>Bloc de notas estilo iOS integrado con autoguardado.</li>
              <li>Terminal clara con texto azul y sanitización completa de secuencias ANSI.</li>
              <li>Modal de subida centralizado con soporte para archivos, carpetas completas y GitHub.</li>
              <li>Rutas limpias tipo SPA con soporte para retroceso nativo de navegador móvil.</li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  `;

  document.getElementById('btnCheckUpdates').onclick = checkRemoteGithub;
  window.copyUpdateCommand = () => {
    navigator.clipboard.writeText('git pull origin main && pm2 restart filelynx');
    window.showToast?.('Comando copiado al portapapeles ✰');
  };

  checkRemoteGithub();
}

async function checkRemoteGithub() {
  const resultDiv = document.getElementById('ghFetchResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando con GitHub API...';

  try {
    const rawUrl = 'https://raw.githubusercontent.com/Ryuzei-Ts/FileLynx/main/frontend/views/files.js';
    const res = await fetch(rawUrl, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`Código HTTP ${res.status}`);
    }

    const content = await res.text();
    const sizeKB = (content.length / 1024).toFixed(1);

    resultDiv.innerHTML = `
      <div style="color:#10b981; font-weight:700; margin-bottom:6px;">
        <i class="fas fa-check-circle"></i> Conectado con éxito a <code>frontend/views/files.js</code>
      </div>
      <div>Tamaño del archivo remoto: <b>${sizeKB} KB</b></div>
      <div style="margin-top:6px;">
        Tu servidor está listo para recibir actualizaciones ejecutando <code>git pull origin main && pm2 restart filelynx</code>.
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="color:#ef4444; font-weight:700;">
        <i class="fas fa-exclamation-triangle"></i> No se pudo comprobar el archivo remoto (${err.message}).
      </div>
      <div style="margin-top:4px;">Asegúrate de que el repositorio sea público o de que tu VPS tenga conexión a Internet.</div>
    `;
  }
}
