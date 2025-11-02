import openpyxl
from supabase import create_client
import sys
sys.path.append('/home/ubuntu/b2bplus')
from regional_pricing_tiers_correct import get_pricing_tier

SUPABASE_URL = 'https://ksprdklquoskvjqsicvv.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHJka2xxdW9za3ZqcXNpY3Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDE5NDcyMiwiZXhwIjoyMDc1NzcwNzIyfQ.VyRKDYIAzgbzmTZj29Lj5mdTvRGC5fetgPgfaOgCg54'

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 80)
print("UPLOADING 1,456 LEADS WITH PRICING TIERS")
print("=" * 80)
print()

wb = openpyxl.load_workbook('/home/ubuntu/upload/RDALeadList(1).xlsx')
sheet = wb.active

headers = [cell.value for cell in sheet[1]]

uploaded = 0
skipped = 0
errors = []

for row in sheet.iter_rows(min_row=2, values_only=True):
    if not row[0]:  # Skip empty rows
        continue
    
    # Extract data
    customer_name = row[0]
    city = row[1]
    state = row[2]
    contact_name = row[3]
    email = row[4]
    phone = row[5]
    address = row[6]
    zip_code = str(row[7]) if row[7] else None
    group = row[8]
    
    # Determine pricing tier
    tier_name, tier_number = get_pricing_tier(state)
    
    # Determine buying group
    has_group = bool(group and str(group).strip())
    group_name = str(group).strip() if has_group else None
    
    # Create slug
    slug = customer_name.lower().replace(' ', '-').replace('.', '').replace(',', '').replace("'", '')[:50]
    
    try:
        org_data = {
            'name': customer_name,
            'slug': slug,
            'type': 'distributor',
            'email': email if email else None,
            'phone': phone if phone else None,
            'address': address if address else None,
            'city': city if city else None,
            'state': state if state else None,
            'zip_code': zip_code,
            'pricing_tier': tier_number,
            'pricing_tier_name': tier_name,
            'has_buying_group': has_group,
            'buying_group_name': group_name
        }
        
        supabase.table('organizations').insert(org_data).execute()
        uploaded += 1
        
        if uploaded % 100 == 0:
            print(f"  ✅ {uploaded} leads uploaded...")
            
    except Exception as e:
        skipped += 1
        error_msg = str(e)[:80]
        if 'duplicate' not in error_msg.lower():
            errors.append(f"{customer_name}: {error_msg}")

print()
print("=" * 80)
print(f"✅ Uploaded: {uploaded} leads")
print(f"⚠️  Skipped: {skipped} leads (likely duplicates)")
if errors[:5]:
    print(f"\n❌ Sample Errors:")
    for err in errors[:5]:
        print(f"  {err}")
print("=" * 80)
print()

# Show tier distribution
print("📊 TIER DISTRIBUTION:")
for tier_num in [1, 2, 3]:
    count = supabase.table('organizations').select('id', count='exact').eq('pricing_tier', tier_num).execute()
    tier_names = {1: 'Local', 2: 'Bordering GA', 3: 'Outer States'}
    print(f"  Tier {tier_num} ({tier_names[tier_num]}): {count.count} organizations")

print()
print("👥 BUYING GROUP DISTRIBUTION:")
group_count = supabase.table('organizations').select('id', count='exact').eq('has_buying_group', True).execute()
no_group_count = supabase.table('organizations').select('id', count='exact').eq('has_buying_group', False).execute()
print(f"  With Buying Group: {group_count.count}")
print(f"  Without Buying Group: {no_group_count.count}")
