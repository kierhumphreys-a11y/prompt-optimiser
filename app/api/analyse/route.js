import { NextResponse } from 'next/server';
import { GUIDANCE, formatGuidanceForAnalysis } from '@/lib/guidance';
import { getSystemPrompt } from '@/lib/prompts';

// Simple in-memory rate limiting
// Note: This resets when the server restarts. For production with multiple instances, use Redis.
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // requests per window per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  let entry = rateLimit.get(ip);
  if (!entry) {
    entry = { requests: [] };
    rateLimit.set(ip, entry);
  }
  
  // Remove old requests outside the window
  entry.requests = entry.requests.filter(time => time > windowStart);
  
  // Check if over limit
  if (entry.requests.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  // Add this request
  entry.requests.push(now);
  return true;
}

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    for (const [ip, entry] of rateLimit.entries()) {
      entry.requests = entry.requests.filter(time => time > windowStart);
      if (entry.requests.length === 0) {
        rateLimit.delete(ip);
      }
    }
  }, RATE_LIMIT_WINDOW);
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
    
    // Extract text content
    const responseText = data.content
      ?.filter(item => item.type === 'text')
      ?.map(item => item.text)
      ?.join('') || '';
    
    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from API' },
        { status: 500 }
      );
    }
    
    // Parse the JSON response
    let parsed;
    try {
      // Remove markdown code blocks if present
      let jsonStr = responseText;
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }
      
      // Find JSON object
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      // Clean up common JSON issues
      let cleanJson = jsonMatch[0]
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
