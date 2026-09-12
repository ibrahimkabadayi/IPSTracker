import ssh2 from 'ssh2';
const { Server } = ssh2;
import fs from 'fs';
import crypto from 'crypto';
import {addSshLog, closeLogSession} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";
import * as dotenv from "dotenv";
import { HONEY_TOKENS } from "../honeyTokens.js";
import {executeFakeCommand} from "../mockShell.js";

dotenv.config();

const PASSWORD = process.env.HOST_KEY;

const getClientVersion = (client) => {
    return (
        client._protocol?._clientIdentRaw?.toString().trim() ||
        client._protocol?.clientIdentRaw?.toString().trim() ||
        client._protocol?._identRaw?.toString().trim() ||
        client._parser?._identRaw?.toString().trim() ||
        client._parser?.header?.ident?.toString().trim() ||
        'Unknown'
    );
};

export function startSshHoneypot(io) {
    const server = new Server({
        hostKeys: [{
            key: fs.readFileSync('host_key'),
            passphrase: PASSWORD
        }]
    }, (client) => {
        const ip = client._sock.remoteAddress;
        const port = client._sock.remotePort;
        const family = client._sock.remoteFamily;

        console.log(`\n[+] New Connection: ${ip}:${port} (${family})`);

        if (!handleConnection(io, ip, 2222)) {
            console.log(`[-] Connection blocked by handleConnection: ${ip}`);
            client._sock?.destroy();
            return;
        }

        let clientVersion = 'Unknown';
        let rawPayloadHex = null;
        let attemptCount = 0;
        let method = '';
        let successfulUser = '';
        let successfulPass = '';
        let publicKeyFingerprint = '';
        const executedCommands = [];

        client.on('handshake', (negotiated) => {
            rawPayloadHex = negotiated.raw?.toString('hex') || null;
            if (client._parser?._identRaw) {
                clientVersion = client._parser._identRaw.toString().trim();
            }
        });

        client.on('authentication', (ctx) => {
            clientVersion = getClientVersion(client);

            console.log('Client version: ', clientVersion);

            if (ctx.method === 'password') {
                attemptCount++;
                console.log(`[AUTH-PASSWORD] IP: ${ip} | User: ${ctx.username} | Pass: ${ctx.password} | Client: ${clientVersion}`);

                const isHoneyTokenUsed = (ctx.password === HONEY_TOKENS.BAIT_PASSWORD);

                if (isHoneyTokenUsed) {
                    console.log(`🔥 [CRITICAL ALERT] HoneyToken Triggered! IP: ${ip} is trying the password from the HTTP .env trap!`);

                    io.emit('threat:alert', {
                        severity: 'CRITICAL',
                        type: 'HONEYTOKEN_TRIGGERED',
                        protocol: 'ssh',
                        ip,
                        port,
                        username: ctx.username,
                        password: ctx.password,
                        message: 'Attacker used the credential leaked via HTTP/.env on SSH!',
                        timestamp: new Date().toISOString()
                    });
                }

                const isAccepted = isHoneyTokenUsed || attemptCount >= 3;

                io.emit('threat:auth', {
                    protocol: 'ssh',
                    ip,
                    port,
                    username: ctx.username,
                    password: ctx.password,
                    status: isAccepted ? 'accepted' : 'rejected',
                    isHoneyToken: isHoneyTokenUsed,
                    attempt: attemptCount,
                    timestamp: new Date().toISOString()
                });

                if (isAccepted) {
                    successfulUser = ctx.username;
                    successfulPass = ctx.password;
                    method = isHoneyTokenUsed ? 'honeytoken_password' : 'password';
                    ctx.accept();
                } else {
                    try {
                        addSshLog({
                            sourceIp: ip,
                            sourcePort: port,
                            targetPort: 2222,
                            clientVersion,
                            rawPayload: {
                                kex_raw: rawPayloadHex,
                                attempt: attemptCount,
                                status: 'failed_auth'
                            },
                            attemptedUsername: ctx.username,
                            attemptedPassword: ctx.password,
                            method: 'password',
                            publicKeyFingerprint: null,
                            commandsExecuted: [],
                            isInstant: true
                        });
                    } catch (err) {
                        console.error('[DB ERROR - FAILED AUTH]:', err);
                    }

                    ctx.reject(['password', 'publickey', 'keyboard-interactive']);
                }
            }
            else if (ctx.method === 'publickey') {
                const fingerprint = crypto.createHash('sha256').update(ctx.key.data).digest('base64');
                const fullFingerprint = `SHA256:${fingerprint}`;

                if (!ctx.signature) {
                    return ctx.accept();
                }

                successfulUser = ctx.username;
                method = 'publickey';
                publicKeyFingerprint = fullFingerprint;

                console.log(`[+] [PUBKEY ACCEPT]: ${ctx.username}`);
                console.log(`[AUTH-PUBKEY] IP: ${ip} | User: ${ctx.username} | Algo: ${ctx.key.algo} | Fingerprint: SHA256:${fingerprint}`);

                io.emit('threat:auth', {
                    protocol: 'ssh',
                    ip,
                    port,
                    username: ctx.username,
                    method: 'publickey',
                    fingerprint,
                    status: 'accepted',
                    timestamp: new Date().toISOString()
                });

                return ctx.accept();
            }
            else if (ctx.method === 'none') {
                console.log(`[AUTH-PROBE] IP: ${ip} (none method)`);
            }

            ctx.reject(['password', 'publickey', 'keyboard-interactive']);
        });

        client.on('ready', () => {
            console.log('[+] Client has entered the system, waiting for session...');

            client.on('session', (accept, reject) => {
                const session = accept();

                session.on('exec', (accept, reject, info) => {
                    console.log(`[EXEC COMMAND]: ${info.command}`);
                    executedCommands.push({
                        command: info.command,
                        executed_at: new Date().toISOString(),
                        type: 'exec'
                    });

                   const stream = accept();
                   stream.write(`bash: ${info.command}: command not found\r\n`);
                   stream.exit(0);
                   stream.end();
                });

                session.on('pty', (accept, reject, info) => {
                    accept();
                });

                session.on('shell', (accept, reject) => {
                    const stream = accept();
                    let inputBuffer = '';
                    const prompt = `${successfulUser || 'root'}@ubuntu:~# `;

                    stream.write(`Welcome to Ubuntu 22.04 LTS\r\n\r\n${prompt}`);

                    stream.on('data', (data) => {
                        for (let i = 0; i < data.length; i++) {
                            const byte = data[i];

                            if (byte === 0x08 || byte === 0x7F) {
                                if (inputBuffer.length > 0) {
                                    inputBuffer = inputBuffer.slice(0, -1);
                                    stream.write('\b \b');
                                }
                            }
                            else if (byte === 0x0D || byte === 0x0A) {
                                const command = inputBuffer.trim();
                                inputBuffer = '';

                                if (command.length > 0) {
                                    executedCommands.push({
                                        command: command,
                                        executed_at: new Date().toISOString(),
                                        type: 'shell'
                                    });

                                    io.emit('threat:command', {
                                        protocol: 'ssh',
                                        ip,
                                        command,
                                        type: 'shell',
                                        timestamp: new Date().toISOString()
                                    });

                                    console.log(`[SSH-COMMAND] IP: ${ip} | Komut: "${command}"`);

                                    const { response, shouldExit } = executeFakeCommand(command, prompt);
                                    stream.write(`\r\n${response}`);

                                    if (shouldExit) {
                                        stream.end();
                                        return;
                                    }
                                } else {
                                    stream.write(`\r\n${prompt}`);
                                }
                            }
                            else if (byte >= 0x20 && byte <= 0x7E) {
                                const char = String.fromCharCode(byte);
                                inputBuffer += char;
                                stream.write(char); // Echo
                            }
                        }
                    });
                });
            });
        });

        client.on('close', () => {
            console.log(`[-] [SSH] Client ended the session: ${ip}. Number of prompted commands: ${executedCommands.length}`);

            if (successfulUser) {
                const authLog = {
                    sourceIp: ip,
                    sourcePort: port,
                    targetPort: 2222,
                    clientVersion: client.identRaw || 'Unknown',
                    rawPayload: {
                        kex_raw: rawPayloadHex,
                        total_commands: executedCommands.length,
                        closed_at: new Date().toISOString()
                    },
                    attemptedUsername: successfulUser,
                    attemptedPassword: successfulPass || null,
                    method: method,
                    publicKeyFingerprint: publicKeyFingerprint || null,
                    commandsExecuted: executedCommands,
                    isInstant: false
                };

                try {
                    const logId = addSshLog(authLog);
                    closeLogSession(logId);
                } catch (err) {
                    console.error('[DB ERROR]:', err);
                }
            }

            io.emit('threat:session', {
                protocol: 'ssh',
                ip,
                status: 'closed',
                totalCommands: executedCommands.length,
                timestamp: new Date().toISOString()
            });
        });

        client.on('error', (err) => {
            if (err.code !== 'ECONNRESET') {
                console.log(`[ERROR] IP: ${ip} (${err.message})`);
            }
        });
    });

    server.listen(2222, '0.0.0.0', () =>
        console.log('SSH honeypot listening on port 2222')
    );
}