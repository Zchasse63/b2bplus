#!/bin/bash

# Fix component props to match B2B component interfaces
echo "🔧 Fixing component props..."

FILES=$(find app -name "*.tsx")

for file in $FILES; do
  if ! grep -q "@/components/b2b" "$file"; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Fix Card props - remove 'extra' prop (already handled by bulk-migrate)
  # Fix remaining 'extra' patterns
  sed -i '' 's|extra="mb-5 p-6"|padding="lg" className="mb-5"|g' "$file"
  sed -i '' 's|extra="mb-4 p-6"|padding="lg" className="mb-4"|g' "$file"
  sed -i '' 's|extra="p-12 text-center"|padding="lg" className="text-center"|g' "$file"
  sed -i '' 's|extra="mx-auto max-w-md p-6"|padding="lg" className="mx-auto max-w-md"|g' "$file"
  sed -i '' 's|extra="group p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl"|padding="lg" hover className="group"|g' "$file"
  
  # Fix PageHeader props - remove 'gradient' prop
  sed -i '' 's|gradient="primary"||g' "$file"
  sed -i '' 's|gradient="secondary"||g' "$file"
  
  # Fix Button props - replace 'loading' with 'disabled'
  # This is complex, so we'll handle it manually for critical files
  
  # Fix DataTable columns - replace 'label' with 'header'
  sed -i '' 's|label:|header:|g' "$file"
  
  # Fix Badge variants - map old status values to new variants
  # 'rejected' -> 'error', 'pending' -> 'warning', 'approved' -> 'success'
  sed -i '' 's|variant="rejected"|variant="error"|g' "$file"
  sed -i '' 's|variant="pending"|variant="warning"|g' "$file"
  sed -i '' 's|variant="approved"|variant="success"|g' "$file"
  
done

echo "✅ Props fixes complete!"

