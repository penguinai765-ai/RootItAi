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

const TOTAL_QUESTIONS = 5;

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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null); // NEW: To store evaluation result

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

  const handleSelectAnswer = (optionIndex: number) => {
    if (!isSubmitted) setSelectedOption(optionIndex);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null) return;

    setIsLoading(true);
    try {
        const studentAnswer = currentQuestionObject.options[selectedOption];
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

    } catch(err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (questionNumber < TOTAL_QUESTIONS) {
        setIsLoading(true);
        // Reset for next question
        setIsSubmitted(false);
        setSelectedOption(null);
        setEvaluation(null);
        
        try {
          const { question } = await quizApiService.getNextQuestion(sessionData, questionNumber + 1, previousAnswers);
          setCurrentQuestionObject(question);
          setQuestionNumber(questionNumber + 1);
          answerStartTime.current = Date.now();
        } catch (err: any) { setError(err.message); } 
        finally { setIsLoading(false); }
      } else {
        setIsLoading(true);
        try {
            await quizApiService.completeQuiz(user!.uid, quizId as string, sessionData, previousAnswers);
            alert("Quiz Finished! Your results have been saved.");
            router.push('/student/dashboard');
        } catch(err: any) {
            setError("Failed to save your results.");
            setIsLoading(false);
        }
      }
  };

  // ... (JSX rendering logic remains largely the same, but will now use the 'evaluation' state)
  
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (isLoading && !currentQuestionObject) return <div className="p-4">Loading Quiz...</div>;
  if (!currentQuestionObject) return <div className="p-4">Could not load quiz.</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
        <QuizProgress currentQuestion={questionNumber} totalQuestions={TOTAL_QUESTIONS} />
        <QuestionDisplay question={currentQuestionObject.question} />
        
        {isSubmitted && evaluation && (
            <div className="text-center p-3 bg-gray-50 rounded-md border">
                <FeedbackDisplay isCorrect={evaluation.isCorrect} />
                <p className="font-bold mt-2">Explanation:</p>
                <p>{evaluation.feedback}</p>
            </div>
        )}
        
        <AnswerOptions 
          options={currentQuestionObject.options} 
          onSelectAnswer={handleSelectAnswer} 
          selectedOption={selectedOption}
          isSubmitted={isSubmitted}
          correctAnswer={currentQuestionObject.correctAnswer}
        />
        
        <div className="pt-4 text-center">
            {isLoading ? (<p>Loading...</p>) : 
             !isSubmitted ? (
                <Button onClick={handleSubmitAnswer} disabled={selectedOption === null}>Submit</Button>
            ) : (
                <Button onClick={handleNextQuestion}>
                    {questionNumber < TOTAL_QUESTIONS ? "Next Question" : "Finish Quiz"}
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
