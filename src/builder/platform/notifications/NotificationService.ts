import { Notification, NotificationType, NotificationPreferences } from '../../schema/platform';

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  async createNotification(params: {
    organizationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification | null> {
    const prefs = this.getPreferences(params.userId);

    // Check user preferences
    if (params.type === 'mention' && !prefs.inAppMentions) return null;
    if (
      (params.type === 'review_request' || params.type === 'review_approval' || params.type === 'review_rejection') &&
      !prefs.inAppReviews
    ) {
      return null;
    }
    if ((params.type === 'deployment_completed' || params.type === 'deployment_failed') && !prefs.inAppDeployments) {
      return null;
    }
    if (params.type === 'security_event' && !prefs.inAppSecurity) {
      return null;
    }

    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notification: Notification = {
      id,
      organizationId: params.organizationId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      read: false,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(id, notification);
    return notification;
  }

  async listUserNotifications(userId: string, filter?: { unreadOnly?: boolean }): Promise<Notification[]> {
    let list = Array.from(this.notifications.values()).filter((n) => n.userId === userId);
    if (filter?.unreadOnly) {
      list = list.filter((n) => !n.read);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId && !n.read).length;
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const n = this.notifications.get(notificationId);
    if (!n) return false;
    n.read = true;
    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    for (const n of Array.from(this.notifications.values())) {
      if (n.userId === userId && !n.read) {
        n.read = true;
        count++;
      }
    }
    return count;
  }

  getPreferences(userId: string): NotificationPreferences {
    const existing = this.userPreferences.get(userId);
    if (existing) return existing;

    const defaultPrefs: NotificationPreferences = {
      userId,
      emailMentions: true,
      emailReviews: true,
      emailDeployments: true,
      emailSecurity: true,
      inAppMentions: true,
      inAppReviews: true,
      inAppDeployments: true,
      inAppSecurity: true,
    };
    this.userPreferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  updatePreferences(userId: string, updates: Partial<NotificationPreferences>): NotificationPreferences {
    const current = this.getPreferences(userId);
    const updated = { ...current, ...updates };
    this.userPreferences.set(userId, updated);
    return updated;
  }
}

export const defaultNotificationService = new NotificationService();
