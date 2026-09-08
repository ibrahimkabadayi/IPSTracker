import { Server } from 'ssh2';
import fs from 'fs';
import crypto from 'crypto';
import {addSshLog} from "../../db/database.js";
import {handleConnection} from "../connectionHandler.js";


export function startSshHoneypot(io) {
    const server = new Server({
        hostKeys: [fs.readFileSync('host_key')]
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

        let rawPayload;

        client.on('handshake', (negotiated) => {
            console.log('[RAW KEX PAYLOAD Buffer]:', negotiated.raw);
            console.log('[RAW KEX Hex]:', negotiated.raw?.toString('hex'));
            rawPayload = negotiated.raw?.toString('hex');
        });

        client.on('authentication', (ctx) => {
            const clientVersion = client.identRaw || 'Unknown';

            const authAttempt = {
                sourceIp: ip,
                sourcePort: port,
                targetPort: 2222,
                clientVersion,
                rawPayload,
                attemptedUsername: ctx.username,
                method: ctx.method,
            };

            if (ctx.method === 'password') {
                authAttempt.attemptedPassword = ctx.password;
                console.log(`[AUTH-PASSWORD] IP: ${ip} | User: ${ctx.username} | Pass: ${ctx.password} | Client: ${clientVersion}`);
            }
            else if (ctx.method === 'publickey') {
                const fingerprint = crypto.createHash('sha256').update(ctx.key.data).digest('base64');
                authAttempt.keyAlgo = ctx.key.algo;
                authAttempt.publicKeyFingerprint = `SHA256:${fingerprint}`;

                console.log(`[AUTH-PUBKEY] IP: ${ip} | User: ${ctx.username} | Algo: ${ctx.key.algo} | Fingerprint: SHA256:${fingerprint}`);
            }
            else if (ctx.method === 'none') {
                console.log(`[AUTH-PROBE] IP: ${ip} (none method)`);
            }

            addSshLog(authAttempt);
            ctx.reject();
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