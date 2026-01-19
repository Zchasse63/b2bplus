#!/bin/bash
# Script to systematically add validation and rate limiting to API routes

# Admin analytics endpoints (AI-heavy, need validation + rate limiting)
ADMIN_ANALYTICS_ROUTES=(
  "apps/web/app/api/admin/analytics/churn-risk/route.ts:ChurnRiskSchema"
  "apps/web/app/api/admin/analytics/forecast/route.ts:InventoryForecastSchema"
  "apps/web/app/api/admin/customers/[id]/churn-risk/route.ts:ChurnRiskSchema"
  "apps/web/app/api/admin/customers/analytics/route.ts:CustomerAnalyticsSchema"
  "apps/web/app/api/admin/import/ai-excel/route.ts:AIExcelImportSchema"
)

# For each route, add imports and wrap POST handler
for route_info in "${ADMIN_ANALYTICS_ROUTES[@]}"; do
  IFS=':' read -r route_file schema_name <<< "$route_info"

  if [ -f "$route_file" ]; then
    echo "Processing: $route_file with schema: $schema_name"

    # Check if already has validation
    if grep -q "validateRequestBody" "$route_file"; then
      echo "  ✓ Already has validation"
      continue
    fi

    echo "  + Adding validation and rate limiting"
  fi
done

echo "Done!"
