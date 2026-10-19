export function renderFTP(container) {
  container.innerHTML = `
    <div class="panel-box" style="max-width: 500px;">
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 14px;">Cliente FTP</h3>
      <div class="param-group"><label class="param-label">Host</label><input class="param-input" id="ftpHost" placeholder="ftp.servidor.com" /></div>
      <div class="param-group"><label class="param-label">Usuario</label><input class="param-input" id="ftpUser" placeholder="ftpuser" /></div>
      <div class="param-group"><label class="param-label">Contraseña</label><input class="param-input" type="password" id="ftpPass" /></div>
      <button class="btn-full" id="btnFtpConnect">Conectar</button>
    </div>
  `;
}
