import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ContractorTeamInviteEmailProps {
  inviteeName?: string;
  businessName: string;
  roleName: string;
  inviteUrl: string;
  expiresInDays?: number;
}

export default function ContractorTeamInviteEmail({
  inviteeName,
  businessName,
  roleName,
  inviteUrl,
  expiresInDays = 7,
}: ContractorTeamInviteEmailProps) {
  const greeting = inviteeName ? `Hi ${inviteeName},` : 'Hi there,';

  return (
    <Html>
      <Head />
      <Preview>
        {businessName} invited you to join their team as {roleName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>PropertyFlow HQ</Heading>
          </Section>

          {/* Body */}
          <Section style={content}>
            <Heading style={h1}>You&apos;ve been invited to join a team</Heading>

            <Text style={paragraph}>{greeting}</Text>

            <Text style={paragraph}>
              <strong>{businessName}</strong> has invited you to join their
              contractor team on PropertyFlow HQ as a{' '}
              <strong>{roleName}</strong>.
            </Text>

            <Text style={paragraph}>
              Click the button below to accept your invitation and set up your
              account. You&apos;ll have access to the tools and information your
              role requires — nothing more.
            </Text>

            <Section style={btnContainer}>
              <Button style={button} href={inviteUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={link}>{inviteUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              This invitation expires in {expiresInDays} days. If you were not
              expecting this invitation, you can safely ignore this email.
            </Text>

            <Text style={footer}>
              &copy; {new Date().getFullYear()} PropertyFlow HQ. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const header: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  padding: '32px 40px',
  textAlign: 'center',
};

const logo: React.CSSProperties = {
  color: '#f59e0b',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const content: React.CSSProperties = {
  padding: '40px',
};

const h1: React.CSSProperties = {
  color: '#1e293b',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 24px',
  lineHeight: '1.3',
};

const paragraph: React.CSSProperties = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const btnContainer: React.CSSProperties = {
  textAlign: 'center',
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center',
  display: 'inline-block',
  padding: '14px 32px',
};

const link: React.CSSProperties = {
  color: '#7c3aed',
  fontSize: '13px',
  wordBreak: 'break-all',
  margin: '0 0 24px',
};

const hr: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '32px 0 24px',
};

const footer: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};
