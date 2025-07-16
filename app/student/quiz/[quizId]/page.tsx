"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { startQuizSession, getNextQuestion, completeQuizSession } from '@/lib/quizService';

import QuestionDisplay from '@/components/quiz/QuestionDisplay';
import AnswerOptions from '@/components/quiz/AnswerOptions';
import QuizProgress from '@/components/quiz/QuizProgress';
import FeedbackDisplay from '@/components/quiz/FeedbackDisplay';
import Button from '@/components/Button';

const TOTAL_QUESTIONS = 5;

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
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const answerStartTime = useRef<number>(Date.now());

  useEffect(() => {
    if (user && quizId) {
      const initialize = async () => {
        try {
          const { question, sessionData } = await startQuizSession(user.uid, quizId as string);
          setSessionData(sessionData);
          setCurrentQuestionObject(question);
          answerStartTime.current = Date.now();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      initialize();
    }
  }, [user, quizId]);

  const handleSelectAnswer = (optionIndex: number) => {
    if (!isSubmitted) {
      setSelectedOption(optionIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const responseTime = (Date.now() - answerStartTime.current) / 1000;
    const isCorrect = currentQuestionObject.options[selectedOption] === currentQuestionObject.correctAnswer;
    
    setFeedback(isCorrect);
    setIsSubmitted(true);

    const newAnswer = {
      question: currentQuestionObject.question,
      answer: currentQuestionObject.options[selectedOption],
      isCorrect,
      responseTime,
      difficulty: currentQuestionObject.difficulty,
    };
    setPreviousAnswers(prev => [...prev, newAnswer]);
  };

  const handleNextQuestion = async () => {
    if (questionNumber < TOTAL_QUESTIONS) {
        setIsLoading(true);
        setIsSubmitted(false);
        setSelectedOption(null);
        setFeedback(null);
        
        try {
          const { question } = await getNextQuestion(sessionData, questionNumber + 1, previousAnswers);
          setCurrentQuestionObject(question);
          setQuestionNumber(questionNumber + 1);
          answerStartTime.current = Date.now();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(true);
        try {
            await completeQuizSession(user!.uid, quizId as string, sessionData, previousAnswers);
            alert("Quiz Finished! Your results have been saved. Redirecting to dashboard.");
            router.push('/student/dashboard');
        } catch(err: any) {
            setError("Failed to save your results. Please try again.");
            setIsLoading(false);
        }
      }
  };

  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500 p-4">Error: {error}</div>;
  if (isLoading && !currentQuestionObject) return <div className="flex items-center justify-center min-h-screen">Loading Quiz...</div>;
  if (!currentQuestionObject) return <div className="flex items-center justify-center min-h-screen">Could not load the quiz.</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md">
        <QuizProgress currentQuestion={questionNumber} totalQuestions={TOTAL_QUESTIONS} />
        <QuestionDisplay question={currentQuestionObject.question} />
        
        {isSubmitted && (
            <div className="text-center p-3 bg-gray-50 rounded-md border">
                <FeedbackDisplay isCorrect={feedback} />
                <p className="font-bold">Explanation:</p>
                <p>{currentQuestionObject.explanation}</p>
            </div>
        )}
        
        {/* --- THIS IS THE CORRECTED PART --- */}
        <AnswerOptions 
          options={currentQuestionObject.options} 
          onSelectAnswer={handleSelectAnswer} 
          selectedOption={selectedOption}
          isSubmitted={isSubmitted}
          correctAnswer={currentQuestionObject.correctAnswer}
        />
        
        <div className="pt-4 text-center">
            {isLoading && isSubmitted ? (
                <p>Loading...</p>
            ) : !isSubmitted ? (
                <Button onClick={handleSubmitAnswer} disabled={selectedOption === null}>
                    Submit
                </Button>
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
