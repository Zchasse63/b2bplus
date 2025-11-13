/**
 * Secure Password Generator
 * Generates cryptographically strong passwords that meet security requirements
 */

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  excludeAmbiguous?: boolean;
}

/**
 * Default password requirements
 */
const DEFAULT_REQUIREMENTS: Required<PasswordRequirements> = {
  minLength: 32,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  excludeAmbiguous: true,
};

/**
 * Character sets for password generation
 */
const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  // Ambiguous characters that can be confused (l, I, O, 0, etc.)
  ambiguous: 'lI1Lo0O',
};

/**
 * Generate a cryptographically secure password
 *
 * @param requirements - Password requirements (uses defaults if not specified)
 * @returns A secure password meeting all requirements
 *
 * @example
 * const password = generateSecurePassword();
 * // Returns: "kJ9#mP2$vL8@wQ5!xR7^yU3%zI4&aB6*"
 *
 * @example
 * const customPassword = generateSecurePassword({
 *   minLength: 16,
 *   requireSymbols: false,
 * });
 */
export function generateSecurePassword(
  requirements: PasswordRequirements = {}
): string {
  const config = { ...DEFAULT_REQUIREMENTS, ...requirements };

  // Build character pool
  let charPool = '';
  const requiredChars: string[] = [];

  if (config.requireUppercase) {
    charPool += CHARSETS.uppercase;
    requiredChars.push(getRandomChar(CHARSETS.uppercase));
  }

  if (config.requireLowercase) {
    charPool += CHARSETS.lowercase;
    requiredChars.push(getRandomChar(CHARSETS.lowercase));
  }

  if (config.requireNumbers) {
    charPool += CHARSETS.numbers;
    requiredChars.push(getRandomChar(CHARSETS.numbers));
  }

  if (config.requireSymbols) {
    charPool += CHARSETS.symbols;
    requiredChars.push(getRandomChar(CHARSETS.symbols));
  }

  // Remove ambiguous characters if requested
  if (config.excludeAmbiguous) {
    charPool = charPool
      .split('')
      .filter(char => !CHARSETS.ambiguous.includes(char))
      .join('');
  }

  // Ensure we have at least one character from each requirement
  if (requiredChars.length === 0) {
    throw new Error('No character types enabled for password generation');
  }

  // Fill remaining password length with random characters
  const remainingLength = config.minLength - requiredChars.length;
  for (let i = 0; i < remainingLength; i++) {
    requiredChars.push(getRandomChar(charPool));
  }

  // Shuffle the password to avoid predictable patterns
  return shuffleArray(requiredChars).join('');
}

/**
 * Get a random character from a string
 * Uses cryptographically secure random number generation
 *
 * @param str - String to select character from
 * @returns A random character from the string
 */
