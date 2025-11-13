# Regional Pricing Tiers based on proximity to Georgia

PRICING_TIERS = {
    # Tier 1: Georgia (Local/Base Pricing)
    'tier1': {
        'name': 'Tier 1 - Local',
        'markup': 0.00,  # Base pricing
        'states': ['Georgia', 'GA']
    },
    
    # Tier 2: States bordering Georgia (5% markup)
    'tier2': {
        'name': 'Tier 2 - Border States',
        'markup': 0.05,  # 5% markup
        'states': [
            'Florida', 'FL',
            'Alabama', 'AL',
            'Tennessee', 'TN',
            'North Carolina', 'NC',
            'South Carolina', 'SC'
        ]
    },
    
    # Tier 3: States bordering Tier 2 states (10% markup)
    'tier3': {
        'name': 'Tier 3 - Outer States',
        'markup': 0.10,  # 10% markup
        'states': [
            'Virginia', 'VA',
            'West Virginia', 'WV',
            'Kentucky', 'KY',
            'Mississippi', 'MS',
            'Louisiana', 'LA',
            'Arkansas', 'AR'
        ]
    },
    
    # Tier 4: All other states/territories (15% markup or custom)
    'tier4': {
        'name': 'Tier 4 - Extended',
        'markup': 0.15,  # 15% markup
        'states': []  # Everything else
    }
}

def get_pricing_tier(state):
    """
    Determine pricing tier based on state.
    Returns tuple: (tier_name, tier_number, markup_percentage)
    """
    if not state:
        return ('Tier 4 - Extended', 4, 0.15)
    
    state_upper = state.upper().strip()
    
    # Check Tier 1 (Georgia)
    if any(s.upper() == state_upper for s in PRICING_TIERS['tier1']['states']):
        return ('Tier 1 - Local', 1, 0.00)
    
    # Check Tier 2 (Border states)
    if any(s.upper() == state_upper for s in PRICING_TIERS['tier2']['states']):
        return ('Tier 2 - Border States', 2, 0.05)
    
    # Check Tier 3 (Outer states)
    if any(s.upper() == state_upper for s in PRICING_TIERS['tier3']['states']):
        return ('Tier 3 - Outer States', 3, 0.10)
    
    # Everything else is Tier 4
    return ('Tier 4 - Extended', 4, 0.15)

# Buying group discount (applies to all tiers)
BUYING_GROUP_DISCOUNT = 0.03  # 3% discount for all buying group members
