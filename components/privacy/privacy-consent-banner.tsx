'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, X, Cookie } from 'lucide-react';

const CONSENT_KEY = 'privacy-consent-accepted';

export default function PrivacyConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already accepted
    const hasAccepted = localStorage.getItem(CONSENT_KEY);
    if (!hasAccepted) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const dataCollected = [
    {
      category: 'Account Information',
      items: ['Name and email address', 'Phone number (optional)', 'Profile preferences'],
    },
    {
      category: 'Usage Data',
      items: ['Pages visited and features used', 'Device type and browser', 'General location (city/region)'],
    },
    {
      category: 'Property & Rental Data',
      items: ['Rental applications submitted', 'Payment history', 'Maintenance requests'],
    },
    {
      category: 'Communication Data',
      items: ['Messages with property managers', 'Support inquiries', 'Notification preferences'],
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl border border-white/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-500" />
              
              <div className="p-5 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                    <Cookie className="h-6 w-6 text-cyan-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Your Privacy Matters
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      We collect certain data to provide you with the best rental experience. 
                      <span className="text-cyan-400 font-medium"> This information is for internal purposes only — we will never sell your data.</span>
                    </p>
                  </div>

                  <button
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Expandable Details */}
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-5 pt-5 border-t border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="h-4 w-4 text-emerald-400" />
                          <h4 className="text-sm font-medium text-white">What We Collect</h4>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          {dataCollected.map((section) => (
                            <div
                              key={section.category}
                              className="rounded-xl border border-white/10 bg-white/5 p-4"
                            >
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                                {section.category}
                              </h5>
                              <ul className="space-y-1.5">
                                {section.items.map((item) => (
                                  <li key={item} className="text-xs text-slate-300 flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-xs text-emerald-300 leading-relaxed">
                            <strong>Our Promise:</strong> Your data is encrypted, securely stored, and used solely to improve your experience. 
                            We never share or sell your personal information to third parties.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        View What We Collect
                      </>
                    )}
                  </button>
                  
                  <div className="flex-1" />
                  
                  <button
                    onClick={handleAccept}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02]"
                  >
                    Accept & Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
