import { z } from 'zod';
import { formatNumberWithDecimal } from './utils';
import { PAYMENT_METHODS } from './constants';

const currency = z
  .coerce.number()
  .refine(
    (value) => /^\d+(\.\d{2})?$/.test(formatNumberWithDecimal(value)),
    'Price must have exactly two decimal places'
  );

// Base schema for products (shared by insert and update)
const baseProductSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens (no special characters like : or !)'),
  category: z.string().min(3, 'Category must be at least 3 characters'),
  subCategory: z
    .string()
    .min(3, 'Sub category must be at least 3 characters')
    .optional(),
  brand: z.string().min(3, 'Brand must be at least 3 characters'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  streetAddress: z.string().min(3, 'Address must be at least 3 characters').optional(),
  unitNumber: z.string().min(1, 'Unit / Apt number must be at least 1 character').optional(),
  stock: z.coerce.number(),
  images: z.array(z.string()).min(1, 'Product must have at least one image'),
  imageColors: z.array(z.string()).optional(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  sizeSqFt: z.coerce.number().optional(),
  isFeatured: z.boolean(),
  banner: z.string().nullable(),
  price: currency,
  colorIds: z.array(z.string()).optional(),
  sizeIds: z.array(z.string()).optional(),
  onSale: z.boolean().optional().default(false),
  salePercent: z.coerce.number().min(1).max(90).optional(),
  saleUntil: z.string().datetime().nullable().optional(),
  // Property fee settings
  cleaningFee: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  petDepositAnnual: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).optional()
  ),
  // Video and virtual tour
  videoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  virtualTourUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

// Schema for inserting products
export const insertProductSchema = baseProductSchema.superRefine((data, ctx) => {
  if (data.onSale) {
    if (data.salePercent === undefined || Number.isNaN(data.salePercent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salePercent'],
        message: 'Sale percent is required when On Sale is enabled',
      });
    }
  }
});

// Schema for updating products
export const updateProductSchema = baseProductSchema
  .extend({
    id: z.string().min(1, 'Id is required'),
  })
  .superRefine((data, ctx) => {
    if (data.onSale) {
      if (data.salePercent === undefined || Number.isNaN(data.salePercent)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['salePercent'],
          message: 'Sale percent is required when On Sale is enabled',
        });
      }
    }
  });

// Schema for signing users in
export const signInFormSchema = z.object({
  email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Phone number — accepts US formats with or without country code, dashes,
// spaces, dots, or parens. Normalised server-side before storage.
const phoneRegex = /^(\+1|1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

// Schema for signing up a user
export const signUpFormSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    email: z.string().email('Invalid email address').transform((v) => v.toLowerCase().trim()),
    phoneNumber: z
      .string()
      .regex(phoneRegex, 'Invalid phone number format (e.g., +1 (555) 123-4567)'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z
      .string()
      .min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Cart Schemas
export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  qty: z.number().int().nonnegative('Quantity must be a positive number'),
  image: z.string().min(1, 'Image is required'),
  price: currency,
  variantId: z.string().optional(),
  variantColor: z.string().optional(),
  variantSize: z.string().optional(),
});

export const insertCartSchema = z.object({
  items: z.array(cartItemSchema),
  itemsPrice: currency,
  totalPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  sessionCartId: z.string().min(1, 'Session cart id is required'),
  userId: z.string().optional().nullable(),
});

// Schema for the shipping address
export const shippingAddressSchema = z.object({
  fullName: z.string().min(3, 'Name must be at least 3 characters'),
  streetAddress: z.string().min(3, 'Address must be at least 3 characters'),
  city: z.string().min(3, 'City must be at least 3 characters'),
  postalCode: z.string().min(3, 'Postal code must be at least 3 characters'),
  country: z.string().min(3, 'Country must be at least 3 characters'),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

// Schema for payment method
export const paymentMethodSchema = z
  .object({
    type: z.string().min(1, 'Payment method is required'),
  })
  .refine((data) => PAYMENT_METHODS.includes(data.type), {
    path: ['type'],
    message: 'Invalid payment method',
  });

// Schema for inserting order
export const insertOrderSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  itemsPrice: currency,
  shippingPrice: currency,
  taxPrice: currency,
  totalPrice: currency,
  paymentMethod: z.string().refine((data) => PAYMENT_METHODS.includes(data), {
    message: 'Invalid payment method',
  }),
  shippingAddress: shippingAddressSchema,
});

// Schema for inserting an order item
export const insertOrderItemSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  image: z.string(),
  name: z.string(),
  price: currency,
  qty: z.number(),
  variantId: z.string().nullable().optional(),
  variantColor: z.string().nullable().optional(),
  variantSize: z.string().nullable().optional()
});

