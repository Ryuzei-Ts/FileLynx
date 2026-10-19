function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    window.showToast?.('Comando copiado ✰');
  } catch {
    window.showToast?.('No se pudo copiar automáticamente');
  }
  document.body.removeChild(textArea);
}

function formatMarkdownChangelog(raw) {
  if (!raw) return 'No hay contenido disponible en CHANGELOG.md.';
  const lines = raw.split('\n');
  return lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return `<h2 style="font-size:1.15rem; font-weight:800; color:var(--text-dark); margin:12px 0 6px;">${escapeHtml(trimmed.slice(2))}</h2>`;
    }
    if (trimmed.startsWith('## ')) {
      return `<h3 style="font-size:0.95rem; font-weight:800; color:var(--primary); margin:12px 0 4px;">${escapeHtml(trimmed.slice(3))}</h3>`;
    }
    if (trimmed.startsWith('### ')) {
      return `<h4 style="font-size:0.85rem; font-weight:800; color:var(--text-dark); margin:8px 0 2px;">${escapeHtml(trimmed.slice(4))}</h4>`;
    }
    if (trimmed.startsWith('- ')) {
      return `<div style="padding-left:14px; position:relative; margin-bottom:4px;">&bull; ${escapeHtml(trimmed.slice(2))}</div>`;
    }
    return trimmed ? `<div>${escapeHtml(trimmed)}</div>` : '<div style="height:6px;"></div>';
  }).join('');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
          <div class="command-copy-box" id="btnCopyCmd" title="Haz clic para copiar">
            <span id="cmdText">cd ~/FileLynx && git pull origin main && pm2 restart filelynx</span>
            <i class="fas fa-copy"></i>
          </div>
        </div>
      </div>

      <div class="changelog-card" id="githubStatusCard">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:10px;">
          <i class="fab fa-github"></i> Estado del Repositorio
        </h4>
        <div id="ghFetchResult" style="font-size:0.82rem; color:var(--text-gray);">
          Haz clic en "Comprobar Actualización" para inspeccionar el estado en GitHub.
        </div>
      </div>

      <div class="changelog-card">
        <h4 style="font-weight:800; font-size:0.95rem; margin-bottom:12px;">Historial de Versiones (CHANGELOG.md)</h4>
        <div id="changelogMarkdownViewer" style="font-size:0.85rem; line-height:1.6; color:var(--text-dark); background:var(--bg-params); padding:16px; border-radius:12px; border:1px solid var(--border); max-height:420px; overflow-y:auto;">
          Cargando CHANGELOG.md desde GitHub...
        </div>
      </div>
    </div>
  `;

  const copyBtn = document.getElementById('btnCopyCmd');
  copyBtn.onclick = () => {
    const text = 'cd ~/FileLynx && git pull origin main && pm2 restart filelynx';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => window.showToast?.('Comando copiado ✰'))
        .catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  };

  document.getElementById('btnCheckUpdates').onclick = () => {
    checkRemoteGithub();
    loadRemoteChangelog();
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
        <i class="fas fa-check-circle"></i> Repositorio conectado correctamente
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:8px;">
        <div><b>Rama por defecto:</b> ${repo.default_branch || 'main'}</div>
        <div><b>Última actualización:</b> ${lastUpdate}</div>
        <div><b>Estrellas:</b> ${repo.stargazers_count ?? 0} ✰</div>
        <div><b>Forks:</b> ${repo.forks_count ?? 0}</div>
      </div>
    `;
  } catch (err) {
    resultDiv.innerHTML = `
      <div style="color:#ef4444; font-weight:700;">
        <i class="fas fa-exclamation-triangle"></i> No se pudo consultar el repositorio remoto (${err.message}).
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
    viewer.innerHTML = formatMarkdownChangelog(markdownText);
  } catch (err) {
    viewer.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Error al cargar CHANGELOG.md: ${err.message}</span>`;
  }
}
