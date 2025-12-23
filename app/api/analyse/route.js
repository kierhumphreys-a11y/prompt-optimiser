import { NextResponse } from 'next/server';
import { GUIDANCE, formatGuidanceForAnalysis } from '@/lib/guidance';
import { getSystemPrompt } from '@/lib/prompts';

// Efficient in-memory rate limiting using a circular buffer approach
// Note: This resets when the server restarts. For production with multiple instances, use Redis.
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // requests per window per IP

// Store: Map<ip, { timestamps: number[], head: number, count: number, oldestTime: number }>
// Uses a fixed-size circular buffer to avoid array reallocations
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  let entry = rateLimit.get(ip);

  if (!entry) {
    // Initialize with fixed-size buffer
    entry = {
      timestamps: new Array(RATE_LIMIT_MAX).fill(0),
      head: 0,
      count: 0
    };
    rateLimit.set(ip, entry);
  }

  // Quick check: if oldest recorded request is within window and we're at max, reject
  // This avoids scanning in the common "at limit" case
  if (entry.count >= RATE_LIMIT_MAX) {
    const oldestIndex = (entry.head - entry.count + RATE_LIMIT_MAX) % RATE_LIMIT_MAX;
    if (entry.timestamps[oldestIndex] > windowStart) {
      return false; // Still at limit
    }
  }

  // Count valid requests in window (O(n) but n is capped at RATE_LIMIT_MAX = 20)
  let validCount = 0;
  for (let i = 0; i < entry.count; i++) {
    const idx = (entry.head - entry.count + i + RATE_LIMIT_MAX) % RATE_LIMIT_MAX;
    if (entry.timestamps[idx] > windowStart) {
      validCount++;
    }
  }

  if (validCount >= RATE_LIMIT_MAX) {
    return false;
  }

  // Add new request to circular buffer
  entry.timestamps[entry.head] = now;
  entry.head = (entry.head + 1) % RATE_LIMIT_MAX;
  entry.count = Math.min(entry.count + 1, RATE_LIMIT_MAX);

  return true;
}

// Lazy cleanup: only clean entries that haven't been accessed in 2x the window
// This runs less frequently and does less work
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = RATE_LIMIT_WINDOW * 2;

function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const windowStart = now - RATE_LIMIT_WINDOW;

  // Only delete entries where all timestamps are expired
  for (const [ip, entry] of rateLimit.entries()) {
    let hasValid = false;
    for (let i = 0; i < entry.count; i++) {
      const idx = (entry.head - entry.count + i + RATE_LIMIT_MAX) % RATE_LIMIT_MAX;
      if (entry.timestamps[idx] > windowStart) {
        hasValid = true;
        break;
      }
    }
    if (!hasValid) {
      rateLimit.delete(ip);
    }
  }
}

// Validate and sanitize IP address to prevent spoofing
function getClientIdentifier(request) {
  // SECURITY: x-forwarded-for can be spoofed by clients.
  // This rate limiting is defense-in-depth, not a security boundary.
  // For production, use a trusted reverse proxy that overwrites (not appends to) this header,
  // or use an external rate limiting service (e.g., Vercel's built-in, Cloudflare, Redis).

  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  // Get the first IP from x-forwarded-for (client IP in most proxy setups)
  let ip = forwardedFor?.split(',')[0] || realIp || '';

  // Trim whitespace and validate basic IP format
  ip = ip.trim();

  // Basic IPv4/IPv6 validation - reject obviously invalid values
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ip && (ipv4Regex.test(ip) || ipv6Regex.test(ip))) {
    return ip;
  }

  // Fallback: Use a combination of headers to create a fingerprint
  // This makes it harder to bypass by simply omitting headers
  const userAgent = request.headers.get('user-agent') || '';
  const acceptLang = request.headers.get('accept-language') || '';

  // Create a simple hash-like identifier from available headers
  // This is not cryptographically secure but provides some differentiation
  const fallbackId = `anon_${Buffer.from(userAgent + acceptLang).toString('base64').substring(0, 16)}`;
  return fallbackId;
}

