export function renderS3(container) {
  container.innerHTML = `
    <div class="panel-box" style="max-width: 500px;">
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 14px;">Explorador AWS S3</h3>
      <div class="param-group"><label class="param-label">Bucket</label><input class="param-input" id="s3Bucket" /></div>
      <div class="param-group"><label class="param-label">Región</label><input class="param-input" id="s3Region" value="us-east-1" /></div>
      <div class="param-group"><label class="param-label">Access Key ID</label><input class="param-input" id="s3Key" /></div>
      <div class="param-group"><label class="param-label">Secret Access Key</label><input class="param-input" type="password" id="s3Secret" /></div>
      <button class="btn-full" id="btnS3List">Listar Objetos</button>
    </div>
  `;
}
