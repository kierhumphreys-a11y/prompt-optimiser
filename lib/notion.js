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
      sorts: [{ property: 'vendor', direction: 'ascending' }],
    }),
  });
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
 * Get select property value
 */
function getSelectValue(selectProperty) {
  return selectProperty?.name || '';
}

/**
 * Get multi-select property values as array
 */
function getMultiSelectValues(multiSelectProperty) {
  if (!multiSelectProperty || !Array.isArray(multiSelectProperty)) {
    return [];
  }
  return multiSelectProperty.map(item => item.name);
}

/**
 * Parse JSON from a rich text field
 */
function parseJsonField(richTextArray) {
  const content = getRichTextContent(richTextArray);
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    console.warn('Failed to parse JSON field:', content.substring(0, 100));
    return null;
  }
}

/**
 * Transform Notion page to guidance format
 * Expected Notion database properties:
 * - vendor (select): lowercase key like 'claude', 'gpt', 'gemini', 'copilot'
 * - name (title): Display name like 'Claude', 'GPT-5.2'
 * - models (multi-select): Available models
 * - contextWindow (rich_text): Token limits
 * - lastUpdated (rich_text): Date string
 * - source (url): Documentation URL
 * - bestPractices (rich_text): JSON array of {rule, description, example?}
 * - formattingPreferences (rich_text): JSON array of strings
 * - antiPatterns (rich_text): JSON array of strings
 * - structureTemplate (rich_text): Template string
 * - knowledgeCutoff (rich_text): Optional cutoff date
 * - reasoningEffort (rich_text): Optional JSON array for GPT
 * - thinkingLevels (rich_text): Optional JSON array for Gemini
 * - criticalNote (rich_text): Optional critical note
 * - appSpecificTips (rich_text): Optional JSON object for Copilot
 */
function transformPageToGuidance(page) {
  const props = page.properties;

  const vendorKey = getSelectValue(props.vendor?.select);
  if (!vendorKey) {
    console.warn('Page missing vendor property:', page.id);
    return null;
  }

  const guidance = {
    name: getRichTextContent(props.name?.title) || vendorKey,
    models: getMultiSelectValues(props.models?.multi_select),
    contextWindow: getRichTextContent(props.contextWindow?.rich_text) || undefined,
    lastUpdated: getRichTextContent(props.lastUpdated?.rich_text) || undefined,
    source: props.source?.url || undefined,
    bestPractices: parseJsonField(props.bestPractices?.rich_text) || [],
    formattingPreferences: parseJsonField(props.formattingPreferences?.rich_text) || [],
    antiPatterns: parseJsonField(props.antiPatterns?.rich_text) || [],
    structureTemplate: getRichTextContent(props.structureTemplate?.rich_text) || undefined,
  };

  // Optional vendor-specific fields
  const knowledgeCutoff = getRichTextContent(props.knowledgeCutoff?.rich_text);
  if (knowledgeCutoff) guidance.knowledgeCutoff = knowledgeCutoff;

  const reasoningEffort = parseJsonField(props.reasoningEffort?.rich_text);
  if (reasoningEffort) guidance.reasoningEffort = reasoningEffort;

  const thinkingLevels = parseJsonField(props.thinkingLevels?.rich_text);
  if (thinkingLevels) guidance.thinkingLevels = thinkingLevels;

  const criticalNote = getRichTextContent(props.criticalNote?.rich_text);
  if (criticalNote) guidance.criticalNote = criticalNote;

  const appSpecificTips = parseJsonField(props.appSpecificTips?.rich_text);
  if (appSpecificTips) guidance.appSpecificTips = appSpecificTips;

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
