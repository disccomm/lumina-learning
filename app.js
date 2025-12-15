// --- CONFIGURATION & STATE (V17.0) ---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
let PEXELS_API_KEY = localStorage.getItem('pexelsKey') || PEXELS_API_KEY_DEFAULT; 
const State = {
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

// --- INITIALIZATION AND UI BINDINGS (No significant change) ---

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

// --- HELPER: Use Custom Modal instead of Native alert() ---

function openConfirmationModal(title, bodyText, actionText, actionFn) {
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = title;
    
    modalActionBtn.classList.remove('hidden');
    modalActionBtn.innerText = actionText;
    modalActionBtn.onclick = () => {
        document.getElementById('modal-overlay').classList.add('hidden');
        if (actionFn) actionFn(); 
    };
    
    modalBody.innerHTML = `<p>${bodyText}</p>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

// --- CORE FUNCTIONS (Processing, Navigation, and Settings) ---

async function processAndLoad() {
    // ... (Code is identical to V16.0 for AI architecture)
    const fileInput = document.getElementById('pdf-file');
    const topic = document.getElementById('topic-name').value;
    const processButton = document.querySelector('.primary-btn');
    const aiStatus = document.getElementById('ai-status');

    if (!topic || topic.trim() === "") {
        openConfirmationModal("Topic Required", "Please provide a Topic Name first.", "OK");
        return;
    }
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        openConfirmationModal("File Required", "Please select a PDF file before building the library.", "OK");
        return;
    }
    
    processButton.disabled = true;
    
    try {
        aiStatus.innerText = "1. ⬆️ Uploading PDF to AI Server...";
        
        const quizData = await AIExtractionService(topic, aiStatus);
        
        State.db = quizData; 
        
        document.getElementById('action-tiles').classList.remove('hidden');
        document.getElementById('file-status').innerText = fileInput.files[0].name;
        aiStatus.innerText = `✅ Success! ${quizData.length} Questions Loaded for ${topic}.`;
        
    } catch (error) {
        aiStatus.innerText = `❌ Error: ${error.message}`;
        openConfirmationModal("AI Processing Failed", "Check your network or ensure the file is valid.", "Close");
        console.error("AI Mock Service Error:", error);
    } finally {
        processButton.disabled = false;
    }
}

function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function openQuizConfig() {
    const max = State.db.length;
    if (max === 0) {
        openConfirmationModal("Library Empty", "Please click 'Build My Library' first!", "OK");
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
        openConfirmationModal("Invalid Count", `Invalid count. Must be between 1 and ${max}.`, "Close");
        return;
    }
    
    document.getElementById('modal-overlay').classList.add('hidden');
    
    setupQuizSession(count);
    if (!document.getElementById('question-card-shell')) {
        renderQuizShell(); 
    }
    switchView('quiz-view');
    renderQuestion();
    startTimer();
}

// V17.0: Use Custom Modal instead of Alert
function startFlashcards() {
    if (State.db.length === 0) {
        openConfirmationModal("Library Empty", "Please build your library first!", "OK");
        return;
    }
    // Simulate complex view change and initialization
    openConfirmationModal("Flashcards View", "Flashcards Session Initialized! (Simulated)", "Start Cards"); 
    // switchView('flashcards-view'); // Uncomment when view is built
}

// V17.0: Use Custom Modal instead of Alert
function generateWorksheets() {
    if (State.db.length === 0) {
        openConfirmationModal("Library Empty", "Please build your library first!", "OK");
        return;
    }
    // Simulate PDF generation process
    openConfirmationModal("Worksheet Generated", "Worksheets PDF Generated! (Simulated). Check your downloads.", "Done"); 
}

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

// --- IMAGE LOADING (MOCK SERVICE) ---

function MockImageService(query) {
    const id = btoa(query).substring(0, 10);
    return {
        id: id,
        url: `https://picsum.photos/400/200?random=${id}`
    };
}