export async function POST(request) {
  // Lazy cleanup of expired rate limit entries
  maybeCleanup();

  // Get client identifier for rate limiting
  const clientId = getClientIdentifier(request);

  // Check rate limit
  if (!checkRateLimit(clientId)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 }
    );
  }
  
  // Validate API key exists
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not configured');
    return NextResponse.json(
      { error: 'Server configuration error. Please check the API key is set.' },
      { status: 500 }
    );
  }
  
  try {
    const body = await request.json();
    const { mode, vendor, model, inputText, additionalContext, entryMode, problemContext } = body;
    
    // Validate required fields
    if (!mode || !vendor || !model || !inputText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate vendor
    if (!GUIDANCE[vendor]) {
      return NextResponse.json(
        { error: 'Invalid vendor' },
        { status: 400 }
      );
    }
    
    // Validate mode
    if (!['critique', 'optimise', 'generate'].includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode' },
        { status: 400 }
      );
    }
    
    // Validate input length (prevent abuse)
    if (inputText.length > 50000) {
      return NextResponse.json(
        { error: 'Input too long (max 50,000 characters)' },
        { status: 400 }
      );
    }
    
    // Build the prompt
    const guidance = formatGuidanceForAnalysis(vendor);
    const systemPrompt = getSystemPrompt(mode, vendor, model, guidance, {
      additionalContext: additionalContext || '',
      entryMode: entryMode || 'idea',
      problemContext: problemContext || ''
    });
    const vendorName = GUIDANCE[vendor].name;
    
    let userMessage;
    if (mode === 'critique') {
      userMessage = `Critique this ${entryMode === 'prompt' ? 'prompt' : 'idea'} and identify what's missing or problematic:\n\n${inputText}`;
    } else if (mode === 'optimise') {
      userMessage = `Analyse and optimise this prompt for ${vendorName} (${model}):\n\n${inputText}`;
    } else {
      userMessage = `Create a well-structured ${vendorName} (${model}) prompt from this idea:\n\n${inputText}`;
    }
    
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // SECURITY: Only log status code, not full error response which may contain sensitive data
      console.error('Anthropic API error: status', response.status);
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again in a few minutes.' },
          { status: 429 }
        );
      }
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'API authentication failed. Please check the API key.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to process request. Please try again.' },
        { status: response.status }
      );
    }
    
    const data = await response.json();

    // Extract text content using single reduce (more efficient than filter+map+join)
    const responseText = data.content?.reduce((acc, item) =>
      item.type === 'text' ? acc + item.text : acc, '') || '';

    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from API' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON content - try to find the JSON object directly
      let jsonStr = responseText;

      // Check for markdown code blocks (common LLM output format)
      const codeBlockStart = jsonStr.indexOf('```');
      if (codeBlockStart !== -1) {
        const codeBlockEnd = jsonStr.indexOf('```', codeBlockStart + 3);
        if (codeBlockEnd !== -1) {
          // Extract content between code blocks, skip optional 'json' label
          jsonStr = jsonStr.substring(codeBlockStart + 3, codeBlockEnd);
          if (jsonStr.startsWith('json')) {
            jsonStr = jsonStr.substring(4);
          }
        }
      }

      // Find JSON object boundaries (more efficient than regex for large strings)
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
        throw new Error('No JSON found in response');
      }

      // Extract and clean JSON
      let cleanJson = jsonStr.substring(jsonStart, jsonEnd + 1)
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      parsed = JSON.parse(cleanJson);
    } catch (parseError) {
      // SECURITY: Only log error type, not response content which may contain sensitive data
      console.error('JSON parse error:', parseError.name);
      return NextResponse.json(
        { error: 'Failed to parse response. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(parsed);
    
  } catch (error) {
    // SECURITY: Only log error name, not full stack trace which may expose implementation details
    console.error('Request error:', error.name || 'Unknown');
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
