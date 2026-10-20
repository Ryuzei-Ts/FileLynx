let currentLoadedDomains = [];
let filePickerCurrentDir = '';

export async function renderDomains(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800;"><i class="fas fa-globe" style="color:var(--primary);"></i> Dominios & Proxy Nginx</h3>
          <p style="font-size:0.8rem; color:var(--text-gray); margin-top:2px;">Conecta dominios o subrutas a puertos o carpetas del servidor</p>
        </div>
        <button class="stat-btn" id="btnRefreshDomains"><i class="fas fa-sync-alt"></i> Recargar</button>
      </div>

      <!-- Guía DNS -->
      <div class="panel-box" style="background:var(--bg-params); border:1px solid var(--border); margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggleDnsGuideHeader">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fas fa-info-circle" style="color:var(--primary); font-size:1rem;"></i>
            <span style="font-weight:800; font-size:0.92rem;">Guía de Configuración DNS & Subrutas</span>
          </div>
          <i class="fas fa-chevron-down" id="dnsGuideChevron" style="font-size:0.8rem; color:var(--text-gray); transition:transform 0.2s;"></i>
        </div>

        <div id="dnsGuideBody" style="display:none; margin-top:14px; border-top:1px solid var(--border); padding-top:12px; font-size:0.82rem; line-height:1.6; color:var(--text-dark);">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">1. Modo "Solo DNS" en Cloudflare</b>
              <span>Usa <b>Nube Gris (DNS Only)</b> para emitir el certificado SSL inicial con Certbot.</span>
            </div>
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">2. Puerto o Carpeta Directa</b>
              <span>Puedes conectar una URL a un puerto interno (ej. <code>8080</code>) o seleccionar una carpeta del servidor (ej. <code>/files/database</code>) sin necesitar abrir puertos adicionales.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario Unificado -->
      <div class="panel-box" style="border:1.5px dashed var(--primary); background:rgba(37,99,235,0.02); margin-bottom:20px;">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;"><i class="fas fa-network-wired" style="color:var(--primary);"></i> Vincular Dominio o Subruta</h4>

        <!-- Selector de dominio: escribir nuevo o elegir existente -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label class="param-label">Dominio o Subdominio</label>
            <div style="display:flex; gap:6px;">
              <input type="text" id="targetDomainInput" class="param-input" placeholder="ej. dash.ryuzei.xyz o midominio.com" style="flex:1;" />
              <select id="quickSelectDomain" class="stat-btn" style="max-width:140px; cursor:pointer;" title="Elegir existente">
                <option value="">Elegir existente...</option>
              </select>
            </div>
          </div>

          <!-- Tipo de vinculación: Raíz o Subruta -->
          <div>
            <label class="param-label">Tipo de Conexión</label>
            <select id="connTypeSelect" class="param-input" style="cursor:pointer;">
              <option value="root">Dominio Raíz (/)</option>
              <option value="subroute">Subruta URL (ej. /files/database)</option>
            </select>
          </div>

          <!-- Campo de Subruta (condicional) -->
          <div id="subRouteFieldWrapper" style="display:none;">
            <label class="param-label">Subruta URL</label>
            <input type="text" id="subRoutePath" class="param-input" placeholder="ej. /files/database o /api2" />
          </div>
        </div>

        <!-- Selector de destino: Puerto o Archivo/Carpeta -->
        <div style="background:var(--bg-card); padding:14px; border-radius:12px; border:1px solid var(--border); margin-bottom:14px;">
          <label class="param-label">Destino de la Conexión</label>
          <div style="display:flex; gap:16px; margin-bottom:12px;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="port" checked /> Puerto interno en VPS
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; font-weight:700; cursor:pointer;">
              <input type="radio" name="targetTypeRadio" value="path" /> Carpeta o Archivo del Servidor
            </label>
          </div>

          <!-- Input para Puerto -->
          <div id="portTargetWrapper">
            <label class="param-label">Puerto en VPS (ej. 3000, 8080, 5000)</label>
            <input type="number" id="targetPortInput" class="param-input" value="3000" placeholder="3000" />
          </div>

          <!-- Input para Carpeta/Archivo con botón explorador -->
          <div id="pathTargetWrapper" style="display:none;">
            <label class="param-label">Ruta en Servidor</label>
            <div style="display:flex; gap:8px;">
              <input type="text" id="targetPathInput" class="param-input" placeholder="/var/www/... o ruta relativa" style="flex:1;" />
              <button class="stat-btn" id="btnPickServerPath" type="button"><i class="fas fa-folder-open"></i> Elegir del Servidor</button>
            </div>
          </div>
        </div>

        <!-- Opciones de SSL (para dominio raíz) -->
        <div id="sslOptionsWrapper" style="margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <input type="checkbox" id="autoSslCheck" checked style="width:18px; height:18px; cursor:pointer;" />
            <label for="autoSslCheck" style="font-size:0.84rem; font-weight:700; cursor:pointer;">Generar Certificado SSL (HTTPS) con Certbot automáticamente</label>
          </div>
          <div>
            <label class="param-label">Correo para Certbot SSL</label>
            <input type="email" id="certbotEmailInput" class="param-input" placeholder="admin@tudominio.com" />
          </div>
        </div>

        <button class="btn-full" id="btnSaveConfig" style="width:auto; padding:12px 24px;">
          <i class="fas fa-save"></i> Guardar y Aplicar en Nginx
        </button>
      </div>

      <!-- Lista de Dominios y Subrutas -->
      <div class="panel-box">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Dominios & Subrutas Configurados</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>

    <!-- Modal Explorador de Archivos/Carpetas del Servidor -->
    <div class="modal" id="modalFilePicker">
      <div class="modal-content" style="max-width:540px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="font-size:1.05rem; font-weight:800;"><i class="fas fa-folder-open text-primary"></i> Seleccionar Carpeta o Archivo</h3>
          <button class="stat-btn" onclick="document.getElementById('modalFilePicker').classList.remove('active')">✕</button>
        </div>
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          <input type="text" id="filePickerPathDisplay" class="param-input" readonly style="flex:1;" />
          <button class="stat-btn" id="btnFilePickerUp"><i class="fas fa-arrow-up"></i></button>
        </div>
        <div id="filePickerEntries" style="max-height:280px; overflow-y:auto; border:1px solid var(--border); border-radius:10px; margin-bottom:14px;">
          Cargando...
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="stat-btn" onclick="document.getElementById('modalFilePicker').classList.remove('active')">Cancelar</button>
          <button class="btn-full" style="width:auto; padding:8px 18px;" id="btnConfirmSelectedPath">Seleccionar Esta Carpeta</button>
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

  pathDisplay.value = relPath || '/';
  entriesBox.innerHTML = '<p style="padding:10px; color:var(--text-gray);">Consultando...</p>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(relPath)}`);
    const data = await res.json();
    entriesBox.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      entriesBox.innerHTML = '<p style="padding:10px; color:var(--text-gray);">Carpeta vacía</p>';
      return;
    }

    data.files.forEach((f) => {
      const item = document.createElement('div');
      item.className = 'file-row';
      item.style.padding = '8px 12px';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <i class="${f.isDirectory ? 'fas fa-folder text-primary' : 'fas fa-file'}" style="color:${f.isDirectory ? '#2563eb' : '#64748b'}"></i>
          <span style="font-size:0.85rem;">${f.name}</span>
        </div>
        <button class="stat-btn" style="padding:2px 8px; font-size:0.75rem;">Elegir</button>
      `;

      item.onclick = (e) => {
        if (e.target.tagName === 'BUTTON' || !f.isDirectory) {
          document.getElementById('targetPathInput').value = f.path;
          modal.classList.remove('active');
        } else if (f.isDirectory) {
          openFilePicker(f.path);
        }
      };

      entriesBox.appendChild(item);
    });
  } catch (err) {
    entriesBox.innerHTML = `<p style="color:#ef4444; padding:10px;">Error: ${err.message}</p>`;
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
        ? '<span style="font-size:0.7rem; background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">SSL HTTPS</span>'
        : '<span style="font-size:0.7rem; background:#64748b; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">HTTP</span>';

      const sslBtn = !d.hasSsl
        ? '<button class="stat-btn btn-issue-ssl" data-domain="' + d.domain + '"><i class="fas fa-lock"></i> Activar SSL</button>'
        : '';

      const targetDesc = d.targetType === 'port'
        ? `Puerto <code>${d.target}</code>`
        : `Ruta <code>${d.target}</code>`;

      let subRoutesListHtml = '';
      if (d.subRoutes && d.subRoutes.length > 0) {
        let subItems = '';
        for (let j = 0; j < d.subRoutes.length; j++) {
          const r = d.subRoutes[j];
          const subTargetDesc = r.type === 'port'
            ? `Puerto <b>${r.target}</b>`
            : `Ruta <b>${r.target}</b>`;

          subItems += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <div>
                <code>https://${d.domain}${r.path}</code> &rarr; ${subTargetDesc}
              </div>
              <button class="stat-btn btn-remove-subroute" style="color:#ef4444; padding:2px 6px; font-size:0.7rem;" data-domain="${d.domain}" data-path="${r.path}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        }
        subRoutesListHtml = `
          <div style="margin-top:10px; padding:8px 12px; background:var(--bg-params); border-radius:8px; border:1px solid var(--border);">
            <span style="font-size:0.72rem; font-weight:800; color:var(--text-gray); text-transform:uppercase;">Subrutas conectadas:</span>
            <div style="display:flex; flex-direction:column; gap:6px; margin-top:6px;">
              ${subItems}
            </div>
          </div>
        `;
      }

      rowsHtml += `
        <div class="panel-box" style="margin-bottom:12px; padding:16px; border:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <b style="font-size:1.05rem;">${d.domain}</b>
                ${sslBadge}
              </div>
              <div style="font-size:0.78rem; color:var(--text-gray); margin-top:4px;">
                Raíz <code>/</code> &rarr; ${targetDesc} &bull; Estado: ${d.enabled ? 'Activo' : 'Inactivo'}
              </div>
            </div>
            <div style="display:flex; gap:6px;">
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
  } catch (err) {
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
