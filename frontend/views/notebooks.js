let notesList = [];
let activeNote = null;

export async function renderNotebooks(container) {
  notesList = [];
  activeNote = null;

  container.innerHTML = `
    <div class="panel-box" id="notesListContainer">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <h3 style="font-size:1.3rem; font-weight:800; display:flex; align-items:center; gap:8px;">
          <i class="fas fa-sticky-note" style="color:#000000;"></i> Notebooks
        </h3>
        <button class="btn-full" style="width:auto; padding:8px 16px;" id="btnCreateNewNote">
          <i class="fas fa-plus"></i> Nueva Nota
        </button>
      </div>

      <div class="notes-search-box">
        <i class="fas fa-search" style="color:var(--text-gray); font-size:0.8rem;"></i>
        <input type="text" id="noteSearchInput" placeholder="Buscar en todas las notas..." />
      </div>

      <div class="notes-list" id="notesItemsWrapper">
        <p style="padding:16px; color:var(--text-gray); text-align:center;">Cargando notas...</p>
      </div>
    </div>

    <div class="note-editor-view" id="noteEditorContainer" style="display:none;">
      <div class="note-editor-header">
        <button class="stat-btn" id="btnBackToNotes"><i class="fas fa-chevron-left"></i> Volver</button>
        <div style="display:flex; gap:6px;">
          <button class="stat-btn" id="btnDeleteCurrentNote" style="color:#ef4444;"><i class="fas fa-trash"></i></button>
          <button class="btn-full" style="width:auto; padding:8px 18px;" id="btnSaveCurrentNote">Guardar</button>
        </div>
      </div>
      <input type="text" class="note-title-input" id="editNoteTitle" placeholder="Título de la nota..." />
      <textarea class="note-body-textarea" id="editNoteContent" placeholder="Empieza a escribir aquí..."></textarea>
    </div>
  `;

  document.getElementById('btnCreateNewNote').onclick = () => {
    openNoteEditor({ id: '', title: '', content: '', updatedAt: new Date().toISOString() });
  };

  document.getElementById('btnBackToNotes').onclick = () => {
    document.getElementById('noteEditorContainer').style.display = 'none';
    document.getElementById('notesListContainer').style.display = 'block';
    loadNotes();
  };

  document.getElementById('btnSaveCurrentNote').onclick = saveActiveNote;
  document.getElementById('btnDeleteCurrentNote').onclick = deleteActiveNote;

  document.getElementById('noteSearchInput').oninput = (e) => {
    filterNotes(e.target.value);
  };

  loadNotes();
}

async function loadNotes() {
  try {
    const res = await fetch('/api/notebooks');
    const data = await res.json();
    notesList = data.notebooks || [];
    renderNotesList(notesList);
  } catch (err) {
    document.getElementById('notesItemsWrapper').innerHTML = `<p style="padding:16px; color:#ef4444;">Error al cargar notas: ${err.message}</p>`;
  }
}

function renderNotesList(list) {
  const wrapper = document.getElementById('notesItemsWrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';

  if (list.length === 0) {
    wrapper.innerHTML = '<p style="padding:24px; color:var(--text-gray); text-align:center;">No hay notas creadas. Pulsa "Nueva Nota" para crear una.</p>';
    return;
  }

  list.forEach((note) => {
    const item = document.createElement('div');
    item.className = 'note-card-item';

    let preview = 'Sin texto adicional';
    if (typeof note.cells === 'string') {
      preview = note.cells;
    } else if (Array.isArray(note.cells) && note.cells[0]?.content) {
      preview = note.cells[0].content;
    }

    const dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : 'Hoy';

    item.innerHTML = `
      <div style="flex:1; overflow:hidden; padding-right:12px;">
        <div class="note-card-title">${escapeHtml(note.title || 'Nota sin título')}</div>
        <div class="note-card-snippet">
          <span class="note-card-date">${dateStr}</span>
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(preview)}</span>
        </div>
      </div>
      <i class="fas fa-chevron-right" style="color:var(--text-gray); font-size:0.75rem;"></i>
    `;

    item.onclick = () => openNoteEditor(note);
    wrapper.appendChild(item);
  });
}

function filterNotes(query) {
  const q = query.toLowerCase().trim();
  const filtered = notesList.filter((n) => {
    const t = (n.title || '').toLowerCase();
    const c = typeof n.cells === 'string' ? n.cells.toLowerCase() : JSON.stringify(n.cells).toLowerCase();
    return t.includes(q) || c.includes(q);
  });
  renderNotesList(filtered);
}

function openNoteEditor(note) {
  activeNote = note;
  document.getElementById('notesListContainer').style.display = 'none';
  const editor = document.getElementById('noteEditorContainer');
  editor.style.display = 'flex';

  document.getElementById('editNoteTitle').value = note.title || '';

  let body = '';
  if (typeof note.cells === 'string') {
    body = note.cells;
  } else if (Array.isArray(note.cells)) {
    body = note.cells.map((c) => c.content || '').join('\n');
  }

  document.getElementById('editNoteContent').value = body;
  document.getElementById('editNoteTitle').focus();
}

async function saveActiveNote() {
  const title = document.getElementById('editNoteTitle').value.trim() || 'Nota sin título';
  const content = document.getElementById('editNoteContent').value;

  const payload = {
    id: activeNote?.id || '',
    title,
    cells: [{ id: '1', type: 'text', content }],
  };

  try {
    const res = await fetch('/api/notebooks/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const saved = await res.json();
    activeNote = saved;
    window.showToast?.('Nota guardada ꕤ');
  } catch {
    window.showToast?.('Error al guardar la nota');
  }
}

async function deleteActiveNote() {
  if (!activeNote?.id) {
    document.getElementById('btnBackToNotes').click();
    return;
  }

  if (confirm(`¿Eliminar permanentemente "${activeNote.title || 'esta nota'}"?`)) {
    try {
      await fetch(`/api/notebooks/${activeNote.id}`, { method: 'DELETE' });
      window.showToast?.('Nota eliminada ✰');
      document.getElementById('btnBackToNotes').click();
    } catch {
      window.showToast?.('Error al eliminar');
    }
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
