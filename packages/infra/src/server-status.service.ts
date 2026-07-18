import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface ServiceInfo {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  version?: string;
  containerName: string;
}

interface ResourceStats {
  cpu: { percent: number; loadAvg: string };
  memory: { used: string; total: string; percent: number };
  disk: { used: string; total: string; percent: number };
  network: { rx: string; tx: string };
}

export interface ServerStatus {
  services: ServiceInfo[];
  stats: ResourceStats;
  lastCheck: string;
}

const SERVICES_CONFIG: { name: string; containerName: string; versionCmd: string }[] = [
  { name: 'Web Server (Nginx)', containerName: 'serverpilot-nginx', versionCmd: 'nginx -v 2>&1' },
  { name: 'Database (PostgreSQL)', containerName: 'serverpilot-postgres', versionCmd: 'psql --version' },
  { name: 'Database (MariaDB)', containerName: 'serverpilot-mariadb', versionCmd: 'mariadb --version' },
  { name: 'Redis Cache', containerName: 'serverpilot-redis', versionCmd: 'redis-server --version 2>&1 | head -1' },
  { name: 'Email (Postfix)', containerName: 'serverpilot-postfix', versionCmd: 'postconf mail_version 2>/dev/null || echo ""' },
  { name: 'Email (Dovecot)', containerName: 'serverpilot-dovecot', versionCmd: 'dovecot --version 2>&1' },
  { name: 'DNS (PowerDNS)', containerName: 'serverpilot-powerdns', versionCmd: 'pdns_server --version 2>&1 | head -1' },
  { name: 'Webmail (SnappyMail)', containerName: 'serverpilot-snappymail', versionCmd: '' },
];

const DOCKER_CMD = (): string => {
  try {
    execSync('sudo podman --version', { stdio: 'ignore' });
    return 'sudo podman';
  } catch {
    return 'docker';
  }
};

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

function formatUptime(startedAt: string): string {
  if (!startedAt) return '-';
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function parseBytes(value: string | number): string {
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} GB`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} MB`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)} KB`;
  return `${num.toFixed(0)} B`;
}

export class ServerStatusService {
  private cmd: string;

  constructor() {
    this.cmd = DOCKER_CMD();
  }

  getStatus(): ServerStatus {
    const services = this.getServices();
    const stats = this.getResourceStats();
    return {
      services,
      stats,
      lastCheck: new Date().toISOString(),
    };
  }

  private getServices(): ServiceInfo[] {
    return SERVICES_CONFIG.map((svc) => {
      const status = this.getContainerStatus(svc.containerName);
      const uptime = status.running ? this.getContainerUptime(svc.containerName) : '-';
      const version = status.running && svc.versionCmd
        ? this.getVersion(svc.containerName, svc.versionCmd)
        : undefined;

      return {
        name: svc.name,
        status: status.running ? 'online' : 'offline',
        uptime,
        version,
        containerName: svc.containerName,
      };
    });
  }

  private getContainerStatus(containerName: string): { running: boolean } {
    const out = run(`${this.cmd} inspect ${containerName} --format '{{.State.Status}}' 2>/dev/null`);
    return { running: out === 'running' };
  }

  private getContainerUptime(containerName: string): string {
    const out = run(`${this.cmd} inspect ${containerName} --format '{{.State.StartedAt}}' 2>/dev/null`);
    return formatUptime(out);
  }

  private getVersion(containerName: string, versionCmd: string): string | undefined {
    const out = run(`${this.cmd} exec ${containerName} sh -c ${JSON.stringify(versionCmd)}`);
    return out || undefined;
  }

  private getResourceStats(): ResourceStats {
    const cpuStats = this.getCpuStats();
    const memStats = this.getMemoryStats();
    const diskStats = this.getDiskStats();
    const netStats = this.getNetworkStats();

    return {
      cpu: cpuStats,
      memory: memStats,
      disk: diskStats,
      network: netStats,
    };
  }

  private getCpuStats(): { percent: number; loadAvg: string } {
    try {
      const loadAvg = readFileSync('/proc/loadavg', 'utf-8').trim().split(/\s+/).slice(0, 3).join(' / ');
      const stat = readFileSync('/proc/stat', 'utf-8');
      const cpuLine = stat.split('\n').find(l => l.startsWith('cpu '));
      if (!cpuLine) return { percent: 0, loadAvg };

      const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number);
      const total = parts.reduce((a, b) => a + b, 0);
      const idle = parts[3] || 0;

      const cached = this._prevCpu;
      if (cached) {
        const diffTotal = total - cached.total;
        const diffIdle = idle - cached.idle;
        const percent = diffTotal > 0
          ? Math.round(((1 - diffIdle / diffTotal) * 100) * 100) / 100
          : 0;
        this._prevCpu = { total, idle };
        return { percent: Math.min(Math.max(percent, 0), 100), loadAvg };
      }

      this._prevCpu = { total, idle };
      return { percent: 0, loadAvg };
    } catch {
      return { percent: 0, loadAvg: '0.00 / 0.00 / 0.00' };
    }
  }

  private _prevCpu?: { total: number; idle: number };

  private getMemoryStats(): { used: string; total: string; percent: number } {
    try {
      const memInfo = readFileSync('/proc/meminfo', 'utf-8');
      const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
      const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)/);

      if (totalMatch && availableMatch) {
        const totalKb = parseInt(totalMatch[1], 10);
        const availableKb = parseInt(availableMatch[1], 10);
        const usedKb = totalKb - availableKb;
        const percent = Math.round((usedKb / totalKb) * 100);

        return {
          total: parseBytes(totalKb * 1024),
          used: parseBytes(usedKb * 1024),
          percent,
        };
      }
    } catch {}

    return { used: '-', total: '-', percent: 0 };
  }

  private getDiskStats(): { used: string; total: string; percent: number } {
    try {
      const df = run('df -BG / 2>/dev/null | tail -1');
      const parts = df.split(/\s+/);
      if (parts.length >= 5) {
        const total = parts[1].replace('G', '');
        const used = parts[2].replace('G', '');
        const pct = parseInt(parts[4].replace('%', ''), 10);
        return {
          total: `${total} GB`,
          used: `${used} GB`,
          percent: isNaN(pct) ? 0 : pct,
        };
      }
    } catch {}

    return { used: '-', total: '-', percent: 0 };
  }

  private getNetworkStats(): { rx: string; tx: string } {
    try {
      const netDev = readFileSync('/proc/net/dev', 'utf-8');
      const lines = netDev.split('\n').slice(2);
      let totalRx = 0;
      let totalTx = 0;

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 10 && parts[0] !== 'lo:') {
          totalRx += parseInt(parts[1], 10) || 0;
          totalTx += parseInt(parts[9], 10) || 0;
        }
      }

      return {
        rx: parseBytes(totalRx),
        tx: parseBytes(totalTx),
      };
    } catch {
      return { rx: '-', tx: '-' };
    }
  }
}
