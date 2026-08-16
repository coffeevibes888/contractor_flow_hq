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

interface ContractorLimitWarningEmailProps {
  contractorName: string;
  feature: string;
  featureDisplayName: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  currentTier: string;
  nextTier: string;
  nextTierLimit: number | string;
  upgradeUrl: string;
}

export default function ContractorLimitWarningEmail({
  contractorName = 'Contractor',
  feature = 'activeJobs',
  featureDisplayName = 'Active Jobs',
  currentUsage = 12,
  limit = 15,
  percentage = 80,
  currentTier = 'Starter',
  nextTier = 'Pro',
  nextTierLimit = 50,
  upgradeUrl = 'https://app.example.com/contractor/settings/subscription',
}: ContractorLimitWarningEmailProps) {
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
        You're using {`${percentage}`}% of your {featureDisplayName} limit
      </Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#f59e0b',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              Approaching Your Limit
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
            {/* Warning Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
              }}
            >
              <span style={{ marginRight: '6px' }}>⚠️</span>
              Usage Warning
            </div>

            {/* Greeting */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              Hi {contractorName},
            </Text>

            {/* Main Message */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              You're currently using <strong>{currentUsage}</strong> of your <strong>{limit}</strong> available{' '}
              {featureDisplayName.toLowerCase()} on the <strong>{currentTier}</strong> plan ({percentage}% capacity).
            </Text>

            {/* Progress Bar */}
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
                    width: `${Math.min(percentage, 100)}%`,
                    height: '100%',
                    backgroundColor: percentage >= 90 ? '#ef4444' : '#f59e0b',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <Text style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
                {currentUsage} / {limit} {featureDisplayName.toLowerCase()} used
              </Text>
            </div>

            {/* Upgrade Section */}
            <div
              style={{
                backgroundColor: '#f3f4f6',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}
              >
                Upgrade to {nextTier}
              </Heading>
              <Text style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                To avoid interruptions and unlock more capacity:
              </Text>
              <ul style={{ fontSize: '14px', color: '#4b5563', paddingLeft: '20px', margin: '0 0 16px 0' }}>
                <li>{nextTierLimitDisplay} {featureDisplayName.toLowerCase()}</li>
                {nextTier === 'Pro' && (
                  <>
                    <li>Team management for up to 6 members</li>
                    <li>CRM features</li>
                    <li>Lead management</li>
                    <li>Inventory tracking</li>
                  </>
                )}
                {nextTier === 'Enterprise' && (
                  <>
                    <li>Unlimited team members</li>
                    <li>Advanced CRM & automation</li>
                    <li>Full inventory management</li>
                    <li>API access</li>
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
                  padding: '12px 24px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'inline-block',
                }}
              >
                View Upgrade Options
              </Button>
            </div>

            {/* Help Text */}
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0 0' }}>
              Need help choosing the right plan? Contact our support team.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              You're receiving this email because you're approaching your subscription limit.
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
