export async function renderFiles(container, currentPath = '') {
  container.innerHTML = `
    <div class="panel-box">
      <div style="margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
        <input type="text" id="filePath" class="param-input" value="${currentPath}" style="flex: 1; min-width: 220px;" placeholder="/directorio"/>
        <button id="btnLoad" class="stat-btn"><i class="fas fa-search"></i> Explorar</button>
        <button id="btnNewFolder" class="stat-btn"><i class="fas fa-folder-plus"></i> + Carpeta</button>
      </div>
      <div id="fileList">Cargando directorio...</div>
    </div>
  `;

  async function load(p) {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(p)}`);
    const data = await res.json();
    const list = document.getElementById('fileList');
    list.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      list.innerHTML = '<p style="color:var(--text-gray); padding:10px;">Directorio vacío</p>';
      return;
    }

    data.files.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <i class="${f.isDirectory ? 'fas fa-folder' : 'fas fa-file-code'}" style="color:${f.isDirectory ? 'var(--primary)' : 'var(--text-gray)'}"></i>
          <span>${f.name}</span>
        </div>
        <span style="font-size:0.75rem; color:var(--text-gray);">${f.isDirectory ? 'Carpeta' : `${f.size} B`}</span>
      `;
      row.onclick = () => {
        if (f.isDirectory) {
          renderFiles(container, f.path);
        } else {
          window.navigate('editor');
          setTimeout(() => {
            const pathInput = document.getElementById('editorFilePath');
            if (pathInput) {
              pathInput.value = f.path;
              document.getElementById('btnEditorLoad')?.click();
            }
          }, 150);
        }
      };
      list.appendChild(row);
    });
  }

  document.getElementById('btnLoad').onclick = () => {
    load(document.getElementById('filePath').value);
  };

  load(currentPath);
}
