export async function renderNotebooks(container) {
  container.innerHTML = `
    <div class="panel-box">
      <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 12px;">Notebooks Interactivos</h3>
      <div id="notebookList">Cargando cuadernos...</div>
    </div>
  `;

  const res = await fetch('/api/notebooks');
  const data = await res.json();
  const list = document.getElementById('notebookList');
  list.innerHTML = '';

  (data.notebooks || []).forEach((nb) => {
    const item = document.createElement('div');
    item.className = 'file-row';
    item.innerHTML = `<b>${nb.title}</b> <small style="color:var(--text-gray);">${nb.updatedAt}</small>`;
    list.appendChild(item);
  });
}
