"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatBoxProps {
  onClose?: () => void;
}

type Friend = {
  id: string;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
};

type ThreadMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderUserId: string | null;
  senderName: string | null;
};

interface ThreadResponse {
  thread: {
    id: string;
    messages: ThreadMessage[];
  };
}

export function SocialChatBox({ onClose }: ChatBoxProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [pendingFriendIds, setPendingFriendIds] = useState<string[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await fetch("/api/users/friends");
        const data = await res.json();
        if (res.ok && Array.isArray(data.friends)) {
          setFriends(data.friends);
        }
      } catch {
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setSearchResults(data.users);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFriend = async (user: Friend) => {
    try {
      setPendingFriendIds((prev) =>
        prev.includes(user.id) ? prev : [...prev, user.id]
      );

      const res = await fetch("/api/users/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPendingFriendIds((prev) =>
          prev.filter((id) => id !== user.id)
        );
        return;
      }

      if (data.status === "accepted") {
        setFriends((prev) => {
          if (prev.some((f) => f.id === user.id)) return prev;
          return [...prev, user];
        });
        setPendingFriendIds((prev) =>
          prev.filter((id) => id !== user.id)
        );
      }
    } catch {
      setPendingFriendIds((prev) => prev.filter((id) => id !== user.id));
    }
  };

  const handleDeleteFriend = async (user: Friend) => {
    try {
      const res = await fetch("/api/users/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });

      if (!res.ok) return;

      setFriends((prev) => prev.filter((f) => f.id !== user.id));
      setPendingFriendIds((prev) => prev.filter((id) => id !== user.id));
    } catch {
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const minWidth = 140;
      const maxWidth = Math.max(180, rect.width * 0.6);
      const newWidth = event.clientX - rect.left;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const loadThreadForFriend = async (friend: Friend) => {
    setActiveFriend(friend);
    setMessages([]);
    setThreadId(null);

    if (!friend.email && !friend.phoneNumber && !friend.name) return;

    try {
      setLoadingThread(true);

      const createRes = await fetch("/api/messages/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier:
            friend.email || friend.phoneNumber || friend.name,
          message: "",
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.threadId) {
        return;
      }

      const id = createData.threadId as string;
      setThreadId(id);

      const threadRes = await fetch(`/api/messages/threads/${id}`);
      if (!threadRes.ok) return;
      const threadData = (await threadRes.json()) as ThreadResponse;

      const ordered = [...(threadData.thread.messages || [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      );
      setMessages(ordered);
    } catch {
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId) return;

    const content = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`/api/messages/threads/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok || !data.message) {
        return;
      }

      const newMessage: ThreadMessage = {
        id: data.message.id,
        content: data.message.content,
        createdAt: data.message.createdAt,
        senderUserId: data.message.senderUserId,
        senderName: data.message.senderName,
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full bg-white dark:bg-slate-950 rounded-lg shadow-lg overflow-hidden text-slate-900 dark:text-slate-50 select-none"
    >
      <aside
        className="hidden sm:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80"
        style={{ width: sidebarWidth }}
      >
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          People
        </div>
        <div className="px-2 pt-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or phone"
              className="h-7 text-[11px] px-2 py-1 rounded-md dark:bg-slate-800 dark:border-slate-700"
            />
            <Button
              type="submit"
              size="icon"
              className="h-7 w-7 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <span className="text-[10px]">Go</span>
            </Button>
          </form>
          {searchLoading && (
            <p className="mt-1 text-[10px] text-slate-400">Searching...</p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-xs">
          {loadingFriends && (
            <p className="text-slate-400 text-[11px] px-1">
              Loading friends...
            </p>
          )}
          {!loadingFriends && friends.length === 0 && (
            <p className="text-slate-400 text-[11px] px-1">No friends yet.</p>
          )}
          {friends.map((f) => (
            <button
              key={f.id}
              onClick={() => loadThreadForFriend(f)}
              className={`w-full text-left rounded-lg px-2 py-1.5 border text-[11px] mb-0.5 transition-colors ${
                activeFriend?.id === f.id
                  ? "border-violet-400 bg-violet-500/20 text-violet-100"
                  : "border-white/10 bg-slate-900/40 text-slate-200 hover:border-violet-400/60 hover:bg-slate-900/80"
              }`}
            >
              <div className="font-medium truncate">{f.name || "User"}</div>
              {f.email && (
                <div className="text-[10px] text-slate-400 truncate">
                  {f.email}
                </div>
              )}
            </button>
          ))}
          {searchResults.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-800/60">
              <p className="text-[10px] text-slate-400 mb-1 px-1">
                Search results
              </p>
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="w-full rounded-lg px-2 py-1.5 border border-dashed border-white/15 mb-0.5 text-[11px] bg-slate-900/40 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.name || "User"}</div>
                      {u.email && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.email}
                        </div>
                      )}
                    </div>
                    {friends.some((f) => f.id === u.id) ? (
                      <Button
                        type="button"
                        onClick={() => handleDeleteFriend(u)}
                        className="h-6 px-2 text-[10px] bg-slate-700 hover:bg-slate-800 text-slate-50"
                      >
                        Delete
                      </Button>
                    ) : pendingFriendIds.includes(u.id) ? (
                      <Button
                        type="button"
                        disabled
                        className="h-6 px-2 text-[10px] bg-slate-600 text-slate-100 cursor-default"
                      >
                        Sent
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleAddFriend(u)}
                        className="h-6 px-2 text-[10px] bg-violet-600 hover:bg-violet-700 text-white"
                      >
                        Add
                      </Button>
                    )}
                  </div>
                  {u.phoneNumber && (
                    <div className="text-[10px] text-slate-500 truncate">
                      {u.phoneNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div
        className="hidden sm:block w-1 cursor-col-resize bg-transparent hover:bg-violet-500/40"
        onMouseDown={() => setIsResizing(true)}
      />

      <div className="flex flex-1 flex-col select-text">
        <div className="bg-gradient-to-r from-violet-700 to-blue-700 text-white px-3 py-2 flex items-center justify-between text-xs md:text-sm">
          <div className="flex flex-col">
            <span className="font-semibold">
              {activeFriend
                ? activeFriend.name || activeFriend.email || "Conversation"
                : "Direct Messages"}
            </span>
            <span className="text-[11px] text-violet-100/90">
              {activeFriend
                ? "Private chat — minimized like an office messenger"
                : "Pick someone on the left to start chatting"}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/15 rounded transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50 dark:bg-slate-900">
          {!activeFriend && (
            <div className="flex h-full items-center justify-center text-center text-[12px] text-slate-500 dark:text-slate-400 px-4">
              <div>
                <p className="mb-1 font-medium">
                  Welcome to RockEnMyVibe Messenger
                </p>
                <p>
                  Select a friend or coworker on the left to start a private
                  chat.
                </p>
              </div>
            </div>
          )}

          {activeFriend && loadingThread && (
            <p className="text-[11px] text-slate-400">
              Loading conversation...
            </p>
          )}

          {activeFriend && !loadingThread && messages.length === 0 && (
            <p className="text-[11px] text-slate-400">
              Say hi to start this conversation.
            </p>
          )}

          {messages.map((m) => {
            const mine = false;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] md:text-[13px] shadow border border-white/5 ${
                    mine
                      ? "ml-auto bg-violet-600/80 text-slate-50"
                      : "mr-auto bg-slate-800/80 text-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100/80">
                      {mine
                        ? "You"
                        : m.senderName || activeFriend?.name || "Other"}
                    </span>
                    <span className="text-[9px] text-slate-200/70">
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                activeFriend
                  ? "Type a message... (Enter to send)"
                  : "Select someone first"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading || !activeFriend || !threadId}
              className="flex-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-slate-800 dark:text-white dark:border-slate-700 text-xs md:text-sm"
            />
            <Button
              type="submit"
              disabled={
                isLoading || !input.trim() || !activeFriend || !threadId
              }
              className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-700 dark:hover:bg-violet-800 text-white rounded-lg px-3 py-2 flex items-center gap-1 text-xs md:text-sm"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            This chat can be minimized at any time  perfect for office or
            movie mode.
          </p>
        </div>
      </div>
    </div>
  );
}

