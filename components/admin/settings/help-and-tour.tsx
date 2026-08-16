'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, PlayCircle, MessageCircle, ExternalLink } from 'lucide-react';

const faqItems = [
  {
    question: 'How do I add a new property?',
    answer: 'Go to Properties in the sidebar, click "Add Property", and fill in the property details including address, units, and amenities. You can add photos and set rent amounts for each unit.',
  },
  {
    question: 'How do I invite a tenant to the portal?',
    answer: 'Navigate to the property/unit, click on the tenant section, and use "Invite Tenant". Enter their email address and they\'ll receive an invitation to create their account and access the tenant portal.',
  },
  {
    question: 'How do I set up automatic rent collection?',
    answer: 'Go to Settings > Fees, enable rent automation features (Pro plan required). You can set up automatic reminders before rent is due and configure late fees that apply automatically after the grace period.',
  },
  {
    question: 'How do I handle maintenance requests?',
    answer: 'Maintenance requests appear in the Maintenance section. You can assign them to contractors, set priority levels, track status, and communicate with tenants directly through the platform.',
  },
  {
    question: 'Can I customize my tenant portal?',
    answer: 'Yes! Go to Branding to upload your logo, set your company colors, and customize your tenant portal URL. Your tenants will see your branding when they log in.',
  },
  {
    question: 'How do late fees work?',
    answer: 'Late fees can be configured in Settings > Fees. Set a grace period (e.g., 5 days), choose between flat fee or percentage, and enable automatic application. Tenants are notified when fees are applied.',
  },
  {
    question: 'How do I screen tenant applications?',
    answer: 'Applications appear in the Applications section. You can review applicant information, run background/credit checks (if enabled), and approve or deny applications directly from the dashboard.',
  },
  {
    question: 'Can I manage multiple properties?',
    answer: 'Absolutely! Add as many properties as your plan allows. Each property can have multiple units, and you can manage them all from a single dashboard with portfolio-wide reporting.',
  },
  {
    question: 'How do I generate lease agreements?',
    answer: 'Go to Legal Documents to set up your lease templates. When approving an application, you can generate a lease that pulls in property details, tenant info, and your custom terms automatically.',
  },
  {
    question: 'What payment methods can tenants use?',
    answer: 'Tenants can pay via ACH bank transfer or credit/debit card through the tenant portal. Payment processing fees may apply depending on the method chosen.',
  },
  {
    question: 'How do I track income and expenses?',
    answer: 'The Revenue section shows all rent payments, fees collected, and financial summaries. You can filter by property, date range, and export reports for accounting purposes.',
  },
  {
    question: 'Can I add team members or property managers?',
    answer: 'Yes, go to Team Hub to invite team members. You can assign different permission levels so they can help manage properties without full admin access.',
  },
  {
    question: 'How do I handle security deposits?',
    answer: 'Configure default security deposit requirements in Settings > Fees. When creating leases, deposits are tracked automatically. At move-out, you can process refunds or deductions.',
  },
  {
    question: 'What happens when a lease expires?',
    answer: 'You\'ll receive notifications before lease expiration (60, 30, and 14 days). You can then renew the lease, convert to month-to-month, or begin the move-out process.',
  },
  {
    question: 'How do I communicate with tenants?',
    answer: 'Use the Messages section to send direct messages to tenants. You can also send bulk announcements to all tenants in a property or your entire portfolio.',
  },
  {
    question: 'Can tenants submit maintenance requests online?',
    answer: 'Yes! Tenants can submit maintenance requests through their portal, including photos and descriptions. You\'ll be notified immediately and can track the request through completion.',
  },
  {
    question: 'How do I handle pet deposits and pet rent?',
    answer: 'Configure pet fees in Settings > Fees. You can set one-time pet deposits and/or monthly pet rent. These can be applied to all properties or selected ones.',
  },
  {
    question: 'What reports are available?',
    answer: 'Access reports in the Revenue section including rent roll, income statements, vacancy reports, and payment history. Reports can be filtered and exported to CSV or PDF.',
  },
  {
    question: 'How do I upgrade my subscription?',
    answer: 'Go to Settings > Subscription to view your current plan and upgrade options. Pro plans unlock features like automatic rent reminders, late fees, and advanced reporting.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use industry-standard encryption for all data. Payment processing is handled by Stripe, a PCI-compliant payment processor. Your data is backed up regularly.',
  },
];

export function HelpAndTour() {
  const [tourStarted, setTourStarted] = useState(false);

  const startTour = () => {
    setTourStarted(true);
    // Tour logic would integrate with a tour library like react-joyride
    // For now, we'll just show a message
    setTimeout(() => setTourStarted(false), 100);
  };

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <PlayCircle className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Getting Started</h3>
        </div>
        <p className="text-[10px] text-slate-400 mb-3">
          New to the platform? Take a quick tour to learn the basics.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={startTour}
            className="bg-violet-600 hover:bg-violet-500 text-xs h-8"
          >
            <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
            Start Tour
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-white/20"
            asChild
          >
            <a href="mailto:support@example.com">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Contact Support
            </a>
          </Button>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Frequently Asked Questions</h3>
        </div>
        <Accordion type="single" collapsible className="space-y-1">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-white/5 rounded-lg bg-slate-800/30 px-3 data-[state=open]:bg-slate-800/50"
            >
              <AccordionTrigger className="text-xs text-white hover:no-underline py-2.5 [&[data-state=open]>svg]:rotate-180">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-slate-400 pb-3 pt-0">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Additional Resources */}
      <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Additional Resources</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <a
            href="#"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <PlayCircle className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-white group-hover:text-violet-300 transition-colors">Video Tutorials</p>
              <p className="text-[10px] text-slate-500">Watch step-by-step guides</p>
            </div>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-white group-hover:text-emerald-300 transition-colors">Help Center</p>
              <p className="text-[10px] text-slate-500">Browse documentation</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
