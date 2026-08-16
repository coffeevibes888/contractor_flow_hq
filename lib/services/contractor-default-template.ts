/**
 * Default Contractor Contract Template
 * Hardcoded legal wording — used for auto-created contracts (when jobs are created)
 * and for the "Quick Create" modal.
 */

export interface DefaultContractData {
  // Contractor
  contractorName: string;
  contractorLicense?: string;
  contractorAddress?: string;
  contractorState?: string;

  // Customer
  customerName: string;
  customerAddress?: string;

  // Job
  jobTitle: string;
  jobDescription: string;
  jobAddress: string;
  jobCity?: string;
  jobState?: string;
  jobZip?: string;

  // Financial
  contractAmount: number;
  depositAmount?: number;
  paymentSchedule?: string;

  // Timeline
  startDate?: string;
  completionDate?: string;

  // Contract metadata
  contractNumber: string;
  effectiveDate: string;
  expiryDate?: string;

  // Configurable
  warrantyPeriod?: string;
  governingState?: string;
  arbitrationCity?: string;
  permitCostsIncluded?: boolean;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function money(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateDefaultContractHtml(data: DefaultContractData): string {
  const state = data.governingState || data.contractorState || 'Texas';
  const warrantyPeriod = data.warrantyPeriod || 'one (1) year';
  const permitCosts = data.permitCostsIncluded !== false ? 'INCLUDED IN' : 'IN ADDITION TO';
  const paymentSchedule = data.paymentSchedule || '30% deposit upon execution, 40% upon substantial completion of rough work, 30% upon final completion and Customer acceptance';
  const arbitrationCity = data.arbitrationCity || data.jobCity || data.contractorAddress?.split(',').pop()?.trim() || 'Houston';
  const jobLocation = [data.jobCity, data.jobState, data.jobZip].filter(Boolean).join(', ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Agreement - ${esc(data.contractNumber)}</title>
  <style>
    @page { margin: 0.85in; size: letter; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1a1a1a;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.85in;
    }
    h1 { font-size: 16pt; text-align: center; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1.5px; }
    h2 { font-size: 12pt; margin: 22px 0 8px; border-bottom: 1.5px solid #1a1a1a; padding-bottom: 3px; }
    h3 { font-size: 10.5pt; margin: 14px 0 4px; }
    .header-meta { text-align: center; margin-bottom: 20px; font-size: 9.5pt; color: #444; }
    .header-meta strong { color: #1a1a1a; }
    .parties { margin: 14px 0; }
    .party-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 14px; margin: 6px 0; font-size: 10pt; }
    .party-label { font-weight: bold; font-size: 8.5pt; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; letter-spacing: 0.5px; }
    .contract-value { text-align: center; margin: 16px 0; }
    .contract-value table { margin: 0 auto; border-collapse: collapse; }
    .contract-value td { padding: 4px 20px; font-size: 10pt; }
    .contract-value .label { color: #6b7280; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; }
    .contract-value .value { font-weight: bold; font-size: 11pt; }
    ol { margin: 6px 0; padding-left: 20px; }
    ol li { margin: 4px 0; }
    .section-sub { margin-left: 20px; }
    .sig-block { margin-top: 36px; display: flex; justify-content: space-between; gap: 36px; }
    .sig-line { flex: 1; }
    .sig-line .line { border-bottom: 1px solid #1a1a1a; height: 36px; margin-bottom: 3px; }
    .sig-line .label { font-size: 8.5pt; color: #6b7280; }
    .placeholder { color: #2563eb; font-weight: bold; font-size: 9.5pt; }
    .disclaimer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 7.5pt; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>

<h1>Service Agreement</h1>
<div class="header-meta">
  Contract No. <strong>${esc(data.contractNumber)}</strong> &nbsp;&middot;&nbsp; Effective Date: <strong>${esc(data.effectiveDate)}</strong>
</div>

<div class="parties">
  <div class="party-block">
    <div class="party-label">Service Provider ("Contractor")</div>
    <strong>${esc(data.contractorName)}</strong><br>
    ${data.contractorLicense ? `License No. ${esc(data.contractorLicense)} · ` : ''}${esc(data.contractorAddress || '')}${data.contractorState ? ` · State of ${esc(data.contractorState)}` : ''}
  </div>
  <div class="party-block">
    <div class="party-label">Client ("Customer")</div>
    <strong>${esc(data.customerName)}</strong><br>
    ${esc(data.jobAddress)}${jobLocation ? ` · ${esc(jobLocation)}` : ''}
  </div>
</div>

<div class="contract-value">
  <table>
    <tr>
      <td class="label">Contract Value</td>
      <td class="label">Deposit Required</td>
      ${data.expiryDate ? '<td class="label">Offer Expires</td>' : ''}
    </tr>
    <tr>
      <td class="value">${money(data.contractAmount)}</td>
      <td class="value">${data.depositAmount ? money(data.depositAmount) : 'None'}</td>
      ${data.expiryDate ? `<td class="value">${esc(data.expiryDate)}</td>` : ''}
    </tr>
  </table>
</div>

<h2>1. Scope of Work</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>1.1 Description of Services.</strong> Contractor agrees to furnish all labor, materials, equipment, and expertise necessary to complete the following work at the property identified above: ${esc(data.jobDescription)}. Any work not expressly described herein is excluded from this Agreement.
</li>
<li style="list-style: none;">
  <strong>1.2 Start and Completion.</strong> Work shall commence on approximately ${data.startDate ? esc(data.startDate) : 'the date of mutual execution'} and shall be substantially completed by ${data.completionDate ? esc(data.completionDate) : 'a date to be mutually agreed upon in writing'}, subject to delays caused by circumstances outside Contractor's reasonable control, including but not limited to inclement weather, supply chain disruption, or Customer-caused delays.
</li>
<li style="list-style: none;">
  <strong>1.3 Change Orders.</strong> Any alteration, addition, or deletion from the Scope of Work must be authorized in a written and signed Change Order prior to commencement of modified work. Change Orders shall specify the change in scope, adjusted price, and revised schedule. Contractor shall not be liable for delays or cost overruns caused by scope changes not documented via written Change Order.
</li>
<li style="list-style: none;">
  <strong>1.4 Site Access.</strong> Customer shall provide Contractor with timely, unobstructed access to the work area for the duration of the project. Delays caused by Customer's failure to provide access shall extend the completion deadline day-for-day and may result in additional charges.
</li>
</ol>

<h2>2. Payment Terms</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>2.1 Payment Schedule.</strong> ${esc(paymentSchedule)}. All amounts are due within five (5) business days of each milestone unless otherwise stated herein.
</li>
<li style="list-style: none;">
  <strong>2.2 Late Payment.</strong> Balances unpaid after their due date shall accrue interest at the rate of one and one-half percent (1.5%) per month (18% per annum), or the maximum rate permitted by applicable law, whichever is lower, from the date due until paid in full.
</li>
<li style="list-style: none;">
  <strong>2.3 Right to Suspend.</strong> Contractor reserves the right to suspend work, without liability, if any payment is more than ten (10) days past due. Work will resume within a commercially reasonable time following full payment of the outstanding balance plus any applicable interest.
</li>
<li style="list-style: none;">
  <strong>2.4 Collection Costs.</strong> In the event Contractor must pursue collection of unpaid amounts, Customer agrees to reimburse Contractor for all reasonable attorney's fees, court costs, and collection expenses incurred.
</li>
</ol>

<h2>3. Warranties &amp; Representations</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>3.1 Workmanship Warranty.</strong> Contractor warrants that all labor performed under this Agreement shall be completed in a professional, workmanlike manner consistent with industry standards for a period of ${esc(warrantyPeriod)} from the date of substantial completion. This warranty does not cover damage resulting from Customer misuse, neglect, unauthorized modification, or normal wear and tear.
</li>
<li style="list-style: none;">
  <strong>3.2 Materials Warranty.</strong> All materials, fixtures, and equipment installed by Contractor are warranted per the applicable manufacturer's warranty. Contractor shall, upon request, provide Customer with manufacturer documentation for all installed components.
</li>
<li style="list-style: none;">
  <strong>3.3 Pre-Existing Conditions.</strong> Contractor is not responsible for any deficiencies, defects, code violations, or damage that existed at the property prior to commencement of work. If pre-existing conditions are discovered during the project that materially affect scope or cost, Contractor shall notify Customer in writing and a Change Order shall be executed prior to proceeding.
</li>
<li style="list-style: none;">
  <strong>3.4 Contractor Licensing.</strong> Contractor represents and warrants that it holds all licenses, permits, and certifications required by applicable federal, state, and local law to perform the services described herein, and that all work shall comply with applicable building codes and regulations.
</li>
</ol>

<h2>4. Liability &amp; Indemnification</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>4.1 Limitation of Liability.</strong> In no event shall Contractor's total liability to Customer, under any theory of law, exceed the total contract price paid to Contractor under this Agreement. Neither party shall be liable for any consequential, incidental, special, or punitive damages arising out of or related to this Agreement, regardless of whether such damages were foreseeable.
</li>
<li style="list-style: none;">
  <strong>4.2 Indemnification by Contractor.</strong> Contractor shall indemnify, defend, and hold harmless Customer from and against any third-party claims, damages, or liabilities arising directly from Contractor's negligence or willful misconduct in performing services under this Agreement.
</li>
<li style="list-style: none;">
  <strong>4.3 Indemnification by Customer.</strong> Customer shall indemnify, defend, and hold harmless Contractor from and against any claims, damages, or liabilities arising out of (a) Customer's failure to disclose known hazards or pre-existing conditions at the property, (b) unauthorized access or interference with Contractor's work, or (c) Customer's breach of this Agreement.
</li>
<li style="list-style: none;">
  <strong>4.4 Insurance.</strong> Contractor shall maintain, at minimum, general commercial liability insurance in the amount of $1,000,000 per occurrence / $2,000,000 aggregate, workers' compensation insurance as required by law, and any other insurance required for the work. Proof of insurance shall be provided to Customer upon request.
</li>
</ol>

<h2>5. Permits &amp; Compliance</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>5.1 Permits.</strong> Unless expressly stated otherwise, Contractor shall be responsible for obtaining all required building and trade permits prior to commencement of permitted work. The cost of permits is ${permitCosts} the contract price.
</li>
<li style="list-style: none;">
  <strong>5.2 Code Compliance.</strong> All work shall be performed in compliance with applicable federal, state, and local codes, ordinances, and regulations in effect at the time of performance, including but not limited to the International Building Code (IBC), International Residential Code (IRC), National Electrical Code (NEC), and any jurisdictional amendments thereto.
</li>
</ol>

<h2>6. Termination</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>6.1 Termination for Convenience.</strong> Either party may terminate this Agreement upon seven (7) days' written notice. In the event of termination, Customer shall pay Contractor for all work performed and materials ordered through the termination date, including reasonable demobilization costs and any restocking or cancellation fees incurred.
</li>
<li style="list-style: none;">
  <strong>6.2 Termination for Cause.</strong> Either party may terminate this Agreement immediately upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within ten (10) days of written notice specifying the breach.
</li>
</ol>

<h2>7. Dispute Resolution</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>7.1 Good Faith Negotiation.</strong> The parties shall attempt in good faith to resolve any dispute arising out of or relating to this Agreement through direct negotiation before initiating formal proceedings.
</li>
<li style="list-style: none;">
  <strong>7.2 Binding Arbitration.</strong> Any dispute not resolved by negotiation within thirty (30) days shall be submitted to binding arbitration administered by the American Arbitration Association (AAA) under its Construction Industry Arbitration Rules. The arbitration shall take place in ${esc(arbitrationCity)}, ${esc(state)}. The decision of the arbitrator shall be final and enforceable in any court of competent jurisdiction.
</li>
<li style="list-style: none;">
  <strong>7.3 Governing Law.</strong> This Agreement shall be governed by and construed in accordance with the laws of the State of ${esc(state)}, without regard to its conflict of law provisions.
</li>
</ol>

<h2>8. General Provisions</h2>

<ol type="1">
<li style="list-style: none;">
  <strong>8.1 Entire Agreement.</strong> This Agreement, including any attached Exhibits, Addenda, or Change Orders, constitutes the entire agreement between the parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements, whether oral or written.
</li>
<li style="list-style: none;">
  <strong>8.2 Amendments.</strong> No amendment or modification to this Agreement shall be effective unless made in writing and signed by authorized representatives of both parties.
</li>
<li style="list-style: none;">
  <strong>8.3 Severability.</strong> If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.
</li>
<li style="list-style: none;">
  <strong>8.4 Independent Contractor.</strong> Contractor is an independent contractor, not an employee, partner, or agent of Customer. Contractor shall be solely responsible for all taxes, withholdings, insurance, and employment obligations related to its personnel.
</li>
<li style="list-style: none;">
  <strong>8.5 Force Majeure.</strong> Neither party shall be liable for delays or failures in performance resulting from acts of God, natural disasters, pandemic, government action, supply shortages, or other causes beyond that party's reasonable control.
</li>
<li style="list-style: none;">
  <strong>8.6 Notices.</strong> All notices under this Agreement shall be in writing and delivered by email (with read receipt), certified mail, or hand delivery to the addresses of record for each party.
</li>
<li style="list-style: none;">
  <strong>8.7 Electronic Signatures.</strong> The parties agree that electronic signatures, whether applied through a platform-integrated e-signature tool or another recognized electronic signature service, are legally binding and shall have the same force and effect as original handwritten signatures under applicable law, including the Electronic Signatures in Global and National Commerce Act (E-SIGN) and the Uniform Electronic Transactions Act (UETA).
</li>
</ol>

<h2>Signatures</h2>
<p>By signing below, each party acknowledges that they have read, understand, and agree to be legally bound by all terms and conditions of this Agreement.</p>

<div class="sig-block">
  <div class="sig-line">
    <div class="line"><span class="placeholder">/sig_contractor/</span></div>
    <div class="label">Contractor Signature</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Name: ${esc(data.contractorName)}</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Title: _______________</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Date: _______________</div>
    ${data.contractorLicense ? `<br><div class="line">___________________________</div><div class="label">License No.: ${esc(data.contractorLicense)}</div>` : ''}
  </div>
  <div class="sig-line">
    <div class="line"><span class="placeholder">/sig_customer/</span></div>
    <div class="label">Customer Signature</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Name: ${esc(data.customerName)}</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Title (if applicable): _______________</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Date: _______________</div>
    <br>
    <div class="line">___________________________</div>
    <div class="label">Property Address: ${esc(data.jobAddress)}</div>
  </div>
</div>

<div class="disclaimer">
  This service agreement was generated using PropertyFlow HQ. PropertyFlow HQ is a software platform, not a law firm. This document does not constitute legal advice. Both parties are encouraged to have this agreement reviewed by a licensed attorney.
</div>

</body>
</html>`;
}
