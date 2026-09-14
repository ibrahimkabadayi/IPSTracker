const TTP_RULES = [
    {
        tactic: 'Discovery',
        technique: 'T1082 - System Information Discovery',
        tag: 'DISCOVERY',
        color: '#58a6ff',
        regex: /\b(uname|cat \/proc\/cpuinfo|hostname|uptime|lscpu|cat \/etc\/*release)\b/i
    },
    {
        tactic: 'Discovery',
        technique: 'T1016 - System Network Configuration Discovery',
        tag: 'NET_DISCOVERY',
        color: '#388bfd',
        regex: /\b(ifconfig|ip a|ip route|netstat|ss|route|arp)\b/i
    },
    {
        tactic: 'Discovery',
        technique: 'T1087 - Account Discovery',
        tag: 'USER_DISCOVERY',
        color: '#79c0ff',
        regex: /\b(whoami|id|cat \/etc\/passwd|w|who|last)\b/i
    },
    {
        tactic: 'Credential Access',
        technique: 'T1003 - OS Credential Dumping',
        tag: 'CRED_DUMP',
        color: '#f85149',
        regex: /\b(cat \/etc\/shadow|cat \/etc\/master\.passwd|unshadow)\b/i
    },
    {
        tactic: 'Command and Control / Ingress',
        technique: 'T1105 - Ingress Tool Transfer',
        tag: 'TOOL_TRANSFER',
        color: '#d29922',
        regex: /\b(wget|curl|tftp|scp|ftp|nc|netcat)\b/i
    },
    {
        tactic: 'Defense Evasion',
        technique: 'T1070 - Indicator Removal',
        tag: 'DEF_EVASION',
        color: '#bc8cff',
        regex: /\b(history -c|rm -rf|shred|unset HISTFILE|kill)\b/i
    },
    {
        tactic: 'Persistence',
        technique: 'T1053 - Scheduled Task/Job',
        tag: 'PERSISTENCE',
        color: '#ff7b72',
        regex: /\b(crontab|at|systemctl enable)\b/i
    }
];

export function classifyCommand(cmdLine) {
    if (!cmdLine || typeof cmdLine !== 'string') {
        return null;
    }

    const clean = cmdLine.trim();

    for (const rule of TTP_RULES) {
        if (rule.regex.test(clean)) {
            return {
                tactic: rule.tactic,
                technique: rule.technique,
                tag: rule.tag,
                color: rule.color
            };
        }
    }

    return {
        tactic: 'Execution',
        technique: 'T1059 - Command and Scripting Interpreter',
        tag: 'EXECUTION',
        color: '#8b949e'
    };
}