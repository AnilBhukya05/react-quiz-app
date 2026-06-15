import React, { useState, useEffect, useCallback } from "react";
import "./Quiz.css";

const TIME_PER_QUESTION = 15;

const CATEGORIES = [
  { id: "", name: "Any Category" },
  { id: "9", name: "General Knowledge" },
  { id: "18", name: "Computer Science" },
  { id: "19", name: "Mathematics" },
  { id: "17", name: "Science & Nature" },
  { id: "23", name: "History" },
  { id: "22", name: "Geography" },
  { id: "11", name: "Film" },
  { id: "21", name: "Sports" },
];

const DIFFICULTIES = [
  { id: "", name: "Any Difficulty" },
  { id: "easy", name: "Easy" },
  { id: "medium", name: "Medium" },
  { id: "hard", name: "Hard" },
];

const decodeHTML = (html) => {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
};

const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const Quiz = () => {
  const [screen, setScreen] = useState("home"); // home | loading | quiz | result | error
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [errorMsg, setErrorMsg] = useState("");

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  const fetchQuestions = useCallback(async () => {
    setScreen("loading");
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ amount: "10", type: "multiple" });
      if (category) params.append("category", category);
      if (difficulty) params.append("difficulty", difficulty);

      const res = await fetch(
        `https://opentdb.com/api.php?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Network error, please try again.");

      const data = await res.json();
      if (data.response_code !== 0 || !data.results?.length) {
        throw new Error(
          "No questions found for this combination. Try different filters.",
        );
      }

      const formatted = data.results.map((q) => ({
        question: decodeHTML(q.question),
        options: shuffle([...q.incorrect_answers, q.correct_answer]).map(
          decodeHTML,
        ),
        answer: decodeHTML(q.correct_answer),
        category: decodeHTML(q.category),
        difficulty: q.difficulty,
      }));

      setQuestions(formatted);
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setTimeLeft(TIME_PER_QUESTION);
      setScreen("quiz");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setScreen("error");
    }
  }, [category, difficulty]);

  // Countdown timer for the active question
  useEffect(() => {
    if (screen !== "quiz" || isAnswered) return;

    if (timeLeft === 0) {
      setIsAnswered(true);
      setStreak(0);
      return;
    }

    const tick = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(tick);
  }, [timeLeft, isAnswered, screen]);

  const handleOptionClick = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === currentQuestion.answer) {
      setScore((prev) => prev + 1);
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const goToNext = () => {
    if (currentIndex === totalQuestions - 1) {
      setScreen("result");
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(TIME_PER_QUESTION);
  };

  const getOptionClass = (option) => {
    if (!isAnswered) return "";
    if (option === currentQuestion.answer) return "correct";
    if (option === selectedOption) return "wrong";
    return "disabled";
  };

  const percentage = totalQuestions
    ? Math.round((score / totalQuestions) * 100)
    : 0;

  const getResultMessage = () => {
    if (percentage === 100) return "Flawless! You're a quiz master.";
    if (percentage >= 70) return "Great job — solid performance!";
    if (percentage >= 40) return "Good effort, keep practicing.";
    return "Don't give up, try again!";
  };

  // ---------- Home screen ----------
  if (screen === "home") {
    return (
      <div className="quiz-card home-card">
        <span className="quiz-tag">Tech Quiz Challenge</span>
        <h1>Test Your Knowledge</h1>
        <p className="home-subtitle">
          Fresh questions every time you play. Pick a category and difficulty to
          begin.
        </p>

        <div className="select-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="select-group">
          <label htmlFor="difficulty">Difficulty</label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <button className="primary-btn" onClick={fetchQuestions}>
          <span className="btn-label">Start Quiz</span>
        </button>
      </div>
    );
  }

  // ---------- Loading screen ----------
  if (screen === "loading") {
    return (
      <div className="quiz-card loading-card">
        <div className="spinner" />
        <p>Fetching fresh questions...</p>
      </div>
    );
  }

  // ---------- Error screen ----------
  if (screen === "error") {
    return (
      <div className="quiz-card error-card">
        <span className="error-icon">⚠</span>
        <h2>Oops!</h2>
        <p>{errorMsg}</p>
        <button className="primary-btn" onClick={fetchQuestions}>
          Try Again
        </button>
        <button className="ghost-btn" onClick={() => setScreen("home")}>
          Back to Home
        </button>
      </div>
    );
  }

  // ---------- Result screen ----------
  if (screen === "result") {
    return (
      <div className="quiz-card result-card">
        <div className="score-circle" style={{ "--percentage": percentage }}>
          <span className="score-percentage">{percentage}%</span>
        </div>
        <h2>Quiz Completed!</h2>
        <p className="score-text">
          You scored <strong>{score}</strong> out of{" "}
          <strong>{totalQuestions}</strong>
        </p>
        <p className="streak-text">🔥 Best streak: {bestStreak} in a row</p>
        <p className="result-message">{getResultMessage()}</p>
        <div className="result-actions">
          <button className="primary-btn" onClick={fetchQuestions}>
            Play Again
          </button>
          <button className="ghost-btn" onClick={() => setScreen("home")}>
            Change Settings
          </button>
        </div>
      </div>
    );
  }

  // ---------- Quiz screen ----------
  return (
    <div className="quiz-card" key={currentIndex}>
      <div className="quiz-header">
        <div>
          <span className="quiz-tag">{currentQuestion.category}</span>
          <p className="question-count">
            Question {currentIndex + 1} of {totalQuestions}
            {streak > 1 && (
              <span className="streak-badge"> 🔥 {streak} streak</span>
            )}
          </p>
        </div>
        <div className={`timer ${timeLeft <= 5 ? "timer-warning" : ""}`}>
          {timeLeft}s
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <h2 className="question-text">{currentQuestion.question}</h2>

      <ul className="options-list">
        {currentQuestion.options.map((option, i) => (
          <li
            key={i}
            className={`option ${getOptionClass(option)}`}
            onClick={() => handleOptionClick(option)}
          >
            <span className="option-text">{option}</span>
            {isAnswered && option === currentQuestion.answer && (
              <span className="icon correct-icon">✓</span>
            )}
            {isAnswered &&
              option === selectedOption &&
              option !== currentQuestion.answer && (
                <span className="icon wrong-icon">✗</span>
              )}
          </li>
        ))}
      </ul>

      <button className="primary-btn" onClick={goToNext} disabled={!isAnswered}>
        {currentIndex === totalQuestions - 1 ? "Finish" : "Next"}
      </button>
    </div>
  );
};

export default Quiz;
