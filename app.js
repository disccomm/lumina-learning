// --- CONFIGURATION & STATE (V21.0 Stable) ---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
let PEXELS_API_KEY = localStorage.getItem('pexelsKey') || PEXELS_API_KEY_DEFAULT; 

let isDarkMode = localStorage.getItem('isDarkMode') === 'true';
let fontSize = localStorage.getItem('fontSize') || 16;
let topicName = localStorage.getItem('topicName') || '';

// V21.0: Simulated Content Assimilation
const ASSIMILATED_CONTENT = [
    { page: 1, concept: "Quantum Entanglement", definition: "A phenomenon where two or more particles are linked in such a way that measuring the property of one instantly influences the property of the others, regardless of the distance between them.", keywords: ["superposition", "non-local", "measurement"] },
    { page: 5, concept: "The Doppler Effect", definition: "The change in frequency or wavelength of a wave in relation to an observer who is moving relative to the wave source.", keywords: ["frequency", "wavelength", "redshift", "blueshift"] },
    { page: 12, concept: "Photosynthesis", definition: "The process used by plants and other organisms to convert light energy into chemical energy that can later be released to fuel the organism's activities.", keywords: ["chlorophyll", "glucose", "carbon dioxide"] },
    { page: 20, concept: "Defensive Cyber Ops", definition: "A strategy focused on protecting networks, systems, and programs from digital attacks, involving monitoring, detection, and response protocols.", keywords: ["firewall", "SIEM", "zero trust"] },
    { page: 33, concept: "The Zero Trust Model", definition: "An IT security framework requiring all users, whether inside or outside the organization's network, to be authenticated, authorized, and continuously validated before being granted or maintaining access to applications and data.", keywords: ["authentication", "authorization", "continuous validation"] }
];

// V21.0: Knowledge Zone Definition
const KNOWLEDGE_ZONES = {
    Explorer: { min: 5, max: 10, prompt: "Basic Recall/Definition" },
    Creator: { min: 11, max: 15, prompt: "Application/Analysis" },
    Innovator: { min: 16, max: 25, prompt: "Evaluation/Synthesis" }
};

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

// --- CORE UTILITIES ---

function playAudio(type) {
    console.log(`Audio Feedback: ${type}`);
}

function getKnowledgeZone(age) {
    const ageInt = parseInt(age);
    if (ageInt >= KNOWLEDGE_ZONES.Innovator.min) return 'Innovator';
    if (ageInt >= KNOWLEDGE_ZONES.Creator.min) return 'Creator';
    return 'Explorer';
}

function applyTheme() {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.documentElement.style.setProperty('--base-font-size', `${parseInt(fontSize)}px`); 

    const ageRange = document.getElementById('age-range');
    if (ageRange) {
        const zone = getKnowledgeZone(ageRange.value);
        document.querySelector('.welcome-text').innerText = `Welcome back, ${zone}!`;
    }
}

function toggleActionTiles(enable) {
    const tiles = document.getElementById('action-tiles');
    if (tiles) {
        tiles.classList.toggle('disabled', !enable);
    }
}

// --- INITIALIZATION AND UI BINDINGS (V21.0: Knowledge Zone Fix) ---

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    
    const topicInput = document.getElementById('topic-name');
    if (topicInput) {
        topicInput.value = topicName;
        topicInput.addEventListener('input', (e) => {
            topicName = e.target.value;
            localStorage.setItem('topicName', topicName);
        });
    }

    // V21.0: Age Slider Fix - Update text to show age and Zone
    const ageRange = document.getElementById('age-range');
    const ageVal = document.getElementById('age-val');
    const welcomeText = document.querySelector('.welcome-text');
    const storedAge = localStorage.getItem('ageRange') || 10;
    
    if (ageRange && ageVal) {
        ageRange.value = storedAge;
        const zone = getKnowledgeZone(storedAge);
        ageVal.innerText = `${storedAge} yrs (${zone})`;
        welcomeText.innerText = `Welcome back, ${zone}!`;
        
        ageRange.addEventListener('input', (e) => {
            const val = e.target.value;
            const newZone = getKnowledgeZone(val);
            ageVal.innerText = `${val} yrs (${newZone})`;
            welcomeText.innerText = `Welcome back, ${newZone}!`;
            localStorage.setItem('ageRange', val); 
        });
    }

    const fileInput = document.getElementById('pdf-file');
    const fileStatus = document.getElementById('file-status');
    if (fileInput && fileStatus) {
        document.getElementById('pdf-file').addEventListener('change', (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : "Tap to Upload PDF";
            fileStatus.innerText = fileName;
        });
    }

    if (State.db.length > 0) {
        toggleActionTiles(true);
    }
});

// --- HELPER: Custom Modal (No Change) ---

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

// --- AI INTELLIGENT SERVICE (V21.0: Real Content Simulation) ---

