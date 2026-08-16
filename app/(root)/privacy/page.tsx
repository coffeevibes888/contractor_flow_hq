import { Metadata } from 'next';

// Cache this static page for 24 hours
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Property Flow HQ Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <main className='flex-1 w-full py-10 px-4'>
      <div className='max-w-4xl mx-auto'>
        <div className='rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 md:p-12 text-slate-200'>
          <h1 className='text-3xl font-bold text-white mb-8'>Privacy Policy</h1>
          
          <div className='space-y-6 text-sm leading-relaxed'>
            <p className='text-slate-400'>Last updated: April 19, 2025</p>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>1. Introduction</h2>
              <p>
                Property Flow HQ ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when you use our property 
                management platform.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>2. Information We Collect</h2>
              <h3 className='text-lg font-medium text-white mt-4'>Personal Information</h3>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Name, email address, phone number</li>
                <li>Billing and payment information</li>
                <li>Property addresses and details</li>
                <li>Tenant information (for landlords)</li>
                <li>Government-issued ID (for verification)</li>
              </ul>
              
              <h3 className='text-lg font-medium text-white mt-4'>Automatically Collected Information</h3>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent</li>
                <li>Referring website</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Provide and maintain our Service</li>
                <li>Process rent payments and financial transactions</li>
                <li>Send notifications and updates</li>
                <li>Respond to customer service requests</li>
                <li>Improve our Service and user experience</li>
                <li>Comply with legal obligations</li>
                <li>Detect and prevent fraud</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>4. Information Sharing</h2>
              <p>We may share your information with:</p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Payment processors (Stripe) for transaction processing</li>
                <li>Cloud service providers for data storage</li>
                <li>Email service providers for communications</li>
                <li>Analytics providers to improve our Service</li>
                <li>Law enforcement when required by law</li>
              </ul>
              <p className='mt-3'>
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>5. Data Security</h2>
              <p>
                We implement industry-standard security measures including:
              </p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>256-bit SSL/TLS encryption for data in transit</li>
                <li>Encryption at rest for sensitive data</li>
                <li>Regular security audits and penetration testing</li>
                <li>Two-factor authentication options</li>
                <li>PCI-DSS compliant payment processing via Stripe</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>6. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide 
                services. Financial records are retained for 7 years as required by law. You may request deletion 
                of your data at any time, subject to legal retention requirements.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>7. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in a portable format</li>
                <li>Opt out of marketing communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>8. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to enhance your experience, analyze usage, and personalize 
                content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>9. Children's Privacy</h2>
              <p>
                Our Service is not intended for children under 18. We do not knowingly collect personal information 
                from children. If you believe we have collected such information, please contact us immediately.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure 
                appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of significant changes via email 
                or through the Service. Your continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>12. Mobile Application Permissions</h2>
              <p>The PropertyFlow HQ mobile application requests the following device permissions:</p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li><strong className='text-white'>Camera:</strong> Used to capture job site photos, maintenance issue photos, and verify work completion.</li>
                <li><strong className='text-white'>Microphone:</strong> Used for video recording on job sites and maintenance walkthroughs.</li>
                <li><strong className='text-white'>Location:</strong> Used to verify team member location on job sites and for GPS tracking during active jobs.</li>
                <li><strong className='text-white'>Photo Library:</strong> Used to upload photos of job sites, completed work, and maintenance issues from your device gallery.</li>
                <li><strong className='text-white'>Push Notifications:</strong> Used to alert you of rent payments, maintenance updates, job assignments, and messages.</li>
              </ul>
              <p className='mt-2'>
                All permissions are optional and can be revoked at any time through your device settings. Denying a permission will only disable that specific feature.
                Location data collected during active jobs is used solely for operational purposes and is not sold to third parties.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>13. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us at:
              </p>
              <p className='text-violet-400'>support@propertyflowhq.com</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
