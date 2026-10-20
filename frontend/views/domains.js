let currentLoadedDomains = [];
let filePickerCurrentDir = '';

function showAppDialog(title, message, isError = false) {
  const modal = document.getElementById('modalAppAlert');
  if (!modal) {
    alert(title + ':\n' + message);
    return;
  }
  document.getElementById('modalAlertTitle').innerText = title;
  document.getElementById('modalAlertMessage').innerText = message;
  const icon = document.getElementById('modalAlertIcon');
  if (isError) {
    icon.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>';
  } else {
    icon.innerHTML = '<i class="fas fa-info-circle" style="color:var(--primary);"></i>';
  }
  modal.classList.add('active');
}

export async function renderDomains(container) {
  container.innerHTML = `
    <div class="panel-box" style="padding: 24px; margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:1.35rem; font-weight:800; letter-spacing:-0.5px;">
            <i class="fas fa-globe" style="color:var(--primary); margin-right:6px;"></i> Dominios & Proxy Nginx
          </h3>
          <p style="font-size:0.84rem; color:var(--text-gray); margin-top:4px;">
            Conecta dominios a puertos o carpetas del servidor con SSL automático
          </p>
        </div>
        <button class="stat-btn" id="btnRefreshDomains" style="padding: 10px 16px;">
          <i class="fas fa-sync-alt"></i> Recargar
        </button>
      </div>

      <!-- Guía DNS Plegable -->
      <div class="panel-box" style="background:var(--bg-params); border:1px solid var(--border); margin-bottom:24px; border-radius:14px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggleDnsGuideHeader">
          <div style="display:flex; align-items:center; gap:10px;">
            <i class="fas fa-info-circle" style="color:var(--primary); font-size:1.1rem;"></i>
            <span style="font-weight:800; font-size:0.92rem;">Guía de Configuración DNS & Subrutas (Haz clic para ver)</span>
          </div>
          <i class="fas fa-chevron-down" id="dnsGuideChevron" style="font-size:0.85rem; color:var(--text-gray); transition:transform 0.25s;"></i>
        </div>

        <div id="dnsGuideBody" style="display:none; margin-top:16px; border-top:1px solid var(--border); padding-top:14px; font-size:0.82rem; line-height:1.6;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
            <div style="background:var(--bg-card); padding:14px; border-radius:12px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">1. Modo "Solo DNS" en Cloudflare</b>
              <span>Si usas Cloudflare, activa la <b>Nube Gris (DNS Only)</b> para que Certbot pueda emitir el certificado sin bloqueos.</span>
            </div>
            <div style="background:var(--bg-card); padding:14px; border-radius:12px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">2. Carpetas y Puertos Automáticos</b>
              <span>Si vinculas una carpeta, Nginx le asignará automáticamente un puerto libre del VPS para servir la web sin conflictos.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjeta Formulario -->
      <div class="panel-box" style="border:1.5px dashed var(--primary); background:rgba(37,99,235,0.02); margin-bottom:28px; border-radius:18px; padding:24px;">
        <h4 style="font-size:1.05rem; font-weight:800; margin-bottom:18px;">
          <i class="fas fa-plus-circle" style="color:var(--primary); margin-right:6px;"></i> Vincular Dominio a Puerto o Carpeta
        </h4>

        <div style="margin-bottom:18px;">
          <label class="param-label">Nombre de Dominio o Subdominio</label>
          <input type="text" id="targetDomainInput" class="param-input" placeholder="ej. bot.ryuzei.xyz" />
        </div>

        <div style="background:var(--bg-card); padding:18px; border-radius:14px; border:1px solid var(--border); margin-bottom:18px;">
          <label class="param-label">Destino de la Conexión</label>
          <div style="display:flex; gap:20px; margin-bottom:14px; flex-wrap:wrap;">
            <label style="display:flex; align-items:center; gap:8px; font-size:0.86rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="port" checked /> Puerto interno existente (ej. 3000)
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.86rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="path" /> Carpeta del Servidor (Asigna puerto automático)
            </label>
          </div>

          <div id="portTargetWrapper">
            <label class="param-label">Puerto interno</label>
            <input type="number" id="targetPortInput" class="param-input" value="3000" placeholder="3000" />
          </div>

          <div id="pathTargetWrapper" style="display:none;">
            <label class="param-label">Ruta de la Carpeta en el Servidor</label>
            <div style="display:flex; gap:10px;">
              <input type="text" id="targetPathInput" class="param-input" placeholder="ej. /root/Sukuna-Ryuzei" style="flex:1;" />
              <button class="stat-btn" id="btnPickServerPath" type="button" style="white-space:nowrap; padding:10px 16px;">
                <i class="fas fa-folder-open"></i> Elegir del Servidor
              </button>
            </div>
          </div>
        </div>

        <div id="sslOptionsWrapper" style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <input type="checkbox" id="autoSslCheck" checked style="width:18px; height:18px; cursor:pointer;" />
            <label for="autoSslCheck" style="font-size:0.86rem; font-weight:700; cursor:pointer;">
              Generar Certificado SSL (HTTPS) con Certbot automáticamente
            </label>
          </div>
          <div>
            <label class="param-label">Correo para Certbot SSL</label>
            <input type="email" id="certbotEmailInput" class="param-input" placeholder="admin@tudominio.com" />
          </div>
        </div>

        <button class="btn-full" id="btnSaveConfig" style="width:auto; padding:14px 28px; font-size:0.92rem;">
          <i class="fas fa-save"></i> Guardar y Aplicar en Nginx
        </button>
      </div>

      <!-- Lista de Dominios -->
      <div>
        <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:14px;">Dominios Configurados</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>

    <!-- Modal Explorador de Servidor -->
    <div class="modal" id="modalFilePicker">
      <div class="modal-content" style="max-width:580px; padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 style="font-size:1.1rem; font-weight:800;">
            <i class="fas fa-folder-open text-primary" style="margin-right:6px;"></i> Explorador del Servidor
          </h3>
          <button class="stat-btn" onclick="document.getElementById('modalFilePicker').classList.remove('active')">✕</button>
        </div>

        <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
          <button class="stat-btn" id="btnFilePickerUp" title="Subir de nivel">
            <i class="fas fa-arrow-up"></i>
          </button>
          <input type="text" id="filePickerPathDisplay" class="param-input" readonly style="flex:1; font-family:monospace; font-size:0.82rem;" />
        </div>

        <div id="filePickerEntries" style="height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:12px; padding:6px; background:var(--bg-params); margin-bottom:16px;">
          Cargando carpetas...
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <span style="font-size:0.75rem; color:var(--text-gray);">Haz clic en una carpeta para seleccionarla</span>
          <div style="display:flex; gap:8px;">
            <button class="stat-btn" onclick="document.getElementById('modalFilePicker').classList.remove('active')">Cancelar</button>
            <button class="btn-full" style="width:auto; padding:10px 18px;" id="btnConfirmSelectedPath">Seleccionar Esta Carpeta</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const btnRefresh = document.getElementById('btnRefreshDomains');
  const btnSave = document.getElementById('btnSaveConfig');
  const guideHeader = document.getElementById('toggleDnsGuideHeader');
  const guideBody = document.getElementById('dnsGuideBody');
  const chevron = document.getElementById('dnsGuideChevron');
  const radioButtons = document.querySelectorAll('input[name="targetTypeRadio"]');
  const portWrap = document.getElementById('portTargetWrapper');
  const pathWrap = document.getElementById('pathTargetWrapper');
  const btnPickPath = document.getElementById('btnPickServerPath');

  if (guideHeader && guideBody && chevron) {
    guideHeader.onclick = () => {
      const isClosed = guideBody.style.display === 'none';
      guideBody.style.display = isClosed ? 'block' : 'none';
      chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
    };
  }

  radioButtons.forEach((r) => {
    r.onchange = () => {
      const isPort = r.value === 'port';
      portWrap.style.display = isPort ? 'block' : 'none';
      pathWrap.style.display = isPort ? 'none' : 'block';
    };
  });

  btnPickPath.onclick = () => openFilePicker('');

  document.getElementById('btnFilePickerUp').onclick = () => {
    if (!filePickerCurrentDir) return;
    const parts = filePickerCurrentDir.split('/').filter(Boolean);
    parts.pop();
    openFilePicker(parts.join('/'));
  };

  document.getElementById('btnConfirmSelectedPath').onclick = () => {
    document.getElementById('targetPathInput').value = filePickerCurrentDir ? '/' + filePickerCurrentDir : '/root';
    document.getElementById('modalFilePicker').classList.remove('active');
  };

  if (btnRefresh) btnRefresh.onclick = loadDomainList;
  if (btnSave) btnSave.onclick = handleSaveConfiguration;

  loadDomainList();
}

async function openFilePicker(relPath) {
  filePickerCurrentDir = relPath;
  const modal = document.getElementById('modalFilePicker');
  const pathDisplay = document.getElementById('filePickerPathDisplay');
  const entriesBox = document.getElementById('filePickerEntries');

  pathDisplay.value = relPath ? `/${relPath}` : '/ (Raíz)';
  entriesBox.innerHTML = '<p style="padding:16px; color:var(--text-gray); text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(relPath)}`);
    const data = await res.json();
    entriesBox.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      entriesBox.innerHTML = '<p style="padding:16px; color:var(--text-gray); text-align:center;">Carpeta vacía.</p>';
      return;
    }

    data.files.forEach((f) => {
      if (!f.isDirectory) return;
      const item = document.createElement('div');
      item.className = 'file-row';
      item.style.padding = '10px 14px';
      item.style.borderRadius = '8px';
      item.style.marginBottom = '4px';

      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1; cursor:pointer;">
          <i class="fas fa-folder text-primary" style="color:#2563eb; font-size:1.1rem;"></i>
          <span style="font-size:0.86rem; font-weight:700;">${f.name}</span>
        </div>
        <button class="stat-btn" style="padding:4px 10px; font-size:0.75rem;">Elegir</button>
      `;

      item.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('targetPathInput').value = f.path.startsWith('/') ? f.path : '/' + f.path;
        modal.classList.remove('active');
      };

      item.onclick = () => {
        openFilePicker(f.path);
      };

      entriesBox.appendChild(item);
    });
  } catch (err) {
    entriesBox.innerHTML = `<p style="color:#ef4444; padding:16px;">Error: ${err.message}</p>`;
  }
}

async function loadDomainList() {
  const container = document.getElementById('domainsListContainer');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">Consultando configuración de Nginx...</p>';

  try {
    const res = await fetch('/api/nginx/list');
    const data = await res.json();

    if (!data.installed) {
      container.innerHTML = '<p style="color:#ef4444; padding:10px;">Nginx no está instalado.</p>';
      return;
    }

    const domains = data.domains || [];
    if (domains.length === 0) {
      container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">No hay dominios vinculados aún.</p>';
      return;
    }

    container.innerHTML = domains.map((d) => `
      <div class="panel-box" style="margin-bottom:14px; padding:18px; border:1px solid var(--border); border-radius:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <b style="font-size:1.05rem;">${d.domain}</b>
              <span style="font-size:0.7rem; background:${d.hasSsl ? '#10b981' : '#64748b'}; color:#fff; padding:3px 8px; border-radius:4px; font-weight:800;">
                ${d.hasSsl ? 'SSL HTTPS' : 'HTTP'}
              </span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-gray); margin-top:4px;">
              Proxy apuntando al <b>Puerto interno ${d.target}</b> &bull; Estado: Activo
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            ${!d.hasSsl ? `<button class="stat-btn btn-issue-ssl" data-domain="${d.domain}"><i class="fas fa-lock"></i> Activar SSL</button>` : ''}
            <button class="stat-btn" style="color:#ef4444;" onclick="deleteDomainConfig('${d.domain}')"><i class="fas fa-trash"></i> Eliminar</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-issue-ssl').forEach((b) => {
      b.onclick = () => issueSslForDomain(b.getAttribute('data-domain'));
    });
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444; padding:10px;">Error: ${err.message}</p>`;
  }
}

