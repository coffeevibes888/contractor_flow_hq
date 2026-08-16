'use client';

import React, { useState } from 'react';
import {
  MessageCircle, Search, Send, Paperclip, Star, Clock,
  CheckCheck, ChevronRight, Filter, Archive, Bell, Smile,
} from 'lucide-react';

const conversations = [
  { id: 1, guest: 'Sarah Johnson', avatar: 'SJ', property: 'Oceanview Suite', lastMessage: 'What is the WiFi password?', time: '9:30 AM', unread: true, channel: 'Airbnb', checkIn: 'May 3' },
  { id: 2, guest: 'Michael Chen', avatar: 'MC', property: 'Downtown Loft', lastMessage: 'Can I get a late checkout?', time: '8:15 AM', unread: true, channel: 'VRBO', checkIn: 'May 4' },
  { id: 3, guest: 'Emma Williams', avatar: 'EW', property: 'Mountain Cabin', lastMessage: 'Thank you for the welcome basket!', time: 'Yesterday', unread: false, channel: 'Direct', checkIn: 'May 5' },
  { id: 4, guest: 'James Rodriguez', avatar: 'JR', property: 'Beachfront Villa', lastMessage: 'Is there parking available?', time: 'Yesterday', unread: false, channel: 'Booking.com', checkIn: 'May 6' },
  { id: 5, guest: 'Lisa Thompson', avatar: 'LT', property: 'Oceanview Suite', lastMessage: 'We had an amazing stay!', time: 'May 1', unread: false, channel: 'Airbnb', checkIn: 'Apr 28' },
  { id: 6, guest: 'David Park', avatar: 'DP', property: 'Urban Studio', lastMessage: 'How do I use the smart lock?', time: 'Apr 30', unread: false, channel: 'Airbnb', checkIn: 'Apr 29' },
];

const messages = [
  { id: 1, sender: 'guest', text: 'Hi! We just arrived and the place looks amazing. Quick question - what is the WiFi password?', time: '9:30 AM' },
  { id: 2, sender: 'host', text: 'Welcome Sarah! So glad you love the place. The WiFi password is on the card next to the TV. Network: OceanView_Guest, Password: Beach2026!', time: '9:35 AM' },
  { id: 3, sender: 'guest', text: 'Found it, thank you! Also, are there any good restaurants nearby you would recommend?', time: '9:38 AM' },
  { id: 4, sender: 'host', text: 'Absolutely! Check the guidebook on the coffee table - I have my top 10 picks in there. My personal favorites are The Catch (seafood, 5 min walk) and Bella Vita (Italian, 10 min walk). Both are excellent!', time: '9:42 AM' },
  { id: 5, sender: 'guest', text: 'Perfect, we will check those out tonight. Thanks so much!', time: '9:45 AM' },
];

export default function STRInboxPage() {
  const [selectedConvo, setSelectedConvo] = useState(conversations[0]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    !searchQuery || c.guest.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='w-full space-y-5'>
      <div>
        <h1 className='text-xl sm:text-2xl font-bold text-black'>Inbox</h1>
        <p className='text-xs text-gray-500'>Guest messaging across all channels</p>
      </div>

      <div className='rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden' style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className='flex h-full'>
          {/* Conversation List */}
          <div className='w-full sm:w-80 border-r border-gray-100 flex flex-col'>
            <div className='p-3 border-b border-gray-100'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400' />
                <input
                  type='text'
                  placeholder='Search conversations...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
                />
              </div>
            </div>
            <div className='flex-1 overflow-y-auto'>
              {filtered.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConvo(convo)}
                  className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    selectedConvo.id === convo.id ? 'bg-cyan-50/50 border-l-2 border-l-cyan-500' : ''
                  }`}
                >
                  <div className='flex items-start gap-2.5'>
                    <div className='relative'>
                      <div className='h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0'>
                        {convo.avatar}
                      </div>
                      {convo.unread && (
                        <div className='absolute -top-0.5 -right-0.5 h-3 w-3 bg-cyan-500 rounded-full border-2 border-white' />
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between'>
                        <span className={`text-xs font-semibold truncate ${convo.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {convo.guest}
                        </span>
                        <span className='text-[10px] text-gray-400 shrink-0 ml-2'>{convo.time}</span>
                      </div>
                      <p className='text-[10px] text-gray-500 truncate'>{convo.property}</p>
                      <p className={`text-[11px] truncate mt-0.5 ${convo.unread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                        {convo.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Thread */}
          <div className='hidden sm:flex flex-1 flex-col'>
            {/* Thread Header */}
            <div className='p-3 border-b border-gray-100 flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <div className='h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold'>
                  {selectedConvo.avatar}
                </div>
                <div>
                  <h3 className='text-sm font-bold text-gray-800'>{selectedConvo.guest}</h3>
                  <p className='text-[10px] text-gray-500'>{selectedConvo.property} · Check-in: {selectedConvo.checkIn}</p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                selectedConvo.channel === 'Airbnb' ? 'bg-red-50 text-red-600' :
                selectedConvo.channel === 'VRBO' ? 'bg-blue-50 text-blue-600' :
                selectedConvo.channel === 'Booking.com' ? 'bg-indigo-50 text-indigo-600' :
                'bg-green-50 text-green-600'
              }`}>
                via {selectedConvo.channel}
              </span>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-y-auto p-4 space-y-3'>
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'host' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3.5 py-2 ${
                    msg.sender === 'host'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className='text-xs leading-relaxed'>{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'host' ? 'justify-end' : ''}`}>
                      <span className={`text-[9px] ${msg.sender === 'host' ? 'text-white/70' : 'text-gray-400'}`}>{msg.time}</span>
                      {msg.sender === 'host' && <CheckCheck className='h-3 w-3 text-white/70' />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className='p-3 border-t border-gray-100'>
              <div className='flex items-center gap-2'>
                <button className='p-2 text-gray-400 hover:text-gray-600 transition-colors'>
                  <Paperclip className='h-4 w-4' />
                </button>
                <input
                  type='text'
                  placeholder='Type a message...'
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className='flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400'
                />
                <button className='p-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-md transition-all'>
                  <Send className='h-4 w-4' />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
