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
    entry = { requests: [], blocked: false };
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

export async function POST(request) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Check rate limit
  if (!checkRateLimit(ip)) {
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
      console.error('Anthropic API error:', response.status, errorData);
      
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
      console.error('JSON parse error:', parseError.message);
      console.error('Response text (first 1000 chars):', responseText.substring(0, 1000));
      return NextResponse.json(
        { error: 'Failed to parse response. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(parsed);
    
  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
