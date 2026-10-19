let activeSelectedFile = null;
let currentDirectory = '';

export async function renderFiles(container, initialPath = '') {
  currentDirectory = initialPath;
  activeSelectedFile = null;
  updateContextButtonState();

  container.innerHTML = `
    <!-- Barra de progreso para cargas/descargas -->
    <div class="progress-card" id="taskProgressBar">
      <div class="progress-header">
        <h4 style="font-size:0.85rem; font-weight:800;" id="progTitle">Operación en curso</h4>
        <i class="fas fa-spinner fa-spin text-primary"></i>
      </div>
      <div class="progress-body">
        <p style="font-size:0.75rem; color:var(--text-gray); margin-bottom:6px;" id="progLabel">Procesando...</p>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" id="progFill" style="width:0%;"></div>
        </div>
      </div>
    </div>

    <!-- Inputs ocultos para subida de archivos y carpetas -->
    <input class="u-input" type="file" id="fileUploadInput" multiple style="display:none;" />
    <input class="u-input" type="file" id="folderUploadInput" webkitdirectory directory multiple style="display:none;" />

    <!-- Panel de Exploración -->
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; flex:1; min-width:240px;">
          <input type="text" id="dirInput" class="param-input" value="${currentDirectory}" placeholder="/ruta"/>
          <button class="stat-btn" id="btnGo"><i class="fas fa-level-up-alt"></i> Ir</button>
        </div>
        
        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <button class="stat-btn" id="btnNewFile"><i class="fas fa-file-plus"></i> + Archivo</button>
          <button class="stat-btn" id="btnNewDir"><i class="fas fa-folder-plus"></i> + Carpeta</button>
          
          <!-- Botón Importar con menú flotante -->
          <div class="import-dropdown-wrapper">
            <button class="stat-btn" id="btnImportMenu" style="background:var(--primary); color:#ffffff; border-color:var(--primary);">
              <i class="fas fa-cloud-upload-alt"></i> Importar <i class="fas fa-chevron-down" style="font-size:0.65rem; margin-left:4px;"></i>
            </button>
            <div class="import-floating-menu" id="importFloatingMenu">
              <div class="menu-item" onclick="triggerImportOption('files')">
                <i class="fas fa-file-upload text-primary"></i> Subir Archivos
              </div>
              <div class="menu-item" onclick="triggerImportOption('folder')">
                <i class="fas fa-folder-upload" style="color:var(--price-color);"></i> Subir Carpeta
              </div>
              <div class="menu-item" onclick="triggerImportOption('github')">
                <i class="fab fa-github"></i> Importar GitHub
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="fileEntriesList">Cargando elementos...</div>
    </div>
  `;

  document.getElementById('btnGo').onclick = () => loadDir(document.getElementById('dirInput').value);
  document.getElementById('btnNewFile').onclick = createPromptFile;
  document.getElementById('btnNewDir').onclick = createPromptFolder;

  // Toggle del menú desplegable Importar
  const importBtn = document.getElementById('btnImportMenu');
  const importMenu = document.getElementById('importFloatingMenu');
  importBtn.onclick = (e) => {
    e.stopPropagation();
    importMenu.classList.toggle('open');
  };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.import-dropdown-wrapper')) {
      importMenu?.classList.remove('open');
    }
  });

  document.getElementById('fileUploadInput').onchange = (e) => handleUpload(e.target.files);
  document.getElementById('folderUploadInput').onchange = (e) => handleUpload(e.target.files);

  loadDir(currentDirectory);
}

window.triggerImportOption = function (type) {
  document.getElementById('importFloatingMenu')?.classList.remove('open');
  if (type === 'files') {
    document.getElementById('fileUploadInput').click();
  } else if (type === 'folder') {
    document.getElementById('folderUploadInput').click();
  } else if (type === 'github') {
    openGithubModal();
  }
};

async function loadDir(dirPath) {
  currentDirectory = dirPath;
  activeSelectedFile = null;
  updateContextButtonState();

  const listContainer = document.getElementById('fileEntriesList');
  listContainer.innerHTML = '<p style="padding:10px; color:var(--text-gray);">Consultando VPS...</p>';

  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(dirPath)}`);
    const data = await res.json();
    listContainer.innerHTML = '';

    if (!data.files || data.files.length === 0) {
      listContainer.innerHTML = '<p style="padding:10px; color:var(--text-gray);">Directorio vacío</p>';
      return;
    }

    data.files.forEach((file) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <i class="${file.isDirectory ? 'fas fa-folder text-primary' : 'fas fa-file'}" style="color:${file.isDirectory ? '#2563eb' : '#64748b'}"></i>
          <span style="font-weight:700;">${file.name}</span>
        </div>
        <span style="font-size:0.75rem; color:var(--text-gray);">${file.isDirectory ? 'Directorio' : `${file.size} B`}</span>
      `;

      row.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.file-row').forEach((r) => r.classList.remove('selected'));
        row.classList.add('selected');
        activeSelectedFile = file;
        updateContextButtonState();
      };

      row.ondblclick = () => {
        if (file.isDirectory) {
          renderFiles(document.getElementById('view-container'), file.path);
        } else {
          openEditor(file.path);
        }
      };

      listContainer.appendChild(row);
    });
  } catch (err) {
    listContainer.innerHTML = `<p style="color:#ef4444;">Error: ${err.message}</p>`;
  }
}

