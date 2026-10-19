import { renderFiles } from './views/files.js';
import { renderTerminal } from './views/terminal.js';
import { renderNotebooks } from './views/notebooks.js';
import { renderFTP } from './views/ftp.js';
import { renderS3 } from './views/s3.js';

const container = document.getElementById('view-container');
const buttons = document.querySelectorAll('.nav-btn');

const views = {
  files: renderFiles,
  terminal: renderTerminal,
  notebooks: renderNotebooks,
  ftp: renderFTP,
  s3: renderS3,
};

function switchView(viewName) {
  buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
  const renderer = views[viewName] || renderFiles;
  container.innerHTML = '';
  renderer(container);
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Vista inicial
switchView('files');
