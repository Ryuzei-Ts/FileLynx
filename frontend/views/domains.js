export async function renderDomains(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <h3 style="font-size:1.25rem; font-weight:800;"><i class="fas fa-globe" style="color:var(--primary);"></i> Dominios & Proxy Nginx</h3>
          <p style="font-size:0.8rem; color:var(--text-gray); margin-top:2px;">Vincula dominios a puertos de tu VPS y crea certificados SSL automáticos</p>
        </div>
        <button class="stat-btn" id="btnRefreshDomains"><i class="fas fa-sync-alt"></i> Recargar</button>
      </div>

      <!-- Guía de Conexión DNS -->
      <div class="panel-box" style="background:var(--bg-params); border:1px solid var(--border); margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" id="toggleDnsGuideHeader">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fas fa-info-circle" style="color:var(--primary); font-size:1rem;"></i>
            <span style="font-weight:800; font-size:0.92rem;">Guía de Configuración DNS (Requerido para SSL)</span>
          </div>
          <i class="fas fa-chevron-down" id="dnsGuideChevron" style="font-size:0.8rem; color:var(--text-gray); transition:transform 0.2s;"></i>
        </div>

        <div id="dnsGuideBody" style="display:none; margin-top:14px; border-top:1px solid var(--border); padding-top:12px; font-size:0.82rem; line-height:1.6; color:var(--text-dark);">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px;">
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">1. Modo "Solo DNS" (Cloudflare / DNS Only)</b>
              <span>Si usas Cloudflare, cambia el estado del proxy de <b>Nube Naranja (Proxied)</b> a <b>Nube Gris (Solo DNS)</b> mientras emites el certificado. De lo contrario, Let's Encrypt no podrá verificar tu servidor.</span>
            </div>
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">2. Registro Tipo A en tu Proveedor</b>
              <span>Crea un registro <b>Tipo A</b>:
                <br>&bull; <b>Nombre:</b> <code>dash</code> (o <code>@</code> para dominio principal)
                <br>&bull; <b>Valor / IP:</b> <code>77.90.43.61</code> (la IP de tu VPS)
                <br>&bull; <b>TTL:</b> Automático o 5 minutos
              </span>
            </div>
            <div style="background:var(--bg-card); padding:12px; border-radius:10px; border:1px solid var(--border);">
              <b style="color:var(--primary); display:block; margin-bottom:4px;">3. Puertos 80 y 443 en el VPS</b>
              <span>Certbot necesita que el puerto HTTP (80) esté libre y abierto en el firewall. En tu terminal ejecuta:
                <br><code>ufw allow 80/tcp && ufw allow 443/tcp</code>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulario para Vincular Dominio -->
      <div class="panel-box" style="border:1.5px dashed var(--primary); background:rgba(37,99,235,0.02); margin-bottom:20px;">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Vincular Nuevo Dominio</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label class="param-label">Nombre de Dominio o Subdominio</label>
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

      <!-- Lista de Dominios -->
      <div class="panel-box">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Dominios Configurados en Nginx</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>
  `;

  const btnRefresh = document.getElementById('btnRefreshDomains');
  const btnCreate = document.getElementById('btnCreateDomainProxy');
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

  loadDomainList();
}

async function loadDomainList() {
  const container = document.getElementById('domainsListContainer');
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

    if (!data.domains || data.domains.length === 0) {
      container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">No hay dominios vinculados aún en sites-available.</p>';
      return;
    }

    let rowsHtml = '';
    for (let i = 0; i < data.domains.length; i++) {
      const d = data.domains[i];
      const sslBadge = d.hasSsl
        ? '<span style="font-size:0.7rem; background:#10b981; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">SSL HTTPS</span>'
        : '<span style="font-size:0.7rem; background:#64748b; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">HTTP</span>';

      const sslBtn = !d.hasSsl
        ? `<button class="stat-btn btn-issue-ssl" data-domain="${d.domain}"><i class="fas fa-lock"></i> Activar SSL</button>`
        : '';

      rowsHtml += `
        <div class="file-row" style="cursor:default;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <b style="font-size:0.95rem;">${d.domain}</b>
              ${sslBadge}
            </div>
            <div style="font-size:0.78rem; color:var(--text-gray); margin-top:4px;">
              Proxy a: <code>127.0.0.1:${d.targetPort}</code> &bull; Estado: ${d.enabled ? 'Activo' : 'Inactivo'}
            </div>
          </div>
          <div style="display:flex; gap:6px;">
            ${sslBtn}
            <button class="stat-btn btn-delete-domain" style="color:#ef4444;" data-domain="${d.domain}"><i class="fas fa-trash"></i></button>
          </div>
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
  } catch (err) {
    container.innerHTML = `<p style="color:#ef4444; padding:10px;">Error: ${err.message}</p>`;
  }
}

function parseCertbotError(rawMsg, domain) {
  if (rawMsg.includes('Some challenges have failed') || rawMsg.includes('Unauthorized')) {
    return `No se pudo verificar el dominio "${domain}".\n\nCausas probables:\n1. Si usas Cloudflare, debes desactivar el proxy (poner la nube en gris / DNS Only).\n2. El registro DNS Tipo A no apunta a la IP de esta VPS o no ha terminado de propagar.\n3. El puerto 80 del VPS está bloqueado en el firewall (ejecuta: ufw allow 80/tcp).`;
  }
  if (rawMsg.includes('plugin does not appear to be installed')) {
    return 'Falta el plugin de Nginx para Certbot. Ejecuta en tu terminal: apt-get install -y python3-certbot-nginx';
  }
  return rawMsg;
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
        const cleanWarning = parseCertbotError(data.warning, domain);
        alert(cleanWarning);
      } else {
        window.showToast?.('Dominio configurado exitosamente ✰');
      }
      document.getElementById('newDomainName').value = '';
      loadDomainList();
    } else {
      const cleanError = parseCertbotError(data.error || '', domain);
      alert('Error: ' + cleanError);
    }
  } catch {
    window.showToast?.('Fallo de conexión al configurar Nginx');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Vincular Dominio & Configurar Nginx';
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
      const cleanError = parseCertbotError(d.error || '', domain);
      alert(cleanError);
    }
  } catch {
    window.showToast?.('Error de red al generar certificado SSL');
  }
}

async function deleteDomainConfig(domain) {
  if (!confirm(`¿Eliminar la configuración de Nginx para ${domain}?`)) return;

  try {
    await fetch(`/api/nginx/delete?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' });
    window.showToast?.('Dominio eliminado de Nginx');
    loadDomainList();
  } catch {
    window.showToast?.('Error al eliminar dominio');
  }
}
