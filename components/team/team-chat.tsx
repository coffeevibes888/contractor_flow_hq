'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Hash, Users, Plus, Settings, ChevronDown, 
  MessageSquare, Search, X, MoreVertical, Bell, BellOff,
  Smile, Paperclip, AtSign, UserPlus, Mail, Heart, ThumbsUp,
  Image as ImageIcon, File, Download, Trash2, Inbox, ArrowLeft, Circle, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTeamChatWebSocket } from '@/hooks/use-team-chat-websocket';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { Theme } from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  status?: 'online' | 'away' | 'offline';
  userId?: string;
  invitedEmail?: string;
  joinedAt?: string;
}

interface TeamMemberData {
  id: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'active' | 'inactive';
  invitedEmail?: string;
  permissions: string[];
  joinedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  } | null;
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  description?: string;
  unreadCount?: number;
  members?: TeamMember[];
}

interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  createdAt: string;
  isEdited?: boolean;
  reactions?: { emoji: string; users: string[]; count: number }[];
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: 'image' | 'file';
    size?: number;
  }[];
}

interface TeamChatProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  landlordId: string;
  onClose?: () => void;
  isFullPage?: boolean;
  teamMembers?: TeamMemberData[];
  canManageTeam?: boolean;
  onRolesClick?: () => void;
  apiPrefix?: string; // 'landlord' or 'contractor'
}

const STATUS_COLORS = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-slate-500',
};

// Inbox thread types (from marketplace/contractor messages)
interface InboxThreadUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface InboxThreadSummary {
  id: string;
  subject: string | null;
  updatedAt: string;
  otherUser: InboxThreadUser | null;
  lastMessage: {
    id: string;
    content: string;
    senderUserId: string | null;
    createdAt: string;
  } | null;
  isUnread: boolean;
}

interface InboxMessage {
  id: string;
  content: string;
  senderUserId: string | null;
  senderName: string | null;
  createdAt: string;
}

