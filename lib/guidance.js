// Model guidance data - update these when vendors publish new documentation
// Source URLs are listed for each vendor

export const GUIDANCE = {
  claude: {
    name: "Claude",
    models: ["Opus 4.5", "Sonnet 4.5", "Haiku 4.5"],
    contextWindow: "200K tokens",
    lastUpdated: "December 2025",
    source: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview",
    bestPractices: [
      {
        rule: "Be Clear and Explicit",
        description: "Claude 4.x models respond well to clear, explicit instructions. Being specific about your desired output enhances results. Explicitly request 'above and beyond' behaviour if desired.",
        example: "Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation."
      },
      {
        rule: "Provide Context and Motivation",
        description: "Explaining *why* certain behaviour is important helps Claude 4.x models better understand and follow instructions."
      },
      {
        rule: "Use XML Tags for Structure",
        description: "Wrap different components in XML tags: <context> for background, <task> for the request, <examples> for samples, <constraints> for limitations, <output_format> for response structure."
      },
      {
        rule: "Use Examples (Few-Shot Prompting)",
        description: "Include 3-5 diverse, relevant examples wrapped in <example> tags to show Claude exactly what you want."
      },
      {
        rule: "Chain of Thought Prompting",
        description: "For complex tasks, include 'Think step-by-step' or use <thinking> and <answer> tags to separate reasoning from the final response."
      },
      {
        rule: "Prefill Claude's Response",
        description: "Start the assistant response to guide output format (e.g., 'Classification:' to force a specific structure)."
      },
      {
        rule: "Long Context Ordering",
        description: "Place long documents (20K+ tokens) at the TOP of your prompt. Put queries and instructions at the END."
      }
    ],
    formattingPreferences: [
      "Prefer minimal formatting unless explicitly requested",
      "Avoid excessive bold, headers, and bullet points",
      "Write in flowing prose with complete paragraphs",
      "Reserve markdown for inline code and code blocks"
    ],
    antiPatterns: [
      "Vague instructions without context",
      "Assuming Claude knows your specific requirements",
      "Over-prompting with redundant instructions",
      "Using examples that show what NOT to do (use positive examples instead)",
      "Mixing formatting styles inconsistently",
      "Asking to 'be creative' without direction",
      "Providing contradictory instructions",
      "Using negative framing ('Don't use jargon') instead of positive ('Use simple language')"
    ],
    structureTemplate: `<context>
[Background information here]
</context>

<task>
[Specific request here]
</task>

<constraints>
[Any limitations or requirements]
</constraints>

<output_format>
[Desired response structure]
</output_format>`
  },
  gpt: {
    name: "GPT-5.2",
    models: ["Instant", "Thinking", "Pro"],
    contextWindow: "400K input, 128K output",
    lastUpdated: "December 2025",
    knowledgeCutoff: "August 31, 2025",
    source: "https://platform.openai.com/docs/guides/latest-model",
    bestPractices: [
      {
        rule: "Control Verbosity Explicitly",
        description: "GPT-5.2 is more concise by default. Give clear length constraints: '3-6 sentences or ≤5 bullets for typical answers' or 'For simple yes/no questions: ≤2 sentences'."
      },
      {
        rule: "Prevent Scope Drift",
        description: "GPT-5.2 may produce more than requested. Explicitly state: 'Implement EXACTLY and ONLY what the user requests. No extra features, no added components, no UX embellishments.'"
      },
      {
        rule: "Long-Context Re-grounding",
        description: "For inputs longer than ~10K tokens, instruct the model to: produce a short internal outline, re-state user constraints before answering, and anchor claims to sections."
      },
      {
        rule: "Handle Ambiguity Explicitly",
        description: "Configure prompts to ask 1-3 clarifying questions OR present 2-3 plausible interpretations with labeled assumptions. Never fabricate exact figures when uncertain."
      },
      {
        rule: "High-Risk Self-Check",
        description: "For legal, financial, or safety-sensitive contexts, add verification steps to check for unstated assumptions and overly strong language."
      },
      {
        rule: "Tool-Calling Parallelism",
        description: "Parallelize independent tool calls (read_file, fetch_record, search_docs) when possible. After write operations, restate what changed and where."
      }
    ],
    formattingPreferences: [
      "Lower verbosity than predecessors - more concise by default",
      "Prefers compact bullets and short sections over long narrative paragraphs",
      "Do not rephrase the user's request unless it changes semantics"
    ],
    antiPatterns: [
      "Vague verbosity preferences (be specific about word/bullet counts)",
      "Allowing scope creep in code generation",
      "Assuming the model remembers earlier context in long documents",
      "Overly long narrative instructions",
      "Contradictory instructions in the same prompt",
      "Mixing XML and Markdown formatting inconsistently"
    ],
    reasoningEffort: ["none", "minimal", "low", "medium", "high", "xhigh (Pro only)"],
    structureTemplate: `<output_verbosity_spec>
- Default: [X] sentences or ≤[Y] bullets
- For simple questions: ≤2 sentences
</output_verbosity_spec>

<task>
[Specific request here]
</task>

<constraints>
- Implement EXACTLY and ONLY what is requested
- No extra features or embellishments
</constraints>`
  },
  gemini: {
    name: "Gemini 3",
    models: ["Pro", "Flash", "Deep Think"],
    contextWindow: "1M input, 64K output",
    lastUpdated: "December 2025",
    knowledgeCutoff: "January 2025",
    source: "https://ai.google.dev/gemini-api/docs/prompting-strategies",
    bestPractices: [
      {
        rule: "Be Precise and Direct",
        description: "Gemini 3 favours directness over persuasion and logic over verbosity. State your goal clearly and concisely. Avoid unnecessary or overly persuasive language."
      },
      {
        rule: "Use Consistent Structure",
        description: "Choose ONE format (XML-style tags OR Markdown headings) and use it consistently within a single prompt. Do NOT mix them."
      },
      {
        rule: "Define Parameters Explicitly",
        description: "Explicitly explain any ambiguous terms or parameters. Don't assume the model understands your specific context."
      },
      {
        rule: "Control Output Verbosity",
        description: "By default, Gemini 3 provides direct and efficient answers. If you need more detail, explicitly request it with: 'Verbosity: [Low/Medium/High]'."
      },
      {
        rule: "Flash-Specific: Current Day Accuracy",
        description: "For time-sensitive queries, add: 'For time-sensitive queries, follow the provided current time when formulating search queries. Remember it is 2025 this year.'"
      },
      {
        rule: "Grounding Performance",
        description: "For RAG applications, add: 'You are a strictly grounded assistant limited to the information provided. Rely ONLY on facts directly mentioned in context.'"
      },
      {
        rule: "Context-First Ordering",
        description: "For large inputs: Supply ALL context FIRST, place specific instructions at the very END, use a clear transition phrase like 'Based on the information above...'"
      }
    ],
    formattingPreferences: [
      "Direct and efficient by default",
      "Use XML-style tags OR Markdown headings, never mix",
      "Include Verbosity and Tone constraints in prompts"
    ],
    antiPatterns: [
      "Long, persuasive paragraphs (be direct instead)",
      "Mixing XML and Markdown formatting in the same prompt",
      "Changing temperature below 1.0 (causes looping or degraded performance)",
      "Assuming the model understands implicit requirements",
      "Vague instructions like 'make it better'",
      "Omitting output format specifications when precision matters",
      "Providing context AFTER your question (put context first)"
    ],
    thinkingLevels: ["minimal (Flash only)", "low", "high (Default)"],
    criticalNote: "DO NOT change temperature from default 1.0 for Gemini 3",
    structureTemplate: `<role>
You are [specific role/expertise].
</role>

<constraints>
- Verbosity: [Low/Medium/High]
- Tone: [Formal/Casual/Technical]
</constraints>

<context>
[Background information here]
</context>

<task>
[Specific request here]
</task>

<output_format>
[Desired response structure]
</output_format>`
  },
  copilot: {
    name: "Microsoft Copilot",
    models: ["GPT-5.2 (licensed)", "GPT-5 (standard)", "GPT-4.1 (fallback)"],
    lastUpdated: "December 2025",
    source: "https://learn.microsoft.com/en-us/copilot/overview",
    bestPractices: [
      {
        rule: "Four Elements Framework",
        description: "Include Goal (what you want), Context (why/for whom), Expectations (format/tone/length), and Source (specific files/data to reference)."
      },
      {
        rule: "Prompt Order Matters",
        description: "Later parts of a prompt are emphasised more than earlier parts. Put specific files or sources LAST if you want Copilot to prioritise them."
      },
      {
        rule: "Use Natural Language",
        description: "Write like you're talking to a colleague. Copilot prefers natural language over structured tags."
      },
      {
        rule: "Provide Context",
        description: "Mention the background or source: 'Based on my OneNote meeting notes from last Tuesday, create a follow-up task list.'"
      },
      {
        rule: "Request Tone and Style",
        description: "Copilot can adapt to match your voice: 'Write in a concise, professional tone with a hint of humor.'"
      },
      {
        rule: "Use Quotation Marks",
        description: "Help Copilot know what to modify or replace: 'Change \"Q3 targets\" to \"Q4 objectives\" throughout the document.'"
      },
      {
        rule: "Iterate and Refine",
        description: "If the first response isn't right, follow up with more specific instructions. Build on previous outputs."
      }
    ],
    formattingPreferences: [
      "Natural language preferred over structured tags",
      "Specify format explicitly (bullet points, paragraph, table)",
      "Later content in prompts is weighted more heavily"
    ],
    antiPatterns: [
      "Being vague without specifics",
      "Overcomplicating with too many requirements in one prompt",
      "Assuming Copilot has context from outside the current conversation",
      "Not specifying the source files or data to reference"
    ],
    appSpecificTips: {
      Word: "Select text and use 'Rewrite with Copilot'. Ask for specific formatting or tone adjustments.",
      Excel: "Describe the analysis you want. Specify column names and data types. Request formulas with explanations.",
      PowerPoint: "Focus on structure first, then content, then visuals. Specify slide count and audience.",
      Outlook: "Specify tone (formal/casual). Include key points to cover. Reference previous emails for context.",
      Teams: "Ask about specific meetings. Request action items or summaries. Reference chat history."
    },
    structureTemplate: `Goal: [What you want Copilot to do]

Context: [Why you need this, who the audience is]

Expectations: [Format, tone, length requirements]

Source: [Specific files, emails, or data to reference]`
  }
};

// Format guidance for API consumption
export function formatGuidanceForAnalysis(vendor) {
  const g = GUIDANCE[vendor];
  let formatted = `# ${g.name} Prompting Guide\n\n`;
  formatted += `## Context Window\n${g.contextWindow || 'Not specified'}\n\n`;
  
  formatted += `## Best Practices\n`;
  g.bestPractices.forEach((bp, i) => {
    formatted += `${i + 1}. **${bp.rule}**: ${bp.description}\n`;
    if (bp.example) {
      formatted += `   Example: ${bp.example}\n`;
    }
  });
  
  formatted += `\n## Formatting Preferences\n`;
  g.formattingPreferences.forEach(fp => {
    formatted += `- ${fp}\n`;
  });
  
  formatted += `\n## Anti-Patterns (Things to Avoid)\n`;
  g.antiPatterns.forEach(ap => {
    formatted += `- ${ap}\n`;
  });
  
  if (g.criticalNote) {
    formatted += `\n## Critical Note\n${g.criticalNote}\n`;
  }

  if (g.structureTemplate) {
    formatted += `\n## Recommended Structure Template\n\`\`\`\n${g.structureTemplate}\n\`\`\`\n`;
  }
  
  return formatted;
}
