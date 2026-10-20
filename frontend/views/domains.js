let currentLoadedDomains = [];

export async function renderDomains(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800;"><i class="fas fa-globe" style="color:var(--primary);"></i> Dominios & Proxy Nginx</h3>
          <p style="font-size:0.8rem; color:var(--text-gray); margin-top:2px;">Vincula dominios o subrutas (ej. /files/database) a puertos de tu VPS con SSL</p>
        </div>
        <button class="stat-btn" id="btnRefreshDomains"><i class="fas fa-sync-alt"></i> Recargar</button>
      </div>

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
              <span>Usa <b>Nube Gris (DNS Only)</b> para emitir el SSL con Certbot. Una vez emitido el certificado, puedes reactivar la nube naranja si lo deseas.</span>
            </div>
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">2. Vincular Subrutas a Puertos</b>
              <span>Puedes crear una subruta como <code>/files/database</code> conectada a cualquier puerto interno (ej: <code>8080</code>). Nginx redirige el tráfico manteniendo el mismo dominio y certificado SSL.</span>
            </div>
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">3. Puertos 80 y 443 en el Firewall</b>
              <span>Asegura que los puertos web estén abiertos en el VPS ejecutando:
                <br><code>ufw allow 80/tcp && ufw allow 443/tcp</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-box" style="border:1.5px dashed var(--primary); background:rgba(37,99,235,0.02); margin-bottom:20px;">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Vincular Nuevo Dominio (Raíz /)</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label class="param-label">Dominio o Subdominio</label>
            <input type="text" id="newDomainName" class="param-input" placeholder="ej. dash.ryuzei.xyz o midominio.com" />
          </div>
          <div>
            <label class="param-label">Puerto Destino en VPS</label>
            <input type="number" id="newDomainPort" class="param-input" value="3000" placeholder="3000" />
          </div>
          <div>
            <label class="param-label">Correo para Certbot SSL</label>
            <input type="email" id="newDomainEmail" class="param-input" placeholder="admin@tudominio.com" />
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <input type="checkbox" id="autoSslCheck" checked style="width:18px; height:18px; cursor:pointer;" />
          <label for="autoSslCheck" style="font-size:0.84rem; font-weight:700; cursor:pointer;">Generar Certificado SSL (HTTPS) con Certbot automáticamente</label>
        </div>

        <button class="btn-full" id="btnCreateDomainProxy" style="width:auto; padding:10px 22px;">
          <i class="fas fa-plus"></i> Vincular Dominio & Configurar Nginx
        </button>
      </div>

      <div class="panel-box" style="border:1.5px dashed var(--price-color); background:rgba(245,158,11,0.02); margin-bottom:20px;">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;"><i class="fas fa-link" style="color:var(--price-color);"></i> Vincular Subruta a un Puerto</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label class="param-label">Dominio Base</label>
            <select id="subRouteDomainSelect" class="param-input" style="cursor:pointer;"></select>
          </div>
          <div>
            <label class="param-label">Subruta (Ruta URL)</label>
            <input type="text" id="subRoutePathInput" class="param-input" placeholder="ej. /files/database o /api2" />
          </div>
          <div>
            <label class="param-label">Puerto Destino en VPS</label>
            <input type="number" id="subRoutePortInput" class="param-input" placeholder="ej. 8080 o 5000" />
          </div>
        </div>

        <button class="btn-full" id="btnAddSubRouteBtn" style="width:auto; padding:10px 22px; background:var(--price-color); color:#000;">
          <i class="fas fa-network-wired"></i> Conectar Subruta a Puerto
        </button>
      </div>

      <div class="panel-box">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Dominios & Subrutas Configurados</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>
  `;

  const btnRefresh = document.getElementById('btnRefreshDomains');
  const btnCreate = document.getElementById('btnCreateDomainProxy');
  const btnAddRoute = document.getElementById('btnAddSubRouteBtn');
  const guideHeader = document.getElementById('toggleDnsGuideHeader');
  const guideBody = document.getElementById('dnsGuideBody');
  const chevron = document.getElementById('dnsGuideChevron');

  if (guideHeader && guideBody && chevron) {
    guideHeader.onclick = () => {
      const isClosed = guideBody.style.display === 'none';
      guideBody.style.display = isClosed ? 'block' : 'none';
      chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
    };
  }

  if (btnRefresh) btnRefresh.onclick = loadDomainList;
  if (btnCreate) btnCreate.onclick = handleCreateDomain;
  if (btnAddRoute) btnAddRoute.onclick = handleAddSubRoute;

  loadDomainList();
}

async function loadDomainList() {
  const container = document.getElementById('domainsListContainer');
  const domainSelect = document.getElementById('subRouteDomainSelect');
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
      if (currentLoadedDomains.length === 0) {
        domainSelect.innerHTML = '<option value="">No hay dominios creados</option>';
      } else {
        let options = '';
        for (let i = 0; i < currentLoadedDomains.length; i++) {
          options += '<option value="' + currentLoadedDomains[i].domain + '">' + currentLoadedDomains[i].domain + '</option>';
        }
        domainSelect.innerHTML = options;
      }
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

      let subRoutesListHtml = '';
      if (d.subRoutes && d.subRoutes.length > 0) {
        let subItems = '';
        for (let j = 0; j < d.subRoutes.length; j++) {
          const r = d.subRoutes[j];
          subItems += `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
              <div>
                <code>https://${d.domain}${r.path}</code> &rarr; <b>Puerto ${r.targetPort}</b>
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
                Raíz <code>/</code> &rarr; <code>127.0.0.1:${d.targetPort}</code> &bull; Estado: ${d.enabled ? 'Activo' : 'Inactivo'}
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

async function handleCreateDomain() {
  const domain = document.getElementById('newDomainName').value.trim();
  const targetPort = document.getElementById('newDomainPort').value.trim() || 3000;
  const email = document.getElementById('newDomainEmail').value.trim();
  const autoSsl = document.getElementById('autoSslCheck').checked;
  const btn = document.getElementById('btnCreateDomainProxy');

  if (!domain) {
    window.showToast?.('Ingresa el nombre del dominio');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configurando Nginx...';
  window.showToast?.('Configurando Nginx...');

  try {
    const res = await fetch('/api/nginx/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, targetPort, email, autoSsl }),
    });

    const data = await res.json();
    if (data.success) {
      if (data.warning) {
        alert(data.warning);
      } else {
        window.showToast?.('Dominio configurado exitosamente ✰');
      }
      document.getElementById('newDomainName').value = '';
      loadDomainList();
    } else {
      alert('Error: ' + data.error);
    }
  } catch {
    window.showToast?.('Fallo de conexión al configurar Nginx');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Vincular Dominio & Configurar Nginx';
  }
}

async function handleAddSubRoute() {
  const domain = document.getElementById('subRouteDomainSelect').value;
  const routePath = document.getElementById('subRoutePathInput').value.trim();
  const targetPort = document.getElementById('subRoutePortInput').value.trim();
  const btn = document.getElementById('btnAddSubRouteBtn');

  if (!domain) {
    window.showToast?.('Primero debes vincular un dominio');
    return;
  }
  if (!routePath || !targetPort) {
    window.showToast?.('Ingresa la subruta y el puerto destino');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando ruta...';

  try {
    const res = await fetch('/api/nginx/add-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, routePath, targetPort }),
    });

    const data = await res.json();
    if (data.success) {
      window.showToast?.(`Ruta ${routePath} conectada al puerto ${targetPort} ✰`);
      document.getElementById('subRoutePathInput').value = '';
      document.getElementById('subRoutePortInput').value = '';
      loadDomainList();
    } else {
      alert(`Error al agregar subruta: ${data.error}`);
    }
  } catch {
    window.showToast?.('Error al conectar subruta');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-network-wired"></i> Conectar Subruta a Puerto';
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
