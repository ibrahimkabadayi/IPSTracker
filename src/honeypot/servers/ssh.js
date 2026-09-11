import ssh2 from 'ssh2';
const { Server } = ssh2;
import fs from 'fs';
import crypto from 'crypto';
import {addSshLog} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";
import * as dotenv from "dotenv";

dotenv.config();

const PASSWORD = process.env.HOST_KEY;

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

                if (attemptCount >= 3) {
                    successfulUser = ctx.username;
                    successfulPass = ctx.password;
                    method = 'password';
                    ctx.accept();
                } else {
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
                        for (const byte of data) {
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
                                    console.log(`[SSH-COMMAND] IP: ${ip} | Command: "${command}"`);

                                    if (command === 'exit') {
                                        stream.write('\r\nlogout\r\n');
                                        stream.end();
                                        return;
                                    } else if (command === 'ls' || command === 'dir') {
                                        stream.write('\r\nbackup.tar.gz  config.json  notes.txt\r\n');
                                    } else if (command === 'id' || command === 'whoami') {
                                        stream.write(`\r\nuid=0(${successfulUser || 'root'}) gid=0(root) groups=0(root)\r\n`);
                                    } else if (command === 'uname -a') {
                                        stream.write('\r\nLinux ubuntu-honeypot 5.15.0-88-generic #98-Ubuntu SMP x86_64 GNU/Linux\r\n');
                                    } else {
                                        stream.write(`\r\nbash: ${command}: command not found\r\n`);
                                    }
                                } else {
                                    stream.write('\r\n');
                                }

                                stream.write(prompt);
                            }
                            else if (byte >= 0x20 && byte <= 0x7E) {
                                const char = String.fromCharCode(byte);
                                inputBuffer += char;
                                stream.write(char);
                            }
                        }
                    });
                });
            });
        });

        client.on('close', () => {
            console.log(`[-] [SSH] Client ended the session: ${ip}. Number of prompted commands: ${executedCommands.length}`);

            const authLog = {
                sourceIp: ip,
                sourcePort: port,
                targetPort: 2222,
                clientVersion: client.identRaw || 'Unknown',
                rawPayload: JSON.stringify({
                    kex_raw: rawPayloadHex,
                    total_commands: executedCommands.length,
                    closed_at: new Date().toISOString()
                }),
                attemptedUsername: successfulUser,
                attemptedPassword: successfulPass || null,
                method: method,
                publicKeyFingerprint: publicKeyFingerprint || null,
                commandsExecuted: JSON.stringify(executedCommands)
            };

            try {
                addSshLog(authLog);
            } catch (err) {
                console.error('[DB ERROR]:', err);
            }
        });

        client.on('error', (err) => {
            console.log(`[ERROR] IP: ${ip} (${err.message})`);
        });
    });

    server.listen(2222, '0.0.0.0', () =>
        console.log('SSH honeypot listening on port 2222')
    );
}

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