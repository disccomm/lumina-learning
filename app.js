// --- CONFIGURATION & STATE (V12.0 Stable) ---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
// Loads Pexels key from storage if present
let PEXELS_API_KEY = localStorage.getItem('pexelsKey') || PEXELS_API_KEY_DEFAULT; 
const State = {
    db: [], // Holds all loaded questions (50 simulated real)
    sessionSet: [], // Current set of questions for the quiz
    currentIndex: 0,
    seconds: 0,
    timerInt: null,
    quizState: [], // Persistence state for current quiz
    isPaused: false,
    quizStartTime: 0,
    isRetrySession: false 
};

// --- INITIALIZATION AND UI BINDINGS ---

function playAudio(type) {
    console.log(`Audio Feedback: ${type}`);
}

document.addEventListener('DOMContentLoaded', () => {
    const ageRange = document.getElementById('age-range');
    const ageVal = document.getElementById('age-val');
    ageVal.innerText = ageRange.value + ' yrs';
    ageRange.addEventListener('input', (e) => {
        ageVal.innerText = e.target.value + ' yrs';
    });

    document.getElementById('pdf-file').addEventListener('change', (e) => {
        const fileName = e.target.files[0] ? e.target.files[0].name : "Tap to Upload PDF";
        document.getElementById('file-status').innerText = fileName;
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }
});

// --- CORE FUNCTIONS (Processing, Navigation, and Settings) ---

// V12.0 Fix: Robust check for file input and topic name
function processAndLoad() {
    const fileInput = document.getElementById('pdf-file');
    const topic = document.getElementById('topic-name').value;
    const processButton = document.querySelector('.primary-btn');

    // D12.2 Fix: Check both the file object (length) and the topic text
    if (!topic || topic.trim() === "") {
        alert("Please provide a Topic Name first.");
        return;
    }
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select a PDF file before building the library.");
        return;
    }
    
    document.getElementById('file-status').innerHTML = "⏳ **Analyzing Content and Generating Questions...**";
    processButton.disabled = true;

    // Simulates AI processing time (3 seconds)
    setTimeout(() => {
        // V11.0: Call the generator with the user's topic
        State.db = generateMockData(50, topic); 
        
        document.getElementById('action-tiles').classList.remove('hidden');
        document.getElementById('file-status').innerHTML = `✅ **Ready! 50 Questions Loaded for ${topic}.**`;
        processButton.disabled = false;
        
    }, 3000); 
}

function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function openQuizConfig() {
    const max = State.db.length;
    if (max === 0) {
        alert("Please click 'Build My Library' first!");
        return;
    }
    
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'Start Quiz Session';
    
    modalActionBtn.classList.remove('hidden');
    modalActionBtn.innerText = 'Start Quiz';
    modalActionBtn.onclick = startQuiz;
    
    modalBody.innerHTML = `
        <p>Questions in bank: ${max}</p>
        <div class="input-group">
            <label for="q-count">Select Questions (1-${max}):</label>
            <input type="number" id="q-count" value="10" min="1" max="${max}" class="glass-input">
        </div>
    `;
    
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
    
    setupQuizSession(count);
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
}

function generateWorksheets() {
    if (State.db.length === 0) {
        alert("Please build your library first!");
        return;
    }
    alert("Worksheets PDF Generated! (Simulated)"); 
}

// V12.0 Fix: Ensures modal action button is active for saving settings
function openSettingsModal() {
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'App Settings';
    
    modalActionBtn.classList.remove('hidden'); 
    modalActionBtn.innerText = 'Save Settings';
    modalActionBtn.onclick = saveSettings; 
    
    modalBody.innerHTML = `
        <h3>Image Service (Pexels)</h3>
        <p>Key is required for external visual aids.</p>
        <div class="input-group">
            <label for="pexels-key">API Key:</label>
            <input type="text" id="pexels-key" class="glass-input" placeholder="Paste Key here..." value="${PEXELS_API_KEY === PEXELS_API_KEY_DEFAULT ? '' : PEXELS_API_KEY}">
        </div>
    `;
    
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveSettings() {
    const keyInput = document.getElementById('pexels-key');
    if (!keyInput) {
        document.getElementById('modal-overlay').classList.add('hidden');
        return;
    }
    
    const key = keyInput.value.trim();
    
    if (key.length > 10) {
        PEXELS_API_KEY = key;
        localStorage.setItem('pexelsKey', key);
    } else if (key === "") {
        PEXELS_API_KEY = PEXELS_API_KEY_DEFAULT;
        localStorage.removeItem('pexelsKey');
    }

    document.getElementById('modal-overlay').classList.add('hidden');
}

// --- IMAGE LOADING ---

function getPexelsImageUrl(query) {
    if (PEXELS_API_KEY && PEXELS_API_KEY !== PEXELS_API_KEY_DEFAULT) {
        // Simulated success for external image load (CORS/API pipeline)
        return 'https://picsum.photos/400/200?random=' + Math.floor(Math.random() * 100); 
    }
    // Return a local placeholder
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect fill="#DDD" width="100" height="50"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#555">Visual Aid Placeholder</text></svg>';
}

// --- QUIZ INTERACTION LOGIC ---

function setupQuizSession(count) {
    State.sessionSet = [...State.db].sort(() => 0.5 - Math.random()).slice(0, count);
    State.currentIndex = 0;
    State.quizState = State.sessionSet.map((q, index) => ({
        id: index, 
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
    
    document.