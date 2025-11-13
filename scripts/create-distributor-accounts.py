#!/usr/bin/env python3
"""
Create 32 Distributor Accounts from BailyUsage.xlsx
"""

import openpyxl
from supabase import create_client
import re
from datetime import datetime
import os

# Configuration - Load from environment variables
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Load workbook to get customer names
wb = openpyxl.load_workbook('/home/ubuntu/upload/BailyUsage.xlsx', read_only=True)
customer_names = wb.sheetnames
wb.close()

print("=" * 80)
print("CREATING 32 DISTRIBUTOR ACCOUNTS")
print("=" * 80)
print()

def create_slug(name):
    """Create URL-friendly slug from company name"""
    # Convert to lowercase
    slug = name.lower()
    # Replace spaces and special characters with hyphens
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Ensure uniqueness by checking database
    return slug

created_accounts = []
skipped_accounts = []

for i, customer_name in enumerate(customer_names, 1):
    print(f"[{i}/32] Creating account: {customer_name}")
    
    try:
        # Create slug
        base_slug = create_slug(customer_name)
        slug = base_slug
        
        # Check if slug already exists
        existing = supabase.table('organizations').select('id').eq('slug', slug).execute()
        
        if existing.data:
            # Slug exists, try with number suffix
            counter = 1
            while True:
                slug = f"{base_slug}-{counter}"
                existing = supabase.table('organizations').select('id').eq('slug', slug).execute()
                if not existing.data:
                    break
                counter += 1
        
        # Create organization
        org_data = {
            'name': customer_name,
            'slug': slug,
            'type': 'distributor',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }
        
        result = supabase.table('organizations').insert(org_data).execute()
        
        if result.data:
            org_id = result.data[0]['id']
            created_accounts.append({
                'name': customer_name,
                'slug': slug,
                'id': org_id
            })
            print(f"   ✅ Created: {customer_name} (slug: {slug})")
        else:
            print(f"   ❌ Failed: {customer_name}")
            skipped_accounts.append(customer_name)
    
    except Exception as e:
        print(f"   ❌ Error: {customer_name} - {str(e)}")
        skipped_accounts.append(customer_name)
    
    print()

print("=" * 80)
print("ACCOUNT CREATION COMPLETE")
print("=" * 80)
print()
print(f"✅ Successfully created: {len(created_accounts)} accounts")
print(f"❌ Failed: {len(skipped_accounts)} accounts")
print()

if created_accounts:
    print("Created Accounts:")
    for acc in created_accounts:
        print(f"  - {acc['name']} (slug: {acc['slug']}, id: {acc['id']})")
    print()

if skipped_accounts:
    print("Failed Accounts:")
    for name in skipped_accounts:
        print(f"  - {name}")
    print()

# Save account mapping to file for import phase
import json
with open('/home/ubuntu/b2bplus/distributor_accounts.json', 'w') as f:
    json.dump(created_accounts, f, indent=2)

print("Account mapping saved to: /home/ubuntu/b2bplus/distributor_accounts.json")
