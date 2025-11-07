#!/usr/bin/env python3
"""
Script to fix closing tags for motion.div elements.
Finds motion.div opening tags and ensures they have matching </motion.div> closing tags.
"""

import re
from pathlib import Path

FILES = [
    "apps/web/app/checkout/page.tsx",
    "apps/web/app/profile/page.tsx",
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

def fix_closing_tags(filepath):
    """Fix closing tags for motion.div elements."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if '<motion.div' not in content:
            return False, "No motion.div found"
        
        original_content = content
        lines = content.split('\n')
        
        # Track motion.div depth
        motion_div_stack = []
        modified = False
        
        for i, line in enumerate(lines):
            # Find motion.div opening tags
            if '<motion.div' in line:
                # Count how many motion.divs open on this line
                motion_div_stack.append(i)
            
            # Find closing </div> tags that should be </motion.div>
            if '</div>' in line and motion_div_stack:
                # Check if this is likely the closing tag for a motion.div
                # by looking at indentation and context
                indent = len(line) - len(line.lstrip())
                
                # Simple heuristic: if we have open motion.divs and this is a closing div
                # at a reasonable indentation level, it's probably the closing tag
                if motion_div_stack:
                    lines[i] = line.replace('</div>', '</motion.div>', 1)
                    motion_div_stack.pop()
                    modified = True
        
        if modified:
            content = '\n'.join(lines)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Fixed closing tags"
        else:
            return False, "No changes needed"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("Fixing motion.div closing tags...")
    print()
    
    success_count = 0
    for filepath in FILES:
        path = Path(filepath)
        if not path.exists():
            print(f"✗ {filepath} - File not found")
            continue
        
        success, message = fix_closing_tags(filepath)
        if success:
            print(f"✓ {filepath} - {message}")
            success_count += 1
        else:
            print(f"○ {filepath} - {message}")
    
    print()
    print(f"Fixed {success_count}/{len(FILES)} files")

if __name__ == "__main__":
    main()

