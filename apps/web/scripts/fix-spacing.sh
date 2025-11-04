#!/bin/bash

# Fix spacing issues caused by fix-datatable.sh
echo "🔧 Fixing spacing issues..."

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
    echo "⚠️  File not found: $file"
    continue
  fi
  
  echo "Processing: $file"
  
  # Fix common patterns
  sed -i '' 's/constaudienceOptions/const audienceOptions/g' "$file"
  sed -i '' 's/constcolumns/const columns/g' "$file"
  sed -i '' 's/conststatusOptions/const statusOptions/g' "$file"
  sed -i '' 's/consttypeOptions/const typeOptions/g' "$file"
  sed -i '' 's/constpriorityOptions/const priorityOptions/g' "$file"
  
  # Fix object properties
  sed -i '' 's/{value:/{ value: /g' "$file"
  sed -i '' 's/,header:/, header: /g' "$file"
  sed -i '' 's/,label:/, label: /g' "$file"
  sed -i '' 's/{key:/{ key: /g' "$file"
  sed -i '' 's/,sortable:/, sortable: /g' "$file"
  sed -i '' 's/,render:/, render: /g' "$file"
  
  # Fix className patterns
  sed -i '' 's/className="/className="/g' "$file"
  sed -i '' 's/className="flexgap/className="flex gap/g' "$file"
  sed -i '' 's/className="griditems/className="grid items/g' "$file"
  sed -i '' 's/className="font-semiboldtext/className="font-semibold text/g' "$file"
  sed -i '' 's/className="text-xstext/className="text-xs text/g' "$file"
  sed -i '' 's/className="text-smtext/className="text-sm text/g' "$file"
  sed -i '' 's/className="text-lgtext/className="text-lg text/g' "$file"
  sed -i '' 's/className="text-xltext/className="text-xl text/g' "$file"
  sed -i '' 's/className="text-2xltext/className="text-2xl text/g' "$file"
  sed -i '' 's/className="text-3xltext/className="text-3xl text/g' "$file"
  
  # Fix color classes
  sed -i '' 's/text-b2b-darkdark/text-b2b-dark dark/g' "$file"
  sed -i '' 's/text-b2b-gray-500dark/text-b2b-gray-500 dark/g' "$file"
  sed -i '' 's/bg-b2b-gray-50dark/bg-b2b-gray-50 dark/g' "$file"
  
  # Fix div/p tags
  sed -i '' 's/<divclassName/<div className/g' "$file"
  sed -i '' 's/<pclassName/<p className/g' "$file"
  sed -i '' 's/<spanclassName/<span className/g' "$file"
  sed -i '' 's/<buttonclassName/<button className/g' "$file"
  
  # Fix function calls
  sed -i '' 's/)=>(/) => (/g' "$file"
  sed -i '' 's/}=>/} => /g' "$file"
  
done

echo "✅ Spacing fixes complete!"

