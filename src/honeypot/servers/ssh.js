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
        let attemptCount = 0;

        console.log(`\n[+] New Connection: ${ip}:${port} (${family})`);

        if (!handleConnection(io, ip, 2222)) {
            console.log(`[-] Connection blocked by handleConnection: ${ip}`);
            client._sock?.destroy();
            return;
        }

        let rawPayloadHex = null;

        client.on('handshake', (negotiated) => {
            console.log('[RAW KEX PAYLOAD Buffer]:', negotiated.raw);
            console.log('[RAW KEX Hex]:', negotiated.raw?.toString('hex'));
            rawPayloadHex = negotiated.raw?.toString('hex') || null;
        });

        client.on('authentication', (ctx) => {
            const clientVersion = client.identRaw || 'Unknown';

            const rawPayloadJson = JSON.stringify({
                kex_raw: rawPayloadHex,
                auth_method: ctx.method,
                timestamp: new Date().toISOString()
            });

            const authAttempt = {
                sourceIp: ip,
                sourcePort: port,
                targetPort: 2222,
                clientVersion,
                rawPayload: rawPayloadJson,
                attemptedUsername: ctx.username,
                method: ctx.method,
            };

            if (ctx.method === 'password') {
                attemptCount++;
                authAttempt.attemptedPassword = ctx.password;
                console.log(`[AUTH-PASSWORD] IP: ${ip} | User: ${ctx.username} | Pass: ${ctx.password} | Client: ${clientVersion}`);
            }
            else if (ctx.method === 'publickey') {
                attemptCount++;
                const fingerprint = crypto.createHash('sha256').update(ctx.key.data).digest('base64');
                authAttempt.keyAlgo = ctx.key.algo;
                authAttempt.publicKeyFingerprint = `SHA256:${fingerprint}`;

                console.log(`[AUTH-PUBKEY] IP: ${ip} | User: ${ctx.username} | Algo: ${ctx.key.algo} | Fingerprint: SHA256:${fingerprint}`);
            }
            else if (ctx.method === 'none') {
                console.log(`[AUTH-PROBE] IP: ${ip} (none method)`);
            }

            try {
                addSshLog(authAttempt);
            } catch (err) {
                console.error('[DB ERROR]:', err);
            }

            if (attemptCount >= 3) {
                ctx.accept();
            } else {
                ctx.reject(['password', 'keyboard-interactive']);
            }
        });

        client.on('ready', () => {
            console.log('[+] Client has entered the system, waiting for session...');

            client.on('session', (accept, reject) => {
                const session = accept();

                session.on('exec', (accept, reject, info) => {
                   console.log(`[EXEC COMMAND]: ${info.command}`);
                   const stream = accept();
                   stream.write('Permission denied\r\n');
                   stream.exit(0);
                   stream.end();
                });

                session.on('pty', (accept, reject, info) => {
                    accept();
                });

                session.on('shell', (accept, reject) => {
                    const stream = accept();

                    stream.write('Welcome to Ubuntu 22.04 LTS\\r\\nroot@RouterOS v6.48')

                    let inputBuffer = '';

                    stream.on('data', (data) => {
                       const char = data.toString('utf-8');

                       if (char === '\r' || char === '\n') {
                           const command = inputBuffer.trim();
                           inputBuffer = '';

                           console.log(`[ATTACKER COMMAND]: ${command}`);

                           if (command === 'ls') {
                               stream.write('\r\nfile.txt secret.env\r\nroot@honeypot:\n~# ');
                           } else if (command === 'exit') {
                               stream.end();
                           } else {
                               stream.write(`\r\nbash: ${command}: command not found\r\nroot@honeypot:~# `);
                           }
                       } else {
                           inputBuffer += char;
                           stream.write(char);
                       }
                    });
                });
            });
        });

        client.on('error', (err) => {
            console.log(`[ERROR] IP: ${ip} (${err.message})`);
        });

        client.on('end', () => {
            console.log('Client disconnected');
        });
    });

    server.listen(2222, '0.0.0.0', () =>
        console.log('SSH honeypot listening on port 2222')
    );
}