import json
from supabase import create_client
import secrets
import string
import os

# Configuration - Load from environment variables
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def generate_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_email(company_name):
    """Generate placeholder email from company name"""
    # Clean company name
    clean_name = company_name.lower()
    clean_name = clean_name.replace(' ', '')
    clean_name = clean_name.replace('.', '')
    clean_name = clean_name.replace(',', '')
    clean_name = clean_name.replace("'", '')
    clean_name = clean_name.replace('&', 'and')
    clean_name = clean_name[:30]  # Limit length
    return f"{clean_name}@customer.metrobag.com"

print("=" * 80)
print("CREATING USER ACCOUNTS FOR CUSTOMERS")
print("=" * 80)
print()

# Step 1: Delete Acme Restaurant Group
print("Step 1: Deleting Acme Restaurant Group (test data)...")
acme_id = '11111111-1111-1111-1111-111111111111'

# Delete orders first (foreign key constraint)
orders_deleted = supabase.table('orders').delete().eq('organization_id', acme_id).execute()
print(f"  ✅ Deleted {len(orders_deleted.data) if orders_deleted.data else 0} orders")

# Delete organization
org_deleted = supabase.table('organizations').delete().eq('id', acme_id).execute()
print(f"  ✅ Deleted Acme Restaurant Group")
print()

# Step 2: Load customers
with open('/tmp/customers_need_accounts.json', 'r') as f:
    customers = json.load(f)

# Filter out Acme
customers = [c for c in customers if c['id'] != acme_id]

print(f"Step 2: Creating user accounts for {len(customers)} customers...")
print()

created_accounts = []

for customer in customers:
    company_name = customer['name']
    org_id = customer['id']
    
    # Generate placeholder email
    email = generate_email(company_name)
    
    # Generate secure password
    password = generate_password()
    
    print(f"Creating account for: {company_name}")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,  # Auto-confirm email
            "user_metadata": {
                "organization_id": org_id,
                "organization_name": company_name
            }
        })
        
        user_id = auth_response.user.id
        print(f"  ✅ User created with ID: {user_id}")
        
        # Update organization with email
        supabase.table('organizations').update({
            'email': email
        }).eq('id', org_id).execute()
        
        created_accounts.append({
            'company_name': company_name,
            'email': email,
            'password': password,
            'user_id': user_id,
            'organization_id': org_id
        })
        
        print(f"  ✅ Account created successfully")
        print()
        
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        print()

# Save credentials
with open('/home/ubuntu/b2bplus/customer_accounts.json', 'w') as f:
    json.dump(created_accounts, f, indent=2)

print("=" * 80)
print(f"✅ Created {len(created_accounts)} user accounts")
print("=" * 80)
print()
print("Credentials saved to: /home/ubuntu/b2bplus/customer_accounts.json")
