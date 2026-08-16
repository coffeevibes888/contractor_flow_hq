import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Account & Data Deletion | PropertyFlow HQ',
  description: 'Learn how to delete your PropertyFlow HQ account and associated data, or request deletion of specific data.',
};

export default function AccountDataPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <span className="text-sky-400 text-lg">🗑️</span>
            </div>
            <span className="text-sky-400 font-semibold text-sm tracking-wide uppercase">PropertyFlow HQ</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Account & Data Deletion</h1>
          <p className="text-slate-400 text-lg">
            You have full control over your account and data. This page explains exactly how to delete your account, 
            request deletion of specific data, and what happens to your information.
          </p>
        </div>

        {/* Section 1 — Delete Full Account */}
        <section className="space-y-5 border border-red-500/20 bg-red-950/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🗑️</span> Delete Your Account
          </h2>
          <p className="text-slate-300">
            Permanently deletes your PropertyFlow HQ account and all associated data. <strong className="text-white">This cannot be undone.</strong>
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">What gets deleted:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
              <li>Your account profile, name, email, and phone number</li>
              <li>All properties, units, and lease records (for Property Managers)</li>
              <li>All job history, invoices, and estimates (for Contractors)</li>
              <li>All maintenance requests and tenant records</li>
              <li>All payment history and financial records</li>
              <li>All messages, notifications, and documents</li>
              <li>Your subscription will be canceled immediately</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">What may be retained:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
              <li>Financial transaction records required by law (up to 7 years, per IRS regulations)</li>
              <li>Records required for active dispute resolution</li>
              <li>Anonymized, aggregated usage statistics (no personal identifiers)</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-white">How to delete your account:</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-slate-300 text-sm"><strong className="text-white">Mobile app:</strong> Open the app → go to your Profile or More tab → scroll to the ACCOUNT section → tap <em>Delete Account</em> → confirm twice.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-slate-300 text-sm"><strong className="text-white">Web app (Contractors):</strong> Sign in at <a href="https://www.propertyflowhq.com" className="text-sky-400 underline">propertyflowhq.com</a> → go to Settings → Account → Data & Privacy tab → click <em>Delete My Account Permanently</em>.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-slate-300 text-sm"><strong className="text-white">Email request:</strong> Send an email to <a href="mailto:support@propertyflowhq.com" className="text-sky-400 underline">support@propertyflowhq.com</a> from your registered email address with the subject line <em>"Account Deletion Request"</em>. We will process it within 30 days.</p>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm">
            Account deletion is processed immediately when done in-app. Email requests are processed within <strong className="text-white">30 days</strong>.
          </p>
        </section>

        {/* Section 2 — Delete Data Only */}
        <section className="space-y-5 border border-amber-500/20 bg-amber-950/10 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>📦</span> Request Data Deletion (Without Deleting Account)
          </h2>
          <p className="text-slate-300">
            You can request deletion of specific data associated with your account without closing your account entirely.
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-white">Data you can request deleted:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
              <li>Profile photo and uploaded images</li>
              <li>Phone number and address information</li>
              <li>Notification preferences and usage history</li>
              <li>Saved searches and listing favorites</li>
              <li>Documents and files you have uploaded</li>
            </ul>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-white">How to request data deletion:</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-slate-300 text-sm"><strong className="text-white">Mobile app:</strong> Open the app → go to your Profile or More tab → scroll to the ACCOUNT section → tap <em>Request My Data</em>. A data export will be emailed to you within 30 days, along with instructions to request deletion of specific items.</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-slate-300 text-sm"><strong className="text-white">Email request:</strong> Send an email to <a href="mailto:support@propertyflowhq.com" className="text-sky-400 underline">support@propertyflowhq.com</a> from your registered email address with the subject line <em>"Data Deletion Request"</em> and specify what data you want removed. We will respond within 30 days.</p>
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm">
            Data deletion requests are processed within <strong className="text-white">30 days</strong>. Some data may be retained as required by law (see above).
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3 border border-white/10 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white">Questions?</h2>
          <p className="text-slate-400">
            Contact our privacy team at{' '}
            <a href="mailto:support@propertyflowhq.com" className="text-sky-400 underline hover:text-sky-300">
              support@propertyflowhq.com
            </a>
            {' '}or visit our{' '}
            <Link href="/privacy" className="text-sky-400 underline hover:text-sky-300">
              full Privacy Policy
            </Link>.
          </p>
          <p className="text-slate-500 text-sm">Last updated: April 20, 2025</p>
        </section>

      </div>
    </div>
  );
}
