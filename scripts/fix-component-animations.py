#!/usr/bin/env python3
"""
Script to fix animate-spin and animate-pulse in component files.
"""

import re
from pathlib import Path

FILES = [
    "apps/web/components/admin/ImageUpload.tsx",
    "apps/web/components/CartViewWithPricing.tsx",
    "apps/web/components/CategoryMenu.tsx",
    "apps/web/components/landing/PublicChatbot.tsx",
    "apps/web/components/ProductCardSkeleton.tsx",
    "apps/web/components/ProductCardWithPricing.tsx",
    "apps/web/components/ProductDetail.tsx",
    "apps/web/components/SemanticSearch.tsx",
]

def process_file(filepath):
    """Process a single file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if 'animate-' not in content:
            return False, "No animate-* found"
        
        original_content = content
        
        # Add motion import if not present
        if "from 'framer-motion'" not in content:
            if "'use client';" in content:
                content = content.replace(
                    "'use client';\n\n",
                    "'use client';\n\nimport { motion } from 'framer-motion';\n",
                    1
                )
            elif "'use client'" in content:
                content = content.replace(
                    "'use client'\n\n",
                    "'use client'\n\nimport { motion } from 'framer-motion';\n",
                    1
                )
            else:
                # Add at top
                content = "import { motion } from 'framer-motion';\n" + content
        
        # Replace animate-spin with motion wrapper
        # Pattern: <Icon className="...animate-spin..." />
        content = re.sub(
            r'<(\w+)\s+className="([^"]*?)animate-spin([^"]*?)"([^/>]*?)/?>',
            lambda m: f'<motion.div className="inline-block" animate={{{{ rotate: 360 }}}} transition={{{{ duration: 1, repeat: Infinity, ease: \'linear\' }}}}><{m.group(1)} className="{m.group(2)}{m.group(3)}"{m.group(4)}/></motion.div>',
            content
        )
        
        # Replace animate-pulse
        content = re.sub(
            r'className="([^"]*?)animate-pulse([^"]*?)"',
            r'className="\1\2"',
            content
        )
        
        # For animate-pulse, we'll just remove it since skeleton loading is handled by the component itself
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Updated successfully"
        else:
            return False, "No changes made"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    print("Processing component files...")
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

if __name__ == "__main__":
    main()

