export function renderTerminal(container) {
  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      <div class="terminal-box" id="termOutput">Conectando con WebSocket terminal...\n</div>
      <input type="text" id="termInput" placeholder="Escribe un comando y presiona Enter..." style="margin-top: 8px;"/>
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
