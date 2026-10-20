let currentLoadedDomains = [];
let filePickerCurrentDir = '';

export async function renderDomains(container) {
  container.innerHTML = `
    <div class="panel-box" style="padding: 24px; margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="font-size:1.35rem; font-weight:800; letter-spacing:-0.5px;">
            <i class="fas fa-globe" style="color:var(--primary); margin-right:6px;"></i> Dominios & Proxy Nginx
          </h3>
          <p style="font-size:0.84rem; color:var(--text-gray); margin-top:4px;">
            Vincula dominios a puertos o carpetas del servidor y activa certificados SSL automáticos
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
              <b style="color:var(--primary); display:block; margin-bottom:4px;">2. Conectar Subrutas</b>
              <span>Conecta rutas como <code>/files/database</code> a un puerto interno (ej. <code>8080</code>) o a una carpeta directa de tu VPS sin abrir puertos públicos.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tarjeta Formulario -->
      <div class="panel-box" style="border:1.5px dashed var(--primary); background:rgba(37,99,235,0.02); margin-bottom:28px; border-radius:18px; padding:24px;">
        <h4 style="font-size:1.05rem; font-weight:800; margin-bottom:18px;">
          <i class="fas fa-plus-circle" style="color:var(--primary); margin-right:6px;"></i> Vincular Dominio o Subruta
        </h4>

        <!-- Fila 1: Dominio y Tipo de Conexión -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:18px; margin-bottom:18px;">
          <div>
            <label class="param-label">Dominio o Subdominio</label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="targetDomainInput" class="param-input" placeholder="ej. db.ryuzei.xyz o dash.ryuzei.xyz" style="flex:1;" />
              <select id="quickSelectDomain" class="stat-btn" style="max-width:150px; cursor:pointer;" title="Elegir existente">
                <option value="">Elegir existente...</option>
              </select>
            </div>
          </div>

          <div>
            <label class="param-label">Tipo de Conexión</label>
            <select id="connTypeSelect" class="param-input" style="cursor:pointer;">
              <option value="root">Dominio Raíz (/)</option>
              <option value="subroute">Subruta URL (ej. /files/database)</option>
            </select>
          </div>
        </div>

        <!-- Fila 2: Subruta condicional -->
        <div id="subRouteFieldWrapper" style="display:none; margin-bottom:18px;">
          <label class="param-label">Subruta URL</label>
          <input type="text" id="subRoutePath" class="param-input" placeholder="ej. /files/database o /api2" />
        </div>

        <!-- Fila 3: Selección de Destino (Puerto o Carpeta) -->
        <div style="background:var(--bg-card); padding:18px; border-radius:14px; border:1px solid var(--border); margin-bottom:18px;">
          <label class="param-label">Destino de la Conexión</label>
          <div style="display:flex; gap:20px; margin-bottom:14px; flex-wrap:wrap;">
            <label style="display:flex; align-items:center; gap:8px; font-size:0.86rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="port" checked /> Puerto interno en VPS
            </label>
            <label style="display:flex; align-items:center; gap:8px; font-size:0.86rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="path" /> Carpeta o Archivo del Servidor
            </label>
          </div>

          <div id="portTargetWrapper">
            <label class="param-label">Puerto interno (ej. 3000, 8080, 5000)</label>
            <input type="number" id="targetPortInput" class="param-input" value="3000" placeholder="3000" />
          </div>

          <div id="pathTargetWrapper" style="display:none;">
            <label class="param-label">Ruta de Carpeta o Archivo</label>
            <div style="display:flex; gap:10px;">
              <input type="text" id="targetPathInput" class="param-input" placeholder="ej. /root/mi-web o subcarpeta" style="flex:1;" />
              <button class="stat-btn" id="btnPickServerPath" type="button" style="white-space:nowrap; padding:10px 16px;">
                <i class="fas fa-folder-open"></i> Elegir del Servidor
              </button>
            </div>
          </div>
        </div>

        <!-- Fila 4: SSL y Correo -->
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

        <!-- Botón Guardar -->
        <button class="btn-full" id="btnSaveConfig" style="width:auto; padding:14px 28px; font-size:0.92rem;">
          <i class="fas fa-save"></i> Guardar y Aplicar en Nginx
        </button>
      </div>

      <!-- Lista de Dominios -->
      <div>
        <h4 style="font-size:1.1rem; font-weight:800; margin-bottom:14px;">Dominios & Subrutas Configurados</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>

    <!-- Modal Explorador de Archivos/Carpetas con Navegación de Subcarpetas -->
    <div class="modal" id="modalFilePicker">
      <div class="modal-content" style="max-width:580px; padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 style="font-size:1.1rem; font-weight:800;">
            <i class="fas fa-folder-open text-primary" style="margin-right:6px;"></i> Explorador del Servidor
          </h3>
          <button class="stat-btn" onclick="document.getElementById('modalFilePicker').classList.remove('active')">✕</button>
        </div>

        <!-- Barra de navegación y migas de pan -->
        <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
          <button class="stat-btn" id="btnFilePickerUp" title="Subir de nivel">
            <i class="fas fa-arrow-up"></i>
          </button>
          <input type="text" id="filePickerPathDisplay" class="param-input" readonly style="flex:1; font-family:monospace; font-size:0.82rem;" />
        </div>

        <!-- Lista de carpetas navegables -->
        <div id="filePickerEntries" style="height:300px; overflow-y:auto; border:1px solid var(--border); border-radius:12px; padding:6px; background:var(--bg-params); margin-bottom:16px;">
          Cargando carpetas...
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <span style="font-size:0.75rem; color:var(--text-gray);">Haz clic en una carpeta para abrirla</span>
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
  const connType = document.getElementById('connTypeSelect');
  const subRouteWrap = document.getElementById('subRouteFieldWrapper');
  const sslWrap = document.getElementById('sslOptionsWrapper');
  const radioButtons = document.querySelectorAll('input[name="targetTypeRadio"]');
  const portWrap = document.getElementById('portTargetWrapper');
  const pathWrap = document.getElementById('pathTargetWrapper');
  const domainInput = document.getElementById('targetDomainInput');
  const domainSelect = document.getElementById('quickSelectDomain');
  const btnPickPath = document.getElementById('btnPickServerPath');

  if (guideHeader && guideBody && chevron) {
    guideHeader.onclick = () => {
      const isClosed = guideBody.style.display === 'none';
      guideBody.style.display = isClosed ? 'block' : 'none';
      chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
    };
  }

  connType.onchange = () => {
    const isSub = connType.value === 'subroute';
    subRouteWrap.style.display = isSub ? 'block' : 'none';
    sslWrap.style.display = isSub ? 'none' : 'block';
  };

  radioButtons.forEach((r) => {
    r.onchange = () => {
      const isPort = r.value === 'port';
      portWrap.style.display = isPort ? 'block' : 'none';
      pathWrap.style.display = isPort ? 'none' : 'block';
    };
  });

  domainSelect.onchange = () => {
    if (domainSelect.value) {
      domainInput.value = domainSelect.value;
    }
  };

  btnPickPath.onclick = () => openFilePicker('');

  document.getElementById('btnFilePickerUp').onclick = () => {
    if (!filePickerCurrentDir) return;
    const parts = filePickerCurrentDir.split('/').filter(Boolean);
    parts.pop();
    openFilePicker(parts.join('/'));
  };

  document.getElementById('btnConfirmSelectedPath').onclick = () => {
    document.getElementById('targetPathInput').value = filePickerCurrentDir || '/';
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
  entriesBox.innerHTML = '<p style="padding:16px; color:var(--text-gray); text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando contenido...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(relPath)}`);
    const data = await res.json();
    entriesBox.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      entriesBox.innerHTML = '<p style="padding:16px; color:var(--text-gray); text-align:center;">Esta carpeta está vacía.</p>';
      return;
    }

    data.files.forEach((f) => {
      const item = document.createElement('div');
      item.className = 'file-row';
      item.style.padding = '10px 14px';
      item.style.borderRadius = '8px';
      item.style.marginBottom = '4px';

      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1; cursor:pointer;">
          <i class="${f.isDirectory ? 'fas fa-folder text-primary' : 'fas fa-file'}" style="color:${f.isDirectory ? '#2563eb' : '#64748b'}; font-size:1.1rem;"></i>
          <span style="font-size:0.86rem; font-weight:700;">${f.name}</span>
        </div>
        <button class="stat-btn" style="padding:4px 10px; font-size:0.75rem;">Elegir</button>
      `;

      item.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('targetPathInput').value = f.path;
        modal.classList.remove('active');
      };

      item.onclick = () => {
        if (f.isDirectory) {
          openFilePicker(f.path);
        } else {
          document.getElementById('targetPathInput').value = f.path;
          modal.classList.remove('active');
        }
      };

      entriesBox.appendChild(item);
    });
  } catch (err) {
    entriesBox.innerHTML = `<p style="color:#ef4444; padding:16px;">Error al listar carpetas: ${err.message}</p>`;
  }
}

async function loadDomainList() {
  const container = document.getElementById('domainsListContainer');
  const domainSelect = document.getElementById('quickSelectDomain');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">Consultando configuración de Nginx...</p>';

  try {
    const res = await fetch('/api/nginx/list');
    const data = await res.json();

    if (!data.installed) {
      container.innerHTML = `
        <div style="padding:16px; background:rgba(245,158,11,0.1); border-left:4px solid var(--price-color); border-radius:8px;">
          <b>Nginx no está instalado en este VPS.</b>
          <p style="font-size:0.8rem; margin-top:4px;">Instálalo ejecutando: <code>apt-get install -y nginx certbot python3-certbot-nginx</code></p>
        </div>
      `;
      return;
    }

    currentLoadedDomains = data.domains || [];

    if (domainSelect) {
      let options = '<option value="">Elegir existente...</option>';
      for (let i = 0; i < currentLoadedDomains.length; i++) {
        options += '<option value="' + currentLoadedDomains[i].domain + '">' + currentLoadedDomains[i].domain + '</option>';
      }
      domainSelect.innerHTML = options;
    }

    if (currentLoadedDomains.length === 0) {
      container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">No hay dominios vinculados aún en sites-available.</p>';
      return;
    }

    let rowsHtml = '';
    for (let i = 0; i < currentLoadedDomains.length; i++) {
      const d = currentLoadedDomains[i];
      const sslBadge = d.hasSsl
        ? '<span style="font-size:0.7rem; background:#10b981; color:#fff; padding:3px 8px; border-radius:4px; font-weight:800;">SSL HTTPS</span>'
        : '<span style="font-size:0.7rem; background:#64748b; color:#fff; padding:3px 8px; border-radius:4px; font-weight:800;">HTTP</span>';

      const sslBtn = !d.hasSsl
        ? '<button class="stat-btn btn-issue-ssl" data-domain="' + d.domain + '"><i class="fas fa-lock"></i> Activar SSL</button>'
        : '';

      const targetDesc = d.targetType === 'port'
        ? `Puerto <code>${d.target}</code>`
        : `Carpeta <code>${d.target}</code>`;

      let subRoutesListHtml = '';
      if (d.subRoutes && d.subRoutes.length > 0) {
        let subItems = '';
        for (let j = 0; j < d.subRoutes.length; j++) {
          const r = d.subRoutes[j];
          const subTargetDesc = r.type === 'port'
            ? `Puerto <b>${r.target}</b>`
            : `Carpeta <b>${r.target}</b>`;

          subItems += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.82rem; padding:6px 0; border-bottom:1px dashed var(--border);">
              <div>
                <code>https://${d.domain}${r.path}</code> &rarr; ${subTargetDesc}
              </div>
              <button class="stat-btn btn-remove-subroute" style="color:#ef4444; padding:3px 8px; font-size:0.72rem;" data-domain="${d.domain}" data-path="${r.path}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        }
        subRoutesListHtml = `
          <div style="margin-top:12px; padding:10px 14px; background:var(--bg-params); border-radius:10px; border:1px solid var(--border);">
            <span style="font-size:0.72rem; font-weight:800; color:var(--text-gray); text-transform:uppercase; letter-spacing:0.5px;">Subrutas conectadas:</span>
            <div style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
              ${subItems}
            </div>
          </div>
        `;
      }

      rowsHtml += `
        <div class="panel-box" style="margin-bottom:14px; padding:18px; border:1px solid var(--border); border-radius:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <b style="font-size:1.05rem;">${d.domain}</b>
                ${sslBadge}
              </div>
              <div style="font-size:0.8rem; color:var(--text-gray); margin-top:4px;">
                Raíz <code>/</code> &rarr; ${targetDesc} &bull; Estado: ${d.enabled ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              ${sslBtn}
              <button class="stat-btn btn-delete-domain" style="color:#ef4444;" data-domain="${d.domain}"><i class="fas fa-trash"></i> Eliminar Dominio</button>
            </div>
          </div>
          ${subRoutesListHtml}
        </div>
      `;
    }

    container.innerHTML = rowsHtml;

    container.querySelectorAll('.btn-issue-ssl').forEach((b) => {
      b.onclick = () => issueSslForDomain(b.getAttribute('data-domain'));
    });
    container.querySelectorAll('.btn-delete-domain').forEach((b) => {
      b.onclick = () => deleteDomainConfig(b.getAttribute('data-domain'));
    });
    container.querySelectorAll('.btn-remove-subroute').forEach((b) => {
      b.onclick = () => removeSubRoute(b.getAttribute('data-domain'), b.getAttribute('data-path'));
    });
  } catch (err: any) {
    container.innerHTML = `<p style="color:#ef4444; padding:10px;">Error: ${err.message}</p>`;
  }
}

async function handleSaveConfiguration() {
  const domain = document.getElementById('targetDomainInput').value.trim();
  const connType = document.getElementById('connTypeSelect').value;
  const isSubRoute = connType === 'subroute';
  const routePath = document.getElementById('subRoutePath').value.trim();

  const targetTypeRadio = document.querySelector('input[name="targetTypeRadio"]:checked');
  const targetType = targetTypeRadio ? targetTypeRadio.value : 'port';

  const portVal = document.getElementById('targetPortInput').value.trim();
  const pathVal = document.getElementById('targetPathInput').value.trim();
  const target = targetType === 'port' ? portVal : pathVal;

  const autoSsl = document.getElementById('autoSslCheck').checked;
  const email = document.getElementById('certbotEmailInput').value.trim();
  const btn = document.getElementById('btnSaveConfig');

  if (!domain) {
    window.showToast?.('Ingresa o selecciona un dominio');
    return;
  }
  if (!target) {
    window.showToast?.(targetType === 'port' ? 'Ingresa el puerto en VPS' : 'Ingresa o selecciona la ruta del servidor');
    return;
  }
  if (isSubRoute && !routePath) {
    window.showToast?.('Ingresa la subruta (ej. /files/database)');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configurando Nginx...';
  window.showToast?.('Configurando Nginx...');

  try {
    const res = await fetch('/api/nginx/save-domain-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        isSubRoute,
        routePath,
        targetType,
        target,
        email,
        autoSsl,
      }),
    });

    const data = await res.json();
    if (data.success) {
      if (data.warning) {
        alert(data.warning);
      } else {
        window.showToast?.('Configuración guardada y aplicada en Nginx ✰');
      }
      loadDomainList();
    } else {
      alert('Error: ' + data.error);
    }
  } catch {
    window.showToast?.('Fallo de conexión al configurar Nginx');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar y Aplicar en Nginx';
  }
}

async function removeSubRoute(domain, routePath) {
  if (!confirm(`¿Eliminar la subruta ${routePath} del dominio ${domain}?`)) return;

  try {
    const res = await fetch('/api/nginx/remove-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, routePath }),
    });
    const data = await res.json();
    if (data.success) {
      window.showToast?.('Subruta eliminada exitosamente');
      loadDomainList();
    } else {
      alert(`Error: ${data.error}`);
    }
  } catch {
    window.showToast?.('Fallo al eliminar subruta');
  }
}

async function issueSslForDomain(domain) {
  const email = prompt('Correo para Certbot Let\'s Encrypt:', 'admin@' + domain);
  if (!email) return;

  window.showToast?.('Solicitando certificado a Let\'s Encrypt...');
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
      alert(d.error || 'Fallo en Certbot');
    }
  } catch {
    window.showToast?.('Error de red al generar certificado SSL');
  }
}

async function deleteDomainConfig(domain) {
  if (!confirm(`¿Eliminar la configuración completa de Nginx para ${domain}?`)) return;

  try {
    await fetch(`/api/nginx/delete?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' });
    window.showToast?.('Dominio eliminado de Nginx');
    loadDomainList();
  } catch {
    window.showToast?.('Error al eliminar dominio');
  }
}
