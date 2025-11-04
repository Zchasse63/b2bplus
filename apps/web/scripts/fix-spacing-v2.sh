#!/bin/bash

# More comprehensive spacing fixes
echo "🔧 Fixing remaining spacing issues..."

FILES=(
  "app/invoices/[id]/page.tsx"
  "app/invoices/page.tsx"
  "app/admin/customers/[id]/page.tsx"
  "app/admin/customers/analytics/page.tsx"
  "app/admin/products/page.tsx"
  "app/admin/products/analytics/page.tsx"
  "app/admin/recommendations/page.tsx"
  "app/admin/inventory/page.tsx"
  "app/admin/campaigns/page.tsx"
  "app/admin/pricing/tiers/page.tsx"
  "app/admin/analytics/page.tsx"
  "app/orders/bulk-upload/page.tsx"
  "app/orders/[id]/page.tsx"
)

for file in "${FILES[@]}"; do
  if [ ! -f "$file" ]; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Fix array/object spacing
  sed -i '' "s/Options=\[/Options = \[/g" "$file"
  sed -i '' "s/columns=\[/columns = \[/g" "$file"
  
  # Fix key: value spacing in objects
  sed -i '' "s/key:'/key: '/g" "$file"
  sed -i '' "s/header:'/header: '/g" "$file"
  sed -i '' "s/label:'/label: '/g" "$file"
  sed -i '' "s/sortable:true/sortable: true/g" "$file"
  sed -i '' "s/sortable:false/sortable: false/g" "$file"
  sed -i '' "s/render:(campaign/render: (campaign/g" "$file"
  sed -i '' "s/render:(customer/render: (customer/g" "$file"
  sed -i '' "s/render:(product/render: (product/g" "$file"
  sed -i '' "s/render:(order/render: (order/g" "$file"
  sed -i '' "s/render:(invoice/render: (invoice/g" "$file"
  sed -i '' "s/render:(item/render: (item/g" "$file"
  sed -i '' "s/render:(tier/render: (tier/g" "$file"
  sed -i '' "s/render:(recommendation/render: (recommendation/g" "$file"
  
  # Fix string concatenation in values
  sed -i '' "s/'AllCustomers'/'All Customers'/g" "$file"
  sed -i '' "s/'ActiveCustomers'/'Active Customers'/g" "$file"
  sed -i '' "s/'InactiveCustomers'/'Inactive Customers'/g" "$file"
  sed -i '' "s/'HighValueCustomers'/'High Value Customers'/g" "$file"
  sed -i '' "s/'CampaignName'/'Campaign Name'/g" "$file"
  
done

echo "✅ Additional spacing fixes complete!"

