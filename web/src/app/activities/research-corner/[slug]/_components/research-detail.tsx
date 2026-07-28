"use client";
import { sanitizeHtml } from "@/lib/sanitize-html";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import type { PublicResearch } from "@/lib/server-api";
import {
  Calendar,
  ArrowLeft,
  ExternalLink,
  FileText,
  Download,
  Loader2,
  BookOpen,
  MessageCircle,
  Reply,
  AlertCircle,
  CheckCircle2,
  Eye,
  ArrowRight,
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  userName: string;
  userEmail?: string;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
}

export default function ResearchDetail({ research }: { research: PublicResearch }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentForm, setCommentForm] = useState({ name: "", email: "", content: "" });
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentToast, setCommentToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      if (!research?.id) return;
      try {
        setCommentsLoading(true);
        const res = await api.getResearchComments(research.id);
        setComments(res.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    };
    if (research?.id) {
      fetchComments();
    }
  }, [research?.id]);

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!research?.id || submittingComment) return;
    setSubmittingComment(true);
    try {
      await api.createPublicComment({
        researchId: research.id,
        content: commentForm.content,
        userName: commentForm.name,
        userEmail: commentForm.email,
        parentId,
      });
      setCommentToast({ type: "success", message: "Comment posted successfully!" });
      setCommentForm({ name: "", email: "", content: "" });
      setShowCommentForm(false);
      setReplyingTo(null);
      const res = await api.getResearchComments(research.id);
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

  const handleDownload = async () => {
    if (!research?.id) return;
    try {
      await api.trackDownload(research.id);
    } catch (err) {
      console.error("Failed to track download:", err);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const accentColor = research.color || "#3B82F6";
  const authorName = research.authors || research.mainAuthor?.name || "Anonymous";
  const formattedDate = formatDate(research.publicationDate || research.createdAt);

  return (
    <div className="min-h-screen bg-white">

      <section className="relative pt-28 pb-12 mesh-gradient overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
        />
        <div
          className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <Link
            href="/activities/research-corner"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Back to Research Corner
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${accentColor}25`, color: accentColor }}
            >
              {research.division?.name || research.researchType || "Research"}
            </span>
            {research.researchStatus && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  research.researchStatus === "PUBLISHED"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {research.researchStatus}
              </span>
            )}
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4 max-w-4xl"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            {research.title}
          </motion.h1>

          {research.titleIndonesian && (
            <p className="text-white/70 text-lg italic mb-6 max-w-4xl">
              {research.titleIndonesian}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: accentColor }}
              >
                {authorName.charAt(0).toUpperCase()}
              </div>
              <span className="text-white font-medium">{authorName}</span>
            </div>
            {formattedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>{formattedDate}</span>
              </div>
            )}
            {research.venue && (
              <div className="flex items-center gap-1.5">
                <BookOpen size={14} />
                <span>{research.venue}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8">
              {research.abstract && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#F8FAFC] rounded-2xl p-6 mb-8 border-l-4"
                  style={{ borderColor: accentColor }}
                >
                  <h2 className="font-bold text-[#1A2B4A] text-lg mb-3 flex items-center gap-2">
                    <FileText size={20} style={{ color: accentColor }} />
                    Abstract
                  </h2>
                  <div
                    className="text-[#64748B] leading-relaxed prose prose-sm max-w-none [&_p]:my-2 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#8B5CF6] [&_a]:underline [&_strong]:font-bold [&_em]:italic"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(research.abstract) }}
                  />
                </motion.div>
              )}

              {research.abstractIndonesian && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-[#F8FAFC] rounded-2xl p-6 mb-8"
                >
                  <h2 className="font-bold text-[#1A2B4A] text-lg mb-3">Abstrak</h2>
                  <div
                    className="text-[#64748B] leading-relaxed prose prose-sm max-w-none [&_p]:my-2 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-[#8B5CF6] [&_a]:underline [&_strong]:font-bold [&_em]:italic"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(research.abstractIndonesian) }}
                  />
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 mb-8"
              >
                <h2 className="font-bold text-[#1A2B4A] text-lg mb-4">
                  Publication Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {research.researchType && (
                    <div>
                      <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">
                        Type
                      </p>
                      <p className="text-[#1A2B4A] font-medium text-sm">
                        {research.researchType.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                  {research.venue && (
                    <div>
                      <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">
                        Venue / Conference
                      </p>
                      <p className="text-[#1A2B4A] font-medium text-sm">
                        {research.venue}
                      </p>
                    </div>
                  )}
                  {formattedDate && (
                    <div>
                      <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">
                        Published Date
                      </p>
                      <p className="text-[#1A2B4A] font-medium text-sm">
                        {formattedDate}
                      </p>
                    </div>
                  )}
                  {research.division && (
                    <div>
                      <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">
                        Division
                      </p>
                      <p className="text-[#1A2B4A] font-medium text-sm">
                        {research.division.name}
                      </p>
                    </div>
                  )}
                  {research.doi && (
                    <div className="sm:col-span-2">
                      <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">
                        DOI
                      </p>
                      <a
                        href={`https://doi.org/${research.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3B82F6] hover:underline font-mono text-sm break-all"
                      >
                        {research.doi}
                      </a>
                    </div>
                  )}
                </div>

                {(research.pdfUrl || research.url) && (
                  <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-3">
                    {research.pdfUrl && (
                      <a
                        href={research.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
                        style={{ background: accentColor }}
                      >
                        <ExternalLink size={16} />
                        View Full Paper
                      </a>
                    )}
                    {research.url && (
                      <a
                        href={research.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-gray-100 text-[#1A2B4A] hover:bg-gray-200 px-5 py-2.5 rounded-xl font-semibold transition-colors"
                      >
                        <ExternalLink size={16} />
                        External Link
                      </a>
                    )}
                  </div>
                )}
              </motion.div>

              {research.keywords && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-8"
                >
                  <p className="text-[#64748B] text-xs uppercase tracking-wider mb-2">
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {research.keywords.split(",").map((kw, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[#F1F5F9] text-[#64748B] text-sm rounded-full"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 mb-8"
              >
                <h2 className="font-bold text-[#1A2B4A] text-lg mb-3 flex items-center gap-2">
                  <FileText size={18} style={{ color: accentColor }} />
                  Cite This Research
                </h2>
                <div className="bg-[#F8FAFC] rounded-xl p-4 font-mono text-xs text-[#64748B] break-all">
                  {authorName} (
                  {new Date(
                    research.publicationDate || research.createdAt
                  ).getFullYear() || "2025"}
                  ). {research.title}.{" "}
                  {research.venue || "PPI Auckland Research Corner"}.
                  {research.doi && ` https://doi.org/${research.doi}`}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-8 border-t border-gray-200"
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
                      className="px-4 py-2 bg-[#E8231A] text-white rounded-lg hover:bg-[#C41E16] text-sm font-medium flex items-center gap-2"
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
                    <h4 className="font-semibold text-[#1A2B4A] mb-4">
                      Leave a Comment
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        required
                        placeholder="Your name"
                        value={commentForm.name}
                        onChange={(e) =>
                          setCommentForm({ ...commentForm, name: e.target.value })
                        }
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] outline-none text-sm"
                      />
                      <input
                        type="email"
                        required
                        placeholder="Your email"
                        value={commentForm.email}
                        onChange={(e) =>
                          setCommentForm({ ...commentForm, email: e.target.value })
                        }
                        className="px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] outline-none text-sm"
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
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#E8231A] outline-none resize-none mb-4 text-sm"
                    />
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCommentForm(false);
                          setCommentForm({ name: "", email: "", content: "" });
                        }}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-[#64748B] hover:bg-gray-50 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="px-5 py-2 bg-[#E8231A] text-white rounded-lg hover:bg-[#C41E16] text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                      >
                        {submittingComment && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
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
                    <p className="text-sm">
                      No comments yet. Be the first to comment!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-[#F8FAFC] rounded-xl p-5 border border-gray-100"
                      >
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
                                setReplyingTo(
                                  replyingTo === comment.id ? null : comment.id
                                );
                                setShowCommentForm(true);
                              }}
                              className="text-xs text-[#E8231A] hover:underline mt-2 flex items-center gap-1"
                            >
                              <Reply className="w-3 h-3" /> Reply
                            </button>
                          </div>
                        </div>
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
                                setCommentForm({
                                  ...commentForm,
                                  content: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#E8231A] outline-none resize-none text-xs mb-2"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setShowCommentForm(false);
                                  setCommentForm({
                                    name: "",
                                    email: "",
                                    content: "",
                                  });
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
                                {submittingComment && (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                )}
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

            <div className="lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                  <h4 className="font-semibold text-[#1A2B4A] text-sm mb-4">Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#64748B] text-sm">
                        <Eye size={14} />
                        <span>Views</span>
                      </div>
                      <span className="font-semibold text-[#1A2B4A]">
                        {research.viewCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#64748B] text-sm">
                        <Download size={14} />
                        <span>Downloads</span>
                      </div>
                      <span className="font-semibold text-[#1A2B4A]">
                        {research.downloadCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                  <h4 className="font-semibold text-[#1A2B4A] text-sm mb-4">Author</h4>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: accentColor }}
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[#1A2B4A] text-sm">{authorName}</p>
                      {research.division && (
                        <p className="text-[#64748B] text-xs">{research.division.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {research.tags && research.tags.length > 0 && (
                  <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                    <h4 className="font-semibold text-[#1A2B4A] text-sm mb-4">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {research.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1 text-sm rounded-full"
                          style={{
                            background: `${tag.color}15`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href="/activities/research-corner"
                  className="flex items-center justify-between gap-2 bg-[#1A2B4A] hover:bg-[#0D1B33] text-white px-5 py-3 rounded-xl font-semibold transition-colors group"
                >
                  <span>More Research</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}