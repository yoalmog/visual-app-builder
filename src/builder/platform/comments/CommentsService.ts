import { Comment, CommentReply, CommentStatus } from '../../schema/platform';
import { defaultOrganizationProvider } from '../organization/OrganizationProvider';
import { defaultNotificationService } from '../notifications/NotificationService';

export class CommentsService {
  private comments: Map<string, Comment> = new Map();

  async createComment(params: {
    projectId: string;
    orgId: string;
    pageId?: string;
    nodeId?: string;
    position?: { x: number; y: number };
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    body: string;
  }): Promise<Comment> {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mentions = this.extractMentions(params.body);

    const comment: Comment = {
      id,
      projectId: params.projectId,
      pageId: params.pageId,
      nodeId: params.nodeId,
      position: params.position,
      authorId: params.authorId,
      authorName: params.authorName,
      authorAvatar: params.authorAvatar,
      body: params.body,
      mentions,
      status: 'open',
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.set(id, comment);

    // Send notifications to mentioned users within the organization
    await this.notifyMentions(params.orgId, mentions, params.authorName, comment.id);

    return comment;
  }

  async addReply(params: {
    commentId: string;
    orgId: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    body: string;
  }): Promise<CommentReply> {
    const comment = this.comments.get(params.commentId);
    if (!comment) throw new Error(`Comment ${params.commentId} not found`);

    const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mentions = this.extractMentions(params.body);

    const reply: CommentReply = {
      id: replyId,
      commentId: params.commentId,
      authorId: params.authorId,
      authorName: params.authorName,
      authorAvatar: params.authorAvatar,
      body: params.body,
      mentions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    comment.replies.push(reply);
    comment.updatedAt = new Date().toISOString();

    // Notify comment author if different
    if (comment.authorId !== params.authorId) {
      await defaultNotificationService.createNotification({
        organizationId: params.orgId,
        userId: comment.authorId,
        type: 'comment',
        title: 'New Reply on your comment',
        message: `${params.authorName} replied: "${params.body.substring(0, 60)}..."`,
        link: `/builder/${comment.projectId}?commentId=${comment.id}`,
      });
    }

    // Notify mentioned users
    await this.notifyMentions(params.orgId, mentions, params.authorName, comment.id);

    return reply;
  }

  async resolveComment(commentId: string, resolvedBy: string): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error(`Comment ${commentId} not found`);

    comment.status = 'resolved';
    comment.resolvedAt = new Date().toISOString();
    comment.resolvedBy = resolvedBy;
    comment.updatedAt = new Date().toISOString();

    return comment;
  }

  async reopenComment(commentId: string): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error(`Comment ${commentId} not found`);

    comment.status = 'open';
    comment.resolvedAt = undefined;
    comment.resolvedBy = undefined;
    comment.updatedAt = new Date().toISOString();

    return comment;
  }

  async editComment(commentId: string, authorId: string, newBody: string): Promise<Comment> {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error(`Comment ${commentId} not found`);
    if (comment.authorId !== authorId) throw new Error('PERMISSION_DENIED: Can only edit own comment');

    comment.body = newBody;
    comment.mentions = this.extractMentions(newBody);
    comment.updatedAt = new Date().toISOString();
    return comment;
  }

  async deleteComment(commentId: string, authorId: string): Promise<boolean> {
    const comment = this.comments.get(commentId);
    if (!comment) return false;
    if (comment.authorId !== authorId) throw new Error('PERMISSION_DENIED: Can only delete own comment');

    return this.comments.delete(commentId);
  }

  async listProjectComments(
    projectId: string,
    filter?: { pageId?: string; nodeId?: string; status?: CommentStatus }
  ): Promise<Comment[]> {
    let list = Array.from(this.comments.values()).filter((c) => c.projectId === projectId);

    if (filter?.pageId) {
      list = list.filter((c) => c.pageId === filter.pageId);
    }
    if (filter?.nodeId) {
      list = list.filter((c) => c.nodeId === filter.nodeId);
    }
    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  extractMentions(text: string): string[] {
    // Looks for @[userId] or @username format
    const matches = text.match(/@\[([^\]]+)\]|@([a-zA-Z0-9_\-\.]+)/g);
    if (!matches) return [];

    return matches.map((m) => {
      if (m.startsWith('@[') && m.endsWith(']')) {
        return m.substring(2, m.length - 1);
      }
      return m.substring(1);
    });
  }

  private async notifyMentions(orgId: string, userIds: string[], authorName: string, commentId: string) {
    if (userIds.length === 0) return;

    // Verify mentioned users belong to organization
    const members = await defaultOrganizationProvider.listMembers(orgId);
    const validMemberUserIds = new Set(members.map((m) => m.userId));

    for (const userId of userIds) {
      if (validMemberUserIds.has(userId)) {
        await defaultNotificationService.createNotification({
          organizationId: orgId,
          userId,
          type: 'mention',
          title: 'You were mentioned',
          message: `${authorName} mentioned you in a comment`,
          link: `?commentId=${commentId}`,
        });
      }
    }
  }
}

export const defaultCommentsService = new CommentsService();
