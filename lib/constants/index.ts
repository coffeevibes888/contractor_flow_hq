export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Contractor Flow HQ';
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  'The all-in-one platform built for contractors. Jobs, invoices, leads, team scheduling, inventory, payroll, and your own branded marketplace profile — starting at $39/month with no per-job fees.';
const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL;
export const SERVER_URL = rawServerUrl
  ? rawServerUrl.startsWith('http')
    ? rawServerUrl
    : `https://${rawServerUrl}`
  : 'https://www.contractorflowhq.com';
export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 4;


const rawNextAuthUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL;
export const NEXTAUTH_URL = rawNextAuthUrl
  ? rawNextAuthUrl.startsWith('http')
    ? rawNextAuthUrl
    : `https://${rawNextAuthUrl}`
  : 'https://www.contractorflowhq.com';
// export const signInDefaultValues = {
//   email: 'allenyoung1979@yahoo.com',
//   password: 'NewLove2044$&@*',
// };

export const signUpDefaultValues = {
  name: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
};

export const shippingAddressDefaultValues = {
  fullName: '',
  streetAddress: '',
  city: '',
  postalCode: '',
  country: '',
};

export const PAYMENT_METHODS = process.env.PAYMENT_METHODS
  ? process.env.PAYMENT_METHODS.split(', ')
  : ['PayPal', 'Stripe', 'CashOnDelivery'];
export const DEFAULT_PAYMENT_METHOD =
  process.env.DEFAULT_PAYMENT_METHOD || 'Stripe';

export const PAGE_SIZE = Number(process.env.PAGE_SIZE) || 12;

export const productDefaultValues = {
  name: '',
  slug: '',
  category: '',
  subCategory: '',
  images: [],
  imageColors: [],
  brand: '',
  description: '',
  price: 0,
  stock: 0,
  rating: 0,
  numReviews: 0,
  isFeatured: false,
  banner: null,
  colorIds: [],
  sizeIds: [],
  onSale: false,
  salePercent: undefined as number | undefined,
  saleUntil: null as string | null,
  cleaningFee: undefined as number | undefined,
  petDepositAnnual: undefined as number | undefined,
  videoUrl: '' as string | undefined,
  virtualTourUrl: '' as string | undefined,
};

export const USER_ROLES = process.env.USER_ROLES
  ? process.env.USER_ROLES.split(', ')
  : ['admin', 'user'];

export const reviewFormDefaultValues = {
  title: '',
  comment: '',
  rating: 0,
};

export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@contractorflowhq.com';
