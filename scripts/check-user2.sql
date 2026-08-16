SELECT u.email, u.role, u."createdAt",
  l.subdomain, l."subscriptionStatus", l."trialStatus",
  l."stripeSubscriptionId", l."stripeCustomerId"
FROM "User" u
LEFT JOIN "Landlord" l ON l."ownerUserId" = u.id
ORDER BY u."createdAt" DESC
LIMIT 10;
