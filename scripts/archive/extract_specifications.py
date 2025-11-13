#!/usr/bin/env python3
"""
Extract all specifications, features, and requirements from planning documents.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any

def extract_database_tables(content: str) -> List[Dict[str, Any]]:
    """Extract database table definitions from content."""
    tables = []
    
    # Pattern to match CREATE TABLE statements
    table_pattern = r'CREATE TABLE\s+(\w+)\s*\((.*?)\);'
    matches = re.finditer(table_pattern, content, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        table_name = match.group(1)
        columns_text = match.group(2)
        
        # Extract columns
        columns = []
        for line in columns_text.split('\n'):
            line = line.strip()
            if line and not line.startswith('--') and not line.startswith('CONSTRAINT'):
                # Basic column extraction
                parts = line.split()
                if len(parts) >= 2:
                    col_name = parts[0].strip(',')
                    col_type = parts[1].strip(',')
                    columns.append({
                        'name': col_name,
                        'type': col_type,
                        'definition': line
                    })
        
        tables.append({
            'name': table_name,
            'columns': columns,
            'full_definition': match.group(0)
        })
    
    return tables

def extract_features(content: str, phase: str) -> List[Dict[str, Any]]:
    """Extract features and requirements from content."""
    features = []
    
    # Look for numbered steps, features, or requirements
    patterns = [
        r'###\s+Step\s+[\d.]+:\s+(.+?)(?=###|\Z)',
        r'###\s+(.+?)(?=###|\Z)',
        r'\*\*Feature:\*\*\s+(.+?)(?=\*\*|\Z)',
        r'-\s+\*\*(.+?)\*\*:?\s+(.+?)(?=\n-|\Z)',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, content, re.DOTALL)
        for match in matches:
            feature_text = match.group(0)
            title = match.group(1).strip() if match.lastindex >= 1 else "Unknown"
            
            # Extract any code blocks or implementation details
            code_blocks = re.findall(r'```[\w]*\n(.*?)```', feature_text, re.DOTALL)
            
            features.append({
                'phase': phase,
                'title': title[:200],  # Limit title length
                'description': feature_text[:500],  # Limit description
                'has_code': len(code_blocks) > 0,
                'code_blocks_count': len(code_blocks)
            })
    
    return features

def extract_components(content: str) -> List[str]:
    """Extract component names from content."""
    components = set()
    
    # Look for component file references
    patterns = [
        r'(\w+\.tsx)',
        r'(\w+\.ts)',
        r'<(\w+)\s',  # JSX components
        r'import\s+\{?\s*(\w+)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content)
        components.update(matches)
    
    return sorted(list(components))

def analyze_document(file_path: Path) -> Dict[str, Any]:
    """Analyze a single planning document."""
    content = file_path.read_text()
    
    # Determine phase from filename
    phase_match = re.search(r'phase(\d+)', file_path.name.lower())
    phase = f"Phase {phase_match.group(1)}" if phase_match else "Master"
    
    return {
        'file': file_path.name,
        'phase': phase,
        'line_count': len(content.split('\n')),
        'tables': extract_database_tables(content),
        'features': extract_features(content, phase),
        'components': extract_components(content)
    }

def main():
    """Main extraction function."""
    project_root = Path('/home/ubuntu/b2bplus')
    planning_docs = list(project_root.glob('b2b-*.txt'))
    
    all_specs = {
        'documents': [],
        'summary': {
            'total_documents': len(planning_docs),
            'total_tables': 0,
            'total_features': 0,
            'total_components': 0
        }
    }
    
    for doc_path in sorted(planning_docs):
        print(f"Analyzing {doc_path.name}...")
        analysis = analyze_document(doc_path)
        all_specs['documents'].append(analysis)
        
        all_specs['summary']['total_tables'] += len(analysis['tables'])
        all_specs['summary']['total_features'] += len(analysis['features'])
        all_specs['summary']['total_components'] += len(analysis['components'])
    
    # Save to JSON
    output_path = project_root / 'extracted_specifications.json'
    with open(output_path, 'w') as f:
        json.dump(all_specs, f, indent=2)
    
    print(f"\nExtraction complete!")
    print(f"Total documents: {all_specs['summary']['total_documents']}")
    print(f"Total tables found: {all_specs['summary']['total_tables']}")
    print(f"Total features found: {all_specs['summary']['total_features']}")
    print(f"Total components found: {all_specs['summary']['total_components']}")
    print(f"\nResults saved to: {output_path}")

if __name__ == '__main__':
    main()
