const API_BASE = 'http://localhost:3000';
const socket = io(API_BASE);

const socketStatus = document.getElementById('socket-status');
const eventsTable = document.getElementById('events-table-body');
const terminalStream = document.getElementById('terminal-stream');
const criticalAlert = document.getElementById('critical-alert');
const alertMsg = document.getElementById('alert-msg');

let protocolChartInstance = null;
let passwordChartInstance = null;

function initCharts() {
    const ctxProto = document.getElementById('protocolChart')?.getContext('2d');
    if (ctxProto) {
        protocolChartInstance = new Chart(ctxProto, {
            type: 'doughnut',
            data: {
                labels: ['SSH', 'TELNET', 'HTTP'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#58a6ff', '#f0883e', '#7ee787'],
                    borderColor: '#161b22',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#c9d1d9',
                            font: { size: 12 },
                            padding: 15,
                            boxWidth: 12
                        }
                    }
                }
            }
        });
    }

    const ctxPass = document.getElementById('passwordChart')?.getContext('2d');
    if (ctxPass) {
        passwordChartInstance = new Chart(ctxPass, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Attempt Count',
                    data: [],
                    backgroundColor: '#f85149',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#8b949e', stepSize: 1 },
                        grid: { color: '#30363d' }
                    },
                    y: {
                        ticks: { color: '#c9d1d9' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

initCharts();

socket.on('connect', () => {
    socketStatus.textContent = 'LIVE';
    socketStatus.className = 'badge badge-online';
});

socket.on('disconnect', () => {
    socketStatus.textContent = 'Disconnected';
    socketStatus.className = 'badge badge-offline';
});

socket.on('threat:auth', (data) => {
    const detail = `User: <b>${data.username}</b> | Pass: <b>${data.password || '---'}</b> [${data.status}]`;
    addRow(data.timestamp, data.protocol, data.ip, detail, data.isHoneyToken ? 'color: #ff7b72;' : '');
    refreshMetrics();
});

socket.on('threat:command', (data) => {
    let cleanCommand = (data.command || '').trim();

    const ttp = data.ttp;

    let badgeHtml = '';
    if (ttp && ttp.tag) {
        const badgeColor = ttp.color || '#8b949e';
        badgeHtml = `<span class="ttp-badge" style="background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor};" title="${ttp.technique || ttp.tag}">${ttp.tag}</span>`;
    }

    const detail = `${badgeHtml}Shell: <code>${cleanCommand}</code>`;
    addRow(data.timestamp, data.protocol, data.ip, detail);

    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `
        ${badgeHtml}
        <span style="color:#8b949e">[${data.protocol}]</span> 
        <span style="color:#58a6ff">${data.ip}:~#</span> 
        <span style="color:#7ee787;">${cleanCommand}</span>
    `;

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

            if (protocolChartInstance) {
                protocolChartInstance.data.datasets[0].data = [
                    json.data.protocols.ssh || 0,
                    json.data.protocols.telnet || 0,
                    json.data.protocols.http || 0
                ];
                protocolChartInstance.update();
            }
        }

        const credsRes = await fetch(`${API_BASE}/api/logs/stats/credentials?limit=5`);
        const credsJson = await credsRes.json();
        if (credsJson.success) {
            const list = document.getElementById('top-passwords-list');
            list.innerHTML = credsJson.data.topPasswords.map(p => `
                <li><span>${p.password}</span> <b>${p.count}</b></li>
            `).join('');

            if (passwordChartInstance) {
                passwordChartInstance.data.labels = credsJson.data.topPasswords.map(p => p.password);
                passwordChartInstance.data.datasets[0].data = credsJson.data.topPasswords.map(p => p.count);
                passwordChartInstance.update();
            }
        }
    } catch (e) {
        console.error("Failed to fetch metrics:", e);
    }
}

async function loadInitialCommands() {
    try {
        const res = await fetch(`${API_BASE}/api/logs/recent-commands?limit=15`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
            terminalStream.innerHTML = '';

            json.data.reverse().forEach(item => {
                const line = document.createElement('div');
                line.className = 'terminal-line';

                let badgeHtml = '';
                if (item.ttp) {
                    badgeHtml = `<span class="ttp-badge" style="background: ${item.ttp.color}22; color: ${item.ttp.color}; border: 1px solid ${item.ttp.color};" title="${item.ttp.technique} (${item.ttp.tactic})">${item.ttp.tag}</span>`;
                }

                line.innerHTML = `
                    ${badgeHtml}
                    <span style="color:#8b949e">[${item.protocol}]</span> 
                    <span style="color:#58a6ff">${item.ip}:~#</span> 
                    <span style="color:#7ee787;">${item.command}</span>
                `;
                terminalStream.appendChild(line);
            });
            terminalStream.scrollTop = terminalStream.scrollHeight;
        }
    } catch (e) {
        console.error("Past commands could not be found:", e);
    }
}

document.getElementById('clear-events').addEventListener('click', () => eventsTable.innerHTML = '');
 refreshMetrics();
 loadInitialCommands();
setInterval(refreshMetrics, 15000);

const blacklistModal = document.getElementById('blacklist-modal');
const closeModalBtn = document.getElementById('close-modal');
const bannedCard = document.getElementById('card-banned-ips');
const blacklistTable = document.getElementById('blacklist-table-body');

bannedCard.addEventListener('click', () => {
    loadBlacklistData();
    blacklistModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    blacklistModal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === blacklistModal) {
        blacklistModal.classList.add('hidden');
    }
});


async function loadBlacklistData() {
    try {
        const res = await fetch(`${API_BASE}/api/logs/blacklist`);
        const json = await res.json();

        if (json.success) {
            blacklistTable.innerHTML = '';
            if (!json.data || json.data.length === 0) {
                blacklistTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted)">No registered IPs in the blacklist.</td></tr>`;
                return;
            }

            json.data.forEach(item => {
                const tr = document.createElement('tr');
                const dateFormatted = item.banned_date ? new Date(item.banned_date).toLocaleString() : '---';

                tr.innerHTML = `
                    <td><b>${item.ip}</b></td>
                    <td style="color:#ff7b72;">${item.reason || 'Unknown'}</td>
                    <td>${dateFormatted}</td>
                    <td>
                        <button class="btn-unban" onclick="unbanIp('${item.ip}')">Unban</button>
                    </td>
                `;
                blacklistTable.appendChild(tr);
            });
        }
    } catch (err) {
        console.error("Failed to fetch blacklist:", err);
    }
}

window.unbanIp = async function(ip) {
    if (!confirm(`Are you sure you want to unblock the ${ip} address?`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/logs/blacklist/${encodeURIComponent(ip)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const json = await res.json();

        if (json.success) {
            await loadBlacklistData();
            await refreshMetrics();
        } else {
            alert(`Error: ${json.message}`);
        }
    } catch (err) {
        console.error("Unban error:", err);
    }
};

document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    window.open(`${API_BASE}/api/logs/export/ioc/csv`, '_blank');
});

document.getElementById('btn-export-json')?.addEventListener('click', () => {
    window.open(`${API_BASE}/api/logs/export/ioc/json`, '_blank');
});