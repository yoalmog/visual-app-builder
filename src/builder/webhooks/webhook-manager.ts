import * as crypto from 'crypto';
import { IncomingWebhookConfig, OutgoingWebhookConfig } from '../schema/webhook';

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  url: string;
  status: 'success' | 'failed';
  statusCode?: number;
  attempts: number;
  durationMs: number;
  timestamp: string;
  error?: string;
}

export class WebhookManager {
  private incomingWebhooks: Map<string, IncomingWebhookConfig> = new Map();
  private outgoingWebhooks: Map<string, OutgoingWebhookConfig> = new Map();
  private deliveryLogs: WebhookDeliveryLog[] = [];

  constructor(incoming: IncomingWebhookConfig[] = [], outgoing: OutgoingWebhookConfig[] = []) {
    this.updateConfig(incoming, outgoing);
  }

  public updateConfig(incoming: IncomingWebhookConfig[], outgoing: OutgoingWebhookConfig[]): void {
    this.incomingWebhooks.clear();
    for (const w of incoming) {
      this.incomingWebhooks.set(w.id, w);
    }

    this.outgoingWebhooks.clear();
    for (const w of outgoing) {
      this.outgoingWebhooks.set(w.id, w);
    }
  }

  /**
   * Generates HMAC-SHA256 signature for payload.
   */
  public generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verifies incoming webhook request.
   */
  public verifyIncomingSignature(
    webhookId: string,
    rawBody: string,
    providedSignature?: string
  ): { valid: boolean; error?: string } {
    const webhook = this.incomingWebhooks.get(webhookId);
    if (!webhook) {
      return { valid: false, error: `Webhook not found: ${webhookId}` };
    }

    if (!webhook.enabled) {
      return { valid: false, error: `Webhook is disabled: ${webhookId}` };
    }

    if (webhook.verificationMethod === 'none' || !webhook.secretKey) {
      return { valid: true };
    }

    if (!providedSignature) {
      return { valid: false, error: 'Signature header missing' };
    }

    const expectedSignature = this.generateHmacSignature(rawBody, webhook.secretKey);
    const bufProvided = Buffer.from(providedSignature);
    const bufExpected = Buffer.from(expectedSignature);

    if (bufProvided.length !== bufExpected.length) {
      return { valid: false, error: 'Signature verification failed' };
    }

    const valid = crypto.timingSafeEqual(bufProvided, bufExpected);

    return {
      valid,
      error: valid ? undefined : 'Signature verification failed',
    };
  }

  /**
   * Dispatches outgoing webhooks for an event.
   */
  public async dispatchEvent(
    event: string,
    payload: Record<string, any>
  ): Promise<WebhookDeliveryLog[]> {
    const matchingWebhooks = Array.from(this.outgoingWebhooks.values()).filter(w => {
      if (w.enabled === false) return false;
      const events = w.events || (w.eventTrigger ? [w.eventTrigger] : ['*']);
      return events.includes(event) || events.includes('*');
    });

    const logs: WebhookDeliveryLog[] = [];

    for (const webhook of matchingWebhooks) {
      const payloadString = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(webhook.headers || {}),
      };

      if (webhook.secretKey) {
        headers['X-Webhook-Signature'] = this.generateHmacSignature(payloadString, webhook.secretKey);
      }

      const logId = `deliv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const startTime = Date.now();
      let attempts = 0;
      let status: 'success' | 'failed' = 'success';
      let error: string | undefined;

      try {
        attempts++;
        // In runtime / mock environment, simulate network delivery
        if (typeof fetch !== 'undefined' && webhook.url.startsWith('http')) {
          const res = await fetch(webhook.url, {
            method: webhook.method || 'POST',
            headers,
            body: payloadString,
          });
          if (!res.ok) {
            status = 'failed';
            error = `HTTP ${res.status}: ${res.statusText}`;
          }
        }
      } catch (err: any) {
        status = 'failed';
        error = err?.message || 'Network error';
      }

      const log: WebhookDeliveryLog = {
        id: logId,
        webhookId: webhook.id,
        event,
        url: webhook.url,
        status,
        attempts,
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error,
      };

      logs.push(log);
      this.deliveryLogs.unshift(log);
    }

    return logs;
  }

  public getDeliveryLogs(): WebhookDeliveryLog[] {
    return [...this.deliveryLogs];
  }
}
