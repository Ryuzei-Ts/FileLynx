export async function renderChangelog(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800;">Registro de Cambios (Change Log)</h3>
          <p style="font-size:0.8rem; color:var(--text-gray); margin-top:2px;">Sincronización con GitHub (Público y Privado)</p>
        </div>
      </div>

      <div class="changelog-card" style="border-left:4px solid var(--primary);">
        <span class="changelog-version-tag">INSTALADO ACTUALMENTE: v0.1.0</span>
        <h4 style="font-weight:800; font-size:1.05rem; margin-bottom:6px;">FileLynx Cloud Web IDE</h4>
        <p style="font-size:0.82rem; color:var(--text-gray); line-height:1.5;">
          Editor web ligero, terminal interactiva bash PTY sobre WebSockets, bloc de notas y explorador de archivos para VPS.
        </p>

        <div style="margin-top:16px;">
          <button class="btn-full" id="btnRunPull" style="padding:14px; font-size:0.95rem; font-weight:800;">
            <i class="fas fa-sync-alt"></i> Actualizar Sistema (Git Pull)
          </button>
        </div>
      </div>

      <div class="changelog-card" id="githubStatusCard">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:10px;">
          <i class="fab fa-github"></i> Estado del Repositorio
        </h4>
        <div id="ghFetchResult" style="font-size:0.82rem; color:var(--text-gray);">
          Consultando estado en GitHub...
        </div>
      </div>

      <div class="changelog-card">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:12px;">Historial de Versiones (CHANGELOG.md)</h4>
        <div id="changelogMarkdownViewer" style="font-size:0.85rem; line-height:1.6; color:var(--text-dark); background:var(--bg-params); padding:16px; border-radius:12px; border:1px solid var(--border); max-height:420px; overflow-y:auto;">
          Cargando CHANGELOG.md...
        </div>
      </div>
    </div>

    <div class="modal" id="modalGitAuthRequired">
      <div class="modal-content" style="max-width:440px;">
        <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:8px;">
          <i class="fas fa-lock" style="color:var(--price-color);"></i> Autenticación Requerida
        </h3>
        <p style="font-size:0.82rem; color:var(--text-gray); margin-bottom:14px;">
          El repositorio requiere un Personal Access Token (PAT) de GitHub para descargar las actualizaciones.
        </p>
        <div class="param-group">
          <label class="param-label">Personal Access Token</label>
          <input type="password" id="inputPrivateToken" class="param-input" placeholder="ghp_xxxxxxxxxxxx" />
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
          <button class="stat-btn" onclick="document.getElementById('modalGitAuthRequired').classList.remove('active')">Cancelar</button>
          <button class="btn-full" style="width:auto; padding:10px 18px;" id="btnSubmitPrivateToken">Autenticar y Actualizar</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnRunPull').onclick = () => executeSystemUpdate();

  checkRemoteGithub();
  loadRemoteChangelog();
}

async function executeSystemUpdate(tokenOverride = '') {
  const token = tokenOverride || localStorage.getItem('filelynx_gh_token') || '';
  const pullBtn = document.getElementById('btnRunPull');
  if (pullBtn) {
    pullBtn.disabled = true;
    pullBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando VPS...';
  }

  try {
    const res = await fetch('/api/system/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token || undefined }),
    });

    const data = await res.json();

    if (data.needsAuth) {
      document.getElementById('modalGitAuthRequired').classList.add('active');
      document.getElementById('btnSubmitPrivateToken').onclick = () => {
        const inputToken = document.getElementById('inputPrivateToken').value.trim();
        if (!inputToken) return;
        localStorage.setItem('filelynx_gh_token', inputToken);
        document.getElementById('modalGitAuthRequired').classList.remove('active');
        executeSystemUpdate(inputToken);
      };
      return;
    }

    if (data.success) {
      window.showToast?.(data.message || 'Actualización completada ꕤ');
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } else {
      alert(`Error al actualizar: ${data.error}`);
    }
  } catch {
    window.showToast?.('Servidor reiniciando tras actualizar ✰');
    setTimeout(() => {
      window.location.reload();
    }, 2500);
  } finally {
    if (pullBtn) {
      pullBtn.disabled = false;
      pullBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar Sistema (Git Pull)';
    }
  }
}

async function checkRemoteGithub() {
  const resultDiv = document.getElementById('ghFetchResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando con GitHub...';

  try {
    const res = await fetch('https://api.github.com/repos/Ryuzei-Ts/FileLynx', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const repo = await res.json();
    const lastUpdate = repo.pushed_at ? new Date(repo.pushed_at).toLocaleString('es-ES') : 'Reciente';

    resultDiv.innerHTML = `
      <div style="color:#10b981; font-weight:700; margin-bottom:8px;">
        <i class="fas fa-check-circle"></i> Repositorio conectado (${repo.private ? 'Privado' : 'Público'})
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
        <div><b>Rama:</b> ${repo.default_branch || 'main'}</div>
        <div><b>Última actualización:</b> ${lastUpdate}</div>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="color:var(--text-gray);">
        <i class="fas fa-info-circle"></i> Repositorio público sincronizado con la rama principal.
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
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    viewer.innerHTML = formatMarkdown(text);
  } catch (err) {
    viewer.innerHTML = `<span style="color:var(--text-gray);">No se pudo cargar el CHANGELOG remoto (${err.message}).</span>`;
  }
}

function formatMarkdown(raw) {
  if (!raw) return 'No hay contenido disponible.';
  return raw
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) return `<h2 style="font-weight:800; font-size:1.1rem; margin:10px 0 4px;">${escapeHtml(trimmed.slice(2))}</h2>`;
      if (trimmed.startsWith('## ')) return `<h3 style="font-weight:800; font-size:0.95rem; color:var(--primary); margin:8px 0 2px;">${escapeHtml(trimmed.slice(3))}</h3>`;
      if (trimmed.startsWith('### ')) return `<h4 style="font-weight:700; font-size:0.85rem; margin:6px 0 2px;">${escapeHtml(trimmed.slice(4))}</h4>`;
      if (trimmed.startsWith('- ')) return `<div style="padding-left:12px;">&bull; ${escapeHtml(trimmed.slice(2))}</div>`;
      return trimmed ? `<div>${escapeHtml(trimmed)}</div>` : '<div style="height:4px;"></div>';
    })
    .join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
