#!/usr/bin/env python3
"""
Generate a comprehensive progress report by comparing specifications against implementation.
"""

import json
from pathlib import Path
from typing import Dict, List, Any
import re

def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load a JSON file."""
    if not file_path.exists():
        return {}
    with open(file_path, 'r') as f:
        return json.load(f)

def get_implementation_status(spec_title: str, spec_desc: str, implementation_analysis: Dict[str, Any], db_analysis: Dict[str, Any]) -> Dict[str, str]:
    """Determine the implementation status of a specification."""
    status = {
        'status': '❌ Not Started',
        'gap': 'Feature not found in codebase or database.',
        'implementation_details': ''
    }
    
    spec_title_lower = spec_title.lower()
    spec_desc_lower = spec_desc.lower()
    
    # Check database tables
    for table in db_analysis.get('tables', []):
        if table['name'].lower() in spec_title_lower or table['name'].lower() in spec_desc_lower:
            status['status'] = '✅ Complete'
            status['gap'] = 'Database table exists.'
            status['implementation_details'] = f"Table: {table['name']}"
            # Check for partial implementation
            if 'columns' in table and len(table['columns']) == 0:
                status['status'] = '🔄 Partially Complete'
                status['gap'] = 'Table exists but has no columns defined in migrations.'
            return status

    # Check codebase (components, pages, etc.)
    all_files = []
    for app_type in ['web', 'mobile']:
        for category in ['pages', 'components', 'api_routes', 'hooks', 'lib', 'screens', 'contexts']:
            all_files.extend(implementation_analysis.get('structure', {}).get('apps', {}).get(app_type, {}).get(category, []))
    
    for pkg in ['shared', 'ui', 'supabase']:
        all_files.extend(implementation_analysis.get('structure', {}).get('packages', {}).get(pkg, {}).get('files', []))

    # Simple keyword matching
    search_terms = re.findall(r'\b\w+\.tsx|\w+\.ts|\w+\.sql\b', spec_desc) + spec_title.split()
    search_terms = [s.lower().replace('.tsx', '').replace('.ts','').replace('.sql','') for s in search_terms if len(s) > 3]
    
    found_files = []
    for file in all_files:
        file_lower = file.lower()
        for term in search_terms:
            if term in file_lower:
                found_files.append(file)
                break
    
    if found_files:
        status['status'] = '✅ Complete'
        status['gap'] = 'Related files found in codebase.'
        status['implementation_details'] = f"Files: {', '.join(found_files[:3])}"
        
        # Check for partial implementation
        if 'create' in spec_title_lower and 'component' in spec_title_lower and not any('.tsx' in f for f in found_files):
             status['status'] = '🔄 Partially Complete'
             status['gap'] = 'Logic exists, but no UI component found.'
        elif 'database' in spec_title_lower and not any('.sql' in f for f in found_files):
             status['status'] = '🔄 Partially Complete'
             status['gap'] = 'Logic exists, but no database migration found.'

    # Modified status (heuristic)
    if status['status'] == '✅ Complete' and ('refactor' in spec_title_lower or 'update' in spec_title_lower):
        status['status'] = '🔀 Modified'
        status['gap'] = 'Original plan was to create, but implementation involved modification.'
        
    return status

def main():
    """Main report generation function."""
    project_root = Path("/home/ubuntu/b2bplus")
    
    # Load analysis files
    specs = load_json_file(project_root / "extracted_specifications.json")
    implementation = load_json_file(project_root / "implementation_analysis.json")
    database = load_json_file(project_root / "database_analysis.json")
    
    if not all([specs, implementation, database]):
        print("Error: Missing analysis files. Please run extraction scripts first.")
        return

    report_data = []
    phase_completion = {
        'Phase 0': {'total': 0, 'complete': 0},
        'Phase 1': {'total': 0, 'complete': 0},
        'Phase 2': {'total': 0, 'complete': 0},
        'Phase 3': {'total': 0, 'complete': 0},
        'Phase 4': {'total': 0, 'complete': 0},
        'Master': {'total': 0, 'complete': 0},
    }

    # Process all features from specs
    for doc in specs.get('documents', []):
        phase = doc.get('phase', 'Master')
        for feature in doc.get('features', []):
            status_info = get_implementation_status(feature['title'], feature['description'], implementation, database)
            
            report_data.append({
                'Phase': phase,
                'Specification': feature['title'],
                'Status': status_info['status'],
                'Gap/Details': f"{status_info['gap']} {status_info['implementation_details']}"
            })
            
            # Update phase completion stats
            if phase in phase_completion:
                phase_completion[phase]['total'] += 1
                if '✅' in status_info['status'] or '🔀' in status_info['status']:
                    phase_completion[phase]['complete'] += 1
    
    # --- Generate Markdown Report ---
    report_md = "# B2B+ Project: Comprehensive Progress Report\n\n"
    report_md += "**Author:** Manus AI  \n**Date:** October 31, 2025\n\n---\n"
    
    # Executive Summary
    report_md += "## 1. Executive Summary\n\n"
    report_md += "This report provides a detailed analysis of the B2B+ project, comparing the original specifications against the current implementation. The following table summarizes the completion status by phase:\n\n"
    report_md += "| Phase   | Total Specs | Complete | Completion % |\n"
    report_md += "|---------|-------------|----------|--------------|\n"
    total_specs = 0
    total_complete = 0
    for phase, data in phase_completion.items():
        if data['total'] > 0:
            percentage = (data['complete'] / data['total']) * 100
            report_md += f"| {phase} | {data['total']} | {data['complete']} | {percentage:.1f}% |\n"
            total_specs += data['total']
            total_complete += data['complete']
    
    overall_percentage = (total_complete / total_specs) * 100 if total_specs > 0 else 0
    report_md += f"| **Total** | **{total_specs}** | **{total_complete}** | **{overall_percentage:.1f}%** |\n\n"
    
    # Detailed Status Table
    report_md += "## 2. Detailed Implementation Status\n\n"
    report_md += "| Phase   | Specification | Status | Gap / Implementation Details |\n"
    report_md += "|---------|---------------|--------|------------------------------|\n"
    for item in sorted(report_data, key=lambda x: (x['Phase'], x['Specification'])):
        spec = item["Specification"].replace("\n", " ")
        gap = item["Gap/Details"].replace("\n", " ")
        report_md += f"| {item['Phase']} | {spec} | {item['Status']} | {gap} |\n"
        
    # Remaining Work
    report_md += "\n## 3. Remaining Work Breakdown\n\n"
    incomplete_items = [item for item in report_data if '❌' in item['Status'] or '🔄' in item['Status']]
    if not incomplete_items:
        report_md += "✅ **All planned work has been completed or modified!**\n"
    else:
        for item in sorted(incomplete_items, key=lambda x: x['Phase']):
            spec = item["Specification"].replace("\n", " ")
            report_md += f"- **[{item['Phase']}]** {spec} - *Status: {item['Status']}*\n"
            
    # Recommendations
    report_md += "\n## 4. Next Steps & Recommendations\n\n"
    report_md += "Based on the analysis, the following steps are recommended to complete the project:\n\n"
    report_md += "1.  **Address `❌ Not Started` items first**, prioritizing foundational features like the mobile app setup and core authentication flows.\n"
    report_md += "2.  **Complete `🔄 Partially Complete` items**, such as finishing UI components and ensuring all database tables are fully migrated.\n"
    report_md += "3.  **Review `🔀 Modified` items** to ensure the implemented changes align with the overall project goals.\n"
    report_md += "4.  **Conduct a full end-to-end testing cycle** across both web and mobile platforms to validate all features.\n"
    report_md += "5.  **Prepare for deployment** by setting up production environments and CI/CD pipelines.\n"
    
    # Save the report
    report_path = project_root / "PROGRESS_REPORT.md"
    with open(report_path, 'w') as f:
        f.write(report_md)
        
    print(f"\nReport generated successfully: {report_path}")

if __name__ == '__main__':
    main()
