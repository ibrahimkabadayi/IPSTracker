import { startHttpServer } from './servers/http.js';
import { startSshHoneypot } from './servers/ssh.js';
import {startTelnetHoneypot} from "./servers/telnet.js";

export function startHoneypots(io) {
    startHttpServer(io);
    startSshHoneypot(io);
    startTelnetHoneypot(io);
}
