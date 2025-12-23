// Notion API client with caching for model guidance data
// Database ID: 2d22915b98b080948426eda76c1fdfed

const NOTION_API_VERSION = '2022-06-28';
const NOTION_BASE_URL = 'https://api.notion.com/v1';
const DATABASE_ID = '2d22915b98b080948426eda76c1fdfed';

// In-memory cache with TTL
const cache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
};

/**
 * Check if cache is valid
 */
function isCacheValid() {
  if (!cache.data || !cache.timestamp) {
    return false;
  }
  return Date.now() - cache.timestamp < cache.ttl;
}

/**
 * Get cached data or null if expired
 */
export function getCachedGuidance() {
  if (isCacheValid()) {
    return cache.data;
  }
  return null;
}

/**
 * Clear the cache (useful for forcing refresh)
 */
export function clearCache() {
  cache.data = null;
  cache.timestamp = null;
}

/**
 * Make authenticated request to Notion API
 */
async function notionFetch(endpoint, options = {}) {
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }

  const response = await fetch(`${NOTION_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Query the guidance database
 */
async function queryDatabase() {
  return notionFetch(`/databases/${DATABASE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({
      // Sort by vendor name for consistent ordering
      sorts: [{ property: 'Vendor', direction: 'ascending' }],
    }),
  });
}

/**
 * Get title property content as plain string
 */
function getTitleContent(titleArray) {
  if (!titleArray || !Array.isArray(titleArray)) {
    return '';
  }
  return titleArray.map(t => t.plain_text || '').join('');
}

/**
 * Get rich text content as plain string
 */
function getRichTextContent(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return '';
  }
  return richTextArray.map(rt => rt.plain_text || '').join('');
}

/**
 * Get date property value
 */
function getDateValue(dateProperty) {
  if (!dateProperty || !dateProperty.start) {
    return undefined;
  }
  // Format as readable date string
  const date = new Date(dateProperty.start);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Parse models from plain text (comma or newline separated)
 */
function parseModels(text) {
  if (!text) return [];

  // Split by comma or newline, trim whitespace, filter empty
  return text
    .split(/[,\n]/)
    .map(m => m.trim())
    .filter(m => m.length > 0);
}

/**
 * Parse best practices from plain text
 * Expected format: Each practice on a new line, optionally with "Rule: Description" format
 * Or: "**Rule**: Description" markdown format
 */
function parseBestPractices(text) {
  if (!text) return [];

  const practices = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to parse "**Rule**: Description" format
    const markdownMatch = trimmed.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/);
    if (markdownMatch) {
      practices.push({
        rule: markdownMatch[1].trim(),
        description: markdownMatch[2].trim()
      });
      continue;
    }

    // Try to parse "Rule: Description" format
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0 && colonIndex < 50) {
      // Likely a "Rule: Description" format
      practices.push({
        rule: trimmed.substring(0, colonIndex).trim(),
        description: trimmed.substring(colonIndex + 1).trim()
      });
    } else {
      // Just a description without a distinct rule
      practices.push({
        rule: trimmed.substring(0, 50).trim() + (trimmed.length > 50 ? '...' : ''),
        description: trimmed
      });
    }
  }

  return practices;
}

/**
 * Parse anti-patterns from plain text (newline separated list)
 */
function parseAntiPatterns(text) {
  if (!text) return [];

  return text
    .split('\n')
    .map(line => line.trim())
    .map(line => line.replace(/^[-•*]\s*/, '')) // Remove bullet points
    .filter(line => line.length > 0);
}

/**
 * Transform Notion page to guidance format
 *
 * Notion database columns:
 * - Vendor (title): Vendor name like 'Claude', 'GPT', 'Gemini', 'Copilot'
 * - Models (text): Comma or newline separated list of models
 * - Best Practices (text): Plain text, one practice per line
 * - Anti-Patterns (text): Plain text, one pattern per line
 * - Structure Template (text): Template string
 * - Source URL (url): Documentation URL
 * - Last Updated (date): Last update date
 */
function transformPageToGuidance(page) {
  const props = page.properties;

  // Get vendor name from title field
  const vendorName = getTitleContent(props['Vendor']?.title);
  if (!vendorName) {
    console.warn('Page missing Vendor property:', page.id);
    return null;
  }

  // Create lowercase key from vendor name
  const vendorKey = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const guidance = {
    name: vendorName,
    models: parseModels(getRichTextContent(props['Models']?.rich_text)),
    source: props['Source URL']?.url || undefined,
    lastUpdated: getDateValue(props['Last Updated']?.date),
    bestPractices: parseBestPractices(getRichTextContent(props['Best Practices']?.rich_text)),
    antiPatterns: parseAntiPatterns(getRichTextContent(props['Anti-Patterns']?.rich_text)),
    structureTemplate: getRichTextContent(props['Structure Template']?.rich_text) || undefined,
    // Default formatting preferences (can be extended if added to Notion)
    formattingPreferences: [],
  };

  return { key: vendorKey, guidance };
}

/**
 * Fetch guidance data from Notion database
 * Returns object keyed by vendor (e.g., { claude: {...}, gpt: {...} })
 */
export async function fetchGuidanceFromNotion() {
  // Return cached data if valid
  const cached = getCachedGuidance();
  if (cached) {
    return cached;
  }

  const response = await queryDatabase();

  const guidance = {};

  for (const page of response.results) {
    const result = transformPageToGuidance(page);
    if (result) {
      guidance[result.key] = result.guidance;
    }
  }

  // Update cache
  cache.data = guidance;
  cache.timestamp = Date.now();

  return guidance;
}

/**
 * Get list of available vendors from Notion
 */
export async function getAvailableVendors() {
  const guidance = await fetchGuidanceFromNotion();
  return Object.keys(guidance);
}
