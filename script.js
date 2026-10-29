
const $ = (id) => document.getElementById(id);

const mazeElement = $("maze");
const scoreElement = $("score");
const bottleElement = $("bottle-count");
const waterElement = $("water-count");
const livesElement = $("lives");
const timerElement = $("timer");
const feedbackElement = $("feedback");
const startButton = $("start-btn");
const resetButton = $("reset-btn");
const gameElement = document.querySelector(".game");
const difficultyInputs = document.querySelectorAll('input[name="difficulty"]');

const difficultySettings = {
  easy: { label: "Easy", time: 120, lives: 4 },
  normal: { label: "Normal", time: 90, lives: 3 },
  hard: { label: "Hard", time: 60, lives: 2 }
};

const milestoneMessages = [
  { score: 30, message: "Nice start! Agwuita is making progress." },
  { score: 60, message: "Halfway hero! Keep every drop clean." },
  { score: 100, message: "Water champion! Your mission is shining." }
];

let selectedDifficulty = "normal";
let shownMilestones = new Set();
let audioContext = null;

const levels = [
  {
    title: "The Polluted Stream",
    icon: "🌊",
    heading: "A stream needs help!",
    story: "Agwuita discovers pollution near a stream. Collect clean water, rescue discarded bottles, and find the exit.",
    startMessage: "Adventure 1 begins! Follow the trail and help the stream.",
    map: [
      "###########",
      "#P..W....E#",
      "#.###.##..#",
      "#...#..B..#",
      "###.#.###.#",
      "#W..D....W#",
      "#.##.###..#",
      "#B........#",
      "###########"
    ]
  },
  {
    title: "The Forest Trail",
    icon: "🌳",
    heading: "Keep the forest clean!",
    story: "Agwuita travels deeper into the forest. The winding trail is full of bottles and clean water, but dirty water still threatens the journey.",
    startMessage: "Adventure 2 begins! Explore the forest trail.",
    map: [
      "###########",
      "#P..W....E#",
      "#.###.##..#",
      "#...#..B..#",
      "###.#.###.#",
      "#W..D....W#",
      "#.##.###..#",
      "#B........#",
      "###########"
    ]
  },
  {
    title: "The Clean Water Village",
    icon: "🏡",
    heading: "The final destination!",
    story: "Agwuita reaches a village on the last leg of the adventure. Collect the supplies and reach the finish to complete the mission.",
    startMessage: "Final adventure! Help Agwuita reach the village exit.",
    map: [
      "###########",
      "#P..W....E#",
      "#.###.##..#",
      "#...#..B..#",
      "###.#.###.#",
      "#W..D....W#",
      "#.##.###..#",
      "#B........#",
      "###########"
    ]
  }
];

let levelIndex = 0;
let maze = [];
let player = { row: 1, col: 1 };
let score = 0;
let bottles = 0;
let water = 0;
let lives = 3;
let timeLeft = 90;
let timerInterval = null;
let gameStarted = false;
let gameOver = false;

function updateStats() {
  scoreElement.textContent = score;
  bottleElement.textContent = bottles;
  waterElement.textContent = water;
  livesElement.textContent = lives;
  timerElement.textContent = timeLeft;
  checkMilestones();
}

function getDifficulty() {
  return difficultySettings[selectedDifficulty];
}

function setDifficultyControlsDisabled(disabled) {
  difficultyInputs.forEach(input => {
    input.disabled = disabled;
  });
}

function playTone(frequency, duration, volume = 0.08) {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Audio is optional; gameplay continues if the browser blocks it.
  }
}

function playCollectSound() {
  playTone(660, 0.12);
}

function playWinSound() {
  playTone(523, 0.18);
  window.setTimeout(() => playTone(659, 0.18), 140);
  window.setTimeout(() => playTone(784, 0.25), 280);
}

