'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GUIDANCE } from '@/lib/guidance';
import { ProgressIndicator, ModelSelector, QuestionCard, ResultDisplay } from './components';

// Helper to build additional context from answered questions
function buildAdditionalContext(critique, answers) {
  const answeredQuestions = critique?.questions?.filter(q => answers[q.id]?.trim()) || [];
  if (answeredQuestions.length === 0) return '';
  return answeredQuestions
    .map(q => `Q: ${q.question}\nA: ${answers[q.id]}`)
    .join('\n\n');
}

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

  // Memoized computed values
  const currentGuidance = useMemo(() => GUIDANCE[selectedVendor], [selectedVendor]);

  const answeredCount = useMemo(() =>
    critique?.questions?.filter(q => answers[q.id]?.trim()).length || 0,
    [critique?.questions, answers]
  );

  const totalQuestions = useMemo(() =>
    critique?.questions?.length || 0,
    [critique?.questions]
  );

  // Memoized callbacks to prevent unnecessary re-renders
  const resetToStart = useCallback(() => {
    setPhase('input');
    setEntryMode(null);
    setCritique(null);
    setAnswers({});
    setResult(null);
    setError('');
    setProblemContext('');
    setShowProblemContext(false);
    setRetryCount(0);
  }, []);

  // Debounce the heavy state reset when user types (clear critique/answers/result)
  const resetTimeoutRef = useRef(null);

  const handleInputChange = useCallback((text) => {
    // Immediate update for responsive typing
    setInputText(text);

    // Debounce the expensive state resets (300ms delay)
    if (phase !== 'input') {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        setPhase('input');
        setCritique(null);
        setAnswers({});
        setResult(null);
      }, 300);
    }
  }, [phase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const updateAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Phase 1: Get critique
  const runCritique = useCallback(async () => {
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
  }, [inputText, selectedVendor, selectedModel, entryMode, problemContext]);

  // Phase 2: Generate with answers
  const runGenerate = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const additionalContext = buildAdditionalContext(critique, answers);

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
  }, [critique, answers, selectedVendor, selectedModel, inputText, problemContext]);

  // Regenerate for a different model
  const regenerateForModel = useCallback(async (newVendor, newModel) => {
    setIsRegenerating(true);
    setSelectedVendor(newVendor);
    setSelectedModel(newModel);
    setError('');

    const additionalContext = buildAdditionalContext(critique, answers);

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
  }, [critique, answers, inputText, problemContext]);

  // Handler callbacks that depend on regenerateForModel
  const handleVendorChange = useCallback((vendor) => {
    if (phase === 'result') {
      regenerateForModel(vendor, GUIDANCE[vendor].models[0]);
    } else if (phase === 'input') {
      setSelectedVendor(vendor);
      setSelectedModel(GUIDANCE[vendor].models[0]);
    }
  }, [phase, regenerateForModel]);

  const handleModelChange = useCallback((model) => {
    if (phase === 'result') {
      regenerateForModel(selectedVendor, model);
    } else {
      setSelectedModel(model);
    }
  }, [phase, selectedVendor, regenerateForModel]);

  const handleStartNew = useCallback(() => {
    setInputText('');
    resetToStart();
  }, [resetToStart]);

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
        <ProgressIndicator phase={phase} entryMode={entryMode} />

        {/* Model Selection */}
        <ModelSelector
          selectedVendor={selectedVendor}
          selectedModel={selectedModel}
          phase={phase}
          isRegenerating={isRegenerating}
          onVendorChange={handleVendorChange}
          onModelChange={handleModelChange}
        />

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
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  answer={answers[q.id]}
                  isEditable={phase === 'critique'}
                  onAnswerChange={updateAnswer}
                />
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
          <ResultDisplay
            result={result}
            selectedVendor={selectedVendor}
            isRegenerating={isRegenerating}
            error={error}
            onCopy={copyToClipboard}
            onStartNew={handleStartNew}
          />
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-xs">
          Optimised for {currentGuidance.name} | Guidance updated {currentGuidance.lastUpdated}
        </div>
      </div>
    </div>
  );
}
