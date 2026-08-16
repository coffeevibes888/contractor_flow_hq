/**
 * lib/email-templates/lifecycle.ts
 *
 * Single source of truth for every landlord lifecycle email body.
 * Imported by:
 *   - app/api/cron/send-landlord-lifecycle-emails/route.ts  (cron, daily)
 *   - app/api/super-admin/send-lifecycle-email/route.ts     (manual send from CRM)
 *
 * Design language:
 *   - Max width 600px, works in Gmail / Outlook / Apple Mail / dark-mode
 *   - Purple/indigo brand header, clean white body, bold stat callouts
 *   - One primary CTA button per email — no competing links above it
 *   - Personal sign-off from Gregory, reply-able tone
 *   - Unsubscribe footer on every email (legal requirement)
 */

const BASE = (appUrl: string) => appUrl.replace(/\/$/, '');

// ─── Shared primitives ────────────────────────────────────────────────────────

function shell(
  headerBg: string,
  headerContent: string,
  body: string,
  appUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>PropertyFlow HQ</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">

      <!-- Outer card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header band -->
        <tr>
          <td style="background:${headerBg};padding:36px 40px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.65);letter-spacing:0.14em;text-transform:uppercase;">PropertyFlow HQ</p>
                  ${headerContent}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        ${body}

        <!-- Sign-off -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
              Talk soon,<br />
              <strong style="color:#111827;">Gregory Young</strong><br />
              <span style="color:#6b7280;font-size:13px;">Founder, PropertyFlow HQ</span>
            </p>
            <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;font-style:italic;">
              Reply to this email — I read every one personally.
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" /></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
              <strong style="color:#6b7280;">PropertyFlow HQ</strong> · <a href="${appUrl}" style="color:#7c3aed;text-decoration:none;">propertyflowhq.com</a><br />
              You're receiving this because you created a PropertyFlow HQ account.<br />
              <a href="${appUrl}/unsubscribe" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${appUrl}/privacy" style="color:#9ca3af;text-decoration:underline;">Privacy</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string, color = '#7c3aed'): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td style="border-radius:12px;background:${color};">
        <a href="${href}" style="display:inline-block;padding:15px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:-0.01em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function statBlock(stats: { value: string; label: string; accent: string; note: string }[]): string {
  const cells = stats.map(({ value, label, accent, note }) => `
    <td style="width:${Math.floor(100 / stats.length)}%;padding:18px 16px;text-align:center;border-right:1px solid #f1f5f9;vertical-align:top;">
      <p style="margin:0;font-size:28px;font-weight:800;color:${accent};line-height:1;">${value}</p>
      <p style="margin:4px 0 2px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#6b7280;">${label}</p>
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.4;">${note}</p>
    </td>`).join('');

  return `
  <tr>
    <td style="padding:0 40px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #f1f5f9;border-radius:14px;overflow:hidden;">
        <tr>${cells}</tr>
      </table>
    </td>
  </tr>`;
}

