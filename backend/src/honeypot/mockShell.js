const CRLF = '\r\n';

export function executeFakeCommand(rawLine, prompt = 'root@ubuntu-server:~# ') {
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
        response = `/dev/sda1 / ext4 rw,relatime,errors=remount-ro 0 0${CRLF}tmpfs /run tmpfs rw,nosuid,nodev,noexec,relatime,size=815104k,mode=755 0 0${CRLF}/dev/sda15 /boot/efi vfat rw,relatime,fmask=0022,dmask=0022,codepage=437,iocharset=iso8859-1,shortname=mixed,errors=remount-ro 0 0${CRLF}`;
    }
    else if (cmd.includes('/proc/cpuinfo')) {
        response = `processor\t: 0${CRLF}vendor_id\t: GenuineIntel${CRLF}cpu family\t: 6${CRLF}model\t\t: 85${CRLF}model name\t: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz${CRLF}cpu MHz\t\t: 2992.968${CRLF}cache size\t: 36608 KB${CRLF}`;
    }
    else if (cmd.includes('/proc/net/route')) {
        response = `Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT${CRLF}eth0\t00000000\t0101A8C0\t0003\t0\t0\t100\t00000000\t0\t0\t0${CRLF}eth0\t0001A8C0\t00000000\t0001\t0\t0\t100\t00FFFFFF\t0\t0\t0${CRLF}`;
    }
    else if (cmd.includes('/etc/passwd')) {
        response = `root:x:0:0:root:/root:/bin/bash${CRLF}daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin${CRLF}bin:x:2:2:bin:/bin:/usr/sbin/nologin${CRLF}sys:x:3:3:sys:/dev:/usr/sbin/nologin${CRLF}www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin${CRLF}ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash${CRLF}`;
    }
    else if (cmd.includes('/etc/os-release') || cmd.includes('/etc/issue')) {
        response = `PRETTY_NAME="Ubuntu 22.04.3 LTS"${CRLF}NAME="Ubuntu"${CRLF}VERSION_ID="22.04"${CRLF}VERSION="22.04.3 LTS (Jammy Jellyfish)"${CRLF}ID=ubuntu${CRLF}`;
    }
    else if (cmd === 'uname' || cmd.startsWith('uname ')) {
        response = `Linux ubuntu-server 5.15.0-88-generic #98-Ubuntu SMP Mon Oct 2 15:18:56 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux${CRLF}`;
    }
    else if (cmd === 'id' || cmd === 'whoami') {
        response = `uid=0(root) gid=0(root) groups=0(root)${CRLF}`;
    }
    else if (cmd === 'pwd') {
        response = `/root${CRLF}`;
    }

    else if (cmd === 'ps' || cmd.startsWith('ps ')) {
        response = `    PID TTY          TIME CMD${CRLF}      1 ?        00:00:02 systemd${CRLF}    582 ?        00:00:00 systemd-journal${CRLF}    741 ?        00:00:00 cron${CRLF}    812 ?        00:00:01 apache2${CRLF}    944 ?        00:00:00 sshd${CRLF}   1204 pts/0    00:00:00 bash${CRLF}   1289 pts/0    00:00:00 ps${CRLF}`;
    }
    else if (cmd === 'free' || cmd.startsWith('free ')) {
        response = `               total        used        free      shared  buff/cache   available${CRLF}Mem:         8151048     1245892     4892144       18240     2013012     6584200${CRLF}Swap:        2097148           0     2097148${CRLF}`;
    }
    else if (cmd === 'df' || cmd.startsWith('df ')) {
        response = `Filesystem     1K-blocks     Used Available Use% Mounted on${CRLF}/dev/sda1       40629472  8421092  30124800  22% /${CRLF}tmpfs            4075524        0   4075524   0% /dev/shm${CRLF}/dev/sda15        106858     6185    100673   6% /boot/efi${CRLF}`;
    }

    else if (cmd === 'ifconfig' || cmd.startsWith('ifconfig ')) {
        response = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500${CRLF}        inet 192.168.1.15  netmask 255.255.255.0  broadcast 192.168.1.255${CRLF}        inet6 fe80::216:3eff:fe24:88ab  prefixlen 64  scopeid 0x20<link>${CRLF}        ether 00:16:3e:24:88:ab  txqueuelen 1000  (Ethernet)${CRLF}`;
    }
    else if (cmd === 'ip a' || cmd === 'ip addr') {
        response = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN${CRLF}    inet 127.0.0.1/8 scope host lo${CRLF}2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP${CRLF}    inet 192.168.1.15/24 brd 192.168.1.255 scope global eth0${CRLF}`;
    }
    else if (cmd === 'netstat' || cmd.startsWith('netstat ')) {
        response = `Active Internet connections (only servers)${CRLF}Proto Recv-Q Send-Q Local Address           Foreign Address         State${CRLF}tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN${CRLF}tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN${CRLF}tcp        0      0 0.0.0.0:23              0.0.0.0:*               LISTEN${CRLF}`;
    }

    else if (cmd === 'busybox' || cmd.startsWith('busybox ') || cmd.startsWith('/bin/busybox')) {
        response = `bash: busybox: command not found${CRLF}`;
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
    else if (cmd.startsWith('iptables ') || cmd.startsWith('service ufw') || cmd.startsWith('ufw ')) {
        response = '';
    }
    else if (cmd.startsWith('rm ') || cmd.startsWith('chmod ') || cmd.startsWith('killall') || cmd.startsWith('kill ')) {
        response = '';
    }

    else if (cmd === 'ls' || cmd === 'dir' || cmd.startsWith('ls ')) {
        response = `bin   dev  home  lib64       media  opt   root  sbin  sys  usr${CRLF}boot  etc  lib   lost+found  mnt    proc  run   srv   tmp  var${CRLF}`;
    }
    else if (cmd.startsWith('echo ')) {
        response = `${line.slice(5)}${CRLF}`;
    }

    else if (cmd === 'exit' || cmd === 'logout' || cmd === 'quit') {
        return { response: `logout${CRLF}`, shouldExit: true };
    }

    else {
        response = `bash: ${line.split(' ')[0]}: command not found${CRLF}`;
    }

    return {
        response: `${response}${prompt}`,
        shouldExit: false
    };
}