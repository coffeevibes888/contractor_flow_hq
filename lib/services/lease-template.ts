/**
 * Court-Ready Residential Lease Agreement Template
 * 
 * This template generates a comprehensive, legally-sound lease agreement
 * with proper signature and initials placeholders for the signing flow.
 *
 * Signature placeholders:
 * - /sig_landlord/ - Landlord signature
 * - /sig_tenant/ - Tenant signature
 * - /init1/ through /init19/   - Tenant section initials
 * - /init_l1/ through /init_l19/ - Landlord section initials
 */

export interface LeaseTemplateData {
  landlordName: string;
  tenantName: string;
  propertyLabel: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: string;
  billingDayOfMonth: string;
  todayDate: string;
  // Optional enhanced fields
  landlordAddress?: string;
  landlordEmail?: string;
  landlordPhone?: string;
  tenantEmail?: string;
  securityDeposit?: string;
  lateFee?: string;
  gracePeriodDays?: string;
  state?: string;
  petPolicy?: 'allowed' | 'not_allowed';
  petDeposit?: string;
  smokingAllowed?: boolean;
  moveOutNoticeDays?: string;
  entryNoticeDays?: string;
}

export const renderLeaseHtml = (data: LeaseTemplateData | {
  landlordName: string;
  tenantName: string;
  propertyLabel: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: string;
  billingDayOfMonth: string;
  todayDate: string;
}) => {
  const {
    landlordName,
    tenantName,
    propertyLabel,
    leaseStartDate,
    leaseEndDate,
    rentAmount,
    billingDayOfMonth,
    todayDate,
  } = data;

  // Use defaults for optional fields
  const landlordAddress = 'landlordAddress' in data ? data.landlordAddress : '';
  const landlordEmail = 'landlordEmail' in data ? data.landlordEmail : '';
  const landlordPhone = 'landlordPhone' in data ? data.landlordPhone : '';
  const tenantEmail = 'tenantEmail' in data ? data.tenantEmail : '';
  const securityDeposit = 'securityDeposit' in data && data.securityDeposit ? data.securityDeposit : rentAmount;
  const lateFee = 'lateFee' in data && data.lateFee ? data.lateFee : '5% of monthly rent';
  const gracePeriodDays = 'gracePeriodDays' in data && data.gracePeriodDays ? data.gracePeriodDays : '5';
  const state = 'state' in data && data.state ? data.state : 'NV';
  const petPolicy = 'petPolicy' in data ? data.petPolicy : 'not_allowed';
  const petDeposit = 'petDeposit' in data ? data.petDeposit : '$300';
  const smokingAllowed = 'smokingAllowed' in data ? data.smokingAllowed : false;
  const moveOutNoticeDays = 'moveOutNoticeDays' in data && data.moveOutNoticeDays ? data.moveOutNoticeDays : '30';
  const entryNoticeDays = 'entryNoticeDays' in data && data.entryNoticeDays ? data.entryNoticeDays : '24';

  // Calculate late fee start day
  const lateFeeStartDay = parseInt(billingDayOfMonth) + parseInt(gracePeriodDays);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Residential Lease Agreement</title>
    <style>
      @page { margin: 0.6in; size: letter; }
      body { 
        font-family: 'Times New Roman', Times, serif; 
        font-size: 10pt; 
        line-height: 1.5; 
        max-width: 8in; 
        margin: 0 auto; 
        padding: 20px; 
        color: #000; 
      }
      h1 { 
        text-align: center; 
        font-size: 14pt; 
        margin-bottom: 16pt;
        text-transform: uppercase;
        font-weight: bold;
        border-bottom: 2px solid #000;
        padding-bottom: 8pt;
      }
      h2 { 
        font-size: 11pt; 
        margin-top: 14pt; 
        margin-bottom: 6pt;
        text-transform: uppercase;
        font-weight: bold;
        border-bottom: 1px solid #333;
        padding-bottom: 3pt;
      }
      h3 {
        font-size: 10pt;
        margin-top: 10pt;
        margin-bottom: 4pt;
        font-weight: bold;
      }
      .section { margin-bottom: 10pt; }
      .field { font-weight: bold; text-decoration: underline; }
      .checkbox { 
        display: inline-block; 
        width: 10px; 
        height: 10px; 
        border: 1px solid #000; 
        margin-right: 4px; 
        vertical-align: middle;
        text-align: center;
        line-height: 8px;
        font-size: 8px;
      }
      .checkbox.checked::after { content: '✓'; }
      .list { margin-left: 16pt; margin-top: 4pt; margin-bottom: 4pt; }
      .list li { margin-bottom: 2pt; }
      .signature-section { 
        margin-top: 24pt; 
        page-break-inside: avoid; 
      }
      .signature-block { 
        display: inline-block; 
        min-width: 220px; 
        border-bottom: 2px solid #000; 
        min-height: 38px;
        vertical-align: bottom;
        margin-bottom: 4pt;
        position: relative;
      }
      .sig-row { 
        margin-top: 20pt; 
        display: flex; 
        align-items: flex-end;
        gap: 16px;
        flex-wrap: wrap;
      }
      .sig-label { font-weight: bold; margin-right: 6px; }
      .date-line { 
        border-bottom: 1px solid #000; 
        width: 120px; 
        display: inline-block; 
        padding-left: 4px;
      }
      .initials-line {
        display: inline-block;
        min-width: 60px;
        border-bottom: 2px solid #000;
        min-height: 24px;
        vertical-align: bottom;
        margin-left: 6px;
        position: relative;
        text-align: center;
      }
      .initials-row {
        margin-top: 6pt;
        font-size: 9pt;
        color: #333;
      }
      .page-break { page-break-before: always; }
      .legal-notice {
        background: #f5f5f5;
        border: 1px solid #ccc;
        padding: 8pt;
        margin: 8pt 0;
        font-size: 9pt;
      }
      table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
      td, th { border: 1px solid #000; padding: 4pt; text-align: left; font-size: 9pt; }
      th { background: #f0f0f0; font-weight: bold; }
      .legal-term { font-weight: bold; }
      p { margin: 4pt 0; }
    </style>
  </head>
  <body>
    <h1>Residential Lease Agreement</h1>

    <div class="section">
      <p>THIS RESIDENTIAL LEASE AGREEMENT (hereinafter "Agreement" or "Lease") is made and entered into as of 
      <span class="field">${todayDate}</span> (the "Effective Date"), by and between the following parties, 
      who agree to be legally bound hereby:</p>
    </div>
    
    <div class="section">
      <p><strong>RECITALS</strong></p>
      <p>WHEREAS, Landlord is the owner or authorized agent of the real property described herein; and</p>
      <p>WHEREAS, Tenant desires to lease the Premises from Landlord for residential purposes only; and</p>
      <p>WHEREAS, the parties desire to set forth their respective rights and obligations;</p>
      <p>NOW, THEREFORE, in consideration of the mutual covenants herein contained, and for other good and valuable 
      consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:</p>
    </div>

    <!-- ARTICLE 1: PARTIES & PREMISES -->
    <h2>Article 1. Parties, Premises, and Definitions</h2>
    <div class="section">
      <h3>1.1 Landlord</h3>
      <p><span class="legal-term">"Landlord"</span> refers to the following party, including their heirs, successors, assigns, and authorized agents:</p>
      <p>Legal Name: <span class="field">${landlordName}</span></p>
      ${landlordAddress ? `<p>Address: <span class="field">${landlordAddress}</span></p>` : ''}
      ${landlordEmail ? `<p>Email: <span class="field">${landlordEmail}</span></p>` : ''}
      ${landlordPhone ? `<p>Phone: <span class="field">${landlordPhone}</span></p>` : ''}
      
      <h3>1.2 Tenant</h3>
      <p><span class="legal-term">"Tenant"</span> refers to the following individual(s), jointly and severally:</p>
      <p>Name: <span class="field">${tenantName}</span></p>
      ${tenantEmail ? `<p>Email: <span class="field">${tenantEmail}</span></p>` : ''}
      <p><em>All persons listed as Tenant are jointly and severally liable for all obligations under this Lease. 
      This means each Tenant is individually responsible for the full performance of all Lease terms, including 
      the full amount of rent due.</em></p>
      
      <h3>1.3 Premises</h3>
      <p><span class="legal-term">"Premises"</span> refers to the following real property leased to Tenant for residential use only:</p>
      <p>Property: <span class="field">${propertyLabel}</span></p>
      
      <h3>1.4 Authorized Occupants</h3>
      <p>The Premises shall be occupied <strong>solely and exclusively</strong> by the Tenant(s) named above and their 
      minor children. No other persons may reside at the Premises for more than fourteen (14) consecutive days or 
      more than thirty (30) days in any twelve-month period without Landlord's prior written consent. Unauthorized 
      occupants constitute a material breach of this Lease.</p>
      
      <h3>1.5 Definitions</h3>
      <p>For purposes of this Agreement:</p>
      <ul class="list">
        <li><span class="legal-term">"Rent"</span> means the monthly rental amount plus any additional charges due under this Lease.</li>
        <li><span class="legal-term">"Security Deposit"</span> means the deposit held by Landlord as security for Tenant's performance.</li>
        <li><span class="legal-term">"Normal Wear and Tear"</span> means deterioration from ordinary use without negligence or abuse.</li>
        <li><span class="legal-term">"Material Breach"</span> means a violation that substantially impairs Landlord's rights or the value of the Premises.</li>
      </ul>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init1/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l1/</span>
      </div>
    </div>

    <!-- ARTICLE 2: LEASE TERM -->
    <h2>Article 2. Term of Lease</h2>
    <div class="section">
      <h3>2.1 Lease Term</h3>
      <p><strong>Commencement Date:</strong> <span class="field">${leaseStartDate}</span></p>
      <p><strong>Expiration Date:</strong> <span class="field">${leaseEndDate}</span></p>
      
      <h3>2.2 Renewal</h3>
      <p>Upon expiration of the initial term, this Lease shall automatically convert to a month-to-month tenancy 
      upon the same terms and conditions, unless either party provides written notice of intent to terminate at 
      least <span class="field">${moveOutNoticeDays}</span> days prior to the expiration date or any subsequent monthly period.</p>
      
      <h3>2.3 Early Termination</h3>
      <p>Tenant has no right to terminate this Lease prior to the expiration date without Landlord's written consent. 
      Tenant shall remain liable for the full rent due through the end of the Lease term, or until the Premises is 
      re-rented, whichever occurs first. Landlord shall make reasonable efforts to mitigate damages by re-renting 
      the Premises.</p>
      
      <h3>2.4 Holdover Tenancy</h3>
      <p>If Tenant remains in possession after expiration or termination without Landlord's express written consent, 
      Tenant shall be deemed a <strong>holdover tenant</strong> and shall:</p>
      <ul class="list">
        <li>Pay holdover rent at <strong>one hundred fifty percent (150%)</strong> of the monthly rent, prorated daily;</li>
        <li>Be subject to immediate eviction proceedings without further notice;</li>
        <li>Be liable for all damages, costs, and attorney's fees incurred by Landlord.</li>
      </ul>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init2/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l2/</span>
      </div>
    </div>

    <!-- ARTICLE 3: RENT & PAYMENT -->
    <h2>Article 3. Rent and Payment Terms</h2>
    <div class="section">
      <h3>3.1 Base Rent</h3>
      <table>
        <tr>
          <th>Monthly Base Rent</th>
          <td><span class="field">${rentAmount}</span> per month</td>
        </tr>
        <tr>
          <th>Due Date</th>
          <td>The <span class="field">${billingDayOfMonth}</span> day of each calendar month</td>
        </tr>
        <tr>
          <th>Grace Period</th>
          <td><span class="field">${gracePeriodDays}</span> calendar days</td>
        </tr>
        <tr>
          <th>Accepted Payment Methods</th>
          <td>Online Payment Portal, Check, Money Order, Certified Funds</td>
        </tr>
      </table>
      
      <h3>3.2 Payment Instructions</h3>
      <p>All payments shall be made payable to <span class="field">${landlordName}</span>. Rent is deemed paid when 
      actually received by Landlord, not when mailed or initiated.</p>
      
      <h3>3.3 Returned Payments</h3>
      <p>A fee of <strong>$35.00</strong> shall be assessed for any payment that is returned, dishonored, or reversed 
      for any reason. After two (2) returned payments during any twelve-month period, Landlord may require all future 
      payments to be made by certified funds.</p>
      
      <h3>3.4 Application of Payments</h3>
      <p>All payments received shall be applied in the following order: (1) Court costs and attorney's fees; 
      (2) Late fees and returned payment fees; (3) Other charges and damages; (4) Past due rent (oldest first); 
      (5) Current rent.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init3/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l3/</span>
      </div>
    </div>

    <!-- ARTICLE 4: LATE FEES -->
    <h2>Article 4. Late Fees and Default</h2>
    <div class="section">
      <h3>4.1 Late Fee Assessment</h3>
      <p>If rent is not received in full by the end of the grace period, a late fee of <span class="field">${lateFee}</span> 
      shall be assessed on the <span class="field">${lateFeeStartDay}</span> day after the rent due date. Late fees are 
      considered additional rent.</p>
      
      <h3>4.2 Landlord's Remedies for Nonpayment</h3>
      <p>Upon Tenant's failure to pay rent when due, Landlord shall have the following remedies:</p>
      <ul class="list">
        <li><strong>Eviction:</strong> Terminate this Lease and pursue eviction proceedings;</li>
        <li><strong>Acceleration:</strong> Declare all remaining rent immediately due and payable;</li>
        <li><strong>Collection:</strong> Pursue collection through any lawful means;</li>
        <li><strong>Credit Reporting:</strong> Report delinquent amounts to credit bureaus;</li>
        <li><strong>Attorney's Fees:</strong> Recover reasonable attorney's fees and court costs;</li>
        <li><strong>Interest:</strong> Past due amounts shall accrue interest at 1.5% per month or the maximum rate permitted by law.</li>
      </ul>
      
      <h3>4.3 No Waiver of Rights</h3>
      <p>Landlord's acceptance of rent after a default shall not constitute a waiver of Landlord's rights. Landlord 
      may accept rent "with reservation of rights" and still pursue eviction or other remedies.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init4/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l4/</span>
      </div>
    </div>

    <!-- ARTICLE 5: SECURITY DEPOSIT -->
    <h2>Article 5. Security Deposit</h2>
    <div class="section">
      <h3>5.1 Deposit Amount</h3>
      <p><strong>Security Deposit:</strong> <span class="field">${securityDeposit}</span></p>
      <p>The security deposit shall be held by Landlord as security for Tenant's faithful performance. The deposit 
      is not an advance payment of rent and shall not be applied to rent by Tenant.</p>
      
      <h3>5.2 Permitted Deductions</h3>
      <p>Landlord may deduct from the security deposit amounts reasonably necessary to remedy:</p>
      <ul class="list">
        <li>Unpaid rent or late fees;</li>
        <li>Repair of damages beyond normal wear and tear;</li>
        <li>Cleaning costs to restore premises to move-in condition;</li>
        <li>Replacement of unreturned keys or access devices;</li>
        <li>Any other amounts owed under this Lease.</li>
      </ul>
      
      <h3>5.3 Return of Deposit</h3>
      <p>Within <strong>30 days</strong> after Tenant has vacated and returned all keys, Landlord shall return the 
      deposit minus lawful deductions, along with an itemized statement of any deductions.</p>
      
      <div class="legal-notice">
        <strong>IMPORTANT:</strong> The security deposit is <strong>NOT</strong> to be used as last month's rent. 
        Tenant must pay the final month's rent in full. Any attempt to apply the security deposit to rent without 
        Landlord's written consent constitutes a material breach of this Lease.
      </div>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init5/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l5/</span>
      </div>
    </div>

    <!-- ARTICLE 6: UTILITIES -->
    <h2>Article 6. Utilities and Services</h2>
    <div class="section">
      <table>
        <tr>
          <th>Tenant Responsible</th>
          <th>Landlord Responsible</th>
        </tr>
        <tr>
          <td>Electric, Gas, Internet, Cable</td>
          <td>Water, Sewer, Trash</td>
        </tr>
      </table>
      
      <p>Tenant shall establish utility accounts in Tenant's name prior to taking possession and maintain continuous 
      service throughout the tenancy. Failure to maintain required utilities may constitute a default.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init6/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l6/</span>
      </div>
    </div>

    <!-- ARTICLE 7: USE OF PREMISES -->
    <h2>Article 7. Use of Premises</h2>
    <div class="section">
      <h3>7.1 Permitted Use</h3>
      <p>The Premises shall be used <strong>solely and exclusively as a private residential dwelling</strong>. 
      No business, commercial, or professional activity is permitted without Landlord's prior written consent.</p>
      
      <h3>7.2 Prohibited Uses</h3>
      <p>Tenant shall NOT use or permit the Premises to be used for:</p>
      <ul class="list">
        <li>Any illegal purpose or activity;</li>
        <li>Any activity that increases insurance premiums or voids coverage;</li>
        <li>Any activity that constitutes a nuisance;</li>
        <li>Short-term rentals (Airbnb, VRBO, etc.);</li>
        <li>Storage of hazardous, flammable, or explosive materials;</li>
        <li>Any activity violating zoning laws, HOA rules, or regulations.</li>
      </ul>
      
      <h3>7.3 Guests</h3>
      <p>No guest may stay at the Premises for more than <strong>fourteen (14) consecutive days</strong> or more than 
      <strong>thirty (30) days in any twelve-month period</strong> without Landlord's prior written consent. Guests 
      staying beyond these limits shall be considered unauthorized occupants.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init7/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l7/</span>
      </div>
    </div>

    <!-- ARTICLE 8: PROHIBITED ACTIVITIES -->
    <h2>Article 8. Prohibited Activities</h2>
    <div class="section">
      <h3>8.1 Criminal Activity</h3>
      <p>The following are <strong>strictly prohibited</strong> and constitute grounds for immediate termination:</p>
      <ul class="list">
        <li>Possession, use, manufacture, sale, or distribution of illegal drugs;</li>
        <li>Any felony or crime of violence on or near the Premises;</li>
        <li>Any criminal activity threatening health, safety, or peaceful enjoyment of others;</li>
        <li>Gang-related activity;</li>
        <li>Any activity permitting forfeiture of the Premises under law.</li>
      </ul>
      
      <h3>8.2 Safety Violations</h3>
      <p>Tenant shall NOT: store firearms in violation of law; store flammable liquids; tamper with smoke/CO detectors; 
      block exits; use open flames (except cooking); overload electrical circuits.</p>
      
      <h3>8.3 Smoking Policy</h3>
      ${smokingAllowed 
        ? `<p><span class="checkbox checked"></span> Smoking permitted in designated outdoor areas only. Smoking inside the unit is prohibited.</p>`
        : `<p><span class="checkbox"></span> Smoking and vaping are <strong>strictly prohibited</strong> anywhere on the Premises, including inside the unit, on balconies, patios, and common areas.</p>`
      }
      <p>Violation of the smoking policy shall result in a cleaning fee of not less than $500 and potential termination.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init8/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l8/</span>
      </div>
    </div>

    <!-- ARTICLE 9: MAINTENANCE -->
    <h2>Article 9. Maintenance and Repairs</h2>
    <div class="section">
      <h3>9.1 Tenant's Obligations</h3>
      <p>Tenant shall maintain the Premises in a clean, sanitary, and safe condition and shall:</p>
      <ul class="list">
        <li>Keep premises clean and dispose of garbage properly;</li>
        <li>Replace light bulbs and batteries;</li>
        <li>Report maintenance issues promptly;</li>
        <li>Prevent mold growth through proper ventilation;</li>
        <li>Not make holes in walls without consent;</li>
        <li>Keep drains free of obstructions.</li>
      </ul>
      
      <h3>9.2 Landlord's Obligations</h3>
      <p>Landlord shall maintain the Premises in compliance with building codes and shall maintain structural components, 
      plumbing, electrical, heating, and air conditioning systems in good working order.</p>
      
      <h3>9.3 Tenant-Caused Damage</h3>
      <p>Tenant shall be responsible for the cost of repairing any damage caused by Tenant, Tenant's family, guests, 
      or negligence, beyond normal wear and tear. Landlord may make such repairs and charge Tenant, due as additional 
      rent within ten (10) days.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init9/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l9/</span>
      </div>
    </div>

    <!-- ARTICLE 10: ALTERATIONS -->
    <h2>Article 10. Alterations and Improvements</h2>
    <div class="section">
      <p>Tenant shall NOT make any alterations, additions, or improvements without Landlord's prior written consent, 
      including: painting; installing shelving or wall-mounted items; changing locks; installing satellite dishes; 
      making structural changes; installing or removing appliances.</p>
      
      <p>Any approved alterations become Landlord's property upon installation. Landlord may require Tenant to restore 
      the Premises to original condition at move-out.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init10/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l10/</span>
      </div>
    </div>

    <!-- ARTICLE 11: ENTRY -->
    <h2>Article 11. Landlord's Right of Entry</h2>
    <div class="section">
      <h3>11.1 Notice Required</h3>
      <p>Landlord may enter the Premises upon providing at least <span class="field">${entryNoticeDays}</span> hours' 
      advance written notice, except in emergencies.</p>
      
      <h3>11.2 Permitted Purposes</h3>
      <p>Landlord may enter for: repairs and maintenance; inspections; showing to prospective tenants or buyers; 
      emergency situations; compliance with legal requirements.</p>
      
      <h3>11.3 Emergency Entry</h3>
      <p>Landlord may enter <strong>without notice</strong> in emergencies including: fire, flood, gas leak, structural 
      emergency, or when reasonably necessary to prevent imminent damage or protect health and safety.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init11/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l11/</span>
      </div>
    </div>

    <!-- ARTICLE 12: PETS -->
    <h2>Article 12. Pet Policy</h2>
    <div class="section">
      ${petPolicy === 'allowed' ? `
      <p><span class="checkbox checked"></span> Pets ARE permitted, subject to the following:</p>
      <p><strong>Pet Deposit:</strong> <span class="field">${petDeposit}</span> (refundable)</p>
      <p>Tenant is fully responsible for all damage caused by pets. Pets must be licensed, vaccinated, kept under 
      control, and shall not create a nuisance. Landlord may require removal of any pet that causes damage or disturbance.</p>
      ` : `
      <p><span class="checkbox"></span> Pets are <strong>NOT permitted</strong> at the Premises.</p>
      <p>This includes dogs, cats, birds, reptiles, rodents, and fish tanks over 10 gallons. Service animals and 
      emotional support animals with proper documentation are exempt.</p>
      <p><strong>Unauthorized pets:</strong> Tenant shall immediately remove the pet, pay a $500 violation fee, 
      and be liable for all damage. Landlord may terminate this Lease.</p>
      `}
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init12/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l12/</span>
      </div>
    </div>

    <!-- ARTICLE 13: QUIET ENJOYMENT -->
    <h2>Article 13. Quiet Enjoyment and Conduct</h2>
    <div class="section">
      <p>Landlord covenants that Tenant, upon paying rent and performing all obligations, shall peacefully enjoy 
      the Premises without interference from Landlord.</p>
      
      <p>Tenant shall conduct themselves in a manner that does not disturb neighbors. At all times, Tenant shall:</p>
      <ul class="list">
        <li>Comply with all local noise ordinances;</li>
        <li>Not engage in loud parties or activities that disturb neighbors;</li>
        <li>Keep music and audio at reasonable volumes;</li>
        <li>Ensure guests comply with all conduct requirements;</li>
        <li>Not engage in harassment or threatening behavior.</li>
      </ul>
      <p>Repeated noise complaints may result in lease termination.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init13/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l13/</span>
      </div>
    </div>

    <!-- ARTICLE 14: SAFETY -->
    <h2>Article 14. Safety and Health</h2>
    <div class="section">
      <p>Tenant acknowledges the Premises is equipped with smoke and CO detectors. Tenant shall: test detectors monthly; 
      replace batteries as needed; never disable or tamper with safety devices; immediately notify Landlord of malfunctions.</p>
      
      <p>Tenant shall: keep exits clear; not use or store flammable liquids; not use unapproved space heaters; 
      not overload electrical outlets; maintain proper ventilation to prevent mold; properly store food to prevent pests.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init14/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l14/</span>
      </div>
    </div>

    <!-- ARTICLE 15: INSURANCE -->
    <h2>Article 15. Insurance and Liability</h2>
    <div class="section">
      <p><strong>Renter's Insurance Strongly Recommended:</strong> Landlord strongly recommends Tenant obtain renter's 
      insurance to protect personal belongings and provide liability coverage.</p>
      
      <div class="legal-notice">
        <strong>IMPORTANT:</strong> Landlord's insurance does <strong>NOT</strong> cover: Tenant's personal property; 
        Tenant's liability for injuries to guests; loss or damage due to theft, fire, water damage, or any other cause; 
        additional living expenses if the Premises becomes uninhabitable. <strong>Tenant assumes all risk of loss for 
        personal property.</strong>
      </div>
      
      <h3>15.1 Indemnification</h3>
      <p>Tenant agrees to indemnify, defend, and hold harmless Landlord from any claims, damages, or expenses arising 
      from: Tenant's use of the Premises; any activity by Tenant or guests; any breach by Tenant; any negligent or 
      wrongful act by Tenant or guests; any injury occurring on the Premises during Tenant's occupancy. This 
      indemnification survives termination of this Lease.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init15/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l15/</span>
      </div>
    </div>

    <!-- ARTICLE 16: SUBLETTING -->
    <h2>Article 16. Assignment and Subletting</h2>
    <div class="section">
      <p>Tenant shall <strong>NOT</strong> assign this Lease or sublet the Premises without Landlord's prior written 
      consent. This includes: renting rooms to non-approved occupants; listing on short-term rental platforms; 
      allowing anyone not named on this Lease to reside at the Premises; transferring this Lease to another party.</p>
      
      <p>Unauthorized subletting is grounds for immediate termination. If Landlord consents to any subletting, the 
      original Tenant remains fully liable for all obligations.</p>
      
      <p><strong>Short-Term Rentals Strictly Prohibited:</strong> Listing the Premises on any short-term rental platform 
      is strictly prohibited and shall result in: immediate termination; forfeiture of security deposit; liability for 
      all income received; liability for all damages and legal fees.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init16/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l16/</span>
      </div>
    </div>

    <!-- ARTICLE 17: DEFAULT -->
    <h2>Article 17. Default and Remedies</h2>
    <div class="section">
      <h3>17.1 Events of Default</h3>
      <p>The following constitute events of default: failure to pay rent when due; violation of any Lease term; 
      abandonment; false statements in rental application; unauthorized occupants, pets, or subletting; illegal 
      activity; damage beyond normal wear and tear; disturbance of neighbors.</p>
      
      <h3>17.2 Notice and Cure</h3>
      <p>For nonpayment, Landlord shall provide notice as required by ${state} law. For curable violations, Landlord 
      shall provide written notice with reasonable time to cure. Certain violations (illegal activity, violence, 
      repeated violations) may result in termination without opportunity to cure.</p>
      
      <h3>17.3 Abandonment</h3>
      <p>The Premises shall be deemed abandoned if: Tenant is absent for more than 15 consecutive days without notice 
      and rent is unpaid; OR Tenant has removed substantially all personal property and rent is unpaid. Upon abandonment, 
      Landlord may re-enter and re-let the Premises.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init17/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l17/</span>
      </div>
    </div>

    <!-- ARTICLE 18: MOVE-OUT -->
    <h2>Article 18. Move-Out Procedures</h2>
    <div class="section">
      <h3>18.1 Notice Required</h3>
      <p>Tenant must provide written notice at least <span class="field">${moveOutNoticeDays}</span> days prior to 
      the intended move-out date.</p>
      
      <h3>18.2 Move-Out Condition</h3>
      <p>Upon vacating, Tenant shall: leave the Premises clean and in good condition; remove all personal property; 
      return all keys and access devices; provide forwarding address for security deposit return.</p>
      
      <h3>18.3 Abandoned Property</h3>
      <p>Any personal property remaining after Tenant has vacated shall be deemed abandoned and may be disposed of 
      by Landlord at Tenant's expense, in accordance with ${state} law.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init18/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l18/</span>
      </div>
    </div>

    <!-- ARTICLE 19: GENERAL PROVISIONS -->
    <h2>Article 19. General Provisions</h2>
    <div class="section">
      <h3>19.1 Governing Law</h3>
      <p>This Agreement shall be governed by the laws of the State of <span class="field">${state}</span>.</p>
      
      <h3>19.2 Severability</h3>
      <p>If any provision is found invalid, the remaining provisions shall continue in full force and effect.</p>
      
      <h3>19.3 Entire Agreement</h3>
      <p>This Lease constitutes the entire agreement between the parties. No oral agreements shall be binding.</p>
      
      <h3>19.4 Amendments</h3>
      <p>This Lease may only be amended by a written instrument signed by both parties.</p>
      
      <h3>19.5 Notices</h3>
      <p>All notices shall be in writing and delivered by: personal delivery; certified mail; or email to the 
      addresses provided in this Lease.</p>
      
      <h3>19.6 Joint and Several Liability</h3>
      <p>If there is more than one Tenant, all Tenants are jointly and severally liable for all obligations. 
      Each Tenant is individually responsible for the full amount of rent and all other obligations.</p>
      
      <h3>19.7 Attorney's Fees</h3>
      <p>In any action arising from this Lease, the prevailing party shall be entitled to recover reasonable 
      attorney's fees and costs, to the extent permitted by ${state} law.</p>
      
      <h3>19.8 Waiver of Jury Trial</h3>
      <p>TO THE EXTENT PERMITTED BY LAW, LANDLORD AND TENANT HEREBY WAIVE THEIR RESPECTIVE RIGHTS TO A JURY TRIAL 
      OF ANY CLAIM ARISING OUT OF THIS LEASE.</p>
      
      <h3>19.9 Electronic Signatures</h3>
      <p>Electronic signatures shall be deemed valid and binding to the same extent as original signatures.</p>
      
      <div class="initials-row">
        <strong>Tenant Initials:</strong> <span class="initials-line">/init19/</span>
        <strong style="margin-left: 16pt;">Landlord Initials:</strong> <span class="initials-line">/init_l19/</span>
      </div>
    </div>

    <!-- DISCLOSURES -->
    <div class="page-break"></div>
    <h2>Required Disclosures</h2>
    <div class="section">
      <div class="legal-notice">
        <strong>LEAD-BASED PAINT DISCLOSURE (Pre-1978 Housing)</strong><br/>
        Housing built before 1978 may contain lead-based paint. Lead exposure is especially harmful to young children 
        and pregnant women. Landlord has provided Tenant with the EPA pamphlet "Protect Your Family From Lead in Your Home."
        <br/><br/>
        <span class="checkbox"></span> Landlord has no knowledge of lead-based paint hazards.<br/>
        <span class="checkbox"></span> Landlord has knowledge of the following hazards: _______________
      </div>
      
      <div class="legal-notice" style="margin-top: 10pt;">
        <strong>MOLD DISCLOSURE</strong><br/>
        Landlord has no knowledge of mold at the Premises. Tenant agrees to maintain proper ventilation, report any 
        water leaks or moisture problems immediately, and take reasonable steps to prevent mold growth.
      </div>
      
      <div class="legal-notice" style="margin-top: 10pt;">
        <strong>TENANT RIGHTS NOTICE</strong><br/>
        As a tenant in ${state}, you have certain rights protected by law, including: the right to a habitable dwelling; 
        the right to privacy and proper notice before landlord entry; the right to have your security deposit returned 
        within the time required by law; the right to be free from discrimination; the right to proper notice before 
        eviction proceedings.
      </div>
    </div>

    <!-- SIGNATURE PAGE -->
    <div class="page-break"></div>
    <h2>Signatures</h2>
    <div class="signature-section">
      <p>By signing below, the parties acknowledge that they have read, understand, and agree to all terms and 
      conditions of this Residential Lease Agreement.</p>
      
      <div class="sig-row">
        <div>
          <p><strong>LANDLORD:</strong></p>
          <p>${landlordName}</p>
          <span class="sig-label">Signature:</span>
          <span class="signature-block">/sig_landlord/</span>
        </div>
        <div>
          <span class="sig-label">Date:</span>
          <span class="date-line">${todayDate}</span>
        </div>
      </div>
      
      <div class="sig-row">
        <div>
          <p><strong>TENANT:</strong></p>
          <p>${tenantName}</p>
          <span class="sig-label">Signature:</span>
          <span class="signature-block">/sig_tenant/</span>
        </div>
        <div>
          <span class="sig-label">Date:</span>
          <span class="date-line">${todayDate}</span>
        </div>
      </div>
    </div>

    <!-- LEGAL DISCLAIMER -->
    <div class="page-break"></div>
    <h2>Legal Notice</h2>
    <div class="section">
      <div class="legal-notice" style="font-size: 8pt;">
        <strong>IMPORTANT LEGAL NOTICE</strong><br/><br/>
        This lease agreement was generated using PropertyFlow HQ. By using this document, all parties acknowledge:<br/><br/>
        <strong>1. NOT LEGAL ADVICE:</strong> PropertyFlow HQ is a property management software platform, NOT a law firm. 
        This document does not constitute legal advice.<br/><br/>
        <strong>2. LANDLORD RESPONSIBILITY:</strong> The landlord is solely responsible for ensuring this lease complies 
        with all applicable federal, state, and local laws.<br/><br/>
        <strong>3. REVIEW RECOMMENDED:</strong> We strongly recommend having this lease reviewed by a licensed attorney 
        in your jurisdiction before use.<br/><br/>
        <strong>4. NO WARRANTY:</strong> This document is provided "as is" without warranty of any kind.
      </div>
    </div>

    <!-- FOOTER -->
    <div style="margin-top: 30pt; text-align: center; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 10pt;">
      <p><strong>PropertyFlow HQ - Residential Lease Agreement</strong></p>
      <p>Generated: ${todayDate} | State: ${state}</p>
    </div>

  </body>
</html>`;
};
