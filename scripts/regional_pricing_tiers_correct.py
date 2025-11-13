# Regional Pricing Tiers - MATCHES MetroPricingComp(4).xlsx

PRICING_TIERS = {
    # Tier 1: Local (Georgia only)
    'tier1': {
        'name': 'Local',
        'tier_number': 1,
        'states': ['Georgia', 'GA']
    },
    
    # Tier 2: Bordering GA (States that border Georgia)
    'tier2': {
        'name': 'Bordering GA',
        'tier_number': 2,
        'states': [
            'Florida', 'FL',
            'Alabama', 'AL',
            'Tennessee', 'TN',
            'North Carolina', 'NC',
            'South Carolina', 'SC'
        ]
    },
    
    # Tier 3: Outer States (Everything else)
    'tier3': {
        'name': 'Outer States',
        'tier_number': 3,
        'states': []  # All other states/territories
    }
}

def get_pricing_tier(state):
    """
    Determine pricing tier based on state.
    Returns tuple: (tier_name, tier_number)
    
    Matches the pricing structure in MetroPricingComp(4).xlsx:
    - Column "Local" = Tier 1 (Georgia)
    - Column "Bordering GA" = Tier 2 (FL, AL, TN, NC, SC)
    - Column "Outer States" = Tier 3 (Everything else)
    """
    if not state:
        return ('Outer States', 3)
    
    state_upper = state.upper().strip()
    
    # Check Tier 1 (Local - Georgia only)
    if any(s.upper() == state_upper for s in PRICING_TIERS['tier1']['states']):
        return ('Local', 1)
    
    # Check Tier 2 (Bordering GA)
    if any(s.upper() == state_upper for s in PRICING_TIERS['tier2']['states']):
        return ('Bordering GA', 2)
    
    # Everything else is Tier 3 (Outer States)
    return ('Outer States', 3)

# Buying group discount
# All buying group members get 3% discount regardless of tier
BUYING_GROUP_DISCOUNT = 0.03  # 3% discount
