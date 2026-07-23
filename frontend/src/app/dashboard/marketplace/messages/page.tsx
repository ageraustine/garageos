"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import {
  api,
  MarketplaceConversationItem,
  MarketplaceConversation,
} from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialConversationId = searchParams.get("conversation");

  const [conversations, setConversations] = useState<MarketplaceConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<MarketplaceConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [role]);

  useEffect(() => {
    if (initialConversationId && !selectedConversation) {
      loadConversation(Number(initialConversationId));
    }
  }, [initialConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await api.marketplace.conversations.list(role);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id: number) => {
    try {
      setLoadingConversation(true);
      const data = await api.marketplace.conversations.get(id);
      setSelectedConversation(data);
      // Mark as read
      await api.marketplace.conversations.markAsRead(id);
      // Refresh list to update unread counts
      loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const message = await api.marketplace.conversations.sendMessage(
        selectedConversation.id,
        newMessage.trim()
      );
      setSelectedConversation({
        ...selectedConversation,
        messages: [...selectedConversation.messages, message],
      });
      setNewMessage("");
      loadConversations(); // Refresh to update last_message_at
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/marketplace" className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Messages</h1>
            <p className="text-navy-600">Marketplace conversations</p>
          </div>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-navy-100 rounded-lg p-1">
          <button
            onClick={() => setRole("buyer")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "buyer"
                ? "bg-white text-navy-900 shadow"
                : "text-navy-600 hover:text-navy-900"
            }`}
          >
            As Buyer
          </button>
          <button
            onClick={() => setRole("seller")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              role === "seller"
                ? "bg-white text-navy-900 shadow"
                : "text-navy-600 hover:text-navy-900"
            }`}
          >
            As Seller
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden h-[calc(100vh-220px)] flex">
        {/* Conversation List */}
        <div className="w-80 border-r border-navy-100 flex flex-col">
          <div className="p-4 border-b border-navy-100">
            <p className="text-sm text-navy-500">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-3 border-gold-500 border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg
                  className="w-12 h-12 mx-auto text-navy-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-navy-500">No conversations yet</p>
                <p className="text-sm text-navy-400 mt-1">
                  {role === "buyer"
                    ? "Browse listings and message sellers"
                    : "Wait for buyers to contact you"}
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full p-4 text-left border-b border-navy-50 hover:bg-navy-50 transition-colors ${
                    selectedConversation?.id === conv.id ? "bg-gold-50" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-12 h-12 flex-shrink-0 bg-navy-100 rounded-lg overflow-hidden">
                      {conv.listing_image_url ? (
                        <img
                          src={conv.listing_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-navy-900 truncate">
                          {conv.other_party_name}
                        </span>
                        <span className="text-xs text-navy-400 flex-shrink-0">
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <p className="text-sm text-navy-600 truncate">{conv.listing_title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-navy-400 truncate">
                          {conv.last_message || "No messages yet"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 bg-gold-500 text-white text-xs font-medium rounded-full flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {loadingConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
            </div>
          ) : selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-navy-100 flex items-center gap-4">
                <Link
                  href={`/dashboard/marketplace/listings/${selectedConversation.listing.id}`}
                  className="w-12 h-12 flex-shrink-0 bg-navy-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                >
                  {selectedConversation.listing.primary_image_url ? (
                    <img
                      src={selectedConversation.listing.primary_image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/marketplace/listings/${selectedConversation.listing.id}`}
                    className="font-semibold text-navy-900 hover:text-gold-600 truncate block"
                  >
                    {selectedConversation.listing.title}
                  </Link>
                  <p className="text-sm text-navy-500">
                    {role === "buyer"
                      ? `Seller: ${selectedConversation.seller.name}`
                      : `Buyer: ${selectedConversation.buyer.name || selectedConversation.buyer.phone || "Unknown"}`}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => {
                  const isOwn =
                    (role === "buyer" && msg.sender_type === "buyer") ||
                    (role === "seller" && msg.sender_type === "seller");

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-gold-500 text-white rounded-tr-none"
                            : "bg-navy-100 text-navy-900 rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? "text-gold-200" : "text-navy-400"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-navy-100 flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
                <Button type="submit" variant="primary" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <svg
                className="w-16 h-16 text-navy-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-navy-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-navy-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
