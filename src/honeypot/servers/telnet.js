import net from 'net';
import {addTelnetLog} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";
import {executeFakeCommand} from "../mockShell.js";

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
                    handleSessionFlow(socket, session, line);
                }
            }
        });

        socket.write(`RouterOS v6.48${CRLF}`);

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

            console.log('Commands Executed:', payloadToSave.commandsExecuted);
            console.log('Raw Payload (JSON):', payloadToSave.rawPayload);

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

function handleSessionFlow(socket, session, line) {
    if (session.stage === 'USERNAME') {
        session.username = line;
        session.stage = 'PASSWORD';
        socket.write('Password: ');
    }
    else if (session.stage === 'PASSWORD') {
        session.password = line;
        session.stage = 'SHELL';

        socket.write(`${CRLF}Welcome to Linux (mips)${CRLF}# `);
    }
    else if (session.stage === 'SHELL') {
        session.commands.push({
            command: line,
            executed_at: new Date().toISOString()
        });

        console.log(`[TELNET-CMD] Command: "${line}"`);

        const { response, shouldExit } = executeFakeCommand(line, '# ');

        socket.write(response);

        if (shouldExit) {
            socket.end();
        }
    }
}