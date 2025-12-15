// --- CONFIGURATION & STATE ---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
// Load key from storage, defaulting to PEXELS_API_KEY_DEFAULT
let PEXELS_API_KEY = localStorage.getItem('pexelsKey') || PEXELS_API_KEY_DEFAULT; 
const State = {
// ... (State variables remain the same) ...
    db: [],
    sessionSet: [], 
    currentIndex: 0,
    seconds: 0,
    timerInt: null,
    quizState: [], 
    isPaused: false,
    quizStartTime: 0,
    isRetrySession: false 
};

// --- INITIALIZATION AND UI BINDINGS ---
// ... (playAudio, DOMContentLoaded listeners remain the same) ...
document.addEventListener('DOMContentLoaded', () => {
    // ... (Age slider, PDF file, Service Worker listeners remain the same) ...

    // Pre-set input fields if we implement persistence here later
});

// V9.1 UX FIX: Function to open centralized Settings Modal
function openSettingsModal() {
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'App Settings';
    
    // Hide action button for settings modal unless needed
    modalActionBtn.classList.add('hidden');
    
    modalBody.innerHTML = `
        <h3>Image Service (Pexels)</h3>
        <p>Key is required for external visual aids.</p>
        <div class="input-group">
            <label for="pexels-key">API Key:</label>
            <input type="text" id="pexels-key" class="glass-input" placeholder="Paste Key here..." value="${PEXELS_API_KEY === PEXELS_API_KEY_DEFAULT ? '' : PEXELS_API_KEY}">
        </div>
    `;
    
    // Add event listener directly to input field for real-time persistence
    document.getElementById('pexels-key').addEventListener('input', saveApiKey);

    document.getElementById('modal-overlay').classList.remove('hidden');
}

// V9.1 UX FIX: Saves API key to local storage immediately upon input
function saveApiKey(e) {
    const key = e.target.value.trim();
    if (key.length > 10) {
        PEXELS_API_KEY = key;
        localStorage.setItem('pexelsKey', key);
        console.log("Pexels Key saved successfully to LocalStorage.");
    } else if (key === "") {
        PEXELS_API_KEY = PEXELS_API_KEY_DEFAULT;
        localStorage.removeItem('pexelsKey');
        console.log("Pexels Key cleared. Using default placeholder.");
    }
}


// --- IMAGE LOADING FIX (V9.1) ---

function getPexelsImageUrl(query) {
    if (PEXELS_API_KEY && PEXELS_API_KEY !== PEXELS_API_KEY_DEFAULT) {
        // Placeholder for Pexels API call (Simulates the fix for CORS/loading)
        // Note: Actual CORS fix is handled by Service Worker configuration and browser policy.
        return 'https://picsum.photos/400/200?random=' + Math.floor(Math.random() * 100); 
    }
    // Return a local placeholder
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><rect fill="#DDD" width="100" height="50"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="8" fill="#555">Visual Aid Placeholder</text></svg>';
}

// --- QUIZ INTERACTION LOGIC (V9.1 Refinements) ---

function renderQuestion() {
    const qData = State.sessionSet[State.currentIndex];
    const sessionQ = State.quizState[State.currentIndex];
    const container = document.getElementById('quiz-content');
    
    // ... (Navigation, image setup remain the same) ...

    document.getElementById('prev-btn').disabled = (State.currentIndex === 0);
    const nextBtn = document.getElementById('next-btn');
    
    // V9.1 UX FIX: Contextual coloring for Review button
    if (State.currentIndex === State.sessionSet.length - 1) {
        nextBtn.innerText = 'Review';
        nextBtn.classList.add('review-state');
    } else {
        nextBtn.innerText = 'Next';
        nextBtn.classList.remove('review-state');
    }
    nextBtn.onclick = handleNext;
    
    // ... (Inner HTML generation and persistence logic remains the same) ...
    
    // Final check for next button enablement
    if (sessionQ.isCorrect !== null || (sessionQ.answer && sessionQ.answer !== 'SKIPPED')) {
         document.getElementById('next-btn').disabled = false;
    } else {
         document.getElementById('next-btn').disabled = true;
    }
    
    updateProgressBar();
}


// --- REVIEW/SCORECARD LOGIC (V9.1 UX Enhancements) ---

function initiateReview() {
    clearInterval(State.timerInt);
    document.getElementById('modal-overlay').classList.add('hidden'); 

    const totalQuestions = State.sessionSet.length;
    const correctCount = State.quizState.filter(q => q.isCorrect === true).length;
    
    document.getElementById('review-score').innerText = `Score: ${correctCount} / ${totalQuestions}`;
    const totalTime = document.getElementById('timer').innerText;
    document.getElementById('review-time').innerText = `Total Time: ${totalTime}`;

    const summaryContainer = document.getElementById('review-summary');
    summaryContainer.innerHTML = '';
    
    State.quizState.forEach((sessionQ, index) => {
        const qData = State.sessionSet[index];
        let statusText = 'Skipped';
        let statusClass = 'skipped-card';
        
        if (sessionQ.isCorrect === true) {
            statusText = 'Correct ✅';
            statusClass = 'correct-card';
        } else if (sessionQ.isCorrect === false) {
            statusText = 'Incorrect ❌';
            statusClass = 'incorrect-card';
        }

        // V9.1 UX FIX: Improved visual structure for review cards
        summaryContainer.innerHTML += `
            <div class="review-card ${statusClass} glass">
                <h4>Q${index + 1}</h4>
                <p class="q-preview">${qData.question.substring(0, 70)}...</p>
                <p><strong>Status:</strong> ${statusText}</p>
                ${sessionQ.isCorrect !== true ? `
                    <p><strong>Correct:</strong> ${qData.correct}</p>
                ` : ''}
                <p class="source">Source: ${qData.pdf_ref}</p>
            </div>
        `;
    });

    switchView('review-view');
}

// ... (Other functions remain the same: openExitConfirmation, startQuiz, etc.) ...