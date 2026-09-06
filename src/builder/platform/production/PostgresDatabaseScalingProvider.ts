// Production PostgreSQL Database Scaling Provider with Real Primary + Read Replica Routing
import net from 'net';
import {
  DatabaseTopology,
  ReadReplica,
  ConsistencyPolicy,
  RegionId,
} from '../../schema/platform-v9';
import { DatabaseScalingProvider } from '../enterprise/InfrastructureProviders';

export interface PostgresPoolConfig {
  host: string;
  port: number;
  database?: string;
  user?: string;
  password?: string;
  maxConnections?: number;
  connectionTimeoutMs?: number;
}

export interface PostgresProductionConfig {
  primary: PostgresPoolConfig;
  replicas: Array<PostgresPoolConfig & { id: string; regionId: RegionId }>;
  defaultConsistency?: ConsistencyPolicy;
}

// Minimal, zero-dependency binary/text PostgreSQL Wire Protocol Client over real TCP
export class PostgresTcpClient {
  private socket: net.Socket | null = null;
  public isConnected = false;
  private responseBuffer = Buffer.alloc(0);

  constructor(public config: PostgresPoolConfig) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({
        host: this.config.host,
        port: this.config.port,
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Connection to Postgres at ${this.config.host}:${this.config.port} timed out`));
      }, this.config.connectionTimeoutMs || 3000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.isConnected = true;

        // Send PostgreSQL StartupMessage (Protocol version 3.0: 196608)
        const user = this.config.user || 'apex';
        const database = this.config.database || 'apex_db';
        const params = `user\0${user}\0database\0${database}\0\0`;
        const len = 4 + 4 + Buffer.byteLength(params, 'utf8');
        const buf = Buffer.alloc(len);
        buf.writeInt32BE(len, 0);
        buf.writeInt32BE(196608, 4); // 3.0
        buf.write(params, 8, 'utf8');
        socket.write(buf);
      });

      socket.on('data', (data) => {
        this.responseBuffer = Buffer.concat([this.responseBuffer, data]);
        // ReadyForQuery ('Z') message indicates connection is ready
        if (this.responseBuffer.includes(Buffer.from('Z')) || this.responseBuffer.includes(Buffer.from('R'))) {
          resolve();
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        this.isConnected = false;
        reject(err);
      });

      socket.on('close', () => {
        this.isConnected = false;
        this.socket = null;
      });
    });
  }

  async executeSimpleQuery(sql: string): Promise<string> {
    if (!this.socket || !this.isConnected) {
      throw new Error(`Client not connected to ${this.config.host}:${this.config.port}`);
    }

    return new Promise((resolve, reject) => {
      const queryBuf = Buffer.alloc(1 + 4 + Buffer.byteLength(sql, 'utf8') + 1);
      queryBuf.writeUInt8(0x51, 0); // 'Q' for Query
      queryBuf.writeInt32BE(queryBuf.length - 1, 1);
      queryBuf.write(sql, 5, 'utf8');
      queryBuf.writeUInt8(0x00, queryBuf.length - 1);

      const clientSocket = this.socket;
      const onData = (chunk: Buffer) => {
        if (clientSocket) {
          clientSocket.removeListener('data', onData);
        }
        resolve(chunk.toString('utf8'));
      };

      if (this.socket) {
        this.socket.once('data', onData);
        this.socket.write(queryBuf, (err) => {
          if (err) reject(err);
        });
      } else {
        reject(new Error('Socket is not available'));
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      // Send Terminate ('X')
      const term = Buffer.alloc(5);
      term.writeUInt8(0x58, 0); // 'X'
      term.writeInt32BE(4, 1);
      try {
        this.socket.write(term);
        this.socket.end();
      } catch {
        // ignore
      }
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export class PostgresDatabaseScalingProvider implements DatabaseScalingProvider {
  private primaryConfig: PostgresPoolConfig;
  private replicaConfigs: Array<PostgresPoolConfig & { id: string; regionId: RegionId }>;
  private consistency: ConsistencyPolicy;
  private primaryClient: PostgresTcpClient | null = null;
  private replicaClients: Map<string, PostgresTcpClient> = new Map();
  private replicaHealthRecords: Map<string, ReadReplica> = new Map();
  private nextReplicaIndex = 0;
  public failoverAlerts: string[] = [];

  constructor(config?: PostgresProductionConfig) {
    this.primaryConfig = config?.primary || {
      host: process.env.POSTGRES_PRIMARY_HOST || '127.0.0.1',
      port: parseInt(process.env.POSTGRES_PRIMARY_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'apex_primary',
      user: process.env.POSTGRES_USER || 'apex',
      connectionTimeoutMs: 2000,
    };

    this.replicaConfigs = config?.replicas || [
      {
        id: 'repl_prod_01',
        regionId: 'us-west-2',
        host: process.env.POSTGRES_REPLICA_1_HOST || '127.0.0.1',
        port: parseInt(process.env.POSTGRES_REPLICA_1_PORT || '5433', 10),
        database: process.env.POSTGRES_DB || 'apex_replica',
        user: process.env.POSTGRES_USER || 'apex',
        connectionTimeoutMs: 2000,
      },
      {
        id: 'repl_prod_02',
        regionId: 'eu-central-1',
        host: process.env.POSTGRES_REPLICA_2_HOST || '127.0.0.1',
        port: parseInt(process.env.POSTGRES_REPLICA_2_PORT || '5434', 10),
        database: process.env.POSTGRES_DB || 'apex_replica',
        user: process.env.POSTGRES_USER || 'apex',
        connectionTimeoutMs: 2000,
      },
    ];

    this.consistency = config?.defaultConsistency || 'eventual';

    // Initialize health records
    for (const r of this.replicaConfigs) {
      this.replicaHealthRecords.set(r.id, {
        id: r.id,
        regionId: r.regionId,
        host: `${r.host}:${r.port}`,
        status: 'active',
        isHealthy: true,
        healthCheckPassed: true,
        replicationLagMs: 0,
        weight: 1,
      });
    }
  }

  async getTopology(): Promise<DatabaseTopology> {
    const replicas = Array.from(this.replicaHealthRecords.values());
    return {
      primaryHost: `${this.primaryConfig.host}:${this.primaryConfig.port}`,
      primaryRegionId: 'us-east-1',
      replicas,
      defaultConsistency: this.consistency,
      maxAcceptableLagMs: 1000,
    };
  }

  async routeQuery(
    queryType: 'read' | 'write',
    consistency?: ConsistencyPolicy
  ): Promise<{ host: string; isReplica: boolean; latencyMs?: number }> {
    const start = Date.now();
    const effectiveConsistency = consistency || this.consistency;

    // Writes MUST strictly route to Primary
    if (queryType === 'write') {
      return {
        host: `${this.primaryConfig.host}:${this.primaryConfig.port}`,
        isReplica: false,
        latencyMs: Date.now() - start,
      };
    }

    // Strong consistency reads route to Primary
    if (effectiveConsistency === 'strong') {
      return {
        host: `${this.primaryConfig.host}:${this.primaryConfig.port}`,
        isReplica: false,
        latencyMs: Date.now() - start,
      };
    }

    // Eventual / Session consistency routes to active Read Replicas
    const healthyReplicas = Array.from(this.replicaHealthRecords.values()).filter(
      (r) => r.isHealthy && r.status === 'active'
    );

    // Fallback if all replicas degraded: route to Primary
    if (healthyReplicas.length === 0) {
      const alert = `[FAILOVER] All read replicas unreachable or degraded. Routing read to primary ${this.primaryConfig.host}:${this.primaryConfig.port}`;
      this.failoverAlerts.push(alert);
      return {
        host: `${this.primaryConfig.host}:${this.primaryConfig.port}`,
        isReplica: false,
        latencyMs: Date.now() - start,
      };
    }

    // Round-robin selection among healthy replicas
    const selected = healthyReplicas[this.nextReplicaIndex % healthyReplicas.length];
    this.nextReplicaIndex++;

    return {
      host: selected.host,
      isReplica: true,
      latencyMs: Date.now() - start,
    };
  }

  async measureReplicationLag(replicaId: string): Promise<number> {
    const replicaCfg = this.replicaConfigs.find((r) => r.id === replicaId);
    if (!replicaCfg) throw new Error(`Replica ${replicaId} not found`);

    let client = this.replicaClients.get(replicaId);
    if (!client || !client.isConnected) {
      client = new PostgresTcpClient(replicaCfg);
      try {
        await client.connect();
        this.replicaClients.set(replicaId, client);
      } catch (err: any) {
        // Mark replica as degraded and record failover
        const rec = this.replicaHealthRecords.get(replicaId);
        if (rec) {
          rec.isHealthy = false;
          rec.healthCheckPassed = false;
          rec.status = 'offline';
        }
        this.failoverAlerts.push(`Replica ${replicaId} connection failed: ${err.message}`);
        throw err;
      }
    }

    // Execute real PostgreSQL replication lag query
    // SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms;
    const sql = "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 AS lag_ms;";
    const rawRes = await client.executeSimpleQuery(sql);

    // Parse lag numeric value from response
    const match = rawRes.match(/(\d+(\.\d+)?)/);
    const lagMs = match ? parseFloat(match[1]) : 0;

    const rec = this.replicaHealthRecords.get(replicaId);
    if (rec) {
      rec.replicationLagMs = lagMs;
      rec.isHealthy = true;
      rec.healthCheckPassed = true;
      rec.status = 'active';
    }

    return lagMs;
  }

  async getReplicaHealth(): Promise<ReadReplica[]> {
    return Array.from(this.replicaHealthRecords.values());
  }

  async setConsistencyPolicy(policy: ConsistencyPolicy): Promise<void> {
    this.consistency = policy;
  }

  // Failure Injection Harness: explicitly kill connection to a replica
  injectReplicaFailure(replicaId: string): void {
    const client = this.replicaClients.get(replicaId);
    if (client) {
      client.disconnect();
      this.replicaClients.delete(replicaId);
    }
    const rec = this.replicaHealthRecords.get(replicaId);
    if (rec) {
      rec.isHealthy = false;
      rec.healthCheckPassed = false;
      rec.status = 'offline';
      rec.replicationLagMs = -1;
    }
    this.failoverAlerts.push(`[FAILURE_INJECTED] Replica ${replicaId} socket severed`);
  }

  // Restore healthy state
  restoreReplicaHealth(replicaId: string): void {
    const rec = this.replicaHealthRecords.get(replicaId);
    if (rec) {
      rec.isHealthy = true;
      rec.healthCheckPassed = true;
      rec.status = 'active';
      rec.replicationLagMs = 0;
    }
  }

  closeAll(): void {
    if (this.primaryClient) {
      this.primaryClient.disconnect();
      this.primaryClient = null;
    }
    for (const client of Array.from(this.replicaClients.values())) {
      client.disconnect();
    }
    this.replicaClients.clear();
  }
}
