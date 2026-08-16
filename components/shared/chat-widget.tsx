'use client';

import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatBox } from './chatbox';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkBusinessHours = () => {
      const now = new Date();
      const day = now.getDay();
      const hours = now.getHours();

      const isWeekday = day >= 1 && day <= 5;
      const isBusinessHours = hours >= 9 && hours < 18;

      setIsOnline(isWeekday && isBusinessHours);
    };

    checkBusinessHours();
    const interval = setInterval(checkBusinessHours, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <div className={`fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end justify-end`}>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 order-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <div className="relative">
              <MessageCircle className="w-6 h-6" />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
            </div>
          </button>
        )}

        {!isOpen && (
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center bg-white dark:bg-slate-800 px-2 py-1 rounded order-2">
            {isOnline ? '🟢 Online' : '⚫ Offline'}
          </div>
        )}

        {isOpen && (
          <div className="w-full sm:w-96 h-96 sm:h-[500px] md:w-[420px] md:h-[600px] max-h-[calc(100vh-100px)] rounded-lg shadow-2xl overflow-hidden order-3 mb-2">
            <ChatBox onClose={() => setIsOpen(false)} />
          </div>
        )}
      </div>
    </>
  );
}