function checkMilestones() {
  for (const milestone of milestoneMessages) {
    if (score >= milestone.score && !shownMilestones.has(milestone.score)) {
      shownMilestones.add(milestone.score);
      feedbackElement.textContent = milestone.message;
    }
  }
}

function updateLevelProgress() {
  for (let i = 1; i <= 3; i++) {
    const step = $(`step-${i}`);
    step.classList.toggle("active", i === levelIndex + 1);
    step.classList.toggle("completed", i < levelIndex + 1);
  }
}

function showLevel() {
  const level = levels[levelIndex];

  $("level-number").textContent =
    `ADVENTURE ${levelIndex + 1} OF ${levels.length}`;
  $("level-title").textContent = level.title;
  $("story-icon").textContent = level.icon;
  $("story-heading").textContent = level.heading;
  $("story-text").textContent = level.story;
  $("instructions").textContent =
    "Collect 3 clean water drops and 2 recyclable bottles, then reach the exit.";
  updateLevelProgress();
}

function createAgwuita() {
  const sprite = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  sprite.setAttribute("viewBox", "0 0 100 110");
  sprite.setAttribute("class", "agwuita-sprite");
  sprite.setAttribute("role", "img");
  sprite.setAttribute("aria-label",
    "Agwuita, a happy blue water drop wearing overalls and yellow sneakers"
  );

  sprite.innerHTML = `
    <!-- Agwuita's water-drop body -->
    <path d="M50 5 C42 22 13 48 13 68
      C13 91 29 103 50 103 C71 103 87 91 87 68
      C87 48 58 22 50 5Z"
      fill="#65D9FF" stroke="#087EBD" stroke-width="4"
      stroke-linejoin="round"/>

    <!-- Sparkle -->
    <ellipse cx="32" cy="48" rx="5" ry="12"
      fill="white" opacity=".85" transform="rotate(35 32 48)"/>

    <!-- Eyes -->
    <ellipse cx="37" cy="61" rx="6" ry="8" fill="#15364B"/>
    <ellipse cx="63" cy="61" rx="6" ry="8" fill="#15364B"/>
    <circle cx="39" cy="58" r="2.5" fill="white"/>
    <circle cx="65" cy="58" r="2.5" fill="white"/>

    <!-- Smile and cheeks -->
    <path d="M40 73 Q50 85 60 73 Q58 87 50 87 Q42 85 40 73Z"
      fill="#F46D78" stroke="#15364B" stroke-width="2"/>
    <ellipse cx="27" cy="73" rx="6" ry="3.5" fill="#FF9DAF"/>
    <ellipse cx="73" cy="73" rx="6" ry="3.5" fill="#FF9DAF"/>

    <!-- Overall straps -->
    <path d="M32 79 L35 91 M68 79 L65 91"
      stroke="#FFD84D" stroke-width="7" stroke-linecap="round"/>

    <!-- Blue denim overalls -->
    <path d="M29 84 Q50 91 71 84 L75 99
      Q50 105 25 99Z"
      fill="#1765B5" stroke="#15364B" stroke-width="3"/>
    <path d="M42 91 L58 91 L58 99 L42 99Z"
      fill="#65B8F5" stroke="#15364B" stroke-width="2"/>
    <circle cx="35" cy="88" r="3.5"
      fill="#FFD84D" stroke="#15364B" stroke-width="1.5"/>
    <circle cx="65" cy="88" r="3.5"
      fill="#FFD84D" stroke="#15364B" stroke-width="1.5"/>

    <!-- Yellow sneakers -->
    <path d="M25 98 L42 99 L39 106 L23 106
      Q18 104 25 98Z"
      fill="#FFD84D" stroke="#15364B" stroke-width="2"/>
    <path d="M58 99 L75 98 L79 104
      Q78 107 58 106Z"
      fill="#FFD84D" stroke="#15364B" stroke-width="2"/>
    <path d="M25 103 L37 103 M62 103 L75 103"
      stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  `;

  return sprite;
}

