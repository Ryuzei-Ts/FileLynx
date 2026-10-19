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

      <div class="panel-box" style="border:1px dashed var(--primary); background:rgba(37,99,235,0.03); margin-bottom:20px;">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Vincular Nuevo Dominio</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
          <div>
            <label class="param-label">Nombre de Dominio</label>
            <input type="text" id="newDomainName" class="param-input" placeholder="ej. midominio.com" />
          </div>
          <div>
            <label class="param-label">Puerto Destino en VPS</label>
            <input type="number" id="newDomainPort" class="param-input" value="3000" placeholder="3000" />
          </div>
          <div>
            <label class="param-label">Correo para Certbot SSL (Let's Encrypt)</label>
            <input type="email" id="newDomainEmail" class="param-input" placeholder="admin@midominio.com" />
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <input type="checkbox" id="autoSslCheck" checked style="width:18px; height:18px; cursor:pointer;" />
          <label for="autoSslCheck" style="font-size:0.84rem; font-weight:700; cursor:pointer;">Generar Certificado SSL (HTTPS) automáticamente con Certbot</label>
        </div>

        <button class="btn-full" id="btnCreateDomainProxy" style="width:auto; padding:10px 22px;">
          <i class="fas fa-plus"></i> Vincular Dominio & Configurar Nginx
        </button>
      </div>

      <div class="panel-box">
        <h4 style="font-size:1rem; font-weight:800; margin-bottom:12px;">Dominios Configurados en Nginx</h4>
        <div id="domainsListContainer">Cargando dominios...</div>
      </div>
    </div>
  `;

  document.getElementById('btnRefreshDomains').onclick = loadDomainList;
  document.getElementById('btnCreateDomainProxy').onclick = handleCreateDomain;

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
          <p style="font-size:0.8rem; margin-top:4px;">Instálalo ejecutando en tu terminal: <code>apt-get install -y nginx certbot python3-certbot-nginx</code></p>
        </div>
      `;
      return;
    }

    if (!data.domains || data.domains.length === 0) {
      container.innerHTML = '<p style="color:var(--text-gray); padding:10px;">No hay dominios vinculados aún en sites-available.</p>';
      return;
    }

    container.innerHTML = data.domains.map((d) => `
      <div class="file-row" style="cursor:default;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <b style="font-size:0.95rem;">${d.domain}</b>
            <span style="font-size:0.7rem; background:${d.hasSsl ? '#10b981' : '#64748b'}; color:#fff; padding:2px 6px; border-radius:4px; font-weight:800;">
              ${d.hasSsl ? 'SSL HTTPS' : 'HTTP'}
            </span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-gray); margin-top:4px;">
            Proxy a: <code>127.0.0.1:${d.targetPort}</code> &bull; Estado: ${d.enabled ? 'Activo' : 'Inactivo'}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          ${!d.hasSsl ? `<button class="stat-btn" onclick="issueSslForDomain('${d.domain}')"><i class="fas fa-lock"></i> Activar SSL</button>` : ''}
          <button class="stat-btn" style="color:#ef4444;" onclick="deleteDomainConfig('${d.domain}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } catch (err: any) {
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
    alert('Ingresa el nombre del dominio');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Configurando Nginx...';
  window.showToast?.('Configurando Nginx y Certbot en el servidor...');

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
        window.showToast?.('Dominio vinculado exitosamente ✰');
      }
      document.getElementById('newDomainName').value = '';
      loadDomainList();
    } else {
      alert(`Error al vincular: ${data.error}`);
    }
  } catch {
    alert('Fallo de conexión al configurar Nginx');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Vincular Dominio & Configurar Nginx';
  }
}

window.issueSslForDomain = async function (domain) {
  const email = prompt('Correo para Certbot Let\'s Encrypt:', 'admin@' + domain);
  if (!email) return;

  window.showToast?.('Generando certificado SSL con Certbot...');
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
      alert(`Fallo en Certbot: ${d.error}`);
    }
  } catch {
    alert('Error al generar certificado SSL');
  }
};

window.deleteDomainConfig = async function (domain) {
  if (!confirm(`¿Eliminar la configuración de Nginx para ${domain}?`)) return;

  try {
    await fetch(`/api/nginx/delete?domain=${encodeURIComponent(domain)}`, { method: 'DELETE' });
    window.showToast?.('Dominio eliminado de Nginx');
    loadDomainList();
  } catch {
    alert('Error al eliminar dominio');
  }
};
