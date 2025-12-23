'use client';

import { useState } from 'react';
import { GUIDANCE } from '@/lib/guidance';

export default function Home() {
  // Entry mode: 'idea' or 'prompt'
  const [entryMode, setEntryMode] = useState(null);
  
  // Phase: 'input' -> 'critique' -> 'result'
  const [phase, setPhase] = useState('input');
  
  // Model selection
  const [selectedVendor, setSelectedVendor] = useState('claude');
  const [selectedModel, setSelectedModel] = useState('Sonnet 4.5');
  
  // Content
  const [inputText, setInputText] = useState('');
  const [problemContext, setProblemContext] = useState('');
  const [showProblemContext, setShowProblemContext] = useState(false);
  const [critique, setCritique] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isImplementingSuggestions, setIsImplementingSuggestions] = useState(false);

  const vendors = Object.keys(GUIDANCE);
  const currentGuidance = GUIDANCE[selectedVendor];

  const handleVendorChange = (vendor) => {
    if (phase === 'result') {
      regenerateForModel(vendor, GUIDANCE[vendor].models[0]);
    } else if (phase === 'input') {
      setSelectedVendor(vendor);
      setSelectedModel(GUIDANCE[vendor].models[0]);
    }
  };

  const handleModelChange = (model) => {
    if (phase === 'result') {
      regenerateForModel(selectedVendor, model);
    } else {
      setSelectedModel(model);
    }
  };

  const resetToStart = () => {
    setPhase('input');
    setEntryMode(null);
    setCritique(null);
    setAnswers({});
    setResult(null);
    setError('');
    setProblemContext('');
    setShowProblemContext(false);
    setRetryCount(0);
  };

  const handleInputChange = (text) => {
    setInputText(text);
    if (phase !== 'input') {
      setPhase('input');
      setCritique(null);
      setAnswers({});
      setResult(null);
    }
  };

  // Phase 1: Get critique
  const runCritique = async () => {
    if (!inputText.trim() || inputText.trim().length < 5) {
      setError('Please provide more detail.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'critique',
          vendor: selectedVendor,
          model: selectedModel,
          inputText: inputText.trim(),
          entryMode,
          problemContext: problemContext.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setCritique(data);
      setAnswers({});
      setPhase('critique');
      setRetryCount(0);

    } catch (err) {
      setError(err.message);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2: Generate with answers
  const runGenerate = async () => {
    setIsLoading(true);
    setError('');

    const answeredQuestions = critique?.questions?.filter(q => answers[q.id]?.trim()) || [];
    let additionalContext = '';
    
    if (answeredQuestions.length > 0) {
      additionalContext = answeredQuestions
        .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
        .join('\n\n');
    }

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          vendor: selectedVendor,
          model: selectedModel,
          inputText: inputText.trim(),
          additionalContext,
          problemContext: problemContext.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);
      setPhase('result');
      setRetryCount(0);

    } catch (err) {
      setError(err.message);
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate for a different model
  const regenerateForModel = async (newVendor, newModel) => {
    setIsRegenerating(true);
    setSelectedVendor(newVendor);
    setSelectedModel(newModel);
    setError('');

    const answeredQuestions = critique?.questions?.filter(q => answers[q.id]?.trim()) || [];
    let additionalContext = '';
    
    if (answeredQuestions.length > 0) {
      additionalContext = answeredQuestions
        .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
        .join('\n\n');
    }

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          vendor: newVendor,
          model: newModel,
          inputText: inputText.trim(),
          additionalContext,
          problemContext: problemContext.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Implement suggestions
  const implementSuggestions = async () => {
    if (!result?.suggestions || result.suggestions.length === 0) return;

    setIsImplementingSuggestions(true);
    setError('');

    const answeredQuestions = critique?.questions?.filter(q => answers[q.id]?.trim()) || [];
    let additionalContext = '';

    if (answeredQuestions.length > 0) {
      additionalContext = answeredQuestions
        .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
        .join('\n\n');
    }

    // Add suggestions as additional instructions
    const suggestionsContext = `\n\nPlease also implement these improvements:\n${result.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    additionalContext += suggestionsContext;

    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          vendor: selectedVendor,
          model: selectedModel,
          inputText: inputText.trim(),
          additionalContext,
          problemContext: problemContext.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsImplementingSuggestions(false);
    }
  };

  const updateAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const answeredCount = critique?.questions?.filter(q => answers[q.id]?.trim()).length || 0;
  const totalQuestions = critique?.questions?.length || 0;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Prompt Optimiser</h1>
          <p className="text-slate-400 text-sm">
            {phase === 'input' && !entryMode && "Build better prompts through the right questions."}
            {phase === 'input' && entryMode === 'idea' && "Describe what you want to achieve."}
            {phase === 'input' && entryMode === 'prompt' && "Paste your prompt for assessment."}
            {phase === 'critique' && "Answer the questions that matter. Skip the rest."}
            {phase === 'result' && "Your prompt is ready. Switch models to see it adapted."}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {['input', 'critique', 'result'].map((p, i) => (
            <div key={p} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                phase === p ? 'bg-blue-600 text-white' :
                ['input', 'critique', 'result'].indexOf(phase) > i ? 'bg-green-600 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {['input', 'critique', 'result'].indexOf(phase) > i ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div className={`w-8 md:w-12 h-0.5 transition-colors ${
                  ['input', 'critique', 'result'].indexOf(phase) > i ? 'bg-green-600' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
          <span className="text-sm text-slate-500 ml-2">
            {phase === 'input' && (entryMode ? (entryMode === 'idea' ? 'Describe idea' : 'Paste prompt') : 'Choose entry')}
            {phase === 'critique' && 'Answer questions'}
            {phase === 'result' && 'Done'}
          </span>
        </div>

        {/* Model Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Target Model
              {phase === 'result' && <span className="text-blue-400 ml-2 text-xs">(click to adapt)</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {vendors.map(vendor => (
                <button
                  key={vendor}
                  onClick={() => handleVendorChange(vendor)}
                  disabled={phase === 'critique' || isRegenerating}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedVendor === vendor
                      ? 'bg-blue-600 text-white'
                      : phase === 'critique'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${isRegenerating ? 'opacity-50' : ''}`}
                >
                  {GUIDANCE[vendor].name}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Variant
            </label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={phase === 'critique' || isRegenerating}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentGuidance.models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Entry Mode Selection */}
        {phase === 'input' && !entryMode && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">How would you like to start?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setEntryMode('idea')}
                className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-blue-500 transition-all text-left"
              >
                <div className="text-2xl mb-2">💡</div>
                <h3 className="text-white font-semibold mb-1">Start with an idea</h3>
                <p className="text-slate-400 text-sm">Describe what you want to achieve and we'll build the prompt together.</p>
              </button>
              <button
                onClick={() => setEntryMode('prompt')}
                className="p-6 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 hover:border-blue-500 transition-all text-left"
              >
                <div className="text-2xl mb-2">📝</div>
                <h3 className="text-white font-semibold mb-1">Assess my prompt</h3>
                <p className="text-slate-400 text-sm">Paste an existing prompt for critique and improvement.</p>
              </button>
            </div>
          </div>
        )}

        {/* Phase 1: Input */}
        {(phase === 'input' && entryMode) && (
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                {entryMode === 'idea' ? 'Your Idea' : 'Your Prompt'}
              </h2>
              <button
                onClick={() => setEntryMode(null)}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Change
              </button>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={entryMode === 'idea' 
                ? "Describe what you want to achieve...\n\nExample: Write an email to my team about the project delay. Need to explain why it happened without throwing anyone under the bus, and give a realistic new timeline."
                : "Paste your existing prompt here...\n\nWe'll assess it for gaps, unclear intent, missing constraints, and other issues before helping you improve it."
              }
              className="w-full h-40 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />

            {/* Optional "what's not working" for assess mode */}
            {entryMode === 'prompt' && (
              <div className="mt-4">
                {!showProblemContext ? (
                  <button
                    onClick={() => setShowProblemContext(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    <span>+</span> Add context: what's not working? (optional)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-slate-300">What's not working?</label>
                      <button
                        onClick={() => {
                          setShowProblemContext(false);
                          setProblemContext('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={problemContext}
                      onChange={(e) => setProblemContext(e.target.value)}
                      placeholder="Tell us what's going wrong...

Examples:
• It keeps giving me bullet points when I want prose
• The tone is too formal / too casual
• It misses the main point and focuses on the wrong things
• I've tried adding examples but it ignores them
• The responses are too long / too short"
                      className="w-full h-28 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    />
                    <p className="text-xs text-slate-500">This helps us ask better questions and avoid suggesting things you've already tried.</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={runCritique}
              disabled={isLoading || !inputText.trim()}
              className={`mt-4 w-full py-3 rounded-lg font-semibold transition-colors ${
                isLoading || !inputText.trim()
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Analysing...
                </span>
              ) : (entryMode === 'idea' ? 'Analyse Idea' : 'Assess Prompt')}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
                {retryCount > 0 && retryCount < 3 && (
                  <button
                    onClick={runCritique}
                    className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Show input summary in later phases */}
        {(phase === 'critique' || phase === 'result') && (
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                {entryMode === 'idea' ? 'Your Idea' : 'Your Prompt'}
              </h2>
              <button
                onClick={resetToStart}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Start Over
              </button>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3 text-slate-300 text-sm">
              {inputText}
            </div>
            {problemContext && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1">What's not working:</p>
                <div className="bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-2 text-amber-200/80 text-sm">
                  {problemContext}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Critique & Questions */}
        {(phase === 'critique' || phase === 'result') && critique && (
          <div className="bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Questions</h2>
            
            {critique.overallAssessment && (
              <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-amber-200 text-sm">{critique.overallAssessment}</p>
              </div>
            )}

            {critique.concerns && critique.concerns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-red-400 mb-2">Concerns</h3>
                <ul className="space-y-2">
                  {critique.concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">⚠</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {critique.questions?.map((q, i) => (
                <div key={q.id} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{q.question}</p>
                      <p className="text-slate-400 text-xs mt-1">{q.why}</p>
                    </div>
                  </div>
                  {phase === 'critique' ? (
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={(e) => updateAnswer(q.id, e.target.value)}
                      placeholder="Your answer (optional)"
                      className="w-full mt-3 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      rows={2}
                    />
                  ) : answers[q.id]?.trim() ? (
                    <div className="mt-3 bg-slate-700 rounded-lg px-3 py-2 text-sm text-green-300">
                      {answers[q.id]}
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-500 italic">
                      Skipped
                    </div>
                  )}
                </div>
              ))}
            </div>

            {phase === 'critique' && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {answeredCount} of {totalQuestions} answered
                  </span>
                  <span className="text-xs text-slate-500">
                    Skip any that aren't relevant
                  </span>
                </div>
                
                <button
                  onClick={runGenerate}
                  disabled={isLoading}
                  className={`mt-4 w-full py-3 rounded-lg font-semibold transition-colors ${
                    isLoading
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-500'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Generating...
                    </span>
                  ) : 'Generate Prompt'}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                    {retryCount > 0 && retryCount < 3 && (
                      <button
                        onClick={runGenerate}
                        className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                      >
                        Try again
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Phase 3: Result */}
        {phase === 'result' && result && (
          <div className={`bg-slate-800 rounded-xl p-4 md:p-6 border border-slate-700 ${isRegenerating ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">Your Prompt</h2>
                {isRegenerating && (
                  <span className="flex items-center gap-2 text-sm text-blue-400">
                    <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                    Adapting for {GUIDANCE[selectedVendor].name}...
                  </span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(result.generatedPrompt)}
                disabled={isRegenerating}
                className="text-sm text-blue-400 hover:text-blue-300 px-3 py-1 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Copy
              </button>
            </div>
            
            <div className="bg-slate-900 rounded-lg px-4 py-4 text-white font-mono text-sm whitespace-pre-wrap max-h-80 overflow-y-auto border border-slate-700">
              {result.generatedPrompt}
            </div>

            {result.summary && (
              <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300 text-sm">{result.summary}</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {result.assumptions && result.assumptions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-yellow-400 mb-3">Assumptions made</h3>
                <div className="space-y-2">
                  {result.assumptions.map((a, i) => (
                    <div key={i} className="bg-slate-700/30 rounded p-3">
                      <p className="text-yellow-300 text-sm">⚡ {a.assumption}</p>
                      <p className="text-slate-500 text-xs mt-1">{a.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.structure && result.structure.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Prompt structure</h3>
                <div className="grid gap-2">
                  {result.structure.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-green-400 font-mono">{s.section}</span>
                      <span className="text-slate-500">{s.purpose}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Further improvements</h3>
                <ul className="text-sm text-slate-400 space-y-1 mb-3">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-500">•</span> {s}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={implementSuggestions}
                  disabled={isImplementingSuggestions || isRegenerating}
                  className={`w-full py-2 rounded-lg font-medium transition-colors text-sm ${
                    isImplementingSuggestions || isRegenerating
                      ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isImplementingSuggestions ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Implementing suggestions...
                    </span>
                  ) : (
                    '✨ Implement these suggestions for me'
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setInputText('');
                resetToStart();
              }}
              disabled={isRegenerating}
              className="mt-6 w-full py-2 rounded-lg font-medium text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-50"
            >
              Start New Prompt
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-xs">
          Optimised for {currentGuidance.name} | Guidance updated {currentGuidance.lastUpdated}
        </div>
      </div>
    </div>
  );
}
