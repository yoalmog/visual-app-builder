'use client';

import React, { useState } from 'react';
import { usePlatformStore } from '@/builder/state/platform-store';
import { useBuilderStore } from '@/builder/state/builder-store';
import { MessageSquare, CheckCircle, Clock, Send, Check } from 'lucide-react';

export const CommentsPanel: React.FC = () => {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const project = useBuilderStore((s) => s.project);
  const selectedNodeIds = useBuilderStore((s) => s.selectedNodeIds);
  const activePageId = useBuilderStore((s) => s.activePageId);

  const comments = usePlatformStore((s) => s.comments);
  const commentsFilter = usePlatformStore((s) => s.commentsFilter);
  const setCommentsFilter = usePlatformStore((s) => s.setCommentsFilter);
  const createComment = usePlatformStore((s) => s.createComment);
  const resolveComment = usePlatformStore((s) => s.resolveComment);

  const filteredComments = comments.filter((c) => {
    if (commentsFilter === 'open') return c.status === 'open';
    if (commentsFilter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    await createComment(
      project.id,
      newCommentText.trim(),
      activePageId,
      selectedNodeIds[0] || undefined
    );
    setNewCommentText('');
  };

  return (
    <div
      data-testid="comments-panel"
      className="w-80 h-full bg-[#0C0E15] border-r border-[#1B1E2B] flex flex-col text-slate-200 select-none text-xs"
    >
      {/* Panel Header */}
      <div className="p-3 border-b border-[#1A1F2E] flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Comments</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#181D2E] text-slate-400">
            {comments.length}
          </span>
        </div>

        {/* Filter */}
        <div className="flex bg-[#121624] p-0.5 rounded-lg border border-[#1E2436]">
          <button
            onClick={() => setCommentsFilter('all')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              commentsFilter === 'all' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCommentsFilter('open')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              commentsFilter === 'open' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setCommentsFilter('resolved')}
            className={`px-2 py-0.5 rounded text-[10px] ${
              commentsFilter === 'resolved' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Done
          </button>
        </div>
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleCreateComment} className="p-3 border-b border-[#1A1F2E] bg-[#0E111B]">
        <div className="relative">
          <textarea
            data-testid="comment-input"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment... (Type @ to mention)"
            rows={2}
            className="w-full bg-[#141724] border border-[#21273C] rounded-lg p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 resize-none"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim()}
            className="absolute right-2 bottom-2 p-1 rounded-md bg-indigo-600 disabled:bg-slate-700 text-white hover:bg-indigo-500 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
        {selectedNodeIds.length > 0 && (
          <div className="mt-1 text-[10px] text-indigo-400 flex items-center gap-1">
            <span>Anchored to:</span>
            <span className="font-mono bg-[#161B2B] px-1 rounded">{selectedNodeIds[0]}</span>
          </div>
        )}
      </form>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 gap-1 text-center">
            <MessageSquare className="w-6 h-6 opacity-30" />
            <span>No comments match filter</span>
          </div>
        ) : (
          filteredComments.map((c) => (
            <div
              key={c.id}
              data-testid={`comment-item-${c.id}`}
              className={`p-3 rounded-xl border transition-colors ${
                c.status === 'resolved'
                  ? 'bg-[#0E1119]/50 border-[#181D2A] opacity-75'
                  : 'bg-[#121622] border-[#22283A]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-[10px] text-white">
                    {c.authorName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-white">{c.authorName}</span>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => resolveComment(c.id)}
                  className={`p-1 rounded hover:bg-[#1A2033] ${
                    c.status === 'resolved' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={c.status === 'resolved' ? 'Resolved' : 'Mark as resolved'}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-2 text-slate-200 leading-relaxed break-words">{c.body}</p>

              {/* Mentions tags */}
              {c.mentions && c.mentions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {c.mentions.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded"
                    >
                      @{m}
                    </span>
                  ))}
                </div>
              )}

              {/* Replies */}
              {c.replies && c.replies.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-[#1C2133] space-y-2 pl-2">
                  {c.replies.map((r) => (
                    <div key={r.id} className="text-[11px]">
                      <span className="font-semibold text-slate-300">{r.authorName}: </span>
                      <span className="text-slate-400">{r.body}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
