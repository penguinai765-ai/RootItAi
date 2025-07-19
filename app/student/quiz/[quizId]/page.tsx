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

  const answerStartTime = useRef<number>(Date.now());

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
    if (!isSubmitted && typeof answer === 'number') setSelectedOption(answer);
  };
  const handleShortAnswerChange = (val: string) => {
    if (!isSubmitted) setShortAnswer(val);
  };

  const handleSubmitAnswer = async () => {
    // Support both MCQ and short answer
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
      setEvaluation(evaluation);
      setIsSubmitted(true);
      const responseTime = (Date.now() - answerStartTime.current) / 1000;
      const newAnswer = {
        question: currentQuestionObject.question,
        answer: studentAnswer,
        isCorrect: evaluation.isCorrect,
        cognitiveAnalysis: evaluation.cognitiveAnalysis, // Store new data
        responseTime,
        difficulty: currentQuestionObject.difficulty,
      };
      setPreviousAnswers(prev => [...prev, newAnswer]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    setIsLoading(true);
    setIsSubmitted(false);
    setSelectedOption(null);
    setShortAnswer("");
    setEvaluation(null);

    // Check if we've reached max questions
    if (questionNumber >= MAX_QUESTIONS) {
      setShowFinishButton(true);
      setIsLoading(false);
      return;
    }

    try {
      const { question, quizComplete: backendQuizComplete } = await quizApiService.getNextQuestion(sessionData, questionNumber + 1, previousAnswers);
      if (!question || backendQuizComplete) {
        setShowFinishButton(true);
        setIsLoading(false);
        return;
      }
      setCurrentQuestionObject(question);
      setQuestionNumber(questionNumber + 1);
      answerStartTime.current = Date.now();
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleFinishQuiz = async () => {
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

  // ... (JSX rendering logic remains largely the same, but will now use the 'evaluation' state)

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (isLoading && !currentQuestionObject) return <div className="p-4">Loading Quiz...</div>;
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
        <QuizProgress currentQuestion={questionNumber} totalQuestions={questionNumber} />
        <QuestionDisplay question={currentQuestionObject.question} />

        {isSubmitted && evaluation && (
          <div className="text-center p-3 bg-gray-50 rounded-md border">
            <FeedbackDisplay isCorrect={evaluation.isCorrect} />
            <p className="font-bold mt-2">Explanation:</p>
            <p>{evaluation.feedback}</p>
          </div>
        )}

        <AnswerOptions
          type={currentQuestionObject.type}
          options={currentQuestionObject.options}
          onSelectAnswer={handleSelectAnswer}
          selectedOption={selectedOption}
          shortAnswer={shortAnswer}
          onShortAnswerChange={handleShortAnswerChange}
          isSubmitted={isSubmitted}
          correctAnswer={currentQuestionObject.correctAnswer}
        />

        <div className="pt-4 text-center">
          {isLoading ? (
            <p>Loading...</p>
          ) : showFinishButton ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 Quiz Assessment Complete!</h3>
                <p className="text-blue-700 text-sm">
                  You've answered {questionNumber} questions. The AI has gathered sufficient cognitive data to provide you with a comprehensive analysis.
                </p>
              </div>
              <Button onClick={handleFinishQuiz}>
                🏁 Finish Assessment & View Results
              </Button>
            </div>
          ) : !isSubmitted ? (
            <Button onClick={handleSubmitAnswer} disabled={currentQuestionObject.type === 'mcq' ? selectedOption === null : !shortAnswer.trim()}>
              Submit Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              Next Question ({questionNumber + 1}/{MAX_QUESTIONS})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
