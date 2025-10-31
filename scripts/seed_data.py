#!/usr/bin/env python3
"""
B2B+ Database Seeding Script

This script seeds the database with comprehensive test data using the Supabase REST API.
It inserts data row by row to ensure reliability.
"""

import os
import sys
import json
from datetime import datetime, timedelta
import requests

# Supabase configuration
SUPABASE_URL = "https://ksprdklquoskvjqsicvv.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_KEY environment variable is required")
    print("Usage: SUPABASE_KEY=your_key python3 scripts/seed_data.py")
    sys.exit(1)

# Supabase REST API headers
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def insert_data(table, data):
    """Insert data into a Supabase table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code in [200, 201]:
        print(f"✓ Inserted into {table}")
        return True
    else:
        print(f"✗ Failed to insert into {table}: {response.status_code}")
        print(f"  Response: {response.text[:200]}")
        return False

def seed_organizations():
    """Seed organizations table"""
    print("\n" + "="*60)
    print("SEEDING ORGANIZATIONS")
    print("="*60)
    
    organizations = [
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Metro School District",
            "slug": "metro-schools",
            "type": "school",
            "tax_id": "55-1234567",
            "phone": "+1-555-0400",
            "website": "https://metro-schools.example.com"
        },
        {
            "id": "55555555-5555-5555-5555-555555555555",
            "name": "Elite Catering Co.",
            "slug": "elite-catering",
            "type": "restaurant",
            "tax_id": "66-7890123",
            "phone": "+1-555-0500",
            "website": "https://elite-catering.example.com"
        },
        {
            "id": "66666666-6666-6666-6666-666666666666",
            "name": "Luxury Resort & Spa",
            "slug": "luxury-resort",
            "type": "hotel",
            "tax_id": "77-8901234",
            "phone": "+1-555-0600",
            "website": "https://luxury-resort.example.com"
        }
    ]
    
    for org in organizations:
        insert_data("organizations", org)

def seed_products():
    """Seed products table"""
    print("\n" + "="*60)
    print("SEEDING PRODUCTS")
    print("="*60)
    
    products = [
        {
            "id": "22222222-2222-2222-2222-222222222201",
            "organization_id": "550e8400-e29b-41d4-a716-446655440000",
            "sku": "CUP-8OZ-CLR-2000",
            "name": "8oz Clear Plastic Cups",
            "description": "Small clear plastic cups for beverages",
            "category": "Cups",
            "subcategory": "Cold Cups",
            "brand": "ClearServe",
            "base_price": 32.99,
            "unit_of_measure": "case",
            "units_per_case": 2000,
            "weight_lbs": 8.5,
            "dimensions_inches": {"length": 16, "width": 12, "height": 8},
            "in_stock": True
        },
        {
            "id": "22222222-2222-2222-2222-222222222202",
            "organization_id": "550e8400-e29b-41d4-a716-446655440000",
            "sku": "CUP-20OZ-CLR-1000",
            "name": "20oz Clear Plastic Cups",
            "description": "Large clear plastic cups for beverages",
            "category": "Cups",
            "subcategory": "Cold Cups",
            "brand": "ClearServe",
            "base_price": 48.99,
            "unit_of_measure": "case",
            "units_per_case": 1000,
            "weight_lbs": 11.0,
            "dimensions_inches": {"length": 18, "width": 14, "height": 10},
            "in_stock": True
        },
        {
            "id": "22222222-2222-2222-2222-222222222203",
            "organization_id": "550e8400-e29b-41d4-a716-446655440000",
            "sku": "CUP-12OZ-HOT-500",
            "name": "12oz Hot Coffee Cups",
            "description": "Insulated hot coffee cups with sleeves",
            "category": "Cups",
            "subcategory": "Hot Cups",
            "brand": "HotServe",
            "base_price": 44.99,
            "unit_of_measure": "case",
            "units_per_case": 500,
            "weight_lbs": 9.0,
            "dimensions_inches": {"length": 16, "width": 12, "height": 9},
            "in_stock": True
        },
        {
            "id": "22222222-2222-2222-2222-222222222204",
            "organization_id": "550e8400-e29b-41d4-a716-446655440000",
            "sku": "PLATE-10IN-WHT-500",
            "name": "10\" White Paper Plates",
            "description": "Large white paper plates for main courses",
            "category": "Plates",
            "subcategory": "Paper Plates",
            "brand": "EcoServe",
            "base_price": 52.99,
            "unit_of_measure": "case",
            "units_per_case": 500,
            "weight_lbs": 14.0,
            "dimensions_inches": {"length": 20, "width": 14, "height": 11},
            "in_stock": True
        },
        {
            "id": "22222222-2222-2222-2222-222222222205",
            "organization_id": "550e8400-e29b-41d4-a716-446655440000",
            "sku": "PLATE-7IN-WHT-1000",
            "name": "7\" White Paper Plates",
            "description": "Medium white paper plates for desserts",
            "category": "Plates",
            "subcategory": "Paper Plates",
            "brand": "EcoServe",
            "base_price": 38.99,
            "unit_of_measure": "case",
            "units_per_case": 1000,
            "weight_lbs": 10.0,
            "dimensions_inches": {"length": 18, "width": 12, "height": 9},
            "in_stock": True
        }
    ]
    
    for product in products:
        insert_data("products", product)

def get_table_count(table):
    """Get the count of rows in a table"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=count"
    headers_count = headers.copy()
    headers_count["Prefer"] = "count=exact"
    
    response = requests.get(url, headers=headers_count)
    
    if response.status_code == 200:
        # Extract count from Content-Range header
        content_range = response.headers.get("Content-Range", "")
        if "/" in content_range:
            return int(content_range.split("/")[1])
    return 0

def verify_seeding():
    """Verify the seeded data"""
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    tables = [
        "organizations",
        "profiles",
        "products",
        "orders",
        "order_items",
        "cart_items",
        "pricing_tiers",
        "promotional_codes",
        "campaigns"
    ]
    
    for table in tables:
        count = get_table_count(table)
        print(f"{table.ljust(25)}: {count} rows")
    
    print("="*60)

def main():
    print("="*60)
    print("B2B+ DATABASE SEEDING")
    print("="*60)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Using API key: {SUPABASE_KEY[:20]}...")
    
    # Seed data
    seed_organizations()
    seed_products()
    
    # Verify
    verify_seeding()
    
    print("\n✓ Seeding completed")

if __name__ == "__main__":
    main()
