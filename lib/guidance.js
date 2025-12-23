// Model guidance data - Updated December 23, 2025
// Comprehensive research from official documentation and respected community sources

export const GUIDANCE = {
  claude: {
    name: "Claude",
    models: ["Opus 4.5", "Sonnet 4.5", "Haiku 4.5"],
    contextWindow: "200K tokens (1M beta for Sonnet)",
    maxOutput: "64K tokens",
    lastUpdated: "December 2025",
    knowledgeCutoff: "May 2025",
    source: "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview",
    bestPractices: [
      {
        rule: "Be Explicitly Instructional",
        description: "Claude 4.x models are trained for precise instruction following. They do exactly what you ask, nothing more. State depth expectations directly rather than hoping the model infers them.",
        example: "Refactor this code to: 1) Extract the validation logic into a separate function, 2) Add error handling for null inputs, 3) Replace the nested loops with a more efficient algorithm."
      },
      {
        rule: "Provide Context and Motivation",
        description: "Explain *why* you need something, not just what. Include business context, audience, and how the output will be used. Claude generalises better from context-aware reasoning.",
        example: "This function must validate user input because we're processing payment data and cannot accept invalid card numbers. The audience is security-conscious enterprise clients."
      },
      {
        rule: "Use XML Tags for Structure",
        description: "Organise prompts using semantic XML tags: <context>, <instructions>, <examples>, <constraints>, <output_format>. Claude's training heavily emphasises XML structure, preventing 'context leakage' where input data is confused with instructions."
      },
      {
        rule: "Craft Examples with Extreme Care",
        description: "Claude 4.x closely imitates provided examples. Include 3-5 diverse, high-quality examples that demonstrate exactly the behaviour you want. The model may mirror patterns even from counter-examples or low-quality examples."
      },
      {
        rule: "Use Positive Instructions",
        description: "Tell Claude what TO do, not what NOT to do. Negative constraints trigger the 'Pink Elephant' effect where the model's attention focuses on the prohibited concept.",
        example: "Instead of 'Do not use markdown', say 'Output plain text only. Write in flowing paragraphs.'"
      },
      {
        rule: "Leverage Prefill for Format Control",
        description: "Use the API's ability to prefill the assistant message by starting Claude's response with specific characters. Starting with '{' forces immediate JSON output and eliminates conversational preamble."
      },
      {
        rule: "Use Parallel Tool Calling",
        description: "When tasks have no dependencies, instruct Claude to call multiple tools simultaneously. Sonnet 4.5 is particularly aggressive with parallel execution.",
        example: "Add to system prompt: 'If you intend to call multiple tools and there are no dependencies between them, make all independent tool calls in parallel.'"
      },
      {
        rule: "Manage Over-Engineering (Opus 4.5)",
        description: "Opus 4.5 tends to create unnecessary abstractions and add unrequested features. Add explicit constraints: 'Avoid over-engineering. Only make changes that are directly requested. Do not add features unless explicitly requested.'"
      }
    ],
    formattingPreferences: [
      "Prefer minimal formatting unless explicitly requested",
      "Avoid excessive bold, headers, and bullet points",
      "Write in flowing prose with complete paragraphs",
      "Reserve markdown for inline code and code blocks",
      "Match prompt style to desired output style"
    ],
    antiPatterns: [
      "Negative constraints ('Do not use markdown') - use positive framing instead",
      "Feeding raw user input without XML tag separation (prompt injection risk)",
      "Aggressive tool-use language with Opus ('CRITICAL: YOU MUST...') - use calm imperatives",
      "Using Haiku for long-context architectural tasks (prone to forgetting)",
      "Using 'think step by step' when extended thinking is disabled (Opus is sensitive to the word 'think')",
      "Providing dozens of examples (3-5 diverse examples is optimal)",
      "Showing what NOT to do in examples (model may follow the negative pattern)",
      "Vague requests expecting the model to infer depth"
    ],
    structureTemplate: `<role>
You are [specific role/persona with expertise in domain].
Your goal is [core objective].
</role>

<behavioral_guidelines>
- Maintain a [tone] tone.
- Prioritise [priority, e.g., accuracy over speed].
</behavioral_guidelines>

<context>
[Background information, documents, or data]
</context>

<task>
[Specific, actionable instruction]
</task>

<constraints>
- [Hard constraint 1]
- [Hard constraint 2]
- Do not add features or expand scope unless explicitly requested.
</constraints>

<output_format>
[Desired response structure]
</output_format>

<examples>
<example>
<input>[Example input]</input>
<o>[Example output]</o>
</example>
</examples>`
  },
  gpt: {
    name: "GPT-5.2",
    models: ["Instant", "Thinking", "Pro"],
    contextWindow: "400K input, 128K output",
    maxOutput: "128K tokens",
    lastUpdated: "December 2025",
    knowledgeCutoff: "August 31, 2025",
    source: "https://platform.openai.com/docs/guides/latest-model",
    bestPractices: [
      {
        rule: "Choose the Right Model Mode",
        description: "GPT-5.2 comes in three variants: Instant (fast, shallow reasoning), Thinking (methodical, extended reasoning), Pro (maximum accuracy, parallel processing). Using Instant for complex queries yields shallow answers; using Pro for trivial tasks wastes time and cost."
      },
      {
        rule: "Control Reasoning Effort Explicitly",
        description: "Use the reasoning_effort parameter: none, minimal, low, medium, high, xhigh (Pro only). Reasoning tokens are expensive. Start with 'none' for simple tasks and tune upward only if needed."
      },
      {
        rule: "Pass Previous Reasoning Between Turns",
        description: "In multi-turn conversations, use previous_response_id to pass the model's prior reasoning back. This avoids re-reasoning from scratch, reduces tokens, and increases cache hit rates."
      },
      {
        rule: "Control Verbosity Explicitly",
        description: "GPT-5.2 defaults to lower verbosity. Use explicit constraints: '3-6 sentences or ≤5 bullets for typical answers. For simple yes/no questions: ≤2 sentences.'",
        example: "For complex multi-step tasks: 1 short overview paragraph, then ≤5 bullets tagged: What changed, Where, Risks, Next steps, Open questions."
      },
      {
        rule: "Prevent Scope Creep",
        description: "GPT-5.2 tends to 'over-solve' problems. Add explicit constraints: 'Implement EXACTLY and ONLY what the user requests. No extra features, no added components, no UX embellishments. If ambiguous, choose the simplest valid interpretation.'"
      },
      {
        rule: "Use Tool Call Preambles",
        description: "Instruct the model to explain its reasoning before calling tools. This forces the reasoning layer to verify necessity before execution and reduces tangential tool-calling."
      },
      {
        rule: "Handle Ambiguity Explicitly",
        description: "Configure prompts to present 2-3 plausible interpretations with labelled assumptions, or ask up to 1-3 clarifying questions. Never fabricate exact figures when uncertain."
      },
      {
        rule: "Use Structured Extraction with Schema Enforcement",
        description: "For data extraction, provide a rigid JSON schema. Instruct to set missing fields to null rather than guessing. GPT-5.2 achieves state-of-the-art schema adherence."
      }
    ],
    formattingPreferences: [
      "Lower verbosity than predecessors - explicitly request detail if needed",
      "Compact bullets and short sections over long narrative paragraphs",
      "Do not rephrase the user's request unless it changes semantics",
      "Use XML delimiters for long documents, not JSON"
    ],
    antiPatterns: [
      "Adding 'Think step by step' to GPT-5.2 Thinking prompts (already has hidden CoT)",
      "Asking for task 'updates' without limits (causes narrative noise)",
      "Letting Thinking mode halt for minor ambiguities (instruct to make best-guess)",
      "Relying on Auto mode exclusively (override when you know task complexity)",
      "Missing previous_response_id in multi-turn (forces re-reasoning)",
      "Using Pro for trivial tasks (5-10x slower, higher cost)",
      "Mixing XML and Markdown inconsistently"
    ],
    structureTemplate: `# Role
You are [specific persona]. Your expertise is in [domain].

# Core Mission
[One sentence objective]

# Constraints & Scope (CRITICAL)
- **Scope Discipline:** Do NOT suggest architectural rewrites unless critical. Focus ONLY on [specific focus].
- **Verbosity:** Keep findings concise. Use bullet points. No conversational filler.
- **Reasoning:** Use [High/Medium/Low] Reasoning Effort.
- **Tool Use:** Before calling a tool, state the specific action you are taking.
- **Output:** Do not narrate the process. Output only the final result.

# Output Format
[JSON schema or structure specification]

# Context
[Background information, documents, or data]

# Task
[Specific request with clear success criteria]`
  },
  gemini: {
    name: "Gemini 3",
    models: ["Pro", "Flash", "Deep Think"],
    contextWindow: "1M input, 64K output",
    maxOutput: "64K tokens",
    lastUpdated: "December 2025",
    knowledgeCutoff: "January 2025",
    source: "https://ai.google.dev/gemini-api/docs/gemini-3",
    bestPractices: [
      {
        rule: "Be Precise and Direct",
        description: "Gemini 3 favours directness over persuasion. Reduce prompt verbosity by 30-50% from Gemini 2.5 era. State your goal clearly and concisely. Avoid unnecessary or elaborate language.",
        example: "Instead of 'Could you perhaps provide a detailed analysis...', say 'Analyse the Q3 project report. Focus on budget variance and timeline delays. Output as 5 bullet points.'"
      },
      {
        rule: "Control Thinking with thinkingLevel Parameter",
        description: "Use the API parameter instead of prompting for step-by-step reasoning. Flash supports minimal/low/medium/high. Pro supports low/high. Requests like 'think step by step' are redundant and may confuse the model."
      },
      {
        rule: "Put Context First, Instructions Last",
        description: "When providing large context, place your question/instruction at the END with an anchor phrase: 'Based on the information above...' Recency bias means the model prioritises the most recent tokens.",
        example: "[All context/documents/data here]\n\nBased on the information above, [your specific question or task]."
      },
      {
        rule: "Use Consistent Delimiters",
        description: "Choose ONE format (XML tags OR Markdown headings) and use it consistently. Never mix. Inconsistent formatting confuses pattern matching and breaks output structure."
      },
      {
        rule: "Use 'Vibe Coding' for Visual Tasks",
        description: "Instead of verbose CSS/design descriptions, provide a screenshot, sketch, or video alongside a brief text prompt. Gemini 3 synthesises visual 'vibe' more accurately from pixels than from text."
      },
      {
        rule: "Keep Temperature at 1.0 (CRITICAL)",
        description: "Do NOT change temperature from default 1.0. Lowering it causes repetitive loops, degraded performance, or the model getting stuck. Use thinkingLevel to control reasoning determinism instead."
      },
      {
        rule: "Use Thought Signatures in Multi-Turn",
        description: "When Gemini 3 returns a thoughtSignature, pass it back in subsequent turns. Stripping signatures resets the chain-of-thought and breaks reasoning continuity."
      },
      {
        rule: "Request Verbosity Explicitly",
        description: "Gemini 3 defaults to terse, efficient answers. If you need more detail, explicitly request it: 'Provide a comprehensive explanation with examples.'"
      }
    ],
    formattingPreferences: [
      "Default output is very concise/terse - request detail if needed",
      "Use XML OR Markdown consistently, never mix",
      "Place context before instructions with anchor phrase",
      "Few-shot examples must have identical structure"
    ],
    antiPatterns: [
      "Changing temperature below 1.0 (CRITICAL - causes loops and degraded performance)",
      "Mixing XML and Markdown delimiters in the same prompt",
      "Putting instructions before large context blocks",
      "Using anti-pattern examples (showing what NOT to do)",
      "Overly verbose prompts from Gemini 2.5 era",
      "Ignoring thoughtSignature in multi-turn function calling",
      "Manual chain-of-thought prompting (use thinkingLevel parameter)"
    ],
    structureTemplate: `<role>
You are Gemini 3, a specialised assistant for [domain].
You are precise, analytical, and persistent.
</role>

<instructions>
1. **Plan**: Analyse the task and create a step-by-step plan.
2. **Execute**: Carry out the plan. If using tools, reflect before every call.
3. **Validate**: Review your output against the user's task.
4. **Format**: Present the final answer in the requested structure.
</instructions>

<constraints>
- Verbosity: [Low/Medium/High]
- Tone: [Formal/Casual/Technical]
- Grounding: Answer ONLY based on provided context.
</constraints>

<output_format>
1. **Executive Summary**: [2 sentence overview]
2. **Detailed Response**: [The main content]
</output_format>

<context>
[Insert relevant documents, code snippets, or background info]
</context>

<task>
[Specific request with clear success criteria]
</task>

Based on the information above, [restate specific ask].`
  },
  copilot: {
    name: "Microsoft Copilot",
    models: ["GPT-5.2 (primary)", "GPT-5 (default)", "GPT-4.1 (fallback)"],
    contextWindow: "Varies by product",
    lastUpdated: "December 2025",
    source: "https://support.microsoft.com/en-us/topic/learn-about-copilot-prompts",
    bestPractices: [
      {
        rule: "Use the GCES Framework",
        description: "Include Goal (what you want), Context (why you need it), Expectations (format/tone/length), Source (specific files/data). Omitting components leads to generic, less useful responses.",
        example: "Goal: Draft a one-page executive summary of Project Alpha.\nContext: This is for the steering committee meeting on Friday.\nExpectations: Use bullet points, formal tone, highlight 3 achievements and 2 risks.\nSource: Use the Project Alpha status report in SharePoint."
      },
      {
        rule: "Put Important Instructions Last",
        description: "Later parts of a prompt are emphasised more than earlier parts. Place your most critical instruction or source reference last due to Copilot's attention mechanisms."
      },
      {
        rule: "Use Positive Instructions",
        description: "Tell Copilot what TO do, not what NOT to do. Copilot is built to take action. Positive framing is more effective than prohibitions.",
        example: "Instead of 'Don't include jargon', say 'Use plain language suitable for a general audience.'"
      },
      {
        rule: "Use If/Then Conditional Logic",
        description: "For complex tasks with branching logic, be explicit with conditions. Conditional logic is clearer than narrative instructions.",
        example: "If the deal value exceeds $100K, flag for VP approval. If between $50-100K, assign to senior account manager. If below $50K, route to standard sales process."
      },
      {
        rule: "Define Ambiguous Terms",
        description: "If you use 'recent', 'significant', 'key', or similar terms, define them precisely. Vague terms produce vague results.",
        example: "Instead of 'Show me recent important emails', say 'Show me emails from the past 5 business days marked as high priority or from my direct reports.'"
      },
      {
        rule: "Iterate and Refine",
        description: "Treat Copilot's first response as a draft. Follow up with refinements. The second or third turn is often significantly higher quality."
      },
      {
        rule: "Explicitly Reference Data Sources",
        description: "Don't assume Copilot knows which files to use. Reference specific files with the / command. Without explicit sources, Copilot might search the web instead of your proprietary data."
      },
      {
        rule: "Match Tone in Your Prompt",
        description: "Copilot mirrors the tone of your prompt. Formal prompts get formal output; conversational prompts get conversational responses."
      }
    ],
    formattingPreferences: [
      "Use the / command to reference files and people in M365",
      "Limit file references to the most relevant 20",
      "Specify output language for Azure (YAML, CLI script, Kusto query)",
      "Iterate through conversation for best results"
    ],
    antiPatterns: [
      "Vague prompts without context ('Show me some customer info')",
      "Generic 'catch up' prompts ('What did I miss?')",
      "Asking for reports without referencing specific files",
      "Conflicting instructions ('Always wait for approval' + 'If urgent, send immediately')",
      "Over-complex single prompts (break into separate requests)",
      "Third-person references ('The model should...') - address Copilot directly",
      "Not reviewing output (always verify for hallucinations)"
    ],
    structureTemplate: `**Goal:**
[Action verb] [specific artifact]
Example: Draft a sales email to prospective clients

**Context:**
[Why you need this and how you'll use it]
Example: We are targeting CIOs in retail who are concerned about security.

**Source:**
[Where Copilot should get data - use / command]
Example: Use the key points from /ProductLaunch.pptx and pricing in /Q3_PriceList.xlsx

**Expectations:**
[Format, tone, audience, length]
Example: Keep it under 200 words. Use a persuasive, confident tone. End with a call to action.

**Additional Details:**
[Any special rules or constraints]`
  }
};

