export function renderFTP(container) {
  container.innerHTML = `
    <h3>Conexión FTP</h3>
    <div style="display: grid; gap: 8px; max-width: 400px; margin-top: 12px;">
      <input id="ftpHost" placeholder="Host (ej. ftp.servidor.com)" />
      <input id="ftpUser" placeholder="Usuario" />
      <input id="ftpPass" type="password" placeholder="Contraseña" />
      <input id="ftpPort" placeholder="Puerto" value="21" />
      <button id="btnFtpConnect">Conectar y listar</button>
    </div>
    <div id="ftpResults" style="margin-top: 20px;"></div>
  `;
}
