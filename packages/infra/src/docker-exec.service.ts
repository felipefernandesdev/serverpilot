import { execSync } from 'child_process';

const DOCKER_CMD = () => {
  try {
    execSync('podman --version', { stdio: 'ignore' });
    return 'podman';
  } catch {
    return 'docker';
  }
};

const CONTAINERS = {
  nginx: 'serverpilot-nginx',
  postfix: 'serverpilot-postfix',
  dovecot: 'serverpilot-dovecot',
  mariadb: 'serverpilot-mariadb',
} as const;

export class DockerExecService {
  private cmd: string;

  constructor() {
    this.cmd = DOCKER_CMD();
  }

  exec(container: keyof typeof CONTAINERS, command: string): string {
    const cname = CONTAINERS[container];
    return execSync(
      `${this.cmd} exec ${cname} sh -c ${JSON.stringify(command)}`,
      { encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
  }

  execRaw(containerName: string, command: string): string {
    return execSync(
      `${this.cmd} exec ${containerName} sh -c ${JSON.stringify(command)}`,
      { encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
  }

  fileExists(container: keyof typeof CONTAINERS, path: string): boolean {
    try {
      this.exec(container, `test -f ${path} && echo 'yes'`);
      return true;
    } catch {
      return false;
    }
  }

  writeFile(container: keyof typeof CONTAINERS, path: string, content: string): void {
    const escaped = content.replace(/'/g, "'\\''");
    this.exec(container, `cat > ${path} << 'EOF'\n${content}\nEOF`);
  }

  mkdir(container: keyof typeof CONTAINERS, path: string): void {
    this.exec(container, `mkdir -p ${path}`);
  }

  rm(container: keyof typeof CONTAINERS, path: string): void {
    this.exec(container, `rm -rf ${path}`);
  }
}
