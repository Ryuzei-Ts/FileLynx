let editorInstance = null;
let currentPath = '';

export async function renderEditor(container, fileToOpen = '') {
  currentPath = fileToOpen;
  container.innerHTML = `
    <div class="panel-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 260px;">
          <input type="text" id="editorFilePath" class="param-input" value="${currentPath}" placeholder="Ruta relativa del archivo (ej. package.json o src/app.ts)" style="flex: 1;" />
          <button class="stat-btn" id="btnEditorLoad"><i class="fas fa-folder-open"></i> Cargar</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-full" id="btnEditorSave" style="width: auto; padding: 10px 18px; margin: 0;">
            <i class="fas fa-save"></i> Guardar (Ctrl+S)
          </button>
        </div>
      </div>
      <div id="monaco-container"></div>
    </div>
  `;

  document.getElementById('btnEditorLoad').onclick = () => {
    const val = document.getElementById('editorFilePath').value.trim();
    if (val) loadFileContent(val);
  };

  document.getElementById('btnEditorSave').onclick = () => saveFileContent();

  initMonaco(fileToOpen);
}

function getLanguageByExtension(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': return 'typescript';
    case 'js': case 'mjs': case 'cjs': return 'javascript';
    case 'json': return 'json';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'md': return 'markdown';
    case 'sh': return 'shell';
    case 'yml': case 'yaml': return 'yaml';
    case 'sql': return 'sql';
    case 'dockerfile': return 'dockerfile';
    default: return 'plaintext';
  }
}

function initMonaco(initialFile) {
  if (typeof require === 'undefined') {
    setTimeout(() => initMonaco(initialFile), 200);
    return;
  }

  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    const isDark = document.body.classList.contains('dark-mode');
    editorInstance = monaco.editor.create(document.getElementById('monaco-container'), {
      value: '// Abre un archivo para comenzar a programar en tu VPS\n',
      language: 'javascript',
      theme: isDark ? 'vs-dark' : 'vs',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: 'monospace',
    });

    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
      saveFileContent();
    });

    if (initialFile) {
      loadFileContent(initialFile);
    }
  });
}

async function loadFileContent(filePath) {
  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentPath = filePath;
    document.getElementById('editorFilePath').value = filePath;

    if (editorInstance) {
      const lang = getLanguageByExtension(filePath);
      const model = monaco.editor.createModel(data.content, lang);
      editorInstance.setModel(model);
    }
    window.showToast?.(`Archivo ${filePath} cargado ✰`);
  } catch (err) {
    window.showToast?.(`Error: ${err.message}`);
  }
}

async function saveFileContent() {
  if (!editorInstance || !currentPath) {
    window.showToast?.('No hay ningún archivo abierto');
    return;
  }
  const content = editorInstance.getValue();
  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentPath, content }),
    });
    const data = await res.json();
    if (data.success) {
      window.showToast?.(`¡Guardado exitoso! ꕤ`);
    } else {
      window.showToast?.(`Error: ${data.error}`);
    }
  } catch (err) {
    window.showToast?.(`Fallo al guardar archivo`);
  }
}