function renderMaze() {
  mazeElement.innerHTML = "";

  maze.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const tile = document.createElement("div");
      tile.className = "maze-cell";
      tile.setAttribute("role", "gridcell");

      if (cell === "#") {
        tile.classList.add("wall");
        tile.setAttribute("aria-label", "Wall");
      } else if (
        rowIndex === player.row &&
        colIndex === player.col
      ) {
        tile.classList.add("player");
        tile.appendChild(createAgwuita());
      } else if (cell === "W") {
        tile.classList.add("water");
        tile.textContent = "💧";
        tile.setAttribute("aria-label", "Clean water");
      } else if (cell === "B") {
        tile.classList.add("bottle");
        tile.textContent = "🧴";
        tile.setAttribute("aria-label", "Recyclable bottle");
      } else if (cell === "D") {
        tile.classList.add("dirty");
        tile.textContent = "🟤";
        tile.setAttribute("aria-label", "Dirty water");
      } else if (cell === "E") {
        tile.classList.add("exit");
        tile.textContent = "🏁";
        tile.setAttribute("aria-label", "Exit");
      }

      mazeElement.appendChild(tile);
    });
  });
}

function startGame() {
  if (gameStarted || gameOver) return;

  gameStarted = true;
  setDifficultyControlsDisabled(true);
  startButton.disabled = true;
  startButton.textContent = "Adventure in Progress!";
  feedbackElement.textContent = levels[levelIndex].startMessage;

  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();

    if (timeLeft <= 0) {
      endGame(false, "Time ran out! Restart your journey and try again.");
    }
  }, 1000);
}

function movePlayer(direction) {
  if (!gameStarted || gameOver) return;

  const directions = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1]
  };

  const [dr, dc] = directions[direction];
  const nextRow = player.row + dr;
  const nextCol = player.col + dc;

  if (
    nextRow < 0 ||
    nextRow >= maze.length ||
    nextCol < 0 ||
    nextCol >= maze[0].length
  ) {
    return;
  }

  const nextCell = maze[nextRow][nextCol];

  if (nextCell === "#") {
    feedbackElement.textContent =
      "That path is blocked! Try a different route.";
    return;
  }

  // Require the player to collect the mission items before exiting.
  if (nextCell === "E" && (water < 3 || bottles < 2)) {
    feedbackElement.textContent =
      `The exit is ahead! Collect 3 clean drops and 2 bottles first. You have ${water}/3 drops and ${bottles}/2 bottles.`;
    return;
  }

  player.row = nextRow;
  player.col = nextCol;

  if (nextCell === "W") {
    water++;
    score += 10;
    maze[nextRow][nextCol] = ".";
    feedbackElement.textContent =
      "Sparkling clean water collected! +10 points 💧";
    playCollectSound();
  } else if (nextCell === "B") {
    bottles++;
    score += 20;
    maze[nextRow][nextCol] = ".";
    feedbackElement.textContent =
      "Bottle collected! Recycling helps keep the environment clean. +20 ♻️";
    playCollectSound();
  } else if (nextCell === "D") {
    lives--;
    score = Math.max(0, score - 5);
    maze[nextRow][nextCol] = ".";
    feedbackElement.textContent =
      "Oh no! Agwuita touched dirty water. You lost a life and 5 points.";

    if (lives <= 0) {
      updateStats();
      renderMaze();
      endGame(false, "Agwuita ran out of lives! Restart and avoid the dirty water.");
      return;
    }
  } else if (nextCell === "E") {
    finishLevel();
    return;
  } else {
    feedbackElement.textContent = "Keep exploring! Agwuita is on a mission.";
  }

  updateStats();
  renderMaze();
}