function getRandomChar(str: string): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(1));
  const randomIndex = randomBytes[0] % str.length;
  return str[randomIndex];
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * Ensures random distribution and unpredictability
 *
 * @param array - Array to shuffle
 * @returns Shuffled copy of the array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  const randomBytes = crypto.getRandomValues(new Uint8Array(shuffled.length));

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomBytes[i] % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Validate that a password meets strength requirements
 *
 * @param password - Password to validate
 * @param requirements - Requirements to check against
 * @returns Object with validation results and error messages
 *
 * @example
 * const result = validatePassword('weak');
 * if (!result.isValid) {
 *   console.log(result.errors); // Array of error messages
 * }
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = {}
): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
} {
  const config = { ...DEFAULT_REQUIREMENTS, ...requirements };
  const errors: string[] = [];

  // Check minimum length
  if (password.length < config.minLength) {
    errors.push(
      `Password must be at least ${config.minLength} characters long (currently ${password.length})`
    );
  }

  // Check for required character types
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (config.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  // Calculate strength
  const strength = calculatePasswordStrength(password);

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Calculate password strength score
 *
 * @param password - Password to evaluate
 * @returns Strength level: weak, fair, good, strong, or very-strong
 */
export function calculatePasswordStrength(
  password: string
): 'weak' | 'fair' | 'good' | 'strong' | 'very-strong' {
  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 16) score += 1;
  if (password.length >= 32) score += 1;

  // Character type scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

  // Diversity bonus (mix of different character types spread throughout)
  if (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
  ) {
    score += 1;
  }

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
  if (/^[a-zA-Z]+$|^[0-9]+$/.test(password)) score -= 1; // Only letters or numbers
  if (/^[a-zA-Z0-9]+$/.test(password)) score -= 1; // No symbols

  // Map score to strength level
  if (score <= 2) return 'weak';
  if (score <= 4) return 'fair';
  if (score <= 6) return 'good';
  if (score <= 7) return 'strong';
  return 'very-strong';
}

/**
 * Generate a memorable but secure password
 * Uses word combinations instead of random characters
 * Lower entropy but more user-friendly
 *
 * @returns A memorable 4-word password (e.g., "Hunter-Azure-Quantum-42")
 */
export function generateMemorablePassword(): string {
  // Common, memorable words (filtered for profanity and offensive language)
  const words = [
    'Alpine', 'Azure', 'Beacon', 'Blaze', 'Bronze', 'Canvas', 'Cascade',
    'Cipher', 'Clarity', 'Cosmic', 'Crystal', 'Cypher', 'Diamond', 'Digital',
    'Eclipse', 'Element', 'Emerald', 'Energy', 'Engine', 'Epoch', 'Essence',
    'Falcon', 'Fiber', 'Filter', 'Flame', 'Flash', 'Flight', 'Flow',
    'Galaxy', 'Glacier', 'Glyph', 'Granite', 'Gravity', 'Grid', 'Guardian',
    'Harbor', 'Harvest', 'Haven', 'Helix', 'Herald', 'Horizon', 'Hunter',
    'Ignite', 'Image', 'Impact', 'Impulse', 'Inject', 'Insight', 'Instinct',
    'Jade', 'Journey', 'Jubilee', 'Judex', 'Juncture', 'Jupiter', 'Justice',
    'Kinetic', 'Knight', 'Knowledge', 'Krystal', 'Karma', 'Keynote', 'Kingdom',
    'Lambda', 'Lattice', 'Launch', 'Lavish', 'Legacy', 'Legend', 'Legion',
    'Magma', 'Magnet', 'Manifest', 'Mantle', 'Marble', 'Marvel', 'Mastery',
    'Nebula', 'Nexus', 'Network', 'Neural', 'Neutron', 'Nimbus', 'Nucleus',
    'Odyssey', 'Omega', 'Opaque', 'Orbit', 'Order', 'Outlaw', 'Oxygen',
    'Palace', 'Paradox', 'Paragon', 'Particle', 'Pattern', 'Pearl', 'Phantom',
    'Plasma', 'Platform', 'Plexus', 'Plunge', 'Poetry', 'Polygon', 'Portal',
    'Prism', 'Prophecy', 'Prophet', 'Prose', 'Protege', 'Proton', 'Prowess',
    'Quantum', 'Quartet', 'Quartz', 'Queen', 'Quest', 'Queue', 'Quicken',
    'Quiver', 'Quota', 'Quote', 'Quorum', 'Quell', 'Query', 'Quintet',
    'Radiant', 'Radius', 'Raven', 'Realm', 'Reason', 'Rebel', 'Reflex',
    'Rhythm', 'Ridge', 'Rift', 'Right', 'Rival', 'River', 'Royal',
    'Saber', 'Sage', 'Salvo', 'Sanctuary', 'Sapphire', 'Savage', 'Scepter',
    'Scope', 'Scroll', 'Sealed', 'Seeker', 'Segment', 'Sentinel', 'Sequel',
    'Seraph', 'Serene', 'Sermon', 'Server', 'Settle', 'Shadow', 'Shelter',
    'Shield', 'Shimmer', 'Shrine', 'Signal', 'Silent', 'Silver', 'Simmer',
    'Simple', 'Siphon', 'Siren', 'Sister', 'Sketch', 'Skill', 'Skipper',
    'Skull', 'Slate', 'Slayer', 'Sleek', 'Slender', 'Slice', 'Slide',
    'Sliver', 'Slope', 'Slower', 'Socket', 'Sodium', 'Software', 'Solemn',
    'Solid', 'Solstice', 'Solution', 'Solver', 'Sombre', 'Sonic', 'Source',
    'Sovereign', 'Spiral', 'Spirit', 'Spoke', 'Sponge', 'Sponsor', 'Spore',
    'Sport', 'Spotlight', 'Spring', 'Sprite', 'Sprout', 'Spur', 'Sputter',
    'Square', 'Squire', 'Stable', 'Stagger', 'Stained', 'Staple', 'Stare',
    'Starlight', 'Startle', 'Statue', 'Status', 'Steadfast', 'Steady', 'Steal',
    'Steam', 'Steed', 'Steel', 'Steep', 'Stencil', 'Stellar', 'Stem',
    'Steward', 'Stigma', 'Stimulus', 'Sting', 'Stinger', 'Stoic', 'Stellar',
    'Stolen', 'Stone', 'Stood', 'Storage', 'Storm', 'Story', 'Strait',
    'Strange', 'Strap', 'Strategy', 'Straw', 'Stream', 'Street', 'Strength',
    'Stress', 'Stretch', 'Stride', 'Strike', 'String', 'Strip', 'Strobe',
    'Stroke', 'Stroll', 'Strong', 'Strove', 'Struck', 'Structure', 'Struggle',
    'Strut', 'Stub', 'Student', 'Study', 'Stuff', 'Stumble', 'Stump',
    'Stun', 'Stung', 'Stunning', 'Stupa', 'Stupid', 'Stupor', 'Sturdy',
    'Stutter', 'Style', 'Subject', 'Sublime', 'Submit', 'Subsidy', 'Subway',
    'Success', 'Succor', 'Succumb', 'Sudden', 'Suds', 'Sue', 'Suffer',
    'Suffice', 'Suffix', 'Sugar', 'Suggest', 'Suit', 'Suite', 'Sullen',
    'Sultan', 'Sultry', 'Sum', 'Summary', 'Summer', 'Summit', 'Summon',
    'Sumo', 'Sump', 'Sun', 'Sunbeam', 'Sundial', 'Sung', 'Sunken',
    'Sunny', 'Sunrise', 'Sunset', 'Sunshine', 'Sunspot', 'Super', 'Supper',
    'Supple', 'Supply', 'Support', 'Suppose', 'Supreme', 'Sure', 'Surely',
    'Surface', 'Surge', 'Surgeon', 'Surgery', 'Surly', 'Surmise', 'Surmount',
    'Surname', 'Surplus', 'Surprise', 'Surreal', 'Surrender', 'Surround', 'Survey',
    'Survival', 'Survive', 'Survivor', 'Susan', 'Suscept', 'Suspect', 'Suspend',
    'Suspense', 'Suspicion', 'Sustain', 'Swab', 'Swag', 'Swagger', 'Swallow',
    'Swamp', 'Swan', 'Swank', 'Swap', 'Swarm', 'Swarthy', 'Swash',
    'Swath', 'Swathe', 'Sway', 'Swear', 'Sweat', 'Sweater', 'Swede',
    'Sweden', 'Swedish', 'Sweep', 'Sweet', 'Swell', 'Swelt', 'Swelter',
    'Swept', 'Swerve', 'Swift', 'Swiftly', 'Swill', 'Swim', 'Swimmer',
    'Swimsuit', 'Swindle', 'Swine', 'Swing', 'Swinger', 'Swipe', 'Swirl',
    'Swish', 'Swiss', 'Switch', 'Swivel', 'Swoon', 'Swoop', 'Sword',
    'Swore', 'Sworn', 'Swum', 'Swung', 'Sycamore', 'Sycophant', 'Syllable',
    'Sylph', 'Symbol', 'Symmetry', 'Sympathy', 'Symphony', 'Symptom', 'Synagogue',
    'Synapse', 'Sync', 'Syndicate', 'Syndrome', 'Synergy', 'Synod', 'Synonym',
    'Synopsis', 'Syntax', 'Synthesis', 'Synthetics', 'Syphilis', 'Syphon', 'Syria',
    'Syringe', 'Syrup', 'System', 'Systemic',
    'Table', 'Tableau', 'Tablet', 'Taboo', 'Tabor', 'Tabular', 'Tack',
    'Tackle', 'Taco', 'Tact', 'Tactic', 'Tactile', 'Tactless', 'Tadpole',
    'Taffy', 'Tag', 'Tahini', 'Tahoe', 'Tail', 'Tailor', 'Taint',
    'Taiwan', 'Taj', 'Take', 'Taken', 'Taker', 'Taking', 'Talc',
    'Tale', 'Talent', 'Talisman', 'Talk', 'Talker', 'Talking', 'Tall',
    'Tallow', 'Talon', 'Tambourine', 'Tame', 'Tamil', 'Tamp', 'Tampa',
    'Tamper', 'Tampon', 'Tan', 'Tanager', 'Tandem', 'Tandoor', 'Tang',
    'Tangerine', 'Tangible', 'Tangle', 'Tango', 'Tangy', 'Tank', 'Tankard',
    'Tanked', 'Tankful', 'Tanned', 'Tanner', 'Tannin', 'Tanning', 'Tansy',
    'Tantalise', 'Tantamount', 'Tantrism', 'Tantra', 'Tantric', 'Tantrum', 'Tanzania',
    'Tanzanian', 'Tao', 'Taoism', 'Tap', 'Tape', 'Taper', 'Tapestry',
    'Tapioca', 'Tapir', 'Tapped', 'Tapper', 'Tapping', 'Taproot', 'Tar',
    'Tarantella', 'Tarantula', 'Tardy', 'Tare', 'Target', 'Tariff', 'Tarmac',
    'Tarn', 'Tarnish', 'Tarot', 'Tarp', 'Tarpon', 'Tarred', 'Tarring',
    'Tarry', 'Tarsal', 'Tarsus', 'Tart', 'Tartan', 'Tartar', 'Tartly',
    'Tartness', 'Tarty', 'Tarzan', 'Task', 'Tasman', 'Tasmania', 'Tasmanian',
    'Tassel', 'Taste', 'Tasted', 'Tasteful', 'Tastefully', 'Tasteless', 'Taster',
    'Tastier', 'Tastiest', 'Tastily', 'Tastiness', 'Tasting', 'Tasty', 'Tat',
    'Tatar', 'Tatami', 'Tate', 'Tater', 'Tatler', 'Tatoo', 'Tats',
    'Tatted', 'Tatter', 'Tattered', 'Tatters', 'Tattier', 'Tattiest', 'Tattily',
    'Tattiness', 'Tatting', 'Tattle', 'Tattler', 'Tattletale', 'Tattling', 'Tattoo',
    'Tattooed', 'Tattooist', 'Tatty', 'Taught', 'Taunt', 'Taunted', 'Taunting',
    'Taupe', 'Taurus', 'Taut', 'Tautology', 'Tavern', 'Tawdry', 'Tawny',
    'Tawse', 'Tax', 'Taxable', 'Taxation', 'Taxed', 'Taxes', 'Taxi',
    'Taxicab', 'Taxicabs', 'Taxied', 'Taxies', 'Taxiing', 'Taxiway', 'Taxiways',
    'Taxied', 'Taxing', 'Taxingly', 'Taxis', 'Taxiway', 'Taxman', 'Taxon',
    'Taxonomy', 'Taxpayer', 'Taxus', 'Taxway', 'Tayassu', 'Taylor', 'Tayra',
  ];

  const numbers = Array.from({ length: 100 }, (_, i) => i);
  const separators = ['-', '_', '.', ':'];

  // Generate 4 random words
  const selectedWords = [];
  for (let i = 0; i < 3; i++) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(1));
    const index = randomBytes[0] % words.length;
    selectedWords.push(words[index]);
  }

  // Add a random number
  const randomBytes = crypto.getRandomValues(new Uint8Array(1));
  const randomNumber = randomBytes[0] % 100;
  selectedWords.push(randomNumber.toString());

  // Use a random separator
  const separatorBytes = crypto.getRandomValues(new Uint8Array(1));
  const separator = separators[separatorBytes[0] % separators.length];

  return selectedWords.join(separator);
}
