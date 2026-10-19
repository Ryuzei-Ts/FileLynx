export async function renderNotebooks(container) {
  container.innerHTML = `
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
      <h2>Notebooks Interactivos</h2>
      <button id="btnNewNotebook">+ Nuevo</button>
    </div>
    <div id="notebookList">Cargando cuadernos...</div>
  `;

  const res = await fetch('/api/notebooks');
  const data = await res.json();
  const list = document.getElementById('notebookList');
  list.innerHTML = '';

  (data.notebooks || []).forEach(nb => {
    const item = document.createElement('div');
    item.className = 'file-row';
    item.innerHTML = `<strong>${nb.title}</strong> — <small>${nb.updatedAt}</small>`;
    list.appendChild(item);
  });
}