// Schema for the PayPal paymentResult
export const paymentResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  email_address: z.string(),
  pricePaid: z.string(),
});

// Schema for updating the user profile
export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Name must be at leaast 3 characters'),
  email: z.string().min(3, 'Email must be at leaast 3 characters'),
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal(''))
    .nullable(),
});

// Schema for updating user address
export const updateAddressSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  postalCode: z.string().min(3, 'Postal code must be at least 3 characters'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
});

// Schema for billing address
export const billingAddressSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  postalCode: z.string().min(3, 'Postal code must be at least 3 characters'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
});

// Schema for saved payment method (Stripe tokenized)
export const savedPaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Stripe payment method ID is required'),
  type: z.string().min(1, 'Payment method type is required'),
  cardholderName: z.string().min(1, 'Cardholder name is required'),
  last4: z.string().length(4, 'Last 4 digits must be exactly 4 characters'),
  expirationDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Expiration date must be MM/YY format'),
  brand: z.string().min(1, 'Card brand is required'),
  billingAddress: billingAddressSchema,
  isDefault: z.boolean().optional().default(false),
});

// Schema for phone number verification
export const sendPhoneOtpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format (e.g., +1 (555) 123-4567)'),
});

// Schema for verifying phone OTP
export const verifyPhoneOtpSchema = z.object({
  otp: z.string().min(6, 'OTP must be 6 digits').max(6, 'OTP must be 6 digits'),
});

// Schema to update users
export const updateUserSchema = updateProfileSchema.extend({
  id: z.string().min(1, 'ID is required'),
  role: z.string().min(1, 'Role is required'),
});

// Schema to insert reviews
export const insertReviewSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  productId: z.string().min(1, 'Product is required'),
  userId: z.string().min(1, 'User is required'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
});

// Blog post schemas
export const insertBlogPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters'),
  excerpt: z.string().min(3, 'Excerpt must be at least 3 characters').optional().nullable(),
  contentHtml: z.string().min(3, 'Content must be at least 3 characters'),
  coverImage: z.string().url('Cover image must be a valid URL').optional().nullable(),
  mediaUrls: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true),
  authorId: z.string().optional().nullable(),
});

export const updateBlogPostSchema = insertBlogPostSchema.extend({
  id: z.string().min(1, 'Id is required'),
});

// Schema for saved payout method (bank account or debit card for instant payouts)
export const savedPayoutMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Stripe payment method ID is required'),
  type: z.enum(['bank_account', 'card'], { 
    errorMap: () => ({ message: 'Type must be either bank_account or card' })
  }),
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  last4: z.string().length(4, 'Last 4 digits must be exactly 4 characters'),
  bankName: z.string().optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  routingNumber: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

// Schema for bank account form input
export const bankAccountFormSchema = z.object({
  accountHolderName: z.string().min(2, 'Account holder name must be at least 2 characters'),
  accountNumber: z.string().min(4, 'Account number is required'),
  routingNumber: z.string().length(9, 'Routing number must be exactly 9 digits'),
  accountType: z.enum(['checking', 'savings'], {
    errorMap: () => ({ message: 'Please select account type' })
  }),
  isDefault: z.boolean().optional().default(false),
});

// Schema for rental application
const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;

export const rentalApplicationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
  ssn: z.string().regex(ssnRegex, 'SSN must be in format XXX-XX-XXXX or XXXXXXXXX'),
  currentAddress: z.string().min(5, 'Current address must be at least 5 characters'),
  currentEmployer: z.string().min(2, 'Current employer must be at least 2 characters'),
  age: z.string().optional(),
  monthlySalary: z.string().optional(),
  yearlySalary: z.string().optional(),
  hasPets: z.string().optional(),
  petCount: z.string().optional(),
  notes: z.string().optional(),
  propertySlug: z.string().optional(),
});

// Schema for tenant invoice creation
export const tenantInvoiceSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  leaseId: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  description: z.string().optional(),
  dueDate: z.string().datetime('Invalid due date'),
});

// Schema for property bank account
export const propertyBankAccountSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  stripeBankAccountTokenId: z.string().min(1, 'Bank account token is required'),
  accountHolderName: z.string().min(2, 'Account holder name must be at least 2 characters'),
  bankName: z.string().optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  last4: z.string().length(4, 'Last 4 digits must be exactly 4 characters'),
  routingNumber: z.string().optional(),
});

// ============= CONTRACTOR MANAGEMENT SCHEMAS =============