async function handleSaveConfiguration() {
  const domain = document.getElementById('targetDomainInput').value.trim();
  const targetTypeRadio = document.querySelector('input[name="targetTypeRadio"]:checked');
  const targetType = targetTypeRadio ? targetTypeRadio.value : 'port';
  const targetPort = document.getElementById('targetPortInput').value.trim();
  const targetPath = document.getElementById('targetPathInput').value.trim();

  const target = targetType === 'port' ? targetPort : targetPath;
  const autoSsl = document.getElementById('autoSslCheck').checked;
  const email = document.getElementById('certbotEmailInput').value.trim();
  const btn = document.getElementById('btnSaveConfig');

  if (!domain || !target) {
    showAppDialog('Campos Requeridos', 'Ingresa el dominio y selecciona la carpeta o puerto de destino.', true);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configurando Nginx...';
  window.showToast?.('Asignando puerto y aplicando Nginx...');

  try {
    const res = await fetch('/api/nginx/save-domain-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, targetType, target, email, autoSsl }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      let msg = 'Dominio configurado exitosamente ✰';
      if (data.assignedPort) {
        msg += ` (Puerto asignado: ${data.assignedPort}). Inicia tu bot con: PORT=${data.assignedPort} pm2 start index.js`;
      }
      showAppDialog('Configuración Exitosa', msg, false);
      document.getElementById('targetDomainInput').value = '';
      loadDomainList();
    } else {
      showAppDialog('Error de Nginx', data.error || 'No se pudo guardar la configuración.', true);
    }
  } catch (err) {
    showAppDialog('Error de Red', err.message || 'Error al comunicarse con el servidor.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar y Aplicar en Nginx';
  }
}

async function issueSslForDomain(domain) {
  const email = prompt('Correo para Certbot Let\'s Encrypt:', 'admin@' + domain);
  if (!email) return;

  window.showToast?.('Solicitando certificado SSL...');
  try {
    const res = await fetch('/api/nginx/issue-ssl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, email }),
    });
    const d = await res.json();
    if (d.success) {
      window.showToast?.('Certificado SSL instalado correctamente ꕤ');
      loadDomainList();
    } else {
      showAppDialog('Fallo en Certbot SSL', d.error, true);
    }
  } catch (err) {
    showAppDialog('Error de Red', err.message, true);
  }
}

window.deleteDomainConfig = async function (domain) {
  if (!confirm(`¿Eliminar la configuración completa de Nginx para ${domain}?`)) return;

  try {
    await fetch(`/api/nginx/delete?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' });
    window.showToast?.('Dominio eliminado de Nginx');
    loadDomainList();
  } catch (err) {
    showAppDialog('Error', err.message, true);
  }
};