function AIExtractionService(topic, aiStatus) {
    return new Promise(async (resolve, reject) => {
        
        const age = localStorage.getItem('ageRange') || 10;
        const zone = getKnowledgeZone(age);
        const zonePrompt = KNOWLEDGE_ZONES[zone].prompt;

        await new Promise(r => setTimeout(r, 1000));
        aiStatus.innerText = "2. 📄 Segmenting and Assimilating PDF Content...";

        if (topic.toUpperCase().includes('ERROR')) {
             reject(new Error("Simulated API failure: Cannot analyze content."));
             return;
        }

        await new Promise(r => setTimeout(r, 2000));
        aiStatus.innerText = "3. 🧠 Applying " + zonePrompt + " logic to formulate questions...";

        await new Promise(r => setTimeout(r, 1000));
        
        const quizData = generateIntelligentQuestions(50, topic, zone);
        resolve(quizData);
    });
}

function generateIntelligentQuestions(num, topic, zone) {
    if (!topic) topic = "General Science";
    const contentPool = ASSIMILATED_CONTENT;
    
    // Commands based on complexity (Bloom's Taxonomy Simulation)
    const complexityCommands = {
        Explorer: ['Define', 'What is the purpose of', 'Identify the primary component of'], 
        Creator: ['Explain how', 'Apply the principle of', 'Compare and contrast'], 
        Innovator: ['Evaluate the effectiveness of', 'Justify the use of', 'Synthesize a solution using']
    }[zone];

    const questions = [];
    
    for (let i = 0; i < num; i++) {
        const contentItem = contentPool[i % contentPool.length]; 
        const command = complexityCommands[i % complexityCommands.length];
        
        let questionText;
        let correctAnswer;
        
        // V21.0: Question tailoring based on zone command
        if (command.includes('Define') || command.includes('What is the purpose of') || command.includes('Identify')) {
            questionText = `According to the source, ${command.toLowerCase()} ${contentItem.concept}?`;
            correctAnswer = contentItem.definition.split('that')[0].trim() + "."; 
        } else if (command.includes('Apply') || command.includes('Explain') || command.includes('Compare')) {
            questionText = `Using the principles of ${contentItem.concept}, ${command.toLowerCase()} the relationship between ${contentItem.keywords[0]} and ${contentItem.keywords[1]}.`;
            correctAnswer = `It involves ${contentItem.keywords[2]} as a result of the core ${contentItem.concept} principle.`;
        } else if (command.includes('Evaluate') || command.includes('Justify') || command.includes('Synthesize')) {
            questionText = `${command} the use of ${contentItem.concept} in real-world security models, referencing ${contentItem.keywords[0]}.`;
            correctAnswer = `The evaluation focuses on ${contentItem.keywords[1]} over ${contentItem.keywords[2]} to maintain security posture.`;
        }

        // Generate options: Correct answer + 3 distractors
        const options = [correctAnswer, `A completely unrelated fact about ${contentPool[(i+1) % contentPool.length].concept}.`, `An incorrect statement about ${contentItem.concept}.`, `A distractor using the term ${contentItem.keywords[0]} incorrectly.`];
        
        const finalOptions = options.sort(() => 0.5 - Math.random()).slice(0, 4);
        if (!finalOptions.includes(correctAnswer)) {
            finalOptions[Math.floor(Math.random() * 4)] = correctAnswer;
        }

        questions.push({
            question: questionText,
            options: finalOptions,
            correct: correctAnswer, 
            pdf_ref: `Page ${contentItem.page} (Concept: ${contentItem.concept})`, 
            pexels_query: contentItem.concept.split(' ')[0],
            question_topic: topic 
        });
    }

    return questions;
}

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


// --- HUB ACTIONS (No change) ---

