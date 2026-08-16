'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Paperclip,
  Mail,
  User,
  Clock,
  Folder,
  Archive,
  Trash2,
  FolderPlus,
  MoreVertical,
  MoveRight,
  Edit2,
  Check,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MessageFolder = {
  id: string;
  name: string;
  color: string;
  icon: string;
  _count: {
    threads: number;
  };
};

type Thread = {
  id: string;
  subject: string | null;
  updatedAt: Date;
  isArchived: boolean;
  folderId: string | null;
  messages: Message[];
  participants: Participant[];
};

type Message = {
  id: string;
  content: string;
  senderUserId: string | null;
  senderName: string | null;
  createdAt: Date;
};

type Participant = {
  userId: string;
  user: {
    name: string;
    email: string | null;
  };
};

export function EnhancedMessageCenter({
  initialThreads,
  userId,
}: {
  initialThreads: Thread[];
  userId: string;
}) {
  const [threads] = useState<Thread[]>(initialThreads);
  const [folders, setFolders] = useState<MessageFolder[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showFoldersDrawer, setShowFoldersDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedThread) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedThread?.messages.length, selectedThread]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/customer/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/customer/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName }),
      });

      if (response.ok) {
        setNewFolderName('');
        setShowNewFolderDialog(false);
        fetchFolders();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const updateFolder = async (folderId: string, name: string) => {
    try {
      const response = await fetch(`/api/customer/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        fetchFolders();
        setEditingFolderId(null);
      }
    } catch (error) {
      console.error('Error updating folder:', error);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) return;

    try {
      const response = await fetch(`/api/customer/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFolders();
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const moveToFolder = async (threadId: string, folderId: string | null) => {
    try {
      const response = await fetch(`/api/customer/messages/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error moving thread:', error);
    }
  };

  const archiveThread = async (threadId: string, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/customer/messages/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error archiving thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const response = await fetch(`/api/customer/messages/${threadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThreadId) return;

    setSending(true);
    try {
      const response = await fetch('/api/customer/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThreadId,
          message: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = threads.filter((thread) => {
    if (showArchived && !thread.isArchived) return false;
    if (!showArchived && thread.isArchived) return false;
    if (selectedFolder && thread.folderId !== selectedFolder) return false;
    if (!selectedFolder && !showArchived && thread.folderId) return false;
    return true;
  });

  const getOtherParticipant = (thread: Thread) => {
    return thread.participants.find((p) => p.userId !== userId);
  };

  const currentFolderLabel = showArchived
    ? 'Archived'
    : selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?.name || 'Folder'
    : 'All Messages';

  const currentFolderCount = showArchived
    ? threads.filter((t) => t.isArchived).length
    : selectedFolder
    ? folders.find((f) => f.id === selectedFolder)?._count.threads || 0
    : threads.filter((t) => !t.isArchived && !t.folderId).length;

  // ── Folder list (shared between sidebar and mobile drawer) ───────────────
  const FolderList = ({ onSelect }: { onSelect?: () => void }) => (
    <div className="divide-y divide-gray-200">
      <button
        onClick={() => {
          setSelectedFolder(null);
          setShowArchived(false);
          onSelect?.();
        }}
        className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
          !selectedFolder && !showArchived ? 'bg-blue-50' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">All Messages</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {threads.filter((t) => !t.isArchived && !t.folderId).length}
          </Badge>
        </div>
      </button>

      {folders.map((folder) => (
        <div
          key={folder.id}
          className={`group ${selectedFolder === folder.id ? 'bg-blue-50' : ''}`}
        >
          {editingFolderId === folder.id ? (
            <div className="p-3 flex items-center gap-2">
              <Input
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateFolder(folder.id, editingFolderName);
                  if (e.key === 'Escape') setEditingFolderId(null);
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateFolder(folder.id, editingFolderName)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setSelectedFolder(folder.id);
                setShowArchived(false);
                onSelect?.();
              }}
              className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color }} />
                <span className="text-sm font-medium truncate">{folder.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {folder._count.threads}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingFolderId(folder.id);
                        setEditingFolderName(folder.name);
                      }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFolder(folder.id);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
          )}
        </div>
      ))}

      <button
        onClick={() => {
          setSelectedFolder(null);
          setShowArchived(true);
          onSelect?.();
        }}
        className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
          showArchived ? 'bg-blue-50' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Archived</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {threads.filter((t) => t.isArchived).length}
          </Badge>
        </div>
      </button>
    </div>
  );

  // Mobile view: show ONE of {folders, thread list, chat}
  const mobileView: 'list' | 'chat' = selectedThreadId ? 'chat' : 'list';

  return (
    <>
      {/* Mobile folder selector */}
      <div className="lg:hidden mb-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowFoldersDrawer(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-1 min-w-0"
        >
          <Folder className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <span className="truncate">{currentFolderLabel}</span>
          <Badge variant="secondary" className="text-xs ml-auto flex-shrink-0">
            {currentFolderCount}
          </Badge>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        </button>
        <Button
          onClick={() => setShowNewFolderDialog(true)}
          variant="outline"
          size="sm"
          className="flex-shrink-0"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Sidebar - Folders (desktop) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Folders</h3>
              <Button
                onClick={() => setShowNewFolderDialog(true)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
            <FolderList />
          </div>
        </div>

        {/* Thread List */}
        <div
          className={`lg:col-span-1 ${mobileView === 'chat' ? 'hidden lg:block' : 'block'}`}
        >
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 truncate">
                {currentFolderLabel}
              </h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] lg:max-h-[600px] overflow-y-auto">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No messages</p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const otherParticipant = getOtherParticipant(thread);
                  const lastMessage = thread.messages[thread.messages.length - 1];

                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedThreadId === thread.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-blue-100 flex-shrink-0">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {otherParticipant?.user.name || 'Unknown'}
                          </p>
                          {thread.subject && (
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {thread.subject}
                            </p>
                          )}
                          {lastMessage && (
                            <p className="text-xs text-gray-500 truncate">
                              {lastMessage.content.substring(0, 60)}
                              {lastMessage.content.length > 60 ? '…' : ''}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(thread.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div
          className={`lg:col-span-2 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}
        >
          <div className="rounded-xl border-2 border-gray-200 bg-white shadow-sm flex flex-col h-[calc(100vh-220px)] lg:h-[700px]">
            {selectedThread && (
              <>
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedThreadId(null)}
                      className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex-shrink-0"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {selectedThread.subject ||
                          getOtherParticipant(selectedThread)?.user.name ||
                          'Conversation'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                        {getOtherParticipant(selectedThread)?.user.email && (
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {getOtherParticipant(selectedThread)?.user.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            archiveThread(
                              selectedThread.id,
                              !selectedThread.isArchived
                            )
                          }
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {selectedThread.isArchived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {folders.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                              Move to folder
                            </div>
                            <DropdownMenuItem
                              onClick={() => moveToFolder(selectedThread.id, null)}
                            >
                              <MoveRight className="h-4 w-4 mr-2" />
                              No folder
                            </DropdownMenuItem>
                            {folders.map((folder) => (
                              <DropdownMenuItem
                                key={folder.id}
                                onClick={() =>
                                  moveToFolder(selectedThread.id, folder.id)
                                }
                              >
                                <Folder
                                  className="h-4 w-4 mr-2"
                                  style={{ color: folder.color }}
                                />
                                {folder.name}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => deleteThread(selectedThread.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50/30">
                  {selectedThread.messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      No messages in this conversation yet
                    </div>
                  ) : (
                    selectedThread.messages.map((message) => {
                      const isOwnMessage = message.senderUserId === userId;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isOwnMessage ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 break-words ${
                              isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            {!isOwnMessage && message.senderName && (
                              <p className="text-xs font-medium mb-1 opacity-75">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">
                              {message.content}
                            </p>
                            <div
                              className={`flex items-center gap-1 mt-2 text-xs ${
                                isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 sm:p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 min-w-0 rounded-lg border-2 border-gray-200 p-2.5 sm:p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-gray-200 flex-shrink-0"
                    >
                      <Paperclip className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      size="sm"
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white flex-shrink-0"
                    >
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">
                        {sending ? 'Sending...' : 'Send'}
                      </span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!selectedThread && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">Select a conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile folders drawer */}
      <Dialog open={showFoldersDrawer} onOpenChange={setShowFoldersDrawer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Folders</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <FolderList onSelect={() => setShowFoldersDrawer(false)} />
          </div>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your messages by creating custom folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Important, Projects, etc."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
