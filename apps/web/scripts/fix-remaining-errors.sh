#!/bin/bash

# Fix remaining TypeScript errors
echo "🔧 Fixing remaining TypeScript errors..."

# Fix Select options: header -> label
echo "Fixing Select options..."
find app -name "*.tsx" -exec sed -i '' 's/{ value: \(.*\), header: \(.*\) }/{ value: \1, label: \2 }/g' {} \;

# Fix Card extra prop -> className
echo "Fixing Card extra prop..."
find app -name "*.tsx" -exec sed -i '' 's/extra="p-6"/padding="lg"/g' {} \;
find app -name "*.tsx" -exec sed -i '' 's/extra="p-8"/padding="lg" className="p-8"/g' {} \;
find app -name "*.tsx" -exec sed -i '' 's/extra="\([^"]*\)"/className="\1"/g' {} \;

# Fix Button danger variant -> use className for red styling
echo "Fixing Button danger variant..."
find app -name "*.tsx" -exec sed -i '' 's/variant="danger"/variant="primary" className="bg-red-500 hover:bg-red-600"/g' {} \;

echo "✅ Automated fixes complete!"
echo "Note: Some errors require manual fixes (Button loading prop, missing icons, etc.)"

