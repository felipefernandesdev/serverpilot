import * as http from 'http';

const PDNS_API = 'http://127.0.0.1:8081/api/v1/servers/localhost';
const PDNS_KEY = 'pdns_api_key_dev';

const agent = new http.Agent({ keepAlive: false });

function request(method: string, path: string, body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PDNS_API);
    const opts: http.RequestOptions = {
      hostname: url.hostname,
      port: Number(url.port) || 8081,
      path: url.pathname + url.search,
      method,
      agent,
      headers: {
        'X-API-Key': PDNS_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          console.warn(`[DNS] ${method} ${path} → ${res.statusCode}: ${data}`);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`[DNS] Request error ${method} ${path}: ${err.message}`);
      resolve(null);
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  records: { content: string; disabled: boolean }[];
}

export class DnsService {
  async createZone(domain: string): Promise<void> {
    await request('POST', `/zones`, {
      name: `${domain}.`,
      kind: 'Native',
      nameservers: ['ns1.serverpilot.local.'],
      soa_edit_api: 'DEFAULT',
      account: 'serverpilot',
    });

    await this.addRecord(domain, 'www', 'A', '127.0.0.1', 3600);
    await this.addRecord(domain, '@', 'A', '127.0.0.1', 3600);
    await this.addRecord(domain, '@', 'MX', `10 mail.${domain}.`, 3600);
    await this.addRecord(domain, 'mail', 'A', '127.0.0.1', 3600);
  }

  async deleteZone(domain: string): Promise<void> {
    await request('DELETE', `/zones/${domain}.`);
  }

  async addRecord(zone: string, name: string, type: string, content: string, ttl = 3600): Promise<void> {
    const fqdn = name === '@' ? `${zone}.` : `${name}.${zone}.`;

    await request('PATCH', `/zones/${zone}.`, {
      rrsets: [{
        name: fqdn,
        type,
        ttl,
        changetype: 'REPLACE',
        records: [{ content, disabled: false, setptr: false }],
      }],
    });
  }

  async removeRecord(zone: string, name: string, type: string): Promise<void> {
    const fqdn = name === '@' ? `${zone}.` : `${name}.${zone}.`;

    await request('PATCH', `/zones/${zone}.`, {
      rrsets: [{
        name: fqdn,
        type,
        changetype: 'DELETE',
      }],
    });
  }

  async listRecords(zone: string): Promise<DnsRecord[]> {
    const data = await request('GET', `/zones/${zone}.`);
    if (!data) return [];

    return (data.rrsets || []).map((rrset: any) => ({
      name: rrset.name.replace(`.${zone}.`, ''),
      type: rrset.type,
      ttl: rrset.ttl,
      records: (rrset.records || []).map((r: any) => ({
        content: r.content,
        disabled: r.disabled || false,
      })),
    }));
  }
}
