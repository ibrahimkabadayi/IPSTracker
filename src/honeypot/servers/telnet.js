import net from 'net';
import {addTelnetLog, closeLogSession} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";
import {executeFakeCommand} from "../mockShell.js";
import {HONEY_TOKENS} from "../honeyTokens.js";

const CRLF = '\r\n';

export function startTelnetHoneypot(io) {
    const server = net.createServer((socket) => {
        const ip = socket.remoteAddress;
        const port = socket.remotePort;

        console.log(`New TELNET connection: ${ip}:${port}`);

        const session = {
            ip,
            port,
            stage: 'USERNAME',
            username: '',
            password: '',
            inputBuffer: '',
            commands: [],
            rawPayloadChunks: []
        };

        if (!handleConnection(io, ip, port)) {
            socket.destroy();
            return;
        }

        socket.setTimeout(30000);
        socket.on('timeout', () => {
            socket.destroy();
        });

        socket.on('data', (chunk) => {
            session.rawPayloadChunks.push({
                timestamp: new Date().toISOString(),
                direction: 'inbound',
                length: chunk.length,
                hex: chunk.toString('hex')
            });

            const cleanBytes = chunk.filter(byte => byte < 0xF0);

            for (const byte of cleanBytes) {
                if (byte === 0x08 || byte === 0x7F) {
                    if (session.inputBuffer.length > 0) {
                        session.inputBuffer = session.inputBuffer.slice(0, -1);

                        socket.write('\b \b');
                    }
                } else {
                    session.inputBuffer += String.fromCharCode(byte);
                }
            }

            let newlineIndex;
            while ((newlineIndex = session.inputBuffer.search(/[\r\n]/)) !== -1) {
                const line = session.inputBuffer.slice(0, newlineIndex).trim();
                session.inputBuffer = session.inputBuffer.slice(newlineIndex + 1).replace(/^[\r\n]+/, '');

                if (line) {
                    handleSessionFlow(socket, session, line, io);
                }
            }
        });

        socket.write(`Ubuntu 22.04.3 LTS${CRLF}ubuntu-server login: `);

        socket.on('close', () => {
            const payloadToSave = {
                sourceIp: ip,
                sourcePort: port,
                targetPort: 2323,
                attemptedUsername: session.username,
                attemptedPassword: session.password,
                commandsExecuted: JSON.stringify(session.commands),
                rawPayload: JSON.stringify({
                    total_chunks: session.rawPayloadChunks.length,
                    total_bytes: session.rawPayloadChunks.reduce((acc, c) => acc + c.length, 0),
                    packets: session.rawPayloadChunks
                })
            };

            const logId = addTelnetLog(payloadToSave);

            closeLogSession(logId);

            addTelnetLog(payloadToSave);
        });

        socket.on('error', (err) => {
            console.log(`[ERROR] IP: ${ip} (${err.message})`);
        });

    });

    server.listen(2323, '0.0.0.0', () => {
        console.log('TELNET Server listening on port 2323');
    });
}

function handleSessionFlow(socket, session, line, io) {
    if (session.stage === 'USERNAME') {
        session.username = line;
        session.stage = 'PASSWORD';
        socket.write('Password: ');
    }
    else if (session.stage === 'PASSWORD') {
        session.password = line;
        session.stage = 'SHELL';

        const isHoneyTokenUsed = (session.password === HONEY_TOKENS.BAIT_PASSWORD);

        if (isHoneyTokenUsed) {
            console.log(`🔥 [CRITICAL ALERT] HoneyToken Triggered! IP: ${session.ip} is trying the password from the HTTP .env trap!`);

            io.emit('threat:alert', {
                severity: 'CRITICAL',
                type: 'HONEYTOKEN_TRIGGERED',
                protocol: 'telnet',
                ip: session.ip,
                port: session.port,
                username: session.username,
                password: session.password,
                message: 'Attacker used the credential leaked via HTTP/.env on SSH!',
                timestamp: new Date().toISOString()
            });
        }

        io.emit('threat:auth', {
            protocol: 'telnet',
            ip: session.ip,
            port: session.port,
            username: session.username,
            password: session.password,
            status: 'accepted',
            timestamp: new Date().toISOString()
        });

        socket.write(`${CRLF}Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-88-generic x86_64)${CRLF}${CRLF}`);
        socket.write(`Last login: Fri Sep 11 18:22:04 2026 from 192.168.1.15${CRLF}`);
        socket.write(`${session.username || 'root'}@ubuntu-server:~# `);
    }
    else if (session.stage === 'SHELL') {
        if (!line) {
            socket.write(`${session.username || 'root'}@ubuntu-server:~# `);
            return;
        }

        io.emit('threat:command', {
            protocol: 'telnet',
            ip: session.ip,
            command: line,
            timestamp: new Date().toISOString()
        });

        session.commands.push({
            command: line,
            executed_at: new Date().toISOString()
        });

        const prompt = `${session.username || 'root'}@ubuntu-server:~# `;
        const { response, shouldExit } = executeFakeCommand(line, prompt);

        socket.write(response);

        if (shouldExit) {
            socket.end();
        }
    }
}