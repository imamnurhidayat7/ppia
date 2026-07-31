"use client";
import { sanitizeHtml } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import WaveTransition from "@/components/sections/WaveTransition";
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

/**
 * Seam colours for the waterline transition — they match the ends of the
 * `.sea-deep` / `.sea-shore` gradients in globals.css.
 */
const DEEP_SEA = "#0B1C2E";
const SHORE = "#FFFFFF";

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
  const { isAuthenticated, user } = useAuth();
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
      // Track view (client-side only — not counted during SSR/ISR)
      api.trackArticleView(article.id);
    }
  }, [article?.id]);

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!article?.id || submittingComment) return;
    setSubmittingComment(true);
    try {
      if (isAuthenticated) {
        await api.createComment({
          articleId: article.id,
          content: commentForm.content,
          parentId,
        });
      } else {
        await api.createPublicComment({
          articleId: article.id,
          content: commentForm.content,
          userName: commentForm.name,
          userEmail: commentForm.email,
          parentId,
        });
      }
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
    // Printed as chart data, so the same en-NZ format as the homepage log lines.
    return new Date(dateString).toLocaleDateString("en-NZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const readTime = article?.readTime ? Math.ceil(article.readTime / 60) : 5;

  const bannerImageUrl = article.imageUrl ? getImageUrl(article.imageUrl) : null;

  return (
    <div className="sea-shore relative min-h-screen overflow-hidden">
      {/* Faint navigation-chart grid over the shore surface. */}
      <div
        aria-hidden="true"
        className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          maskImage: "radial-gradient(ellipse 85% 55% at 50% 30%, transparent 20%, black 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 55% at 50% 30%, transparent 20%, black 90%)",
        }}
      />

      {/* Header — below the waterline, matching the masthead on every other page. */}
      <section className="sea-deep relative pt-28 pb-12 overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
            }}
          />
          <div
            className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #E8231A, transparent 70%)", transform: "translate3d(0,0,0)" }}
          />
          <div
            className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)", transform: "translate3d(0,0,0)" }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <Link
            href="/activities/news-articles"
            className="data-type mb-6 inline-flex items-center gap-2 text-[12px] uppercase text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Articles
          </Link>

          <div className="flex items-center gap-3 mb-4">
            {article.category && (
              <span className="data-type inline-block rounded-[3px] bg-[#E8231A] px-2.5 py-1 text-[12px] font-bold uppercase text-white">
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

          <div className="flex flex-wrap items-center gap-5">
            {article.author && (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-[#E8231A]"
                  aria-hidden="true"
                >
                  <span className="text-white text-sm font-bold">
                    {article.author.name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-white">{article.author.name}</span>
              </div>
            )}
            <span aria-hidden="true" className="h-px w-8 bg-white/20" />
            <div className="data-type flex items-center gap-1.5 text-[12px] uppercase text-white/70">
              <Calendar size={11} aria-hidden="true" />
              <span>{formatDate(article.createdAt)}</span>
            </div>
            <div className="data-type flex items-center gap-1.5 text-[12px] uppercase text-white/70">
              <Clock size={11} aria-hidden="true" />
              <span>{readTime} min read</span>
            </div>
          </div>
        </div>
      </section>

      {/* Waterline: the article body comes ashore. */}
      <WaveTransition from={DEEP_SEA} to={SHORE} />

      {/* Content */}
      <section className="relative py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar - Share */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-28">
                <p className="data-type mb-3 text-[12px] font-bold uppercase ink-muted">Share</p>
                <div className="flex flex-col gap-2">
                  <button className="chart-paper flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#DCE7F1] text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]">
                    <FacebookIcon size={16} />
                  </button>
                  <button className="chart-paper flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#DCE7F1] text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]">
                    <TwitterIcon size={16} />
                  </button>
                  <button className="chart-paper flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#DCE7F1] text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]">
                    <LinkedinIcon size={16} />
                  </button>
                  <button className="chart-paper flex h-10 w-10 items-center justify-center rounded-[3px] border border-[#DCE7F1] text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]">
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
                  className="relative mb-8 h-[280px] w-full overflow-hidden rounded-[5px] border border-[#DCE7F1] bg-[#EDF5FB] md:h-[400px]"
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
                  className="text-xl ink-body font-medium mb-8 leading-relaxed border-l-4 border-[#E8231A] pl-6"
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
                        className="text-base md:text-[17px] space-y-4 [&_p]:my-3 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-[#1A2B4A] [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#1A2B4A] [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-[#1A2B4A] [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1 [&_a]:accent-label [&_a]:underline [&_a:hover]:text-[#C41E16] [&_blockquote]:border-l-4 [&_blockquote]:border-[#E8231A] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:ink-body [&_blockquote]:my-4 [&_strong]:font-bold [&_em]:italic"
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
                  className="mt-10 border-t border-[#DCE7F1] pt-8"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag size={15} className="text-[#94A3B8]" />
                    {article.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="data-type cursor-pointer rounded-[3px] px-2.5 py-1 text-[12px] font-bold uppercase transition-colors hover:brightness-95"
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
                  className="chart-paper mt-8 rounded-[5px] border border-[#DCE7F1] p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] bg-[#E8231A]" aria-hidden="true">
                      <span className="text-white text-xl font-bold">
                        {article.author.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F1B33]">{article.author.name}</p>
                      <p className="data-type mt-1 text-[12px] uppercase ink-muted">Contributor, PPI Auckland</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Comments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-12 border-t border-[#DCE7F1] pt-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 accent-label" />
                    <h3 className="font-bold text-[#0F1B33] text-xl">
                      Comments {comments.length > 0 && `(${comments.length})`}
                    </h3>
                  </div>
                  {!showCommentForm && (
                    <button
                      onClick={() => setShowCommentForm(true)}
                      className="data-type flex items-center gap-2 rounded-[3px] bg-[#E8231A] px-4 py-2 text-[12px] font-bold uppercase text-white transition-colors hover:bg-[#C41E16]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Add Comment
                    </button>
                  )}
                </div>

                {commentToast && (
                  <div
                    className={`mb-4 flex items-center gap-3 rounded-[3px] p-4 text-sm ${
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
                    className="chart-paper mb-8 rounded-[5px] border border-[#DCE7F1] p-6"
                  >
                    <h4 className="data-type mb-4 text-[12px] font-bold uppercase ink-muted">Leave a Comment</h4>
                    {isAuthenticated ? (
                      <p className="mb-4 text-sm text-[#5B6B7C]">
                        Commenting as <span className="font-semibold text-[#0F1B33]">{user?.name}</span>
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          value={commentForm.name}
                          onChange={(e) =>
                            setCommentForm({ ...commentForm, name: e.target.value })
                          }
                          className="rounded-[3px] border border-[#DCE7F1] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A]"
                        />
                        <input
                          type="email"
                          required
                          placeholder="Your email"
                          value={commentForm.email}
                          onChange={(e) =>
                            setCommentForm({ ...commentForm, email: e.target.value })
                          }
                          className="rounded-[3px] border border-[#DCE7F1] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A]"
                        />
                      </div>
                    )}
                    <textarea
                      rows={4}
                      required
                      placeholder="Write your comment..."
                      value={commentForm.content}
                      onChange={(e) =>
                        setCommentForm({ ...commentForm, content: e.target.value })
                      }
                      className="mb-4 w-full resize-none rounded-[3px] border border-[#DCE7F1] bg-white/70 px-4 py-3 text-sm outline-none transition-colors focus:border-[#E8231A] focus:ring-1 focus:ring-[#E8231A]"
                    />
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCommentForm(false);
                          setCommentForm({ name: "", email: "", content: "" });
                        }}
                        className="data-type rounded-[3px] border border-[#DCE7F1] px-4 py-2 text-[12px] font-bold uppercase text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="data-type flex items-center gap-2 rounded-[3px] bg-[#E8231A] px-5 py-2 text-[12px] font-bold uppercase text-white transition-colors hover:bg-[#C41E16] disabled:opacity-50"
                      >
                        {submittingComment && <Loader2 className="w-4 h-4 animate-spin" />}
                        Post Comment
                      </button>
                    </div>
                  </form>
                )}

                {commentsLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin accent-label mx-auto" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="chart-paper rounded-[5px] border border-[#DCE7F1] py-10 text-center text-[#5B6B7C]">
                    <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map((comment) => (
                      <div key={comment.id} className="chart-paper rounded-[5px] border border-[#DCE7F1] p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-[#0F2438]" aria-hidden="true">
                            <span className="text-white text-xs font-bold">
                              {comment.userName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-semibold text-[#0F1B33] text-sm">
                                {comment.userName}
                              </span>
                              <span className="data-type text-[12px] uppercase ink-muted">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="ink-body text-sm leading-relaxed">
                              {comment.content}
                            </p>
                            <button
                              onClick={() => {
                                setReplyingTo(replyingTo === comment.id ? null : comment.id);
                                setShowCommentForm(true);
                              }}
                              className="text-xs accent-label hover:underline mt-2 flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                          </div>
                        </div>

                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-12 mt-4 space-y-3 border-l border-[#DCE7F1] pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="rounded-[3px] border border-[#DCE7F1] bg-white/70 p-4">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="font-semibold text-[#0F1B33] text-xs">
                                    {reply.userName}
                                  </span>
                                  <span className="data-type text-[12px] uppercase ink-muted">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="ink-body text-xs leading-relaxed">
                                  {reply.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo === comment.id && showCommentForm && (
                          <form
                            onSubmit={(e) => handleSubmitComment(e, comment.id)}
                            className="ml-12 mt-3 rounded-[3px] border border-[#DCE7F1] bg-white/70 p-4"
                          >
                            <textarea
                              rows={2}
                              required
                              placeholder={`Reply to ${comment.userName}...`}
                              value={commentForm.content}
                              onChange={(e) =>
                                setCommentForm({ ...commentForm, content: e.target.value })
                              }
                              className="mb-2 w-full resize-none rounded-[3px] border border-[#DCE7F1] px-3 py-2 text-xs outline-none transition-colors focus:border-[#E8231A]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setShowCommentForm(false);
                                  setCommentForm({ name: "", email: "", content: "" });
                                }}
                                className="data-type rounded-[3px] border border-[#DCE7F1] px-3 py-1 text-[12px] font-bold uppercase text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33]"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={submittingComment}
                                className="data-type flex items-center gap-1 rounded-[3px] bg-[#E8231A] px-3 py-1 text-[12px] font-bold uppercase text-white transition-colors hover:bg-[#C41E16] disabled:opacity-50"
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
                <div className="chart-paper rounded-[5px] border border-[#DCE7F1] p-5">
                  <h4 className="data-type text-[12px] font-bold uppercase ink-muted">About this article</h4>
                  <div aria-hidden="true" className="rope-rule my-3" />
                  <div className="data-type space-y-3 text-[12px] uppercase ink-muted">
                    <div className="flex items-center gap-2">
                      <Calendar size={11} aria-hidden="true" />
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={11} aria-hidden="true" />
                      <span>{readTime} min read</span>
                    </div>
                    {article.category && (
                      <div className="flex items-center gap-2">
                        <Tag size={11} aria-hidden="true" />
                        <span>{article.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="chart-paper rounded-[5px] border border-[#DCE7F1] p-5">
                  <Link href="/activities/news-articles" className="block">
                    <h4 className="data-type text-[12px] font-bold uppercase ink-muted transition-colors hover:text-[#C41E16]">
                      More Articles
                    </h4>
                  </Link>
                  <div aria-hidden="true" className="rope-rule my-3" />
                  <div className="space-y-4">
                    <Link
                      href="/activities/news-articles"
                      className="flex items-center gap-3 text-sm text-[#5B6B7C] transition-colors hover:text-[#C41E16]"
                    >
                      <BookOpen size={14} aria-hidden="true" />
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
