/**
 * Phase 5: ApiProvider Interface
 *
 * Handles external REST API connector execution.
 * All requests are proxied through /api/connectors/proxy to keep secrets server-side.
 * Zero eval, zero arbitrary code execution.
 */

import { ApiConnector } from '../schema/cloud';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiRequestStatus = 'idle' | 'pending' | 'success' | 'error';

export interface ApiRequestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  errorCode?: string;
  durationMs?: number;
}

export interface ApiTestResult {
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
  durationMs?: number;
}

export interface ApiProvider {
  executeRequest(connector: ApiConnector, params?: Record<string, any>): Promise<ApiRequestResult>;
  testConnector(connector: ApiConnector): Promise<ApiTestResult>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeErrorCode(status?: number): string {
  if (!status) return 'NETWORK_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMIT';
  if (status >= 500) return 'SERVER_ERROR';
  return 'REQUEST_FAILED';
}

function interpolatePath(path: string, params: Record<string, any>): string {
  return path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) =>
    params[key] !== undefined ? encodeURIComponent(String(params[key])) : `:${key}`
  );
}

function resolveBody(bodyTemplate: string | undefined, params: Record<string, any>): string | undefined {
  if (!bodyTemplate) return undefined;
  try {
    // Simple template: replace {{key}} with resolved values
    return bodyTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmedKey = key.trim();
      return params[trimmedKey] !== undefined ? JSON.stringify(params[trimmedKey]) : '""';
    });
  } catch {
    return bodyTemplate;
  }
}

// ─── Default implementation ───────────────────────────────────────────────────

export class DefaultApiProvider implements ApiProvider {
  async executeRequest(connector: ApiConnector, params: Record<string, any> = {}): Promise<ApiRequestResult> {
    const start = Date.now();
    try {
      const resolvedPath = interpolatePath(connector.path, { ...connector.pathParameters, ...params });
      const resolvedBody = resolveBody(connector.body, params);

      const proxyPayload = {
        connectorId: connector.id,
        baseUrl: connector.baseUrl,
        method: connector.method,
        path: resolvedPath,
        headers: connector.headers || {},
        queryParameters: connector.queryParameters || {},
        body: resolvedBody,
        authentication: connector.authentication
          ? {
              type: connector.authentication.type,
              headerName: connector.authentication.headerName,
              // Note: actual secret/key is resolved server-side via secretName
              secretName: connector.authentication.secretName,
            }
          : undefined,
        retryCount: connector.retryCount || 0,
      };

      const res = await fetch('/api/connectors/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyPayload),
      });

      const durationMs = Date.now() - start;

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        return {
          success: false,
          status: res.status,
          error: errorBody || `Request failed with status ${res.status}`,
          errorCode: normalizeErrorCode(res.status),
          durationMs,
        };
      }

      let data: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      // Apply response mapping if configured
      if (connector.responseMapping) {
        const parts = connector.responseMapping.split('.');
        let current = data;
        for (const part of parts) {
          if (current && typeof current === 'object') current = current[part];
          else { current = null; break; }
        }
        data = current;
      }

      return { success: true, status: res.status, data, durationMs };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error',
        errorCode: 'NETWORK_ERROR',
        durationMs: Date.now() - start,
      };
    }
  }

  async testConnector(connector: ApiConnector): Promise<ApiTestResult> {
    return this.executeRequest(connector, {});
  }
}

export const defaultApiProvider = new DefaultApiProvider();
