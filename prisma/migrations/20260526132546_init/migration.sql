-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "images" TEXT[],
    "imageColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "streetAddress" TEXT,
    "unitNumber" TEXT,
    "stock" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "numReviews" INTEGER NOT NULL DEFAULT 0,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "sizeSqFt" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "banner" TEXT,
    "printfulProductId" TEXT,
    "onSale" BOOLEAN NOT NULL DEFAULT false,
    "salePercent" DECIMAL(5,2),
    "saleUntil" TIMESTAMP(6),
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'NO_NAME',
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(6),
    "image" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "shippingAddress" JSON,
    "billingAddress" JSON,
    "address" JSON,
    "paymentMethod" TEXT,
    "stripeCustomerId" TEXT,
    "phoneNumber" TEXT,
    "phoneVerified" TIMESTAMP(6),
    "notificationPreferences" JSON,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(6),
    "blockedBy" UUID,
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneVerificationToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "sessionCartId" TEXT NOT NULL,
    "items" JSON[] DEFAULT ARRAY[]::JSON[],
    "itemsPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "shippingPrice" DECIMAL(12,2) NOT NULL,
    "taxPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "shippingAddress" JSON NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentResult" JSON,
    "itemsPrice" DECIMAL(12,2) NOT NULL,
    "shippingPrice" DECIMAL(12,2) NOT NULL,
    "taxPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(6),
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(6),
    "trackingNumber" TEXT,
    "trackingStatus" TEXT DEFAULT 'pending',
    "trackingEvents" JSON[] DEFAULT ARRAY[]::JSON[],
    "lastTrackingUpdate" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "variantId" UUID,
    "variantColor" TEXT,
    "variantSize" TEXT,

    CONSTRAINT "orderitems_orderId_productId_pk" PRIMARY KEY ("orderId","productId")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "hex" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Size" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "sku" TEXT,
    "colorId" UUID,
    "sizeId" UUID,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL,
    "printfulExternalId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPaymentMethod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cardholderName" TEXT,
    "last4" TEXT NOT NULL,
    "expirationDate" TEXT,
    "brand" TEXT,
    "billingAddress" JSON,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethodVerificationToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethodVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(12,2),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DECIMAL(10,2) NOT NULL,
    "minOrderAmount" DECIMAL(12,2),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPromo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "promoCodeId" UUID NOT NULL,

    CONSTRAINT "ProductPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "baseShippingCost" DECIMAL(10,2) NOT NULL,
    "freeShippingThreshold" DECIMAL(12,2) NOT NULL,
    "uspsIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "taxRate" DECIMAL(5,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referenceId" TEXT NOT NULL,
    "paymentIntentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "partnerId" TEXT NOT NULL,
    "barcodeData" TEXT NOT NULL,
    "confirmationNumber" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "CashPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL DEFAULT 'contact',
    "subject" TEXT,
    "fromEmail" TEXT,
    "toEmail" TEXT,
    "createdByUserId" UUID,
    "status" TEXT NOT NULL DEFAULT 'open',
    "folderId" UUID,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "senderUserId" UUID,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "content" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadParticipant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "threadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ThreadParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageFolder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "icon" TEXT DEFAULT 'folder',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friend" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "friendId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentHtml" TEXT NOT NULL,
    "coverImage" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "authorId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogComment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogReaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionCartId" TEXT NOT NULL,
    "userId" UUID,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "language" TEXT,
    "timezone" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" UUID,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landlord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "ownerUserId" UUID,
    "stripeConnectAccountId" TEXT,
    "stripeOnboardingStatus" TEXT,
    "stripeTreasuryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inviteViaEmail" BOOLEAN NOT NULL DEFAULT true,
    "inviteViaSms" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "customDomain" TEXT,
    "companyName" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT 'violet',
    "heroImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aboutBio" TEXT,
    "aboutPhoto" TEXT,
    "aboutGallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unitsEstimateMin" INTEGER,
    "unitsEstimateMax" INTEGER,
    "ownsProperties" BOOLEAN DEFAULT false,
    "managesForOthers" BOOLEAN DEFAULT false,
    "useSubdomain" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'starter',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "subscriptionEndsAt" TIMESTAMP(6),
    "unitLimitNotifiedAt" TIMESTAMP(6),
    "freeBackgroundChecks" BOOLEAN NOT NULL DEFAULT false,
    "freeEmploymentVerification" BOOLEAN NOT NULL DEFAULT false,
    "trialStartDate" TIMESTAMP(6),
    "trialEndDate" TIMESTAMP(6),
    "trialStatus" TEXT NOT NULL DEFAULT 'trialing',
    "gracePeriodsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastGracePeriodDate" TIMESTAMP(6),
    "lastReminderSentAt" TIMESTAMP(6),
    "trialRemindersSent" JSON,
    "notificationEmail" TEXT,
    "notifyNewApplications" BOOLEAN NOT NULL DEFAULT true,
    "notifyMaintenanceTickets" BOOLEAN NOT NULL DEFAULT true,
    "notifyLatePayments" BOOLEAN NOT NULL DEFAULT true,
    "notifyLeaseExpiring" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewMessages" BOOLEAN NOT NULL DEFAULT true,
    "emailInvitesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsInvitesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsAlertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationPhone" TEXT,
    "petDepositAmount" DECIMAL(12,2),
    "petDepositEnabled" BOOLEAN NOT NULL DEFAULT false,
    "petRentAmount" DECIMAL(12,2),
    "petRentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cleaningFeeAmount" DECIMAL(12,2),
    "cleaningFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "applicationFeeAmount" DECIMAL(12,2),
    "applicationFeeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "securityDepositMonths" DECIMAL(3,1) NOT NULL DEFAULT 1,
    "lastMonthRentRequired" BOOLEAN NOT NULL DEFAULT true,
    "feeApplyToAll" BOOLEAN NOT NULL DEFAULT true,
    "feeSelectedProperties" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Landlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homeowner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT,
    "homeType" TEXT,
    "interestedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectTimeline" TEXT,
    "address" JSON,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearBuilt" INTEGER,
    "squareFootage" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "lotSize" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homeowner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeownerWorkOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "homeownerId" UUID NOT NULL,
    "contractorId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "agreedPrice" DECIMAL(12,2),
    "scheduledDate" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "address" JSON,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isOpenBid" BOOLEAN NOT NULL DEFAULT true,
    "bidDeadline" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeownerWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeownerWorkOrderBid" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "estimatedHours" DECIMAL(6,2),
    "proposedStartDate" TIMESTAMP(6),
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeownerWorkOrderBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickBooksConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "realmId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "oauthState" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(6),
    "companyName" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickBooksConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocuSignConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "oauthState" TEXT,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocuSignConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPayoutMethod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "accountHolderName" TEXT,
    "last4" TEXT NOT NULL,
    "bankName" TEXT,
    "accountType" TEXT,
    "routingNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPayoutMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" JSON NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landlordId" UUID,
    "defaultLeaseDocumentId" UUID,
    "cleaningFee" DECIMAL(12,2),
    "petDepositAnnual" DECIMAL(12,2),
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "sizeSqFt" INTEGER,
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(3),
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unitId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "legalDocumentId" UUID,
    "startDate" TIMESTAMP(6) NOT NULL,
    "endDate" TIMESTAMP(6),
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "billingDayOfMonth" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "terminationReason" TEXT,
    "terminatedAt" TIMESTAMP(6),
    "docusignEnvelopeId" TEXT,
    "tenantSignedAt" TIMESTAMP(6),
    "landlordSignedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" UUID,
    "generatedFrom" TEXT,
    "generatedAt" TIMESTAMP(6),

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringCharge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dayOfMonthToPost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "lastPostedDate" DATE,
    "nextPostDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dueDate" TIMESTAMP(6) NOT NULL,
    "paidAt" TIMESTAMP(6),
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceId" TEXT,
    "paymentMethod" TEXT,
    "convenienceFee" DECIMAL(12,2) DEFAULT 0,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSON,
    "walletCredited" BOOLEAN NOT NULL DEFAULT false,
    "walletCreditedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payoutId" UUID,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "qbPaymentId" TEXT,

    CONSTRAINT "RentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentPaymentId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "referenceId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(6),
    "stripeTransferId" TEXT,
    "metadata" JSON,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payoutId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'instant_payout_fee',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSON,

    CONSTRAINT "PlatformFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceTicket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unitId" UUID,
    "tenantId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignedToName" TEXT,
    "cost" DECIMAL(12,2),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(6),

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "propertyId" UUID,
    "unitId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "incurredAt" TIMESTAMP(6) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "receiptUrl" TEXT,
    "receiptOcrData" JSONB,
    "vendor" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "qbExpenseId" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "relatedToType" TEXT,
    "relatedToId" UUID,
    "notes" TEXT,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketBenchmark" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "propertyId" UUID,
    "zip" TEXT,
    "propertyType" TEXT,
    "bedrooms" INTEGER,
    "averageRent" DECIMAL(12,2) NOT NULL,
    "source" TEXT,
    "effectiveDate" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFinance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "purchasePrice" DECIMAL(12,2),
    "downPayment" DECIMAL(12,2),
    "loanBalance" DECIMAL(12,2),
    "interestRatePercent" DECIMAL(6,3),
    "loanTermMonths" INTEGER,
    "annualPropertyTax" DECIMAL(12,2),
    "annualInsurance" DECIMAL(12,2),
    "hoaMonthly" DECIMAL(12,2),
    "managementFeePercent" DECIMAL(6,3),
    "appreciationRatePercent" DECIMAL(6,3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFinance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseViolation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "tenantId" UUID,
    "unitId" UUID,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(6) NOT NULL,
    "resolvedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalApplication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unitId" UUID,
    "applicantId" UUID,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "moveInDate" TIMESTAMP(6),
    "monthlyIncome" DECIMAL(12,2),
    "employmentStatus" TEXT,
    "notes" TEXT,
    "adminResponse" TEXT,
    "propertySlug" TEXT,
    "encryptedSsn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(6),
    "screeningProvider" TEXT,
    "screeningBundle" TEXT,
    "screeningStatus" TEXT,
    "screeningReportUrl" TEXT,
    "screeningRequestedAt" TIMESTAMP(6),
    "screeningCompletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "cloudinaryResourceType" TEXT NOT NULL DEFAULT 'raw',
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "state" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFieldsConfigured" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "docusignTemplateId" TEXT,
    "signatureFields" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "builderConfig" JSON,
    "pdfUrl" TEXT,
    "signatureFields" JSON,
    "mergeFields" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLeaseTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "leaseTemplateId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyLeaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignatureRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "leaseId" UUID,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "docusignEnvelopeId" TEXT,
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "token" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signerIp" TEXT,
    "signerUserAgent" TEXT,
    "signedPdfUrl" TEXT,
    "auditLogUrl" TEXT,
    "documentHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'tenant',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signatureDataUrl" TEXT,
    "initialsDataUrl" TEXT,
    "fieldSectionContext" JSON,
    "completedFieldIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastProgressAt" TIMESTAMP(6),

    CONSTRAINT "DocumentSignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInspection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "inspectorId" UUID,
    "unitId" UUID,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "location" JSON,
    "summary" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inspectionId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertySchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "schedule" JSON NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAppointment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "scheduleId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "date" TIMESTAMP(6) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannedDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "uploadedBy" UUID,
    "propertyId" UUID,
    "originalFileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "ocrText" TEXT,
    "ocrConfidence" DECIMAL(5,2),
    "ocrProcessedAt" TIMESTAMP(6),
    "documentType" TEXT,
    "classificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "classifiedAt" TIMESTAMP(6),
    "extractedData" JSON,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "convertedToLeaseId" UUID,
    "convertedToPaymentId" UUID,
    "convertedToTenantId" UUID,
    "convertedToExpenseId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentClassificationRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID,
    "documentType" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentClassificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordSubscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(6),
    "currentPeriodEnd" TIMESTAMP(6),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(6),
    "trialEnd" TIMESTAMP(6),
    "unitLimit" INTEGER NOT NULL DEFAULT 24,
    "freeBackgroundChecks" BOOLEAN NOT NULL DEFAULT false,
    "freeEvictionChecks" BOOLEAN NOT NULL DEFAULT false,
    "freeEmploymentVerification" BOOLEAN NOT NULL DEFAULT false,
    "isGranted" BOOLEAN NOT NULL DEFAULT false,
    "grantedBy" UUID,
    "grantedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromTier" TEXT,
    "toTier" TEXT,
    "amount" DECIMAL(12,2),
    "stripeEventId" TEXT,
    "metadata" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "userId" UUID,
    "role" TEXT NOT NULL DEFAULT 'member',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invitedEmail" TEXT,
    "inviteToken" TEXT,
    "inviteExpires" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "joinedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hourlyRate" DECIMAL(10,2),
    "paySchedule" TEXT,
    "paySchedulePayDay" SMALLINT,
    "paySchedulePayDate" DATE,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'public',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChannelMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channelId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "lastReadAt" TIMESTAMP(6),
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channelId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentReminderSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBefore" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "reminderChannels" TEXT[] DEFAULT ARRAY['email']::TEXT[],
    "customMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LateFeeSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "feeType" TEXT NOT NULL DEFAULT 'flat',
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "maxFee" DECIMAL(12,2),
    "recurringFee" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" TEXT,
    "notifyTenant" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LateFeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIP" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" UUID,
    "expiresAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedIP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "cloudinaryResourceType" TEXT NOT NULL DEFAULT 'raw',
    "cloudinarySecureUrl" TEXT NOT NULL,
    "ocrText" TEXT,
    "ocrConfidence" DECIMAL(5,2),
    "ocrProcessedAt" TIMESTAMP(6),
    "extractedData" JSON,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verificationMethod" TEXT,
    "verificationCompletedAt" TIMESTAMP(6),
    "fraudScore" DECIMAL(5,2),
    "fraudIndicators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejectionReason" TEXT,
    "reviewNotes" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "dataRetentionExpiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "identityStatus" TEXT NOT NULL DEFAULT 'pending',
    "identityVerifiedAt" TIMESTAMP(6),
    "identityDocumentId" UUID,
    "employmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "employmentVerifiedAt" TIMESTAMP(6),
    "monthlyIncome" DECIMAL(12,2),
    "incomeVerificationMethod" TEXT,
    "overallStatus" TEXT NOT NULL DEFAULT 'incomplete',
    "completedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "stripeIdentitySessionId" TEXT,
    "plaidLinkToken" TEXT,
    "plaidAccessToken" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentVerificationUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "verificationDocumentId" UUID,
    "method" TEXT NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "wasFree" BOOLEAN NOT NULL DEFAULT false,
    "billingPeriodStart" TIMESTAMP(6) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmploymentVerificationUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudDetectionLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "verificationDocumentId" UUID NOT NULL,
    "checkType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "details" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudDetectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "verificationDocumentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accessType" TEXT NOT NULL,
    "purpose" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyBankAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "bankName" TEXT,
    "accountType" TEXT,
    "routingNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantInvoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leaseId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(6),
    "stripePaymentIntentId" TEXT,
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordWallet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "walletId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "referenceId" UUID,
    "metadata" JSON,
    "availableAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvictionNotice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "noticeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'served',
    "reason" TEXT NOT NULL,
    "amountOwed" DECIMAL(12,2),
    "additionalNotes" TEXT,
    "servedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineDate" TIMESTAMP(6) NOT NULL,
    "curedAt" TIMESTAMP(6),
    "filedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvictionNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDeparture" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "departureType" TEXT NOT NULL,
    "departureDate" TIMESTAMP(6) NOT NULL,
    "notes" TEXT,
    "evictionNoticeId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositDisposition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leaseId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "originalAmount" DECIMAL(12,2) NOT NULL,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "refundMethod" TEXT,
    "refundStatus" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "processedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositDisposition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositDeductionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "depositDispositionId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositDeductionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitTurnoverChecklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unitId" UUID NOT NULL,
    "leaseId" UUID,
    "landlordId" UUID NOT NULL,
    "depositProcessed" BOOLEAN NOT NULL DEFAULT false,
    "keysCollected" BOOLEAN NOT NULL DEFAULT false,
    "unitInspected" BOOLEAN NOT NULL DEFAULT false,
    "cleaningCompleted" BOOLEAN NOT NULL DEFAULT false,
    "repairsCompleted" BOOLEAN NOT NULL DEFAULT false,
    "depositProcessedAt" TIMESTAMP(6),
    "keysCollectedAt" TIMESTAMP(6),
    "unitInspectedAt" TIMESTAMP(6),
    "cleaningCompletedAt" TIMESTAMP(6),
    "repairsCompletedAt" TIMESTAMP(6),
    "notes" TEXT,
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitTurnoverChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "unitId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leaseId" UUID NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "tenantPhone" TEXT,
    "leaseStartDate" TIMESTAMP(6) NOT NULL,
    "leaseEndDate" TIMESTAMP(6),
    "rentAmount" DECIMAL(12,2) NOT NULL,
    "departureType" TEXT NOT NULL,
    "departureDate" TIMESTAMP(6) NOT NULL,
    "departureNotes" TEXT,
    "depositAmount" DECIMAL(12,2),
    "depositRefunded" DECIMAL(12,2),
    "depositDeducted" DECIMAL(12,2),
    "wasEvicted" BOOLEAN NOT NULL DEFAULT false,
    "evictionReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stripeConnectAccountId" TEXT,
    "stripeOnboardingStatus" TEXT,
    "isPaymentReady" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "stripeCustomerId" TEXT,
    "stripeBankAccountId" TEXT,
    "bankAccountLast4" TEXT,
    "bankName" TEXT,
    "businessName" TEXT,
    "contactName" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorEstimate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "landlordId" UUID,
    "workOrderId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lineItems" JSON NOT NULL DEFAULT '[]',
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materialsCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "estimatedHours" DECIMAL(6,2),
    "validUntil" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateName" TEXT,
    "attachmentUrl" TEXT,
    "sentAt" TIMESTAMP(6),
    "viewedAt" TIMESTAMP(6),
    "respondedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderBid" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "laborCost" DECIMAL(12,2),
    "materialsCost" DECIMAL(12,2),
    "estimatedHours" DECIMAL(6,2),
    "proposedStartDate" TIMESTAMP(6),
    "estimatedCompletionDate" TIMESTAMP(6),
    "inclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "warrantyDays" INTEGER,
    "willPullPermits" BOOLEAN,
    "paymentTerms" TEXT,
    "validUntil" TIMESTAMP(6),
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderBidMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bidId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'message',
    "body" TEXT,
    "counterAmount" DECIMAL(12,2),
    "counterStatus" TEXT,
    "respondedAt" TIMESTAMP(6),
    "respondedBy" UUID,
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderBidMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "contractorId" UUID,
    "maintenanceTicketId" UUID,
    "propertyId" UUID NOT NULL,
    "unitId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "agreedPrice" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "scheduledDate" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "notes" TEXT,
    "escrowStatus" TEXT NOT NULL DEFAULT 'none',
    "escrowAmount" DECIMAL(12,2),
    "escrowFundedAt" TIMESTAMP(6),
    "escrowReleasedAt" TIMESTAMP(6),
    "escrowRefundedAt" TIMESTAMP(6),
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "acceptedBidId" UUID,
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'pending',
    "lifecycleStartedAt" TIMESTAMP(6),
    "lifecycleCompletedAt" TIMESTAMP(6),
    "lifecycleApprovedAt" TIMESTAMP(6),
    "pmApprovalDeadline" TIMESTAMP(6),
    "isOpenBid" BOOLEAN NOT NULL DEFAULT false,
    "bidDeadline" TIMESTAMP(6),
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "postingType" TEXT NOT NULL DEFAULT 'bid',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderStatusEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorUserId" UUID,
    "actorRole" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderDispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "filedByUserId" UUID NOT NULL,
    "filedByRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(6),
    "resolvedByUserId" UUID,
    "refundAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderMilestone" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "releaseRule" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "receiptUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "releasedAt" TIMESTAMP(6),
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderMedia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "uploaderRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'before',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "changedById" UUID NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "workOrderId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2),
    "netAmount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(6),
    "metadata" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treasuryTransferId" VARCHAR(255),
    "transferType" VARCHAR(40),
    "platformFeeCollected" BOOLEAN NOT NULL DEFAULT false,
    "treasuryStatus" VARCHAR(40),
    "platformFeeTransferId" VARCHAR(255),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(6),
    "milestoneRefId" UUID,
    "milestoneRefType" VARCHAR(40),

    CONSTRAINT "ContractorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID,
    "userId" UUID,
    "landlordId" UUID,
    "contractorId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "transferType" VARCHAR(40),
    "reasonFailed" VARCHAR(120) NOT NULL,
    "errorDetail" TEXT,
    "attemptedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberCompensation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamMemberId" UUID NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "hourlyRate" DECIMAL(10,2),
    "salaryAmount" DECIMAL(12,2),
    "overtimeRate" DECIMAL(10,2),
    "commissionRate" DECIMAL(5,2),
    "stripeAccountId" TEXT,
    "stripeOnboardingStatus" TEXT DEFAULT 'pending',
    "isPaymentReady" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectAccountId" VARCHAR(255),
    "stripeFinancialAccountId" VARCHAR(255),
    "treasuryOnboardingStatus" VARCHAR(40),
    "treasuryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "treasuryVerifiedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMemberCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberAvailability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamMemberId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMemberAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOffRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamMemberId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(6),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOffRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "propertyId" UUID,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "shiftId" UUID,
    "propertyId" UUID,
    "clockIn" TIMESTAMP(6) NOT NULL,
    "clockOut" TIMESTAMP(6),
    "clockInLat" DECIMAL(10,7),
    "clockInLng" DECIMAL(10,7),
    "clockOutLat" DECIMAL(10,7),
    "clockOutLng" DECIMAL(10,7),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER,
    "notes" TEXT,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "timesheetId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "totalHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "regularHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(6),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(6),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "teamMemberId" UUID NOT NULL,
    "timesheetId" UUID,
    "paymentType" TEXT NOT NULL DEFAULT 'timesheet',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "regularPay" DECIMAL(12,2),
    "overtimePay" DECIMAL(12,2),
    "commissionPay" DECIMAL(12,2),
    "bonusAmount" DECIMAL(12,2),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeTransferId" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treasuryTransferId" VARCHAR(255),
    "transferType" VARCHAR(40) NOT NULL DEFAULT 'timesheet',
    "platformFeeCollected" BOOLEAN NOT NULL DEFAULT false,
    "treasuryStatus" VARCHAR(40),
    "platformFeeTransferId" VARCHAR(255),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(6),
    "regularHoursAtPay" DECIMAL(10,2),
    "overtimeHoursAtPay" DECIMAL(10,2),
    "hourlyRateAtPay" DECIMAL(10,2),
    "overtimeMultiplierAtPay" DECIMAL(3,2),

    CONSTRAINT "TeamPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "payPeriodType" TEXT NOT NULL DEFAULT 'biweekly',
    "payPeriodStartDay" INTEGER NOT NULL DEFAULT 1,
    "overtimeThreshold" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "dailyOvertimeThreshold" DECIMAL(5,2),
    "overtimeMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.5,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'full-time',
    "category" TEXT NOT NULL DEFAULT 'general',
    "location" TEXT NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "salary" TEXT,
    "salaryMin" DECIMAL(12,2),
    "salaryMax" DECIMAL(12,2),
    "salaryType" TEXT NOT NULL DEFAULT 'yearly',
    "requirements" TEXT,
    "benefits" TEXT,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "companyAbout" TEXT,
    "experienceLevel" TEXT NOT NULL DEFAULT 'entry',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "landlordId" UUID,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "coverLetter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "dateOfBirth" TEXT,
    "ssnLast4" TEXT,
    "ssnEncrypted" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "stateRegion" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'US',
    "workAuth" TEXT,
    "requiresSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "workHistory" JSON,
    "education" JSON,
    "references" JSON,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "documents" JSON,
    "backgroundCheckConsent" BOOLEAN NOT NULL DEFAULT false,
    "creditCheckConsent" BOOLEAN NOT NULL DEFAULT false,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(6),
    "signedName" TEXT,
    "signedIp" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(6),
    "reviewedAt" TIMESTAMP(6),
    "reviewedById" UUID,
    "rejectionReason" TEXT,
    "offerAmount" DECIMAL(12,2),
    "offerMessage" TEXT,
    "appliedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicantMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicantId" UUID NOT NULL,
    "senderId" UUID,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplicantMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID,
    "companyName" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "pros" TEXT,
    "cons" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSeekerProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT,
    "profilePhoto" TEXT,
    "coverPhoto" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFrom" TIMESTAMP(6),
    "desiredJobTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "desiredSalaryMin" DECIMAL(12,2),
    "desiredSalaryMax" DECIMAL(12,2),
    "salaryType" TEXT NOT NULL DEFAULT 'yearly',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "education" TEXT,
    "resumeUrl" TEXT,
    "portfolioUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseExpiry" DATE,
    "brokerage" TEXT,
    "brokerageAddress" TEXT,
    "logoUrl" TEXT,
    "customDomain" TEXT,
    "companyName" TEXT,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT 'violet',
    "heroImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aboutBio" TEXT,
    "aboutPhoto" TEXT,
    "aboutGallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "website" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "youtubeUrl" TEXT,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalListings" INTEGER NOT NULL DEFAULT 0,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'starter',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "subscriptionEndsAt" TIMESTAMP(6),
    "trialStartDate" TIMESTAMP(6),
    "trialEndDate" TIMESTAMP(6),
    "trialStatus" TEXT NOT NULL DEFAULT 'trialing',
    "gracePeriodsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastGracePeriodDate" TIMESTAMP(6),
    "trialRemindersSent" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWorkOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "contractorId" UUID,
    "listingId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "agreedPrice" DECIMAL(12,2),
    "scheduledDate" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "address" JSON,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isOpenBid" BOOLEAN NOT NULL DEFAULT true,
    "bidDeadline" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentWorkOrderBid" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workOrderId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "estimatedHours" DECIMAL(6,2),
    "proposedStartDate" TIMESTAMP(6),
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentWorkOrderBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentListing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" TEXT NOT NULL,
    "listingType" TEXT NOT NULL DEFAULT 'sale',
    "status" TEXT NOT NULL DEFAULT 'active',
    "address" JSON NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "pricePerSqFt" DECIMAL(10,2),
    "hoaFees" DECIMAL(10,2),
    "taxAmount" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "halfBaths" INTEGER,
    "sizeSqFt" INTEGER,
    "lotSizeSqFt" INTEGER,
    "lotSizeAcres" DECIMAL(10,4),
    "yearBuilt" INTEGER,
    "stories" INTEGER,
    "garage" INTEGER,
    "parkingSpaces" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliances" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "heating" TEXT,
    "cooling" TEXT,
    "flooring" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roof" TEXT,
    "foundation" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "virtualTourUrl" TEXT,
    "floorPlanUrl" TEXT,
    "mlsNumber" TEXT,
    "mlsSource" TEXT,
    "listedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(6),
    "soldPrice" DECIMAL(12,2),
    "expiresAt" TIMESTAMP(6),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "showAddress" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLead" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "listingId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'buyer',
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "budget" DECIMAL(12,2),
    "preApproved" BOOLEAN NOT NULL DEFAULT false,
    "preApprovalAmount" DECIMAL(12,2),
    "preferredAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minBedrooms" INTEGER,
    "minBathrooms" INTEGER,
    "minSqFt" INTEGER,
    "maxPrice" DECIMAL(12,2),
    "timeline" TEXT,
    "notes" TEXT,
    "lastContactAt" TIMESTAMP(6),
    "nextFollowUp" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentOpenHouse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agentId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "virtualLink" TEXT,
    "rsvpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxAttendees" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentOpenHouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "commissionBasic" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "commissionPro" DECIMAL(10,2) NOT NULL DEFAULT 10,
    "commissionEnterprise" DECIMAL(10,2) NOT NULL DEFAULT 25,
    "paymentMethod" TEXT,
    "paymentEmail" TEXT,
    "paymentPhone" TEXT,
    "bankAccountLast4" TEXT,
    "minimumPayout" DECIMAL(10,2) NOT NULL DEFAULT 25,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalSignups" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliateId" UUID NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrerUrl" TEXT,
    "landingPage" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliateId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "subscriptionTier" TEXT NOT NULL,
    "subscriptionPrice" DECIMAL(10,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "commissionStatus" TEXT NOT NULL DEFAULT 'pending',
    "pendingUntil" TIMESTAMP(6) NOT NULL,
    "approvedAt" TIMESTAMP(6),
    "paidAt" TIMESTAMP(6),
    "payoutId" UUID,
    "cancelledAt" TIMESTAMP(6),
    "cancellationReason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringMonths" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePayout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "affiliateId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "failedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliatePayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorAuth" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "secretEncrypted" TEXT NOT NULL,
    "backupCodesEncrypted" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(6),
    "lastUsedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "userId" UUID,
    "landlordId" UUID,
    "resourceType" TEXT,
    "resourceId" UUID,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(6) NOT NULL,
    "windowEnd" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "userId" UUID,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "visitorId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVisits" INTEGER NOT NULL DEFAULT 1,
    "totalPageViews" INTEGER NOT NULL DEFAULT 0,
    "firstUtmSource" TEXT,
    "firstUtmMedium" TEXT,
    "firstUtmCampaign" TEXT,
    "firstReferrer" TEXT,
    "firstLandingPath" TEXT,
    "lastUtmSource" TEXT,
    "userId" UUID,

    CONSTRAINT "VisitorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronRunLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "message" TEXT,
    "error" TEXT,

    CONSTRAINT "CronRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundWebhookEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "error" TEXT,
    "durationMs" INTEGER,
    "signatureOk" BOOLEAN,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitivePIIAccess" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID NOT NULL,
    "subjectUserId" UUID,
    "subjectLandlordId" UUID,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitivePIIAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "landlordId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrerLandlordId" UUID NOT NULL,
    "referredLandlordId" UUID NOT NULL,
    "referralCodeId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rewardAmount" DECIMAL(10,2),
    "completedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCredit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "usedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscribedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(6),
    "metadata" JSON,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caseNumber" TEXT NOT NULL,
    "landlordId" UUID NOT NULL,
    "contractorId" UUID,
    "homeownerId" UUID,
    "workOrderId" UUID,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "disputedAmount" DECIMAL(12,2),
    "resolvedAmount" DECIMAL(12,2),
    "escrowHeld" DECIMAL(12,2),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "desiredResolution" TEXT,
    "resolution" TEXT,
    "resolutionType" TEXT,
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(6),
    "assignedToId" UUID,
    "assignedAt" TIMESTAMP(6),
    "responseDeadline" TIMESTAMP(6),
    "resolutionDeadline" TIMESTAMP(6),
    "filedById" UUID NOT NULL,
    "filedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeEvidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeTimeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "performedById" UUID NOT NULL,
    "metadata" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "keyHash" VARCHAR(255) NOT NULL,
    "keyPrefix" VARCHAR(12) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 3600,
    "lastUsedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "description" VARCHAR(500),
    "secret" VARCHAR(255) NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(10) NOT NULL DEFAULT 'v1',
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(6),
    "lastFailureAt" TIMESTAMP(6),
    "lastFailureReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhookEndpointId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "httpStatus" INTEGER,
    "responseBody" TEXT,
    "responseTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(6),
    "deliveredAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "apiKeyId" UUID,
    "landlordId" UUID NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorApiKey" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "keyHash" VARCHAR(255) NOT NULL,
    "keyPrefix" VARCHAR(12) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "rateLimitWindow" INTEGER NOT NULL DEFAULT 3600,
    "lastUsedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorWebhookEndpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "description" VARCHAR(500),
    "secret" VARCHAR(255) NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastSuccessAt" TIMESTAMP(6),
    "lastFailureAt" TIMESTAMP(6),
    "lastFailureReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorQBConnection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "realmId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "oauthState" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(6),
    "companyName" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorQBConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSubcontractorPayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "subcontractorId" UUID NOT NULL,
    "assignmentId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'check',
    "referenceNumber" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorSubcontractorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "landlordId" UUID,
    "contractorId" UUID,
    "stripeConnectedAccountId" VARCHAR(255) NOT NULL,
    "stripeFinancialAccountId" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "routingNumber" VARCHAR(20),
    "accountNumberLast4" VARCHAR(4),
    "bankName" VARCHAR(100),
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "activeFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAccountTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "financialAccountId" UUID NOT NULL,
    "stripeTransactionId" VARCHAR(255),
    "type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "counterpartyName" VARCHAR(255),
    "counterpartyType" VARCHAR(50),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuingCardholder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "landlordId" UUID,
    "contractorProfileId" UUID,
    "stripeConnectedAccountId" VARCHAR(255) NOT NULL,
    "stripeCardholderId" VARCHAR(255) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuingCardholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuingCard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cardholderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "landlordId" UUID,
    "contractorProfileId" UUID,
    "financialAccountId" UUID NOT NULL,
    "stripeConnectedAccountId" VARCHAR(255) NOT NULL,
    "stripeCardId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "last4" VARCHAR(4),
    "brand" VARCHAR(20),
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "monthlyLimitCents" BIGINT,
    "blockedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shippingStatus" VARCHAR(40),
    "shippingTrackingNumber" VARCHAR(255),
    "shippingCarrier" VARCHAR(40),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuingCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuingAuthorization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stripeAuthId" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "approved" BOOLEAN NOT NULL,
    "merchantName" VARCHAR(255),
    "merchantCategory" VARCHAR(80),
    "merchantCity" VARCHAR(80),
    "merchantState" VARCHAR(40),
    "merchantCountry" VARCHAR(4),
    "declineReason" VARCHAR(80),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuingAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuingTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cardId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stripeTransactionId" VARCHAR(255) NOT NULL,
    "stripeAuthId" VARCHAR(255),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'usd',
    "type" VARCHAR(40) NOT NULL,
    "merchantName" VARCHAR(255),
    "merchantCategory" VARCHAR(80),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "bio" TEXT,
    "profilePhoto" TEXT,
    "coverPhoto" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceRadius" INTEGER,
    "baseCity" TEXT,
    "baseState" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "insuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceExpiry" TIMESTAMP(6),
    "backgroundChecked" BOOLEAN NOT NULL DEFAULT false,
    "portfolioImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "portfolioVideos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availabilityNotes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "acceptingNewWork" BOOLEAN NOT NULL DEFAULT true,
    "minimumJobSize" DECIMAL(12,2),
    "hourlyRate" DECIMAL(10,2),
    "rankScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "completedJobs" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeatClientRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "taxId" TEXT,
    "verifiedPhone" TEXT,
    "licenseVerifiedAt" TIMESTAMP(6),
    "licenseExpiresAt" TIMESTAMP(6),
    "licenseVerificationData" JSON,
    "insuranceCertificateUrl" TEXT,
    "insuranceCoverageAmount" DECIMAL(12,2),
    "insuranceProvider" TEXT,
    "backgroundCheckId" TEXT,
    "backgroundCheckDate" TIMESTAMP(6),
    "backgroundCheckExpires" TIMESTAMP(6),
    "identityVerificationId" TEXT,
    "identityVerifiedAt" TIMESTAMP(6),
    "instantBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "depositRequired" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(10,2),
    "depositPercent" DECIMAL(5,2),
    "cancellationPolicy" TEXT,
    "cancellationHours" INTEGER NOT NULL DEFAULT 24,
    "googleCalendarToken" TEXT,
    "googleCalendarId" TEXT,
    "outlookCalendarToken" TEXT,
    "outlookCalendarId" TEXT,
    "subscriptionTier" TEXT DEFAULT 'starter',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "currentPeriodStart" TIMESTAMP(6),
    "currentPeriodEnd" TIMESTAMP(6),
    "subscriptionEndsAt" TIMESTAMP(6),
    "trialStartDate" TIMESTAMP(6),
    "trialEndDate" TIMESTAMP(6),
    "trialStatus" TEXT NOT NULL DEFAULT 'trialing',
    "gracePeriodsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastGracePeriodDate" TIMESTAMP(6),
    "lastReminderSentAt" TIMESTAMP(6),
    "trialRemindersSent" JSON,
    "stripeConnectAccountId" TEXT,
    "stripeOnboardingStatus" TEXT,
    "isPaymentReady" BOOLEAN NOT NULL DEFAULT false,
    "subdomain" TEXT,
    "logoUrl" TEXT,
    "themeColor" TEXT DEFAULT 'violet',
    "heroImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aboutBio" TEXT,
    "aboutPhoto" TEXT,
    "aboutGallery" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featureCard1Title" TEXT,
    "featureCard1Description" TEXT,
    "featureCard1Icon" TEXT DEFAULT 'zap',
    "featureCard2Title" TEXT,
    "featureCard2Description" TEXT,
    "featureCard2Icon" TEXT DEFAULT 'dollar-sign',
    "featureCard3Title" TEXT,
    "featureCard3Description" TEXT,
    "featureCard3Icon" TEXT DEFAULT 'shield',
    "featureCard4Title" TEXT,
    "featureCard4Description" TEXT,
    "featureCard4Icon" TEXT DEFAULT 'clock',
    "featureCard5Title" TEXT,
    "featureCard5Description" TEXT,
    "featureCard5Icon" TEXT DEFAULT 'smartphone',
    "featureCard6Title" TEXT,
    "featureCard6Description" TEXT,
    "featureCard6Icon" TEXT DEFAULT 'briefcase',
    "featuredUntil" TIMESTAMP(6),
    "visibilityCredits" INTEGER NOT NULL DEFAULT 0,
    "newContractorBoostUntil" TIMESTAMP(6),
    "lastActiveAt" TIMESTAMP(6),
    "profileCompletionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorUsageTracking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "activeJobsCount" INTEGER NOT NULL DEFAULT 0,
    "invoicesThisMonth" INTEGER NOT NULL DEFAULT 0,
    "totalCustomers" INTEGER NOT NULL DEFAULT 0,
    "teamMembersCount" INTEGER NOT NULL DEFAULT 0,
    "inventoryCount" INTEGER NOT NULL DEFAULT 0,
    "equipmentCount" INTEGER NOT NULL DEFAULT 0,
    "activeLeadsCount" INTEGER NOT NULL DEFAULT 0,
    "lastResetDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorUsageTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorNotification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTeamChannel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'public',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorTeamChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTeamChannelMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channelId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "lastReadAt" TIMESTAMP(6),
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorTeamChannelMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTeamMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channelId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorTeamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyFeeSettings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "propertyId" UUID NOT NULL,
    "landlordId" UUID NOT NULL,
    "securityDepositMonths" DECIMAL(3,1),
    "noSecurityDeposit" BOOLEAN NOT NULL DEFAULT false,
    "lastMonthRentRequired" BOOLEAN,
    "petDepositEnabled" BOOLEAN,
    "petDepositAmount" DECIMAL(12,2),
    "petRentEnabled" BOOLEAN,
    "petRentAmount" DECIMAL(12,2),
    "noPetFees" BOOLEAN NOT NULL DEFAULT false,
    "cleaningFeeEnabled" BOOLEAN,
    "cleaningFeeAmount" DECIMAL(12,2),
    "noCleaningFee" BOOLEAN NOT NULL DEFAULT false,
    "applicationFeeEnabled" BOOLEAN,
    "applicationFeeAmount" DECIMAL(12,2),
    "noApplicationFee" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeEnabled" BOOLEAN,
    "gracePeriodDays" INTEGER,
    "lateFeeType" TEXT,
    "lateFeeAmount" DECIMAL(12,2),
    "lateFeeMaxFee" DECIMAL(12,2),
    "noLateFees" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyFeeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLead" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT NOT NULL DEFAULT 'marketplace',
    "sourceId" UUID,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerUserId" UUID,
    "projectType" TEXT NOT NULL,
    "projectTitle" TEXT,
    "projectDescription" TEXT NOT NULL,
    "projectPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "timeline" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'normal',
    "propertyAddress" TEXT,
    "propertyCity" TEXT,
    "propertyState" TEXT,
    "propertyZip" TEXT,
    "propertyType" TEXT,
    "leadScore" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "maxContractors" INTEGER NOT NULL DEFAULT 3,
    "assignedToId" UUID,
    "stage" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'warm',
    "lastContactDate" TIMESTAMP(6),
    "nextFollowUpDate" TIMESTAMP(6),
    "lostReason" TEXT,
    "convertedToJobId" UUID,
    "emailOpens" INTEGER NOT NULL DEFAULT 0,
    "emailClicks" INTEGER NOT NULL DEFAULT 0,
    "estimateViews" INTEGER NOT NULL DEFAULT 0,
    "websiteVisits" INTEGER NOT NULL DEFAULT 0,
    "responseTime" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLeadMatch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "pricingModel" TEXT NOT NULL DEFAULT 'per_lead',
    "leadCost" DECIMAL(10,2),
    "bookingFeePercent" DECIMAL(5,2),
    "matchScore" INTEGER NOT NULL DEFAULT 0,
    "matchReason" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "quotedAt" TIMESTAMP(3),
    "responseMessage" TEXT,
    "quoteAmount" DECIMAL(12,2),
    "quoteNotes" TEXT,
    "estimatedDuration" TEXT,
    "wasBooked" BOOLEAN NOT NULL DEFAULT false,
    "jobValue" DECIMAL(12,2),
    "bookingFee" DECIMAL(10,2),
    "completedAt" TIMESTAMP(3),
    "refundRequested" BOOLEAN NOT NULL DEFAULT false,
    "refundApproved" BOOLEAN NOT NULL DEFAULT false,
    "refundReason" TEXT,
    "refundAmount" DECIMAL(10,2),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorLeadMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLeadCredit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "creditBalance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "subscriptionTier" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'none',
    "leadsIncluded" INTEGER NOT NULL DEFAULT 0,
    "leadsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "billingCycleStart" TIMESTAMP(3),
    "preferredPricing" TEXT NOT NULL DEFAULT 'per_lead',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "maxLeadCost" DECIMAL(10,2),
    "autoAcceptLeads" BOOLEAN NOT NULL DEFAULT false,
    "leadNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorLeadCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorCreditTransaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creditAccountId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "leadMatchId" UUID,
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorCreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLeadPreferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "acceptedTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minJobValue" DECIMAL(12,2),
    "maxJobValue" DECIMAL(12,2),
    "serviceZipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceRadius" INTEGER,
    "acceptEmergency" BOOLEAN NOT NULL DEFAULT true,
    "acceptWeekends" BOOLEAN NOT NULL DEFAULT false,
    "maxLeadsPerDay" INTEGER,
    "maxLeadsPerWeek" INTEGER,
    "residentialOnly" BOOLEAN NOT NULL DEFAULT false,
    "commercialOnly" BOOLEAN NOT NULL DEFAULT false,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorLeadPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorAppointment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "address" JSON NOT NULL,
    "startTime" TIMESTAMP(6) NOT NULL,
    "endTime" TIMESTAMP(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "cancelledAt" TIMESTAMP(6),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "depositAmount" DECIMAL(10,2),
    "depositPaid" BOOLEAN NOT NULL DEFAULT false,
    "depositPaymentId" TEXT,
    "escrowStatus" TEXT NOT NULL DEFAULT 'none',
    "escrowReleasedAt" TIMESTAMP(6),
    "escrowRefundedAt" TIMESTAMP(6),
    "autoReleaseAt" TIMESTAMP(6),
    "platformFee" DECIMAL(10,2),
    "completedAt" TIMESTAMP(6),
    "customerConfirmedAt" TIMESTAMP(6),
    "disputeReason" TEXT,
    "disputeFiledAt" TIMESTAMP(6),
    "jobId" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" TEXT NOT NULL,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "lineItems" JSON[] DEFAULT ARRAY[]::JSON[],
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2),
    "taxAmount" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "depositPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(6),
    "viewedAt" TIMESTAMP(6),
    "paidAt" TIMESTAMP(6),
    "dueDate" TIMESTAMP(6) NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paymentLink" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "jobId" UUID,
    "appointmentId" UUID,
    "qbInvoiceId" TEXT,
    "lastReminderAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInvoicePayment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorCustomer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" JSON,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" JSON[] DEFAULT ARRAY[]::JSON[],
    "totalJobs" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastContactedAt" TIMESTAMP(6),
    "lastJobAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorAvailability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "mondayStart" TEXT,
    "mondayEnd" TEXT,
    "mondayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tuesdayStart" TEXT,
    "tuesdayEnd" TEXT,
    "tuesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wednesdayStart" TEXT,
    "wednesdayEnd" TEXT,
    "wednesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "thursdayStart" TEXT,
    "thursdayEnd" TEXT,
    "thursdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fridayStart" TEXT,
    "fridayEnd" TEXT,
    "fridayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "saturdayStart" TEXT,
    "saturdayEnd" TEXT,
    "saturdayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sundayStart" TEXT,
    "sundayEnd" TEXT,
    "sundayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 60,
    "blockedDates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobGuaranteeHold" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "heldAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releaseAt" TIMESTAMP(6) NOT NULL,
    "releasedAt" TIMESTAMP(6),
    "disputeId" UUID,
    "stripeTransferId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobGuaranteeHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "timeOnPage" INTEGER,
    "scrollDepth" INTEGER,
    "exitPage" BOOLEAN NOT NULL DEFAULT false,
    "bounced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClickEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "path" TEXT NOT NULL,
    "elementId" TEXT,
    "elementClass" TEXT,
    "elementTag" TEXT,
    "elementText" TEXT,
    "xPosition" INTEGER,
    "yPosition" INTEGER,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "startTime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionType" TEXT,
    "conversionValue" DECIMAL(12,2),
    "landingPage" TEXT,
    "exitPage" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormInteraction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "formId" TEXT NOT NULL,
    "formName" TEXT,
    "fieldName" TEXT,
    "action" TEXT NOT NULL,
    "timeSpent" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionFunnel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" TEXT NOT NULL,
    "userId" UUID,
    "step" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "timeToComplete" INTEGER,
    "metadata" JSON,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionFunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),

    CONSTRAINT "SystemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "payload" JSON NOT NULL,
    "scheduledFor" TIMESTAMP(6) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "customerId" UUID,
    "leadId" UUID,
    "jobNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "jobType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'quoted',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "coordinates" JSON,
    "estimatedCost" DECIMAL(12,2),
    "actualCost" DECIMAL(12,2),
    "laborCost" DECIMAL(12,2),
    "materialCost" DECIMAL(12,2),
    "profitMargin" DECIMAL(5,2),
    "estimatedStartDate" TIMESTAMP(6),
    "estimatedEndDate" TIMESTAMP(6),
    "actualStartDate" TIMESTAMP(6),
    "actualEndDate" TIMESTAMP(6),
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "assignedEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "leadTechnicianId" UUID,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "beforePhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afterPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerRating" INTEGER,
    "customerReview" TEXT,
    "reviewedAt" TIMESTAMP(6),
    "notes" TEXT,
    "internalNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorShift" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "jobId" UUID,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorEmployee" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "userId" UUID,
    "roleId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "role" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL DEFAULT 'w2',
    "status" TEXT NOT NULL DEFAULT 'active',
    "hireDate" TIMESTAMP(6) NOT NULL,
    "terminationDate" TIMESTAMP(6),
    "terminationReason" TEXT,
    "inviteToken" TEXT,
    "inviteExpiry" TIMESTAMP(6),
    "invitedAt" TIMESTAMP(6),
    "onboardedAt" TIMESTAMP(6),
    "payRate" DECIMAL(10,2) NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "paySchedule" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(6),
    "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "onTimeRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "canManageJobs" BOOLEAN NOT NULL DEFAULT false,
    "canManageCustomers" BOOLEAN NOT NULL DEFAULT false,
    "customPermissions" JSON,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTimeEntry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "employeeId" UUID,
    "jobId" UUID,
    "clockIn" TIMESTAMP(6) NOT NULL,
    "clockOut" TIMESTAMP(6),
    "duration" INTEGER,
    "clockInLocation" JSON,
    "clockOutLocation" JSON,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "billableHours" DECIMAL(5,2),
    "hourlyRate" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorExpense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "vendor" TEXT,
    "expenseDate" TIMESTAMP(6) NOT NULL,
    "receiptUrl" TEXT,
    "receiptScanned" BOOLEAN NOT NULL DEFAULT false,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "billed" BOOLEAN NOT NULL DEFAULT false,
    "taxDeductible" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "paidBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "qbPurchaseId" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJobAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'technician',
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(6) NOT NULL,
    "endDate" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorJobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorChangeOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reason" TEXT,
    "additionalCost" DECIMAL(12,2) NOT NULL,
    "additionalHours" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(6),
    "signatureUrl" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJobMilestone" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(6),
    "completedBy" UUID,
    "paymentAmount" DECIMAL(12,2),
    "paymentDue" BOOLEAN NOT NULL DEFAULT false,
    "paymentPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorJobMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJobNote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'general',
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorJobNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorMarketingCampaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "templateId" TEXT,
    "targetAudience" TEXT NOT NULL,
    "customerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledFor" TIMESTAMP(6),
    "sentAt" TIMESTAMP(6),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "bounced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorMarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorReferral" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "referredId" UUID,
    "referredName" TEXT NOT NULL,
    "referredEmail" TEXT,
    "referredPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "convertedAt" TIMESTAMP(6),
    "jobValue" DECIMAL(12,2),
    "rewardType" TEXT,
    "rewardAmount" DECIMAL(10,2),
    "rewardGiven" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorBlockedDate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "startDate" TIMESTAMP(6) NOT NULL,
    "endDate" TIMESTAMP(6) NOT NULL,
    "reason" TEXT,
    "isAllDay" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorBlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorServiceDuration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "serviceName" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorServiceDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorQuote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "leadId" UUID NOT NULL,
    "leadMatchId" UUID,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectScope" TEXT,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startDate" TIMESTAMP(6),
    "completionDate" TIMESTAMP(6),
    "estimatedHours" DECIMAL(10,2),
    "hourlyRate" DECIMAL(10,2),
    "basePrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountPercent" DECIMAL(5,2),
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "paymentTerms" TEXT,
    "warranty" TEXT,
    "notes" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "validUntil" TIMESTAMP(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "counterOfferCount" INTEGER NOT NULL DEFAULT 0,
    "lastCounterOfferAt" TIMESTAMP(6),
    "acceptedAt" TIMESTAMP(6),
    "rejectedAt" TIMESTAMP(6),
    "rejectionReason" TEXT,
    "bookingCreatedAt" TIMESTAMP(6),
    "bookingId" UUID,
    "viewedAt" TIMESTAMP(6),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorQuoteCounter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "originalQuoteId" UUID NOT NULL,
    "counterType" TEXT NOT NULL,
    "counterBy" UUID NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "deliveryDate" TIMESTAMP(6),
    "description" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "acceptedAt" TIMESTAMP(6),
    "rejectedAt" TIMESTAMP(6),
    "validUntil" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "ContractorQuoteCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorQuoteMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quoteId" UUID NOT NULL,
    "fromId" UUID NOT NULL,
    "toId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorQuoteMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorBid" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "bidAmount" DECIMAL(12,2) NOT NULL,
    "bidMessage" TEXT,
    "deliveryDays" INTEGER,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "acceptedAt" TIMESTAMP(6),
    "rejectedAt" TIMESTAMP(6),
    "autoAccept" BOOLEAN NOT NULL DEFAULT false,
    "acceptTerms" TEXT,
    "validUntil" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorVerification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verifiedAt" TIMESTAMP(6),
    "identityStatus" TEXT NOT NULL DEFAULT 'not_started',
    "identityProvider" TEXT,
    "identityVerificationId" TEXT,
    "identityVerifiedAt" TIMESTAMP(6),
    "identityDocumentType" TEXT,
    "identityDocumentUrl" TEXT,
    "identityRejectionReason" TEXT,
    "licenseStatus" TEXT NOT NULL DEFAULT 'not_started',
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseType" TEXT,
    "licenseDocumentUrl" TEXT,
    "licenseVerifiedAt" TIMESTAMP(6),
    "licenseExpiresAt" TIMESTAMP(6),
    "licenseVerificationData" JSON,
    "licenseRejectionReason" TEXT,
    "insuranceStatus" TEXT NOT NULL DEFAULT 'not_started',
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceCoverageAmount" DECIMAL(12,2),
    "insuranceCertificateUrl" TEXT,
    "insuranceVerifiedAt" TIMESTAMP(6),
    "insuranceExpiresAt" TIMESTAMP(6),
    "insuranceRejectionReason" TEXT,
    "backgroundCheckStatus" TEXT NOT NULL DEFAULT 'not_started',
    "backgroundCheckProvider" TEXT,
    "backgroundCheckId" TEXT,
    "backgroundCheckDate" TIMESTAMP(6),
    "backgroundCheckExpires" TIMESTAMP(6),
    "backgroundCheckResult" TEXT,
    "backgroundCheckData" JSON,
    "backgroundCheckRejectionReason" TEXT,
    "taxIdStatus" TEXT NOT NULL DEFAULT 'not_started',
    "taxIdType" TEXT,
    "taxIdLast4" TEXT,
    "taxIdVerifiedAt" TIMESTAMP(6),
    "taxIdRejectionReason" TEXT,
    "bankAccountStatus" TEXT NOT NULL DEFAULT 'not_started',
    "bankAccountVerified" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountVerifiedAt" TIMESTAMP(6),
    "stripeAccountId" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "reviewNotes" TEXT,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ContractorVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorVerificationDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "reviewNotes" TEXT,
    "uploadedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(6),

    CONSTRAINT "ContractorVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSON NOT NULL,
    "emailAlerts" BOOLEAN NOT NULL DEFAULT false,
    "alertFrequency" TEXT NOT NULL DEFAULT 'daily',
    "lastAlertSent" TIMESTAMP(6),
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewed" TIMESTAMP(6),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteContractor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteContractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPortfolioItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "projectDate" TIMESTAMP(6),
    "location" TEXT,
    "budget" DECIMAL(12,2),
    "duration" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ContractorPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorReview" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "jobId" UUID,
    "overallRating" DECIMAL(2,1) NOT NULL,
    "qualityRating" DECIMAL(2,1),
    "communicationRating" DECIMAL(2,1),
    "timelinessRating" DECIMAL(2,1),
    "professionalismRating" DECIMAL(2,1),
    "valueRating" DECIMAL(2,1),
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "pros" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectType" TEXT,
    "projectCost" DECIMAL(12,2),
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "contractorResponse" TEXT,
    "respondedAt" TIMESTAMP(6),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "ContractorReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewHelpful" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reviewId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewHelpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSON NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorCommunication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "leadId" UUID,
    "customerId" UUID,
    "employeeId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(6),
    "clickedAt" TIMESTAMP(6),
    "respondedAt" TIMESTAMP(6),
    "metadata" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInventoryItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "vendorId" UUID,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "unitCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "warehouseQuantity" INTEGER NOT NULL DEFAULT 0,
    "truckQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "reorderLevel" INTEGER,
    "reorderQty" INTEGER,
    "autoReorder" BOOLEAN NOT NULL DEFAULT false,
    "lastReorderDate" TIMESTAMP(6),
    "reorderFrequency" TEXT,
    "supplier" TEXT,
    "supplierSku" TEXT,
    "location" TEXT,
    "qrCode" TEXT,
    "barcode" TEXT,
    "warehouseZone" TEXT,
    "warehouseAisle" TEXT,
    "warehouseShelf" TEXT,
    "warehouseBin" TEXT,
    "averageMonthlyUsage" INTEGER,
    "lastUsedDate" TIMESTAMP(6),
    "lastReceivedDate" TIMESTAMP(6),
    "standardJobQuantity" INTEGER,
    "isConsumable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "photo" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInventoryUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "jobId" UUID,
    "quantityUsed" INTEGER NOT NULL,
    "usedDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInventoryReorder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "vendorId" UUID,
    "quantityOrdered" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "orderDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(6),
    "receivedDate" TIMESTAMP(6),
    "orderNumber" TEXT,
    "trackingNumber" TEXT,
    "notes" TEXT,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorInventoryReorder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTruck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "licensePlate" TEXT,
    "vin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "maxWeight" INTEGER,
    "maxVolume" INTEGER,
    "assignedDriverId" UUID,
    "currentJobId" UUID,
    "lastServiceDate" TIMESTAMP(6),
    "nextServiceDate" TIMESTAMP(6),
    "odometerReading" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorTruck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTruckInventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "truckId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "loadedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadedBy" UUID,
    "status" TEXT NOT NULL DEFAULT 'loaded',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorTruckInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTruckLoad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "truckId" UUID NOT NULL,
    "jobId" UUID,
    "type" TEXT NOT NULL,
    "items" JSON NOT NULL,
    "loadedBy" UUID,
    "loadedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorTruckLoad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJobMaterial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantityNeeded" INTEGER NOT NULL,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantityLoaded" INTEGER NOT NULL DEFAULT 0,
    "quantityUsed" INTEGER NOT NULL DEFAULT 0,
    "quantityReturned" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "reservedAt" TIMESTAMP(6),
    "loadedAt" TIMESTAMP(6),
    "usedAt" TIMESTAMP(6),
    "unitCostAtTime" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorJobMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorInventoryReceiving" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "reorderId" UUID,
    "quantityReceived" INTEGER NOT NULL,
    "quantityExpected" INTEGER,
    "receivedBy" UUID,
    "receivedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseZone" TEXT,
    "warehouseAisle" TEXT,
    "warehouseShelf" TEXT,
    "warehouseBin" TEXT,
    "qualityChecked" BOOLEAN NOT NULL DEFAULT false,
    "qualityStatus" TEXT,
    "damageNotes" TEXT,
    "poNumber" TEXT,
    "invoiceNumber" TEXT,
    "packingSlip" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorInventoryReceiving_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorEquipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(6),
    "purchasePrice" DECIMAL(12,2),
    "currentValue" DECIMAL(12,2),
    "warrantyExpiry" TIMESTAMP(6),
    "assignedToId" UUID,
    "assignedToName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "condition" TEXT,
    "qrCode" TEXT,
    "location" TEXT,
    "maintenanceSchedule" TEXT,
    "lastMaintenanceDate" TIMESTAMP(6),
    "nextMaintenanceDate" TIMESTAMP(6),
    "maintenanceNotes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorVendor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "category" TEXT NOT NULL,
    "taxId" TEXT,
    "paymentTerms" TEXT,
    "discount" DECIMAL(5,2),
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorTimeOff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(6) NOT NULL,
    "endDate" TIMESTAMP(6) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(6),
    "denialReason" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorCertification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "employeeId" UUID,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(6) NOT NULL,
    "expiryDate" TIMESTAMP(6),
    "certificateNumber" TEXT,
    "documentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorIncidentReport" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID,
    "employeeId" UUID,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "incidentDate" TIMESTAMP(6) NOT NULL,
    "witnesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "injuredParty" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actionTaken" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNotes" TEXT,
    "reportedBy" UUID NOT NULL,
    "reportedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oshaReportable" BOOLEAN NOT NULL DEFAULT false,
    "oshaReported" BOOLEAN NOT NULL DEFAULT false,
    "oshaReportDate" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorIncidentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEscrow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorJobId" UUID NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "contractorAmount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentId" TEXT,
    "fundedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobEscrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobMilestone" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escrowId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requireGPS" BOOLEAN NOT NULL DEFAULT false,
    "requirePhotos" BOOLEAN NOT NULL DEFAULT false,
    "minPhotos" INTEGER NOT NULL DEFAULT 0,
    "requireSignature" BOOLEAN NOT NULL DEFAULT false,
    "gpsVerified" BOOLEAN NOT NULL DEFAULT false,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "gpsAddress" TEXT,
    "gpsVerifiedAt" TIMESTAMP(6),
    "photosUploaded" INTEGER NOT NULL DEFAULT 0,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoPublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contractorSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractorSignedAt" TIMESTAMP(6),
    "contractorSignature" TEXT,
    "customerSigned" BOOLEAN NOT NULL DEFAULT false,
    "customerSignedAt" TIMESTAMP(6),
    "customerSignature" TEXT,
    "completedAt" TIMESTAMP(6),
    "releasedAt" TIMESTAMP(6),
    "autoReleaseAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowRelease" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escrowId" UUID NOT NULL,
    "milestoneId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "platformFee" DECIMAL(12,2) NOT NULL,
    "contractorAmount" DECIMAL(12,2) NOT NULL,
    "releaseType" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "releasedBy" UUID,
    "releasedAt" TIMESTAMP(6),
    "completedAt" TIMESTAMP(6),
    "failureReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowDispute" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "escrowId" UUID NOT NULL,
    "milestoneId" UUID,
    "filedBy" UUID NOT NULL,
    "filedByRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidencePublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolutionNotes" TEXT,
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPurchaseOrder" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "vendorId" UUID,
    "jobId" UUID,
    "subcontractorId" UUID,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "shipping" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "orderDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiredDate" TIMESTAMP(6),
    "deliveryDate" TIMESTAMP(6),
    "deliveryAddress" TEXT,
    "deliveryCity" TEXT,
    "deliveryState" TEXT,
    "deliveryZip" TEXT,
    "deliveryInstructions" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPurchaseOrderItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "poId" UUID NOT NULL,
    "itemName" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "quantityOrdered" DECIMAL(10,2) NOT NULL,
    "quantityReceived" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantityBackordered" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "inventoryItemId" UUID,
    "notes" TEXT,

    CONSTRAINT "ContractorPurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorWarranty" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID,
    "customerId" UUID NOT NULL,
    "invoiceId" UUID,
    "warrantyNumber" TEXT NOT NULL,
    "warrantyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverage" TEXT,
    "exclusions" TEXT,
    "startDate" TIMESTAMP(6) NOT NULL,
    "endDate" TIMESTAMP(6) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "reminderSent30" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent60" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent90" BOOLEAN NOT NULL DEFAULT false,
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorWarrantyClaim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warrantyId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "issueDescription" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteVisitDate" TIMESTAMP(6),
    "resolution" TEXT,
    "resolutionDate" TIMESTAMP(6),
    "costToRepair" DECIMAL(12,2),
    "isValidClaim" BOOLEAN,
    "denialReason" TEXT,
    "photosBefore" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photosAfter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ContractorWarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSubcontractor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "insuranceExpiry" TIMESTAMP(6),
    "taxId" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" DECIMAL(3,2),
    "status" TEXT NOT NULL DEFAULT 'active',
    "paymentTerms" TEXT NOT NULL DEFAULT 'net_30',
    "preferredPayment" TEXT NOT NULL DEFAULT 'check',
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankRoutingNumber" TEXT,
    "bankName" TEXT,
    "insuranceCertificate" TEXT,
    "w9Form" TEXT,
    "contracts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorSubcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSubcontractorAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "subcontractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "agreedPrice" DECIMAL(12,2) NOT NULL,
    "estimatedHours" INTEGER,
    "startDate" TIMESTAMP(6),
    "endDate" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "paymentTerms" TEXT NOT NULL DEFAULT 'net_30',
    "paymentMethod" TEXT NOT NULL DEFAULT 'check',
    "actualHours" INTEGER,
    "finalPrice" DECIMAL(12,2),
    "completedDate" TIMESTAMP(6),
    "qualityRating" INTEGER,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidAmount" DECIMAL(12,2),
    "paidDate" TIMESTAMP(6),
    "contractUrl" TEXT,
    "completionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "ContractorSubcontractorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSafetyChecklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorSafetyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSafetyChecklistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "checklistId" UUID NOT NULL,
    "itemText" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ContractorSafetyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorSafetyChecklistCompletion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "checklistId" UUID NOT NULL,
    "jobId" UUID,
    "employeeId" UUID,
    "completedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" JSONB,
    "responses" JSONB NOT NULL,
    "allItemsChecked" BOOLEAN NOT NULL,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "correctiveAction" TEXT,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "approved" BOOLEAN,

    CONSTRAINT "ContractorSafetyChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorJobPhoto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail" TEXT,
    "caption" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "takenAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenBy" UUID,
    "location" JSONB,
    "milestoneId" UUID,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibleToCustomer" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContractorJobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorContract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "jobId" UUID,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'service_agreement',
    "body" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "contractorName" TEXT NOT NULL,
    "contractorEmail" TEXT NOT NULL,
    "contractorPhone" TEXT,
    "contractAmount" DECIMAL(12,2),
    "depositAmount" DECIMAL(12,2),
    "paymentTerms" TEXT,
    "token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sentAt" TIMESTAMP(6),
    "viewedAt" TIMESTAMP(6),
    "signedAt" TIMESTAMP(6),
    "declinedAt" TIMESTAMP(6),
    "expiresAt" TIMESTAMP(6),
    "customerSignatureDataUrl" TEXT,
    "customerSignedIp" TEXT,
    "customerSignedUserAgent" TEXT,
    "customerSignedName" TEXT,
    "contractorSignatureDataUrl" TEXT,
    "contractorSignedAt" TIMESTAMP(6),
    "signedPdfUrl" TEXT,
    "declineReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorContractEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorName" TEXT,
    "actorIp" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorFinancialSummary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "invoicedRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "jobRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesMaterials" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesTools" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesFuel" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesSubcontractor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesPermits" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expensesOther" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPayroll" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalNetPayroll" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subcontractorPayments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subcontractorCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorFinancialSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPayroll" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "payDate" DATE NOT NULL,
    "paySchedule" TEXT NOT NULL DEFAULT 'biweekly',
    "totalGrossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalNetPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "runAt" TIMESTAMP(6),
    "runBy" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPaycheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payrollId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "regularHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "overtimeHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "payRate" DECIMAL(10,2) NOT NULL,
    "overtimeRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ptoHours" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "ptoPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "regularPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtimePay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" JSON NOT NULL DEFAULT '[]',
    "totalDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "paidAt" TIMESTAMP(6),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stubUrl" TEXT,
    "timeEntryIds" UUID[] DEFAULT ARRAY[]::UUID[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorPaycheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorDispatchBoard" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultView" TEXT NOT NULL DEFAULT 'week',
    "filters" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorDispatchBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLabelConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "labelType" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT,
    "suffix" TEXT,
    "sequenceType" TEXT NOT NULL DEFAULT 'sequential',
    "currentSeq" INTEGER NOT NULL DEFAULT 0,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "startAt" INTEGER NOT NULL DEFAULT 1,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showBarcode" BOOLEAN NOT NULL DEFAULT true,
    "showLocation" BOOLEAN NOT NULL DEFAULT true,
    "showDate" BOOLEAN NOT NULL DEFAULT true,
    "showQty" BOOLEAN NOT NULL DEFAULT true,
    "showItemName" BOOLEAN NOT NULL DEFAULT true,
    "showSku" BOOLEAN NOT NULL DEFAULT true,
    "showNotes" BOOLEAN NOT NULL DEFAULT false,
    "labelSize" TEXT NOT NULL DEFAULT '4x6',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorLabelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorLabel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "configId" UUID,
    "itemId" UUID,
    "labelNumber" TEXT NOT NULL,
    "labelType" TEXT NOT NULL,
    "description" TEXT,
    "itemName" TEXT,
    "sku" TEXT,
    "quantity" INTEGER,
    "unit" TEXT,
    "warehouseZone" TEXT,
    "warehouseAisle" TEXT,
    "warehouseShelf" TEXT,
    "warehouseBin" TEXT,
    "shipmentId" UUID,
    "receivingId" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "printedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printedCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorShipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "destinationType" TEXT,
    "destinationId" TEXT,
    "destinationName" TEXT,
    "destinationAddress" TEXT,
    "fromWarehouseZone" TEXT,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(6),
    "deliveredAt" TIMESTAMP(6),
    "notes" TEXT,
    "shipDate" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorShipmentItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipmentId" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "quantityShipped" INTEGER NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "fromZone" TEXT,
    "fromAisle" TEXT,
    "fromShelf" TEXT,
    "fromBin" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorHiringPost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "roleId" UUID,
    "employeeType" TEXT NOT NULL DEFAULT 'w2',
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "payRangeMin" DECIMAL(10,2),
    "payRangeMax" DECIMAL(10,2),
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredCerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experienceYears" INTEGER,
    "driversLicense" BOOLEAN NOT NULL DEFAULT false,
    "backgroundCheck" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "openings" INTEGER NOT NULL DEFAULT 1,
    "hiredCount" INTEGER NOT NULL DEFAULT 0,
    "requireResume" BOOLEAN NOT NULL DEFAULT false,
    "requireId" BOOLEAN NOT NULL DEFAULT true,
    "customQuestions" JSON,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorHiringPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorHiringApplication" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contractorId" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "yearsExperience" INTEGER,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "resumeUrl" TEXT,
    "governmentIdUrl" TEXT,
    "governmentIdBackUrl" TEXT,
    "additionalDocs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coverLetter" TEXT,
    "customAnswers" JSON,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(6),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "employeeId" UUID,
    "submittedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorHiringApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaProgram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'enterprise',
    "maxRedemptions" INTEGER NOT NULL DEFAULT 25,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "freeMonths" INTEGER NOT NULL DEFAULT 2,
    "postFreeDiscountPercent" INTEGER NOT NULL DEFAULT 35,
    "postFreeDiscountMonths" INTEGER NOT NULL DEFAULT 24,
    "expiresAt" TIMESTAMP(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaTester" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "programId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "landlordId" UUID,
    "contractorProfileId" UUID,
    "freePeriodStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freePeriodEnd" TIMESTAMP(6) NOT NULL,
    "discountPeriodEnd" TIMESTAMP(6) NOT NULL,
    "redeemedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedFromIp" TEXT,
    "redeemedUserAgent" TEXT,
    "testimonialConsent" BOOLEAN NOT NULL DEFAULT false,
    "npsScore" INTEGER,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaTester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaFeedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "betaTesterId" UUID NOT NULL,
    "audience" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "npsScore" INTEGER,
    "consentToUseInMarketing" BOOLEAN NOT NULL DEFAULT false,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'new',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "isFeaturedTestimonial" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(6),
    "resolvedBy" UUID,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BetaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetaFeedbackMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feedbackId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetaFeedbackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_enabled_idx" ON "PushToken"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_email_idx" ON "EmailVerificationToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_userId_idx" ON "PhoneVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "PhoneVerificationToken_phone_idx" ON "PhoneVerificationToken"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingNumber_key" ON "Order"("trackingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Color_slug_key" ON "Color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Size_slug_key" ON "Size"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPaymentMethod_stripePaymentMethodId_key" ON "SavedPaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_userId_idx" ON "SavedPaymentMethod"("userId");

-- CreateIndex
CREATE INDEX "SavedPaymentMethod_stripePaymentMethodId_idx" ON "SavedPaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodVerificationToken_token_key" ON "PaymentMethodVerificationToken"("token");

-- CreateIndex
CREATE INDEX "PaymentMethodVerificationToken_userId_idx" ON "PaymentMethodVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "PaymentMethodVerificationToken_token_idx" ON "PaymentMethodVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_code_idx" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPromo_productId_promoCodeId_key" ON "ProductPromo"("productId", "promoCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingSettings_id_key" ON "ShippingSettings"("id");

-- CreateIndex
CREATE UNIQUE INDEX "TaxSettings_id_key" ON "TaxSettings"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CashPayment_referenceId_key" ON "CashPayment"("referenceId");

-- CreateIndex
CREATE INDEX "CashPayment_referenceId_idx" ON "CashPayment"("referenceId");

-- CreateIndex
CREATE INDEX "CashPayment_tenantId_idx" ON "CashPayment"("tenantId");

-- CreateIndex
CREATE INDEX "CashPayment_propertyId_idx" ON "CashPayment"("propertyId");

-- CreateIndex
CREATE INDEX "CashPayment_status_idx" ON "CashPayment"("status");

-- CreateIndex
CREATE INDEX "CashPayment_expiresAt_idx" ON "CashPayment"("expiresAt");

-- CreateIndex
CREATE INDEX "Thread_folderId_idx" ON "Thread"("folderId");

-- CreateIndex
CREATE INDEX "Thread_isArchived_idx" ON "Thread"("isArchived");

-- CreateIndex
CREATE INDEX "ThreadParticipant_isDeleted_idx" ON "ThreadParticipant"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadParticipant_threadId_userId_key" ON "ThreadParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "MessageFolder_userId_idx" ON "MessageFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Friend_userId_friendId_key" ON "Friend"("userId", "friendId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogComment_postId_idx" ON "BlogComment"("postId");

-- CreateIndex
CREATE INDEX "BlogReaction_postId_idx" ON "BlogReaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogReaction_postId_userId_type_key" ON "BlogReaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionCartId_idx" ON "AnalyticsEvent"("sessionCartId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_path_idx" ON "AnalyticsEvent"("path");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_country_idx" ON "AnalyticsEvent"("country");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_subdomain_key" ON "Landlord"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Landlord_customDomain_key" ON "Landlord"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Homeowner_userId_key" ON "Homeowner"("userId");

-- CreateIndex
CREATE INDEX "Homeowner_userId_idx" ON "Homeowner"("userId");

-- CreateIndex
CREATE INDEX "HomeownerWorkOrder_homeownerId_idx" ON "HomeownerWorkOrder"("homeownerId");

-- CreateIndex
CREATE INDEX "HomeownerWorkOrder_status_idx" ON "HomeownerWorkOrder"("status");

-- CreateIndex
CREATE INDEX "HomeownerWorkOrder_isOpenBid_idx" ON "HomeownerWorkOrder"("isOpenBid");

-- CreateIndex
CREATE INDEX "HomeownerWorkOrderBid_workOrderId_idx" ON "HomeownerWorkOrderBid"("workOrderId");

-- CreateIndex
CREATE INDEX "HomeownerWorkOrderBid_contractorId_idx" ON "HomeownerWorkOrderBid"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeownerWorkOrderBid_workOrderId_contractorId_key" ON "HomeownerWorkOrderBid"("workOrderId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "QuickBooksConnection_landlordId_key" ON "QuickBooksConnection"("landlordId");

-- CreateIndex
CREATE INDEX "QuickBooksConnection_landlordId_idx" ON "QuickBooksConnection"("landlordId");

-- CreateIndex
CREATE INDEX "QuickBooksConnection_realmId_idx" ON "QuickBooksConnection"("realmId");

-- CreateIndex
CREATE UNIQUE INDEX "DocuSignConnection_landlordId_key" ON "DocuSignConnection"("landlordId");

-- CreateIndex
CREATE INDEX "DocuSignConnection_landlordId_idx" ON "DocuSignConnection"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPayoutMethod_stripePaymentMethodId_key" ON "SavedPayoutMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "SavedPayoutMethod_landlordId_idx" ON "SavedPayoutMethod"("landlordId");

-- CreateIndex
CREATE INDEX "SavedPayoutMethod_stripePaymentMethodId_idx" ON "SavedPayoutMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Lease_templateId_idx" ON "Lease"("templateId");

-- CreateIndex
CREATE INDEX "RecurringCharge_landlordId_status_nextPostDate_idx" ON "RecurringCharge"("landlordId", "status", "nextPostDate");

-- CreateIndex
CREATE INDEX "RecurringCharge_leaseId_idx" ON "RecurringCharge"("leaseId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_rentPaymentId_idx" ON "PaymentTransaction"("rentPaymentId");

-- CreateIndex
CREATE INDEX "Payout_landlordId_idx" ON "Payout"("landlordId");

-- CreateIndex
CREATE INDEX "PlatformFee_landlordId_idx" ON "PlatformFee"("landlordId");

-- CreateIndex
CREATE INDEX "PlatformFee_payoutId_idx" ON "PlatformFee"("payoutId");

-- CreateIndex
CREATE INDEX "Expense_landlordId_idx" ON "Expense"("landlordId");

-- CreateIndex
CREATE INDEX "Expense_propertyId_idx" ON "Expense"("propertyId");

-- CreateIndex
CREATE INDEX "Expense_unitId_idx" ON "Expense"("unitId");

-- CreateIndex
CREATE INDEX "Expense_incurredAt_idx" ON "Expense"("incurredAt");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Document_landlordId_idx" ON "Document"("landlordId");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_relatedToType_relatedToId_idx" ON "Document"("relatedToType", "relatedToId");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "MarketBenchmark_landlordId_idx" ON "MarketBenchmark"("landlordId");

-- CreateIndex
CREATE INDEX "MarketBenchmark_propertyId_idx" ON "MarketBenchmark"("propertyId");

-- CreateIndex
CREATE INDEX "MarketBenchmark_effectiveDate_idx" ON "MarketBenchmark"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFinance_propertyId_key" ON "PropertyFinance"("propertyId");

-- CreateIndex
CREATE INDEX "LeaseViolation_landlordId_idx" ON "LeaseViolation"("landlordId");

-- CreateIndex
CREATE INDEX "LeaseViolation_leaseId_idx" ON "LeaseViolation"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseViolation_tenantId_idx" ON "LeaseViolation"("tenantId");

-- CreateIndex
CREATE INDEX "LeaseViolation_unitId_idx" ON "LeaseViolation"("unitId");

-- CreateIndex
CREATE INDEX "LeaseViolation_occurredAt_idx" ON "LeaseViolation"("occurredAt");

-- CreateIndex
CREATE INDEX "LeaseViolation_type_idx" ON "LeaseViolation"("type");

-- CreateIndex
CREATE INDEX "ApplicationDocument_applicationId_idx" ON "ApplicationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_landlordId_idx" ON "ApplicationDocument"("landlordId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_uploadedById_idx" ON "ApplicationDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "ApplicationDocument_category_idx" ON "ApplicationDocument"("category");

-- CreateIndex
CREATE INDEX "ApplicationDocument_docType_idx" ON "ApplicationDocument"("docType");

-- CreateIndex
CREATE INDEX "ApplicationDocument_status_idx" ON "ApplicationDocument"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LegalDocument_landlordId_idx" ON "LegalDocument"("landlordId");

-- CreateIndex
CREATE INDEX "LegalDocument_type_idx" ON "LegalDocument"("type");

-- CreateIndex
CREATE INDEX "LeaseTemplate_landlordId_idx" ON "LeaseTemplate"("landlordId");

-- CreateIndex
CREATE INDEX "LeaseTemplate_isDefault_idx" ON "LeaseTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "PropertyLeaseTemplate_leaseTemplateId_idx" ON "PropertyLeaseTemplate"("leaseTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLeaseTemplate_propertyId_key" ON "PropertyLeaseTemplate"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSignatureRequest_token_key" ON "DocumentSignatureRequest"("token");

-- CreateIndex
CREATE INDEX "DocumentSignatureRequest_documentId_idx" ON "DocumentSignatureRequest"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSignatureRequest_leaseId_idx" ON "DocumentSignatureRequest"("leaseId");

-- CreateIndex
CREATE INDEX "DocumentSignatureRequest_status_idx" ON "DocumentSignatureRequest"("status");

-- CreateIndex
CREATE INDEX "DocumentSignatureRequest_token_idx" ON "DocumentSignatureRequest"("token");

-- CreateIndex
CREATE INDEX "DocumentSignatureRequest_role_idx" ON "DocumentSignatureRequest"("role");

-- CreateIndex
CREATE INDEX "PropertyInspection_propertyId_idx" ON "PropertyInspection"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyInspection_status_idx" ON "PropertyInspection"("status");

-- CreateIndex
CREATE INDEX "InspectionItem_inspectionId_idx" ON "InspectionItem"("inspectionId");

-- CreateIndex
CREATE INDEX "PropertySchedule_propertyId_idx" ON "PropertySchedule"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySchedule_propertyId_key" ON "PropertySchedule"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAppointment_propertyId_idx" ON "PropertyAppointment"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAppointment_date_idx" ON "PropertyAppointment"("date");

-- CreateIndex
CREATE INDEX "PropertyAppointment_status_idx" ON "PropertyAppointment"("status");

-- CreateIndex
CREATE INDEX "ScannedDocument_landlordId_idx" ON "ScannedDocument"("landlordId");

-- CreateIndex
CREATE INDEX "ScannedDocument_propertyId_idx" ON "ScannedDocument"("propertyId");

-- CreateIndex
CREATE INDEX "ScannedDocument_documentType_idx" ON "ScannedDocument"("documentType");

-- CreateIndex
CREATE INDEX "ScannedDocument_classificationStatus_idx" ON "ScannedDocument"("classificationStatus");

-- CreateIndex
CREATE INDEX "ScannedDocument_conversionStatus_idx" ON "ScannedDocument"("conversionStatus");

-- CreateIndex
CREATE INDEX "ScannedDocument_createdAt_idx" ON "ScannedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentClassificationRule_landlordId_idx" ON "DocumentClassificationRule"("landlordId");

-- CreateIndex
CREATE INDEX "DocumentClassificationRule_documentType_idx" ON "DocumentClassificationRule"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordSubscription_landlordId_key" ON "LandlordSubscription"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordSubscription_stripeSubscriptionId_key" ON "LandlordSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "LandlordSubscription_status_idx" ON "LandlordSubscription"("status");

-- CreateIndex
CREATE INDEX "LandlordSubscription_tier_idx" ON "LandlordSubscription"("tier");

-- CreateIndex
CREATE INDEX "LandlordSubscription_isGranted_idx" ON "LandlordSubscription"("isGranted");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEvent_stripeEventId_key" ON "SubscriptionEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_landlordId_idx" ON "SubscriptionEvent"("landlordId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_eventType_idx" ON "SubscriptionEvent"("eventType");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_createdAt_idx" ON "SubscriptionEvent"("createdAt");

-- CreateIndex
CREATE INDEX "EmploymentCheck_landlordId_idx" ON "EmploymentCheck"("landlordId");

-- CreateIndex
CREATE INDEX "EmploymentCheck_applicationId_idx" ON "EmploymentCheck"("applicationId");

-- CreateIndex
CREATE INDEX "EmploymentCheck_createdAt_idx" ON "EmploymentCheck"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_inviteToken_key" ON "TeamMember"("inviteToken");

-- CreateIndex
CREATE INDEX "TeamMember_landlordId_idx" ON "TeamMember"("landlordId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_inviteToken_idx" ON "TeamMember"("inviteToken");

-- CreateIndex
CREATE INDEX "TeamMember_paySchedulePayDate_idx" ON "TeamMember"("paySchedulePayDate");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_landlordId_invitedEmail_key" ON "TeamMember"("landlordId", "invitedEmail");

-- CreateIndex
CREATE INDEX "TeamChannel_landlordId_idx" ON "TeamChannel"("landlordId");

-- CreateIndex
CREATE INDEX "TeamChannelMember_channelId_idx" ON "TeamChannelMember"("channelId");

-- CreateIndex
CREATE INDEX "TeamChannelMember_userId_idx" ON "TeamChannelMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChannelMember_channelId_userId_key" ON "TeamChannelMember"("channelId", "userId");

-- CreateIndex
CREATE INDEX "TeamMessage_channelId_idx" ON "TeamMessage"("channelId");

-- CreateIndex
CREATE INDEX "TeamMessage_senderId_idx" ON "TeamMessage"("senderId");

-- CreateIndex
CREATE INDEX "TeamMessage_createdAt_idx" ON "TeamMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentReminderSettings_landlordId_key" ON "RentReminderSettings"("landlordId");

-- CreateIndex
CREATE INDEX "RentReminderSettings_landlordId_idx" ON "RentReminderSettings"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "LateFeeSettings_landlordId_key" ON "LateFeeSettings"("landlordId");

-- CreateIndex
CREATE INDEX "LateFeeSettings_landlordId_idx" ON "LateFeeSettings"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIP_ipAddress_key" ON "BlockedIP"("ipAddress");

-- CreateIndex
CREATE INDEX "BlockedIP_ipAddress_idx" ON "BlockedIP"("ipAddress");

-- CreateIndex
CREATE INDEX "BlockedIP_expiresAt_idx" ON "BlockedIP"("expiresAt");

-- CreateIndex
CREATE INDEX "VerificationDocument_applicationId_idx" ON "VerificationDocument"("applicationId");

-- CreateIndex
CREATE INDEX "VerificationDocument_landlordId_idx" ON "VerificationDocument"("landlordId");

-- CreateIndex
CREATE INDEX "VerificationDocument_uploadedById_idx" ON "VerificationDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "VerificationDocument_category_idx" ON "VerificationDocument"("category");

-- CreateIndex
CREATE INDEX "VerificationDocument_docType_idx" ON "VerificationDocument"("docType");

-- CreateIndex
CREATE INDEX "VerificationDocument_verificationStatus_idx" ON "VerificationDocument"("verificationStatus");

-- CreateIndex
CREATE INDEX "VerificationDocument_dataRetentionExpiresAt_idx" ON "VerificationDocument"("dataRetentionExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationVerification_applicationId_key" ON "ApplicationVerification"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationVerification_applicationId_idx" ON "ApplicationVerification"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationVerification_identityStatus_idx" ON "ApplicationVerification"("identityStatus");

-- CreateIndex
CREATE INDEX "ApplicationVerification_employmentStatus_idx" ON "ApplicationVerification"("employmentStatus");

-- CreateIndex
CREATE INDEX "ApplicationVerification_overallStatus_idx" ON "ApplicationVerification"("overallStatus");

-- CreateIndex
CREATE INDEX "EmploymentVerificationUsage_landlordId_idx" ON "EmploymentVerificationUsage"("landlordId");

-- CreateIndex
CREATE INDEX "EmploymentVerificationUsage_applicationId_idx" ON "EmploymentVerificationUsage"("applicationId");

-- CreateIndex
CREATE INDEX "EmploymentVerificationUsage_billingPeriodStart_billingPerio_idx" ON "EmploymentVerificationUsage"("billingPeriodStart", "billingPeriodEnd");

-- CreateIndex
CREATE INDEX "EmploymentVerificationUsage_createdAt_idx" ON "EmploymentVerificationUsage"("createdAt");

-- CreateIndex
CREATE INDEX "FraudDetectionLog_verificationDocumentId_idx" ON "FraudDetectionLog"("verificationDocumentId");

-- CreateIndex
CREATE INDEX "FraudDetectionLog_checkType_idx" ON "FraudDetectionLog"("checkType");

-- CreateIndex
CREATE INDEX "FraudDetectionLog_result_idx" ON "FraudDetectionLog"("result");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_verificationDocumentId_idx" ON "DocumentAccessLog"("verificationDocumentId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_userId_idx" ON "DocumentAccessLog"("userId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_createdAt_idx" ON "DocumentAccessLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyBankAccount_propertyId_key" ON "PropertyBankAccount"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyBankAccount_propertyId_idx" ON "PropertyBankAccount"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyBankAccount_stripePaymentMethodId_idx" ON "PropertyBankAccount"("stripePaymentMethodId");

-- CreateIndex
CREATE INDEX "TenantInvoice_propertyId_idx" ON "TenantInvoice"("propertyId");

-- CreateIndex
CREATE INDEX "TenantInvoice_tenantId_idx" ON "TenantInvoice"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInvoice_leaseId_idx" ON "TenantInvoice"("leaseId");

-- CreateIndex
CREATE INDEX "TenantInvoice_status_idx" ON "TenantInvoice"("status");

-- CreateIndex
CREATE INDEX "TenantInvoice_dueDate_idx" ON "TenantInvoice"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordWallet_landlordId_key" ON "LandlordWallet"("landlordId");

-- CreateIndex
CREATE INDEX "LandlordWallet_landlordId_idx" ON "LandlordWallet"("landlordId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_availableAt_idx" ON "WalletTransaction"("availableAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

-- CreateIndex
CREATE INDEX "EvictionNotice_leaseId_idx" ON "EvictionNotice"("leaseId");

-- CreateIndex
CREATE INDEX "EvictionNotice_tenantId_idx" ON "EvictionNotice"("tenantId");

-- CreateIndex
CREATE INDEX "EvictionNotice_landlordId_idx" ON "EvictionNotice"("landlordId");

-- CreateIndex
CREATE INDEX "EvictionNotice_status_idx" ON "EvictionNotice"("status");

-- CreateIndex
CREATE INDEX "TenantDeparture_leaseId_idx" ON "TenantDeparture"("leaseId");

-- CreateIndex
CREATE INDEX "TenantDeparture_tenantId_idx" ON "TenantDeparture"("tenantId");

-- CreateIndex
CREATE INDEX "TenantDeparture_unitId_idx" ON "TenantDeparture"("unitId");

-- CreateIndex
CREATE INDEX "DepositDisposition_leaseId_idx" ON "DepositDisposition"("leaseId");

-- CreateIndex
CREATE INDEX "DepositDisposition_tenantId_idx" ON "DepositDisposition"("tenantId");

-- CreateIndex
CREATE INDEX "DepositDeductionItem_depositDispositionId_idx" ON "DepositDeductionItem"("depositDispositionId");

-- CreateIndex
CREATE INDEX "UnitTurnoverChecklist_unitId_idx" ON "UnitTurnoverChecklist"("unitId");

-- CreateIndex
CREATE INDEX "UnitTurnoverChecklist_landlordId_idx" ON "UnitTurnoverChecklist"("landlordId");

-- CreateIndex
CREATE INDEX "TenantHistory_unitId_idx" ON "TenantHistory"("unitId");

-- CreateIndex
CREATE INDEX "TenantHistory_propertyId_idx" ON "TenantHistory"("propertyId");

-- CreateIndex
CREATE INDEX "TenantHistory_landlordId_idx" ON "TenantHistory"("landlordId");

-- CreateIndex
CREATE INDEX "TenantHistory_tenantId_idx" ON "TenantHistory"("tenantId");

-- CreateIndex
CREATE INDEX "TenantHistory_departureDate_idx" ON "TenantHistory"("departureDate");

-- CreateIndex
CREATE INDEX "Contractor_landlordId_idx" ON "Contractor"("landlordId");

-- CreateIndex
CREATE INDEX "Contractor_userId_idx" ON "Contractor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_landlordId_email_key" ON "Contractor"("landlordId", "email");

-- CreateIndex
CREATE INDEX "ContractorEstimate_contractorId_idx" ON "ContractorEstimate"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorEstimate_landlordId_idx" ON "ContractorEstimate"("landlordId");

-- CreateIndex
CREATE INDEX "ContractorEstimate_status_idx" ON "ContractorEstimate"("status");

-- CreateIndex
CREATE INDEX "ContractorEstimate_isTemplate_idx" ON "ContractorEstimate"("isTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorInvite_token_key" ON "ContractorInvite"("token");

-- CreateIndex
CREATE INDEX "ContractorInvite_token_idx" ON "ContractorInvite"("token");

-- CreateIndex
CREATE INDEX "ContractorInvite_landlordId_idx" ON "ContractorInvite"("landlordId");

-- CreateIndex
CREATE INDEX "WorkOrderBid_workOrderId_idx" ON "WorkOrderBid"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderBid_contractorId_idx" ON "WorkOrderBid"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderBid_workOrderId_contractorId_key" ON "WorkOrderBid"("workOrderId", "contractorId");

-- CreateIndex
CREATE INDEX "WorkOrderBidMessage_bidId_idx" ON "WorkOrderBidMessage"("bidId");

-- CreateIndex
CREATE INDEX "WorkOrderBidMessage_senderId_idx" ON "WorkOrderBidMessage"("senderId");

-- CreateIndex
CREATE INDEX "WorkOrderBidMessage_createdAt_idx" ON "WorkOrderBidMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_landlordId_idx" ON "WorkOrder"("landlordId");

-- CreateIndex
CREATE INDEX "WorkOrder_contractorId_idx" ON "WorkOrder"("contractorId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_propertyId_idx" ON "WorkOrder"("propertyId");

-- CreateIndex
CREATE INDEX "WorkOrder_isOpenBid_idx" ON "WorkOrder"("isOpenBid");

-- CreateIndex
CREATE INDEX "WorkOrder_lifecycleStatus_idx" ON "WorkOrder"("lifecycleStatus");

-- CreateIndex
CREATE INDEX "WorkOrder_pmApprovalDeadline_idx" ON "WorkOrder"("pmApprovalDeadline");

-- CreateIndex
CREATE INDEX "WorkOrderStatusEvent_workOrderId_idx" ON "WorkOrderStatusEvent"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderStatusEvent_toStatus_idx" ON "WorkOrderStatusEvent"("toStatus");

-- CreateIndex
CREATE INDEX "WorkOrderStatusEvent_createdAt_idx" ON "WorkOrderStatusEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WorkOrderDispute_workOrderId_idx" ON "WorkOrderDispute"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderDispute_status_idx" ON "WorkOrderDispute"("status");

-- CreateIndex
CREATE INDEX "WorkOrderDispute_filedByUserId_idx" ON "WorkOrderDispute"("filedByUserId");

-- CreateIndex
CREATE INDEX "WorkOrderMilestone_workOrderId_idx" ON "WorkOrderMilestone"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderMilestone_status_idx" ON "WorkOrderMilestone"("status");

-- CreateIndex
CREATE INDEX "WorkOrderMilestone_order_idx" ON "WorkOrderMilestone"("order");

-- CreateIndex
CREATE INDEX "WorkOrderMedia_workOrderId_idx" ON "WorkOrderMedia"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderHistory_workOrderId_idx" ON "WorkOrderHistory"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorPayment_workOrderId_key" ON "ContractorPayment"("workOrderId");

-- CreateIndex
CREATE INDEX "ContractorPayment_landlordId_idx" ON "ContractorPayment"("landlordId");

-- CreateIndex
CREATE INDEX "ContractorPayment_contractorId_idx" ON "ContractorPayment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPayment_status_idx" ON "ContractorPayment"("status");

-- CreateIndex
CREATE INDEX "ContractorPayment_treasuryTransferId_idx" ON "ContractorPayment"("treasuryTransferId");

-- CreateIndex
CREATE INDEX "ContractorPayment_treasuryStatus_idx" ON "ContractorPayment"("treasuryStatus");

-- CreateIndex
CREATE INDEX "ContractorPayment_milestoneRefId_idx" ON "ContractorPayment"("milestoneRefId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_jobId_idx" ON "PaymentAttempt"("jobId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_userId_idx" ON "PaymentAttempt"("userId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_attemptedAt_idx" ON "PaymentAttempt"("attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberCompensation_teamMemberId_key" ON "TeamMemberCompensation"("teamMemberId");

-- CreateIndex
CREATE INDEX "TeamMemberCompensation_teamMemberId_idx" ON "TeamMemberCompensation"("teamMemberId");

-- CreateIndex
CREATE INDEX "TeamMemberCompensation_treasuryOnboardingStatus_idx" ON "TeamMemberCompensation"("treasuryOnboardingStatus");

-- CreateIndex
CREATE INDEX "TeamMemberAvailability_teamMemberId_idx" ON "TeamMemberAvailability"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMemberAvailability_teamMemberId_dayOfWeek_key" ON "TeamMemberAvailability"("teamMemberId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TimeOffRequest_teamMemberId_idx" ON "TimeOffRequest"("teamMemberId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_landlordId_idx" ON "TimeOffRequest"("landlordId");

-- CreateIndex
CREATE INDEX "TimeOffRequest_status_idx" ON "TimeOffRequest"("status");

-- CreateIndex
CREATE INDEX "Shift_landlordId_idx" ON "Shift"("landlordId");

-- CreateIndex
CREATE INDEX "Shift_teamMemberId_idx" ON "Shift"("teamMemberId");

-- CreateIndex
CREATE INDEX "Shift_date_idx" ON "Shift"("date");

-- CreateIndex
CREATE INDEX "Shift_propertyId_idx" ON "Shift"("propertyId");

-- CreateIndex
CREATE INDEX "TimeEntry_landlordId_idx" ON "TimeEntry"("landlordId");

-- CreateIndex
CREATE INDEX "TimeEntry_teamMemberId_idx" ON "TimeEntry"("teamMemberId");

-- CreateIndex
CREATE INDEX "TimeEntry_clockIn_idx" ON "TimeEntry"("clockIn");

-- CreateIndex
CREATE INDEX "TimeEntry_timesheetId_idx" ON "TimeEntry"("timesheetId");

-- CreateIndex
CREATE INDEX "Timesheet_landlordId_idx" ON "Timesheet"("landlordId");

-- CreateIndex
CREATE INDEX "Timesheet_teamMemberId_idx" ON "Timesheet"("teamMemberId");

-- CreateIndex
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_teamMemberId_periodStart_periodEnd_key" ON "Timesheet"("teamMemberId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TeamPayment_timesheetId_key" ON "TeamPayment"("timesheetId");

-- CreateIndex
CREATE INDEX "TeamPayment_landlordId_idx" ON "TeamPayment"("landlordId");

-- CreateIndex
CREATE INDEX "TeamPayment_teamMemberId_idx" ON "TeamPayment"("teamMemberId");

-- CreateIndex
CREATE INDEX "TeamPayment_status_idx" ON "TeamPayment"("status");

-- CreateIndex
CREATE INDEX "TeamPayment_paidAt_idx" ON "TeamPayment"("paidAt");

-- CreateIndex
CREATE INDEX "TeamPayment_treasuryTransferId_idx" ON "TeamPayment"("treasuryTransferId");

-- CreateIndex
CREATE INDEX "TeamPayment_treasuryStatus_idx" ON "TeamPayment"("treasuryStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSettings_landlordId_key" ON "PayrollSettings"("landlordId");

-- CreateIndex
CREATE INDEX "JobPosting_landlordId_idx" ON "JobPosting"("landlordId");

-- CreateIndex
CREATE INDEX "JobPosting_userId_idx" ON "JobPosting"("userId");

-- CreateIndex
CREATE INDEX "JobPosting_status_idx" ON "JobPosting"("status");

-- CreateIndex
CREATE INDEX "JobPosting_category_idx" ON "JobPosting"("category");

-- CreateIndex
CREATE INDEX "JobApplicant_jobId_idx" ON "JobApplicant"("jobId");

-- CreateIndex
CREATE INDEX "JobApplicant_landlordId_idx" ON "JobApplicant"("landlordId");

-- CreateIndex
CREATE INDEX "JobApplicant_userId_idx" ON "JobApplicant"("userId");

-- CreateIndex
CREATE INDEX "JobApplicant_status_idx" ON "JobApplicant"("status");

-- CreateIndex
CREATE INDEX "JobApplicantMessage_applicantId_idx" ON "JobApplicantMessage"("applicantId");

-- CreateIndex
CREATE INDEX "JobApplicantMessage_senderId_idx" ON "JobApplicantMessage"("senderId");

-- CreateIndex
CREATE INDEX "JobApplicantMessage_createdAt_idx" ON "JobApplicantMessage"("createdAt");

-- CreateIndex
CREATE INDEX "CompanyReview_companyName_idx" ON "CompanyReview"("companyName");

-- CreateIndex
CREATE INDEX "CompanyReview_userId_idx" ON "CompanyReview"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSeekerProfile_userId_key" ON "JobSeekerProfile"("userId");

-- CreateIndex
CREATE INDEX "JobSeekerProfile_userId_idx" ON "JobSeekerProfile"("userId");

-- CreateIndex
CREATE INDEX "JobSeekerProfile_isPublic_isAvailable_idx" ON "JobSeekerProfile"("isPublic", "isAvailable");

-- CreateIndex
CREATE INDEX "JobSeekerProfile_city_state_idx" ON "JobSeekerProfile"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_subdomain_key" ON "Agent"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_customDomain_key" ON "Agent"("customDomain");

-- CreateIndex
CREATE INDEX "Agent_subdomain_idx" ON "Agent"("subdomain");

-- CreateIndex
CREATE INDEX "Agent_licenseState_idx" ON "Agent"("licenseState");

-- CreateIndex
CREATE INDEX "AgentWorkOrder_agentId_idx" ON "AgentWorkOrder"("agentId");

-- CreateIndex
CREATE INDEX "AgentWorkOrder_status_idx" ON "AgentWorkOrder"("status");

-- CreateIndex
CREATE INDEX "AgentWorkOrder_isOpenBid_idx" ON "AgentWorkOrder"("isOpenBid");

-- CreateIndex
CREATE INDEX "AgentWorkOrderBid_workOrderId_idx" ON "AgentWorkOrderBid"("workOrderId");

-- CreateIndex
CREATE INDEX "AgentWorkOrderBid_contractorId_idx" ON "AgentWorkOrderBid"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentWorkOrderBid_workOrderId_contractorId_key" ON "AgentWorkOrderBid"("workOrderId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentListing_slug_key" ON "AgentListing"("slug");

-- CreateIndex
CREATE INDEX "AgentListing_agentId_idx" ON "AgentListing"("agentId");

-- CreateIndex
CREATE INDEX "AgentListing_status_idx" ON "AgentListing"("status");

-- CreateIndex
CREATE INDEX "AgentListing_propertyType_idx" ON "AgentListing"("propertyType");

-- CreateIndex
CREATE INDEX "AgentListing_listingType_idx" ON "AgentListing"("listingType");

-- CreateIndex
CREATE INDEX "AgentListing_price_idx" ON "AgentListing"("price");

-- CreateIndex
CREATE INDEX "AgentLead_agentId_idx" ON "AgentLead"("agentId");

-- CreateIndex
CREATE INDEX "AgentLead_listingId_idx" ON "AgentLead"("listingId");

-- CreateIndex
CREATE INDEX "AgentLead_status_idx" ON "AgentLead"("status");

-- CreateIndex
CREATE INDEX "AgentLead_type_idx" ON "AgentLead"("type");

-- CreateIndex
CREATE INDEX "AgentOpenHouse_agentId_idx" ON "AgentOpenHouse"("agentId");

-- CreateIndex
CREATE INDEX "AgentOpenHouse_listingId_idx" ON "AgentOpenHouse"("listingId");

-- CreateIndex
CREATE INDEX "AgentOpenHouse_date_idx" ON "AgentOpenHouse"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_email_key" ON "Affiliate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_code_key" ON "Affiliate"("code");

-- CreateIndex
CREATE INDEX "Affiliate_code_idx" ON "Affiliate"("code");

-- CreateIndex
CREATE INDEX "Affiliate_email_idx" ON "Affiliate"("email");

-- CreateIndex
CREATE INDEX "Affiliate_status_idx" ON "Affiliate"("status");

-- CreateIndex
CREATE INDEX "AffiliateClick_affiliateId_idx" ON "AffiliateClick"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateClick_sessionId_idx" ON "AffiliateClick"("sessionId");

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateReferral_landlordId_key" ON "AffiliateReferral"("landlordId");

-- CreateIndex
CREATE INDEX "AffiliateReferral_affiliateId_idx" ON "AffiliateReferral"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateReferral_landlordId_idx" ON "AffiliateReferral"("landlordId");

-- CreateIndex
CREATE INDEX "AffiliateReferral_commissionStatus_idx" ON "AffiliateReferral"("commissionStatus");

-- CreateIndex
CREATE INDEX "AffiliateReferral_createdAt_idx" ON "AffiliateReferral"("createdAt");

-- CreateIndex
CREATE INDEX "AffiliatePayout_affiliateId_idx" ON "AffiliatePayout"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliatePayout_status_idx" ON "AffiliatePayout"("status");

-- CreateIndex
CREATE INDEX "AffiliatePayout_createdAt_idx" ON "AffiliatePayout"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorAuth_userId_idx" ON "TwoFactorAuth"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_landlordId_idx" ON "AuditLog"("landlordId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "RateLimitRecord_identifier_idx" ON "RateLimitRecord"("identifier");

-- CreateIndex
CREATE INDEX "RateLimitRecord_windowEnd_idx" ON "RateLimitRecord"("windowEnd");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitRecord_identifier_endpoint_windowStart_key" ON "RateLimitRecord"("identifier", "endpoint", "windowStart");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_idx" ON "LoginAttempt"("email");

-- CreateIndex
CREATE INDEX "LoginAttempt_userId_idx" ON "LoginAttempt"("userId");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_idx" ON "LoginAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "LoginAttempt_success_idx" ON "LoginAttempt"("success");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VisitorProfile_visitorId_key" ON "VisitorProfile"("visitorId");

-- CreateIndex
CREATE INDEX "VisitorProfile_visitorId_idx" ON "VisitorProfile"("visitorId");

-- CreateIndex
CREATE INDEX "VisitorProfile_userId_idx" ON "VisitorProfile"("userId");

-- CreateIndex
CREATE INDEX "VisitorProfile_firstSeenAt_idx" ON "VisitorProfile"("firstSeenAt");

-- CreateIndex
CREATE INDEX "VisitorProfile_lastSeenAt_idx" ON "VisitorProfile"("lastSeenAt");

-- CreateIndex
CREATE INDEX "CronRunLog_jobName_idx" ON "CronRunLog"("jobName");

-- CreateIndex
CREATE INDEX "CronRunLog_status_idx" ON "CronRunLog"("status");

-- CreateIndex
CREATE INDEX "CronRunLog_startedAt_idx" ON "CronRunLog"("startedAt");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_provider_idx" ON "InboundWebhookEvent"("provider");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_eventType_idx" ON "InboundWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_status_idx" ON "InboundWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_createdAt_idx" ON "InboundWebhookEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SensitivePIIAccess_actorUserId_idx" ON "SensitivePIIAccess"("actorUserId");

-- CreateIndex
CREATE INDEX "SensitivePIIAccess_subjectUserId_idx" ON "SensitivePIIAccess"("subjectUserId");

-- CreateIndex
CREATE INDEX "SensitivePIIAccess_resourceType_idx" ON "SensitivePIIAccess"("resourceType");

-- CreateIndex
CREATE INDEX "SensitivePIIAccess_createdAt_idx" ON "SensitivePIIAccess"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_landlordId_idx" ON "ReferralCode"("landlordId");

-- CreateIndex
CREATE INDEX "Referral_referrerLandlordId_idx" ON "Referral"("referrerLandlordId");

-- CreateIndex
CREATE INDEX "Referral_referredLandlordId_idx" ON "Referral"("referredLandlordId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "ReferralCredit_landlordId_idx" ON "ReferralCredit"("landlordId");

-- CreateIndex
CREATE INDEX "ReferralCredit_expiresAt_idx" ON "ReferralCredit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_email_idx" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_caseNumber_key" ON "Dispute"("caseNumber");

-- CreateIndex
CREATE INDEX "Dispute_landlordId_idx" ON "Dispute"("landlordId");

-- CreateIndex
CREATE INDEX "Dispute_contractorId_idx" ON "Dispute"("contractorId");

-- CreateIndex
CREATE INDEX "Dispute_homeownerId_idx" ON "Dispute"("homeownerId");

-- CreateIndex
CREATE INDEX "Dispute_workOrderId_idx" ON "Dispute"("workOrderId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_priority_idx" ON "Dispute"("priority");

-- CreateIndex
CREATE INDEX "Dispute_caseNumber_idx" ON "Dispute"("caseNumber");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_idx" ON "DisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeMessage_senderId_idx" ON "DisputeMessage"("senderId");

-- CreateIndex
CREATE INDEX "DisputeMessage_createdAt_idx" ON "DisputeMessage"("createdAt");

-- CreateIndex
CREATE INDEX "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeEvidence_uploadedById_idx" ON "DisputeEvidence"("uploadedById");

-- CreateIndex
CREATE INDEX "DisputeTimeline_disputeId_idx" ON "DisputeTimeline"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeTimeline_createdAt_idx" ON "DisputeTimeline"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_landlordId_idx" ON "ApiKey"("landlordId");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_landlordId_idx" ON "WebhookEndpoint"("landlordId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_isActive_idx" ON "WebhookEndpoint"("isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookEndpointId_idx" ON "WebhookDelivery"("webhookEndpointId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventType_idx" ON "WebhookDelivery"("eventType");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_nextRetryAt_idx" ON "WebhookDelivery"("nextRetryAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_apiKeyId_idx" ON "ApiRequestLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_landlordId_idx" ON "ApiRequestLog"("landlordId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_path_idx" ON "ApiRequestLog"("path");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorApiKey_keyHash_key" ON "ContractorApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ContractorApiKey_contractorId_idx" ON "ContractorApiKey"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorApiKey_keyPrefix_idx" ON "ContractorApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ContractorApiKey_isActive_idx" ON "ContractorApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ContractorWebhookEndpoint_contractorId_idx" ON "ContractorWebhookEndpoint"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorWebhookEndpoint_isActive_idx" ON "ContractorWebhookEndpoint"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorQBConnection_contractorId_key" ON "ContractorQBConnection"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorQBConnection_contractorId_idx" ON "ContractorQBConnection"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorPayment_contractorId_idx" ON "ContractorSubcontractorPayment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorPayment_subcontractorId_idx" ON "ContractorSubcontractorPayment"("subcontractorId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorPayment_paidAt_idx" ON "ContractorSubcontractorPayment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_stripeFinancialAccountId_key" ON "FinancialAccount"("stripeFinancialAccountId");

-- CreateIndex
CREATE INDEX "FinancialAccount_landlordId_idx" ON "FinancialAccount"("landlordId");

-- CreateIndex
CREATE INDEX "FinancialAccount_contractorId_idx" ON "FinancialAccount"("contractorId");

-- CreateIndex
CREATE INDEX "FinancialAccount_stripeConnectedAccountId_idx" ON "FinancialAccount"("stripeConnectedAccountId");

-- CreateIndex
CREATE INDEX "FinancialAccount_status_idx" ON "FinancialAccount"("status");

-- CreateIndex
CREATE INDEX "FinancialAccountTransaction_financialAccountId_idx" ON "FinancialAccountTransaction"("financialAccountId");

-- CreateIndex
CREATE INDEX "FinancialAccountTransaction_type_idx" ON "FinancialAccountTransaction"("type");

-- CreateIndex
CREATE INDEX "FinancialAccountTransaction_status_idx" ON "FinancialAccountTransaction"("status");

-- CreateIndex
CREATE INDEX "FinancialAccountTransaction_createdAt_idx" ON "FinancialAccountTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IssuingCardholder_stripeCardholderId_key" ON "IssuingCardholder"("stripeCardholderId");

-- CreateIndex
CREATE INDEX "IssuingCardholder_userId_idx" ON "IssuingCardholder"("userId");

-- CreateIndex
CREATE INDEX "IssuingCardholder_stripeCardholderId_idx" ON "IssuingCardholder"("stripeCardholderId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuingCard_stripeCardId_key" ON "IssuingCard"("stripeCardId");

-- CreateIndex
CREATE INDEX "IssuingCard_userId_idx" ON "IssuingCard"("userId");

-- CreateIndex
CREATE INDEX "IssuingCard_stripeCardId_idx" ON "IssuingCard"("stripeCardId");

-- CreateIndex
CREATE INDEX "IssuingCard_status_idx" ON "IssuingCard"("status");

-- CreateIndex
CREATE INDEX "IssuingCard_financialAccountId_idx" ON "IssuingCard"("financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuingAuthorization_stripeAuthId_key" ON "IssuingAuthorization"("stripeAuthId");

-- CreateIndex
CREATE INDEX "IssuingAuthorization_cardId_idx" ON "IssuingAuthorization"("cardId");

-- CreateIndex
CREATE INDEX "IssuingAuthorization_createdAt_idx" ON "IssuingAuthorization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IssuingTransaction_stripeTransactionId_key" ON "IssuingTransaction"("stripeTransactionId");

-- CreateIndex
CREATE INDEX "IssuingTransaction_cardId_idx" ON "IssuingTransaction"("cardId");

-- CreateIndex
CREATE INDEX "IssuingTransaction_createdAt_idx" ON "IssuingTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_userId_key" ON "ContractorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_slug_key" ON "ContractorProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_subdomain_key" ON "ContractorProfile"("subdomain");

-- CreateIndex
CREATE INDEX "ContractorProfile_slug_idx" ON "ContractorProfile"("slug");

-- CreateIndex
CREATE INDEX "ContractorProfile_rankScore_idx" ON "ContractorProfile"("rankScore");

-- CreateIndex
CREATE INDEX "ContractorProfile_avgRating_idx" ON "ContractorProfile"("avgRating");

-- CreateIndex
CREATE INDEX "ContractorProfile_isPublic_acceptingNewWork_idx" ON "ContractorProfile"("isPublic", "acceptingNewWork");

-- CreateIndex
CREATE INDEX "ContractorProfile_baseCity_baseState_idx" ON "ContractorProfile"("baseCity", "baseState");

-- CreateIndex
CREATE INDEX "ContractorProfile_featuredUntil_idx" ON "ContractorProfile"("featuredUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorUsageTracking_contractorId_key" ON "ContractorUsageTracking"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorUsageTracking_contractorId_idx" ON "ContractorUsageTracking"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorNotification_contractorId_read_idx" ON "ContractorNotification"("contractorId", "read");

-- CreateIndex
CREATE INDEX "ContractorNotification_createdAt_idx" ON "ContractorNotification"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorTeamChannel_contractorId_idx" ON "ContractorTeamChannel"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTeamChannelMember_channelId_idx" ON "ContractorTeamChannelMember"("channelId");

-- CreateIndex
CREATE INDEX "ContractorTeamChannelMember_userId_idx" ON "ContractorTeamChannelMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorTeamChannelMember_channelId_userId_key" ON "ContractorTeamChannelMember"("channelId", "userId");

-- CreateIndex
CREATE INDEX "ContractorTeamMessage_channelId_idx" ON "ContractorTeamMessage"("channelId");

-- CreateIndex
CREATE INDEX "ContractorTeamMessage_senderId_idx" ON "ContractorTeamMessage"("senderId");

-- CreateIndex
CREATE INDEX "ContractorTeamMessage_createdAt_idx" ON "ContractorTeamMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFeeSettings_propertyId_key" ON "PropertyFeeSettings"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyFeeSettings_propertyId_idx" ON "PropertyFeeSettings"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyFeeSettings_landlordId_idx" ON "PropertyFeeSettings"("landlordId");

-- CreateIndex
CREATE INDEX "ContractorLead_status_idx" ON "ContractorLead"("status");

-- CreateIndex
CREATE INDEX "ContractorLead_stage_idx" ON "ContractorLead"("stage");

-- CreateIndex
CREATE INDEX "ContractorLead_priority_idx" ON "ContractorLead"("priority");

-- CreateIndex
CREATE INDEX "ContractorLead_assignedToId_idx" ON "ContractorLead"("assignedToId");

-- CreateIndex
CREATE INDEX "ContractorLead_projectType_idx" ON "ContractorLead"("projectType");

-- CreateIndex
CREATE INDEX "ContractorLead_propertyZip_idx" ON "ContractorLead"("propertyZip");

-- CreateIndex
CREATE INDEX "ContractorLead_createdAt_idx" ON "ContractorLead"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorLead_customerUserId_idx" ON "ContractorLead"("customerUserId");

-- CreateIndex
CREATE INDEX "ContractorLead_nextFollowUpDate_idx" ON "ContractorLead"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "ContractorLeadMatch_contractorId_idx" ON "ContractorLeadMatch"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorLeadMatch_status_idx" ON "ContractorLeadMatch"("status");

-- CreateIndex
CREATE INDEX "ContractorLeadMatch_createdAt_idx" ON "ContractorLeadMatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorLeadMatch_leadId_contractorId_key" ON "ContractorLeadMatch"("leadId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorLeadCredit_contractorId_key" ON "ContractorLeadCredit"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorCreditTransaction_creditAccountId_idx" ON "ContractorCreditTransaction"("creditAccountId");

-- CreateIndex
CREATE INDEX "ContractorCreditTransaction_type_idx" ON "ContractorCreditTransaction"("type");

-- CreateIndex
CREATE INDEX "ContractorCreditTransaction_createdAt_idx" ON "ContractorCreditTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorLeadPreferences_contractorId_key" ON "ContractorLeadPreferences"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorAppointment_contractorId_idx" ON "ContractorAppointment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorAppointment_customerId_idx" ON "ContractorAppointment"("customerId");

-- CreateIndex
CREATE INDEX "ContractorAppointment_startTime_idx" ON "ContractorAppointment"("startTime");

-- CreateIndex
CREATE INDEX "ContractorAppointment_status_idx" ON "ContractorAppointment"("status");

-- CreateIndex
CREATE INDEX "ContractorAppointment_escrowStatus_idx" ON "ContractorAppointment"("escrowStatus");

-- CreateIndex
CREATE INDEX "ContractorAppointment_autoReleaseAt_idx" ON "ContractorAppointment"("autoReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorInvoice_invoiceNumber_key" ON "ContractorInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ContractorInvoice_contractorId_idx" ON "ContractorInvoice"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInvoice_customerId_idx" ON "ContractorInvoice"("customerId");

-- CreateIndex
CREATE INDEX "ContractorInvoice_status_idx" ON "ContractorInvoice"("status");

-- CreateIndex
CREATE INDEX "ContractorInvoice_dueDate_idx" ON "ContractorInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "ContractorInvoicePayment_invoiceId_idx" ON "ContractorInvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "ContractorCustomer_contractorId_idx" ON "ContractorCustomer"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorCustomer_status_idx" ON "ContractorCustomer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorCustomer_contractorId_email_key" ON "ContractorCustomer"("contractorId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorAvailability_contractorId_key" ON "ContractorAvailability"("contractorId");

-- CreateIndex
CREATE INDEX "JobGuaranteeHold_jobId_idx" ON "JobGuaranteeHold"("jobId");

-- CreateIndex
CREATE INDEX "JobGuaranteeHold_contractorId_idx" ON "JobGuaranteeHold"("contractorId");

-- CreateIndex
CREATE INDEX "JobGuaranteeHold_status_idx" ON "JobGuaranteeHold"("status");

-- CreateIndex
CREATE INDEX "JobGuaranteeHold_releaseAt_idx" ON "JobGuaranteeHold"("releaseAt");

-- CreateIndex
CREATE INDEX "PageView_sessionId_idx" ON "PageView"("sessionId");

-- CreateIndex
CREATE INDEX "PageView_userId_idx" ON "PageView"("userId");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_exitPage_idx" ON "PageView"("exitPage");

-- CreateIndex
CREATE INDEX "ClickEvent_sessionId_idx" ON "ClickEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ClickEvent_path_idx" ON "ClickEvent"("path");

-- CreateIndex
CREATE INDEX "ClickEvent_timestamp_idx" ON "ClickEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_sessionId_key" ON "UserSession"("sessionId");

-- CreateIndex
CREATE INDEX "UserSession_sessionId_idx" ON "UserSession"("sessionId");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_startTime_idx" ON "UserSession"("startTime");

-- CreateIndex
CREATE INDEX "UserSession_converted_idx" ON "UserSession"("converted");

-- CreateIndex
CREATE INDEX "FormInteraction_sessionId_idx" ON "FormInteraction"("sessionId");

-- CreateIndex
CREATE INDEX "FormInteraction_formId_idx" ON "FormInteraction"("formId");

-- CreateIndex
CREATE INDEX "FormInteraction_completed_idx" ON "FormInteraction"("completed");

-- CreateIndex
CREATE INDEX "ConversionFunnel_sessionId_idx" ON "ConversionFunnel"("sessionId");

-- CreateIndex
CREATE INDEX "ConversionFunnel_step_idx" ON "ConversionFunnel"("step");

-- CreateIndex
CREATE INDEX "ConversionFunnel_completed_idx" ON "ConversionFunnel"("completed");

-- CreateIndex
CREATE INDEX "SystemEvent_type_idx" ON "SystemEvent"("type");

-- CreateIndex
CREATE INDEX "SystemEvent_processed_idx" ON "SystemEvent"("processed");

-- CreateIndex
CREATE INDEX "SystemEvent_createdAt_idx" ON "SystemEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ScheduledJob_type_idx" ON "ScheduledJob"("type");

-- CreateIndex
CREATE INDEX "ScheduledJob_status_idx" ON "ScheduledJob"("status");

-- CreateIndex
CREATE INDEX "ScheduledJob_scheduledFor_idx" ON "ScheduledJob"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledJob_priority_idx" ON "ScheduledJob"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorJob_jobNumber_key" ON "ContractorJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ContractorJob_contractorId_idx" ON "ContractorJob"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorJob_customerId_idx" ON "ContractorJob"("customerId");

-- CreateIndex
CREATE INDEX "ContractorJob_status_idx" ON "ContractorJob"("status");

-- CreateIndex
CREATE INDEX "ContractorJob_jobNumber_idx" ON "ContractorJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ContractorShift_contractorId_idx" ON "ContractorShift"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorShift_employeeId_idx" ON "ContractorShift"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorShift_date_idx" ON "ContractorShift"("date");

-- CreateIndex
CREATE INDEX "ContractorShift_jobId_idx" ON "ContractorShift"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorEmployee_inviteToken_key" ON "ContractorEmployee"("inviteToken");

-- CreateIndex
CREATE INDEX "ContractorEmployee_contractorId_idx" ON "ContractorEmployee"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorEmployee_roleId_idx" ON "ContractorEmployee"("roleId");

-- CreateIndex
CREATE INDEX "ContractorEmployee_status_idx" ON "ContractorEmployee"("status");

-- CreateIndex
CREATE INDEX "ContractorEmployee_email_idx" ON "ContractorEmployee"("email");

-- CreateIndex
CREATE INDEX "ContractorTimeEntry_contractorId_idx" ON "ContractorTimeEntry"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTimeEntry_employeeId_idx" ON "ContractorTimeEntry"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorTimeEntry_jobId_idx" ON "ContractorTimeEntry"("jobId");

-- CreateIndex
CREATE INDEX "ContractorTimeEntry_clockIn_idx" ON "ContractorTimeEntry"("clockIn");

-- CreateIndex
CREATE INDEX "ContractorTimeEntry_status_idx" ON "ContractorTimeEntry"("status");

-- CreateIndex
CREATE INDEX "ContractorExpense_contractorId_idx" ON "ContractorExpense"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorExpense_jobId_idx" ON "ContractorExpense"("jobId");

-- CreateIndex
CREATE INDEX "ContractorExpense_category_idx" ON "ContractorExpense"("category");

-- CreateIndex
CREATE INDEX "ContractorExpense_expenseDate_idx" ON "ContractorExpense"("expenseDate");

-- CreateIndex
CREATE INDEX "ContractorJobAssignment_contractorId_idx" ON "ContractorJobAssignment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorJobAssignment_jobId_idx" ON "ContractorJobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "ContractorJobAssignment_employeeId_idx" ON "ContractorJobAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorJobAssignment_jobId_employeeId_key" ON "ContractorJobAssignment"("jobId", "employeeId");

-- CreateIndex
CREATE INDEX "ContractorChangeOrder_contractorId_idx" ON "ContractorChangeOrder"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorChangeOrder_jobId_idx" ON "ContractorChangeOrder"("jobId");

-- CreateIndex
CREATE INDEX "ContractorChangeOrder_status_idx" ON "ContractorChangeOrder"("status");

-- CreateIndex
CREATE INDEX "ContractorJobMilestone_contractorId_idx" ON "ContractorJobMilestone"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorJobMilestone_jobId_idx" ON "ContractorJobMilestone"("jobId");

-- CreateIndex
CREATE INDEX "ContractorJobMilestone_status_idx" ON "ContractorJobMilestone"("status");

-- CreateIndex
CREATE INDEX "ContractorJobNote_contractorId_idx" ON "ContractorJobNote"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorJobNote_jobId_idx" ON "ContractorJobNote"("jobId");

-- CreateIndex
CREATE INDEX "ContractorJobNote_createdAt_idx" ON "ContractorJobNote"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorMarketingCampaign_contractorId_idx" ON "ContractorMarketingCampaign"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorMarketingCampaign_status_idx" ON "ContractorMarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "ContractorMarketingCampaign_scheduledFor_idx" ON "ContractorMarketingCampaign"("scheduledFor");

-- CreateIndex
CREATE INDEX "ContractorReferral_contractorId_idx" ON "ContractorReferral"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorReferral_referrerId_idx" ON "ContractorReferral"("referrerId");

-- CreateIndex
CREATE INDEX "ContractorReferral_status_idx" ON "ContractorReferral"("status");

-- CreateIndex
CREATE INDEX "ContractorBlockedDate_contractorId_idx" ON "ContractorBlockedDate"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorBlockedDate_startDate_endDate_idx" ON "ContractorBlockedDate"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "ContractorServiceDuration_contractorId_idx" ON "ContractorServiceDuration"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorServiceDuration_contractorId_serviceName_key" ON "ContractorServiceDuration"("contractorId", "serviceName");

-- CreateIndex
CREATE INDEX "ContractorQuote_leadId_idx" ON "ContractorQuote"("leadId");

-- CreateIndex
CREATE INDEX "ContractorQuote_contractorId_idx" ON "ContractorQuote"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorQuote_customerId_idx" ON "ContractorQuote"("customerId");

-- CreateIndex
CREATE INDEX "ContractorQuote_status_idx" ON "ContractorQuote"("status");

-- CreateIndex
CREATE INDEX "ContractorQuote_validUntil_idx" ON "ContractorQuote"("validUntil");

-- CreateIndex
CREATE INDEX "ContractorQuote_createdAt_idx" ON "ContractorQuote"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorQuoteCounter_originalQuoteId_idx" ON "ContractorQuoteCounter"("originalQuoteId");

-- CreateIndex
CREATE INDEX "ContractorQuoteCounter_status_idx" ON "ContractorQuoteCounter"("status");

-- CreateIndex
CREATE INDEX "ContractorQuoteCounter_createdAt_idx" ON "ContractorQuoteCounter"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorQuoteMessage_quoteId_idx" ON "ContractorQuoteMessage"("quoteId");

-- CreateIndex
CREATE INDEX "ContractorQuoteMessage_fromId_idx" ON "ContractorQuoteMessage"("fromId");

-- CreateIndex
CREATE INDEX "ContractorQuoteMessage_toId_idx" ON "ContractorQuoteMessage"("toId");

-- CreateIndex
CREATE INDEX "ContractorQuoteMessage_createdAt_idx" ON "ContractorQuoteMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorBid_jobId_idx" ON "ContractorBid"("jobId");

-- CreateIndex
CREATE INDEX "ContractorBid_contractorId_idx" ON "ContractorBid"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorBid_status_idx" ON "ContractorBid"("status");

-- CreateIndex
CREATE INDEX "ContractorBid_validUntil_idx" ON "ContractorBid"("validUntil");

-- CreateIndex
CREATE INDEX "ContractorBid_createdAt_idx" ON "ContractorBid"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorBid_jobId_contractorId_key" ON "ContractorBid"("jobId", "contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorVerification_contractorId_key" ON "ContractorVerification"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorVerification_contractorId_idx" ON "ContractorVerification"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorVerification_verificationStatus_idx" ON "ContractorVerification"("verificationStatus");

-- CreateIndex
CREATE INDEX "ContractorVerification_identityStatus_idx" ON "ContractorVerification"("identityStatus");

-- CreateIndex
CREATE INDEX "ContractorVerification_licenseStatus_idx" ON "ContractorVerification"("licenseStatus");

-- CreateIndex
CREATE INDEX "ContractorVerification_insuranceStatus_idx" ON "ContractorVerification"("insuranceStatus");

-- CreateIndex
CREATE INDEX "ContractorVerification_backgroundCheckStatus_idx" ON "ContractorVerification"("backgroundCheckStatus");

-- CreateIndex
CREATE INDEX "ContractorVerificationDocument_contractorId_idx" ON "ContractorVerificationDocument"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorVerificationDocument_documentType_idx" ON "ContractorVerificationDocument"("documentType");

-- CreateIndex
CREATE INDEX "ContractorVerificationDocument_status_idx" ON "ContractorVerificationDocument"("status");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "SavedSearch_emailAlerts_idx" ON "SavedSearch"("emailAlerts");

-- CreateIndex
CREATE INDEX "FavoriteContractor_userId_idx" ON "FavoriteContractor"("userId");

-- CreateIndex
CREATE INDEX "FavoriteContractor_contractorId_idx" ON "FavoriteContractor"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteContractor_userId_contractorId_key" ON "FavoriteContractor"("userId", "contractorId");

-- CreateIndex
CREATE INDEX "ContractorPortfolioItem_contractorId_idx" ON "ContractorPortfolioItem"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPortfolioItem_category_idx" ON "ContractorPortfolioItem"("category");

-- CreateIndex
CREATE INDEX "ContractorPortfolioItem_featured_idx" ON "ContractorPortfolioItem"("featured");

-- CreateIndex
CREATE INDEX "ContractorPortfolioItem_isPublic_idx" ON "ContractorPortfolioItem"("isPublic");

-- CreateIndex
CREATE INDEX "ContractorReview_contractorId_idx" ON "ContractorReview"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorReview_customerId_idx" ON "ContractorReview"("customerId");

-- CreateIndex
CREATE INDEX "ContractorReview_overallRating_idx" ON "ContractorReview"("overallRating");

-- CreateIndex
CREATE INDEX "ContractorReview_verified_idx" ON "ContractorReview"("verified");

-- CreateIndex
CREATE INDEX "ContractorReview_status_idx" ON "ContractorReview"("status");

-- CreateIndex
CREATE INDEX "ContractorReview_createdAt_idx" ON "ContractorReview"("createdAt");

-- CreateIndex
CREATE INDEX "ReviewHelpful_reviewId_idx" ON "ReviewHelpful"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewHelpful_userId_idx" ON "ReviewHelpful"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewHelpful_reviewId_userId_key" ON "ReviewHelpful"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "ContractorRole_contractorId_idx" ON "ContractorRole"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorRole_isActive_idx" ON "ContractorRole"("isActive");

-- CreateIndex
CREATE INDEX "ContractorCommunication_contractorId_idx" ON "ContractorCommunication"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorCommunication_leadId_idx" ON "ContractorCommunication"("leadId");

-- CreateIndex
CREATE INDEX "ContractorCommunication_customerId_idx" ON "ContractorCommunication"("customerId");

-- CreateIndex
CREATE INDEX "ContractorCommunication_employeeId_idx" ON "ContractorCommunication"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorCommunication_sentAt_idx" ON "ContractorCommunication"("sentAt");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_contractorId_idx" ON "ContractorInventoryItem"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_vendorId_idx" ON "ContractorInventoryItem"("vendorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_category_idx" ON "ContractorInventoryItem"("category");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_qrCode_idx" ON "ContractorInventoryItem"("qrCode");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_barcode_idx" ON "ContractorInventoryItem"("barcode");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_quantity_idx" ON "ContractorInventoryItem"("quantity");

-- CreateIndex
CREATE INDEX "ContractorInventoryItem_warehouseZone_idx" ON "ContractorInventoryItem"("warehouseZone");

-- CreateIndex
CREATE INDEX "ContractorInventoryUsage_contractorId_idx" ON "ContractorInventoryUsage"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryUsage_itemId_idx" ON "ContractorInventoryUsage"("itemId");

-- CreateIndex
CREATE INDEX "ContractorInventoryUsage_jobId_idx" ON "ContractorInventoryUsage"("jobId");

-- CreateIndex
CREATE INDEX "ContractorInventoryUsage_usedDate_idx" ON "ContractorInventoryUsage"("usedDate");

-- CreateIndex
CREATE INDEX "ContractorInventoryReorder_contractorId_idx" ON "ContractorInventoryReorder"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReorder_itemId_idx" ON "ContractorInventoryReorder"("itemId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReorder_vendorId_idx" ON "ContractorInventoryReorder"("vendorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReorder_status_idx" ON "ContractorInventoryReorder"("status");

-- CreateIndex
CREATE INDEX "ContractorInventoryReorder_orderDate_idx" ON "ContractorInventoryReorder"("orderDate");

-- CreateIndex
CREATE INDEX "ContractorTruck_contractorId_idx" ON "ContractorTruck"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTruck_assignedDriverId_idx" ON "ContractorTruck"("assignedDriverId");

-- CreateIndex
CREATE INDEX "ContractorTruck_status_idx" ON "ContractorTruck"("status");

-- CreateIndex
CREATE INDEX "ContractorTruckInventory_contractorId_idx" ON "ContractorTruckInventory"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTruckInventory_truckId_idx" ON "ContractorTruckInventory"("truckId");

-- CreateIndex
CREATE INDEX "ContractorTruckInventory_itemId_idx" ON "ContractorTruckInventory"("itemId");

-- CreateIndex
CREATE INDEX "ContractorTruckInventory_status_idx" ON "ContractorTruckInventory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorTruckInventory_truckId_itemId_key" ON "ContractorTruckInventory"("truckId", "itemId");

-- CreateIndex
CREATE INDEX "ContractorTruckLoad_contractorId_idx" ON "ContractorTruckLoad"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTruckLoad_truckId_idx" ON "ContractorTruckLoad"("truckId");

-- CreateIndex
CREATE INDEX "ContractorTruckLoad_jobId_idx" ON "ContractorTruckLoad"("jobId");

-- CreateIndex
CREATE INDEX "ContractorTruckLoad_loadedAt_idx" ON "ContractorTruckLoad"("loadedAt");

-- CreateIndex
CREATE INDEX "ContractorJobMaterial_contractorId_idx" ON "ContractorJobMaterial"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorJobMaterial_jobId_idx" ON "ContractorJobMaterial"("jobId");

-- CreateIndex
CREATE INDEX "ContractorJobMaterial_itemId_idx" ON "ContractorJobMaterial"("itemId");

-- CreateIndex
CREATE INDEX "ContractorJobMaterial_status_idx" ON "ContractorJobMaterial"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorJobMaterial_jobId_itemId_key" ON "ContractorJobMaterial"("jobId", "itemId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReceiving_contractorId_idx" ON "ContractorInventoryReceiving"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReceiving_itemId_idx" ON "ContractorInventoryReceiving"("itemId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReceiving_reorderId_idx" ON "ContractorInventoryReceiving"("reorderId");

-- CreateIndex
CREATE INDEX "ContractorInventoryReceiving_receivedAt_idx" ON "ContractorInventoryReceiving"("receivedAt");

-- CreateIndex
CREATE INDEX "ContractorEquipment_contractorId_idx" ON "ContractorEquipment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorEquipment_status_idx" ON "ContractorEquipment"("status");

-- CreateIndex
CREATE INDEX "ContractorEquipment_assignedToId_idx" ON "ContractorEquipment"("assignedToId");

-- CreateIndex
CREATE INDEX "ContractorEquipment_qrCode_idx" ON "ContractorEquipment"("qrCode");

-- CreateIndex
CREATE INDEX "ContractorVendor_contractorId_idx" ON "ContractorVendor"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorVendor_category_idx" ON "ContractorVendor"("category");

-- CreateIndex
CREATE INDEX "ContractorVendor_isActive_idx" ON "ContractorVendor"("isActive");

-- CreateIndex
CREATE INDEX "ContractorTimeOff_contractorId_idx" ON "ContractorTimeOff"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorTimeOff_employeeId_idx" ON "ContractorTimeOff"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorTimeOff_status_idx" ON "ContractorTimeOff"("status");

-- CreateIndex
CREATE INDEX "ContractorTimeOff_startDate_idx" ON "ContractorTimeOff"("startDate");

-- CreateIndex
CREATE INDEX "ContractorCertification_contractorId_idx" ON "ContractorCertification"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorCertification_employeeId_idx" ON "ContractorCertification"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorCertification_status_idx" ON "ContractorCertification"("status");

-- CreateIndex
CREATE INDEX "ContractorCertification_expiryDate_idx" ON "ContractorCertification"("expiryDate");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_contractorId_idx" ON "ContractorIncidentReport"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_jobId_idx" ON "ContractorIncidentReport"("jobId");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_employeeId_idx" ON "ContractorIncidentReport"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_type_idx" ON "ContractorIncidentReport"("type");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_severity_idx" ON "ContractorIncidentReport"("severity");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_status_idx" ON "ContractorIncidentReport"("status");

-- CreateIndex
CREATE INDEX "ContractorIncidentReport_incidentDate_idx" ON "ContractorIncidentReport"("incidentDate");

-- CreateIndex
CREATE UNIQUE INDEX "JobEscrow_contractorJobId_key" ON "JobEscrow"("contractorJobId");

-- CreateIndex
CREATE INDEX "JobEscrow_contractorJobId_idx" ON "JobEscrow"("contractorJobId");

-- CreateIndex
CREATE INDEX "JobEscrow_status_idx" ON "JobEscrow"("status");

-- CreateIndex
CREATE INDEX "JobEscrow_fundedAt_idx" ON "JobEscrow"("fundedAt");

-- CreateIndex
CREATE INDEX "JobMilestone_escrowId_idx" ON "JobMilestone"("escrowId");

-- CreateIndex
CREATE INDEX "JobMilestone_status_idx" ON "JobMilestone"("status");

-- CreateIndex
CREATE INDEX "JobMilestone_order_idx" ON "JobMilestone"("order");

-- CreateIndex
CREATE INDEX "JobMilestone_autoReleaseAt_idx" ON "JobMilestone"("autoReleaseAt");

-- CreateIndex
CREATE INDEX "EscrowRelease_escrowId_idx" ON "EscrowRelease"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowRelease_milestoneId_idx" ON "EscrowRelease"("milestoneId");

-- CreateIndex
CREATE INDEX "EscrowRelease_status_idx" ON "EscrowRelease"("status");

-- CreateIndex
CREATE INDEX "EscrowRelease_releaseType_idx" ON "EscrowRelease"("releaseType");

-- CreateIndex
CREATE INDEX "EscrowRelease_releasedAt_idx" ON "EscrowRelease"("releasedAt");

-- CreateIndex
CREATE INDEX "EscrowDispute_escrowId_idx" ON "EscrowDispute"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowDispute_milestoneId_idx" ON "EscrowDispute"("milestoneId");

-- CreateIndex
CREATE INDEX "EscrowDispute_filedBy_idx" ON "EscrowDispute"("filedBy");

-- CreateIndex
CREATE INDEX "EscrowDispute_status_idx" ON "EscrowDispute"("status");

-- CreateIndex
CREATE INDEX "EscrowDispute_createdAt_idx" ON "EscrowDispute"("createdAt");

-- CreateIndex
CREATE INDEX "MilestoneTemplate_category_idx" ON "MilestoneTemplate"("category");

-- CreateIndex
CREATE INDEX "MilestoneTemplate_isDefault_idx" ON "MilestoneTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "MilestoneTemplate_isActive_idx" ON "MilestoneTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorPurchaseOrder_poNumber_key" ON "ContractorPurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_contractorId_idx" ON "ContractorPurchaseOrder"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_status_idx" ON "ContractorPurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_vendorId_idx" ON "ContractorPurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_jobId_idx" ON "ContractorPurchaseOrder"("jobId");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_subcontractorId_idx" ON "ContractorPurchaseOrder"("subcontractorId");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrder_orderDate_idx" ON "ContractorPurchaseOrder"("orderDate");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrderItem_poId_idx" ON "ContractorPurchaseOrderItem"("poId");

-- CreateIndex
CREATE INDEX "ContractorPurchaseOrderItem_inventoryItemId_idx" ON "ContractorPurchaseOrderItem"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorWarranty_warrantyNumber_key" ON "ContractorWarranty"("warrantyNumber");

-- CreateIndex
CREATE INDEX "ContractorWarranty_contractorId_idx" ON "ContractorWarranty"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorWarranty_customerId_idx" ON "ContractorWarranty"("customerId");

-- CreateIndex
CREATE INDEX "ContractorWarranty_status_idx" ON "ContractorWarranty"("status");

-- CreateIndex
CREATE INDEX "ContractorWarranty_endDate_idx" ON "ContractorWarranty"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorWarrantyClaim_claimNumber_key" ON "ContractorWarrantyClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "ContractorWarrantyClaim_warrantyId_idx" ON "ContractorWarrantyClaim"("warrantyId");

-- CreateIndex
CREATE INDEX "ContractorWarrantyClaim_status_idx" ON "ContractorWarrantyClaim"("status");

-- CreateIndex
CREATE INDEX "ContractorWarrantyClaim_reportedDate_idx" ON "ContractorWarrantyClaim"("reportedDate");

-- CreateIndex
CREATE INDEX "ContractorSubcontractor_contractorId_idx" ON "ContractorSubcontractor"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractor_status_idx" ON "ContractorSubcontractor"("status");

-- CreateIndex
CREATE INDEX "ContractorSubcontractor_email_idx" ON "ContractorSubcontractor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorSubcontractor_contractorId_email_key" ON "ContractorSubcontractor"("contractorId", "email");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorAssignment_subcontractorId_idx" ON "ContractorSubcontractorAssignment"("subcontractorId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorAssignment_jobId_idx" ON "ContractorSubcontractorAssignment"("jobId");

-- CreateIndex
CREATE INDEX "ContractorSubcontractorAssignment_status_idx" ON "ContractorSubcontractorAssignment"("status");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklist_contractorId_idx" ON "ContractorSafetyChecklist"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklist_category_idx" ON "ContractorSafetyChecklist"("category");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklist_isActive_idx" ON "ContractorSafetyChecklist"("isActive");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistItem_checklistId_idx" ON "ContractorSafetyChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistItem_order_idx" ON "ContractorSafetyChecklistItem"("order");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistCompletion_contractorId_idx" ON "ContractorSafetyChecklistCompletion"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistCompletion_checklistId_idx" ON "ContractorSafetyChecklistCompletion"("checklistId");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistCompletion_jobId_idx" ON "ContractorSafetyChecklistCompletion"("jobId");

-- CreateIndex
CREATE INDEX "ContractorSafetyChecklistCompletion_completedAt_idx" ON "ContractorSafetyChecklistCompletion"("completedAt");

-- CreateIndex
CREATE INDEX "ContractorJobPhoto_jobId_idx" ON "ContractorJobPhoto"("jobId");

-- CreateIndex
CREATE INDEX "ContractorJobPhoto_category_idx" ON "ContractorJobPhoto"("category");

-- CreateIndex
CREATE INDEX "ContractorJobPhoto_takenAt_idx" ON "ContractorJobPhoto"("takenAt");

-- CreateIndex
CREATE INDEX "ContractorJobPhoto_milestoneId_idx" ON "ContractorJobPhoto"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorContract_contractNumber_key" ON "ContractorContract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorContract_token_key" ON "ContractorContract"("token");

-- CreateIndex
CREATE INDEX "ContractorContract_contractorId_idx" ON "ContractorContract"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorContract_jobId_idx" ON "ContractorContract"("jobId");

-- CreateIndex
CREATE INDEX "ContractorContract_status_idx" ON "ContractorContract"("status");

-- CreateIndex
CREATE INDEX "ContractorContract_token_idx" ON "ContractorContract"("token");

-- CreateIndex
CREATE INDEX "ContractorContract_customerEmail_idx" ON "ContractorContract"("customerEmail");

-- CreateIndex
CREATE INDEX "ContractorContract_contractNumber_idx" ON "ContractorContract"("contractNumber");

-- CreateIndex
CREATE INDEX "ContractorContractEvent_contractId_idx" ON "ContractorContractEvent"("contractId");

-- CreateIndex
CREATE INDEX "ContractorContractEvent_eventType_idx" ON "ContractorContractEvent"("eventType");

-- CreateIndex
CREATE INDEX "ContractorContractEvent_createdAt_idx" ON "ContractorContractEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorFinancialSummary_contractorId_idx" ON "ContractorFinancialSummary"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorFinancialSummary_year_month_idx" ON "ContractorFinancialSummary"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorFinancialSummary_contractorId_year_month_key" ON "ContractorFinancialSummary"("contractorId", "year", "month");

-- CreateIndex
CREATE INDEX "ContractorPayroll_contractorId_idx" ON "ContractorPayroll"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPayroll_status_idx" ON "ContractorPayroll"("status");

-- CreateIndex
CREATE INDEX "ContractorPayroll_periodStart_periodEnd_idx" ON "ContractorPayroll"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ContractorPayroll_payDate_idx" ON "ContractorPayroll"("payDate");

-- CreateIndex
CREATE INDEX "ContractorPaycheck_payrollId_idx" ON "ContractorPaycheck"("payrollId");

-- CreateIndex
CREATE INDEX "ContractorPaycheck_employeeId_idx" ON "ContractorPaycheck"("employeeId");

-- CreateIndex
CREATE INDEX "ContractorPaycheck_contractorId_idx" ON "ContractorPaycheck"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPaycheck_status_idx" ON "ContractorPaycheck"("status");

-- CreateIndex
CREATE INDEX "ContractorPaycheck_paidAt_idx" ON "ContractorPaycheck"("paidAt");

-- CreateIndex
CREATE INDEX "ContractorDispatchBoard_contractorId_idx" ON "ContractorDispatchBoard"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorLabelConfig_contractorId_idx" ON "ContractorLabelConfig"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorLabelConfig_labelType_idx" ON "ContractorLabelConfig"("labelType");

-- CreateIndex
CREATE INDEX "ContractorLabel_contractorId_idx" ON "ContractorLabel"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorLabel_labelNumber_idx" ON "ContractorLabel"("labelNumber");

-- CreateIndex
CREATE INDEX "ContractorLabel_itemId_idx" ON "ContractorLabel"("itemId");

-- CreateIndex
CREATE INDEX "ContractorLabel_labelType_idx" ON "ContractorLabel"("labelType");

-- CreateIndex
CREATE INDEX "ContractorLabel_status_idx" ON "ContractorLabel"("status");

-- CreateIndex
CREATE INDEX "ContractorShipment_contractorId_idx" ON "ContractorShipment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorShipment_shipmentNumber_idx" ON "ContractorShipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "ContractorShipment_status_idx" ON "ContractorShipment"("status");

-- CreateIndex
CREATE INDEX "ContractorShipmentItem_shipmentId_idx" ON "ContractorShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ContractorShipmentItem_itemId_idx" ON "ContractorShipmentItem"("itemId");

-- CreateIndex
CREATE INDEX "ContractorHiringPost_contractorId_idx" ON "ContractorHiringPost"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorHiringPost_status_idx" ON "ContractorHiringPost"("status");

-- CreateIndex
CREATE INDEX "ContractorHiringApplication_contractorId_idx" ON "ContractorHiringApplication"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorHiringApplication_postId_idx" ON "ContractorHiringApplication"("postId");

-- CreateIndex
CREATE INDEX "ContractorHiringApplication_status_idx" ON "ContractorHiringApplication"("status");

-- CreateIndex
CREATE INDEX "ContractorHiringApplication_email_idx" ON "ContractorHiringApplication"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BetaProgram_code_key" ON "BetaProgram"("code");

-- CreateIndex
CREATE INDEX "BetaProgram_code_idx" ON "BetaProgram"("code");

-- CreateIndex
CREATE INDEX "BetaProgram_audience_idx" ON "BetaProgram"("audience");

-- CreateIndex
CREATE INDEX "BetaTester_userId_idx" ON "BetaTester"("userId");

-- CreateIndex
CREATE INDEX "BetaTester_audience_idx" ON "BetaTester"("audience");

-- CreateIndex
CREATE INDEX "BetaTester_freePeriodEnd_idx" ON "BetaTester"("freePeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "BetaTester_programId_userId_key" ON "BetaTester"("programId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BetaTester_userId_audience_key" ON "BetaTester"("userId", "audience");

-- CreateIndex
CREATE UNIQUE INDEX "BetaTester_landlordId_key" ON "BetaTester"("landlordId");

-- CreateIndex
CREATE UNIQUE INDEX "BetaTester_contractorProfileId_key" ON "BetaTester"("contractorProfileId");

-- CreateIndex
CREATE INDEX "BetaFeedback_betaTesterId_idx" ON "BetaFeedback"("betaTesterId");

-- CreateIndex
CREATE INDEX "BetaFeedback_audience_idx" ON "BetaFeedback"("audience");

-- CreateIndex
CREATE INDEX "BetaFeedback_status_idx" ON "BetaFeedback"("status");

-- CreateIndex
CREATE INDEX "BetaFeedback_category_idx" ON "BetaFeedback"("category");

-- CreateIndex
CREATE INDEX "BetaFeedback_isFeaturedTestimonial_idx" ON "BetaFeedback"("isFeaturedTestimonial");

-- CreateIndex
CREATE INDEX "BetaFeedbackMessage_feedbackId_idx" ON "BetaFeedbackMessage"("feedbackId");

-- CreateIndex
CREATE INDEX "BetaFeedbackMessage_createdAt_idx" ON "BetaFeedbackMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "Color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "Size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPaymentMethod" ADD CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethodVerificationToken" ADD CONSTRAINT "PaymentMethodVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPromo" ADD CONSTRAINT "ProductPromo_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPromo" ADD CONSTRAINT "ProductPromo_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayment" ADD CONSTRAINT "CashPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayment" ADD CONSTRAINT "CashPayment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MessageFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadParticipant" ADD CONSTRAINT "ThreadParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageFolder" ADD CONSTRAINT "MessageFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReaction" ADD CONSTRAINT "BlogReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogReaction" ADD CONSTRAINT "BlogReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Landlord" ADD CONSTRAINT "Landlord_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homeowner" ADD CONSTRAINT "Homeowner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerWorkOrder" ADD CONSTRAINT "HomeownerWorkOrder_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "Homeowner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerWorkOrderBid" ADD CONSTRAINT "HomeownerWorkOrderBid_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "HomeownerWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickBooksConnection" ADD CONSTRAINT "QuickBooksConnection_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocuSignConnection" ADD CONSTRAINT "DocuSignConnection_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPayoutMethod" ADD CONSTRAINT "SavedPayoutMethod_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_defaultLeaseDocumentId_fkey" FOREIGN KEY ("defaultLeaseDocumentId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_legalDocumentId_fkey" FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LeaseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "RecurringCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringCharge" ADD CONSTRAINT "recurring_charge_tenant_fk" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentPayment" ADD CONSTRAINT "RentPayment_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_rentPaymentId_fkey" FOREIGN KEY ("rentPaymentId") REFERENCES "RentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFee" ADD CONSTRAINT "PlatformFee_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFee" ADD CONSTRAINT "PlatformFee_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBenchmark" ADD CONSTRAINT "MarketBenchmark_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketBenchmark" ADD CONSTRAINT "MarketBenchmark_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFinance" ADD CONSTRAINT "PropertyFinance_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseViolation" ADD CONSTRAINT "LeaseViolation_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseViolation" ADD CONSTRAINT "LeaseViolation_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseViolation" ADD CONSTRAINT "LeaseViolation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseViolation" ADD CONSTRAINT "LeaseViolation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseTemplate" ADD CONSTRAINT "LeaseTemplate_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLeaseTemplate" ADD CONSTRAINT "PropertyLeaseTemplate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLeaseTemplate" ADD CONSTRAINT "PropertyLeaseTemplate_leaseTemplateId_fkey" FOREIGN KEY ("leaseTemplateId") REFERENCES "LeaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignatureRequest" ADD CONSTRAINT "DocumentSignatureRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignatureRequest" ADD CONSTRAINT "DocumentSignatureRequest_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInspection" ADD CONSTRAINT "PropertyInspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "PropertyInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertySchedule" ADD CONSTRAINT "PropertySchedule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAppointment" ADD CONSTRAINT "PropertyAppointment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentClassificationRule" ADD CONSTRAINT "DocumentClassificationRule_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordSubscription" ADD CONSTRAINT "LandlordSubscription_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChannelMember" ADD CONSTRAINT "TeamChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TeamChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "TeamChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationDocument" ADD CONSTRAINT "VerificationDocument_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationVerification" ADD CONSTRAINT "ApplicationVerification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "RentalApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentVerificationUsage" ADD CONSTRAINT "EmploymentVerificationUsage_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudDetectionLog" ADD CONSTRAINT "FraudDetectionLog_verificationDocumentId_fkey" FOREIGN KEY ("verificationDocumentId") REFERENCES "VerificationDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyBankAccount" ADD CONSTRAINT "PropertyBankAccount_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvoice" ADD CONSTRAINT "TenantInvoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantInvoice" ADD CONSTRAINT "TenantInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordWallet" ADD CONSTRAINT "LandlordWallet_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "LandlordWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvictionNotice" ADD CONSTRAINT "EvictionNotice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDeparture" ADD CONSTRAINT "TenantDeparture_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositDisposition" ADD CONSTRAINT "DepositDisposition_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositDeductionItem" ADD CONSTRAINT "DepositDeductionItem_depositDispositionId_fkey" FOREIGN KEY ("depositDispositionId") REFERENCES "DepositDisposition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitTurnoverChecklist" ADD CONSTRAINT "UnitTurnoverChecklist_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantHistory" ADD CONSTRAINT "TenantHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantHistory" ADD CONSTRAINT "TenantHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contractor" ADD CONSTRAINT "Contractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEstimate" ADD CONSTRAINT "ContractorEstimate_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEstimate" ADD CONSTRAINT "ContractorEstimate_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEstimate" ADD CONSTRAINT "ContractorEstimate_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvite" ADD CONSTRAINT "ContractorInvite_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvite" ADD CONSTRAINT "ContractorInvite_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderBid" ADD CONSTRAINT "WorkOrderBid_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderBid" ADD CONSTRAINT "WorkOrderBid_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderBidMessage" ADD CONSTRAINT "WorkOrderBidMessage_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "WorkOrderBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderBidMessage" ADD CONSTRAINT "WorkOrderBidMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_maintenanceTicketId_fkey" FOREIGN KEY ("maintenanceTicketId") REFERENCES "MaintenanceTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderStatusEvent" ADD CONSTRAINT "WorkOrderStatusEvent_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderDispute" ADD CONSTRAINT "WorkOrderDispute_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMilestone" ADD CONSTRAINT "WorkOrderMilestone_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMedia" ADD CONSTRAINT "WorkOrderMedia_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderMedia" ADD CONSTRAINT "WorkOrderMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHistory" ADD CONSTRAINT "WorkOrderHistory_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderHistory" ADD CONSTRAINT "WorkOrderHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberCompensation" ADD CONSTRAINT "TeamMemberCompensation_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMemberAvailability" ADD CONSTRAINT "TeamMemberAvailability_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffRequest" ADD CONSTRAINT "TimeOffRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPayment" ADD CONSTRAINT "TeamPayment_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSettings" ADD CONSTRAINT "PayrollSettings_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicant" ADD CONSTRAINT "JobApplicant_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicant" ADD CONSTRAINT "JobApplicant_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicantMessage" ADD CONSTRAINT "JobApplicantMessage_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "JobApplicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyReview" ADD CONSTRAINT "CompanyReview_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorkOrder" ADD CONSTRAINT "AgentWorkOrder_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorkOrder" ADD CONSTRAINT "AgentWorkOrder_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AgentListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorkOrderBid" ADD CONSTRAINT "AgentWorkOrderBid_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "AgentWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentListing" ADD CONSTRAINT "AgentListing_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLead" ADD CONSTRAINT "AgentLead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentLead" ADD CONSTRAINT "AgentLead_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AgentListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOpenHouse" ADD CONSTRAINT "AgentOpenHouse_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentOpenHouse" ADD CONSTRAINT "AgentOpenHouse_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "AgentListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "AffiliatePayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliatePayout" ADD CONSTRAINT "AffiliatePayout_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "Landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorApiKey" ADD CONSTRAINT "ContractorApiKey_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorWebhookEndpoint" ADD CONSTRAINT "ContractorWebhookEndpoint_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQBConnection" ADD CONSTRAINT "ContractorQBConnection_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSubcontractorPayment" ADD CONSTRAINT "ContractorSubcontractorPayment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSubcontractorPayment" ADD CONSTRAINT "ContractorSubcontractorPayment_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "ContractorSubcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccountTransaction" ADD CONSTRAINT "FinancialAccountTransaction_financialAccountId_fkey" FOREIGN KEY ("financialAccountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuingCard" ADD CONSTRAINT "IssuingCard_cardholderId_fkey" FOREIGN KEY ("cardholderId") REFERENCES "IssuingCardholder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuingAuthorization" ADD CONSTRAINT "IssuingAuthorization_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "IssuingCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuingTransaction" ADD CONSTRAINT "IssuingTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "IssuingCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorProfile" ADD CONSTRAINT "ContractorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorUsageTracking" ADD CONSTRAINT "ContractorUsageTracking_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTeamChannelMember" ADD CONSTRAINT "ContractorTeamChannelMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ContractorTeamChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTeamMessage" ADD CONSTRAINT "ContractorTeamMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ContractorTeamChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyFeeSettings" ADD CONSTRAINT "PropertyFeeSettings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLead" ADD CONSTRAINT "ContractorLead_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLeadMatch" ADD CONSTRAINT "ContractorLeadMatch_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ContractorLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLeadMatch" ADD CONSTRAINT "ContractorLeadMatch_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLeadCredit" ADD CONSTRAINT "ContractorLeadCredit_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCreditTransaction" ADD CONSTRAINT "ContractorCreditTransaction_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "ContractorLeadCredit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLeadPreferences" ADD CONSTRAINT "ContractorLeadPreferences_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorAppointment" ADD CONSTRAINT "ContractorAppointment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoice" ADD CONSTRAINT "ContractorInvoice_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInvoicePayment" ADD CONSTRAINT "ContractorInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ContractorInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCustomer" ADD CONSTRAINT "ContractorCustomer_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorAvailability" ADD CONSTRAINT "ContractorAvailability_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJob" ADD CONSTRAINT "ContractorJob_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJob" ADD CONSTRAINT "ContractorJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ContractorCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShift" ADD CONSTRAINT "ContractorShift_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShift" ADD CONSTRAINT "ContractorShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShift" ADD CONSTRAINT "ContractorShift_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEmployee" ADD CONSTRAINT "ContractorEmployee_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEmployee" ADD CONSTRAINT "ContractorEmployee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ContractorRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTimeEntry" ADD CONSTRAINT "ContractorTimeEntry_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTimeEntry" ADD CONSTRAINT "ContractorTimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTimeEntry" ADD CONSTRAINT "ContractorTimeEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorExpense" ADD CONSTRAINT "ContractorExpense_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorExpense" ADD CONSTRAINT "ContractorExpense_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobAssignment" ADD CONSTRAINT "ContractorJobAssignment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobAssignment" ADD CONSTRAINT "ContractorJobAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorChangeOrder" ADD CONSTRAINT "ContractorChangeOrder_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorChangeOrder" ADD CONSTRAINT "ContractorChangeOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobMilestone" ADD CONSTRAINT "ContractorJobMilestone_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobMilestone" ADD CONSTRAINT "ContractorJobMilestone_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobNote" ADD CONSTRAINT "ContractorJobNote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobNote" ADD CONSTRAINT "ContractorJobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorMarketingCampaign" ADD CONSTRAINT "ContractorMarketingCampaign_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReferral" ADD CONSTRAINT "ContractorReferral_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReferral" ADD CONSTRAINT "ContractorReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "ContractorCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReferral" ADD CONSTRAINT "ContractorReferral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "ContractorCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorBlockedDate" ADD CONSTRAINT "ContractorBlockedDate_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorServiceDuration" ADD CONSTRAINT "ContractorServiceDuration_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuote" ADD CONSTRAINT "ContractorQuote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "ContractorLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuote" ADD CONSTRAINT "ContractorQuote_leadMatchId_fkey" FOREIGN KEY ("leadMatchId") REFERENCES "ContractorLeadMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuote" ADD CONSTRAINT "ContractorQuote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuote" ADD CONSTRAINT "ContractorQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteCounter" ADD CONSTRAINT "ContractorQuoteCounter_originalQuoteId_fkey" FOREIGN KEY ("originalQuoteId") REFERENCES "ContractorQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteCounter" ADD CONSTRAINT "ContractorQuoteCounter_counterBy_fkey" FOREIGN KEY ("counterBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteCounter" ADD CONSTRAINT "ContractorQuoteCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteMessage" ADD CONSTRAINT "ContractorQuoteMessage_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ContractorQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteMessage" ADD CONSTRAINT "ContractorQuoteMessage_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorQuoteMessage" ADD CONSTRAINT "ContractorQuoteMessage_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorBid" ADD CONSTRAINT "ContractorBid_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorBid" ADD CONSTRAINT "ContractorBid_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorBid" ADD CONSTRAINT "ContractorBid_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorVerification" ADD CONSTRAINT "ContractorVerification_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorVerification" ADD CONSTRAINT "ContractorVerification_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorVerificationDocument" ADD CONSTRAINT "ContractorVerificationDocument_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorVerificationDocument" ADD CONSTRAINT "ContractorVerificationDocument_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteContractor" ADD CONSTRAINT "FavoriteContractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteContractor" ADD CONSTRAINT "FavoriteContractor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPortfolioItem" ADD CONSTRAINT "ContractorPortfolioItem_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorReview" ADD CONSTRAINT "ContractorReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHelpful" ADD CONSTRAINT "ReviewHelpful_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ContractorReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewHelpful" ADD CONSTRAINT "ReviewHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRole" ADD CONSTRAINT "ContractorRole_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCommunication" ADD CONSTRAINT "ContractorCommunication_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCommunication" ADD CONSTRAINT "ContractorCommunication_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryItem" ADD CONSTRAINT "ContractorInventoryItem_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryItem" ADD CONSTRAINT "ContractorInventoryItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ContractorVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryUsage" ADD CONSTRAINT "ContractorInventoryUsage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryUsage" ADD CONSTRAINT "ContractorInventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryUsage" ADD CONSTRAINT "ContractorInventoryUsage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReorder" ADD CONSTRAINT "ContractorInventoryReorder_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReorder" ADD CONSTRAINT "ContractorInventoryReorder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReorder" ADD CONSTRAINT "ContractorInventoryReorder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ContractorVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruck" ADD CONSTRAINT "ContractorTruck_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruck" ADD CONSTRAINT "ContractorTruck_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckInventory" ADD CONSTRAINT "ContractorTruckInventory_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckInventory" ADD CONSTRAINT "ContractorTruckInventory_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "ContractorTruck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckInventory" ADD CONSTRAINT "ContractorTruckInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckInventory" ADD CONSTRAINT "ContractorTruckInventory_loadedBy_fkey" FOREIGN KEY ("loadedBy") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckLoad" ADD CONSTRAINT "ContractorTruckLoad_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckLoad" ADD CONSTRAINT "ContractorTruckLoad_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "ContractorTruck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckLoad" ADD CONSTRAINT "ContractorTruckLoad_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTruckLoad" ADD CONSTRAINT "ContractorTruckLoad_loadedBy_fkey" FOREIGN KEY ("loadedBy") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobMaterial" ADD CONSTRAINT "ContractorJobMaterial_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobMaterial" ADD CONSTRAINT "ContractorJobMaterial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobMaterial" ADD CONSTRAINT "ContractorJobMaterial_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReceiving" ADD CONSTRAINT "ContractorInventoryReceiving_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReceiving" ADD CONSTRAINT "ContractorInventoryReceiving_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReceiving" ADD CONSTRAINT "ContractorInventoryReceiving_reorderId_fkey" FOREIGN KEY ("reorderId") REFERENCES "ContractorInventoryReorder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorInventoryReceiving" ADD CONSTRAINT "ContractorInventoryReceiving_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEquipment" ADD CONSTRAINT "ContractorEquipment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorEquipment" ADD CONSTRAINT "ContractorEquipment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorVendor" ADD CONSTRAINT "ContractorVendor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTimeOff" ADD CONSTRAINT "ContractorTimeOff_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorTimeOff" ADD CONSTRAINT "ContractorTimeOff_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCertification" ADD CONSTRAINT "ContractorCertification_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorCertification" ADD CONSTRAINT "ContractorCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorIncidentReport" ADD CONSTRAINT "ContractorIncidentReport_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorIncidentReport" ADD CONSTRAINT "ContractorIncidentReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorIncidentReport" ADD CONSTRAINT "ContractorIncidentReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEscrow" ADD CONSTRAINT "JobEscrow_contractorJobId_fkey" FOREIGN KEY ("contractorJobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMilestone" ADD CONSTRAINT "JobMilestone_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "JobEscrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRelease" ADD CONSTRAINT "EscrowRelease_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "JobEscrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRelease" ADD CONSTRAINT "EscrowRelease_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "JobMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowDispute" ADD CONSTRAINT "EscrowDispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "JobEscrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrder" ADD CONSTRAINT "ContractorPurchaseOrder_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrder" ADD CONSTRAINT "ContractorPurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "ContractorVendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrder" ADD CONSTRAINT "ContractorPurchaseOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrder" ADD CONSTRAINT "ContractorPurchaseOrder_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "ContractorSubcontractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrderItem" ADD CONSTRAINT "ContractorPurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "ContractorPurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPurchaseOrderItem" ADD CONSTRAINT "ContractorPurchaseOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorWarranty" ADD CONSTRAINT "ContractorWarranty_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorWarranty" ADD CONSTRAINT "ContractorWarranty_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorWarranty" ADD CONSTRAINT "ContractorWarranty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "ContractorCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorWarrantyClaim" ADD CONSTRAINT "ContractorWarrantyClaim_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "ContractorWarranty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSubcontractor" ADD CONSTRAINT "ContractorSubcontractor_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSubcontractorAssignment" ADD CONSTRAINT "ContractorSubcontractorAssignment_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "ContractorSubcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSubcontractorAssignment" ADD CONSTRAINT "ContractorSubcontractorAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSafetyChecklist" ADD CONSTRAINT "ContractorSafetyChecklist_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSafetyChecklistItem" ADD CONSTRAINT "ContractorSafetyChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ContractorSafetyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSafetyChecklistCompletion" ADD CONSTRAINT "ContractorSafetyChecklistCompletion_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ContractorSafetyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSafetyChecklistCompletion" ADD CONSTRAINT "ContractorSafetyChecklistCompletion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSafetyChecklistCompletion" ADD CONSTRAINT "ContractorSafetyChecklistCompletion_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobPhoto" ADD CONSTRAINT "ContractorJobPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorContract" ADD CONSTRAINT "ContractorContract_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorContract" ADD CONSTRAINT "ContractorContract_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ContractorJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorContractEvent" ADD CONSTRAINT "ContractorContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "ContractorContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorFinancialSummary" ADD CONSTRAINT "ContractorFinancialSummary_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayroll" ADD CONSTRAINT "ContractorPayroll_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPaycheck" ADD CONSTRAINT "ContractorPaycheck_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "ContractorPayroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPaycheck" ADD CONSTRAINT "ContractorPaycheck_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "ContractorEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPaycheck" ADD CONSTRAINT "ContractorPaycheck_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorDispatchBoard" ADD CONSTRAINT "ContractorDispatchBoard_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLabelConfig" ADD CONSTRAINT "ContractorLabelConfig_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLabel" ADD CONSTRAINT "ContractorLabel_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLabel" ADD CONSTRAINT "ContractorLabel_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ContractorLabelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLabel" ADD CONSTRAINT "ContractorLabel_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorLabel" ADD CONSTRAINT "ContractorLabel_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ContractorShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShipment" ADD CONSTRAINT "ContractorShipment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShipmentItem" ADD CONSTRAINT "ContractorShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ContractorShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorShipmentItem" ADD CONSTRAINT "ContractorShipmentItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ContractorInventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorHiringPost" ADD CONSTRAINT "ContractorHiringPost_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorHiringApplication" ADD CONSTRAINT "ContractorHiringApplication_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorHiringApplication" ADD CONSTRAINT "ContractorHiringApplication_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContractorHiringPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetaTester" ADD CONSTRAINT "BetaTester_programId_fkey" FOREIGN KEY ("programId") REFERENCES "BetaProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetaFeedback" ADD CONSTRAINT "BetaFeedback_betaTesterId_fkey" FOREIGN KEY ("betaTesterId") REFERENCES "BetaTester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetaFeedbackMessage" ADD CONSTRAINT "BetaFeedbackMessage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "BetaFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
