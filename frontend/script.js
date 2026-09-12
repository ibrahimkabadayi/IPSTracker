const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);

// Element References
const socketStatus = document.getElementById('socket-status');
const eventsTable = document.getElementById('events-table-body');
const terminalStream = document.getElementById('terminal-stream');
const criticalAlert = document.getElementById('critical-alert');
const alertMsg = document.getElementById('alert-msg');

// 1. Socket Connection Status
socket.on('connect', () => {
    socketStatus.textContent = 'LIVE';
    socketStatus.className = 'badge badge-online';
});

socket.on('disconnect', () => {
    socketStatus.textContent = 'Disconnected';
    socketStatus.className = 'badge badge-offline';
});

// 2. Live Event Listeners
socket.on('threat:auth', (data) => {
    const detail = `User: <b>${data.username}</b> | Pass: <b>${data.password || '---'}</b> [${data.status}]`;
    addRow(data.timestamp, data.protocol, data.ip, detail, data.isHoneyToken ? 'color: #ff7b72;' : '');
    refreshMetrics();
});

socket.on('threat:command', (data) => {
    const detail = `Shell Command: <code>${data.command}</code>`;
    addRow(data.timestamp, data.protocol, data.ip, detail);

    // Print to terminal display
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span style="color:#8b949e">[${data.protocol}]</span> <span style="color:#58a6ff">${data.ip}:~#</span> ${data.command}`;
    terminalStream.appendChild(line);
    terminalStream.scrollTop = terminalStream.scrollHeight;
});

socket.on('threat:http_request', (data) => {
    const detail = `${data.method} <b>${data.url}</b> (${data.status})`;
    addRow(data.timestamp, 'HTTP', data.ip, detail);
});

socket.on('threat:alert', (data) => {
    criticalAlert.classList.remove('hidden');
    alertMsg.textContent = `[${data.protocol.toUpperCase()}] ${data.ip} - ${data.message}`;
    setTimeout(() => criticalAlert.classList.add('hidden'), 10000);
});

function addRow(time, proto, ip, detail, extraStyle = '') {
    const tr = document.createElement('tr');
    tr.style = extraStyle;
    const timeFormatted = new Date(time || Date.now()).toLocaleTimeString();

    tr.innerHTML = `
        <td>${timeFormatted}</td>
        <td><b style="color:var(--primary)">${proto.toUpperCase()}</b></td>
        <td>${ip}</td>
        <td>${detail}</td>
    `;
    eventsTable.prepend(tr);
    if (eventsTable.children.length > 50) eventsTable.removeChild(eventsTable.lastChild);
}

// 3. Fetch Statistics from REST API
async function refreshMetrics() {
    try {
        const res = await fetch(`${API_BASE}/api/logs/stats/overview`);
        const json = await res.json();
        if (json.success) {
            document.getElementById('metric-total').textContent = json.data.totalAttacks;
            document.getElementById('metric-24h').textContent = json.data.last24Hours;
            document.getElementById('metric-banned').textContent = json.data.totalBlacklisted;
            document.getElementById('proto-ssh').textContent = json.data.protocols.ssh || 0;
            document.getElementById('proto-telnet').textContent = json.data.protocols.telnet || 0;
            document.getElementById('proto-http').textContent = json.data.protocols.http || 0;
        }

        const credsRes = await fetch(`${API_BASE}/api/logs/stats/credentials?limit=5`);
        const credsJson = await credsRes.json();
        if (credsJson.success) {
            const list = document.getElementById('top-passwords-list');
            list.innerHTML = credsJson.data.topPasswords.map(p => `
                <li><span>${p.password}</span> <b>${p.count}</b></li>
            `).join('');
        }
    } catch (e) {
        console.error("Failed to fetch metrics:", e);
    }
}

// Initial loads
document.getElementById('clear-events').addEventListener('click', () => eventsTable.innerHTML = '');
refreshMetrics();
setInterval(refreshMetrics, 15000); // Refresh metrics every 15 seconds