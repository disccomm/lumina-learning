// --- CONFIGURATION ---
const PEXELS_API_KEY = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM";
const State = {
    db: [],
    sessionSet: [], 
    currentIndex: 0,
    seconds: 0,
    timerInt: null,
    quizState: [], // Detailed tracking for persistence, review, and time
    isPaused: false,
    quizStartTime: 0
};

// --- INITIALIZATION AND UI BINDINGS ---

// Helper audio function
function playAudio(type) {
    // Placeholder for PWA audio feedback
    console.log(`Audio Feedback: ${type}`);
}

document.addEventListener('DOMContentLoaded', () => {
    // Age slider listener
    const ageRange = document.getElementById('age-range');
    const ageVal = document.getElementById('age-val');
    ageVal.innerText = ageRange.value + ' yrs';
    ageRange.addEventListener('input', (e) => {
        ageVal.innerText = e.target.value + ' yrs';
    });

    // File selection listener
    document.getElementById('pdf-file').addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : "Tap to Upload PDF";
        document.getElementById('file-status').innerText = fileName;
    });

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
});


// --- CORE FUNCTIONS (Processing and Navigation) ---

function processAndLoad() {
    const fileInput = document.getElementById('pdf-file');
    const topic = document.getElementById('topic-name').value;
    const processButton = document.querySelector('.primary-btn');

    if (!fileInput.files[0] || !topic) {
        alert("Please provide a Topic Name and select a PDF file first.");
        return;
    }

    document.getElementById('file-status').innerHTML = "⏳ **Analyzing Content...**";
    processButton.disabled = true;

    // Simulate LLM extraction (2-second delay)
    setTimeout(() => {
        State.db = generateMockData(50); // Mocks 50 questions
        
        document.getElementById('action-tiles').classList.remove('hidden');
        document.getElementById('file-status').innerHTML = "✅ **Ready! 50 Questions Loaded.**";
        processButton.disabled = false;

    }, 2000); 
}

