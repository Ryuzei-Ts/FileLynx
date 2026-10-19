let currentDirectory = '';
let activeTargetFile = null;

function formatBytes(bytes, decimals = 2) {
  const num = Number(bytes);
  if (!num || isNaN(num) || num <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(num) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((num / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

function showAppDialog(title, message, isError = false) {
  const modal = document.getElementById('modalAppAlert');
  if (!modal) return;
  document.getElementById('modalAlertTitle').innerText = title;
  document.getElementById('modalAlertMessage').innerText = message;
  const icon = document.getElementById('modalAlertIcon');
  if (isError) {
    icon.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#ef4444;"></i>';
  } else {
    icon.innerHTML = '<i class="fas fa-info-circle" style="color:var(--primary);"></i>';
  }
  modal.classList.add('active');
}

function updateProgress(title, msg, pct) {
  const card = document.getElementById('cybercomProgress');
  if (!card) return;
  card.classList.add('active');
  const tEl = document.getElementById('cybercomTitle');
  const mEl = document.getElementById('cybercomMsg');
  const bEl = document.getElementById('cybercomBar');
  const pEl = document.getElementById('cybercomPct');
  if (tEl) tEl.innerText = title;
  if (mEl) mEl.innerText = msg;
  if (bEl) bEl.style.width = `${pct}%`;
  if (pEl) pEl.innerText = `${pct}% Complete`;
  if (pct >= 100) {
    setTimeout(() => card.classList.remove('active'), 1800);
  }
}

export async function renderFiles(container, initialPath = '') {
  currentDirectory = initialPath;

  container.innerHTML = `
    <div class="u-progress-card" id="cybercomProgress">
      <div class="u-progress-header">
        <h3 class="u-progress-title" id="cybercomTitle">Progress</h3>
        <svg stroke-width="2" stroke="currentColor" viewBox="0 0 24 24" fill="none" style="width:22px; height:22px; color:var(--text-dark);" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linejoin="round" stroke-linecap="round"></path>
        </svg>
      </div>
      <div class="u-progress-body">
        <p class="u-progress-msg" id="cybercomMsg">File: processing...</p>
        <div class="u-progress-track">
          <div class="u-progress-bar" id="cybercomBar"></div>
        </div>
        <div class="u-progress-footer">
          <span class="u-progress-pct" id="cybercomPct">0% Complete</span>
          <button class="u-progress-details-btn" onclick="window.showToast?.('Proceso en background')">Details</button>
        </div>
      </div>
    </div>

    <input class="u-input" type="file" id="fileUploadInput" multiple style="display:none;" />
    <input class="u-input" type="file" id="folderUploadInput" webkitdirectory directory multiple style="display:none;" />

    <div class="modal" id="modalImportCenter">
      <div class="modal-content" style="max-width:380px; text-align:center;">
        <div style="display:flex; justify-content:flex-end; margin-bottom:4px;">
          <button class="stat-btn" onclick="document.getElementById('modalImportCenter').classList.remove('active')">✕</button>
        </div>
        <div class="u-icon" style="margin:0 auto 14px;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <path d="M5 16V18C5 19.1 5.9 20 7 20H17C18.1 20 19 19.1 19 18V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
          </svg>
        </div>
        <div class="u-title">Subir Archivos y Carpetas</div>
        <div class="u-text">
          Sube recursos directamente a la VPS o descarga código desde GitHub.
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
          <button class="btn-full" onclick="pickImport('files')">+ Subir Archivos</button>
          <button class="btn-full" style="background:var(--bg-params); color:var(--text-dark); border:1px solid var(--border);" onclick="pickImport('folder')">+ Subir Carpeta</button>
          <button class="btn-full" style="background:var(--bg-params); color:var(--text-dark); border:1px solid var(--border);" onclick="pickImport('github')"><i class="fab fa-github"></i> Importar GitHub</button>
        </div>
      </div>
    </div>

    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
        <div style="display:flex; gap:8px; flex:1; min-width:240px;">
          <input type="text" id="dirInput" class="param-input" value="${currentDirectory}" placeholder="/ruta" readonly/>
          <button class="stat-btn" id="btnBackDir"><i class="fas fa-arrow-left"></i> Volver</button>
        </div>

        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
          <button class="stat-btn" id="btnNewFile"><i class="fas fa-file-plus"></i> + Archivo</button>
          <button class="stat-btn" id="btnNewDir"><i class="fas fa-folder-plus"></i> + Carpeta</button>
          <button class="stat-btn" id="btnOpenImport" style="background:var(--primary); color:#ffffff; border-color:var(--primary);">
            <i class="fas fa-cloud-upload-alt"></i> Importar
          </button>
        </div>
      </div>

      <div id="fileEntriesList">Cargando elementos...</div>
    </div>
  `;

  document.getElementById('btnBackDir').onclick = () => {
    if (!currentDirectory || currentDirectory === '/' || currentDirectory === '.') {
      loadDir('');
      return;
    }
    const clean = currentDirectory.replace(/\/+$/, '');
    const lastSlash = clean.lastIndexOf('/');
    const parentPath = lastSlash !== -1 ? clean.substring(0, lastSlash) : '';
    loadDir(parentPath);
  };

  document.getElementById('btnNewFile').onclick = () => {
    document.getElementById('newFileNameInput').value = '';
    document.getElementById('modalNewFile').classList.add('active');
  };

  document.getElementById('btnConfirmNewFile').onclick = async () => {
    const name = document.getElementById('newFileNameInput').value.trim();
    if (!name) return;
    document.getElementById('modalNewFile').classList.remove('active');
    const full = currentDirectory ? `${currentDirectory}/${name}` : name;
    await fetch('/api/files/create-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: full, content: '' }),
    });
    window.showToast?.('Archivo creado exitosamente ✰');
    loadDir(currentDirectory);
  };

  document.getElementById('btnNewDir').onclick = () => {
    document.getElementById('newFolderNameInput').value = '';
    document.getElementById('modalNewFolder').classList.add('active');
  };

  document.getElementById('btnConfirmNewFolder').onclick = async () => {
    const name = document.getElementById('newFolderNameInput').value.trim();
    if (!name) return;
    document.getElementById('modalNewFolder').classList.remove('active');
    const full = currentDirectory ? `${currentDirectory}/${name}` : name;
    await fetch('/api/files/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: full }),
    });
    window.showToast?.('Carpeta creada exitosamente ꕤ');
    loadDir(currentDirectory);
  };

  document.getElementById('btnOpenImport').onclick = () => {
    document.getElementById('modalImportCenter').classList.add('active');
  };

  document.getElementById('fileUploadInput').onchange = (e) => handleUpload(e.target.files);
  document.getElementById('folderUploadInput').onchange = (e) => handleUpload(e.target.files);

  loadDir(currentDirectory);
}

window.pickImport = function (type) {
  document.getElementById('modalImportCenter').classList.remove('active');
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
  const dirInput = document.getElementById('dirInput');
  if (dirInput) dirInput.value = currentDirectory;

  if (window.location.pathname.startsWith('/files')) {
    const urlPath = currentDirectory ? `/files/${currentDirectory}` : '/files';
    if (window.location.pathname !== urlPath) {
      window.history.pushState({ view: 'files', dir: currentDirectory }, '', urlPath);
    }
  }

  const listContainer = document.getElementById('fileEntriesList');
  if (!listContainer) return;
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
      const sizeText = file.isDirectory ? 'Directorio' : formatBytes(file.size);

      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
          <i class="${file.isDirectory ? 'fas fa-folder text-primary' : (file.isArchive ? 'fas fa-file-archive' : 'fas fa-file')}" style="color:${file.isDirectory ? '#2563eb' : (file.isArchive ? '#f59e0b' : '#64748b')}"></i>
          <span style="font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</span>
          ${file.hasGit ? '<span style="font-size:0.65rem; background:rgba(37,99,235,0.15); color:var(--primary); padding:2px 6px; border-radius:4px; font-weight:800;">GIT</span>' : ''}
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:0.75rem; color:var(--text-gray);">${sizeText}</span>
          <button class="stat-btn btn-row-menu" style="padding:4px 8px;" title="Opciones">
            <i class="fas fa-ellipsis-h"></i>
          </button>
        </div>
      `;

      row.onclick = () => {
        if (file.isDirectory) {
          loadDir(file.path);
        } else {
          openEditor(file.path);
        }
      };

      const menuBtn = row.querySelector('.btn-row-menu');
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        openActionMenuForFile(file);
      };

      listContainer.appendChild(row);
    });
  } catch (err) {
    listContainer.innerHTML = `<p style="color:#ef4444;">Error: ${err.message}</p>`;
  }
}

function openActionMenuForFile(file) {
  activeTargetFile = file;
  const actions = [
    { label: 'Descargar', icon: 'fa-download', action: 'download' },
    { label: 'Comprimir (.zip)', icon: 'fa-file-archive', action: 'compress' },
    { label: 'Descomprimir', icon: 'fa-box-open', action: 'extract', hide: !file.isArchive },
    { label: 'Renombrar', icon: 'fa-pencil-alt', action: 'rename' },
    { label: 'Mover', icon: 'fa-arrows-alt', action: 'move' },
    { label: 'Git Pull', icon: 'fa-sync-alt', action: 'git-pull', hide: !file.hasGit },
    { label: 'Editar', icon: 'fa-edit', action: 'edit', hide: file.isDirectory },
    { label: 'Eliminar', icon: 'fa-trash', action: 'delete', danger: true },
  ];

  const existingMenu = document.getElementById('floatingRowActionMenu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'floatingRowActionMenu';
  menu.className = 'card-context-menu open';
  menu.style.position = 'fixed';
  menu.style.top = '50%';
  menu.style.left = '50%';
  menu.style.transform = 'translate(-50%, -50%)';
  menu.style.zIndex = '3000';
  menu.style.width = '240px';

  let listHtml = '<ul class="list">';
  actions.forEach((a) => {
    if (a.hide) return;
    listHtml += `
      <li class="element ${a.danger ? 'delete' : ''}" onclick="executeRowAction('${a.action}')">
        <i class="fas ${a.icon}" style="width:18px;"></i>
        <p class="label">${a.label}</p>
      </li>
    `;
  });
  listHtml += '</ul>';
  listHtml += '<div style="padding:6px 8px;"><button class="stat-btn" style="width:100%; justify-content:center;" onclick="document.getElementById(\'floatingRowActionMenu\').remove()">Cerrar</button></div>';

  menu.innerHTML = listHtml;
  document.body.appendChild(menu);
}

window.executeRowAction = async function (action) {
  const menu = document.getElementById('floatingRowActionMenu');
  if (menu) menu.remove();
  if (!activeTargetFile) return;

  const file = activeTargetFile;
  const p = file.path;

  if (action === 'download') {
    updateProgress('Downloading', `File: ${file.name}`, 40);
    window.location.href = `/api/files/download?path=${encodeURIComponent(p)}`;
    setTimeout(() => updateProgress('Downloaded', `${file.name} listo`, 100), 1200);
  } else if (action === 'compress') {
    updateProgress('Compressing', `Archiving: ${file.name}`, 35);
    try {
      const res = await fetch('/api/files/compress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: p, format: 'zip' }),
      });
      const data = await res.json();
      if (data.success) {
        updateProgress('Compressed', `Archivo: ${data.archiveName}`, 100);
        window.showToast?.('Comprimido exitosamente ✰');
        loadDir(currentDirectory);
      } else {
        showAppDialog('Error al Comprimir', data.error, true);
      }
    } catch {
      showAppDialog('Error', 'Fallo al comprimir el archivo', true);
    }
  } else if (action === 'extract') {
    updateProgress('Extracting', `File: ${file.name} extracted..`, 50);
    try {
      const res = await fetch('/api/files/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivePath: p }),
      });
      const data = await res.json();
      if (data.success) {
        updateProgress('Extracted', `${file.name} completado..`, 100);
        window.showToast?.('Descomprimido exitosamente ꕤ');
        loadDir(currentDirectory);
      } else {
        showAppDialog('Error al Descomprimir', data.error, true);
      }
    } catch {
      showAppDialog('Error', 'Fallo al descomprimir el archivo', true);
    }
  } else if (action === 'rename') {
    document.getElementById('renameOldNameInput').value = file.name;
    document.getElementById('renameNewNameInput').value = file.name;
    document.getElementById('modalRename').classList.add('active');

    document.getElementById('btnConfirmRename').onclick = async () => {
      const newName = document.getElementById('renameNewNameInput').value.trim();
      if (!newName || newName === file.name) {
        document.getElementById('modalRename').classList.remove('active');
        return;
      }
      document.getElementById('modalRename').classList.remove('active');
      const dir = p.includes('/') ? p.substring(0, p.lastIndexOf('/')) : '';
      const newPath = dir ? `${dir}/${newName}` : newName;
      await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: p, newPath }),
      });
      window.showToast?.('Renombrado exitosamente ✰');
      loadDir(currentDirectory);
    };
  } else if (action === 'move') {
    document.getElementById('moveSourcePathInput').value = p;
    document.getElementById('moveDestPathInput').value = '';
    document.getElementById('modalMove').classList.add('active');

    document.getElementById('btnConfirmMove').onclick = async () => {
      const dest = document.getElementById('moveDestPathInput').value.trim();
      document.getElementById('modalMove').classList.remove('active');
      const res = await fetch('/api/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourcePath: p, destinationDir: dest }),
      });
      const data = await res.json();
      if (data.success) {
        window.showToast?.('Elemento movido exitosamente ꕤ');
        loadDir(currentDirectory);
      } else {
        showAppDialog('Error al Mover', data.error || 'No se pudo mover el elemento', true);
      }
    };
  } else if (action === 'git-pull') {
    const folder = file.isDirectory ? file.path : currentDirectory;
    let savedToken = localStorage.getItem('filelynx_gh_token') || '';

    updateProgress('Git Pull', `Actualizando ${file.name}...`, 25);

    try {
      const infoRes = await fetch(`/api/files/git-info?path=${encodeURIComponent(folder)}`);
      const gitInfo = await infoRes.json();
      const remoteUrl = gitInfo.remoteUrl || '';
      const branch = gitInfo.branch || 'main';

      const pullRes = await fetch('/api/files/git-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folder, repoUrl: remoteUrl, token: savedToken || undefined, branch }),
      });
      const pullData = await pullRes.json();

      if (pullData.success) {
        updateProgress('Git Pull', 'Carpeta actualizada exitosamente', 100);
        window.showToast?.('Git Pull exitoso ✰');
        loadDir(currentDirectory);
        return;
      }

      document.getElementById('cybercomProgress')?.classList.remove('active');

      document.getElementById('pullRepoUrl').value = remoteUrl;
      document.getElementById('pullBranch').value = branch;
      document.getElementById('pullToken').value = savedToken;
      document.getElementById('modalGitPull').classList.add('active');

      document.getElementById('btnConfirmGitPull').onclick = async () => {
        const newRepoUrl = document.getElementById('pullRepoUrl').value.trim();
        const newToken = document.getElementById('pullToken').value.trim();
        const newBranch = document.getElementById('pullBranch').value.trim() || 'main';

        document.getElementById('modalGitPull').classList.remove('active');

        if (newToken) {
          localStorage.setItem('filelynx_gh_token', newToken);
          savedToken = newToken;
        }

        updateProgress('Git Pull', `Descargando desde ${newRepoUrl || 'origin'}...`, 50);

        try {
          const res = await fetch('/api/files/git-pull', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: folder, repoUrl: newRepoUrl, token: newToken, branch: newBranch }),
          });
          const d = await res.json();
          if (d.success) {
            updateProgress('Git Pull', 'Carpeta actualizada exitosamente', 100);
            window.showToast?.('Git Pull realizado exitosamente ✰');
            loadDir(currentDirectory);
          } else {
            document.getElementById('cybercomProgress')?.classList.remove('active');
            const errorMsg = d.error === 'AUTH_REQUIRED'
              ? 'Autenticación requerida: El repositorio es privado o el token ingresado es incorrecto.'
              : (d.error || 'Error al hacer pull');
            showAppDialog('Fallo de Git Pull', errorMsg, true);
          }
        } catch {
          document.getElementById('cybercomProgress')?.classList.remove('active');
          showAppDialog('Error de Conexión', 'No se pudo comunicar con el servidor para hacer pull', true);
        }
      };
    } catch {
      document.getElementById('cybercomProgress')?.classList.remove('active');
      showAppDialog('Error de Red', 'Fallo al procesar git pull', true);
    }
  } else if (action === 'edit') {
    openEditor(p);
  } else if (action === 'delete') {
    document.getElementById('deleteItemPromptText').innerText = `¿Estás seguro de que deseas eliminar permanentemente "${file.name}"?`;
    document.getElementById('modalDeleteConfirm').classList.add('active');

    document.getElementById('btnConfirmDelete').onclick = async () => {
      document.getElementById('modalDeleteConfirm').classList.remove('active');
      await fetch(`/api/files/delete?path=${encodeURIComponent(p)}`, { method: 'DELETE' });
      window.showToast?.('Elemento eliminado ꕤ');
      loadDir(currentDirectory);
    };
  }
};

async function openEditor(filePath) {
  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    document.getElementById('modalEditorPath').value = filePath;
    document.getElementById('modalEditorContent').value = data.content || '';
    document.getElementById('modalEditor').classList.add('active');

    document.getElementById('btnSaveEditor').onclick = async () => {
      const content = document.getElementById('modalEditorContent').value;
      await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content }),
      });
      window.showToast?.('Guardado exitosamente ✰');
      document.getElementById('modalEditor').classList.remove('active');
    };
  } catch {
    showAppDialog('Error al Abrir', 'No se pudo leer el archivo seleccionado', true);
  }
}

async function handleUpload(files) {
  if (!files || files.length === 0) return;
  updateProgress('Uploading', `File: uploading ${files.length} items...`, 25);

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  try {
    updateProgress('Uploading', `Processing files...`, 65);
    await fetch(`/api/upload?path=${encodeURIComponent(currentDirectory)}`, {
      method: 'POST',
      body: formData,
    });
    updateProgress('Uploaded', `Completado exitosamente`, 100);
    window.showToast?.('Archivos subidos correctamente ꕤ');
    loadDir(currentDirectory);
  } catch {
    showAppDialog('Error', 'Fallo al subir archivos a la VPS', true);
  }
}

window.openGithubModal = function () {
  document.getElementById('modalGithub').classList.add('active');
};

document.getElementById('btnConfirmGithub').onclick = async () => {
  const repoUrl = document.getElementById('ghRepoUrl').value.trim();
  const branch = document.getElementById('ghBranch').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  if (!repoUrl) {
    showAppDialog('Campo Requerido', 'Ingresa la URL o el nombre del repositorio (usuario/repo)', true);
    return;
  }

  document.getElementById('modalGithub').classList.remove('active');
  updateProgress('Cloning', `Repository: ${repoUrl}`, 40);

  try {
    const res = await fetch('/api/files/github-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl, targetPath: currentDirectory, branch, token }),
    });
    const d = await res.json();
    if (d.success) {
      updateProgress('Cloned', `Repo: ${repoUrl} cloned`, 100);
      window.showToast?.('Repositorio importado exitosamente ✰');
      loadDir(currentDirectory);
    } else {
      document.getElementById('cybercomProgress')?.classList.remove('active');
      const errText = d.error === 'PRIVATE_REPO_AUTH_REQUIRED'
        ? 'Este repositorio es privado o requiere un Personal Access Token para clonar.'
        : (d.error || 'Verifica la URL, rama o el Token');
      showAppDialog('Fallo al Importar', errText, true);
    }
  } catch {
    document.getElementById('cybercomProgress')?.classList.remove('active');
    showAppDialog('Error de Red', 'Fallo de conexión al importar desde GitHub', true);
  }
};
