export async function renderFiles(container, currentPath = '') {
  container.innerHTML = `
    <div style="margin-bottom: 12px; display: flex; gap: 8px;">
      <input type="text" id="filePath" value="${currentPath}" style="flex: 1;" placeholder="/directorio"/>
      <button id="btnLoad">Explorar</button>
      <button id="btnNewFolder">+ Carpeta</button>
    </div>
    <div id="fileList">Cargando...</div>
  `;

  async function load(p) {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(p)}`);
    const data = await res.json();
    const list = document.getElementById('fileList');
    list.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      list.innerHTML = '<p style="color:#888;">Directorio vacío</p>';
      return;
    }

    data.files.forEach(f => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.textContent = `${f.isDirectory ? '📁 ' : '📄 '} ${f.name}`;
      row.onclick = () => {
        if (f.isDirectory) {
          renderFiles(container, f.path);
        } else {
          alert(`Archivo: ${f.name} (${f.size} bytes)`);
        }
      };
      list.appendChild(row);
    });
  }

  document.getElementById('btnLoad').onclick = () => {
    const val = document.getElementById('filePath').value;
    load(val);
  };

  load(currentPath);
}
