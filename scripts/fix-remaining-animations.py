#!/usr/bin/env python3
"""
Script to fix remaining animate-fadeIn patterns in files.
This adds Framer Motion imports and replaces animate-fadeIn divs.
"""

import re
import sys
from pathlib import Path

# Files to process
FILES = [
    "apps/web/app/cart/page.tsx",
    "apps/web/app/checkout/page.tsx",
    "apps/web/app/profile/page.tsx",
    "apps/web/app/orders/page.tsx",
    "apps/web/app/orders/[id]/page.tsx",
    "apps/web/app/orders/bulk-upload/page.tsx",
    "apps/web/app/orders/history/page.tsx",
    "apps/web/app/admin/analytics/page.tsx",
    "apps/web/app/admin/campaigns/page.tsx",
    "apps/web/app/admin/inventory/page.tsx",
    "apps/web/app/admin/pricing/page.tsx",
    "apps/web/app/admin/recommendations/page.tsx",
    "apps/web/app/admin/reports/page.tsx",
]

def process_file(filepath):
    """Process a single file to add Framer Motion animations."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has animate-fadeIn
        if 'animate-fadeIn' not in content:
            return False, "No animate-fadeIn found"
        
        original_content = content
        
        # Add motion import if not present
        if "from 'framer-motion'" not in content:
            # Find the first import statement
            if "'use client';" in content:
                content = content.replace(
                    "'use client';\n\n",
                    "'use client';\n\nimport { motion } from 'framer-motion';\n",
                    1
                )
            else:
                # Add 'use client' and motion import at the top
                content = "'use client';\n\nimport { motion } from 'framer-motion';\n" + content
        
        # Add animation imports if not present
        if "from '@/lib/animations'" not in content:
            # Find the last import line
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.strip().startswith('import '):
                    last_import_idx = i
            
            if last_import_idx >= 0:
                lines.insert(last_import_idx + 1, "import { fadeIn, fast } from '@/lib/animations';")
                content = '\n'.join(lines)
        
        # Replace animate-fadeIn with motion.div
        # Pattern: <div className="...animate-fadeIn...">
        content = re.sub(
            r'<div className="([^"]*?)animate-fadeIn([^"]*?)"',
            r'<motion.div className="\1\2" variants={fadeIn} initial="hidden" animate="visible" transition={fast}"',
            content
        )
        
        # Only write if content changed
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Updated successfully"
        else:
            return False, "No changes made"
            
    except FileNotFoundError:
        return False, f"File not found"
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("Processing files with animate-fadeIn...")
    print()
    
    success_count = 0
    for filepath in FILES:
        path = Path(filepath)
        if not path.exists():
            print(f"✗ {filepath} - File not found")
            continue
        
        success, message = process_file(filepath)
        if success:
            print(f"✓ {filepath} - {message}")
            success_count += 1
        else:
            print(f"○ {filepath} - {message}")
    
    print()
    print(f"Processed {success_count}/{len(FILES)} files successfully")
    print()
    print("⚠️  IMPORTANT: You must manually close the motion.div tags!")
    print("   Search for 'motion.div' and ensure each has a closing </motion.div>")

if __name__ == "__main__":
    main()