// Contractor specialties
export const CONTRACTOR_SPECIALTIES = [
  'plumbing',
  'electrical',
  'hvac',
  'appliance_repair',
  'carpentry',
  'painting',
  'flooring',
  'roofing',
  'landscaping',
  'cleaning',
  'pest_control',
  'locksmith',
  'general_handyman',
  'other',
] as const;

// Schema for adding a contractor to directory
export const contractorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number format').optional().or(z.literal('')),
  specialties: z.array(z.enum(CONTRACTOR_SPECIALTIES)).min(1, 'Select at least one specialty'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for updating a contractor
export const updateContractorSchema = contractorSchema.extend({
  id: z.string().uuid('Invalid contractor ID'),
});

// Schema for contractor invitation
export const contractorInviteSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID'),
  email: z.string().email('Invalid email address'),
});

// Work order priority and status
export const WORK_ORDER_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const WORK_ORDER_STATUSES = ['draft', 'assigned', 'in_progress', 'completed', 'paid', 'cancelled'] as const;

// Schema for creating a work order
export const workOrderSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID').optional(), // Optional for marketplace posts
  maintenanceTicketId: z.string().uuid('Invalid maintenance ticket ID').optional(),
  propertyId: z.string().uuid('Invalid property ID'),
  unitId: z.string().uuid('Invalid unit ID').optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(WORK_ORDER_PRIORITIES),
  agreedPrice: z.coerce.number().positive('Price must be greater than 0').optional(), // Optional for marketplace
  budgetMin: z.coerce.number().positive().optional(), // For marketplace posts
  budgetMax: z.coerce.number().positive().optional(), // For marketplace posts
  scheduledDate: z.string().datetime('Invalid scheduled date').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  isOpenForBids: z.boolean().optional(), // True for marketplace posts
  status: z.enum(WORK_ORDER_STATUSES).optional(),
});

// Schema for updating a work order
export const updateWorkOrderSchema = workOrderSchema.partial().extend({
  id: z.string().uuid('Invalid work order ID'),
});

