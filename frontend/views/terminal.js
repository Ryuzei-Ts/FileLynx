export function renderTerminal(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:1rem; font-weight:800; color:var(--text-dark);"><i class="fas fa-terminal"></i> Terminal VPS (Bash / PTY)</h3>
        <button class="stat-btn" onclick="document.getElementById('termOutput').textContent=''"><i class="fas fa-eraser"></i> Limpiar</button>
      </div>
      <div class="terminal-box" id="termOutput">Conectando sesión PTY...\n</div>
      <input type="text" id="termInput" class="param-input" placeholder="Comando bash..." style="margin-top:12px; font-family:'JetBrains Mono', monospace;"/>
    </div>
  `;

  const output = document.getElementById('termOutput');
  const input = document.getElementById('termInput');
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);

  socket.onmessage = (event) => {
    output.textContent += event.data;
    output.scrollTop = output.scrollHeight;
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      socket.send(input.value + '\n');
      input.value = '';
    }
  });
}
