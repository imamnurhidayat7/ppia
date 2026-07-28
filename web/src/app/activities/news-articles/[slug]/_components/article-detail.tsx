"use client";
import { sanitizeHtml } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import type { PublicArticle } from "@/lib/server-api";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Tag,
  Loader2,
  MessageCircle,
  Reply,
  AlertCircle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

function TwitterIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.83c0-3.007 1.792-4.833 4.125-4.833 1.188 0 2.004.114 2.004.114v2.935h-1.218v-3.47c0-.799-.521-1.455-1.456-1.455-1.333 0-2.032 1.545-2.032 3.101v2.971h3.059l-.615 3.47h-2.444v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function LinkedinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

interface Comment {
  id: string;
  content: string;
  userName: string;
  userEmail?: string;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
  user?: { id: string; name: string; avatar?: string };
}

function parseContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (typeof content === "object" && content !== null) {
    const c = content as { type?: string; content?: unknown[]; text?: string };
    if (c.type === "doc" && Array.isArray(c.content)) {
      return c.content.map((block) => parseContent(block)).join("\n\n");
    }
    if (c.type === "paragraph" || c.type === "heading") {
      return (c.content as { text?: string }[])
        .map((span) => span.text || "")
        .join("");
    }
  }
  return "";
}

export default function ArticleDetail({ article }: { article: PublicArticle }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentForm, setCommentForm] = useState({ name: "", email: "", content: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentToast, setCommentToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      if (!article?.id) return;
      try {
        setCommentsLoading(true);
        const res = await api.getArticleComments(article.id);
        setComments(res.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    };
    if (article?.id) {
      fetchComments();
    }
  }, [article?.id]);

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!article?.id || submittingComment) return;
    setSubmittingComment(true);
    try {
      await api.createPublicComment({
        articleId: article.id,
        content: commentForm.content,
        userName: commentForm.name,
        userEmail: commentForm.email,
        parentId,
      });
      setCommentToast({ type: "success", message: "Comment posted successfully!" });
      setCommentForm({ name: "", email: "", content: "" });
      setShowCommentForm(false);
      setReplyingTo(null);
      const res = await api.getArticleComments(article.id);
      setComments(res.comments || []);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axiosErr = err as any;
      const errorMsg = axiosErr?.response?.data?.error || "Failed to post comment";
      setCommentToast({ type: "error", message: errorMsg });
    } finally {
      setSubmittingComment(false);
      setTimeout(() => setCommentToast(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const readTime = article?.readTime ? Math.ceil(article.readTime / 60) : 5;

  const bannerImageUrl = article.imageUrl ? getImageUrl(article.imageUrl) : null;

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <section className="relative pt-28 pb-12 mesh-gradient overflow-hidden">
        {/* Decorative orb */}
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #E8231A, transparent 70%)", transform: "translate3d(0,0,0)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)", transform: "translate3d(0,0,0)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <Link
            href="/activities/news-articles"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Articles
          </Link>

          <div className="flex items-center gap-3 mb-4">
            {article.category && (
              <span className="inline-block px-3 py-1 bg-[#E8231A] text-white text-xs font-semibold rounded-full">
                {article.category}
              </span>
            )}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 max-w-4xl"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            {article.title}
          </motion.h1>

          <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
            {article.author && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#E8231A] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {article.author.name.charAt(0)}
                  </span>
                </div>
                <span className="text-white font-medium">{article.author.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{formatDate(article.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{readTime} min read</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar - Share */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-28">
                <p className="text-[#94A3B8] text-xs font-medium mb-3 uppercase tracking-wider">Share</p>
                <div className="flex flex-col gap-2">
                  <button className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors">
                    <FacebookIcon size={16} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors">
                    <TwitterIcon size={16} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors">
                    <LinkedinIcon size={16} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-8">
              {/* Banner Image - same column as description */}
              {bannerImageUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative w-full h-[280px] md:h-[400px] rounded-2xl overflow-hidden bg-[#F1F5F9] mb-8"
                >
                  <Image
                    src={bannerImageUrl}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 800px"
                  />
                </motion.div>
              )}

              {article.excerpt && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl text-[#64748B] font-medium mb-8 leading-relaxed border-l-4 border-[#E8231A] pl-6"
                >
                  {article.excerpt}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[#1A2B4A] leading-relaxed prose-content"
              >
                {(() => {
                  const rawContent =
                    typeof article.content === "string"
                      ? article.content
                      : parseContent(article.content);

                  if (!rawContent) {
                    return (
                      <p className="text-[#94A3B8] italic">
                        This article has no content yet.
                      </p>
                    );
                  }

                  // If content contains HTML tags, render as HTML
                  if (/<[a-z][\s\S]*>/i.test(rawContent)) {
                    return (
                      <div
                        className="text-base md:text-[17px] space-y-4 [&_p]:my-3 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-[#1A2B4A] [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#1A2B4A] [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#1A2B4A] [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1 [&_a]:text-[#E8231A] [&_a]:underline [&_a:hover]:text-[#C41E16] [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8231A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#64748B] [&_blockquote]:my-4 [&_strong]:font-bold [&_em]:italic"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(rawContent) }}
                      />
                    );
                  }

                  // Otherwise render as paragraphs (markdown-like)
                  const paragraphs = rawContent.split("\n\n").filter(Boolean);
                  return paragraphs.map((para, i) => {
                    if (para.match(/^#{1,3}\s/)) {
                      const level = (para.match(/^(#{1,3})\s/)?.[1] || "").length;
                      const text = para.replace(/^#{1,3}\s/, "");
                      if (level === 1) {
                        return (
                          <h2
                            key={i}
                            className="text-2xl font-black text-[#1A2B4A] mt-8 mb-3"
                            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                          >
                            {text}
                          </h2>
                        );
                      }
                      if (level === 2) {
                        return (
                          <h3
                            key={i}
                            className="text-xl font-black text-[#1A2B4A] mt-6 mb-2"
                            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                          >
                            {text}
                          </h3>
                        );
                      }
                      return (
                        <h4
                          key={i}
                          className="text-lg font-black text-[#1A2B4A] mt-4 mb-2"
                          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                        >
                          {text}
                        </h4>
                      );
                    }
                    return (
                      <p key={i} className="text-base md:text-[17px]">
                        {para}
                      </p>
                    );
                  });
                })()}
              </motion.div>

              {/* Tags */}
              {article.tags && article.tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-10 pt-8 border-t border-gray-100"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag size={15} className="text-[#94A3B8]" />
                    {article.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 text-sm rounded-full hover:bg-[#E2E8F0] cursor-pointer transition-colors"
                        style={{
                          background: tag.color ? `${tag.color}15` : "#F1F5F9",
                          color: tag.color || "#64748B",
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Author Box */}
              {article.author && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-8 bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#E8231A] flex items-center justify-center shrink-0">
                      <span className="text-white text-xl font-bold">
                        {article.author.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A2B4A]">{article.author.name}</p>
                      <p className="text-[#64748B] text-sm mt-0.5">Contributor, PPI Auckland</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Comments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 pt-8 border-t border-gray-200"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-[#E8231A]" />
                    <h3 className="font-bold text-[#1A2B4A] text-xl">
                      Comments {comments.length > 0 && `(${comments.length})`}
                    </h3>
                  </div>
                  {!showCommentForm && (
                    <button
                      onClick={() => setShowCommentForm(true)}
                      className="px-4 py-2 bg-[#E8231A] text-white rounded-lg hover:bg-[#C41E16] text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Add Comment
                    </button>
                  )}
                </div>

                {commentToast && (
                  <div
                    className={`mb-4 p-4 rounded-xl flex items-center gap-3 text-sm ${
                      commentToast.type === "success"
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {commentToast.type === "success" ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                    <span>{commentToast.message}</span>
                  </div>
                )}

                {showCommentForm && (
                  <form
                    onSubmit={(e) => handleSubmitComment(e)}
                    className="mb-8 bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100"
                  >
                    <h4 className="font-semibold text-[#1A2B4A] mb-4">Leave a Comment</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        required
                        placeholder="Your name"
                        value={commentForm.name}
                        onChange={(e) =>
                          setCommentForm({ ...commentForm, name: e.target.value })
                        }
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A] outline-none transition-colors text-sm"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Your email"
                        value={commentForm.email}
                        onChange={(e) =>
                          setCommentForm({ ...commentForm, email: e.target.value })
                        }
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A] outline-none transition-colors text-sm"
                      />
                    </div>
                    <textarea
                      rows={4}
                      required
                      placeholder="Write your comment..."
                      value={commentForm.content}
                      onChange={(e) =>
                        setCommentForm({ ...commentForm, content: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A] outline-none resize-none mb-4 text-sm"
                    />
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCommentForm(false);
                          setCommentForm({ name: "", email: "", content: "" });
                        }}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-[#64748B] hover:bg-gray-50 text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="px-5 py-2 bg-[#E8231A] text-white rounded-lg hover:bg-[#C41E16] text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
                      >
                        {submittingComment && <Loader2 className="w-4 h-4 animate-spin" />}
                        Post Comment
                      </button>
                    </div>
                  </form>
                )}

                {commentsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#E8231A] mx-auto" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 text-[#64748B] bg-[#F8FAFC] rounded-xl border border-gray-100">
                    <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-[#F8FAFC] rounded-xl p-5 border border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1A2B4A] flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">
                              {comment.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-semibold text-[#1A2B4A] text-sm">
                                {comment.userName}
                              </span>
                              <span className="text-xs text-[#94A3B8]">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[#64748B] text-sm leading-relaxed">
                              {comment.content}
                            </p>
                            <button
                              onClick={() => {
                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                setShowCommentForm(true);
                              }}
                              className="text-xs text-[#E8231A] hover:underline mt-2 flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                          </div>
                        </div>

                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-12 mt-4 space-y-3 border-l-2 border-gray-100 pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="bg-white rounded-lg p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-semibold text-[#1A2B4A] text-xs">
                                    {reply.userName}
                                  </span>
                                  <span className="text-xs text-[#94A3B8]">
                                    {new Date(reply.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[#64748B] text-xs leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo === comment.id && showCommentForm && (
                          <form
                            onSubmit={(e) => handleSubmitComment(e, comment.id)}
                            className="ml-12 mt-3 bg-white rounded-xl p-4 border border-gray-100"
                          >
                            <textarea
                              rows={2}
                              required
                              placeholder={`Reply to ${comment.userName}...`}
                              value={commentForm.content}
                              onChange={(e) =>
                                setCommentForm({ ...commentForm, content: e.target.value })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#E8231A] outline-none resize-none text-xs mb-2"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setShowCommentForm(false);
                                  setCommentForm({ name: "", email: "", content: "" });
                                }}
                                className="px-3 py-1 border border-gray-200 rounded-lg text-[#64748B] hover:bg-gray-50 text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submittingComment}
                                className="px-3 py-1 bg-[#E8231A] text-white rounded-lg hover:bg-[#C41E16] text-xs disabled:opacity-50 flex items-center gap-1"
                              >
                                {submittingComment && <Loader2 className="w-3 h-3 animate-spin" />}
                                Reply
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-3">
              <div className="sticky top-28 space-y-6">
                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                  <h4 className="font-semibold text-[#1A2B4A] text-sm mb-4">About this article</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Calendar size={13} />
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Clock size={13} />
                      <span>{readTime} min read</span>
                    </div>
                    {article.category && (
                      <div className="flex items-center gap-2 text-[#64748B]">
                        <Tag size={13} />
                        <span>{article.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                  <Link href="/activities/news-articles" className="block">
                    <h4 className="font-semibold text-[#1A2B4A] text-sm mb-4 hover:text-[#E8231A] transition-colors">
                      More Articles
                    </h4>
                  </Link>
                  <div className="space-y-4">
                    <Link
                      href="/activities/news-articles"
                      className="flex items-center gap-3 text-sm text-[#64748B] hover:text-[#E8231A] transition-colors"
                    >
                      <BookOpen size={14} />
                      Browse all articles
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
