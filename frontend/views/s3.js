export function renderS3(container) {
  container.innerHTML = `
    <h3>Explorador AWS S3</h3>
    <div style="display: grid; gap: 8px; max-width: 400px; margin-top: 12px;">
      <input id="s3Bucket" placeholder="Nombre del bucket" />
      <input id="s3Region" placeholder="Región (ej. us-east-1)" value="us-east-1" />
      <input id="s3Key" placeholder="Access Key ID" />
      <input id="s3Secret" type="password" placeholder="Secret Access Key" />
      <button id="btnS3List">Listar Objetos</button>
    </div>
    <div id="s3Results" style="margin-top: 20px;"></div>
  `;
}
