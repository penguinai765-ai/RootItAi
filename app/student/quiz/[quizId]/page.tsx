"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
// NEW: Import a dedicated service for the quiz API calls


import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import AnswerOptions from '@/components/quiz/AnswerOptions';
import QuizProgress from '@/components/quiz/QuizProgress';
import FeedbackDisplay from '@/components/quiz/FeedbackDisplay';
import Button from '@/components/Button';
import LoadingLottie from "@/components/LoadingLottie";
import LoadingFilesLottie from "@/components/LoadingFilesLottie";
import LoadingQuizLottie from "@/components/LoadingQuizLottie";
import Link from "next/link";
import { Home, BarChart3, User } from 'lucide-react';
import SandyLoadingLottie from '@/components/SandyLoadingLottie';
import Player from "lottie-react";
import fluidLoadingLottie from "@/components/assets/fluidloading.json";
import YayJumpLottie from '@/components/assets/Yay Jump.json';

// Remove fixed TOTAL_QUESTIONS
// This is a new service file that will abstract the API calls
// I will create it in the next step.
const quizApiService = {
  startQuiz: async (studentId: string, quizId: string) => {
    const res = await fetch('/api/quiz-session', { method: 'POST', body: JSON.stringify({ action: 'initialize', studentId, assignedQuizId: quizId }) });
    return res.json();
  },
  evaluateAnswer: async (currentQuestion: any, studentAnswer: string) => {
    const res = await fetch('/api/quiz-session', { method: 'POST', body: JSON.stringify({ action: 'evaluate', currentQuestion, studentAnswer }) });
    return res.json();
  },
  getNextQuestion: async (sessionData: any, questionNumber: number, previousAnswers: any[]) => {
    const res = await fetch('/api/quiz-session', { method: 'POST', body: JSON.stringify({ action: 'next', sessionData, questionNumber, previousAnswers }) });
    return res.json();
  },
  completeQuiz: async (studentId: string, quizId: string, sessionData: any, previousAnswers: any[]) => {
    const res = await fetch('/api/quiz-session', { method: 'POST', body: JSON.stringify({ action: 'complete', studentId, assignedQuizId: quizId, sessionData, previousAnswers }) });
    return res.json();
  }
};

const MAX_QUESTIONS = 15;

