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

interface ContractorFeatureLockedEmailProps {
  contractorName: string;
  feature: string;
  featureDisplayName: string;
  currentTier: string;
  requiredTier: string;
  requiredTierPrice: number;
  upgradeUrl: string;
}

export default function ContractorFeatureLockedEmail({
  contractorName = 'Contractor',
  feature = 'teamManagement',
  featureDisplayName = 'Team Management',
  currentTier = 'Starter',
  requiredTier = 'Pro',
  requiredTierPrice = 99,
  upgradeUrl = 'https://app.example.com/contractor/settings/subscription',
}: ContractorFeatureLockedEmailProps) {
  const getFeatureBenefits = () => {
    switch (feature) {
      case 'teamManagement':
        return [
          'Invite up to 6 team members (Pro) or unlimited (Enterprise)',
          'Team chat with channels',
          'Schedule management',
          'Time tracking & timesheets',
          'Role-based permissions',
        ];
      case 'crm':
        return [
          'Customer tags and segments',
          'Communication history',
          'Follow-up reminders',
          'Customer portal access',
          'Advanced customer insights',
        ];
      case 'leadManagement':
        return [
          'Lead tracking (100 active leads on Pro)',
          'Lead scoring and prioritization',
          'Quote automation',
          'Conversion tracking',
          'Lead source analytics',
        ];
      case 'inventory':
        return [
          'Track up to 200 inventory items (Pro)',
          'Stock level alerts',
          'Usage tracking',
          'Cost analysis',
          'Automated reordering (Enterprise)',
        ];
      case 'equipment':
        return [
          'Track up to 20 equipment items (Pro)',
          'Maintenance reminders',
          'Usage tracking',
          'GPS tracking (Enterprise)',
          'Depreciation tracking',
        ];
      case 'marketing':
        return [
          'Referral program',
          'Review management',
          'Email campaigns (Enterprise)',
          'SMS marketing (Enterprise)',
          'Portfolio showcase',
        ];
      case 'advancedAnalytics':
        return [
          'Custom dashboards',
          'Revenue forecasting',
          'Profitability analysis',
          'Team productivity metrics',
          'Custom report builder',
        ];
      case 'apiAccess':
        return [
          'Full API access',
          'Webhook support',
          'Custom integrations',
          'QuickBooks sync',
          'Zapier integration',
        ];
      default:
        return [
          'Advanced features for your business',
          'Priority support',
          'Enhanced capabilities',
        ];
    }
  };

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
        Unlock {featureDisplayName} with {requiredTier}
      </Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <Section style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#7c3aed',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
                fontSize: '24px',
              }}
            >
              🔒
            </div>
            <Heading style={{ fontSize: '24px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
              Feature Locked
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
            {/* Feature Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#ede9fe',
                color: '#7c3aed',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '20px',
              }}
            >
              <span style={{ marginRight: '6px' }}>🔒</span>
              {requiredTier} Feature
            </div>

            {/* Greeting */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
              Hi {contractorName},
            </Text>

            {/* Main Message */}
            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              You recently tried to access <strong>{featureDisplayName}</strong>, which is available on the{' '}
              <strong>{requiredTier}</strong> plan.
            </Text>

            <Text style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
              Your current <strong>{currentTier}</strong> plan includes essential features to get started. Upgrade to{' '}
              <strong>{requiredTier}</strong> to unlock {featureDisplayName.toLowerCase()} and grow your business.
            </Text>

            {/* Feature Benefits */}
            <div
              style={{
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <Heading
                as="h2"
                style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}
              >
                What You'll Get with {featureDisplayName}
              </Heading>
              <ul style={{ fontSize: '14px', color: '#4b5563', paddingLeft: '20px', margin: '0' }}>
                {getFeatureBenefits().map((benefit, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>
                    {benefit}
                  </li>
                ))}
              </ul>
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
                Upgrade to {requiredTier} - ${requiredTierPrice}/month
              </Heading>
              <Text style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px' }}>
                Plus get access to all {requiredTier} features:
              </Text>
              <ul style={{ fontSize: '14px', color: '#4b5563', paddingLeft: '20px', margin: '0 0 16px 0' }}>
                {requiredTier === 'Pro' && (
                  <>
                    <li>Up to 50 active jobs per month</li>
                    <li>Unlimited invoicing</li>
                    <li>500 customers</li>
                    <li>Advanced scheduling</li>
                    <li>Priority support</li>
                  </>
                )}
                {requiredTier === 'Enterprise' && (
                  <>
                    <li>Unlimited jobs, customers, and team</li>
                    <li>Advanced analytics & reporting</li>
                    <li>API access & integrations</li>
                    <li>White-label options</li>
                    <li>24/7 priority support</li>
                    <li>Dedicated account manager</li>
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
                Unlock {featureDisplayName}
              </Button>
            </div>

            {/* Help Text */}
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', margin: '20px 0 0' }}>
              Have questions? We're here to help you find the perfect plan for your business.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: '#e2e8f0', margin: '30px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
              You're receiving this email because you attempted to access a premium feature.
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