function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Custom Modal for Quiz Configuration
function openQuizConfig() {
    const max = State.db.length;
    if (max === 0) {
        alert("Please click 'Build My Library' first!");
        return;
    }
    
    const modalBody = document.getElementById('modal-body');
    document.getElementById('modal-title').innerText = 'Start Quiz Session';
    
    modalBody.innerHTML = `
        <p>Questions in bank: ${max}</p>
        <div class="input-group">
            <label for="q-count">Select Questions (1-${max}):</label>
            <input type="number" id="q-count" value="10" min="1" max="${max}" class="glass-input">
        </div>
    `;
    
    document.getElementById('modal-action-btn').innerText = 'Start Quiz';
    document.getElementById('modal-action-btn').onclick = startQuiz;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function startQuiz() {
    const countInput = document.getElementById('q-count');
    const count = parseInt(countInput.value);
    const max = State.db.length;
    
    if (count < 1 || count > max || isNaN(count)) {
        alert(`Invalid count. Must be between 1 and ${max}.`);
        return;
    }
    
    document.getElementById('modal-overlay').classList.add('hidden');
    
    setupQuizSession(count); // Initialize session state
    switchView('quiz-view');
    renderQuestion();
    startTimer();
}

function startFlashcards() {
    if (State.db.length === 0) {
        alert("Please build your library first!");
        return;
    }
    alert("Flashcards View Initialized! (Simulated)"); 
    // switchView('flashcards-view');
}

function generateWorksheets() {
    if (State.db.length === 0) {
        alert("Please build your library first!");
        return;
    }
    alert("Worksheets PDF Generated! (Simulated)"); 
}


// --- QUIZ INTERACTION LOGIC (V6.0 Implementation) ---

function setupQuizSession(count) {
    State.sessionSet = [...State.db].sort(() => 0.5 - Math.random()).slice(0, count);
    State.currentIndex = 0;
    // Map initial state for persistence and store shuffled options
    State.quizState = State.sessionSet.map((q, index) => ({
        id: index, // Use index as simple ID for mock data
        answer: null, 
        answeredTime: null, 
        isCorrect: null,
        options: [...q.options].sort(() => 0.5 - Math.random()) 
    }));
    
    State.seconds = 0;
    State.isPaused = false;
    clearInterval(State.timerInt);
}

function renderQuestion() {
    const qData = State.sessionSet[State.currentIndex];
    const sessionQ = State.quizState[State.currentIndex];
    const container = document.getElementById('quiz-content');
    
    // Update navigation text
    document.getElementById('prev-btn').disabled = (State.currentIndex === 0);
    const nextBtn = document.getElementById('next-btn');
    nextBtn.innerText = (State.currentIndex === State.sessionSet.length - 1) ? 'Review' : 'Next';
    nextBtn.onclick = handleNext;
    
    const imageUrl = `https://images.pexels.com/photos/100/nature-red-love-small.jpg?auto=compress&cs=tinysrgb&dpr=1&w=500`; // Placeholder image
    
    container.innerHTML = `
        <div class="question-card glass">
            <img src="${imageUrl}" alt="Visual aid for question" class="q-img">
            <h3>Question ${State.currentIndex + 1} of ${State.sessionSet.length}</h3>
            <p>${qData.question}</p>
            <div class="options-list">
                ${sessionQ.options.map(opt => `
                    <button class="opt-btn" onclick="selectAnswer(this, '${opt}')">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    // Persistence and locking logic
    if (sessionQ.isCorrect !== null) {
        // If answered, re-apply visual state
        const selectedBtn = Array.from(document.querySelectorAll('.opt-btn')).find(b => b.innerText === sessionQ.answer);
        if (selectedBtn) {
            handleVisualFeedback(selectedBtn, sessionQ.isCorrect, qData.correct, true);
        }
        disableQuestionInteraction(true);
    } else if (sessionQ.answer && sessionQ.answer !== 'SKIPPED') {
         // If selected but not locked (e.g., came back via Prev button)
         const selectedBtn = Array.from(document.querySelectorAll('.opt-btn')).find(b => b.innerText === sessionQ.answer);
         if (selectedBtn) selectedBtn.classList.add('selected');
    } else {
        document.getElementById('next-btn').disabled = true;
        disableQuestionInteraction(false);
    }
    
    updateProgressBar();
}

function selectAnswer(btn, choice) {
    const sessionQ = State.quizState[State.currentIndex];
    
    // Clear previous selection visually and in state
    document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    btn.classList.add('selected');
    
    // Update temporary state for persistence
    sessionQ.answer = choice; 
    document.getElementById('next-btn').disabled = false;
}

function handleNext() {
    const sessionQ = State.quizState[State.currentIndex];
    const qData = State.sessionSet[State.currentIndex];
    const selectedBtn = document.querySelector('.opt-btn.selected');
    
    if (selectedBtn) {
        const choice = selectedBtn.innerText;
        const isCorrect = (choice === qData.correct);
        
        // Lock Answer and update state
        sessionQ.answer = choice;
        sessionQ.isCorrect = isCorrect;
        sessionQ.answeredTime = Date.now() - State.quizStartTime; 
        
        // Provide immediate visual feedback on the current question before moving
        handleVisualFeedback(selectedBtn, isCorrect, qData.correct, false);
        
        // Short delay to allow visual feedback before transition
        setTimeout(() => {
            if (State.currentIndex < State.sessionSet.length - 1) {
                State.currentIndex++;
                renderQuestion();
            } else {
                initiateReview();
            }
        }, 500);
        
    } else if (State.currentIndex === State.sessionSet.length - 1) {
        // Allow moving to review even if the last question is skipped
        initiateReview();
    } else {
        alert("Please select an answer or use the Skip button.");
    }
}

function handleVisualFeedback(selectedBtn, isCorrect, correctAnswer, isReview) {
    // Show correct/wrong answer
    selectedBtn.classList.remove('selected');
    if (isCorrect) {
        selectedBtn.classList.add('right');
        if (!isReview) playAudio('success');
    } else {
        selectedBtn.classList.add('wrong');
        if (!isReview) playAudio('error');
        // Highlight the correct option in green
        const correctBtn = Array.from(document.querySelectorAll('.opt-btn')).find(b => b.innerText === correctAnswer);
        if (correctBtn) correctBtn.classList.add('right');
    }
}

function disableQuestionInteraction(lock) {
    document.querySelectorAll('.opt-btn').forEach(btn => btn.disabled = lock);
    document.getElementById('clear-btn').disabled = lock;
    document.getElementById('skip-btn').disabled = lock;
}

function clearSelection() {
    // Clear selection if not locked
    document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    document.getElementById('next-btn').disabled = true;
    State.quizState[State.currentIndex].answer = null;
}

function skipQuestion() {
    const sessionQ = State.quizState[State.currentIndex];
    if (sessionQ.isCorrect === null) {
        // Mark as skipped
        sessionQ.answer = 'SKIPPED';
        sessionQ.isCorrect = null;
        sessionQ.answeredTime = 0;
    }
    
    if (State.currentIndex < State.sessionSet.length - 1) {
        State.currentIndex++;
        renderQuestion();
    } else {
        initiateReview();
    }
}

function prevQuestion() {
    if (State.currentIndex > 0) {
        State.currentIndex--;
        renderQuestion();
    }
}

function initiateReview() {
    clearInterval(State.timerInt);
    // This is the placeholder for the comprehensive review screen
    const correctCount = State.quizState.filter(q => q.isCorrect === true).length;
    alert(`Quiz Complete! Score: ${correctCount}/${State.sessionSet.length}. Initiating Review Mode.`);
    switchView('hub-view'); // Fallback to hub for now
}

function startTimer() {
    State.quizStartTime = Date.now();
    State.timerInt = setInterval(() => {
        if (!State.isPaused) {
            State.seconds++;
            const minutes = String(Math.floor(State.seconds / 60)).padStart(2, '0');
            const secs = String(State.seconds % 60).padStart(2, '0');
            document.getElementById('timer').innerText = `${minutes}:${secs}`;
        }
    }, 1000);
}

function togglePause() {
    State.isPaused = !State.isPaused;
    const btn = document.getElementById('pause-btn');
    btn.innerText = State.isPaused ? '▶️' : '⏸️';
}

function updateProgressBar() {
    const answeredCount = State.quizState.filter(q => q.isCorrect !== null).length;
    const progress = (answeredCount / State.sessionSet.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
}


// Mock Data Function (Source of Truth)
function generateMockData(num) {
    return Array.from({length: num}, (_, i) => ({
        question: `Sample Concept ${i+1}: What is the primary function of this subject?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: (i % 3 === 0) ? "Option B" : "Option A", // Ensures mix of correct answers
        pdf_ref: `Page ${Math.floor(i/2) + 1}`,
        pexels_query: "education" 
    }));
}