const QuizPage = () => {
  const { quizId } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [sessionData, setSessionData] = useState<any>(null);
  const [currentQuestionObject, setCurrentQuestionObject] = useState<any>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [previousAnswers, setPreviousAnswers] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null); // NEW: To store evaluation result
  const [quizComplete, setQuizComplete] = useState(false);
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [isNextQuestionLoading, setIsNextQuestionLoading] = useState(false);

  // Retry/hint/confidence state
  const [isRetry, setIsRetry] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);
  const [pendingConfidence, setPendingConfidence] = useState<{ index: number, asked: boolean } | null>(null);
  const [pendingAnswerData, setPendingAnswerData] = useState<any>(null);

  // New state for incorrect feedback
  const [showIncorrect, setShowIncorrect] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  // Track first and second attempt answers for each question
  const [firstAttempt, setFirstAttempt] = useState<{ studentAnswer: any; isCorrect: boolean } | null>(null);

  // Track if we need to show the correct answer after confidence modal
  const [pendingShowCorrectAnswer, setPendingShowCorrectAnswer] = useState(false);

  // Track feedback type for option coloring and messages
  const [answerFeedbackType, setAnswerFeedbackType] = useState<'none' | 'correct' | 'incorrect' | 'final'>('none');

  // Track feedback card visibility
  const [showFeedbackCard, setShowFeedbackCard] = useState(false);

  // Track the last question text to detect real question changes
  const [lastQuestionText, setLastQuestionText] = useState("");

  const answerStartTime = useRef<number>(Date.now());
  // Use a ref to always accumulate all answers, even across confidence modal
  const allAnswersRef = useRef<any[]>([]);

  // State for confidence slider
  const [confidenceValue, setConfidenceValue] = useState(50);

  useEffect(() => {
    if (user && quizId) {
      const initialize = async () => {
        try {
          const { question, sessionData } = await quizApiService.startQuiz(user.uid, quizId as string);
          setSessionData(sessionData);
          setCurrentQuestionObject(question);
          answerStartTime.current = Date.now();
        } catch (err: any) { setError(err.message); }
        finally { setIsLoading(false); }
      };
      initialize();
    }
  }, [user, quizId]);

  // Accept string | number for AnswerOptions compatibility, but only use number for MCQ
  const handleSelectAnswer = (answer: string | number) => {
    if (!isSubmitted && typeof answer === 'number') {
      setSelectedOption(answer);
      setAnswerFeedbackType('none'); // Reset feedback type on new selection
    }
  };
  const handleShortAnswerChange = (val: string) => {
    if (!isSubmitted) {
      setShortAnswer(val);
      setAnswerFeedbackType('none'); // Reset feedback type on new input
    }
  };

  // Helper to call hint API (now using /api/quiz-session)
  const fetchHint = async (question: any, studentAnswer: string) => {
    setIsHintLoading(true);
    setHint(null);
    try {
      const res = await fetch('/api/quiz-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hint', question: question.question, studentAnswer, context: sessionData?.subtopicContent })
      });
      const data = await res.json();
      setHint(data.hint || 'No hint available.');
    } catch {
      setHint('No hint available.');
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    let studentAnswer;
    if (currentQuestionObject.type === 'mcq') {
      if (selectedOption === null) return;
      studentAnswer = currentQuestionObject.options[selectedOption];
    } else {
      if (!shortAnswer.trim()) return;
      studentAnswer = shortAnswer.trim();
    }
    setIsLoading(true);
    try {
      const { evaluation } = await quizApiService.evaluateAnswer(currentQuestionObject, studentAnswer);
      console.log('Evaluation after submit:', evaluation); // Debug log
      setEvaluation(evaluation); // Always set evaluation here and do not reset until next question
      const responseTime = (Date.now() - answerStartTime.current) / 1000;
      if (!evaluation.isCorrect && !isRetry && !firstAttempt) {
        setFirstAttempt({ studentAnswer, isCorrect: false });
        setShowIncorrect(true);
        setIsRetry(true);
        await fetchHint(currentQuestionObject, studentAnswer);
        setSelectedOption(null);
        setShortAnswer("");
        setIsLoading(false);
        setAnswerFeedbackType('incorrect');
        setShowFeedbackCard(false); // Hide feedback card on first incorrect
        return;
      }
      // On retry (second attempt) or correct on first try
      setIsSubmitted(true);
      setShowFeedbackCard(true); // Always show feedback card after submission
      let answerData;
      let shouldShowCorrect = false;
      if (firstAttempt) {
        // This is the retry (second attempt)
        answerData = {
          question: currentQuestionObject.question, // Always include the actual question text
          studentAnswer, // second attempt answer
          correctAnswer: evaluation.correctAnswer,
          isCorrect: evaluation.isCorrect,
          cognitiveAnalysis: evaluation.cognitiveAnalysis,
          timestamp: Date.now(),
          hintShown: true,
          retryAttempted: true,
          firstAttemptCorrect: false,
          secondAttemptCorrect: evaluation.isCorrect,
          firstAttemptAnswer: firstAttempt.studentAnswer,
        };
        if (!evaluation.isCorrect) {
          shouldShowCorrect = true;
          setAnswerFeedbackType('final');
        } else {
          setAnswerFeedbackType('correct');
        }
      } else {
        // First attempt was correct
        answerData = {
          question: currentQuestionObject.question, // Always include the actual question text
          studentAnswer,
          correctAnswer: evaluation.correctAnswer,
          isCorrect: evaluation.isCorrect,
          cognitiveAnalysis: evaluation.cognitiveAnalysis,
          timestamp: Date.now(),
          hintShown: false,
          retryAttempted: false,
          firstAttemptCorrect: evaluation.isCorrect,
          secondAttemptCorrect: undefined,
        };
        setAnswerFeedbackType('correct');
      }
      // Always save the answer after the second attempt (or first if correct)
      let saveAnswer = () => {
        allAnswersRef.current = [...allAnswersRef.current, answerData];
        setPreviousAnswers([...allAnswersRef.current]);
        setIsRetry(false);
        setHint(null);
        setFirstAttempt(null);
        setShowCorrectAnswer(shouldShowCorrect);
        setPendingShowCorrectAnswer(false);
      };
      if (currentQuestionObject.requestConfidenceRating) {
        setPendingConfidence({ index: allAnswersRef.current.length, asked: true });
        setPendingAnswerData(answerData);
        setShowConfidenceModal(true);
        setPendingShowCorrectAnswer(shouldShowCorrect);
      } else {
        saveAnswer();
      }
      setShowIncorrect(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Confidence modal handler (slider version)
  const handleConfidenceSliderConfirm = () => {
    if (pendingConfidence && pendingAnswerData) {
      const answerWithConfidence = { ...pendingAnswerData, confidenceAsked: true, confidenceRating: confidenceValue };
      allAnswersRef.current = [...allAnswersRef.current, answerWithConfidence];
      setPreviousAnswers([...allAnswersRef.current]);
      setShowConfidenceModal(false);
      setPendingConfidence(null);
      setPendingAnswerData(null);
      setIsRetry(false);
      setHint(null);
      setFirstAttempt(null);
      setShowCorrectAnswer(pendingShowCorrectAnswer);
      setPendingShowCorrectAnswer(false);
      // Set feedback type for final state after confidence modal
      if (pendingShowCorrectAnswer) {
        setAnswerFeedbackType('final');
      } else {
        setAnswerFeedbackType('correct');
      }
      setConfidenceValue(50); // Reset slider for next use
    }
  };

  const handleNextQuestion = async () => {
    setIsNextQuestionLoading(true);
    setIsLoading(false);
    setIsSubmitted(false);
    setSelectedOption(null);
    setShortAnswer("");
    setIsRetry(false);
    setHint(null);
    setShowIncorrect(false);
    setShowCorrectAnswer(false);
    setFirstAttempt(null);
    setAnswerFeedbackType('none');
    setShowFeedbackCard(false); // Hide feedback card on next question
    // Only reset evaluation after the new question is loaded
    try {
      const { question, quizComplete: backendQuizComplete } = await quizApiService.getNextQuestion(sessionData, questionNumber + 1, previousAnswers);
      if (!question || backendQuizComplete) {
        setShowFinishButton(true);
        setIsNextQuestionLoading(false);
        return;
      }
      setCurrentQuestionObject(question);
      setQuestionNumber(questionNumber + 1);
      answerStartTime.current = Date.now();
      setEvaluation(null); // Reset evaluation only after new question is loaded
    } catch (err: any) { setError(err.message); }
    finally { setIsNextQuestionLoading(false); }
  };

  const handleFinishQuiz = async () => {
    setShowFinishButton(true); // Ensure animation is shown while saving
    setIsLoading(true);
    try {
      await quizApiService.completeQuiz(user!.uid, quizId as string, sessionData, previousAnswers);
      setQuizComplete(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (quizComplete) {
      const timer = setTimeout(() => {
        router.push('/student/dashboard');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [quizComplete, router]);

  useEffect(() => {
    // Only reset feedback card if the question text actually changes
    if (currentQuestionObject && currentQuestionObject.question !== lastQuestionText) {
      setShowFeedbackCard(false);
      setLastQuestionText(currentQuestionObject.question);
    }
  }, [currentQuestionObject, lastQuestionText]);

  // ... (JSX rendering logic remains largely the same, but will now use the 'evaluation' state)

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (isLoading && !currentQuestionObject) return <div className="p-4"><LoadingFilesLottie message="Loading Quiz..." /></div>;
  if (!currentQuestionObject) return <div className="p-4">Could not load quiz.</div>;
  if (quizComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold text-green-700 mb-4">🎉 Quiz Complete!</h2>
          <p className="text-lg text-gray-700 mb-2">Great job! You’ve finished your quiz.</p>
          <p className="text-md text-gray-500">You’ll be redirected to your dashboard in a moment...</p>
        </div>
      </div>
    );
  }

  // Show animation while saving result
  if (isLoading && showFinishButton) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-60 h-60 mb-6 mt-16 flex items-center justify-center">
          <Player
            autoplay
            loop
            animationData={YayJumpLottie}
            style={{ width: '50%', height: '50%' }}
            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
          />
        </div>
        <h2 className="text-lg font-bold text-purple-700 mb-2 text-center">Evaluating your answer. Please wait...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col items-center justify-start p-2 sm:p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl mt-4 mb-4 px-0 sm:px-0">
        <div className="px-4 pt-6 pb-2 flex flex-col gap-2">
          <QuizProgress currentQuestion={questionNumber} totalQuestions={MAX_QUESTIONS} />

          <QuestionDisplay question={currentQuestionObject.question} />
        </div>
        {/* Incorrect feedback and hint area */}
        {showIncorrect && isRetry && (
          <div className="flex flex-col items-center justify-center my-2 px-4">
            <div className="text-red-600 font-semibold mb-2 text-base">Incorrect. Try again with a hint!</div>
            {isHintLoading ? (
              <SandyLoadingLottie message="Generating a hint for you..." />
            ) : (
              <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-3 text-yellow-900 text-center w-full max-w-xs mx-auto text-sm shadow">
                <span className="font-semibold">Hint:</span> {hint}
              </div>
            )}
          </div>
        )}
        {/* Show LLM unavailable animation and message if LLM is down */}
        {evaluation && evaluation.llmUnavailable && (
          <div className="flex flex-col items-center justify-center my-8 px-4">
            <div className="w-40 h-40 mb-4">
              <Player
                autoplay
                loop
                animationData={YayJumpLottie}
                style={{ width: '100%', height: '100%' }}
                rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
              />
            </div>
            <p className="text-lg font-semibold text-center text-purple-700 mb-2">The quiz engine is temporarily unavailable.</p>
            <p className="text-gray-500 text-center">Please refresh the page to try again.</p>
          </div>
        )}
        {/* Feedback and explanation card always shown after submission, using showFeedbackCard */}
        {showFeedbackCard && evaluation && !evaluation.llmUnavailable && (
          <div className="flex flex-col items-center justify-center my-2 px-4">
            <div className={
              evaluation.isCorrect
                ? "bg-green-50 border border-green-300 rounded-xl p-3 text-green-900 text-center w-full max-w-xs mx-auto text-base shadow"
                : "bg-red-50 border border-red-300 rounded-xl p-3 text-red-900 text-center w-full max-w-xs mx-auto text-base shadow"
            }>
              {evaluation.isCorrect ? (
                <>
                  <p className="font-semibold">Congratulations! That’s correct.</p>
                  {evaluation.correctAnswer && (
                    <>
                      <p className="font-bold mt-2">Correct Answer:</p>
                      <p className="text-green-700 font-semibold">{evaluation.correctAnswer}</p>
                    </>
                  )}
                  {evaluation.feedback && (
                    <>
                      <p className="font-bold mt-2">Feedback:</p>
                      <p className="text-green-800 text-base">{evaluation.feedback}</p>
                    </>
                  )}
                  {evaluation.explanation && evaluation.explanation !== evaluation.feedback && (
                    <>
                      <p className="font-bold mt-2">Explanation:</p>
                      <p className="text-green-800 text-base">{evaluation.explanation}</p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold">That was incorrect.</p>
                  {evaluation.correctAnswer && (
                    <>
                      <p className="font-bold mt-2">Correct Answer:</p>
                      <p className="text-green-700 font-semibold">{evaluation.correctAnswer}</p>
                    </>
                  )}
                  {evaluation.feedback && (
                    <>
                      <p className="font-bold mt-2">Feedback:</p>
                      <p className="text-red-800 text-base">{evaluation.feedback}</p>
                    </>
                  )}
                  {evaluation.explanation && evaluation.explanation !== evaluation.feedback && (
                    <>
                      <p className="font-bold mt-2">Explanation:</p>
                      <p className="text-red-800 text-base">{evaluation.explanation}</p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {/* Only show options, submit, next, etc. if LLM is available */}
        {!evaluation?.llmUnavailable && (
          <>
            <div className="px-4 pb-4">
              <AnswerOptions
                type={currentQuestionObject.type}
                options={currentQuestionObject.options}
                onSelectAnswer={handleSelectAnswer}
                selectedOption={selectedOption}
                shortAnswer={shortAnswer}
                onShortAnswerChange={handleShortAnswerChange}
                isSubmitted={isSubmitted}
                correctAnswer={currentQuestionObject.correctAnswer}
                showAnswerReveal={showCorrectAnswer}
                feedbackType={answerFeedbackType}
              />
            </div>
            <div className="pt-2 pb-4 px-4 flex flex-col items-center gap-2">
              {isNextQuestionLoading ? (
                <LoadingQuizLottie message="Loading next question..." inline={true} />
              ) :
                !isSubmitted ? (
                  <div className="flex flex-row items-center justify-center gap-3 w-full">
                    {isLoading && !isHintLoading ? (
                      <div className="flex flex-row items-center justify-center w-full">
                        <div className="w-12 h-12 mx-auto">
                          <Player
                            autoplay
                            loop
                            animationData={fluidLoadingLottie}
                            style={{ width: '100%', height: '100%' }}
                            rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={handleSubmitAnswer}
                        disabled={
                          (currentQuestionObject.type === 'mcq' ? selectedOption === null : !shortAnswer.trim()) ||
                          (isRetry && isHintLoading) // Disable Retry with Hint while hint is loading
                        }
                        className="w-full py-3 text-base rounded-xl"
                      >
                        {isRetry ? (isHintLoading ? 'Generating Hint...' : 'Retry with Hint') : 'Submit Answer'}
                      </Button>
                    )}
                  </div>
                ) :
                  ((firstAttempt && isSubmitted) || (!firstAttempt && isSubmitted)) && (
                    questionNumber >= MAX_QUESTIONS ? (
                      <Button onClick={handleFinishQuiz} className="w-full py-3 text-base rounded-xl">
                        Finish Assessment & View Results
                      </Button>
                    ) : (
                      <Button onClick={handleNextQuestion} className="w-full py-3 text-base rounded-xl">
                        Next Question ({questionNumber + 1}/{MAX_QUESTIONS})
                      </Button>
                    )
                  )
              }
            </div>
          </>
        )}
      </div>
      {/* Confidence Modal (slider, mobile-friendly) */}
      {showConfidenceModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[95vw] max-w-xs flex flex-col items-center gap-4">
            <h3 className="text-lg sm:text-xl font-bold text-center mb-2 text-gray-900">How confident were you in your last answer?</h3>
            <div className="w-full flex flex-col items-center gap-2">
              <span className="text-xl font-semibold text-purple-700">{confidenceValue}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={confidenceValue}
                onChange={e => setConfidenceValue(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 rounded-lg appearance-none bg-gray-200"
              />
              <div className="flex w-full justify-between text-xs text-gray-400 font-medium mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <button
              onClick={handleConfidenceSliderConfirm}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl px-8 py-2 text-base shadow transition-all focus:outline-none focus:ring-2 focus:ring-purple-300 mt-2 w-full"
            >
              Confirm
            </button>
            <p className="text-gray-500 text-sm text-center mt-1">Your confidence helps us analyze your learning patterns!</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuizPage;
