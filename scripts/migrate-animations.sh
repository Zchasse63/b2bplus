#!/bin/bash

# Script to migrate remaining animate-* classes to Framer Motion
# This will add necessary imports and replace class names

echo "Starting animation migration..."

# Files to migrate
FILES=(
  "apps/web/app/auth/login/page.tsx"
  "apps/web/app/auth/register/page.tsx"
  "apps/web/app/settings/page.tsx"
  "apps/web/app/tools/container-calculator/page.tsx"
  "apps/web/app/products/page.tsx"
  "apps/web/app/invoices/[id]/page.tsx"
  "apps/web/app/invoices/page.tsx"
  "apps/web/app/admin/customers/page.tsx"
  "apps/web/app/admin/products/new/page.tsx"
  "apps/web/app/admin/products/[id]/edit/page.tsx"
  "apps/web/app/admin/products/page.tsx"
  "apps/web/app/admin/crm/contacts/page.tsx"
  "apps/web/app/admin/features/page.tsx"
  "apps/web/app/admin/shipping/page.tsx"
  "apps/web/app/cart/page.tsx"
  "apps/web/app/checkout/page.tsx"
  "apps/web/app/orders/[id]/page.tsx"
  "apps/web/app/orders/bulk-upload/page.tsx"
  "apps/web/app/orders/history/page.tsx"
  "apps/web/app/orders/page.tsx"
  "apps/web/app/page.tsx"
  "apps/web/app/profile/page.tsx"
  "apps/web/app/admin/analytics/page.tsx"
  "apps/web/app/admin/campaigns/page.tsx"
  "apps/web/app/admin/inventory/page.tsx"
  "apps/web/app/admin/pricing/page.tsx"
  "apps/web/app/admin/recommendations/page.tsx"
  "apps/web/app/admin/reports/page.tsx"
)

echo "Found ${#FILES[@]} files to migrate"
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Check if file has animate- classes
    if grep -q "animate-" "$file"; then
      echo "  ✓ Found animate-* classes"
    fi
  fi
done

echo ""
echo "Migration analysis complete!"

