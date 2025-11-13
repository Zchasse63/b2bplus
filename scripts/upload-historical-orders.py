#!/usr/bin/env python3
"""
Upload Historical Orders from MetroPO's.xlsx
"""

import json
from supabase import create_client
from datetime import datetime
import os

# Configuration - Load from environment variables
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("=" * 80)
print("UPLOADING HISTORICAL ORDERS")
print("=" * 80)
print()

# Load parsed orders
with open('/home/ubuntu/b2bplus/parsed_orders.json', 'r') as f:
    orders = json.load(f)

print(f"Total orders to upload: {len(orders)}")
print()

# Get Metro Bag organization ID
metro_result = supabase.table('organizations').select('id').eq('slug', 'metro-bag').execute()
metro_org_id = metro_result.data[0]['id']
print(f"Metro Bag org ID: {metro_org_id}")
print()

# Get or create customer organizations
customer_map = {}
customers_created = 0
customers_existing = 0

for order in orders:
    customer_name = order['customer_name']
    
    if customer_name not in customer_map:
        # Check if customer exists
        slug = customer_name.lower().replace(' ', '-').replace(',', '').replace('.', '').replace("'", '')
        result = supabase.table('organizations').select('id').eq('slug', slug).execute()
        
        if result.data:
            customer_map[customer_name] = result.data[0]['id']
            customers_existing += 1
        else:
            # Create customer organization
            try:
                new_org = supabase.table('organizations').insert({
                    'name': customer_name,
                    'slug': slug,
                    'type': 'distributor',
                }).execute().data[0]
                customer_map[customer_name] = new_org['id']
                customers_created += 1
                print(f"  ✅ Created customer: {customer_name}")
            except Exception as e:
                print(f"  ❌ Failed to create {customer_name}: {str(e)[:80]}")
                continue

print()
print(f"Customers created: {customers_created}")
print(f"Customers existing: {customers_existing}")
print(f"Total customers: {len(customer_map)}")
print()

# Upload orders
orders_uploaded = 0
orders_failed = 0
items_uploaded = 0

for order in orders:
    customer_name = order['customer_name']
    
    if customer_name not in customer_map:
        print(f"  ⚠️  Skipping order - customer not found: {customer_name}")
        orders_failed += 1
        continue
    
    customer_id = customer_map[customer_name]
    
    # Create order
    try:
        order_data = {
            'organization_id': customer_id,
            'po_number': order['po_number'],
            'status': 'delivered',  # Historical orders are completed
            'subtotal': float(order['subtotal']) if order['subtotal'] else 0.0,
            'tax': 0.0,
            'shipping': 0.0,
            'total': float(order['subtotal']) if order['subtotal'] else 0.0,
            'notes': f"Historical order from {order['sheet_name']}",
            'created_at': order['order_date'] if order['order_date'] else datetime.utcnow().isoformat(),
        }
        
        new_order = supabase.table('orders').insert(order_data).execute().data[0]
        order_id = new_order['id']
        
        # Upload line items
        for item in order['line_items']:
            try:
                # Find product by SKU
                product_result = supabase.table('products').select('id, base_price').eq('sku', item['item_number']).eq('organization_id', metro_org_id).execute()
                
                if product_result.data:
                    product_id = product_result.data[0]['id']
                    
                    item_data = {
                        'order_id': order_id,
                        'product_id': product_id,
                        'quantity': int(item['quantity']),
                        'unit_price': float(item['unit_price']),
                        'subtotal': float(item['total_price']),
                    }
                    
                    supabase.table('order_items').insert(item_data).execute()
                    items_uploaded += 1
                else:
                    print(f"    ⚠️  Product not found: {item['item_number']}")
            except Exception as e:
                print(f"    ❌ Failed to upload item {item['item_number']}: {str(e)[:60]}")
        
        orders_uploaded += 1
        if orders_uploaded % 10 == 0:
            print(f"  ✅ Uploaded {orders_uploaded} orders...")
        
    except Exception as e:
        orders_failed += 1
        print(f"  ❌ Failed to upload order {order['po_number']}: {str(e)[:80]}")

print()
print("=" * 80)
print("UPLOAD COMPLETE")
print("=" * 80)
print()
print(f"✅ Orders uploaded: {orders_uploaded}/{len(orders)}")
print(f"✅ Order items uploaded: {items_uploaded}")
print(f"❌ Orders failed: {orders_failed}")
print(f"✅ Customers created: {customers_created}")
print(f"✅ Customers existing: {customers_existing}")
