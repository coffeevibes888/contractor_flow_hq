/**
 * Contractor Contract Builder Service
 * Generates court-ready service agreements with trade-specific legal sections.
 * Supports 12+ contractor trades with state-aware provisions.
 */

import { generateStateDisclosuresHtml, getStateRequirements } from './contractor-state-requirements';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TradeType =
  | 'general' | 'hvac' | 'plumbing' | 'roofing' | 'electrical'
  | 'painting' | 'landscaping' | 'flooring' | 'solar'
  | 'concrete' | 'excavation' | 'remodeling';

export interface ContractorContractData {
  // Parties
  contractorLegalName: string;
  contractorBusinessName?: string;
  contractorAddress: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorLicenseNumber?: string;
  contractorInsurancePolicy?: string;

  customerName: string;
  customerAddress: string;
  customerEmail: string;
  customerPhone: string;

  // Trade & Job
  tradeType: TradeType;
  jobSiteAddress: string;
  jobTitle: string;
  jobDescription: string;
  deliverables: string[];

  // Timeline
  startDate?: string;
  completionDate?: string;
  estimatedHours?: number;
  milestoneSchedule?: { name: string; amount: number; description: string }[];

  // Financial
  totalAmount: number;
  depositAmount?: number;
  retainagePercent?: number;
  paymentTerms: 'upfront' | 'milestone' | 'net_15' | 'net_30' | 'due_on_completion';
  lateFeePercent: number;

  // Scope details
  materialsProvidedBy: 'contractor' | 'customer' | 'mixed';
  permitsProvidedBy: 'contractor' | 'customer';
  wasteRemovalIncluded: boolean;

  // Warranty
  warrantyPeriodDays: number;
  warrantyDescription?: string;

  // Insurance & License
  generalLiability?: string;
  workersCompIncluded: boolean;

  // Termination
  terminationNoticeDays: number;
  curePeriodDays: number;

  // Dispute
  disputeResolution: 'arbitration' | 'litigation';
  governingState: string;

  // Legal
  subcontractorsAllowed: boolean;
  additionalTerms?: string;

  // Signing
  signingDate: Date;
}

// ── Trade Definitions ──────────────────────────────────────────────────────────

export interface TradeDefinition {
  label: string;
  icon: string;
  description: string;
  scopeExamples: string[];
  defaultWarrantyDays: number;
  warrantyLanguage: string;
  tradeSpecificSections: (data: ContractorContractData) => string;
  complianceNotes: string[];
}