function featureList(items: { icon: string; title: string; desc: string }[]): string {
  const rows = items.map(({ icon, title, desc }) => `
    <tr>
      <td style="padding:14px 20px;border-bottom:1px solid #f8fafc;vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:22px;width:38px;vertical-align:top;padding-top:1px;">${icon}</td>
            <td style="padding-left:12px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${title}</p>
              <p style="margin:3px 0 0;font-size:13px;color:#6b7280;line-height:1.55;">${desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  return `
  <tr>
    <td style="padding:0 40px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        ${rows}
      </table>
    </td>
  </tr>`;
}

function callout(bg: string, border: string, content: string): string {
  return `
  <tr>
    <td style="padding:0 40px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid ${border};border-radius:14px;">
        <tr><td style="padding:18px 22px;">${content}</td></tr>
      </table>
    </td>
  </tr>`;
}

// ─── Day 1 — Automation explainer ────────────────────────────────────────────
// Fires 1 day after signup when the landlord has 0 properties.
// Goal: show them the full automation loop so they understand the "why"
// before asking them to do any work.

export function day1Html(firstName: string, appUrl: string): string {
  const addPropertyUrl = `${BASE(appUrl)}/admin/dashboard/properties/new`;

  const header = `
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
      Here's exactly what happens<br />after your tenant pays rent
    </h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">
      The full automation loop — running 24/7 once you add one property.
    </p>`;

  const body = `
    <tr>
      <td style="padding:32px 40px 8px;">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          Welcome to PropertyFlow HQ. Before you add your first property, I want to show you
          <em>exactly</em> what the platform does once it's running — because most landlords tell me
          they didn't realise how much of their month it would take back.
        </p>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
          This is the full loop, automated:
        </p>
      </td>
    </tr>

    ${featureList([
      { icon: '📅', title: 'Rent reminder sent — automatically', desc: '3 days before the due date, your tenant gets a reminder. No text from you. No "hey, just checking on rent" awkwardness.' },
      { icon: '💳', title: 'Tenant pays online — any device', desc: 'ACH bank transfer or card, from their phone. Takes 60 seconds. The payment clears in 1–2 business days to your connected bank account.' },
      { icon: '🔔', title: 'You get notified the moment it clears', desc: 'Email + dashboard notification. You see it instantly — while you\'re at your day job, on a trip, wherever.' },
      { icon: '📊', title: 'Rent roll updates automatically', desc: 'Every payment logged, categorized, and exportable. P&L and expense reports are always current. Tax time becomes a 10-minute job.' },
      { icon: '🔧', title: 'Maintenance on autopilot', desc: 'Tenant submits a work order with photos. You assign a contractor, track progress, close the loop — all logged. No more "did you get my text about the sink?"' },
      { icon: '⚖️', title: 'Late fee applied automatically', desc: 'If rent is overdue, the late fee is applied on the configured day — no confrontation, no negotiation. The system handles it.' },
    ])}

    ${statBlock([
      { value: '30%', label: 'Fewer late payments', accent: '#7c3aed', note: 'vs landlords collecting by check or Venmo' },
      { value: '6 hrs', label: 'Saved per month', accent: '#059669', note: 'avg admin time per property' },
      { value: '23%', label: 'Lower turnover', accent: '#0ea5e9', note: 'tenants with online portal stay longer' },
    ])}

    ${callout('#faf5ff', '#e9d5ff', `
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
        <strong style="color:#7c3aed;">The honest math:</strong> PropertyFlow Starter is $39/month.
        If it prevents one late payment and saves 3 hours of admin time, it pays for itself in week one.
        Every month after that is profit — and peace of mind.
      </p>
    `)}

    <tr>
      <td style="padding:0 40px 12px;text-align:center;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
          Add your first property — it takes about 2 minutes and everything above switches on automatically.
        </p>
        ${ctaButton('Add Your First Property →', addPropertyUrl)}
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Takes 2 minutes · 14-day free trial · No credit card required</p>
      </td>
    </tr>
    <tr><td style="padding:28px 0 0;"></td></tr>`;

  return shell('linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', header, body, appUrl);
}

// ─── Day 2 — No property nudge ────────────────────────────────────────────────
// Fires 2 days after signup when landlord still has 0 properties.
// Goal: remove friction / answer objections. Personal, short, one CTA.

export function day2Html(firstName: string, appUrl: string): string {
  const addPropertyUrl = `${BASE(appUrl)}/admin/dashboard/properties/new`;

  const header = `
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
      Did you get stuck somewhere?
    </h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">
      Adding your first property takes about 2 minutes — let me show you exactly how.
    </p>`;

  const body = `
    <tr>
      <td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          You signed up for PropertyFlow a couple days ago — glad you're here. I noticed you haven't
          added your first property yet, so I wanted to check in.
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          Sometimes people get stuck on the setup, so here's exactly what adding a property looks like:
        </p>
      </td>
    </tr>

    ${featureList([
      { icon: '1️⃣', title: 'Click "Properties" in the sidebar', desc: 'Then hit "Add Property". You\'ll see a short form — address, property type, and a few basic details.' },
      { icon: '2️⃣', title: 'Fill in the address and rent amount', desc: 'That\'s really all you need to get started. Photos, descriptions, and listing details are optional — add them later.' },
      { icon: '3️⃣', title: 'Save and invite your tenant', desc: 'Once your property is saved, you\'ll see an "Invite Tenant" button. One click sends them a portal link and they can pay rent from there.' },
    ])}

    ${callout('#f0fdf4', '#bbf7d0', `
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#065f46;">You don't need to fill everything in today.</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
        The minimum to get rent collection running is: address, property type, rent amount, tenant email.
        That's it. Everything else — photos, documents, maintenance rules — you can add as you go.
      </p>
    `)}

    <tr>
      <td style="padding:0 40px 12px;text-align:center;">
        ${ctaButton('Add My First Property →', addPropertyUrl)}
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
          Stuck? Just reply to this email — I'll walk you through it personally.
        </p>
      </td>
    </tr>
    <tr><td style="padding:28px 0 0;"></td></tr>`;

  return shell('linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', header, body, appUrl);
}

// ─── Day 7 — No Stripe / bank connection ─────────────────────────────────────
// Fires 7 days after signup when landlord HAS a property but no Stripe Connect.
// Goal: remove fear around the bank connection step. Concrete, trust-building.

export function day7Html(firstName: string, appUrl: string): string {
  const payoutsUrl = `${BASE(appUrl)}/admin/payouts`;

  const header = `
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
      One step from collecting rent online
    </h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">
      You've added your property — connecting your bank is the last step.
    </p>`;

  const body = `
    <tr>
      <td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          You added your property to PropertyFlow — nice work. There's one more step before
          your tenants can pay rent online: connecting your bank account for payouts.
        </p>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
          I know "connect your bank account" can sound scary. Here's what it actually means:
        </p>
      </td>
    </tr>

    ${featureList([
      { icon: '🔒', title: 'It\'s powered by Stripe — the same platform behind Airbnb and Shopify', desc: 'PropertyFlow never stores your bank details. Stripe handles everything and is trusted by millions of businesses.' },
      { icon: '⏱️', title: 'Takes about 5 minutes', desc: 'You\'ll enter your bank routing and account number (or link directly via Plaid). Stripe verifies it and you\'re done.' },
      { icon: '💸', title: 'Funds deposit on a set schedule', desc: 'You choose daily, weekly, or monthly payouts. Rent collected on your behalf gets deposited directly to your bank — no middleman.' },
      { icon: '📋', title: 'Everything is logged and reportable', desc: 'Every payout is recorded in your dashboard with a full transaction history. Perfect for accounting and taxes.' },
    ])}

    ${callout('#fffbeb', '#fde68a', `
      <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#92400e;">⚠️ Without this step, rent collection won't activate</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
        Your tenant portal is ready and your property is set up — but until your bank is connected,
        tenants can't pay you online. This is the last piece.
      </p>
    `)}

    <tr>
      <td style="padding:0 40px 12px;text-align:center;">
        ${ctaButton('Connect My Bank Account →', payoutsUrl, '#059669')}
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
          Secure · Powered by Stripe · Takes 5 minutes · Questions? Just reply.
        </p>
      </td>
    </tr>
    <tr><td style="padding:28px 0 0;"></td></tr>`;

  return shell('linear-gradient(135deg, #059669 0%, #047857 100%)', header, body, appUrl);
}

// ─── Day 21 — Win-back ────────────────────────────────────────────────────────
// Fires 21+ days after signup when trial expired, landlord has a property,
// but never subscribed.
// Goal: loss-aversion reframe. Their setup is still there — just needs a card.

export function day21Html(firstName: string, propertiesCount: number, appUrl: string): string {
  const billingUrl = `${BASE(appUrl)}/admin/billing`;
  const propertyWord = propertiesCount === 1 ? 'property' : 'properties';

  const header = `
    <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;">
      Your PropertyFlow setup is still here, ${firstName}
    </h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.6;">
      Nothing was deleted. Pick up exactly where you left off.
    </p>`;

  const body = `
    <tr>
      <td style="padding:32px 40px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          Your free trial ended a little while ago, but the ${propertiesCount} ${propertyWord} you set up
          on PropertyFlow is still in your account — nothing was deleted, nothing expired.
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
          When you subscribe, everything picks up instantly from where you left it:
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:14px;overflow:hidden;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.08em;">Waiting for you right now</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              ${[
                'Your properties and unit configuration',
                'Tenant details and any lease records',
                'Online rent collection — active the moment you subscribe',
                'Maintenance tracking and work order history',
                'Your full dashboard, reports, and document library',
              ].map(item => `
              <tr><td style="padding:5px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#0284c7;font-size:16px;width:24px;font-weight:700;vertical-align:top;">✓</td>
                    <td style="font-size:13px;color:#374151;line-height:1.6;">${item}</td>
                  </tr>
                </table>
              </td></tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>

    ${callout('#faf5ff', '#e9d5ff', `
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#6d28d9;">Plans from $39/month · No contracts · Cancel anytime</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
        The Starter plan covers up to 24 units and includes everything: rent collection, tenant portal,
        maintenance tracking, digital leases, and e-signatures. No transaction fees on top.
      </p>
    `)}

    <tr>
      <td style="padding:0 40px 12px;text-align:center;">
        ${ctaButton('Reactivate My Account →', billingUrl, '#0284c7')}
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
          Subscribe in 60 seconds · Everything resumes immediately
        </p>
      </td>
    </tr>
    <tr><td style="padding:28px 0 0;"></td></tr>`;

  return shell('linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', header, body, appUrl);
}
