const PDNS_API = 'http://localhost:8081/api/v1/servers/localhost';
const PDNS_KEY = 'pdns_api_key_dev';

export interface DnsRecord {
  name: string;
  type: string;
  ttl: number;
  records: { content: string; disabled: boolean }[];
}

export class DnsService {
  async createZone(domain: string): Promise<void> {
    const body = {
      name: `${domain}.`,
      kind: 'Native',
      nameservers: ['ns1.serverpilot.local.'],
      soa_edit_api: 'DEFAULT',
      account: 'serverpilot',
    };

    const res = await fetch(`${PDNS_API}/zones`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok && res.status !== 409) {
      const text = await res.text();
      console.warn(`[DNS] Failed to create zone ${domain}: ${text}`);
    }

    await this.addRecord(domain, 'www', 'A', '127.0.0.1', 3600);
    await this.addRecord(domain, '@', 'A', '127.0.0.1', 3600);
    await this.addRecord(domain, '@', 'MX', `10 mail.${domain}.`, 3600);
    await this.addRecord(domain, 'mail', 'A', '127.0.0.1', 3600);
  }

  async deleteZone(domain: string): Promise<void> {
    const res = await fetch(`${PDNS_API}/zones/${domain}.`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[DNS] Failed to delete zone ${domain}: ${text}`);
    }
  }

  async addRecord(
    zone: string,
    name: string,
    type: string,
    content: string,
    ttl = 3600,
  ): Promise<void> {
    const fqdn = name === '@' ? `${zone}.` : `${name}.${zone}.`;

    const body = {
      rrsets: [{
        name: fqdn,
        type,
        ttl,
        changetype: 'REPLACE',
        records: [{ content, disabled: false, setptr: false }],
      }],
    };

    await fetch(`${PDNS_API}/zones/${zone}.`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
  }

  async removeRecord(zone: string, name: string, type: string): Promise<void> {
    const fqdn = name === '@' ? `${zone}.` : `${name}.${zone}.`;

    const body = {
      rrsets: [{
        name: fqdn,
        type,
        changetype: 'DELETE',
      }],
    };

    await fetch(`${PDNS_API}/zones/${zone}.`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
  }

  async listRecords(zone: string): Promise<DnsRecord[]> {
    const res = await fetch(`${PDNS_API}/zones/${zone}.`, {
      headers: this.headers(),
    });

    if (!res.ok) return [];

    const data = await res.json();
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

  private headers(): Record<string, string> {
    return {
      'X-API-Key': PDNS_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
