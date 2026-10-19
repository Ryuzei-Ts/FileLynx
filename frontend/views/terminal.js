export function renderTerminal(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div class="terminal-box" id="termOutput">Conectando con la terminal en VPS...\n</div>
      <input type="text" id="termInput" class="param-input" placeholder="Escribe un comando bash y pulsa Enter..." style="margin-top: 12px;"/>
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
