#!/usr/bin/env python3
"""
Analyze current implementation status of the B2B+ project.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any

def analyze_file_structure() -> Dict[str, Any]:
    """Analyze the current file structure."""
    project_root = Path('/home/ubuntu/b2bplus')
    
    structure = {
        'apps': {
            'web': {
                'pages': [],
                'components': [],
                'api_routes': [],
                'hooks': [],
                'lib': []
            },
            'mobile': {
                'screens': [],
                'components': [],
                'contexts': [],
                'lib': []
            }
        },
        'packages': {
            'shared': {'files': []},
            'ui': {'files': []},
            'supabase': {'files': []}
        },
        'database': {
            'migrations': [],
            'seed_files': []
        }
    }
    
    # Analyze web app
    web_path = project_root / 'apps' / 'web'
    if web_path.exists():
        # Pages
        app_path = web_path / 'app'
        if app_path.exists():
            for item in app_path.rglob('*.tsx'):
                rel_path = item.relative_to(app_path)
                structure['apps']['web']['pages'].append(str(rel_path))
        
        # Components
        comp_path = web_path / 'components'
        if comp_path.exists():
            for item in comp_path.rglob('*.tsx'):
                rel_path = item.relative_to(comp_path)
                structure['apps']['web']['components'].append(str(rel_path))
        
        # API routes
        api_path = web_path / 'app' / 'api'
        if api_path.exists():
            for item in api_path.rglob('*.ts'):
                rel_path = item.relative_to(api_path)
                structure['apps']['web']['api_routes'].append(str(rel_path))
        
        # Hooks
        hooks_path = web_path / 'hooks'
        if hooks_path.exists():
            for item in hooks_path.glob('*.ts'):
                structure['apps']['web']['hooks'].append(item.name)
        
        # Lib
        lib_path = web_path / 'lib'
        if lib_path.exists():
            for item in lib_path.rglob('*.ts'):
                rel_path = item.relative_to(lib_path)
                structure['apps']['web']['lib'].append(str(rel_path))
    
    # Analyze mobile app
    mobile_path = project_root / 'apps' / 'mobile'
    if mobile_path.exists():
        # Screens
        app_path = mobile_path / 'app'
        if app_path.exists():
            for item in app_path.rglob('*.tsx'):
                rel_path = item.relative_to(app_path)
                structure['apps']['mobile']['screens'].append(str(rel_path))
        
        # Contexts
        ctx_path = mobile_path / 'contexts'
        if ctx_path.exists():
            for item in ctx_path.glob('*.tsx'):
                structure['apps']['mobile']['contexts'].append(item.name)
        
        # Lib
        lib_path = mobile_path / 'lib'
        if lib_path.exists():
            for item in lib_path.glob('*.ts'):
                structure['apps']['mobile']['lib'].append(item.name)
    
    # Analyze packages
    packages_path = project_root / 'packages'
    if packages_path.exists():
        for pkg in ['shared', 'ui', 'supabase']:
            pkg_path = packages_path / pkg / 'src'
            if pkg_path.exists():
                for item in pkg_path.rglob('*.ts*'):
                    rel_path = item.relative_to(pkg_path)
                    structure['packages'][pkg]['files'].append(str(rel_path))
    
    # Analyze database
    supabase_path = project_root / 'supabase'
    if supabase_path.exists():
        migrations_path = supabase_path / 'migrations'
        if migrations_path.exists():
            for item in sorted(migrations_path.glob('*.sql')):
                structure['database']['migrations'].append(item.name)
        
        # Seed files in root
        for item in project_root.glob('seed*.sql'):
            structure['database']['seed_files'].append(item.name)
        
        # Comprehensive seed file
        for item in project_root.glob('*seed*.sql'):
            if item.name not in structure['database']['seed_files']:
                structure['database']['seed_files'].append(item.name)
    
    return structure

def count_features() -> Dict[str, int]:
    """Count implemented features."""
    project_root = Path('/home/ubuntu/b2bplus')
    
    counts = {
        'total_pages': 0,
        'total_components': 0,
        'total_api_routes': 0,
        'total_hooks': 0,
        'total_migrations': 0,
        'total_packages': 0,
        'total_tests': 0
    }
    
    # Count pages
    web_app = project_root / 'apps' / 'web' / 'app'
    if web_app.exists():
        counts['total_pages'] = len(list(web_app.rglob('page.tsx')))
    
    # Count components
    web_comp = project_root / 'apps' / 'web' / 'components'
    if web_comp.exists():
        counts['total_components'] = len(list(web_comp.rglob('*.tsx')))
    
    # Count API routes
    api_path = project_root / 'apps' / 'web' / 'app' / 'api'
    if api_path.exists():
        counts['total_api_routes'] = len(list(api_path.rglob('route.ts')))
    
    # Count hooks
    hooks_path = project_root / 'apps' / 'web' / 'hooks'
    if hooks_path.exists():
        counts['total_hooks'] = len(list(hooks_path.glob('*.ts')))
    
    # Count migrations
    migrations_path = project_root / 'supabase' / 'migrations'
    if migrations_path.exists():
        counts['total_migrations'] = len(list(migrations_path.glob('*.sql')))
    
    # Count packages
    packages_path = project_root / 'packages'
    if packages_path.exists():
        counts['total_packages'] = len([d for d in packages_path.iterdir() if d.is_dir()])
    
    # Count tests
    counts['total_tests'] = len(list(project_root.rglob('*.test.ts*')))
    
    return counts

def main():
    """Main analysis function."""
    print("Analyzing current implementation...")
    
    structure = analyze_file_structure()
    counts = count_features()
    
    analysis = {
        'structure': structure,
        'counts': counts,
        'summary': {
            'web_pages': len(structure['apps']['web']['pages']),
            'web_components': len(structure['apps']['web']['components']),
            'mobile_screens': len(structure['apps']['mobile']['screens']),
            'api_routes': len(structure['apps']['web']['api_routes']),
            'database_migrations': len(structure['database']['migrations']),
            'shared_files': len(structure['packages']['shared']['files']),
            'ui_components': len(structure['packages']['ui']['files']),
        }
    }
    
    # Save to JSON
    output_path = Path('/home/ubuntu/b2bplus/implementation_analysis.json')
    with open(output_path, 'w') as f:
        json.dump(analysis, f, indent=2)
    
    print("\nImplementation Analysis Complete!")
    print(f"Web Pages: {analysis['summary']['web_pages']}")
    print(f"Web Components: {analysis['summary']['web_components']}")
    print(f"Mobile Screens: {analysis['summary']['mobile_screens']}")
    print(f"API Routes: {analysis['summary']['api_routes']}")
    print(f"Database Migrations: {analysis['summary']['database_migrations']}")
    print(f"Shared Package Files: {analysis['summary']['shared_files']}")
    print(f"UI Components: {analysis['summary']['ui_components']}")
    print(f"\nResults saved to: {output_path}")

if __name__ == '__main__':
    main()
