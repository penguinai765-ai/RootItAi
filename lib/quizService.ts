// lib/quizService.ts

export const startQuizSession = async (studentId: string, assignedQuizId: string) => {
  const response = await fetch('/api/quiz-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'initialize', studentId, assignedQuizId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start quiz session.');
  }

  return response.json();
};

export const getNextQuestion = async (sessionData: any, questionNumber: number, previousAnswers: any[]) => {
  const response = await fetch('/api/quiz-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'next', sessionData, questionNumber, previousAnswers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch next question.');
  }

  return response.json();
};

export const completeQuizSession = async (studentId: string, assignedQuizId: string, sessionData: any, previousAnswers: any[]) => {
  const response = await fetch('/api/quiz-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      action: 'complete', 
      studentId, 
      assignedQuizId, 
      sessionData, 
      previousAnswers 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save quiz results.');
  }
  
  return response.json();
};