function finishLevel() {
  clearInterval(timerInterval);
  timerInterval = null;
  score += timeLeft;
  updateStats();

  if (levelIndex < levels.length - 1) {
    feedbackElement.textContent =
      `Level complete! You earned ${timeLeft} bonus points. Get ready for the next part of Agwuita's journey! 🎉`;
    gameStarted = false;
    setDifficultyControlsDisabled(false);
    startButton.disabled = false;
    startButton.textContent = "➡ Next Adventure";
    gameElement.classList.add("won");
    updateLevelProgress();
    launchConfetti();
  } else {
    endGame(
      true,
      `Journey complete! 🎉 Agwuita finished all three adventures with ${score} points. You collected clean water, recycled bottles, and avoided pollution. Every drop matters!`
    );
  }
}

function startNextLevel() {
  levelIndex++;
  maze = levels[levelIndex].map.map(row => row.split(""));
  player = { row: 1, col: 1 };
  water = 0;
  bottles = 0;
  timeLeft = getDifficulty().time;
  gameStarted = false;
  gameOver = false;

  gameElement.classList.remove("won");
  showLevel();
  updateStats();
  renderMaze();

  feedbackElement.textContent =
    `Welcome to ${levels[levelIndex].title}! Press Start Adventure when you're ready.`;
  startButton.disabled = false;
  startButton.textContent = "▶ Start Adventure";
}

function endGame(won, message) {
  clearInterval(timerInterval);
  timerInterval = null;
  gameStarted = false;
  gameOver = true;

  feedbackElement.textContent = message;
  startButton.disabled = false;
  startButton.textContent = won ? "🎉 Play Again" : "↻ Try Again";

  if (won) {
    gameElement.classList.add("won");
    launchConfetti();
    playWinSound();
  }
  setDifficultyControlsDisabled(false);

  updateStats();
}

function launchConfetti() {
  const colors = ["#FFD84D", "#00A6C7", "#B9E6A3", "#F6B6A8"];

  for (let i = 0; i < 50; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.textContent = i % 2 === 0 ? "✦" : "•";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.color = colors[i % colors.length];
    piece.style.fontSize = `${12 + Math.random() * 18}px`;
    piece.style.animationDuration = `${1.5 + Math.random() * 2}s`;

    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 4000);
  }
}

function resetGame() {
  clearInterval(timerInterval);
  timerInterval = null;

  levelIndex = 0;
  maze = levels[0].map.map(row => row.split(""));
  player = { row: 1, col: 1 };
  score = 0;
  bottles = 0;
  water = 0;
  lives = getDifficulty().lives;
  timeLeft = getDifficulty().time;
  gameStarted = false;
  gameOver = false;
  shownMilestones.clear();

  setDifficultyControlsDisabled(false);
  gameElement.classList.remove("won");
  showLevel();
  updateStats();
  renderMaze();

  feedbackElement.textContent =
    "Your adventure awaits! Press Start Adventure to begin.";
  startButton.disabled = false;
  startButton.textContent = "▶ Start Adventure";
}

document.addEventListener("keydown", event => {
  const keys = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    a: "left",
    A: "left",
    s: "down",
    S: "down",
    d: "right",
    D: "right"
  };

  const direction = keys[event.key];

  if (direction) {
    event.preventDefault();
    movePlayer(direction);
  }
});

document.querySelectorAll("[data-move]").forEach(button => {
  button.addEventListener("click", () => {
    movePlayer(button.dataset.move);
  });
});

startButton.addEventListener("click", () => {
  if (gameOver) {
    resetGame();
    startGame();
    return;
  }

  if (!gameStarted && levelIndex < levels.length - 1 &&
      startButton.textContent.includes("Next Adventure")) {
    startNextLevel();
    startGame();
    return;
  }

  startGame();
});

resetButton.addEventListener("click", resetGame);

difficultyInputs.forEach(input => {
  input.addEventListener("change", event => {
    if (!event.target.checked) return;

    selectedDifficulty = event.target.value;
    const difficulty = getDifficulty();
    $("difficulty-summary").textContent =
      `${difficulty.label}: ${difficulty.time} seconds per adventure, ${difficulty.lives} lives`;
    resetGame();
  });
});

resetGame();