function getQuestionImage(query) {
    if (PEXELS_API_KEY && PEXELS_API_KEY !== PEXELS_API_KEY_DEFAULT) {
        return MockImageService(query).url; 
    }
    
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

function renderQuizShell() {
    const container = document.getElementById('quiz-content');
    container.innerHTML = `
        <div id="question-card-shell" class="question-card glass">
            <img id="q-img" src="" alt="Visual aid for question" class="q-img">
            <h3 id="q-header"></h3>
            <p id="q-text"></p>
            <div id="options-list" class="options-list">
                </div>
        </div>
    `;
}

function renderQuestion() {
    const qData = State.sessionSet[State.currentIndex];
    const sessionQ = State.quizState[State.currentIndex];
    const optionsContainer = document.getElementById('options-list');

    document.getElementById('q-img').src = getQuestionImage(qData.pexels_query);
    // V17.0 FIX: Remove question number from quiz view
    document.getElementById('q-header').innerText = `Question: ${qData.question_topic || 'Topic Title'}`; 
    document.getElementById('q-text').innerText = qData.question;
    
    optionsContainer.innerHTML = sessionQ.options.map(opt => `
        <button class="opt-btn" onclick="selectAnswer(this, '${opt}')">
            ${opt}
        </button>
    `).join('');

    const nextBtn = document.getElementById('next-btn');
    document.getElementById('prev-btn').disabled = (State.currentIndex === 0);
    
    if (State.currentIndex === State.sessionSet.length - 1) {
        nextBtn.innerText = 'Review';
        nextBtn.classList.add('review-state');
    } else {
        nextBtn.innerText = 'Next';
        nextBtn.classList.remove('review-state');
    }
    nextBtn.onclick = handleNext;
    
    if (sessionQ.isCorrect !== null) {
        const selectedBtn = Array.from(optionsContainer.querySelectorAll('.opt-btn')).find(b => b.innerText === sessionQ.answer);
        if (selectedBtn) {
            handleVisualFeedback(selectedBtn, sessionQ.isCorrect, qData.correct, true); 
        }
        disableQuestionInteraction(true); 
        document.getElementById('next-btn').disabled = false;
    } else {
        if (sessionQ.answer && sessionQ.answer !== 'SKIPPED') {
             const selectedBtn = Array.from(optionsContainer.querySelectorAll('.opt-btn')).find(b => b.innerText === sessionQ.answer);
             if (selectedBtn) selectedBtn.classList.add('selected');
             document.getElementById('next-btn').disabled = false;
        } else {
             document.getElementById('next-btn').disabled = true;
        }
        disableQuestionInteraction(false); 
    }
    
    updateProgressBar();
}
// ... (selectAnswer, handleNext, handleVisualFeedback, disableQuestionInteraction, clearSelection, skipQuestion, prevQuestion are unchanged) ...

function selectAnswer(btn, choice) {
    const sessionQ = State.quizState[State.currentIndex];
    
    document.querySelectorAll('#options-list .opt-btn').forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    btn.classList.add('selected');
    
    sessionQ.answer = choice; 
    document.getElementById('next-btn').disabled = false;
}

function handleNext() {
    const sessionQ = State.quizState[State.currentIndex];
    const qData = State.sessionSet[State.currentIndex];
    const selectedBtn = document.querySelector('#options-list .opt-btn.selected');
    
    if (selectedBtn) {
        const choice = selectedBtn.innerText;
        const isCorrect = (choice === qData.correct);
        
        sessionQ.answer = choice;
        sessionQ.isCorrect = isCorrect;
        sessionQ.answeredTime = Date.now() - State.quizStartTime; 
        
        handleVisualFeedback(selectedBtn, isCorrect, qData.correct, false);
        
        setTimeout(() => {
            if (State.currentIndex < State.sessionSet.length - 1) {
                State.currentIndex++;
                renderQuestion();
            } else {
                initiateReview();
            }
        }, 500);
        
    } else if (State.currentIndex === State.sessionSet.length - 1) {
        initiateReview();
    } else {
        openConfirmationModal("Selection Missing", "Please select an answer or use the Skip button.", "OK");
    }
}

function handleVisualFeedback(selectedBtn, isCorrect, correctAnswer, isReview) {
    selectedBtn.classList.remove('selected');
    if (isCorrect) {
        selectedBtn.classList.add('right');
        if (!isReview) playAudio('success');
    } else {
        selectedBtn.classList.add('wrong');
        if (!isReview) playAudio('error');
        const correctBtn = Array.from(document.querySelectorAll('#options-list .opt-btn')).find(b => b.innerText === correctAnswer);
        if (correctBtn) correctBtn.classList.add('right');
    }
}

function disableQuestionInteraction(lock) {
    document.querySelectorAll('#options-list .opt-btn').forEach(btn => btn.disabled = lock);
    document.getElementById('clear-btn').disabled = lock;
    document.getElementById('skip-btn').disabled = lock;
}

function clearSelection() {
    document.querySelectorAll('#options-list .opt-btn').forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    document.getElementById('next-btn').disabled = true;
    State.quizState[State.currentIndex].answer = null;
}

function skipQuestion() {
    const sessionQ = State.quizState[State.currentIndex];
    if (sessionQ.isCorrect === null) {
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
// --- REVIEW/SCORECARD LOGIC (No change) ---

function openExitConfirmation() {
    if (State.timerInt) {
        State.isPaused = true;
        document.getElementById('pause-btn').innerText = '▶️';
    }

    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'End Session?';
    
    modalActionBtn.classList.remove('hidden');
    modalActionBtn.innerText = 'Exit to Hub';
    // Action will switch to hub, but after review (initiateReview calls switchView('hub-view') if not final question)
    modalActionBtn.onclick = initiateReview; 
    
    modalBody.innerHTML = `<p>Are you sure you want to exit the quiz? Your current progress will be lost.</p>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}


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
    
    if (document.querySelector('#quiz-view').classList.contains('active')) {
        switchView('review-view');
    } else {
        // This handles the Exit X from Quiz View flow
        switchView('hub-view');
    }
}

function retryWrongAnswers() {
    const wrongAnswers = State.quizState.filter(q => q.isCorrect === false);
    
    if (wrongAnswers.length === 0) {
        openConfirmationModal("No Mistakes!", "Great job! You have no incorrect answers to retry.", "OK");
        return;
    }
    
    const retrySet = wrongAnswers.map(q => State.sessionSet[q.id]);
    
    State.isRetrySession = true;
    State.sessionSet = retrySet;
    
    setupQuizSession(retrySet.length); 

    openConfirmationModal("Retrying...", `Retrying ${retrySet.length} incorrect answers...`, "Start");
    switchView('quiz-view');
    renderQuestion();
    startTimer();
}

// --- TIMER AND MOCK DATA ---
// ... (startTimer, togglePause, updateProgressBar are unchanged) ...

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


// MOCK AI EXTRACTION SERVICE (Promise-based for Backend Readiness)
function AIExtractionService(topic, aiStatus) {
    return new Promise(async (resolve, reject) => {
        await new Promise(r => setTimeout(r, 1000));
        aiStatus.innerText = "2. 🧠 Analyzing Text and Extracting Concepts...";

        if (topic.toUpperCase().includes('ERROR')) {
             reject(new Error("Simulated API failure: Cannot analyze content."));
             return;
        }

        await new Promise(r => setTimeout(r, 2000));
        aiStatus.innerText = "3. 📝 Formulating Questions and Answers...";

        await new Promise(r => setTimeout(r, 1000));
        
        const quizData = generateMockData(50, topic);
        resolve(quizData);
    });
}

// MOCK DATA GENERATION (Requires Server-Side PDF/AI for Real Content)
function generateMockData(num, topic) {
    if (!topic) topic = "General Science";
    return Array.from({length: num}, (_, i) => {
        // V17.0: Updated to reflect the topic dynamically in the mock question
        const questionText = `Question ${i + 1} from ${topic}: According to the provided source, what key term is associated with Page ${Math.floor(i / 2) + 1}?`;
        const correctAnswer = `Key Term ${i % 4 + 1}`;
        const options = ["Key Term 1", "Key Term 2", "Key Term 3", "Key Term 4"];
        
        if (!options.includes(correctAnswer)) {
             options[Math.floor(Math.random() * 4)] = correctAnswer;
        }

        return {
            question: questionText,
            options: options,
            correct: correctAnswer: ${correctAnswer}, 
            pdf_ref: `Page ${Math.floor(i / 2) + 1}`,
            pexels_query: topic.split(' ')[0],
            question_topic: topic // New field for clarity
        };
    });
}