function updateContextButtonState() {
  const btn = document.getElementById('fileContextTrigger');
  const menu = document.getElementById('fileContextMenu');
  if (btn) {
    if (activeSelectedFile) {
      btn.classList.add('active');
      btn.innerHTML = `<i class="fas fa-ellipsis-v"></i> ${activeSelectedFile.name}`;
    } else {
      btn.classList.remove('active');
      if (menu) menu.classList.remove('open');
    }
  }
}

window.toggleFileContextMenu = function () {
  const menu = document.getElementById('fileContextMenu');
  if (menu) menu.classList.toggle('open');
};

window.triggerFileAction = async function (action) {
  const menu = document.getElementById('fileContextMenu');
  if (menu) menu.classList.remove('open');
  if (!activeSelectedFile) return;

  const p = activeSelectedFile.path;

  if (action === 'rename') {
    const newName = prompt('Nuevo nombre:', activeSelectedFile.name);
    if (!newName || newName === activeSelectedFile.name) return;
    const dir = p.includes('/') ? p.substring(0, p.lastIndexOf('/')) : '';
    const newPath = dir ? `${dir}/${newName}` : newName;
    await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath: p, newPath }),
    });
    window.showToast?.('Renombrado exitosamente');
    loadDir(currentDirectory);
  } else if (action === 'edit') {
    if (activeSelectedFile.isDirectory) {
      alert('Solo se pueden editar archivos de texto');
      return;
    }
    openEditor(p);
  } else if (action === 'download') {
    window.location.href = `/api/files/download?path=${encodeURIComponent(p)}`;
  } else if (action === 'delete') {
    if (confirm(`¿Eliminar definitivamente "${activeSelectedFile.name}"?`)) {
      await fetch(`/api/files/delete?path=${encodeURIComponent(p)}`, { method: 'DELETE' });
      window.showToast?.('Elemento eliminado');
      loadDir(currentDirectory);
    }
  }
};

async function openEditor(filePath) {
  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    document.getElementById('modalEditorTitle').innerText = `Editando: ${filePath}`;
    document.getElementById('modalEditorContent').value = data.content || '';
    document.getElementById('modalEditor').classList.add('active');

    document.getElementById('btnSaveEditor').onclick = async () => {
      const content = document.getElementById('modalEditorContent').value;
      await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });
      window.showToast?.('Guardado exitosamente');
      document.getElementById('modalEditor').classList.remove('active');
    };
  } catch {
    alert('No se pudo leer el archivo seleccionado');
  }
}

async function handleUpload(files) {
  if (!files || files.length === 0) return;
  const bar = document.getElementById('taskProgressBar');
  const fill = document.getElementById('progFill');
  const label = document.getElementById('progLabel');
  bar.classList.add('active');
  fill.style.width = '20%';
  label.innerText = `Subiendo ${files.length} archivo(s)...`;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  try {
    fill.style.width = '65%';
    await fetch(`/api/upload?path=${encodeURIComponent(currentDirectory)}`, {
      method: 'POST',
      body: formData,
    });
    fill.style.width = '100%';
    label.innerText = 'Subida finalizada con éxito';
    window.showToast?.('Archivos subidos correctamente');
    setTimeout(() => bar.classList.remove('active'), 1500);
    loadDir(currentDirectory);
  } catch {
    label.innerText = 'Error al subir';
    setTimeout(() => bar.classList.remove('active'), 2500);
  }
}

async function createPromptFile() {
  const name = prompt('Nombre del nuevo archivo (ej. index.js, config.json):');
  if (!name) return;
  const full = currentDirectory ? `${currentDirectory}/${name}` : name;
  await fetch('/api/files/create-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: full, content: '' }),
  });
  window.showToast?.('Archivo creado');
  loadDir(currentDirectory);
}

async function createPromptFolder() {
  const name = prompt('Nombre de la nueva carpeta:');
  if (!name) return;
  const full = currentDirectory ? `${currentDirectory}/${name}` : name;
  await fetch('/api/files/folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: full }),
  });
  window.showToast?.('Carpeta creada');
  loadDir(currentDirectory);
}

window.openGithubModal = function () {
  document.getElementById('modalGithub').classList.add('active');
};

document.getElementById('btnConfirmGithub').onclick = async () => {
  const repoUrl = document.getElementById('ghRepoUrl').value.trim();
  const branch = document.getElementById('ghBranch').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  if (!repoUrl) return alert('Ingresa la URL del repositorio');

  document.getElementById('modalGithub').classList.remove('active');
  window.showToast?.('Iniciando descarga desde GitHub...');

  try {
    const res = await fetch('/api/files/github-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, targetPath: currentDirectory, branch, token }),
    });
    const d = await res.json();
    if (d.success) {
      window.showToast?.('Repositorio importado exitosamente como .zip');
      loadDir(currentDirectory);
    } else {
      alert(`Error de descarga: ${d.error}`);
    }
  } catch {
    alert('Fallo de conexión al importar GitHub');
  }
};
