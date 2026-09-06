// Production Redis Distributed Cache Provider speaking Redis Wire Protocol (RESP) over real TCP
import net from 'net';
import { CacheProvider } from '../enterprise/InfrastructureProviders';
import { CacheStats } from '../../schema/platform-v9';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  keyPrefix?: string;
  connectTimeoutMs?: number;
}

export class SimpleRedisWireClient {
  private socket: net.Socket | null = null;
  public isConnected = false;
  private buffer = '';
  private pendingCommands: Array<{
    resolve: (val: any) => void;
    reject: (err: any) => void;
  }> = [];

  constructor(public config: RedisConfig) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      });

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Redis connection to ${this.config.host}:${this.config.port} timed out`));
      }, this.config.connectTimeoutMs || 3000);

      socket.on('connect', () => {
        clearTimeout(timer);
        this.socket = socket;
        this.isConnected = true;
        resolve();
      });

      socket.on('data', (chunk) => {
        this.buffer += chunk.toString('utf8');
        this.processBuffer();
      });

      socket.on('error', (err) => {
        clearTimeout(timer);
        this.isConnected = false;
        if (this.pendingCommands.length > 0) {
          const next = this.pendingCommands.shift();
          next?.reject(err);
        } else {
          reject(err);
        }
      });

      socket.on('close', () => {
        this.isConnected = false;
        this.socket = null;
      });
    });
  }

  private processBuffer(): void {
    while (this.buffer.length > 0 && this.pendingCommands.length > 0) {
      const parsed = this.parseResp(this.buffer);
      if (parsed === null) break; // Incomplete response

      this.buffer = this.buffer.slice(parsed.bytesRead);
      const cmd = this.pendingCommands.shift();
      cmd?.resolve(parsed.value);
    }
  }

  private parseResp(str: string): { value: any; bytesRead: number } | null {
    if (str.length === 0) return null;
    const type = str[0];
    const crlf = str.indexOf('\r\n');
    if (crlf === -1) return null;

    if (type === '+') {
      // Simple string
      return { value: str.slice(1, crlf), bytesRead: crlf + 2 };
    }
    if (type === '-') {
      // Error
      return { value: new Error(str.slice(1, crlf)), bytesRead: crlf + 2 };
    }
    if (type === ':') {
      // Integer
      return { value: parseInt(str.slice(1, crlf), 10), bytesRead: crlf + 2 };
    }
    if (type === '$') {
      // Bulk string
      const len = parseInt(str.slice(1, crlf), 10);
      if (len === -1) {
        return { value: null, bytesRead: crlf + 2 };
      }
      const dataStart = crlf + 2;
      const dataEnd = dataStart + len;
      if (str.length < dataEnd + 2) return null; // Incomplete
      return { value: str.slice(dataStart, dataEnd), bytesRead: dataEnd + 2 };
    }
    if (type === '*') {
      // Array
      const count = parseInt(str.slice(1, crlf), 10);
      if (count === -1) return { value: null, bytesRead: crlf + 2 };

      let offset = crlf + 2;
      const arr: any[] = [];
      for (let i = 0; i < count; i++) {
        const sub = this.parseResp(str.slice(offset));
        if (sub === null) return null;
        arr.push(sub.value);
        offset += sub.bytesRead;
      }
      return { value: arr, bytesRead: offset };
    }

    return null;
  }

  async sendCommand(args: string[]): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Redis socket is not connected');
    }

    return new Promise((resolve, reject) => {
      this.pendingCommands.push({ resolve, reject });

      // Format as RESP Array of Bulk Strings: *<count>\r\n$<len>\r\n<arg>\r\n...
      let payload = `*${args.length}\r\n`;
      for (const arg of args) {
        const bytes = Buffer.byteLength(arg, 'utf8');
        payload += `$${bytes}\r\n${arg}\r\n`;
      }

      this.socket?.write(payload, (err) => {
        if (err) reject(err);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      try {
        this.socket.end();
      } catch {
        // ignore
      }
      this.socket = null;
      this.isConnected = false;
    }
    this.buffer = '';
  }
}

export class RedisCacheProvider implements CacheProvider {
  private client: SimpleRedisWireClient;
  private prefix: string;
  private fallbackMemoryMap: Map<string, { value: any; expiresAt: number; tags: string[] }> = new Map();
  private hits = 0;
  private misses = 0;
  public failureAlerts: string[] = [];
  public isFailureInjected = false;

  constructor(config?: Partial<RedisConfig>) {
    this.prefix = config?.keyPrefix || 'apex:';
    this.client = new SimpleRedisWireClient({
      host: config?.host || process.env.REDIS_HOST || '127.0.0.1',
      port: config?.port || parseInt(process.env.REDIS_PORT || '6379', 10),
      connectTimeoutMs: config?.connectTimeoutMs || 1500,
    });
  }

  private getKey(key: string, namespace?: string): string {
    return `${this.prefix}${namespace || 'default'}:${key}`;
  }

  private getTagSetKey(tag: string): string {
    return `${this.prefix}tags:${tag}`;
  }

  private getNamespaceSetKey(namespace: string): string {
    return `${this.prefix}ns:${namespace}`;
  }

  async ensureConnected(): Promise<boolean> {
    if (this.isFailureInjected) return false;
    if (this.client.isConnected) return true;
    try {
      await this.client.connect();
      return true;
    } catch (err: any) {
      this.failureAlerts.push(`Redis connection error: ${err.message}`);
      return false;
    }
  }

  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.getKey(key, namespace);
    const connected = await this.ensureConnected();

    if (!connected) {
      // Graceful degradation: Check fallback or return null
      const fallback = this.fallbackMemoryMap.get(fullKey);
      if (fallback && fallback.expiresAt > Date.now()) {
        this.hits++;
        return fallback.value as T;
      }
      this.misses++;
      return null;
    }

    try {
      const raw = await this.client.sendCommand(['GET', fullKey]);
      if (raw === null || raw === undefined) {
        this.misses++;
        return null;
      }
      this.hits++;
      return JSON.parse(raw) as T;
    } catch (err: any) {
      this.failureAlerts.push(`Redis GET error for key ${fullKey}: ${err.message}`);
      this.misses++;
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
    options?: { namespace?: string; tags?: string[]; organizationId?: string; projectId?: string }
  ): Promise<boolean> {
    const fullKey = this.getKey(key, options?.namespace);
    const serialized = JSON.stringify(value);
    const connected = await this.ensureConnected();

    const ttl = ttlSeconds !== undefined ? Math.max(ttlSeconds, 0.001) : undefined;
    const expiresAt = Date.now() + (ttl ? ttl * 1000 : 365 * 24 * 3600 * 1000);

    // Maintain in memory fallback for resilience
    this.fallbackMemoryMap.set(fullKey, {
      value,
      expiresAt,
      tags: options?.tags || [],
    });

    if (!connected) {
      this.failureAlerts.push(`[DEGRADED] Redis disconnected. Cached key ${fullKey} in memory fallback.`);
      return true;
    }

    try {
      if (ttl !== undefined && ttl > 0) {
        const ceilSeconds = Math.max(Math.ceil(ttl), 1);
        await this.client.sendCommand(['SET', fullKey, serialized, 'EX', ceilSeconds.toString()]);
      } else {
        await this.client.sendCommand(['SET', fullKey, serialized]);
      }

      // Record key in tag sets
      if (options?.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.client.sendCommand(['SADD', this.getTagSetKey(tag), fullKey]);
        }
      }

      // Record key in namespace set
      if (options?.namespace) {
        await this.client.sendCommand(['SADD', this.getNamespaceSetKey(options.namespace), fullKey]);
      }
      return true;
    } catch (err: any) {
      this.failureAlerts.push(`Redis SET error for key ${fullKey}: ${err.message}`);
      return false;
    }
  }

  async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.getKey(key, namespace);
    this.fallbackMemoryMap.delete(fullKey);

    const connected = await this.ensureConnected();
    if (!connected) return true;

    try {
      const res = await this.client.sendCommand(['DEL', fullKey]);
      return res > 0;
    } catch {
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    const tagKey = this.getTagSetKey(tag);
    let count = 0;

    // Purge from fallback map
    for (const [k, item] of Array.from(this.fallbackMemoryMap.entries())) {
      if (item.tags.includes(tag)) {
        this.fallbackMemoryMap.delete(k);
        count++;
      }
    }

    const connected = await this.ensureConnected();
    if (!connected) return count;

    try {
      const members: string[] = await this.client.sendCommand(['SMEMBERS', tagKey]);
      if (Array.isArray(members) && members.length > 0) {
        await this.client.sendCommand(['DEL', ...members]);
        await this.client.sendCommand(['DEL', tagKey]);
        return Math.max(members.length, count);
      }
    } catch (err: any) {
      this.failureAlerts.push(`Redis invalidateByTag error for ${tag}: ${err.message}`);
    }

    return count;
  }

  async invalidateNamespace(namespace: string): Promise<number> {
    const nsKey = this.getNamespaceSetKey(namespace);
    let count = 0;

    for (const k of Array.from(this.fallbackMemoryMap.keys())) {
      if (k.startsWith(`${this.prefix}${namespace}:`)) {
        this.fallbackMemoryMap.delete(k);
        count++;
      }
    }

    const connected = await this.ensureConnected();
    if (!connected) return count;

    try {
      const members: string[] = await this.client.sendCommand(['SMEMBERS', nsKey]);
      if (Array.isArray(members) && members.length > 0) {
        await this.client.sendCommand(['DEL', ...members]);
        await this.client.sendCommand(['DEL', nsKey]);
        return Math.max(members.length, count);
      }
    } catch (err: any) {
      this.failureAlerts.push(`Redis invalidateNamespace error for ${namespace}: ${err.message}`);
    }

    return count;
  }

  async getStats(): Promise<CacheStats> {
    const total = this.hits + this.misses;
    const hitRatePercent = total > 0 ? Math.round((this.hits / total) * 100) : 0;

    let entryCount = this.fallbackMemoryMap.size;
    const connected = await this.ensureConnected();
    if (connected) {
      try {
        const dbsize = await this.client.sendCommand(['DBSIZE']);
        if (typeof dbsize === 'number') entryCount = dbsize;
      } catch {
        // ignore
      }
    }

    return {
      hits: this.hits,
      misses: this.misses,
      entryCount,
      sizeBytes: entryCount * 512,
    };
  }

  async clear(): Promise<boolean> {
    this.fallbackMemoryMap.clear();
    this.hits = 0;
    this.misses = 0;

    const connected = await this.ensureConnected();
    if (connected) {
      try {
        await this.client.sendCommand(['FLUSHDB']);
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  // Failure Injection Harness: Sever Redis socket connection mid-operation
  injectConnectionFailure(): void {
    this.isFailureInjected = true;
    this.client.disconnect();
    this.failureAlerts.push('[FAILURE_INJECTED] Redis socket severed. Operating in degraded fallback mode.');
  }

  // Restore healthy connection
  restoreConnection(): void {
    this.isFailureInjected = false;
  }

  close(): void {
    this.client.disconnect();
  }
}