export function TeamChat({ 
  currentUser, 
  landlordId, 
  onClose, 
  isFullPage = false, 
  teamMembers: initialTeamMembers = [],
  canManageTeam = false,
  onRolesClick,
  apiPrefix = 'landlord',
}: TeamChatProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [channelLoadError, setChannelLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const loadChannels = useCallback(async () => {
    try {
      console.log('Loading channels...');
      const res = await fetch(`/api/${apiPrefix}/team/channels`);
      const data = await res.json();
      console.log('Channels response:', data);
      if (data.success && data.channels && data.channels.length > 0) {
        console.log('Setting channels:', data.channels);
        setChannels(data.channels);
        setActiveChannel(prev => prev ?? data.channels[0]);
        setChannelLoadError(null);
      } else {
        console.error('No channels available:', data.message);
        setChannels([]);
        setActiveChannel(null);
        setChannelLoadError(data.message || 'Failed to load chat channels');
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      setChannels([]);
      setActiveChannel(null);
      setChannelLoadError('Failed to load chat channels');
    }
  }, [apiPrefix]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);
  const [newChannelType, setNewChannelType] = useState<'public' | 'private'>('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembers, setShowMembers] = useState(!isFullPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [teamMembersData, setTeamMembersData] = useState<TeamMemberData[]>(initialTeamMembers);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showDMPicker, setShowDMPicker] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionPickerRef = useRef<HTMLDivElement>(null);

  // Inbox state (marketplace/contractor messages integrated into team chat)
  const [inboxView, setInboxView] = useState<'none' | 'threads' | 'chat'>('none');
  const [inboxThreads, setInboxThreads] = useState<InboxThreadSummary[]>([]);
  const [selectedInboxThreadId, setSelectedInboxThreadId] = useState<string | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [inboxNewMessage, setInboxNewMessage] = useState('');
  const [inboxSending, setInboxSending] = useState(false);
  const [inboxLoadingThreads, setInboxLoadingThreads] = useState(true);
  const [inboxLoadingMessages, setInboxLoadingMessages] = useState(false);
  const inboxMessagesEndRef = useRef<HTMLDivElement>(null);
  const inboxPollRef = useRef<NodeJS.Timeout | null>(null);

  const selectedInboxThread = inboxThreads.find((t) => t.id === selectedInboxThreadId);
  const inboxUnreadCount = inboxThreads.filter((t) => t.isUnread).length;

  // Load team members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch(`/api/${apiPrefix}/team/members`);
        const data = await res.json();
        if (data.success && data.members) {
          setTeamMembersData(data.members);
          setMembers(data.members.map((m: TeamMemberData) => ({
            id: m.userId,
            name: m.user?.name || m.invitedEmail || 'Team Member',
            email: m.user?.email || m.invitedEmail,
            image: m.user?.image,
            role: m.role,
            status: 'online',
          })));
        }
      } catch {
        setMembers([{
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
          role: 'owner',
          status: 'online',
        }]);
      }
    };
    loadMembers();
  }, [currentUser, apiPrefix]);

  // --- Inbox (marketplace/contractor messages) logic ---
  const fetchInboxThreads = useCallback(async () => {
    if (!currentUser.id) return;
    try {
      const res = await fetch('/api/contractor/chat/threads');
      if (res.ok) {
        const data = await res.json();
        setInboxThreads(data.threads || []);
      }
    } catch {
      // silent
    } finally {
      setInboxLoadingThreads(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (!currentUser.id) return;
    fetchInboxThreads();
    const interval = setInterval(fetchInboxThreads, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id, fetchInboxThreads]);

  const fetchInboxMessages = useCallback(async () => {
    if (!selectedInboxThreadId) return;
    try {
      const res = await fetch(
        `/api/contractor/chat/messages?threadId=${selectedInboxThreadId}`
      );
      if (res.ok) {
        const data = await res.json();
        setInboxMessages(data.messages || []);
      }
    } catch {
      // silent
    } finally {
      setInboxLoadingMessages(false);
    }
  }, [selectedInboxThreadId]);

  useEffect(() => {
    if (selectedInboxThreadId) {
      setInboxLoadingMessages(true);
      fetchInboxMessages();
      if (inboxPollRef.current) clearInterval(inboxPollRef.current);
      inboxPollRef.current = setInterval(fetchInboxMessages, 5000);
    }
    return () => {
      if (inboxPollRef.current) clearInterval(inboxPollRef.current);
    };
  }, [selectedInboxThreadId, fetchInboxMessages]);

  useEffect(() => {
    inboxMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [inboxMessages]);

  const handleInboxSend = async () => {
    if (!inboxNewMessage.trim() || !selectedInboxThreadId) return;
    setInboxSending(true);
    try {
      const res = await fetch('/api/contractor/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inboxNewMessage.trim(),
          threadId: selectedInboxThreadId,
          recipientUserId: selectedInboxThread?.otherUser?.id,
        }),
      });
      if (res.ok) {
        setInboxNewMessage('');
        fetchInboxMessages();
        fetchInboxThreads();
      }
    } catch {
      // silent
    } finally {
      setInboxSending(false);
    }
  };

  const openInboxThread = (threadId: string) => {
    setSelectedInboxThreadId(threadId);
    setInboxView('chat');
    // Clear the active channel so the main area shows inbox chat
    setActiveChannel(null);
  };

  const backToInboxThreads = () => {
    setSelectedInboxThreadId(null);
    setInboxView('threads');
    setInboxMessages([]);
  };

  const openInboxList = () => {
    setInboxView('threads');
    setSelectedInboxThreadId(null);
    setActiveChannel(null);
  };

  const exitInbox = () => {
    setInboxView('none');
    setSelectedInboxThreadId(null);
    setInboxMessages([]);
    // Re-select first channel if available
    if (channels.length > 0) {
      setActiveChannel(channels[0]);
    }
  };
  // --- End Inbox logic ---

  // WebSocket integration
  const {
    isConnected,
    joinChannel,
    leaveChannel,
    broadcastNewMessage,
    broadcastReaction,
    sendTyping
  } = useTeamChatWebSocket({
    onNewMessage: (message) => {
      console.log('Received new message via WebSocket:', message);
      setMessages(prevMessages => {
        // Check if message already exists (avoid duplicates)
        const exists = prevMessages.some(m => m.id === message.id);
        if (!exists) {
          return [...prevMessages, message];
        }
        return prevMessages;
      });
    },
    onMessageReaction: (messageId, reaction, userId) => {
      console.log('Received reaction via WebSocket:', messageId, reaction, userId);
      // Handle reaction updates here if needed
    },
    onUserTyping: (userId) => {
      console.log('User typing:', userId);
      // Handle typing indicators here if needed
    },
    onUserStopTyping: (userId) => {
      console.log('User stopped typing:', userId);
      // Handle typing indicators here if needed
    },
    onConnectionChange: (connected) => {
      console.log('WebSocket connection changed:', connected);
      if (!connected) {
        console.warn('WebSocket disconnected - messages will still work via REST API');
      } else {
        console.log('WebSocket connected - real-time messaging enabled');
      }
    }
  });

  // Handle WebSocket connection changes separately
  useEffect(() => {
    if (!activeChannel?.id) return;
    
    // Join WebSocket channel when connection status changes
    if (isConnected) {
      joinChannel(activeChannel.id);
    }
  }, [isConnected, activeChannel?.id, joinChannel]);

  // Load messages for active channel (initial load + polling fallback when WebSocket is down)
  useEffect(() => {
    if (!activeChannel?.id) return;
    
    let isMounted = true;
    
    const loadMessages = async () => {
      try {
        console.log('Loading messages for channel:', activeChannel.id);
        const res = await fetch(`/api/landlord/team/channels/${activeChannel.id}/messages`);
        const data = await res.json();
        if (data.success && data.messages && isMounted) {
          console.log('Loaded messages:', data.messages.length);
          setMessages(data.messages || []);
        } else if (isMounted) {
          // Silently handle channel not found or auth errors - they may not exist yet or user may not be authenticated
          if (data.message !== 'Channel not found' && !res.status.toString().startsWith('4')) {
            console.error('Failed to load messages:', data.message);
          }
          setMessages([]);
        }
      } catch (error) {
        if (isMounted) {
          // Silently handle errors - channel may not exist yet
          setMessages([]);
        }
      }
    };
    
    // Load initial messages
    loadMessages();
    
    // Join WebSocket channel
    joinChannel(activeChannel.id);
    
    // Set up polling as fallback when WebSocket is disconnected (less frequent)
    let pollInterval: NodeJS.Timeout | undefined;
    let pollTimeout: NodeJS.Timeout | undefined;
    
    const startPolling = () => {
      if (!isConnected && isMounted) {
        console.log('Starting message polling (WebSocket disconnected)');
        pollInterval = setInterval(() => {
          if (!isConnected && isMounted) {
            loadMessages();
          }
        }, 15000); // Poll every 15 seconds when disconnected (increased from 10 seconds)
      }
    };
    
    const stopPolling = () => {
      if (pollInterval) {
        console.log('Stopping message polling (WebSocket connected)');
        clearInterval(pollInterval);
        pollInterval = undefined;
      }
    };
    
    // Start polling if already disconnected (with delay to avoid immediate polling)
    pollTimeout = setTimeout(() => {
      if (!isConnected && isMounted) {
        startPolling();
      }
    }, 5000); // Wait 5 seconds before starting polling (increased from 2 seconds)
    
    return () => {
      // Cleanup
      isMounted = false;
      leaveChannel();
      stopPolling();
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, [activeChannel?.id]); // Only depend on activeChannel.id, not the whole object or other changing values

  // Scroll to bottom on new messages (only if user is near bottom)
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;
    
    // Check if user is near the bottom (within 100px)
    const isNearBottom = 
      messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
    
    // Only auto-scroll if user is already near the bottom
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && uploadedFiles.length === 0) || !activeChannel) return;

    const content = input.trim();
    console.log('Sending message:', content, 'to channel:', activeChannel.id);
    setInput('');
    setIsLoading(true);

    // Upload files first if any
    const attachments = await handleFileUpload();
    setUploadedFiles([]);
    setShowFilePreview(false);

    try {
      const res = await fetch(`/api/landlord/team/channels/${activeChannel.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, attachments }),
      });
      const data = await res.json();
      
      console.log('Message sent response:', data);
      
      if (data.success && data.message) {
        // Add the message directly to the list (no temporary message needed)
        const newMessage = { 
          ...data.message, 
          channelId: activeChannel.id, 
          senderName: currentUser.name, 
          senderImage: currentUser.image 
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // Only broadcast to WebSocket if connected, otherwise rely on server broadcast
        if (isConnected) {
          broadcastNewMessage(newMessage);
        } else {
          console.log('WebSocket not connected, relying on server broadcast');
        }
      } else {
        // If channel not found, try to reload channels and retry
        if (data.message === 'Channel not found') {
          console.log('Channel not found, reloading channels...');
          await loadChannels();
          alert('Channel was not found. Please try sending your message again.');
        } else {
          // Show error message
          console.error('Failed to send message:', data.message);
          alert('Failed to send message: ' + (data.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);
    
    try {
      const res = await fetch('/api/landlord/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      
      if (data.success) {
        setInviteSuccess(true);
        if (data.member) {
          setTeamMembersData([...teamMembersData, data.member]);
        }
        // Close dialog after short delay to show success
        setTimeout(() => {
          setShowInviteDialog(false);
          setInviteEmail('');
          setInviteRole('member');
          setInviteSuccess(false);
        }, 1500);
      } else {
        setInviteError(data.message || 'Failed to send invitation');
      }
    } catch {
      setInviteError('Network error. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  // File upload handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setShowFilePreview(true);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (uploadedFiles.length === 0) return [];
    
    setIsUploading(true);
    const uploadedUrls: { id: string; name: string; url: string; type: 'image' | 'file'; size: number }[] = [];
    
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('landlordId', landlordId);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await res.json();
        if (data.success && data.url) {
          uploadedUrls.push({
            id: `file-${Date.now()}-${Math.random()}`,
            name: file.name,
            url: data.url,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            size: file.size,
          });
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
    
    return uploadedUrls;
  };

  // Emoji picker handlers
  const handleEmojiSelect = (emojiData: any) => {
    setInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Mention picker handlers
  const handleMentionSelect = (member: TeamMember) => {
    setInput(prev => prev + `@${member.name} `);
    setShowMentionPicker(false);
    setMentionSearch('');
    inputRef.current?.focus();
  };

  const filteredMembersForMention = members.filter(m => 
    m.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Start a direct message with a member
  const handleStartDM = async (member: TeamMember) => {
    try {
      // Check if DM channel already exists
      const existingDM = channels.find(c => 
        c.type === 'direct' && 
        c.members?.some(m => m.id === member.id)
      );
      
      if (existingDM) {
        setActiveChannel(existingDM);
        setShowDMPicker(false);
        setDmSearch('');
        setIsMobileMenuOpen(false);
        return;
      }
      
      // Create new DM channel
      const res = await fetch('/api/landlord/team/channels/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id }),
      });
      const data = await res.json();
      
      if (data.success && data.channel) {
        setChannels(prev => [...prev, data.channel]);
        setActiveChannel(data.channel);
      } else {
        // Fallback: create local DM channel for demo
        const dmChannel: Channel = {
          id: `dm-${member.id}-${Date.now()}`,
          name: member.name,
          type: 'direct',
          members: [member],
        };
        setChannels(prev => [...prev, dmChannel]);
        setActiveChannel(dmChannel);
      }
      
      setShowDMPicker(false);
      setDmSearch('');
      setIsMobileMenuOpen(false);
    } catch {
      console.error('Failed to start DM');
    }
  };

  const filteredMembersForDM = members.filter(m => 
    m.id !== currentUser.id && (
      m.name.toLowerCase().includes(dmSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(dmSearch.toLowerCase())
    )
  );

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (mentionPickerRef.current && !mentionPickerRef.current.contains(event.target as Node)) {
        setShowMentionPicker(false);
      }
    };

    if (showEmojiPicker || showMentionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showMentionPicker]);

  // Message reaction handlers
  const handleAddReaction = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    const userAlreadyReacted = existingReaction?.users.includes(currentUser.id);

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;

      const reactions = m.reactions || [];
      if (userAlreadyReacted) {
        // Remove reaction
        return {
          ...m,
          reactions: reactions.map(r => 
            r.emoji === emoji
              ? { ...r, users: r.users.filter(u => u !== currentUser.id), count: r.count - 1 }
              : r
          ).filter(r => r.count > 0),
        };
      } else {
        // Add reaction
        const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
        if (reactionIndex >= 0) {
          return {
            ...m,
            reactions: reactions.map((r, i) =>
              i === reactionIndex
                ? { ...r, users: [...r.users, currentUser.id], count: r.count + 1 }
                : r
            ),
          };
        } else {
          return {
            ...m,
            reactions: [...reactions, { emoji, users: [currentUser.id], count: 1 }],
          };
        }
      }
    }));

    // Send to server
    try {
      await fetch(`/api/landlord/team/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, action: userAlreadyReacted ? 'remove' : 'add' }),
      });
    } catch (error) {
      console.error('Reaction error:', error);
      // Revert on error (you could implement this)
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return;
    
    try {
      const res = await fetch(`/api/landlord/team/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        setTeamMembersData(teamMembersData.filter(m => m.id !== memberId));
      }
    } catch {
    }
  };

  const activeMembers = teamMembersData.filter(m => m.status === 'active');
  const pendingMembers = teamMembersData.filter(m => m.status === 'pending');

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const res = await fetch('/api/landlord/team/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          type: newChannelType,
        }),
      });
      const data = await res.json();
      
      if (data.success && data.channel) {
        setChannels(prev => [...prev, data.channel]);
        setActiveChannel(data.channel);
      } else {
        // Demo: add locally
        const newChannel: Channel = {
          id: `channel-${Date.now()}`,
          name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
          type: newChannelType,
        };
        setChannels(prev => [...prev, newChannel]);
        setActiveChannel(newChannel);
      }
      
      setShowCreateChannel(false);
      setNewChannelName('');
    } catch {
      // Demo: add locally
      const newChannel: Channel = {
        id: `channel-${Date.now()}`,
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: newChannelType,
      };
      setChannels(prev => [...prev, newChannel]);
      setActiveChannel(newChannel);
      setShowCreateChannel(false);
      setNewChannelName('');
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    
    msgs.forEach(msg => {
      const msgDate = new Date(msg.createdAt).toDateString();
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    
    return groups;
  };

  const containerClass = isFullPage
    ? 'relative flex h-full w-full rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl overflow-hidden min-h-0'
    : 'relative flex flex-col sm:flex-row h-full bg-slate-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl min-h-[500px] sm:min-h-[600px]';

  const sidebarClass = isFullPage
    ? `${isMobileMenuOpen ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-20 w-72 bg-slate-950/90 backdrop-blur-xl border-r border-white/10 flex-col`
    : `${isMobileMenuOpen ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-48 md:w-56 bg-slate-950 border-b sm:border-b-0 sm:border-r border-white/10 max-h-[200px] sm:max-h-none overflow-y-auto`;

  const membersSidebarClass = isFullPage
    ? 'hidden xl:block w-56 border-l border-white/10 bg-slate-900/50 overflow-y-auto'
    : 'hidden md:block w-40 lg:w-48 border-l border-white/10 bg-slate-900/50 overflow-y-auto';

  return (
    <div className={containerClass}>
      {isFullPage && isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute inset-0 z-10 bg-black/40"
        />
      )}
      {/* Sidebar */}
      <aside className={sidebarClass}>
        {/* Workspace Header */}
        <div className="p-3 border-b border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                    PM
                  </div>
                  <span className="font-semibold text-white text-sm">Property Team</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-slate-800 border-white/10">
              <DropdownMenuItem 
                className="text-slate-200 cursor-pointer"
                onClick={() => window.location.href = '/admin/team'}
              >
                <Settings className="h-4 w-4 mr-2" />
                Workspace Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-slate-200 cursor-pointer"
                onClick={onRolesClick}
              >
                <Users className="h-4 w-4 mr-2" />
                Invite People
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-slate-800/50 border-white/10 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-2 py-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channels</span>
              <button 
                onClick={() => setShowCreateChannel(true)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {channelLoadError && (
              <div className="mx-2 mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-2">
                <div className="text-xs text-amber-200">{channelLoadError}</div>
                <button
                  type="button"
                  onClick={loadChannels}
                  className="mt-1 text-xs text-amber-200 underline"
                >
                  Retry
                </button>
              </div>
            )}
            
            {channels.filter(c => c.type !== 'direct').map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel);
                  setIsMobileMenuOpen(false);
                  setInboxView('none');
                  setSelectedInboxThreadId(null);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannel?.id === channel.id && inboxView === 'none'
                    ? 'bg-violet-600/20 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Hash className="h-4 w-4 text-slate-500" />
                <span className="truncate">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="ml-auto bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Direct Messages */}
          <div className="px-2 py-2 border-t border-white/5">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direct Messages</span>
              <button 
                onClick={() => setShowDMPicker(true)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Start a new conversation"
              >
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            
            {/* Existing DM channels */}
            {channels.filter(c => c.type === 'direct').map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel);
                  setIsMobileMenuOpen(false);
                  setInboxView('none');
                  setSelectedInboxThreadId(null);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  activeChannel?.id === channel.id && inboxView === 'none'
                    ? 'bg-violet-600/20 text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <div className="h-6 w-6 rounded-md bg-slate-700 flex items-center justify-center text-xs">
                    {channel.members?.[0]?.image ? (
                      <img src={channel.members[0].image} alt="" className="h-6 w-6 rounded-md" />
                    ) : (
                      (channel.name || 'D')[0].toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${STATUS_COLORS[channel.members?.[0]?.status || 'offline']}`} />
                </div>
                <span className="truncate">{channel.name}</span>
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <span className="ml-auto bg-violet-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            ))}
            
            {/* Quick access to team members for DM */}
            {channels.filter(c => c.type === 'direct').length === 0 && members.filter(m => m.id !== currentUser.id).slice(0, 5).map(member => (
              <button
                key={member.id}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                <div className="relative">
                  <div className="h-6 w-6 rounded-md bg-slate-700 flex items-center justify-center text-xs">
                    {member.image ? (
                      <img src={member.image} alt="" className="h-6 w-6 rounded-md" />
                    ) : (
                      member.name[0].toUpperCase()
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${STATUS_COLORS[member.status || 'offline']}`} />
                </div>
                <span className="truncate">{member.name}</span>
              </button>
            ))}
          </div>

          {/* Inbox - Marketplace & Client Messages */}
          <div className="px-2 py-2 border-t border-white/5">
            <button
              onClick={() => {
                openInboxList();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                inboxView !== 'none'
                  ? 'bg-blue-600/20 text-white'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Inbox className="h-4 w-4 text-blue-400" />
              <span className="truncate">Inbox</span>
              {inboxUnreadCount > 0 && (
                <span className="ml-auto bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {inboxUnreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Channel Header */}
        <header className="h-12 sm:h-14 px-2 sm:px-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="sm:hidden p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0 bg-violet-600/20 border border-violet-500/30"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="Show channels"
            >
              <Hash className="h-4 w-4 text-violet-400" />
            </button>
            <div className="min-w-0">
              {inboxView !== 'none' ? (
                <>
                  <div className="flex items-center gap-1.5">
                    {inboxView === 'chat' && (
                      <button onClick={backToInboxThreads} className="p-0.5 hover:bg-white/10 rounded mr-1">
                        <ArrowLeft className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    )}
                    <Inbox className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400 flex-shrink-0" />
                    <span className="font-semibold text-white text-sm sm:text-base truncate">
                      {inboxView === 'chat' && selectedInboxThread
                        ? selectedInboxThread.otherUser?.name || 'Chat'
                        : 'Inbox'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-400">Marketplace & client messages</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    {activeChannel?.type === 'direct' ? (
                      <Users className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    ) : (
                      <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-white text-sm sm:text-base truncate">{activeChannel?.name || 'Select a channel'}</span>
                  </div>
                  {activeChannel?.description && (
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">{activeChannel.description}</p>
                  )}
                  {activeChannel?.type === 'direct' && (
                    <p className="text-[10px] sm:text-xs text-slate-400">Direct message</p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            
            {canManageTeam && onRolesClick && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-300 hover:text-white px-2 sm:px-3 h-8"
                onClick={onRolesClick}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Roles & Permissions</span>
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white px-1.5 sm:px-3 h-8">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Invite</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-white/10">
                {canManageTeam && (
                  <DropdownMenuItem onClick={() => setShowInviteDialog(true)} className="text-slate-200">
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Team Member
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white px-1.5 sm:px-3 h-8">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Team ({activeMembers.length})</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-white/10 w-64 sm:w-80 max-h-96 overflow-y-auto">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">Active Members</div>
                {activeMembers.map(m => (
                  <DropdownMenuItem key={m.id} className="text-slate-200 flex items-center gap-2">
                    <div className="h-6 w-6 rounded bg-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                      {m.user?.image ? <img src={m.user.image} alt="" className="h-6 w-6 rounded" /> : (m.user?.name || m.invitedEmail || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{m.user?.name || m.invitedEmail}</div>
                      <div className="text-xs text-slate-400 capitalize">{m.role}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
                {pendingMembers.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-amber-400 uppercase">Pending</div>
                    {pendingMembers.map(m => (
                      <DropdownMenuItem key={m.id} className="text-slate-200 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <span className="text-sm truncate">{m.invitedEmail}</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button 
              onClick={() => setShowMembers(!showMembers)}
              className={`hidden md:block p-2 rounded-lg transition-colors ${showMembers ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'}`}
            >
              <Users className="h-4 w-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Inbox View */}
          {inboxView !== 'none' ? (
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {inboxView === 'threads' ? (
                /* Inbox Thread List */
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {inboxLoadingThreads ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                    </div>
                  ) : inboxThreads.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <Inbox className="h-10 w-10 mx-auto text-slate-600 mb-3" />
                      <p className="text-slate-400 text-sm">No messages yet</p>
                      <p className="text-slate-500 text-xs mt-1">Messages from clients and the marketplace will appear here</p>
                    </div>
                  ) : (
                    inboxThreads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => openInboxThread(thread.id)}
                        className="w-full p-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            {thread.otherUser?.image ? (
                              <img
                                src={thread.otherUser.image}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-400" />
                              </div>
                            )}
                            {thread.isUnread && (
                              <Circle className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 fill-blue-500 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm truncate ${
                                  thread.isUnread
                                    ? 'font-semibold text-white'
                                    : 'font-medium text-slate-300'
                                }`}
                              >
                                {thread.otherUser?.name || 'Unknown'}
                              </p>
                              {thread.lastMessage && (
                                <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">
                                  {formatDistanceToNow(
                                    new Date(thread.lastMessage.createdAt),
                                    { addSuffix: false }
                                  )}
                                </span>
                              )}
                            </div>
                            {thread.lastMessage && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {thread.lastMessage.senderUserId === currentUser.id
                                  ? 'You: '
                                  : ''}
                                {thread.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* Inbox Chat View */
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900/30">
                    {inboxLoadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
                      </div>
                    ) : inboxMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm">
                          Start the conversation
                        </p>
                      </div>
                    ) : (
                      inboxMessages.map((msg) => {
                        const isMe = msg.senderUserId === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                                isMe
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 border border-white/10 text-slate-200'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              <p
                                className={`text-[10px] mt-0.5 text-right ${
                                  isMe ? 'text-white/60' : 'text-slate-500'
                                }`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={inboxMessagesEndRef} />
                  </div>

                  {/* Inbox Input */}
                  <div className="p-3 border-t border-white/10 bg-slate-900/50">
                    <div className="flex gap-2">
                      <Input
                        value={inboxNewMessage}
                        onChange={(e) => setInboxNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="text-sm bg-slate-800 border-white/10 text-white placeholder:text-slate-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleInboxSend();
                          }
                        }}
                      />
                      <Button
                        onClick={handleInboxSend}
                        disabled={inboxSending || !inboxNewMessage.trim()}
                        size="icon"
                        className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                      >
                        {inboxSending ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
          /* Team Chat Messages */
          <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 sm:py-4">
              {!activeChannel && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm text-slate-300">Select a channel to start chatting</div>
                    {channelLoadError && (
                      <div className="mt-2 text-xs text-slate-400">{channelLoadError}</div>
                    )}
                    <button
                      type="button"
                      onClick={loadChannels}
                      className="mt-3 text-xs text-violet-300 underline"
                    >
                      Retry loading channels
                    </button>
                  </div>
                </div>
              )}

              {groupMessagesByDate(messages).map(group => (
                <div key={group.date}>
                  {/* Date Divider */}
                  <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(group.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  
                  {/* Messages */}
                  {group.messages.map((msg, idx) => {
                    const showAvatar = idx === 0 || 
                      group.messages[idx - 1].senderId !== msg.senderId;
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={`group flex gap-3 px-2 py-1 hover:bg-white/5 rounded-lg ${!showAvatar ? 'mt-0.5' : 'mt-3'}`}
                      >
                        {showAvatar ? (
                          <div className="h-9 w-9 rounded-lg bg-slate-700 flex-shrink-0 flex items-center justify-center text-sm font-medium text-white">
                            {msg.senderImage ? (
                              <img src={msg.senderImage} alt="" className="h-9 w-9 rounded-lg" />
                            ) : (
                              msg.senderName[0].toUpperCase()
                            )}
                          </div>
                        ) : (
                          <div className="w-9 flex-shrink-0" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          {showAvatar && (
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold text-white text-sm">{msg.senderName}</span>
                              <span className="text-xs text-slate-500">{formatTime(msg.createdAt)}</span>
                            </div>
                          )}
                          {msg.content && (
                            <p className="text-slate-200 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          )}
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((attachment) => (
                                <div key={attachment.id}>
                                  {attachment.type === 'image' ? (
                                    <div className="relative group/img max-w-sm">
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name}
                                        className="rounded-lg border border-white/10 max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      />
                                      <a
                                        href={attachment.url}
                                        download={attachment.name}
                                        className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                                      >
                                        <Download className="h-4 w-4 text-white" />
                                      </a>
                                    </div>
                                  ) : (
                                    <a
                                      href={attachment.url}
                                      download={attachment.name}
                                      className="flex items-center gap-3 p-3 bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-white/10 transition-colors max-w-sm"
                                    >
                                      <div className="p-2 bg-violet-500/20 rounded-lg">
                                        <File className="h-5 w-5 text-violet-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{attachment.name}</p>
                                        {attachment.size && (
                                          <p className="text-xs text-slate-400">
                                            {(attachment.size / 1024).toFixed(1)} KB
                                          </p>
                                        )}
                                      </div>
                                      <Download className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {msg.reactions.map((reaction) => (
                                <button
                                  key={reaction.emoji}
                                  onClick={() => handleAddReaction(msg.id, reaction.emoji)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                    reaction.users.includes(currentUser.id)
                                      ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                                      : 'bg-slate-800/60 border border-white/10 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="font-medium">{reaction.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Message Actions (show on hover) */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-white/10 rounded text-slate-400">
                                <Smile className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-800 border-white/10">
                              <div className="grid grid-cols-5 gap-1 p-2">
                                {['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '✅', '👀'].map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleAddReaction(msg.id, emoji)}
                                    className="p-2 hover:bg-white/10 rounded text-xl"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-2 sm:p-4 border-t border-white/10 flex-shrink-0 bg-slate-900/50">
              {/* File Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mb-2 p-3 bg-slate-800/60 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">Attachments ({uploadedFiles.length})</span>
                    <button
                      onClick={() => {
                        setUploadedFiles([]);
                        setShowFilePreview(false);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-lg">
                        <div className="p-2 bg-violet-500/20 rounded">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="h-4 w-4 text-violet-400" />
                          ) : (
                            <File className="h-4 w-4 text-violet-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="p-1 hover:bg-white/10 rounded text-slate-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSendMessage}>
                <div className="flex items-end gap-1 sm:gap-2 bg-slate-800 rounded-xl p-2 sm:p-2 relative min-h-[44px]">
                  {/* File Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Upload files"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message #${activeChannel?.name || 'channel'}`}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-slate-500 text-sm min-h-[36px] py-2"
                    disabled={!activeChannel}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                  />
                  
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {/* Mention Picker Button */}
                    <div className="relative hidden sm:block" ref={mentionPickerRef}>
                      <button 
                        type="button" 
                        onClick={() => setShowMentionPicker(!showMentionPicker)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Mention someone"
                      >
                        <AtSign className="h-5 w-5" />
                      </button>
                      
                      {showMentionPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50 w-64 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-white/10">
                            <Input
                              placeholder="Search members..."
                              value={mentionSearch}
                              onChange={(e) => setMentionSearch(e.target.value)}
                              className="h-8 bg-slate-700 border-slate-600 text-white text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredMembersForMention.length === 0 ? (
                              <div className="p-3 text-center text-slate-400 text-sm">No members found</div>
                            ) : (
                              filteredMembersForMention.map(member => (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => handleMentionSelect(member)}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-white/10 transition-colors text-left"
                                >
                                  <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                                    {member.image ? (
                                      <img src={member.image} alt="" className="h-7 w-7 rounded-full" />
                                    ) : (
                                      member.name[0].toUpperCase()
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-white truncate">{member.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{member.role}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Emoji Picker Button */}
                    <div className="relative" ref={emojiPickerRef}>
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="Add emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      
                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 z-50">
                          <EmojiPicker
                            onEmojiClick={handleEmojiSelect}
                            theme={Theme.DARK}
                            width={320}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading || !activeChannel || isUploading}
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-500 text-white h-9 w-9 sm:h-auto sm:w-auto p-2 sm:px-3 flex-shrink-0"
                    >
                      {isUploading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Members Sidebar */}
          {showMembers && (
            <aside className={membersSidebarClass}>
              <div className="p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Members — {members.length}
                </h3>
                <div className="space-y-1">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5">
                      <div className="relative">
                        <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm">
                          {member.image ? (
                            <img src={member.image} alt="" className="h-8 w-8 rounded-lg" />
                          ) : (
                            member.name[0].toUpperCase()
                          )}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${STATUS_COLORS[member.status || 'offline']}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{member.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={(open) => {
        setShowInviteDialog(open);
        if (!open) {
          setInviteError(null);
          setInviteSuccess(false);
        }
      }}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
            <DialogDescription className="text-slate-400">
              Send an invitation to join your property management team.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {inviteError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {inviteError}
              </div>
            )}
            
            {inviteSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                ✓ Invitation sent successfully! They&apos;ll receive an email shortly.
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                }}
                className="bg-slate-800 border-white/10 text-white"
                disabled={isInviting || inviteSuccess}
              />
              <p className="text-xs text-slate-500">
                If they don&apos;t have an account, they&apos;ll be invited to sign up.
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Role</label>
              <select 
                value={inviteRole} 
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full p-2 rounded-lg bg-slate-800 border border-white/10 text-white"
                disabled={isInviting || inviteSuccess}
              >
                <option value="member">Member - View & manage assigned tasks</option>
                <option value="admin">Admin - Full access to all features</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteDialog(false)} disabled={isInviting}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteMember}
              disabled={isInviting || !inviteEmail.trim() || inviteSuccess}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isInviting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : inviteSuccess ? (
                '✓ Sent!'
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DM Picker Dialog */}
      <Dialog open={showDMPicker} onOpenChange={(open) => {
        setShowDMPicker(open);
        if (!open) setDmSearch('');
      }}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-violet-400" />
              New Message
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Start a private conversation with a team member.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search team members..."
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                className="pl-9 bg-slate-800 border-white/10 text-white"
                autoFocus
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredMembersForDM.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  {dmSearch ? 'No members found' : 'No team members available'}
                </div>
              ) : (
                filteredMembersForDM.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleStartDM(member)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white">
                        {member.image ? (
                          <img src={member.image} alt="" className="h-10 w-10 rounded-full" />
                        ) : (
                          member.name[0].toUpperCase()
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${STATUS_COLORS[member.status || 'offline']}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{member.name}</p>
                      <p className="text-xs text-slate-400 truncate">{member.email}</p>
                    </div>
                    <span className="text-xs text-slate-500 capitalize">{member.role}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
