import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Font,
} from '@react-email/components';

interface ContractorLimitReachedEmailProps {
  contractorName: string;
  feature: string;
  featureDisplayName: string;
  limit: number;
  currentTier: string;
  nextTier: string;
  nextTierLimit: number | string;
  nextTierPrice: number;
  upgradeUrl: string;
}

export default function ContractorLimitReachedEmail({
  contractorName = 'Contractor',
  feature = 'activeJobs',
  featureDisplayName = 'Active Jobs',
  limit = 15,
  currentTier = 'Starter',
  nextTier = 'Pro',
  nextTierLimit = 50,
  nextTierPrice = 99,
  upgradeUrl = 'https://app.example.com/contractor/settings/subscription',
}: ContractorLimitReachedEmailProps) {
  const nextTierLimitDisplay = nextTierLimit === -1 ? 'Unlimited' : nextTierLimit;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        You've reached your {featureDisplayName} limit - Upgrade to continue
      </Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#ef4444',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '24px',
              }}
            >
              🚫
            </div>
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              Limit Reached
            </Heading>
            <Text style={{ fontSize: '14px', color: '#64748b', margin: '5px 0 0' }}>
              Property Flow HQ
            </Text>
          </Section>

          {/* Main Content Card */}
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '30px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              marginBottom: '20px',
            }}
          >
            {/* Critical Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
              }}
            >
              <span style={{ marginRight: '6px' }}>🚫</span>
              Action Required
            </div>

            {/* Greeting */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              Hi {contractorName},
            </Text>

            {/* Main Message */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              You've reached your limit of <strong>{limit} {featureDisplayName.toLowerCase()}</strong> on the{' '}
              <strong>{currentTier}</strong> plan.
            </Text>

            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              To continue creating {featureDisplayName.toLowerCase()} and unlock advanced features, please upgrade to
              the <strong>{nextTier}</strong> plan.
            </Text>

            {/* Progress Bar (Full) */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  width: '100%',
                  height: '12px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#ef4444',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <Text style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px', textAlign: 'center', fontWeight: '600' }}>
                {limit} / {limit} {featureDisplayName.toLowerCase()} used (100%)
              </Text>
            </div>

            {/* Upgrade Section */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '24px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '2px solid #86efac',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}
              >
                Upgrade to {nextTier} - ${nextTierPrice}/month
              </Heading>
              <Text style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                Get instant access to:
              </Text>
              <ul style={{ fontSize: '14px', color: '#4b5563', paddingLeft: '20px', margin: '0 0 16px 0' }}>
                <li>
                  <strong>{nextTierLimitDisplay} {featureDisplayName.toLowerCase()}</strong>
                </li>
                {nextTier === 'Pro' && (
                  <>
                    <li>Team management for up to 6 members</li>
                    <li>CRM features with customer tracking</li>
                    <li>Lead management (100 active leads)</li>
                    <li>Inventory tracking (200 items)</li>
                    <li>Equipment management (20 items)</li>
                    <li>Advanced scheduling</li>
                    <li>Priority support</li>
                  </>
                )}
                {nextTier === 'Enterprise' && (
                  <>
                    <li>Unlimited team members</li>
                    <li>Advanced CRM with automation</li>
                    <li>Unlimited leads and inventory</li>
                    <li>Full equipment fleet management</li>
                    <li>Marketing suite</li>
                    <li>Advanced analytics</li>
                    <li>API access</li>
                    <li>24/7 priority support</li>
                  </>
                )}
              </ul>
            </div>

            {/* Action Button */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Button
                href={upgradeUrl}
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  padding: '14px 32px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'inline-block',
                  fontSize: '16px',
                }}
              >
                Upgrade Now
              </Button>
            </div>

            {/* Help Text */}
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0 0' }}>
              Questions about upgrading? Our team is here to help you choose the right plan.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              You're receiving this email because you've reached your subscription limit.
            </Text>
            <Text style={{ fontSize: '12px', color: '#64748b' }}>
              © 2024 Property Flow HQ. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