// Universal patterns that apply across all vendors
export const UNIVERSAL_PATTERNS = {
  bestPractices: [
    "Be specific and explicit - vague prompts produce vague results",
    "Provide context - explain why and for whom",
    "Specify output format - length, structure, tone",
    "Use positive instructions - say what TO do, not what NOT to do",
    "Use examples carefully - 3-5 diverse, high-quality examples",
    "Iterate - refine prompts based on results"
  ],
  antiPatterns: [
    "Vague instructions without specifics",
    "Negative constraints ('Don't do X') - use positive framing",
    "Contradictory requirements in the same prompt",
    "Mixing formatting styles inconsistently",
    "Assuming implicit understanding - be explicit",
    "Over-prompting with redundant instructions",
    "Legacy chain-of-thought prompts for models with built-in reasoning"
  ]
};

// Cross-vendor comparison data
export const VENDOR_COMPARISON = {
  reasoningControl: {
    claude: "Extended thinking / Effort parameter (low/medium/high)",
    gpt: "reasoning_effort (none/minimal/low/medium/high/xhigh)",
    gemini: "thinkingLevel (minimal/low/medium/high)",
    copilot: "Mode selection (Smart/Quick)"
  },
  contextOrdering: {
    claude: "Documents first, instructions at end",
    gpt: "Flexible, use long-context handling for 10K+ tokens",
    gemini: "Context FIRST, question/instruction LAST (critical)",
    copilot: "Source references LAST (emphasised more)"
  },
  temperatureSensitivity: {
    claude: "Adjustable",
    gpt: "Keep at 1.0 for complex tasks",
    gemini: "CRITICAL: Keep at 1.0 (lowering causes degradation)",
    copilot: "N/A (managed by system)"
  },
  defaultVerbosity: {
    claude: "Moderate-Low",
    gpt: "Low",
    gemini: "Very Low (terse)",
    copilot: "Varies by app"
  }
};

