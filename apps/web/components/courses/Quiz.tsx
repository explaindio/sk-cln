'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface QuizProps {
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
  }[];
  onComplete: (score: number) => void;
}

export function Quiz({ questions, onComplete }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionId,
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctOptionId ? 1 : 0);
    }, 0);
    onComplete((score / questions.length) * 100);
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (submitted) {
    const score = questions.reduce((acc, q) => {
      return acc + (selectedAnswers[q.id] === q.correctOptionId ? 1 : 0);
    }, 0);

    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-4">Quiz Complete!</h3>
          <p className="text-lg mb-4">
            Your score: {score} / {questions.length} (
            {((score / questions.length) * 100).toFixed(0)}%)
          </p>
          <Button onClick={() => {
            setSubmitted(false);
            setCurrentQuestionIndex(0);
            setSelectedAnswers({});
          }}>
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <h3 className="text-lg font-medium mt-1">{currentQuestion.text}</h3>
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <label
              key={option.id}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedAnswers[currentQuestion.id] === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question-${currentQuestion.id}`}
                value={option.id}
                checked={selectedAnswers[currentQuestion.id] === option.id}
                onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                className="mr-3"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!selectedAnswers[currentQuestion.id]}
            >
              Submit
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              disabled={!selectedAnswers[currentQuestion.id]}
            >
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}