export const TRADE_DEFINITIONS: Record<TradeType, TradeDefinition> = {
  general: {
    label: 'General Contractor',
    icon: '🔧',
    description: 'General construction, repair, and maintenance services',
    scopeExamples: [
      'General repairs and maintenance',
      'Home renovations',
      'Handyman services',
      'Construction projects',
      'Remodeling and restoration',
    ],
    defaultWarrantyDays: 90,
    warrantyLanguage: `Contractor warrants that all work shall be performed in a good and workmanlike manner, in accordance with industry standards, and free from defects in workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers defects in workmanship only and does not cover damage caused by abuse, neglect, accidents, acts of God, or unauthorized modifications. Contractor shall, at its option, repair or redo any defective work at no additional cost to Customer.`,
    tradeSpecificSections: () => '',
    complianceNotes: [
      'Ensure compliance with local building codes',
      'Pull required permits before work begins',
      'Follow OSHA safety standards',
    ],
  },

  hvac: {
    label: 'HVAC',
    icon: '❄️',
    description: 'Heating, ventilation, air conditioning, and refrigeration',
    scopeExamples: [
      'AC installation and repair',
      'Furnace installation and maintenance',
      'Ductwork installation and sealing',
      'System replacement and upgrades',
      'Indoor air quality solutions',
      'Refrigerant handling and charging',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all HVAC equipment installed shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. Equipment manufacturer warranties shall pass through to Customer. This warranty covers: (a) defects in installation workmanship; (b) improper refrigerant charging; (c) ductwork sealing integrity; (d) electrical connections and controls. This warranty does not cover: (a) damage from failure to maintain equipment per manufacturer recommendations; (b) damage from power surges, flooding, or acts of God; (c) refrigerant loss due to external damage; (d) filters and consumable parts. Contractor shall provide emergency service within 24 hours for system failures during extreme weather conditions.`,
    tradeSpecificSections: (data) => `
ADDITIONAL HVAC PROVISIONS

1. EQUIPMENT SPECIFICATIONS
All equipment installed shall be new, of current manufacture, and rated for the application. Contractor shall provide Manufacturer's Equipment Data Sheets for all major equipment prior to installation. Equipment efficiency ratings shall meet or exceed minimum SEER/HSPF/AFUE ratings required by federal and ${data.governingState} state regulations.

2. REFRIGERANT MANAGEMENT
Contractor shall handle all refrigerants in compliance with EPA Section 608 regulations. Customer shall be advised of refrigerant type and charge amount. Refrigerant recovery, recycling, and reclamation shall comply with 40 CFR Part 82.

3. PERMITS AND INSPECTIONS
Contractor shall obtain all required mechanical permits and schedule final inspections. Final payment shall not be due until inspections are passed and certificate of completion is provided.

4. MAINTENANCE REQUIREMENTS
Customer acknowledges that HVAC systems require regular maintenance (filter changes, coil cleaning, annual tune-ups) to maintain warranty validity. Failure to perform recommended maintenance may void this warranty. Contractor shall provide a written maintenance schedule at project completion.

5. DUCTWORK
All ductwork shall be sealed with mastic or approved sealant (not duct tape). Ductwork shall be insulated to minimum R-8 in unconditioned spaces. Contractor shall perform duct leakage testing upon request.`,
    complianceNotes: [
      'EPA Section 608 certification required for refrigerant handling',
      'Local mechanical permits required for system installation',
      'Must comply with ASHRAE standards',
      'Energy efficiency ratings must meet federal minimums',
      'Refrigerant phase-down regulations may apply',
    ],
  },

  plumbing: {
    label: 'Plumbing',
    icon: '🚿',
    description: 'Pipe, fixture, and water/drain/sewer system services',
    scopeExamples: [
      'Pipe repair and replacement',
      'Fixture installation (sinks, toilets, faucets)',
      'Water heater installation',
      'Sewer line repair and replacement',
      'Drain cleaning and clearing',
      'Gas line installation and repair',
      'Backflow prevention',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all plumbing work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) leaks in soldered, threaded, or glued joints; (b) proper drainage and flow; (c) fixture operation and seals; (d) water pressure within normal range. This warranty does not cover: (a) clogs caused by foreign objects or roots; (b) damage from freezing; (c) damage from chemical drain cleaners; (d) normal wear on valves and seals; (e) damage caused by excessive water pressure from the municipal supply.`,
    tradeSpecificSections: (data) => `
ADDITIONAL PLUMBING PROVISIONS

1. CODE COMPLIANCE
All plumbing work shall comply with the International Plumbing Code (IPC) or Uniform Plumbing Code (UPC) as adopted by ${data.governingState}, and all local amendments thereto. Contractor shall pull all required plumbing permits and schedule inspections.

2. MATERIALS
All pipe, fittings, and fixtures shall be approved for the intended use and comply with ANSI/NSF standards for potable water systems. Pipe materials shall be appropriate for the application (PEX, copper, CPVC, PVC as specified). No lead-containing materials shall be used in potable water systems.

3. WATER HEATER INSTALLATION
Water heater installation shall comply with local codes including: expansion tank (if required), TPR valve discharge piping, seismic strapping (if in seismic zone), proper venting, and combustion air requirements. Customer shall be advised of the Location of the water heater shut-off valve.

4. GAS LINE WORK
All gas line work shall be performed by a licensed gas fitter. Gas lines shall be pressure tested at 1.5x working pressure. Contractor shall bubble-test all connections and provide documentation of pressure test to Customer.

5. BACKFLOW PREVENTION
Where required by code or water authority, Contractor shall install approved backflow prevention devices. Annual testing may be required by the local water authority.

6. DRAINAGE
All drainage shall maintain proper slope (minimum 1/4" per foot for pipes 3" and smaller, 1/8" per foot for larger). Cleanouts shall be installed at code-required locations. Contractor shall perform final drain test and provide documentation.`,
    complianceNotes: [
      'Plumbing permit required for all new installations',
      'Must comply with IPC or UPC as adopted locally',
      'Licensed plumber required for all work',
      'Backflow prevention may be required',
      'Gas work requires separate gas fitting license',
    ],
  },

  roofing: {
    label: 'Roofing',
    icon: '🏠',
    description: 'Roof installation, repair, replacement, and inspection',
    scopeExamples: [
      'Roof replacement',
      'Shingle/tile/metal roof installation',
      'Leak repair and waterproofing',
      'Flat roof/TPO/EPDM installation',
      'Gutter and flashing installation',
      'Roof inspection and maintenance',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all roofing work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) leaks due to improper installation; (b) flashing integrity; (c) proper drainage and ponding prevention; (d) fastener and adhesion failure. Manufacturer's material warranty shall pass through to Customer. This warranty does not cover: (a) damage from acts of God (hail, tornado, hurricane); (b) damage from foot traffic or falling objects; (c) damage from subsequent construction or modification; (d) normal weathering and aging; (e) damage caused by failure to maintain gutters and drains.`,
    tradeSpecificSections: (data) => `
ADDITIONAL ROOFING PROVISIONS

1. SCOPE AND LAYERS
Contractor shall remove all existing roofing layers down to the deck unless otherwise specified in writing. Condition of roof deck shall be documented with photographs before and after tear-off. Any damaged decking shall be replaced at the unit price agreed upon.

2. MATERIALS
All roofing materials shall be manufacturer-approved and installed per manufacturer specifications to maintain material warranty. Material specifications (manufacturer, product line, color, warranty tier) shall be documented on the contract.

3. WEATHER CONDITIONS
Contractor shall not install roofing materials when temperature is below manufacturer's minimum (typically 40°F for shingles) or when rain is expected within 24 hours. Delays due to weather shall extend the completion date accordingly.

4. FLASHING AND SEALANT
All flashing (step, counter, valley, drip edge, pipe boots) shall be installed per manufacturer specifications and local code. Sealant shall be appropriate for the roofing system and UV-resistant.

5. VENTILATION
Contractor shall verify and document adequate attic ventilation (intake and exhaust) per code requirements. If ventilation is inadequate, Contractor shall advise Customer in writing and recommend corrections.

6. PERMITS AND INSPECTION
Contractor shall obtain all required roofing permits. Final inspection shall be scheduled and passed before final payment is due. Contractor shall provide copy of permit and inspection approval to Customer.

7. WASTE REMOVAL
${data.wasteRemovalIncluded ? 'Contractor shall remove all roofing debris from the job site and leave the property in clean condition. Dumpster shall be provided on-site.' : 'Customer is responsible for disposal of roofing debris.'}

8. WORKER SAFETY
All work shall be performed in compliance with OSHA fall protection standards. Contractor shall maintain proper safety equipment including harnesses, guardrails, and toe boards for work at heights.`,
    complianceNotes: [
      'Roofing permit required in most jurisdictions',
      'Must comply with local wind uplift requirements',
      'Manufacturer installation specs must be followed for warranty',
      'Fall protection required for work above 6 feet',
      'Insurance certificate should list customer as additional insured',
    ],
  },

  electrical: {
    label: 'Electrical',
    icon: '⚡',
    description: 'Wiring, panels, fixtures, and electrical system services',
    scopeExamples: [
      'Panel upgrade or replacement',
      'Wiring installation and repair',
      'Outlet and switch installation',
      'Lighting installation',
      'EV charger installation',
      'Generator installation',
      'Electrical inspection and troubleshooting',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all electrical work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) proper wiring connections and terminations; (b) circuit breaker/panel operation; (c) grounding and bonding integrity; (d) fixture and device operation. This warranty does not cover: (a) damage from power surges or lightning; (b) damage from overloading circuits beyond rated capacity; (c) damage from unauthorized modifications; (d) normal wear on switches and dimmers.`,
    tradeSpecificSections: (data) => `
ADDITIONAL ELECTRICAL PROVISIONS

1. CODE COMPLIANCE
All electrical work shall comply with the National Electrical Code (NEC/NFPA 70) as adopted by ${data.governingState}, and all local amendments. Contractor shall pull all required electrical permits and schedule final inspections.

2. PANEL AND SERVICE
Panel upgrades shall include: (a) updated load calculation; (b) proper labeling of all circuits; (c) AFCI protection where required by code; (d) GFCI protection in required locations; (e) proper grounding electrode system. Service upgrades shall coordinate with the utility company as needed.

3. WIRING METHODS
All wiring shall be properly sized for the circuit load per NEC Table 310.16. Wire types shall be appropriate for the installation (NM-B for dry locations, UF-B for wet, THWN/THHN for conduit). All connections shall be made in approved junction boxes with appropriate wire connectors.

4. GFCI AND AFCI PROTECTION
Contractor shall install GFCI protection in all required locations (kitchens, bathrooms, garages, outdoors, basements, laundry areas) and AFCI protection in all living spaces as required by the applicable code edition.

5. EV CHARGING (if applicable)
EV charger installations shall include: dedicated circuit per manufacturer requirements, proper wire sizing for continuous load (125% of rated amperage), NEMA-rated receptacle or hardwired connection, and coordination with utility for any demand response programs.

6. GROUNDING
All grounding shall comply with NEC Article 250. Contractor shall verify and test grounding electrode system and provide test results to Customer.`,
    complianceNotes: [
      'Electrical permit required for all new circuits and panel work',
      'Licensed electrician required by law in most states',
      'Must comply with current NEC code edition',
      'Inspection required before energizing new circuits',
      'Utility coordination needed for service upgrades',
    ],
  },

  painting: {
    label: 'Painting',
    icon: '🎨',
    description: 'Interior and exterior painting, staining, and coating',
    scopeExamples: [
      'Interior wall and ceiling painting',
      'Exterior house painting',
      'Cabinet refinishing',
      'Staining and sealing',
      'Drywall repair and prep',
      'Pressure washing',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all painting work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) peeling, bubbling, or blistering due to improper preparation; (b) uneven coverage or missed areas; (c) brush marks, runs, or sags attributable to application; (d) premature fading under normal conditions. This warranty does not cover: (a) damage from moisture intrusion, structural movement, or settling; (b) normal wear and scuffing; (c) damage from cleaning with abrasive materials; (d) colors that have been painted over by Customer.`,
    tradeSpecificSections: (data) => `
ADDITIONAL PAINTING PROVISIONS

1. SURFACE PREPARATION
Contractor shall properly prepare all surfaces before painting, including: cleaning, scraping, sanding, filling holes and cracks, caulking gaps, priming bare surfaces, and masking adjacent areas. Preparation methods shall be appropriate for the surface type and condition.

2. PAINT SPECIFICATIONS
Paint products shall be as specified in this contract (manufacturer, product line, sheen, color). If specified products are unavailable, Contractor shall propose equivalent alternatives for Customer approval before proceeding. All paints shall be low-VOC or zero-VOC as required by ${data.governingState} regulations.

3. COATS AND COVERAGE
Unless otherwise specified, all surfaces shall receive: (a) one coat of primer on bare surfaces; (b) two coats of finish paint. Coverage shall meet manufacturer's stated coverage rates.

4. PROTECTION OF PROPERTY
Contractor shall protect all furniture, flooring, fixtures, and landscaping during the painting process. All coverings shall be removed at the end of each work day unless otherwise agreed.

5. WEATHER (EXTERIOR)
Exterior painting shall not be performed when: (a) temperature is below 50°F or above 95°F; (b) rain is expected within 24 hours; (c) surface is wet or frost-covered; (d) humidity exceeds 85%. Delays due to weather extend the completion date.

6. COLOR CONSULTATION
If Customer requests color consultation, Contractor shall provide up to 2 hours of color consultation at no additional charge. Color samples shall be applied to the actual surfaces for Customer approval before full application.`,
    complianceNotes: [
      'Lead paint regulations apply for pre-1978 buildings',
      'Low-VOC requirements in many states',
      'Proper disposal of paint materials required',
      'Scaffolding permits may be needed for exterior work',
    ],
  },

  landscaping: {
    label: 'Landscaping',
    icon: '🌿',
    description: 'Lawn, garden, hardscape, and outdoor living services',
    scopeExamples: [
      'Landscape design and installation',
      'Lawn installation (sod, seed, hydroseed)',
      'Hardscape (patios, walkways, retaining walls)',
      'Irrigation system installation',
      'Tree and shrub planting',
      'Outdoor lighting',
      'Drainage solutions',
    ],
    defaultWarrantyDays: 90,
    warrantyLanguage: `Contractor warrants that all landscaping work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) plant survival under normal conditions (replacement of dead plants within warranty period); (b) hardscape structural integrity; (c) irrigation system operation; (d) proper grading and drainage. This warranty does not cover: (a) plant loss due to drought, extreme weather, vandalism, or animal damage; (b) damage from failure to follow watering and care instructions; (c) normal seasonal changes in plant appearance; (d) damage from modifications by Customer or third parties.`,
    tradeSpecificSections: (data) => `
ADDITIONAL LANDSCAPING PROVISIONS

1. PLANT MATERIAL
All plants shall be healthy, true to type, and of the size specified at the time of planting. Plant material shall be sourced from reputable nurseries. Substitution of equivalent plants may be made with Customer approval if specified plants are unavailable.

2. PLANT CARE INSTRUCTIONS
Contractor shall provide written care instructions for all installed plant material, including watering schedule, fertilization requirements, and pruning guidelines. Customer acknowledges responsibility for following care instructions to maintain warranty.

3. IRRIGATION
Irrigation systems shall be designed and installed per local codes and water authority requirements. System shall include: (a) proper backflow prevention; (b) rain sensor (if required by code); (c) appropriate zone design for plant water needs; (d) drainage to prevent standing water.

4. HARDSCAPE
Hardscape installations shall include: (a) proper base preparation (compacted gravel/sand); (b) appropriate drainage slope (minimum 1/4" per foot away from structures); (c) edge restraints for pavers; (d) frost-depth footings for retaining walls (where applicable).

5. UNDERGROUND UTILITIES
Contractor shall call 811 (utility locate service) before any excavation. Customer shall inform Contractor of any known underground utilities, sprinkler systems, or invisible fences not marked by utility locate service.

6. TREE WORK
Tree work (if applicable) shall comply with ANSI Z133 Safety Standards. Large tree removal may require a separate arborist certificate.`,
    complianceNotes: [
      'Irrigation permits may be required',
      'Backflow prevention required for irrigation connections',
      '811 call required before any digging',
      'Tree removal permits may apply in some jurisdictions',
    ],
  },

  flooring: {
    label: 'Flooring',
    icon: '🪵',
    description: 'Hardwood, tile, laminate, vinyl, and carpet installation',
    scopeExamples: [
      'Hardwood floor installation and refinishing',
      'Tile installation (floor and wall)',
      'Laminate and luxury vinyl plank (LVP)',
      'Carpet installation',
      'Subfloor repair and preparation',
      'Custom tile work and mosaics',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all flooring work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) proper adhesion and fastening; (b) level, uniform installation without lippage or gaps; (c) proper expansion joints and transitions; (d) grout integrity (tile). This warranty does not cover: (a) damage from moisture, flooding, or standing water; (b) damage from improper cleaning products; (c) normal wear patterns; (d) damage from heavy furniture or dropped objects; (e) acclimation-related movement in hardwood if Customer did not maintain normal HVAC conditions.`,
    tradeSpecificSections: (data) => `
ADDITIONAL FLOORING PROVISIONS

1. SUBFLOOR PREPARATION
Contractor shall inspect and prepare the subfloor before installation, including: (a) checking for levelness (maximum 3/16" in 10 feet); (b) repairing damaged or squeaking areas; (c) cleaning and removing debris; (d) moisture testing per manufacturer requirements. Subfloor corrections shall be included in the contract price unless otherwise specified.

2. MATERIAL ACCLIMATION
For hardwood and some vinyl products, materials shall acclimate in the room where they will be installed for the manufacturer's recommended period (typically 3-7 days). Customer shall maintain normal room temperature (65-75°F) and humidity (35-55% RH) during acclimation and after installation.

3. MOISTURE TESTING
Contractor shall perform moisture testing of the subfloor and/or concrete slab before installation. Results shall be documented and within manufacturer's acceptable range. If moisture levels are excessive, Contractor shall advise Customer of remediation options before proceeding.

4. TILE INSTALLATION
Tile shall be installed per ANSI A108 standards. Minimum coverage shall be 80% for dry areas, 95% for wet areas (shower floors). Grout joints shall be consistent width and properly tooled. Waterproofing membrane shall be installed in wet areas per code.

5. HARDWOOD REFINISHING
For refinishing projects: (a) sanding shall progress through appropriate grits; (b) stain shall be applied evenly with Customer's approval of color sample before full application; (c) minimum three coats of finish shall be applied; (d) adequate dry time shall be observed between coats.

6. TRANSITIONS AND TRIM
Contractor shall install appropriate transition strips (T-molding, reducers, thresholds) at all doorways and changes in flooring type. Base molding or quarter-round shall be installed at all wall perimeters.`,
    complianceNotes: [
      'Asbestos testing may be required for pre-1980s flooring',
      'Moisture testing critical for concrete slabs',
      'Tile work in wet areas requires waterproofing membrane',
      'Hardwood may require acclimation period',
    ],
  },

  solar: {
    label: 'Solar',
    icon: '☀️',
    description: 'Solar panel installation, maintenance, and energy systems',
    scopeExamples: [
      'Residential solar panel installation',
      'Commercial solar installation',
      'Battery storage systems',
      'Solar panel maintenance and cleaning',
      'Solar water heating',
      'EV charging integration',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all solar installation work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) proper panel mounting and racking; (b) electrical connections and wiring; (c) inverter operation; (d) monitoring system functionality. Equipment manufacturer warranties (typically 25 years for panels, 10-12 years for inverters) shall pass through to Customer. This warranty does not cover: (a) damage from acts of God beyond design specifications; (b) damage from unauthorized modifications; (c) reduced output due to shading, debris, or normal degradation; (d) grid outage or utility-related issues.`,
    tradeSpecificSections: (data) => `
ADDITIONAL SOLAR PROVISIONS

1. SYSTEM DESIGN
System design shall be documented on single-line diagrams and roof plans. Panel layout, inverter sizing, and wiring routes shall be approved by Customer before installation. System shall be designed to meet or exceed Customer's energy goals as documented in the proposal.

2. PERMITS AND INTERCONNECTION
Contractor shall obtain all required building and electrical permits, and shall handle the interconnection application with the local utility. Contractor shall coordinate with utility for meter upgrade (if needed) and permission to operate (PTO).

3. ROOF IMPACT
Contractor shall ensure that solar installation does not void the existing roof warranty. Penetrations shall be flashed per roofing manufacturer's specifications. Contractor shall provide documentation of roof penetration warranty to Customer.

4. ELECTRICAL
All electrical work shall comply with NEC Article 690 (Solar Photovoltaic Systems) and Article 705 (Interconnected Electric Power Production Sources). Rapid shutdown requirements shall be met per NEC 690.12.

5. MONITORING
Contractor shall install and configure system monitoring (if included in scope). Customer shall be provided with access credentials and trained on monitoring system operation.

6. REBATES AND INCENTIVES
Contractor shall assist Customer with available federal, state, and local solar incentives and rebates. Any incentives that Contractor receives on behalf of Customer shall be applied to reduce the contract price.

7. MAINTENANCE
Contractor shall provide recommended maintenance schedule including panel cleaning and system inspection. Annual maintenance contracts may be available at additional cost.`,
    complianceNotes: [
      'Building and electrical permits required',
      'Utility interconnection agreement required',
      'Must comply with NEC Article 690',
      'Net metering rules vary by utility',
      'Federal tax credit (ITC) may apply',
    ],
  },

  concrete: {
    label: 'Concrete',
    icon: '🧱',
    description: 'Concrete pouring, foundations, driveways, and flatwork',
    scopeExamples: [
      'Driveway installation and replacement',
      'Patio and walkway concrete',
      'Foundation and footer work',
      'Concrete repair and resurfacing',
      'Stamped and decorative concrete',
      'Retaining walls',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all concrete work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) structural cracking due to improper mix or placement; (b) proper compaction and finishing; (c) adequate reinforcement; (d) proper joint placement. This warranty does not cover: (a) shrinkage cracking (normal in concrete); (b) cracking from settlement of uncompacted fill; (c) damage from overloading beyond design capacity; (d) damage from freeze-thaw if proper curing/sealing was not maintained by Customer.`,
    tradeSpecificSections: (data) => `
ADDITIONAL CONCRETE PROVISIONS

1. MIX DESIGN
Concrete mix design (PSI strength, aggregate size, air entrainment, fiber reinforcement) shall be specified in the contract and comply with ACI 301 standards. Minimum compressive strength shall be 3000 PSI for residential flatwork, 3500 PSI for driveways, and 4000 PSI for structural work unless otherwise specified.

2. SUBGRADE PREPARATION
Contractor shall prepare the subgrade by: (a) compacting fill to 95% Proctor density; (b) removing organic material and debris; (c) proof-rolling to identify soft spots; (d) installing vapor barrier (if specified). Subgrade corrections beyond the scope of this contract shall be addressed via change order.

3. FORMWORK
Forms shall be set to proper grade and alignment, adequately braced, and oiled for removal. Forms shall remain in place until concrete reaches sufficient strength for removal (typically 24-48 hours for flatwork).

4. REINFORCEMENT
Reinforcement (rebar, wire mesh, or fiber) shall be placed per the project specifications. Rebar shall be supported on chairs at the correct elevation. Wire mesh shall be lapped a minimum of one bar width at edges.

5. PLACING AND FINISHING
Concrete shall be placed within 30 minutes of mixing. Vibrating shall be performed for thick sections. Finishing shall progress through appropriate steps (screeding, floating, troweling). Broom finish or other texture shall be applied per specification.

6. JOINTING
Control joints shall be placed at maximum intervals of 2-3 feet times the slab thickness (in inches). Joint locations shall be planned and marked before pouring. Expansion joints shall be placed where concrete meets existing structures.

7. CURING
Concrete shall be cured for a minimum of 7 days using curing compound, wet curing, or plastic sheeting. Customer shall be advised not to drive on or place heavy loads on new concrete for a minimum of 7 days (28 days for full strength).

8. FREEZE-THAW
In climates with freeze-thaw cycles, concrete shall be air-entrained per ACI 318. Sealing may be recommended after curing.`,
    complianceNotes: [
      'Building permit required for structural concrete',
      'Must meet ACI (American Concrete Institute) standards',
      'Soil testing may be required for foundations',
      'Rebar placement must be inspected before pour',
    ],
  },

  excavation: {
    label: 'Excavation',
    icon: '🚜',
    description: 'Digging, grading, land clearing, and earthwork',
    scopeExamples: [
      'Foundation excavation',
      'Land grading and leveling',
      'Trenching for utilities',
      'Land clearing and brush removal',
      'Drainage grading',
      'Pool excavation',
    ],
    defaultWarrantyDays: 90,
    warrantyLanguage: `Contractor warrants that all excavation and grading work shall be performed in accordance with industry standards and project specifications for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) grades matching project specifications; (b) proper compaction of backfill; (c) proper drainage flow. This warranty does not cover: (a) settlement of fill material (normal); (b) erosion caused by weather events; (c) damage from underground conditions not disclosed by Customer; (d) damage caused by third parties after completion.`,
    tradeSpecificSections: (data) => `
ADDITIONAL EXCAVATION PROVISIONS

1. UTILITY LOCATE
Contractor shall call 811 (national utility locate service) at least 72 hours before excavation begins. All marked utilities shall be hand-dug around. Contractor is not responsible for unmarked utilities.

2. SOIL CONDITIONS
This contract assumes normal soil conditions. If unexpected rock, contaminated soil, high water table, or other adverse conditions are encountered, Contractor shall notify Customer immediately. Additional work required due to unforeseen conditions shall be addressed via change order.

3. SPOILS AND FILL
Unless otherwise specified, excavated material (spoils) shall remain on-site and may be used for backfill or grading. Excess material removal or import of fill material shall be quoted separately.

4. EROSION CONTROL
Contractor shall implement erosion control measures as required by local regulations and best management practices (BMPs). Silt fencing, inlet protection, and stabilized construction entrances shall be installed as needed.

5. DRAINAGE
Final grades shall slope away from structures at minimum 6 inches of fall in the first 10 feet (or per local code). French drains, swales, or other drainage features shall be installed per project specifications.

6. SAFETY
Excavation deeper than 5 feet shall comply with OSHA trenching and excavation standards (29 CFR 1926 Subpart P). Shoring, sloping, or shielding shall be used as required. Adequate means of entry/exit shall be provided.`,
    complianceNotes: [
      'Excavation permit required in most jurisdictions',
      '811 call required before any digging',
      'OSHA compliance required for deep excavations',
      'Erosion control may be required by local regulations',
    ],
  },

  remodeling: {
    label: 'Remodeling',
    icon: '🏗️',
    description: 'Kitchen, bath, addition, and whole-home remodeling',
    scopeExamples: [
      'Kitchen remodel',
      'Bathroom remodel',
      'Room additions',
      'Basement finishing',
      'Whole-home renovation',
      'ADA accessibility modifications',
    ],
    defaultWarrantyDays: 365,
    warrantyLanguage: `Contractor warrants that all remodeling work shall be free from defects in materials and workmanship for a period of {warrantyDays} days from the date of completion. This warranty covers: (a) structural integrity of additions and modifications; (b) proper installation of all finish materials; (c) plumbing, electrical, and mechanical work (per respective trade warranties); (d) code compliance at time of completion. This warranty does not cover: (a) normal wear and tear; (b) damage from failure to maintain; (c) damage from water intrusion due to exterior envelope failure; (d) settling of new construction (normal in first year).`,
    tradeSpecificSections: (data) => `
ADDITIONAL REMODELING PROVISIONS

1. PERMITS AND INSPECTIONS
Contractor shall obtain all required building, electrical, plumbing, and mechanical permits. Multiple inspections may be required at various stages (framing, rough-in, insulation, drywall, final). Final payment shall not be due until all inspections pass and Certificate of Occupancy (if required) is issued.

2. STRUCTURAL CHANGES
Any structural modifications (load-bearing walls, headers, beams, foundation work) shall be designed by a licensed structural engineer. Engineered drawings shall be submitted with permit applications and made available to Customer.

3. SCOPE CHANGES
Changes to the agreed scope of work must be documented in writing as a Change Order signed by both parties before work proceeds. Change Orders shall include: description of change, price adjustment, and timeline impact.

4. DISRUPTION AND ACCESS
Contractor shall minimize disruption to Customer's daily life. Work areas shall be contained with dust barriers. Contractor shall protect existing finishes and furnishings in adjacent areas. Customer shall provide reasonable access during work hours.

5. HIDDEN CONDITIONS
If concealed conditions (mold, asbestos, lead paint, termite damage, structural deficiencies, outdated wiring, plumbing) are discovered during work, Contractor shall immediately notify Customer. Remediation of hidden conditions shall be addressed via Change Order.

6. MATERIAL SELECTIONS
Customer shall select all finish materials (cabinets, countertops, tile, fixtures, flooring) within the time frame specified in the project schedule. Delays in material selection may delay the project completion date.

7. CLEANUP
Contractor shall perform daily cleanup of work areas. Final cleanup shall include removal of all debris, dust cleaning, and vacuuming. Home shall be left in broom-clean condition.`,
    complianceNotes: [
      'Building permit required for structural work',
      'Multiple trade permits may be required',
      'Inspections required at multiple stages',
      'ADA modifications may have specific code requirements',
    ],
  },
};

// ── HTML Generator ─────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatMoney(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function generateContractorContractHtml(data: ContractorContractData): string {
  const trade = TRADE_DEFINITIONS[data.tradeType] || TRADE_DEFINITIONS.general;
  const today = formatDate(data.signingDate);

  const deliverablesHtml = data.deliverables.length > 0
    ? data.deliverables.map((d, i) => `<li>${escHtml(d)}</li>`).join('\n')
    : '<li>To be determined based on final scope assessment.</li>';

  const milestonesHtml = data.milestoneSchedule && data.milestoneSchedule.length > 0
    ? `<table style="width:100%; border-collapse:collapse; margin:12px 0;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="border:1px solid #d1d5db; padding:8px 12px; text-align:left;">Milestone</th>
            <th style="border:1px solid #d1d5db; padding:8px 12px; text-align:left;">Description</th>
            <th style="border:1px solid #d1d5db; padding:8px 12px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.milestoneSchedule.map(m => `
            <tr>
              <td style="border:1px solid #d1d5db; padding:8px 12px;">${escHtml(m.name)}</td>
              <td style="border:1px solid #d1d5db; padding:8px 12px;">${escHtml(m.description)}</td>
              <td style="border:1px solid #d1d5db; padding:8px 12px; text-align:right;">${formatMoney(m.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '';

  const paymentTermsText = {
    upfront: 'Full payment is due before work begins.',
    milestone: 'Payment is due at the completion of each milestone as outlined in Section 3.',
    net_15: 'Payment is due within fifteen (15) days of invoice date.',
    net_30: 'Payment is due within thirty (30) days of invoice date.',
    due_on_completion: 'Payment is due upon substantial completion of all work.',
  }[data.paymentTerms];

  const materialsText = {
    contractor: 'Contractor shall provide all materials and supplies necessary for the work.',
    customer: 'Customer shall provide all materials and supplies. Contractor shall install Customer-provided materials.',
    mixed: 'Contractor shall provide labor and standard materials. Specialty or custom materials shall be provided by Customer as agreed in writing.',
  }[data.materialsProvidedBy];

  const permitsText = data.permitsProvidedBy === 'contractor'
    ? 'Contractor shall obtain all necessary permits and licenses required for the work. Permit costs are included in the contract price unless otherwise specified.'
    : 'Customer shall obtain all necessary permits and licenses required for the work. Contractor shall cooperate with permit inspections.';

  const warrantyHtml = trade.warrantyLanguage.replace(/{warrantyDays}/g, String(data.warrantyPeriodDays));

  const tradeSpecificHtml = trade.tradeSpecificSections(data);

  const disputeSection = data.disputeResolution === 'arbitration'
    ? `18. DISPUTE RESOLUTION

(a) Negotiation. The parties shall first attempt to resolve any dispute arising under this Agreement through good-faith negotiation. Either party may initiate negotiation by providing written notice to the other party describing the dispute.

(b) Mediation. If negotiation fails within thirty (30) days, the parties agree to submit the dispute to non-binding mediation before a mutually agreed-upon mediator. The cost of mediation shall be shared equally.

(c) Binding Arbitration. If mediation fails within sixty (60) days, any remaining dispute shall be submitted to final and binding arbitration under the rules of the American Arbitration Association (AAA). The arbitration shall be conducted in ${escHtml(data.governingState)} by a single arbitrator. The arbitrator's decision shall be final and binding, and judgment upon the award may be entered in any court of competent jurisdiction.

(d) Attorney's Fees. The prevailing party in any arbitration or litigation shall be entitled to recover reasonable attorney's fees and costs from the non-prevailing party.`
    : `18. DISPUTE RESOLUTION

(a) Negotiation. The parties shall first attempt to resolve any dispute arising under this Agreement through good-faith negotiation. Either party may initiate negotiation by providing written notice to the other party describing the dispute.

(b) Mediation. If negotiation fails within thirty (30) days, the parties agree to submit the dispute to non-binding mediation before a mutually agreed-upon mediator. The cost of mediation shall be shared equally.

(c) Litigation. If mediation fails, either party may pursue litigation in the courts of competent jurisdiction in ${escHtml(data.governingState)}. The parties consent to personal jurisdiction in such courts.

(d) Attorney's Fees. The prevailing party in any litigation shall be entitled to recover reasonable attorney's fees and costs from the non-prevailing party.`;

  const additionalTermsHtml = data.additionalTerms
    ? `\n\n${escHtml(data.additionalTerms)}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Agreement - ${escHtml(data.jobTitle)}</title>
  <style>
    @page { margin: 0.75in 0.85in; size: letter; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10.5pt;
      line-height: 1.65;
      color: #1e293b;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0;
      background: white;
    }

    /* ── Header / Cover Band ── */
    .contract-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      color: white;
      padding: 36px 40px;
      border-radius: 0 0 12px 12px;
      margin: -0.75in -0.85in 32px -0.85in;
      width: calc(100% + 1.7in);
    }
    .contract-header h1 {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 6px 0;
      text-transform: none;
    }
    .contract-header .subtitle {
      font-size: 11pt;
      color: #94a3b8;
      font-weight: 500;
    }
    .contract-header .meta-row {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      font-size: 9.5pt;
      color: #cbd5e1;
    }
    .contract-header .meta-row span { display: flex; align-items: center; gap: 5px; }
    .trade-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    /* ── Section Headings ── */
    h2 {
      font-size: 11.5pt;
      font-weight: 700;
      color: #0f172a;
      margin: 28px 0 10px 0;
      padding: 8px 0 6px 0;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    h2 .section-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: #0f172a;
      color: white;
      border-radius: 50%;
      font-size: 9pt;
      font-weight: 700;
      margin-right: 8px;
      vertical-align: middle;
    }

    /* ── Parties Block ── */
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .party-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 18px 20px;
    }
    .party-card .party-label {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .party-card .party-name {
      font-size: 12pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .party-card .party-detail {
      font-size: 9.5pt;
      color: #475569;
      line-height: 1.5;
    }

    /* ── Content ── */
    p { margin: 8px 0; }
    strong { color: #0f172a; }
    ul { margin: 8px 0; padding-left: 22px; }
    li { margin: 4px 0; }

    /* ── Key Terms Highlight ── */
    .key-terms {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      padding: 18px 22px;
      margin: 16px 0;
    }
    .key-terms .term-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #e0f2fe;
      font-size: 10pt;
    }
    .key-terms .term-row:last-child { border-bottom: none; }
    .key-terms .term-label { color: #475569; font-weight: 500; }
    .key-terms .term-value { color: #0f172a; font-weight: 700; }

    /* ── Milestone Table ── */
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 9.5pt; }
    thead tr { background: #f1f5f9; }
    th { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-weight: 700; color: #334155; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3px; }
    td { border: 1px solid #e2e8f0; padding: 10px 14px; color: #475569; }

    /* ── Signature Block ── */
    .signature-section {
      margin-top: 48px;
      page-break-inside: avoid;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      margin-top: 20px;
    }
    .sig-block .sig-line {
      border-bottom: 2px solid #0f172a;
      height: 48px;
      margin-bottom: 4px;
      position: relative;
    }
    .sig-block .sig-line .placeholder {
      position: absolute;
      bottom: 8px;
      left: 0;
      color: #2563eb;
      font-weight: 700;
      font-size: 9pt;
    }
    .sig-block .sig-label {
      font-size: 8.5pt;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sig-block .sig-spacer { height: 24px; }

    /* ── State Disclosures ── */
    .state-disclosures { margin-top: 32px; page-break-before: always; }
    .state-disclosures .section-heading { font-size: 12pt; margin-bottom: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .state-disclosures .section-intro { font-size: 10pt; color: #64748b; margin-bottom: 16px; }
    .disclosure-box { border-radius: 8px; padding: 16px 20px; margin: 14px 0; font-size: 10pt; line-height: 1.6; }
    .disclosure-box.cancel-box { background: #fef2f2; border: 1px solid #fca5a5; }
    .disclosure-box.license-box { background: #fefce8; border: 1px solid #fde047; }
    .disclosure-box.lien-box { background: #eff6ff; border: 1px solid #93c5fd; }
    .disclosure-box.deposit-box { background: #fefce8; border: 1px solid #fbbf24; }
    .disclosure-box.additional-box { background: #f8fafc; border: 1px solid #e2e8f0; }
    .disclosure-box.statute-box { background: #f0fdf4; border: 1px solid #86efac; }
    .disclosure-title { font-weight: 800; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #1e293b; }
    .disclosure-meta { font-size: 9pt; color: #64748b; margin-top: 6px; font-style: italic; }
    .disclosure-box ul { margin: 8px 0; padding-left: 20px; }
    .disclosure-box li { margin: 4px 0; }

    /* ── Footer ── */
    .contract-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
    }
    .contract-footer .brand {
      font-weight: 700;
      color: #64748b;
    }

    /* ── Print adjustments ── */
    @media print {
      .contract-header { margin: -0.75in -0.85in 32px -0.85in; }
      body { padding: 0; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="contract-header">
    <div class="trade-badge">${escHtml(trade.icon)} ${escHtml(trade.label)}</div>
    <h1>Service Agreement</h1>
    <div class="subtitle">${escHtml(data.jobTitle)}</div>
    <div class="meta-row">
      <span>📅 ${today}</span>
      <span>📍 ${escHtml(data.governingState)}</span>
      <span>📄 Contract #_______________</span>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties-grid">
    <div class="party-card">
      <div class="party-label">Contractor</div>
      <div class="party-name">${escHtml(data.contractorBusinessName || data.contractorLegalName)}</div>
      <div class="party-detail">
        ${escHtml(data.contractorAddress)}<br>
        ${escHtml(data.contractorEmail)} · ${escHtml(data.contractorPhone)}
        ${data.contractorLicenseNumber ? `<br>License #${escHtml(data.contractorLicenseNumber)}` : ''}
        ${data.contractorInsurancePolicy ? `<br>Insurance: ${escHtml(data.contractorInsurancePolicy)}` : ''}
      </div>
    </div>
    <div class="party-card">
      <div class="party-label">Customer</div>
      <div class="party-name">${escHtml(data.customerName)}</div>
      <div class="party-detail">
        ${escHtml(data.customerAddress)}<br>
        ${escHtml(data.customerEmail)} · ${escHtml(data.customerPhone)}
      </div>
    </div>
  </div>

  <!-- Key Terms Summary -->
  <div class="key-terms">
    <div class="term-row"><span class="term-label">Total Contract Price</span><span class="term-value">${formatMoney(data.totalAmount)}</span></div>
    ${data.depositAmount ? `<div class="term-row"><span class="term-label">Deposit Due</span><span class="term-value">${formatMoney(data.depositAmount)}</span></div>` : ''}
    <div class="term-row"><span class="term-label">Payment Terms</span><span class="term-value">${escHtml(data.paymentTerms.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</span></div>
    ${data.startDate ? `<div class="term-row"><span class="term-label">Start Date</span><span class="term-value">${escHtml(data.startDate)}</span></div>` : ''}
    ${data.completionDate ? `<div class="term-row"><span class="term-label">Completion Date</span><span class="term-value">${escHtml(data.completionDate)}</span></div>` : ''}
    <div class="term-row"><span class="term-label">Warranty</span><span class="term-value">${data.warrantyPeriodDays} days</span></div>
    <div class="term-row"><span class="term-label">Governing State</span><span class="term-value">${escHtml(data.governingState)}</span></div>
  </div>

  <!-- Recitals -->
  <p><strong>RECITALS</strong></p>
  <p>WHEREAS, Contractor is engaged in the business of providing ${escHtml(trade.label.toLowerCase())} services and holds all required licenses and insurance; and</p>
  <p>WHEREAS, Customer desires to engage Contractor to perform certain ${escHtml(trade.label.toLowerCase())} services at the job site described below; and</p>
  <p>WHEREAS, the parties wish to set forth the terms and conditions governing such services;</p>
  <p>NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:</p>

  <h2>1. SCOPE OF WORK</h2>
  <p><strong>Project:</strong> ${escHtml(data.jobTitle)}</p>
  <p><strong>Job Site:</strong> ${escHtml(data.jobSiteAddress)}</p>
  <p>Contractor shall perform the following ${escHtml(trade.label.toLowerCase())} services ("the Work"):</p>
  <p>${escHtml(data.jobDescription)}</p>
  <p><strong>Deliverables:</strong></p>
  <ul>${deliverablesHtml}</ul>
  <p><strong>Exclusions:</strong> Unless expressly stated above, the Work does not include: (a) structural engineering; (b) work outside the job site; (c) utility connections not listed; (d) materials or items not specified; (e) permits and fees not listed.</p>

  <h2>2. TIMELINE</h2>
  ${data.startDate ? `<p><strong>Estimated Start Date:</strong> ${escHtml(data.startDate)}</p>` : '<p>Start date to be scheduled upon execution of this Agreement.</p>'}
  ${data.completionDate ? `<p><strong>Estimated Completion Date:</strong> ${escHtml(data.completionDate)}</p>` : '<p>Estimated completion to be determined based on scope and scheduling.</p>'}
  ${data.estimatedHours ? `<p><strong>Estimated Hours:</strong> ${data.estimatedHours}</p>` : ''}
  <p>Time is of the essence with respect to the performance of this Agreement. Contractor shall use commercially reasonable efforts to complete the Work within the estimated timeline. The timeline is an estimate, not a guarantee, and may be extended due to: (a) changes in scope; (b) weather delays; (c) permit delays; (d) force majeure events; (e) delays caused by Customer.</p>

  <h2>3. CONTRACT PRICE AND PAYMENT</h2>
  <p><strong>Total Contract Price:</strong> ${formatMoney(data.totalAmount)}</p>
  ${data.depositAmount ? `<p><strong>Deposit:</strong> ${formatMoney(data.depositAmount)} (due upon execution of this Agreement)</p>` : ''}
  ${data.retainagePercent ? `<p><strong>Retainage:</strong> ${data.retainagePercent}% (held until final completion and inspection)</p>` : ''}
  ${milestonesHtml}
  <p><strong>Payment Terms:</strong> ${paymentTermsText}</p>
  <p><strong>Late Payment:</strong> Any amount not paid when due shall bear interest at the rate of ${data.lateFeePercent}% per month (or the maximum rate permitted by law, whichever is less). Customer shall also be liable for all costs of collection, including reasonable attorney's fees.</p>
  <p><strong>Suspension for Non-Payment:</strong> Contractor may suspend work if any payment is more than fifteen (15) days overdue. Customer shall be liable for demurrage and storage costs during any suspension period.</p>
  <p><strong>Lien Rights:</strong> Contractor reserves the right to file a mechanics lien against the property in accordance with applicable law if payment is not received within the time required by statute. A lien release shall be provided upon receipt of full payment.</p>

  <h2>4. CHANGE ORDERS</h2>
  <p>No changes to the scope of work, contract price, or timeline shall be effective unless documented in a written Change Order signed by both parties. Change Orders shall include: (a) description of the change; (b) adjustment to contract price; (c) adjustment to timeline; (d) any additional terms. Contractor shall not be obligated to perform changed work until a signed Change Order is in effect. Verbal agreements are not binding.</p>

  <h2>5. MATERIALS AND SUPPLIES</h2>
  <p>${materialsText}</p>
  <p>All materials shall be new and of good quality, suitable for their intended purpose, and compliant with applicable codes and standards. Contractor shall provide material specifications and samples upon request. Specialty or custom materials may require extended lead times which shall be communicated promptly to Customer.</p>
  ${data.materialsProvidedBy === 'contractor' || data.materialsProvidedBy === 'mixed' ? `<p><strong>Leftover Materials:</strong> Upon completion, Contractor shall remove surplus materials from the job site unless Customer requests otherwise in writing.</p>` : ''}

  <h2>6. PERMITS AND CODE COMPLIANCE</h2>
  <p>${permitsText}</p>
  <p>All work shall be performed in compliance with applicable federal, state, and local codes, regulations, and industry standards. Contractor shall schedule and attend all required inspections. If work fails inspection, Contractor shall correct deficiencies at no additional cost to Customer.</p>

  <h2>7. INSURANCE AND BONDING</h2>
  <p>Contractor shall maintain the following insurance coverage throughout the duration of the Work:</p>
  <ul>
    <li>Commercial General Liability: minimum ${data.generalLiability || '$1,000,000 per occurrence / $2,000,000 aggregate'}</li>
    ${data.workersCompIncluded ? '<li>Workers\' Compensation: as required by applicable law</li>' : '<li>Workers\' Compensation: <em>Customer acknowledges that Contractor carries Workers\' Compensation insurance as required by law.</em></li>'}
    <li>Automobile Liability: minimum $1,000,000 combined single limit (if applicable)</li>
  </ul>
  <p>Upon request, Contractor shall provide certificates of insurance naming Customer as an additional insured. Contractor\'s insurance shall be primary and non-contributory with respect to any insurance maintained by Customer.</p>

  <h2>8. LICENSES AND QUALIFICATIONS</h2>
  <p>Contractor represents and warrants that it holds all licenses, certifications, and qualifications required by applicable law to perform the Work. Contractor shall provide license numbers upon request. Contractor shall maintain all required licenses in good standing throughout the project.</p>

  <h2>9. INDEPENDENT CONTRACTOR STATUS</h2>
  <p>Contractor is an independent contractor and not an employee, agent, partner, or joint venturer of Customer. Contractor shall control the manner, method, and means of performing the Work. Customer shall not direct Contractor's employees or subcontractors. Contractor shall be solely responsible for: (a) all taxes, including self-employment taxes; (b) employment benefits for its employees; (c) compliance with all labor laws; (d) providing its own tools and equipment.</p>

  <h2>10. SUBCONTRACTORS</h2>
  <p>${data.subcontractorsAllowed
    ? 'Contractor may engage subcontractors to perform portions of the Work. Contractor shall remain fully responsible for the acts and omissions of its subcontractors and shall ensure all subcontractors maintain appropriate licenses and insurance.'
    : 'Contractor shall perform all Work with its own employees and shall not subcontract any portion of the Work without the prior written consent of Customer.'
  }</p>

  <h2>11. WARRANTY</h2>
  <p>${warrantyHtml}</p>
  <p>Warranty claims shall be submitted in writing to Contractor within the warranty period. Contractor shall respond to warranty claims within ten (10) business days. This warranty is in addition to, and does not limit, any other warranty available by law.</p>

  <h2>12. LIMITATION OF LIABILITY</h2>
  <p>Contractor's total liability under this Agreement shall not exceed the total contract price. In no event shall Contractor be liable for: (a) indirect, incidental, special, consequential, or punitive damages; (b) loss of profits or revenue; (c) loss of use of the property; (d) damage to existing structures or finishes not part of the Work; (e) damage caused by Customer's failure to maintain the completed work. This limitation does not apply to claims arising from Contractor's gross negligence or willful misconduct.</p>

  <h2>13. INDEMNIFICATION</h2>
  <p><strong>Contractor Indemnification:</strong> Contractor shall indemnify, defend, and hold harmless Customer from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or relating to: (a) Contractor's breach of this Agreement; (b) Contractor's negligent or willful acts or omissions; (c) injury to persons or damage to property caused by Contractor's performance of the Work; (d) claims by Contractor's employees or subcontractors.</p>
  <p><strong>Customer Indemnification:</strong> Customer shall indemnify, defend, and hold harmless Contractor from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney's fees) arising out of or relating to: (a) Customer's breach of this Agreement; (b) pre-existing conditions at the job site; (c) Customer's negligent or willful acts or omissions; (d) hidden defects in existing structures.</p>

  <h2>14. TERMINATION</h2>
  <p><strong>Termination for Cause:</strong> Either party may terminate this Agreement if the other party: (a) fails to cure a material breach within ${data.curePeriodDays} days after written notice; (b) becomes insolvent, files for bankruptcy, or makes a general assignment for the benefit of creditors; (c) abandons the Work.</p>
  <p><strong>Termination for Convenience:</strong> Customer may terminate this Agreement for convenience upon ${data.terminationNoticeDays} days' written notice. In such event, Customer shall pay Contractor for: (a) all work completed to date; (b) materials ordered and non-returnable; (c) reasonable demobilization costs; (d) a profit margin of 10% on the uncompleted portion.</p>
  <p><strong>Effect of Termination:</strong> Upon termination, Contractor shall: (a) stop work immediately (except as necessary to protect completed work); (b) deliver all completed work and materials to Customer; (c) remove equipment and debris from the job site. Sections 12, 13, 16, 17, and 27 shall survive termination.</p>

  <h2>15. FORCE MAJEURE</h2>
  <p>Neither party shall be liable for delay or failure to perform its obligations under this Agreement if such delay or failure results from causes beyond the party's reasonable control, including but not limited to: acts of God, natural disasters, pandemic, epidemic, fire, flood, earthquake, hurricane, tornado, war, terrorism, riot, civil disturbance, strikes, lockouts, labor disputes, government actions, embargoes, utility failures, extreme weather conditions, material shortages, or supply chain disruptions. The affected party shall provide prompt written notice and shall use commercially reasonable efforts to mitigate the impact and resume performance.</p>

  <h2>16. CONFIDENTIALITY</h2>
  <p>Each party agrees to keep confidential all proprietary information, trade secrets, business plans, pricing, customer lists, and other confidential information received during the performance of this Agreement. This obligation survives termination of this Agreement for a period of two (2) years. This provision does not apply to information that: (a) is publicly available; (b) was known prior to disclosure; (c) is independently developed; (d) is required to be disclosed by law.</p>

  <h2>17. ASSIGNMENT</h2>
  <p>Neither party may assign or transfer this Agreement or any rights or obligations hereunder without the prior written consent of the other party. Any purported assignment without such consent shall be void. Contractor may assign payment rights to a financing party without Customer's consent, provided Contractor remains liable for performance.</p>

  ${disputeSection}

  <h2>19. ENTIRE AGREEMENT</h2>
  <p>This Agreement, together with all Change Orders and exhibits, constitutes the entire agreement between the parties and supersedes all prior or contemporaneous oral or written agreements, representations, understanding, and negotiations. No modification of this Agreement shall be effective unless in writing and signed by both parties.</p>

  <h2>20. SEVERABILITY</h2>
  <p>If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect. The invalid provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving the parties' original intent.</p>

  <h2>21. NOTICES</h2>
  <p>All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered when: (a) delivered personally; (b) sent by certified mail, return receipt requested; or (c) sent by recognized overnight courier; to the addresses set forth above or to such other address as either party may designate in writing. Email notice is permitted for routine communications but not for termination or legal claims.</p>

  <h2>22. LIEN RIGHTS</h2>
  <p>Contractor shall have the right to file a mechanics lien, materialman's lien, or other statutory lien against the property in accordance with applicable law to secure payment for work performed and materials furnished. Upon receipt of full payment, Contractor shall execute and deliver a lien release in the form required by law. Customer shall be responsible for ensuring that funds are available to satisfy all lien claims.</p>

  <h2>23. CLEANUP AND PROPERTY</h2>
  <p>Contractor shall keep the job site in a clean and orderly condition during the Work and shall remove all debris, waste materials, and surplus materials upon completion. Contractor shall protect Customer's existing property from damage during the Work. Contractor shall be liable for any damage to Customer's property caused by Contractor's negligence or willful misconduct.</p>
  <p><strong>Site Conditions:</strong> Customer represents that, to the best of Customer's knowledge, the job site does not contain hazardous materials, asbestos, lead-based paint, mold, or other environmental hazards. If such conditions are discovered during the Work, Contractor shall immediately stop work in the affected area and notify Customer. Remediation of hazardous conditions shall be addressed via Change Order.</p>

  <h2>24. ATTORNEY'S FEES</h2>
  <p>In any action or proceeding to enforce or interpret this Agreement, the prevailing party shall be entitled to recover its reasonable attorney's fees, costs, and expenses from the non-prevailing party, in addition to any other relief to which it may be entitled.</p>

  ${tradeSpecificHtml ? `<h2>25. ADDITIONAL ${data.tradeType.toUpperCase()} PROVISIONS</h2>${tradeSpecificHtml}` : ''}

  ${data.additionalTerms ? `<h2>ADDITIONAL TERMS</h2><p>${escHtml(data.additionalTerms)}</p>` : ''}

  ${generateStateDisclosuresHtml(data.governingState, data.contractorLicenseNumber)}

  <h2>26. SIGNATURES</h2>
  <p>By signing below, the parties acknowledge that they have read, understand, and agree to all terms and conditions of this Agreement. Each party represents that they have the legal authority to enter into this Agreement.</p>

  <div class="signature-section">
    <div class="signature-grid">
      <div class="sig-block">
        <div class="sig-line"><span class="placeholder">/sig_customer/</span></div>
        <div class="sig-label">Customer Signature</div>
        <div class="sig-spacer"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name</div>
        <div class="sig-spacer"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"><span class="placeholder">/sig_contractor/</span></div>
        <div class="sig-label">Contractor Signature</div>
        <div class="sig-spacer"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name</div>
        <div class="sig-spacer"></div>
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>
  </div>

  <div class="contract-footer">
    <p><strong>LEGAL DISCLAIMER</strong></p>
    <p>This service agreement was generated using PropertyFlow HQ's Contract Builder. PropertyFlow HQ is a software platform, not a law firm. This document does not constitute legal advice. No attorney-client relationship is created. Both parties are encouraged to have this agreement reviewed by a licensed attorney before signing.</p>
    <p class="brand">Generated by PropertyFlow HQ · propertyflowhq.com</p>
  </div>

</body>
</html>`;
}
