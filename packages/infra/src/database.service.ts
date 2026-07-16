import { DockerExecService } from './docker-exec.service';

export class DatabaseProvisioningService {
  constructor(private readonly docker: DockerExecService) {}

  async createDatabase(dbName: string, userName: string, password: string): Promise<void> {
    this.docker.exec('mariadb', `mysql -u root -p${this.rootPass()} -e "
      CREATE DATABASE IF NOT EXISTS \\\`${dbName}\\\`
        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      CREATE USER IF NOT EXISTS '${userName}'@'%' IDENTIFIED BY '${password}';
      GRANT ALL PRIVILEGES ON \\\`${dbName}\\\`.* TO '${userName}'@'%';
      FLUSH PRIVILEGES;
    "`);
  }

  async dropDatabase(dbName: string, userName: string): Promise<void> {
    this.docker.exec('mariadb', `mysql -u root -p${this.rootPass()} -e "
      DROP DATABASE IF EXISTS \\\`${dbName}\\\`;
      DROP USER IF EXISTS '${userName}'@'%';
      FLUSH PRIVILEGES;
    "`);
  }

  getConnectionString(dbName: string, userName: string, password: string): string {
    return `mysql://${userName}:${password}@localhost:3307/${dbName}`;
  }

  getConnectionInfo(
    dbName: string,
    userName: string,
    password: string,
  ): { host: string; port: number; database: string; user: string; password: string } {
    return {
      host: 'localhost',
      port: 3307,
      database: dbName,
      user: userName,
      password,
    };
  }

  private rootPass(): string {
    return 'serverpilot_root';
  }
}