// Format guidance for use in prompt analysis
export function formatGuidanceForAnalysis(vendor) {
  const guidance = GUIDANCE[vendor];
  if (!guidance) return null;
  
  let formatted = `# ${guidance.name} Prompting Guidance\n\n`;
  formatted += `**Models:** ${guidance.models.join(", ")}\n`;
  formatted += `**Context Window:** ${guidance.contextWindow}\n`;
  formatted += `**Last Updated:** ${guidance.lastUpdated}\n`;
  if (guidance.knowledgeCutoff) {
    formatted += `**Knowledge Cutoff:** ${guidance.knowledgeCutoff}\n`;
  }
  formatted += `**Source:** ${guidance.source}\n\n`;
  
  formatted += `## Best Practices\n\n`;
  guidance.bestPractices.forEach((practice, index) => {
    formatted += `${index + 1}. **${practice.rule}**\n`;
    formatted += `   ${practice.description}\n`;
    if (practice.example) {
      formatted += `   Example: ${practice.example}\n`;
    }
    formatted += `\n`;
  });
  
  formatted += `## Anti-Patterns to Avoid\n\n`;
  guidance.antiPatterns.forEach(pattern => {
    formatted += `- ${pattern}\n`;
  });
  
  formatted += `\n## Formatting Preferences\n\n`;
  guidance.formattingPreferences.forEach(pref => {
    formatted += `- ${pref}\n`;
  });
  
  formatted += `\n## Recommended Structure Template\n\n`;
  formatted += "```\n" + guidance.structureTemplate + "\n```\n";
  
  return formatted;
}

