/**
 * Phase 6: Webhooks Schema
 */

export interface IncomingWebhookConfig {
  id: string;
  name: string;
  endpointSlug: string; // e.g. 'stripe-payment' -> /api/webhooks/in/stripe-payment
  enabled: boolean;
  secretKey?: string;
  secretKeyEnvName?: string;
  verificationMethod?: 'hmac_sha256' | 'bearer_token' | 'none';
  headerName?: string; // e.g. 'stripe-signature'
  workflowId?: string; // triggers this workflow on receipt
  payloadSchema?: Record<string, any>;
  rateLimitPerMinute?: number;
}

export interface OutgoingWebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  enabled?: boolean;
  headers?: Record<string, string>;
  secretHeaders?: Record<string, string>; // injected from server ENV
  secretKey?: string;
  bodyTemplate?: string;
  retryCount?: number;
  timeoutMs?: number;
  eventTrigger?: string; // e.g. 'record.created', 'order.paid'
  events?: string[];
}