// Schema for updating work order status
export const workOrderStatusSchema = z.object({
  id: z.string().uuid('Invalid work order ID'),
  status: z.enum(WORK_ORDER_STATUSES),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for work order media upload
export const workOrderMediaSchema = z.object({
  workOrderId: z.string().uuid('Invalid work order ID'),
  type: z.enum(['image', 'video']),
  url: z.string().url('Invalid URL'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  caption: z.string().max(200, 'Caption must be less than 200 characters').optional(),
  phase: z.enum(['before', 'during', 'after']),
});

// Schema for contractor payment
export const contractorPaymentSchema = z.object({
  workOrderId: z.string().uuid('Invalid work order ID'),
});

// Platform fee percentage for contractor payments (configurable)
export const CONTRACTOR_PLATFORM_FEE_PERCENT = 2.5; // 2.5% platform fee


// ============= TEAM OPERATIONS SCHEMAS (ENTERPRISE) =============

// Platform fee percentage for team payroll (same as contractor payments)
export const TEAM_PLATFORM_FEE_PERCENT = 2.5;

// Pay period types
export const PAY_PERIOD_TYPES = ['weekly', 'biweekly', 'semimonthly', 'monthly'] as const;

// Pay types
export const PAY_TYPES = ['hourly', 'salary'] as const;

// Shift statuses
export const SHIFT_STATUSES = ['scheduled', 'completed', 'missed', 'cancelled'] as const;

// Time entry approval statuses
export const TIME_ENTRY_STATUSES = ['pending', 'approved', 'rejected'] as const;

// Timesheet statuses
export const TIMESHEET_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'paid'] as const;

// Time off request statuses
export const TIME_OFF_STATUSES = ['pending', 'approved', 'denied'] as const;

// Team payment types
export const TEAM_PAYMENT_TYPES = ['timesheet', 'bonus', 'commission', 'adjustment'] as const;

// Schema for team member compensation
export const teamMemberCompensationSchema = z.object({
  teamMemberId: z.string().uuid('Invalid team member ID'),
  payType: z.enum(PAY_TYPES),
  hourlyRate: z.coerce.number().positive('Hourly rate must be positive').optional(),
  salaryAmount: z.coerce.number().positive('Salary must be positive').optional(),
  overtimeRate: z.coerce.number().positive('Overtime rate must be positive').optional(),
  commissionRate: z.coerce.number().min(0).max(100, 'Commission rate must be 0-100%').optional(),
}).refine(
  (data) => {
    if (data.payType === 'hourly' && !data.hourlyRate) {
      return false;
    }
    if (data.payType === 'salary' && !data.salaryAmount) {
      return false;
    }
    return true;
  },
  { message: 'Hourly rate required for hourly pay, salary amount required for salary pay' }
);

// Schema for team member availability
export const teamMemberAvailabilitySchema = z.object({
  teamMemberId: z.string().uuid('Invalid team member ID'),
  dayOfWeek: z.number().int().min(0).max(6, 'Day of week must be 0-6'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
  isAvailable: z.boolean(),
});

// Schema for creating a shift
export const shiftSchema = z.object({
  teamMemberId: z.string().uuid('Invalid team member ID'),
  propertyId: z.string().uuid('Invalid property ID').optional(),
  date: z.string().datetime('Invalid date'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:MM format'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for updating a shift
export const updateShiftSchema = shiftSchema.partial().extend({
  id: z.string().uuid('Invalid shift ID'),
  status: z.enum(SHIFT_STATUSES).optional(),
});

// Schema for time off request
export const timeOffRequestSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

// Schema for reviewing time off request
export const reviewTimeOffSchema = z.object({
  id: z.string().uuid('Invalid request ID'),
  status: z.enum(['approved', 'denied']),
  reviewNotes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for clock in
export const clockInSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID').optional(),
  shiftId: z.string().uuid('Invalid shift ID').optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for clock out
export const clockOutSchema = z.object({
  timeEntryId: z.string().uuid('Invalid time entry ID'),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  breakMinutes: z.number().int().min(0).max(480, 'Break cannot exceed 8 hours').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for manual time entry
export const manualTimeEntrySchema = z.object({
  teamMemberId: z.string().uuid('Invalid team member ID'),
  propertyId: z.string().uuid('Invalid property ID').optional(),
  clockIn: z.string().datetime('Invalid clock in time'),
  clockOut: z.string().datetime('Invalid clock out time'),
  breakMinutes: z.number().int().min(0).max(480, 'Break cannot exceed 8 hours').default(0),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for submitting timesheet
export const submitTimesheetSchema = z.object({
  timesheetId: z.string().uuid('Invalid timesheet ID'),
});

// Schema for reviewing timesheet
export const reviewTimesheetSchema = z.object({
  timesheetId: z.string().uuid('Invalid timesheet ID'),
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Schema for processing payroll
export const processPayrollSchema = z.object({
  timesheetIds: z.array(z.string().uuid('Invalid timesheet ID')).min(1, 'Select at least one timesheet'),
});

// Schema for bonus payment
export const bonusPaymentSchema = z.object({
  teamMemberId: z.string().uuid('Invalid team member ID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  description: z.string().min(3, 'Description required').max(200),
});

// Schema for payroll settings
export const payrollSettingsSchema = z.object({
  payPeriodType: z.enum(PAY_PERIOD_TYPES),
  payPeriodStartDay: z.number().int().min(0).max(31, 'Invalid start day'),
  overtimeThreshold: z.coerce.number().min(0).max(168, 'Weekly hours cannot exceed 168'),
  dailyOvertimeThreshold: z.coerce.number().min(0).max(24, 'Daily hours cannot exceed 24').optional(),
  overtimeMultiplier: z.coerce.number().min(1).max(3, 'Overtime multiplier must be 1-3'),
});

// ============= TENANT MANAGEMENT SCHEMAS =============

// Schema for manually adding tenant data
export const addTenantSchema = z.object({
  // Tenant personal info
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  
  // Property/Unit selection
  propertyId: z.string().uuid('Property is required'),
  unitId: z.string().uuid('Unit is required'),
  
  // Lease details
  rentAmount: z.coerce.number().positive('Rent amount must be positive'),
  securityDeposit: z.coerce.number().min(0, 'Security deposit cannot be negative').optional(),
  leaseStartDate: z.string().min(1, 'Lease start date is required'),
  leaseEndDate: z.string().optional(),
  billingDayOfMonth: z.coerce.number().min(1).max(28).default(1),
  
  // Additional tenant info
  moveInDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  numberOfOccupants: z.coerce.number().min(1).default(1),
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  vehicleInfo: z.string().optional(),
  notes: z.string().optional(),
  
  // Options
  sendInviteEmail: z.boolean().default(true),
  createLeaseImmediately: z.boolean().default(true),

  // Pre-built lease document from the free lease builder flow
  // When present the lease is created as pending_signature instead of pending
  // and the document is linked so the tenant can sign immediately.
  legalDocumentId: z.string().uuid().optional(),
});

export type AddTenantInput = z.infer<typeof addTenantSchema>;
