'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { 
  FileSignature, 
  PenTool, 
  MousePointer2, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  Users,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaseFieldSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  onConfigureFields: () => void;
  onSkip: () => void;
}

const steps = [
  {
    icon: FileText,
    title: 'Your Lease is Uploaded!',
    description: 'Great job! Your custom lease document is ready. Now let\'s make it signable.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: PenTool,
    title: 'Add Signature Fields',
    description: 'Mark where tenants and landlords need to sign, initial, and date the document.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: MousePointer2,
    title: 'Drag & Drop Placement',
    description: 'Simply click to add fields, then drag them to the exact position on your lease.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Users,
    title: 'Assign to Tenant or Landlord',
    description: 'Each field can be assigned to either the tenant or landlord for signing.',
    color: 'from-amber-500 to-orange-500',
  },
];

export default function LeaseFieldSetupModal({
  open,
  onOpenChange,
  documentName,
  onConfigureFields,
  onSkip,
}: LeaseFieldSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onConfigureFields();
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="p-0 border-0 bg-transparent max-w-lg sm:max-w-xl overflow-hidden shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Configure Lease Signature Fields</DialogTitle>
        </VisuallyHidden>
        <div className="relative rounded-2xl overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-fuchsia-500/10 via-transparent to-transparent" />
          
          {/* Animated Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/30 rounded-full"
                initial={{ 
                  x: Math.random() * 400, 
                  y: Math.random() * 400,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, Math.random() * -200],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 sm:p-8">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white/70" />
            </button>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentStep 
                      ? 'w-8 bg-gradient-to-r from-violet-400 to-fuchsia-400' 
                      : index < currentStep 
                        ? 'w-4 bg-violet-500/50' 
                        : 'w-4 bg-white/20'
                  )}
                />
              ))}
            </div>

            {/* Animated Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mb-6"
                >
                  <div className={cn(
                    'w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg',
                    steps[currentStep].color
                  )}>
                    {(() => {
                      const Icon = steps[currentStep].icon;
                      return <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-white" />;
                    })()}
                  </div>
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  {steps[currentStep].title}
                </h2>

                {/* Description */}
                <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto mb-6 leading-relaxed">
                  {steps[currentStep].description}
                </p>

                {/* Document Preview (on first step) */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <FileSignature className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-medium text-white truncate">{documentName}</p>
                        <p className="text-xs text-slate-400">PDF Document • Ready for configuration</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}

                {/* Visual Guide (on step 2) */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 grid grid-cols-2 gap-3"
                  >
                    {[
                      { label: 'Signature', icon: PenTool, color: 'bg-violet-500' },
                      { label: 'Initials', icon: FileText, color: 'bg-blue-500' },
                      { label: 'Date', icon: CheckCircle2, color: 'bg-emerald-500' },
                      { label: 'Name', icon: Users, color: 'bg-amber-500' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className={cn('p-1.5 rounded', item.color)}>
                          <item.icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm text-slate-300">{item.label}</span>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Drag Demo (on step 3) */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 relative h-32 rounded-xl bg-white/5 border border-white/10 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,transparent_49%,rgba(255,255,255,0.1)_50%,transparent_51%,transparent_100%)]" />
                    <motion.div
                      className="absolute w-24 h-8 rounded border-2 border-violet-500 bg-violet-500/30 flex items-center justify-center"
                      animate={{
                        x: [40, 180, 180, 40],
                        y: [20, 20, 80, 80],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <span className="text-xs text-white font-medium">Signature</span>
                    </motion.div>
                    <motion.div
                      className="absolute"
                      animate={{
                        x: [60, 200, 200, 60],
                        y: [30, 30, 90, 90],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <MousePointer2 className="h-5 w-5 text-white" />
                    </motion.div>
                  </motion.div>
                )}

                {/* Role Assignment (on step 4) */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 flex justify-center gap-4"
                  >
                    <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-500/30">
                      <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-300">Tenant</p>
                    </div>
                    <div className="p-4 rounded-xl bg-violet-500/20 border border-violet-500/30">
                      <Users className="h-8 w-8 text-violet-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-violet-300">Landlord</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="flex-1 text-slate-400 hover:text-white hover:bg-white/10 order-2 sm:order-1"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleNext}
                className={cn(
                  'flex-1 font-semibold order-1 sm:order-2',
                  'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500',
                  'shadow-lg shadow-violet-500/25'
                )}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Configure Fields
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip Note */}
            <p className="text-center text-xs text-slate-500 mt-4">
              You can configure fields later from Legal Documents
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
