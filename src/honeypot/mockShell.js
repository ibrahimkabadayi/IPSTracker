const CRLF = '\r\n';

export function executeFakeCommand(rawLine, prompt = '# ') {
    const line = rawLine.trim();
    let response = '';

    const cmd = line.toLowerCase();

    if (!cmd) {
        return { response: prompt, shouldExit: false };
    }

    if (cmd === 'sh' || cmd === 'shell' || cmd === 'bash') {
        response = '';
    }

    else if (cmd.includes('/proc/mounts')) {
        response = `rootfs / rootfs rw 0 0${CRLF}/dev/root / squashfs ro 0 0${CRLF}tmpfs /tmp tmpfs rw,nosuid,nodev 0 0${CRLF}`;
    }
    else if (cmd.includes('/proc/cpuinfo')) {
        response = `system type\t\t: MIPS 24KEc V5.0${CRLF}cpu model\t\t: MIPS 24KEc V5.0${CRLF}BogoMIPS\t\t: 385.84${CRLF}`;
    }
    else if (cmd.includes('/proc/net/route')) {
        response = `Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask${CRLF}eth0\t00000000\t0102A8C0\t0003\t0\t0\t0\t00000000${CRLF}`;
    }
    else if (cmd.includes('/etc/passwd')) {
        response = `root:x:0:0:root:/root:/bin/sh${CRLF}daemon:x:1:1:daemon:/usr/sbin:/bin/sh${CRLF}bin:x:2:2:bin:/bin:/bin/sh${CRLF}`;
    }
    else if (cmd === 'uname' || cmd.startsWith('uname ')) {
        response = `Linux router 3.10.14 #1 SMP PREEMPT Fri Sep 11 2026 mips GNU/Linux${CRLF}`;
    }
    else if (cmd === 'id' || cmd === 'whoami') {
        response = `uid=0(root) gid=0(root) groups=0(root)${CRLF}`;
    }
    else if (cmd === 'pwd') {
        response = `/root${CRLF}`;
    }

    else if (cmd === 'ps' || cmd.startsWith('ps ')) {
        response = `  PID USER       TIME  COMMAND${CRLF}    1 root       0:02 init${CRLF}   88 root       0:00 /usr/sbin/dropbear${CRLF}  134 root       0:00 busybox udhcpc${CRLF}  201 root       0:00 -sh${CRLF}`;
    }
    else if (cmd === 'free' || cmd.startsWith('free ')) {
        response = `             total       used       free     shared    buffers${CRLF}Mem:        61508      45820      15688          0       2104${CRLF}-/+ buffers:            43716      17792${CRLF}Swap:            0          0          0${CRLF}`;
    }
    else if (cmd === 'df' || cmd.startsWith('df ')) {
        response = `Filesystem           1K-blocks      Used Available Use% Mounted on${CRLF}rootfs                    7168      7168         0 100% /${CRLF}/dev/root                 7168      7168         0 100% /${CRLF}tmpfs                    30754        84     30670   0% /tmp${CRLF}`;
    }
    else if (cmd === 'ifconfig' || cmd.startsWith('ifconfig ') || cmd === 'ip a' || cmd === 'ip addr') {
        response = `eth0      Link encap:Ethernet  HWaddr 00:1A:2B:3C:4D:5E${CRLF}          inet addr:192.168.1.1  Bcast:192.168.1.255  Mask:255.255.255.0${CRLF}          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1${CRLF}`;
    }
    else if (cmd === 'netstat' || cmd.startsWith('netstat ')) {
        response = `Active Internet connections (servers and established)${CRLF}Proto Recv-Q Send-Q Local Address           Foreign Address         State${CRLF}tcp        0      0 0.0.0.0:23              0.0.0.0:*               LISTEN${CRLF}tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN${CRLF}tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN${CRLF}`;
    }

    else if (cmd === 'busybox' || cmd.startsWith('busybox ') || cmd.startsWith('/bin/busybox')) {
        response = `BusyBox v1.19.4 (2016-06-06 22:16:13 EDT) multi-call binary.${CRLF}`;
    }

    else if (cmd.startsWith('wget') || cmd.startsWith('curl') || cmd.startsWith('tftp')) {
        response = `Connecting to host... connected.${CRLF}HTTP request sent, awaiting response... 404 Not Found${CRLF}`;
    }

    else if (cmd.startsWith('crontab ') || cmd.includes('>> /etc/crontab') || cmd.includes('>>/etc/crontab')) {
        response = '';
    }
    else if (cmd === 'history -c' || cmd.startsWith('history ')) {
        response = '';
    }
    else if (cmd.startsWith('iptables ') || cmd.startsWith('service iptables')) {
        response = '';
    }

    else if (cmd === 'ls' || cmd === 'dir' || cmd.startsWith('ls ')) {
        response = `bin   dev   etc   home  lib   mnt   proc  root  sbin  tmp   usr   var${CRLF}`;
    }
    else if (cmd.startsWith('echo ')) {
        response = `${line.slice(5)}${CRLF}`;
    }
    else if (cmd.startsWith('rm ') || cmd.startsWith('chmod ') || cmd.startsWith('killall') || cmd.startsWith('kill ')) {
        response = '';
    }
    else if (cmd === 'exit' || cmd === 'logout' || cmd === 'quit') {
        return { response: `logout${CRLF}`, shouldExit: true };
    }
    else {
        response = `sh: ${line.split(' ')[0]}: not found${CRLF}`;
    }

    return {
        response: `${response}${prompt}`,
        shouldExit: false
    };
}