// Get all guidance formatted for analysis
export function getAllGuidanceForAnalysis() {
  return Object.keys(GUIDANCE).map(vendor => formatGuidanceForAnalysis(vendor)).join("\n\n---\n\n");
}

// Check a prompt against vendor-specific anti-patterns
export function checkAntiPatterns(prompt, vendor) {
  const issues = [];
  const guidance = GUIDANCE[vendor];
  if (!guidance) return issues;
  
  const promptLower = prompt.toLowerCase();
  
  // Check for negative constraints
  if (promptLower.includes("don't") || promptLower.includes("do not") || promptLower.includes("avoid") || promptLower.includes("never")) {
    issues.push({
      type: "negative-constraint",
      message: "Consider using positive instructions instead of negative constraints",
      suggestion: "Rephrase 'Don't do X' as 'Do Y instead'"
    });
  }
  
  // Vendor-specific checks
  if (vendor === "gemini" && promptLower.includes("think step by step")) {
    issues.push({
      type: "redundant-cot",
      message: "Gemini 3 has built-in reasoning. 'Think step by step' is redundant.",
      suggestion: "Use the thinkingLevel parameter instead"
    });
  }
  
  if (vendor === "gpt" && promptLower.includes("think step by step")) {
    issues.push({
      type: "redundant-cot",
      message: "GPT-5.2 Thinking mode has built-in chain-of-thought. This instruction is redundant.",
      suggestion: "Use the reasoning_effort parameter instead"
    });
  }
  
  if (vendor === "copilot" && !prompt.includes("/") && (promptLower.includes("file") || promptLower.includes("document") || promptLower.includes("report"))) {
    issues.push({
      type: "missing-source",
      message: "Consider explicitly referencing files with the / command",
      suggestion: "Use /filename to reference specific files"
    });
  }
  
  return issues;
}

export default GUIDANCE;
