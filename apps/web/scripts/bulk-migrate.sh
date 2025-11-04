#!/bin/bash

# Bulk migration script for Horizon UI -> B2B components
# This script performs find/replace operations across all files

echo "🚀 Starting bulk migration..."

# Find all .tsx and .ts files in app/ and components/
FILES=$(find app -name "*.tsx" -o -name "*.ts")

# Counter
TOTAL=0
CHANGED=0

for file in $FILES; do
  TOTAL=$((TOTAL + 1))
  MODIFIED=false
  
  # Skip if file doesn't contain horizon imports
  if ! grep -q "@/components/horizon" "$file"; then
    continue
  fi
  
  echo "Processing: $file"
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Replace imports
  sed -i '' "s|import GradientHeader from '@/components/horizon/layouts/GradientHeader';|import { PageHeader } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Card from '@/components/horizon/card';|import { Card } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Button from '@/components/horizon/button/Button';|import { Button } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Input from '@/components/horizon/input/Input';|import { Input } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Select from '@/components/horizon/input/Select';|import { Select } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Modal from '@/components/horizon/modal/Modal';|import { Modal } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import Textarea from '@/components/horizon/input/Textarea';|import { Textarea } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import DataTable from '@/components/horizon/table/DataTable';|import { DataTable } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import StatCard from '@/components/horizon/cards/StatCard';|import { StatCard } from '@/components/b2b';|g" "$file"
  sed -i '' "s|import StatusBadge from '@/components/horizon/badges/StatusBadge';|import { Badge } from '@/components/b2b';|g" "$file"
  
  # Replace component usage
  sed -i '' 's|<GradientHeader|<PageHeader|g' "$file"
  sed -i '' 's|</GradientHeader>|</PageHeader>|g' "$file"
  sed -i '' 's|<StatusBadge|<Badge|g' "$file"
  sed -i '' 's|</StatusBadge>|</Badge>|g' "$file"
  
  # Replace props
  sed -i '' 's|extra="p-6"|padding="lg"|g' "$file"
  sed -i '' 's|extra="p-4"|padding="md"|g' "$file"
  sed -i '' 's|extra="p-3"|padding="sm"|g' "$file"
  sed -i '' 's|extra="p-8"|padding="lg"|g' "$file"
  
  # Replace color classes
  sed -i '' 's|text-navy-700|text-b2b-dark|g' "$file"
  sed -i '' 's|text-gray-600|text-b2b-gray-500|g' "$file"
  sed -i '' 's|text-gray-500|text-b2b-gray-500|g' "$file"
  sed -i '' 's|text-gray-400|text-b2b-gray-500|g' "$file"
  sed -i '' 's|bg-brand-500|bg-b2b-yellow|g' "$file"
  sed -i '' 's|text-brand-500|text-b2b-yellow|g' "$file"
  
  # Replace icon imports
  sed -i '' 's|from '\''react-icons/md'\'';|from '\''react-icons/fi'\'';|g' "$file"
  
  # Check if file was modified
  if ! diff -q "$file" "$file.bak" > /dev/null; then
    MODIFIED=true
    CHANGED=$((CHANGED + 1))
    echo "  ✅ Modified"
  else
    echo "  ⏭️  No changes"
  fi
  
  # Remove backup
  rm "$file.bak"
done

echo ""
echo "═══════════════════════════════════════"
echo "📊 Migration Summary:"
echo "   Total files scanned: $TOTAL"
echo "   Files modified: $CHANGED"
echo "═══════════════════════════════════════"
echo ""
echo "✅ Bulk migration complete!"
echo ""
echo "⚠️  Next steps:"
echo "   1. Review modified files"
echo "   2. Fix any remaining manual migrations"
echo "   3. Test the application"
echo ""

