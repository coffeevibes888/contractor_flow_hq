#!/bin/bash

echo ""
echo "========================================"
echo "   Seeding Marketplace Dummy Data"
echo "========================================"
echo ""
echo "This will create:"
echo "  - 250+ property listings"
echo "  - 350+ contractor profiles"
echo "  - Portfolio items and reviews"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "Running seed script..."
npx tsx db/seed-marketplace-dummy-data.ts

echo ""
echo "========================================"
echo "   Seeding Complete!"
echo "========================================"
echo ""
