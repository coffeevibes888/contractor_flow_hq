import { Metadata } from 'next';

// Cache this static page for 24 hours
export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Property Flow HQ Terms of Service',
};

export default function TermsPage() {
  return (
    <main className='flex-1 w-full py-10 px-4'>
      <div className='max-w-4xl mx-auto'>
        <div className='rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 md:p-12 text-slate-200'>
          <h1 className='text-3xl font-bold text-white mb-8'>Terms of Service</h1>
          
          <div className='space-y-6 text-sm leading-relaxed'>
            <p className='text-slate-400'>Last updated: December 31, 2024</p>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Property Flow HQ ("Service"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>2. Description of Service</h2>
              <p>
                Property Flow HQ provides property management software including but not limited to:
              </p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Online rent collection and payment processing</li>
                <li>Tenant and lease management</li>
                <li>Maintenance request tracking</li>
                <li>Digital lease signing</li>
                <li>Financial reporting and analytics</li>
                <li>Tenant communication tools</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all 
                activities that occur under your account. You must notify us immediately of any unauthorized use.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>4. Payment Terms</h2>
              <p>
                Our Service includes a free tier for up to 24 units. Paid subscriptions are billed monthly or annually. 
                A flat fee of $2 is charged per rent payment processed through our platform.
              </p>
              <p>
                All fees are non-refundable except as required by law or as explicitly stated in these terms.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>5. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className='list-disc list-inside space-y-1 ml-4'>
                <li>Use the Service for any illegal purpose</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on the rights of others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Transmit malware or other harmful code</li>
                <li>Interfere with the proper functioning of the Service</li>
              </ul>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>6. Data and Privacy</h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent 
                to the collection and use of information as described in our Privacy Policy.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>7. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by Property Flow HQ 
                and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Property Flow HQ shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>9. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for violations of these terms. Upon termination, 
                your right to use the Service will immediately cease.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of significant changes 
                via email or through the Service. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className='space-y-3'>
              <h2 className='text-xl font-semibold text-white'>11. Contact Us</h2>
              <p>
                If you have questions about these Terms, please contact us at:
              </p>
              <p className='text-violet-400'>support@propertyflowhq.com</p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
