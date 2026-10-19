let currentNotebook = null;

export async function renderNotebooks(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <h3 style="font-size:1.1rem; font-weight:800;">Notebooks Interactivos</h3>
        <button class="btn-full" style="width:auto; padding:8px 16px;" id="btnNewNotebook">+ Crear Notebook</button>
      </div>
      <div id="notebooksIndex">Cargando notebooks...</div>
      <div id="activeNotebookArea" style="display:none; margin-top:20px;"></div>
    </div>
  `;

  document.getElementById('btnNewNotebook').onclick = () => {
    document.getElementById('nbTitleInput').value = '';
    document.getElementById('nbInitialCodeInput').value = 'console.log("Hola desde VPS!");';
    document.getElementById('modalNewNotebook').classList.add('active');
  };

  document.getElementById('btnConfirmNewNotebook').onclick = () => {
    const title = document.getElementById('nbTitleInput').value.trim() || 'Script de automatización';
    const initCode = document.getElementById('nbInitialCodeInput').value;
    document.getElementById('modalNewNotebook').classList.remove('active');
    openNotebook({ id: '', title, cells: [{ id: '1', type: 'code', content: initCode }] });
  };

  loadNotebooks();
}

async function loadNotebooks() {
  const index = document.getElementById('notebooksIndex');
  try {
    const res = await fetch('/api/notebooks');
    const data = await res.json();
    index.innerHTML = '';

    if (!data.notebooks || data.notebooks.length === 0) {
      index.innerHTML = '<p style="color:var(--text-gray);">No hay notebooks creados.</p>';
      return;
    }

    data.notebooks.forEach((nb) => {
      const item = document.createElement('div');
      item.className = 'file-row';
      item.innerHTML = `
        <div>
          <b>${nb.title}</b>
          <div style="font-size:0.75rem; color:var(--text-gray);">${nb.cells.length} celdas &bull; ${nb.updatedAt}</div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="stat-btn btn-open">Abrir</button>
          <button class="stat-btn btn-del" style="color:#ef4444;">Eliminar</button>
        </div>
      `;
      item.querySelector('.btn-open').onclick = () => openNotebook(nb);
      item.querySelector('.btn-del').onclick = () => {
        document.getElementById('deleteItemPromptText').innerText = `¿Estás seguro de que deseas eliminar el notebook "${nb.title}"?`;
        document.getElementById('modalDeleteConfirm').classList.add('active');
        document.getElementById('btnConfirmDelete').onclick = async () => {
          document.getElementById('modalDeleteConfirm').classList.remove('active');
          await fetch(`/api/notebooks/${nb.id}`, { method: 'DELETE' });
          loadNotebooks();
        };
      };
      index.appendChild(item);
    });
  } catch (err) {
    index.innerHTML = `<p style="color:#ef4444;">Error: ${err.message}</p>`;
  }
}

function openNotebook(nb) {
  currentNotebook = nb;
  document.getElementById('notebooksIndex').style.display = 'none';
  const area = document.getElementById('activeNotebookArea');
  area.style.display = 'block';

  area.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid var(--border); padding-bottom:10px;">
      <h3 style="font-weight:800;">${nb.title}</h3>
      <div style="display:flex; gap:6px;">
        <button class="stat-btn" id="btnBackIndex">Volver</button>
        <button class="stat-btn" id="btnAddCodeCell">+ Celda Código</button>
        <button class="btn-full" style="width:auto; padding:6px 14px;" id="btnSaveNotebook">Guardar</button>
      </div>
    </div>
    <div id="cellsList"></div>
  `;

  document.getElementById('btnBackIndex').onclick = () => {
    area.style.display = 'none';
    document.getElementById('notebooksIndex').style.display = 'block';
    loadNotebooks();
  };

  document.getElementById('btnAddCodeCell').onclick = () => {
    currentNotebook.cells.push({ id: String(Date.now()), type: 'code', content: '' });
    renderCells();
  };

  document.getElementById('btnSaveNotebook').onclick = async () => {
    await fetch('/api/notebooks/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentNotebook),
    });
    window.showToast?.('Notebook guardado exitosamente ꕤ');
  };

  renderCells();
}

function renderCells() {
  const container = document.getElementById('cellsList');
  container.innerHTML = '';

  currentNotebook.cells.forEach((cell, idx) => {
    const box = document.createElement('div');
    box.style.border = '1px solid var(--border)';
    box.style.borderRadius = '12px';
    box.style.padding = '12px';
    box.style.marginBottom = '12px';
    box.style.background = 'var(--bg-params)';

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:0.75rem; font-weight:800; color:var(--text-gray);">In [${idx + 1}]:</span>
        <div style="display:flex; gap:6px;">
          <button class="stat-btn btn-run" style="background:var(--primary); color:#fff;"><i class="fas fa-play"></i> Ejecutar</button>
          <button class="stat-btn btn-remove" style="color:#ef4444;"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <textarea class="param-input cell-editor" style="height:100px; font-family:'JetBrains Mono', monospace; font-size:0.85rem; background:var(--bg-card);">${cell.content || ''}</textarea>
      <div class="cell-output" style="margin-top:8px; padding:10px; border-radius:8px; background:#f4f6f9; color:#1d4ed8; font-family:'JetBrains Mono', monospace; font-size:0.8rem; white-space:pre-wrap; display:${cell.output ? 'block' : 'none'};">${cell.output || ''}</div>
    `;

    const editor = box.querySelector('.cell-editor');
    editor.oninput = () => {
      cell.content = editor.value;
    };

    box.querySelector('.btn-run').onclick = async () => {
      const outBox = box.querySelector('.cell-output');
      outBox.style.display = 'block';
      outBox.textContent = 'Ejecutando...';
      const res = await fetch('/api/notebooks/execute-cell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cell.content }),
      });
      const d = await res.json();
      cell.output = d.output;
      outBox.textContent = d.output;
    };

    box.querySelector('.btn-remove').onclick = () => {
      currentNotebook.cells.splice(idx, 1);
      renderCells();
    };

    container.appendChild(box);
  });
}
