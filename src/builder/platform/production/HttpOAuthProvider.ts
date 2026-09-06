// Production OAuth 2.0 Provider Operating Across a Real TCP/HTTP Network Boundary
import http from 'http';
import crypto from 'crypto';
import { DeveloperApp } from '../../schema/platform-v9';
import {
  DeveloperAppProvider,
  OAuthProvider,
} from '../enterprise/DeveloperEcosystem';

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType?: string;
  scopes?: string[];
}

interface StoredAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  userId: string;
  expiresAt: number;
  used: boolean;
}

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number;
  revoked: boolean;
}

export class HttpOAuthProvider implements DeveloperAppProvider, OAuthProvider {
  private apps: Map<string, DeveloperApp> = new Map();
  private appSecrets: Map<string, string> = new Map(); // clientId -> rawSecret
  private authCodes: Map<string, StoredAuthCode> = new Map();
  private tokens: Map<string, StoredToken> = new Map();
  private server: http.Server | null = null;
  public serverPort = 0;
  public failureAlerts: string[] = [];
  public failedAttemptsCount = 0;

  async startServer(port = 0): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host}`);

        // Read request body
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString('utf8');
        });

        req.on('end', async () => {
          let jsonBody: any = {};
          if (body) {
            try {
              jsonBody = JSON.parse(body);
            } catch {
              // Try URLSearchParams
              const params = new URLSearchParams(body);
              jsonBody = Object.fromEntries(params.entries());
            }
          }

          // Router
          if (req.method === 'POST' && url.pathname === '/oauth/token') {
            await this.handleTokenEndpoint(jsonBody, res);
          } else if (req.method === 'GET' && url.pathname === '/oauth/userinfo') {
            await this.handleUserInfoEndpoint(req, res);
          } else if (req.method === 'POST' && url.pathname === '/oauth/revoke') {
            await this.handleRevokeEndpoint(jsonBody, res);
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'not_found' }));
          }
        });
      });

      this.server.listen(port, '127.0.0.1', () => {
        const addr = this.server?.address();
        this.serverPort = typeof addr === 'object' && addr ? addr.port : port;
        resolve(this.serverPort);
      });
    });
  }

  private async handleTokenEndpoint(body: any, res: http.ServerResponse): Promise<void> {
    const { grant_type, code, client_id, client_secret, redirect_uri } = body;

    // Validate client credentials
    const expectedSecret = this.appSecrets.get(client_id);
    if (!expectedSecret || expectedSecret !== client_secret) {
      this.failedAttemptsCount++;
      this.failureAlerts.push(`Security Alert: Invalid client secret presented for clientId: ${client_id}`);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_client', error_description: 'Client authentication failed' }));
      return;
    }

    if (grant_type !== 'authorization_code') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unsupported_grant_type' }));
      return;
    }

    const storedCode = this.authCodes.get(code);

    // Single-use check: if code doesn't exist or has already been used, BURN it and reject
    if (!storedCode || storedCode.used) {
      this.failedAttemptsCount++;
      this.failureAlerts.push(`Security Alert: Replay attempt detected for authorization code: ${code}`);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Authorization code already used or invalid' }));
      return;
    }

    if (storedCode.clientId !== client_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Client ID mismatch' }));
      return;
    }

    if (storedCode.redirectUri !== redirect_uri) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Redirect URI mismatch' }));
      return;
    }

    if (storedCode.expiresAt < Date.now()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Authorization code expired' }));
      return;
    }

    // BURN the code immediately
    storedCode.used = true;

    // Issue tokens
    const accessToken = `atk_${crypto.randomBytes(24).toString('hex')}`;
    const refreshToken = `rtk_${crypto.randomBytes(32).toString('hex')}`;
    const expiresIn = 3600;

    const tokenRecord: StoredToken = {
      accessToken,
      refreshToken,
      clientId: client_id,
      userId: storedCode.userId,
      scopes: storedCode.scopes,
      expiresAt: Date.now() + expiresIn * 1000,
      revoked: false,
    };
    this.tokens.set(accessToken, tokenRecord);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: storedCode.scopes.join(' '),
      })
    );
  }

  private async handleUserInfoEndpoint(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const authHeader = req.headers['authorization'] || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized', error_description: 'Missing or malformed Bearer token' }));
      return;
    }

    const token = match[1];
    const tokenRecord = this.tokens.get(token);

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < Date.now()) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_token', error_description: 'Token revoked or expired' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        sub: tokenRecord.userId,
        client_id: tokenRecord.clientId,
        scopes: tokenRecord.scopes,
      })
    );
  }

  private async handleRevokeEndpoint(body: any, res: http.ServerResponse): Promise<void> {
    const { token } = body;
    if (token && this.tokens.has(token)) {
      const record = this.tokens.get(token)!;
      record.revoked = true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  }

  // ─── DeveloperAppProvider Implementation ────────────────────────────────────

  async createApp(
    params: { organizationId: string; name: string; description: string; redirectUris: string[]; scopes: string[]; createdBy: string; rateLimitTier?: 'standard' | 'elevated' | 'unlimited' }
  ): Promise<{ app: DeveloperApp; rawClientSecret: string }> {
    for (const uri of params.redirectUris) {
      if (uri.includes('*')) throw new Error('WILDCARD_REDIRECT_URI_NOT_ALLOWED');
      if (!uri.startsWith('http://') && !uri.startsWith('https://')) throw new Error('INVALID_REDIRECT_URI');
    }

    const id = `dapp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const clientId = `client_${crypto.randomBytes(12).toString('hex')}`;
    const rawClientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    const clientSecretHash = crypto.createHash('sha256').update(rawClientSecret).digest('hex');

    const app: DeveloperApp = {
      id,
      clientId,
      clientSecretHash,
      name: params.name,
      description: params.description,
      organizationId: params.organizationId,
      redirectUris: params.redirectUris,
      scopes: params.scopes,
      createdBy: params.createdBy,
      rateLimitTier: params.rateLimitTier || 'standard',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.apps.set(id, app);
    this.appSecrets.set(clientId, rawClientSecret);
    return { app, rawClientSecret };
  }

  async getApp(id: string): Promise<DeveloperApp | null> {
    return this.apps.get(id) || null;
  }

  async listApps(organizationId: string): Promise<DeveloperApp[]> {
    return Array.from(this.apps.values()).filter((a) => a.organizationId === organizationId);
  }

  async rotateSecret(appId: string): Promise<{ app: DeveloperApp; rawClientSecret: string }> {
    const app = this.apps.get(appId);
    if (!app) throw new Error(`App ${appId} not found`);

    const rawClientSecret = `sec_${crypto.randomBytes(24).toString('hex')}`;
    app.clientSecretHash = crypto.createHash('sha256').update(rawClientSecret).digest('hex');
    this.appSecrets.set(app.clientId, rawClientSecret);
    return { app, rawClientSecret };
  }

  async revokeApp(appId: string): Promise<boolean> {
    const app = this.apps.get(appId);
    if (!app) return false;
    app.status = 'revoked';
    this.appSecrets.delete(app.clientId);
    return true;
  }

  // ─── OAuthProvider Implementation (Executing Real HTTP Network Requests) ───

  async generateAuthCode(clientId: string, redirectUri: string, scopes: string[], userId: string): Promise<string> {
    let clientApp: DeveloperApp | null = null;
    for (const app of Array.from(this.apps.values())) {
      if (app.clientId === clientId && app.status === 'active') {
        clientApp = app;
        break;
      }
    }

    if (!clientApp) throw new Error('INVALID_CLIENT_ID');
    if (!clientApp.redirectUris.includes(redirectUri)) throw new Error('UNAUTHORIZED_REDIRECT_URI');

    const code = `code_${crypto.randomBytes(16).toString('hex')}`;
    this.authCodes.set(code, {
      code,
      clientId,
      redirectUri,
      scopes,
      userId,
      expiresAt: Date.now() + 600 * 1000, // 10 minutes
      used: false,
    });

    return code;
  }

  // Performs a REAL HTTP request over the network socket to /oauth/token
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<OAuthTokenResponse> {
    if (!this.server || this.serverPort === 0) {
      await this.startServer();
    }

    const payload = JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: this.serverPort,
          path: '/oauth/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload, 'utf8'),
          },
        },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => {
            responseBody += chunk.toString('utf8');
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseBody);
              if (res.statusCode !== 200) {
                reject(new Error(`OAuth Token Exchange Failed (${res.statusCode}): ${parsed.error} - ${parsed.error_description || ''}`));
              } else {
                resolve({
                  accessToken: parsed.access_token,
                  refreshToken: parsed.refresh_token,
                  tokenType: parsed.token_type,
                  expiresIn: parsed.expires_in,
                  scopes: parsed.scope ? parsed.scope.split(' ') : [],
                });
              }
            } catch (err) {
              reject(new Error(`Invalid JSON response from OAuth token endpoint: ${responseBody}`));
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }

  async validateToken(
    accessToken: string,
    requiredScope?: string
  ): Promise<{ valid: boolean; userId?: string; organizationId?: string; scopes?: string[]; reason?: string }> {
    const record = this.tokens.get(accessToken);
    if (!record) return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    if (record.revoked) return { valid: false, reason: 'TOKEN_REVOKED' };
    if (record.expiresAt < Date.now()) return { valid: false, reason: 'TOKEN_EXPIRED' };

    if (requiredScope && !record.scopes.includes(requiredScope)) {
      return { valid: false, reason: 'INSUFFICIENT_SCOPE' };
    }

    return {
      valid: true,
      userId: record.userId,
      scopes: record.scopes,
    };
  }

  async revokeToken(token: string): Promise<boolean> {
    const record = this.tokens.get(token);
    if (record) {
      record.revoked = true;
      return true;
    }
    return false;
  }

  close(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}
