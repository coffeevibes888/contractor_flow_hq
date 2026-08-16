/**
 * Contractor Monthly Summary Email Template
 * 
 * Sent at the end of each billing period with usage statistics
 * and recommendations for the contractor.
 */

import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';

interface ContractorMonthlySummaryEmailProps {
  contractorName: string;
  tier: string;
  periodStart: string;
  periodEnd: string;
  usage: {
    invoices: number;
    invoiceLimit: number | string;
    jobs: number;
    jobLimit: number | string;
    customers: number;
    customerLimit: number | string;
    teamMembers?: number;
    teamMemberLimit?: number | string;
  };
  approachingLimits?: Array<{
    feature: string;
    current: number;
    limit: number;
    percentage: number;
  }>;
  appUrl?: string;
}

export const ContractorMonthlySummaryEmail = ({
  contractorName = 'Contractor',
  tier = 'Pro',
  periodStart = 'January 1, 2024',
  periodEnd = 'January 31, 2024',
  usage = {
    invoices: 45,
    invoiceLimit: 'Unlimited',
    jobs: 12,
    jobLimit: 50,
    customers: 38,
    customerLimit: 500,
  },
  approachingLimits = [],
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com',
}: ContractorMonthlySummaryEmailProps) => {
  const previewText = `Your ${tier} plan usage summary for ${periodStart} - ${periodEnd}`;
  
  const formatLimit = (limit: number | string): string => {
    if (typeof limit === 'string') return limit;
    return limit === -1 ? 'Unlimited' : limit.toString();
  };
  
  const getUsagePercentage = (current: number, limit: number | string): number => {
    if (typeof limit === 'string' || limit === -1) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };
  
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return '#dc3545'; // red
    if (percentage >= 80) return '#ffc107'; // yellow
    return '#28a745'; // green
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>📊 Monthly Usage Summary</Heading>
            <Text style={subtitle}>
              {periodStart} - {periodEnd}
            </Text>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={text}>Hello {contractorName}!</Text>
            <Text style={text}>
              Here's your usage summary for the past billing period on your{' '}
              <strong>{tier}</strong> plan.
            </Text>
          </Section>

          {/* Usage Statistics */}
          <Section style={section}>
            <Heading as="h2" style={h2}>
              Usage Statistics
            </Heading>

            {/* Invoices */}
            <div style={usageItem}>
              <div style={usageHeader}>
                <Text style={usageLabel}>Invoices</Text>
                <Text style={usageValue}>
                  {usage.invoices} / {formatLimit(usage.invoiceLimit)}
                </Text>
              </div>
              <div style={progressBar}>
                <div
                  style={{
                    ...progressFill,
                    width: `${getUsagePercentage(usage.invoices, usage.invoiceLimit)}%`,
                    backgroundColor: getProgressColor(
                      getUsagePercentage(usage.invoices, usage.invoiceLimit)
                    ),
                  }}
                />
              </div>
            </div>

            {/* Active Jobs */}
            <div style={usageItem}>
              <div style={usageHeader}>
                <Text style={usageLabel}>Active Jobs</Text>
                <Text style={usageValue}>
                  {usage.jobs} / {formatLimit(usage.jobLimit)}
                </Text>
              </div>
              <div style={progressBar}>
                <div
                  style={{
                    ...progressFill,
                    width: `${getUsagePercentage(usage.jobs, usage.jobLimit)}%`,
                    backgroundColor: getProgressColor(
                      getUsagePercentage(usage.jobs, usage.jobLimit)
                    ),
                  }}
                />
              </div>
            </div>

            {/* Customers */}
            <div style={usageItem}>
              <div style={usageHeader}>
                <Text style={usageLabel}>Customers</Text>
                <Text style={usageValue}>
                  {usage.customers} / {formatLimit(usage.customerLimit)}
                </Text>
              </div>
              <div style={progressBar}>
                <div
                  style={{
                    ...progressFill,
                    width: `${getUsagePercentage(usage.customers, usage.customerLimit)}%`,
                    backgroundColor: getProgressColor(
                      getUsagePercentage(usage.customers, usage.customerLimit)
                    ),
                  }}
                />
              </div>
            </div>

            {/* Team Members (if applicable) */}
            {usage.teamMembers !== undefined && (
              <div style={usageItem}>
                <div style={usageHeader}>
                  <Text style={usageLabel}>Team Members</Text>
                  <Text style={usageValue}>
                    {usage.teamMembers} / {formatLimit(usage.teamMemberLimit || 0)}
                  </Text>
                </div>
                <div style={progressBar}>
                  <div
                    style={{
                      ...progressFill,
                      width: `${getUsagePercentage(usage.teamMembers, usage.teamMemberLimit || 0)}%`,
                      backgroundColor: getProgressColor(
                        getUsagePercentage(usage.teamMembers, usage.teamMemberLimit || 0)
                      ),
                    }}
                  />
                </div>
              </div>
            )}
          </Section>

          {/* Approaching Limits Warning */}
          {approachingLimits && approachingLimits.length > 0 && (
            <Section style={warningSection}>
              <Heading as="h3" style={h3}>
                ⚠️ Approaching Limits
              </Heading>
              <Text style={text}>
                You're approaching the limit for the following features:
              </Text>
              <ul style={list}>
                {approachingLimits.map((item, index) => (
                  <li key={index} style={listItem}>
                    <strong>{item.feature}:</strong> {item.current} of{' '}
                    {formatLimit(item.limit)} ({item.percentage}%)
                  </li>
                ))}
              </ul>
              <Text style={text}>
                <Link href={`${appUrl}/contractor/settings/subscription`} style={link}>
                  Consider upgrading to avoid interruptions →
                </Link>
              </Text>
            </Section>
          )}

          {/* What's Next */}
          <Section style={section}>
            <Heading as="h3" style={h3}>
              What's Next?
            </Heading>
            <Text style={text}>
              Your monthly invoice counter has been reset for the new billing period.
              You can continue creating invoices and managing your business without
              interruption.
            </Text>
            <div style={buttonContainer}>
              <Link href={`${appUrl}/contractor/dashboard`} style={button}>
                View Dashboard
              </Link>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Contact us at{' '}
              <Link href="mailto:support@example.com" style={link}>
                support@example.com
              </Link>
            </Text>
            <Text style={footerText}>
              <Link href={`${appUrl}/contractor/settings/subscription`} style={link}>
                Manage Subscription
              </Link>
              {' • '}
              <Link href={`${appUrl}/contractor/settings`} style={link}>
                Account Settings
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ContractorMonthlySummaryEmail;

// ============= Styles =============

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px 8px 0 0',
};

const section = {
  padding: '24px',
};

const warningSection = {
  padding: '24px',
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  margin: '0 24px',
  borderRadius: '4px',
};

const h1 = {
  color: '#2c3e50',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  padding: '0',
};

const h2 = {
  color: '#495057',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const h3 = {
  color: '#495057',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const subtitle = {
  color: '#6c757d',
  fontSize: '16px',
  margin: '0',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const usageItem = {
  marginBottom: '20px',
};

const usageHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const usageLabel = {
  color: '#495057',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const usageValue = {
  color: '#6c757d',
  fontSize: '14px',
  margin: '0',
};

const progressBar = {
  backgroundColor: '#e9ecef',
  height: '8px',
  borderRadius: '4px',
  overflow: 'hidden',
};

const progressFill = {
  height: '100%',
  transition: 'width 0.3s ease',
};

const list = {
  margin: '12px 0',
  paddingLeft: '20px',
};

const listItem = {
  margin: '8px 0',
  color: '#333',
  fontSize: '14px',
};

const buttonContainer = {
  marginTop: '24px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#007bff',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const link = {
  color: '#007bff',
  textDecoration: 'none',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  color: '#6c757d',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
  textAlign: 'center' as const,
};
