let terminalSocket = null;

function cleanAnsi(str) {
  return str
    .replace(/\x1b\]0;[^\x07]*\x07/g, '')
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x07/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export function renderTerminal(container) {
  container.innerHTML = `
    <div class="panel-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <h3 style="font-size:1.05rem; font-weight:800; color:var(--text-dark);">Terminal</h3>
        <div style="display:flex; gap:6px;">
          <button class="stat-btn" id="btnTermClear"><i class="fas fa-eraser"></i> Clean</button>
          <button class="stat-btn" id="btnTermSigint" style="color:#ef4444;"><i class="fas fa-stop"></i> CTRL C</button>
        </div>
      </div>

      <div class="terminal-box" id="termOutput">Iniciando sesión PTY...\n</div>

      <div style="display:flex; gap:8px; margin-top:12px;">
        <input type="text" id="termInput" class="param-input" placeholder="Escribe un comando bash y presiona Enter..." style="font-family:'JetBrains Mono', monospace; flex:1;"/>
        <button class="stat-btn" id="btnSendCmd" style="background:var(--primary); color:#fff; border-color:var(--primary); padding:0 18px;">Enviar</button>
      </div>
    </div>
  `;

  const output = document.getElementById('termOutput');
  const input = document.getElementById('termInput');
  const btnSend = document.getElementById('btnSendCmd');

  function connectSocket() {
    if (terminalSocket) {
      try {
        terminalSocket.close();
      } catch {}
    }

    output.textContent = 'Conectando con WebSocket en VPS...\n';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    terminalSocket = new WebSocket(`${protocol}//${window.location.host}/ws/terminal`);

    terminalSocket.onopen = () => {
      output.textContent += '[Conexión establecida]\n';
    };

    terminalSocket.onmessage = (event) => {
      const sanitized = cleanAnsi(event.data);
      output.textContent += sanitized;
      output.scrollTop = output.scrollHeight;
    };

    terminalSocket.onclose = () => {
      output.textContent += '\n[Sesión terminada]';
    };

    terminalSocket.onerror = () => {
      output.textContent += '\n[Error en la conexión WebSocket]';
    };
  }

  function sendCommand() {
    if (!terminalSocket || terminalSocket.readyState !== WebSocket.OPEN) {
      alert('La terminal no está conectada');
      return;
    }
    terminalSocket.send(input.value + '\n');
    input.value = '';
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendCommand();
  });
  btnSend.onclick = sendCommand;

  document.getElementById('btnTermClear').onclick = () => {
    output.textContent = '';
  };

  document.getElementById('btnTermSigint').onclick = () => {
    if (terminalSocket && terminalSocket.readyState === WebSocket.OPEN) {
      terminalSocket.send('\x03');
    }
  };

  connectSocket();
}