async function processAndLoad() {
    const fileInput = document.getElementById('pdf-file');
    const processButton = document.querySelector('.primary-btn');
    const aiStatus = document.getElementById('ai-status');

    if (!topicName || topicName.trim() === "") {
        openConfirmationModal("Topic Required", "Please provide a Topic Name first.", "OK");
        return;
    }
    if (!fileInput.files || fileInput.files.length === 0) {
        openConfirmationModal("File Required", "Please select a PDF file before building the library.", "OK");
        return;
    }
    
    processButton.disabled = true;
    
    try {
        aiStatus.innerText = "1. ⬆️ Uploading PDF to AI Server...";
        
        const quizData = await AIExtractionService(topicName, aiStatus);
        
        State.db = quizData; 
        
        document.getElementById('file-status').innerText = fileInput.files[0].name;
        aiStatus.innerText = `✅ Success! ${quizData.length} Tailored Questions Loaded for ${topicName}.`;
        
        toggleActionTiles(true);
        
    } catch (error) {
        aiStatus.innerText = `❌ Error: ${error.message}`;
        openConfirmationModal("AI Processing Failed", `Check your network or ensure the file is valid. Error: ${error.message}`, "Close");
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
            <input type="number" id="q-count" value="${Math.min(10, max)}" min="1" max="${max}" class="glass-input">
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

function startFlashcards() {
    if (State.db.length === 0) {
        openConfirmationModal("Library Empty", "Please build your library first!", "OK");
        return;
    }
    openConfirmationModal("Flashcards View", "Flashcards Session Initialized! (Simulated)", "Start Cards"); 
}

function generateWorksheets() {
    if (State.db.length === 0) {
        openConfirmationModal("Library Empty", "Please build your library first!", "OK");
        return;
    }
    openConfirmationModal("Worksheet Generated", "Worksheets PDF Generated! (Simulated). Check your downloads.", "Done"); 
}


// --- SETTINGS (V20.0: UX Refinement) ---

function openSettingsModal() {
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'App Settings';
    
    modalActionBtn.classList.remove('hidden'); 
    modalActionBtn.innerText = 'Save Settings';
    modalActionBtn.onclick = saveSettings; 
    
    modalBody.innerHTML = `
        <div class="setting-group">
            <h3>Appearance</h3>
            <div class="zone-selector">
                <label>Dark Mode</label>
                <input type="checkbox" id="dark-mode-toggle" ${isDarkMode ? 'checked' : ''}>
            </div>
            <div class="zone-selector">
                <label>Font Size</label>
                <input type="range" id="font-size-range" min="14" max="20" value="${fontSize}">
                <span id="font-size-val">${fontSize}px</span>
            </div>
            <div class="input-group">
                <label for="pexels-key">Pexels API Key:</label>
                <input type="text" id="pexels-key" class="glass-input" placeholder="Paste Key here..." value="${PEXELS_API_KEY === PEXELS_API_KEY_DEFAULT ? '' : PEXELS_API_KEY}">
                <small>Required for external visual aids. Saved locally.</small>
            </div>
        </div>
        
        <div class="setting-group signout-section">
            <button class="signout-btn" onclick="signOut()">Sign Out & Reset</button>
        </div>
    `;

    const fontSizeRange = document.getElementById('font-size-range');
    const fontSizeVal = document.getElementById('font-size-val');
    
    if (fontSizeRange && fontSizeVal) {
        fontSizeRange.addEventListener('input', (e) => {
            const newSize = e.target.value;
            fontSizeVal.innerText = newSize + 'px';
            document.documentElement.style.setProperty('--base-font-size', `${newSize}px`);
        });
    }
    
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function saveSettings() {
    const keyInput = document.getElementById('pexels-key');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const fontSizeRange = document.getElementById('font-size-range');

    // 1. PEXELS KEY
    const key = keyInput.value.trim();
    if (key.length > 10) {
        PEXELS_API_KEY = key;
        localStorage.setItem('pexelsKey', key);
    } else if (key === "") {
        PEXELS_API_KEY = PEXELS_API_KEY_DEFAULT;
        localStorage.removeItem('pexelsKey');
    }

    // 2. DARK MODE
    isDarkMode = darkModeToggle.checked;
    localStorage.setItem('isDarkMode', isDarkMode);
    
    // 3. FONT SIZE
    fontSize = parseInt(fontSizeRange.value);
    localStorage.setItem('fontSize', fontSize);

    // Apply the final theme and close
    applyTheme();
    document.getElementById('modal-overlay').classList.add('hidden');
}

function signOut() {
    openConfirmationModal(
        "Sign Out", 
        "Are you sure you want to sign out? This will clear all local data (API key, settings, and library) and reset the app.", 
        "Confirm Sign Out", 
        () => {
            localStorage.clear();
            window.location.reload(); 
        }
    );
}


// --- QUIZ INTERACTION LOGIC (V20.0: Clear Button Fix) ---

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
    document.getElementById('q-header').innerText = `Question ${State.currentIndex + 1} of ${State.sessionSet.length}`; 
    document.getElementById('q-text').innerText = qData.question;
    
    optionsContainer.innerHTML = sessionQ.options.map(opt => `
        <button class="opt-btn" onclick="selectAnswer(this, decodeURIComponent('${encodeURIComponent(opt)}'))">
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
        // V21.0: Using encoded answer for comparison
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
    const sessionQ = State.quizState[State.currentIndex];
    
    // V20.0: Clear Button Fix - Ensure all selected classes are removed and state is reset
    document.querySelectorAll('#options-list .opt-btn').forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    
    sessionQ.answer = null;
    sessionQ.isCorrect = null;
    sessionQ.answeredTime = null;

    document.getElementById('next-btn').disabled = true;
    disableQuestionInteraction(false);
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

    openConfirmationModal("Retrying...", `Retrying ${retrySet.length} incorrect answers...`, "Start Quiz", () => {
        switchView('quiz-view');
        renderQuestion();
        startTimer();
    });
}

// --- TIMER LOGIC (No change) ---

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