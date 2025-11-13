#!/usr/bin/env python3
"""
Analyze database schema from migration files.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any

def extract_tables_from_sql(sql_content: str) -> List[Dict[str, Any]]:
    """Extract table definitions from SQL."""
    tables = []
    
    # Pattern to match CREATE TABLE statements
    pattern = r'CREATE TABLE\s+(\w+)\s*\((.*?)\);'
    matches = re.finditer(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        table_name = match.group(1)
        columns_text = match.group(2)
        
        # Extract columns
        columns = []
        for line in columns_text.split('\n'):
            line = line.strip()
            if line and not line.startswith('--') and not line.upper().startswith('CONSTRAINT') and not line.upper().startswith('UNIQUE') and not line.upper().startswith('CHECK'):
                # Extract column name and type
                parts = line.split()
                if len(parts) >= 2 and not parts[0].upper() in ['PRIMARY', 'FOREIGN', 'REFERENCES', 'ON', 'DEFAULT']:
                    col_name = parts[0].strip(',')
                    col_type = parts[1].strip(',')
                    
                    # Check for constraints
                    is_primary = 'PRIMARY KEY' in line.upper()
                    is_foreign = 'REFERENCES' in line.upper()
                    is_not_null = 'NOT NULL' in line.upper()
                    has_default = 'DEFAULT' in line.upper()
                    is_unique = 'UNIQUE' in line.upper()
                    
                    columns.append({
                        'name': col_name,
                        'type': col_type,
                        'is_primary_key': is_primary,
                        'is_foreign_key': is_foreign,
                        'is_not_null': is_not_null,
                        'has_default': has_default,
                        'is_unique': is_unique
                    })
        
        tables.append({
            'name': table_name,
            'column_count': len(columns),
            'columns': columns
        })
    
    return tables

def extract_indexes_from_sql(sql_content: str) -> List[Dict[str, str]]:
    """Extract index definitions from SQL."""
    indexes = []
    
    pattern = r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(\w+)\s+ON\s+(\w+)'
    matches = re.finditer(pattern, sql_content, re.IGNORECASE)
    
    for match in matches:
        indexes.append({
            'name': match.group(1),
            'table': match.group(2)
        })
    
    return indexes

def extract_functions_from_sql(sql_content: str) -> List[str]:
    """Extract function names from SQL."""
    functions = []
    
    pattern = r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\('
    matches = re.finditer(pattern, sql_content, re.IGNORECASE)
    
    for match in matches:
        functions.append(match.group(1))
    
    return functions

def extract_triggers_from_sql(sql_content: str) -> List[Dict[str, str]]:
    """Extract trigger definitions from SQL."""
    triggers = []
    
    pattern = r'CREATE\s+TRIGGER\s+(\w+)\s+.*?ON\s+(\w+)'
    matches = re.finditer(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        triggers.append({
            'name': match.group(1),
            'table': match.group(2)
        })
    
    return triggers

def analyze_migration_file(file_path: Path) -> Dict[str, Any]:
    """Analyze a single migration file."""
    content = file_path.read_text()
    
    return {
        'file': file_path.name,
        'tables': extract_tables_from_sql(content),
        'indexes': extract_indexes_from_sql(content),
        'functions': extract_functions_from_sql(content),
        'triggers': extract_triggers_from_sql(content)
    }

def main():
    """Main analysis function."""
    project_root = Path('/home/ubuntu/b2bplus')
    migrations_path = project_root / 'supabase' / 'migrations'
    
    if not migrations_path.exists():
        print("Migrations directory not found!")
        return
    
    all_migrations = []
    all_tables = {}
    all_indexes = []
    all_functions = set()
    all_triggers = []
    
    # Analyze each migration file
    for migration_file in sorted(migrations_path.glob('*.sql')):
        print(f"Analyzing {migration_file.name}...")
        analysis = analyze_migration_file(migration_file)
        all_migrations.append(analysis)
        
        # Collect all tables
        for table in analysis['tables']:
            if table['name'] not in all_tables:
                all_tables[table['name']] = table
        
        # Collect indexes, functions, triggers
        all_indexes.extend(analysis['indexes'])
        all_functions.update(analysis['functions'])
        all_triggers.extend(analysis['triggers'])
    
    # Create summary
    database_analysis = {
        'migrations': all_migrations,
        'summary': {
            'total_migrations': len(all_migrations),
            'total_tables': len(all_tables),
            'total_indexes': len(all_indexes),
            'total_functions': len(all_functions),
            'total_triggers': len(all_triggers)
        },
        'tables': list(all_tables.values()),
        'table_names': sorted(all_tables.keys())
    }
    
    # Save to JSON
    output_path = project_root / 'database_analysis.json'
    with open(output_path, 'w') as f:
        json.dump(database_analysis, f, indent=2)
    
    print("\nDatabase Analysis Complete!")
    print(f"Total Migrations: {database_analysis['summary']['total_migrations']}")
    print(f"Total Tables: {database_analysis['summary']['total_tables']}")
    print(f"Total Indexes: {database_analysis['summary']['total_indexes']}")
    print(f"Total Functions: {database_analysis['summary']['total_functions']}")
    print(f"Total Triggers: {database_analysis['summary']['total_triggers']}")
    print(f"\nTables: {', '.join(database_analysis['table_names'])}")
    print(f"\nResults saved to: {output_path}")

if __name__ == '__main__':
    main()
