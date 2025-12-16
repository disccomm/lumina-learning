// --- CONFIGURATION ---
const CONFIG = {
    model: "Phi-3-mini-4k-instruct-q4f16_1-MLC", 
    pexelsKey: "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM" // <-- ADD YOUR KEY HERE
    MAX_INFERENCE_RETRIES: 3 // New: Retry mechanism for unstable JSON
};

const State = {
    engine: null, 
    isEngineLoaded: false,
    questions: [],
    currentQIndex: 0,
    quizResults: [], // New: Store results for summary
    settings: {
        username: localStorage.getItem("lumina_user") || "Student",
        age: parseInt(localStorage.getItem("lumina_age")) || 12
    },
    // New: Stored file data for easy re-access
    lastFile: JSON.parse(localStorage.getItem("lumina_file")) || null,
};

const UI = {
    btn: document.getElementById('generate-btn'),
    status: document.getElementById('system-status'),
    loader: document.getElementById('ai-loader-bar'),
    loadContainer: document.getElementById('ai-progress-container'),
    fileInput: document.getElementById('file-upload'),
    topicInput: document.getElementById('topic-input'),
    dropZone: document.getElementById('drop-zone'),
    // New UI elements
    quizSummaryModal: document.getElementById('quiz-summary-modal'),
    toast: document.getElementById('toast-message'),
    clearBtn: document.getElementById('clear-source-btn')
};

// --- UTILITY 1: JSON REPAIR FUNCTION (CRITICAL FOR STABILITY) ---
function safelyParseJSON(rawStr) {
    if (!rawStr) throw new Error("Empty AI response received.");

    let start = rawStr.indexOf('[');
    let end = rawStr.lastIndexOf(']') + 1;

    if (start === -1 || end === 0 || end <= start) {
        throw new Error("AI output lacks valid array markers ([...]).");
    }
    
    let jsonStr = rawStr.substring(start, end);

    try {
        // Fix 1: Remove trailing commas before a closing bracket or curly brace.
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1'); 

        // Fix 2: Remove leading/trailing quotes or backticks.
        jsonStr = jsonStr.trim().replace(/^`+|`+$/g, '');

        return JSON.parse(jsonStr);

    } catch (e) {
        console.error("Critical JSON Repair Failed:", e);
        throw new Error(`Syntax error in AI-generated JSON: ${e.message}`);
    }
}

// --- UTILITY 2: TOAST NOTIFICATION (Replaces Popups) ---
function showToast(message, type = 'info') {
    UI.toast.innerText = message;
    UI.toast.className = `toast ${type}`;
    UI.toast.classList.remove('hidden');
    setTimeout(() => {
        UI.toast.classList.add('hidden');
    }, 3000);
}


// --- CORE 1: PDF EXTRACTION ---
async function extractTextFromPDF(file, onProgress) {
    const safeProgress = (msg) => typeof onProgress === 'function' ? onProgress(msg) : console.log(msg);

    try {
        if (!window.pdfjsLib) throw new Error("PDF Engine not ready.");
        
        safeProgress("Scanning PDF Structure...");
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = "";
        
        const limit = Math.min(pdf.numPages, 5); // Limit scanning to first 5 pages for speed
        
        for (let i = 1; i <= limit; i++) {
            safeProgress(`Reading Page ${i} of ${limit}...`);
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(" ") + " ";
        }
        
        return fullText;
    } catch (e) {
        throw new Error("PDF Read Failed: " + e.message);
    }
}

// --- CORE 2: AI ENGINE ---
async function getAIEngine(onProgress) {
    if (State.engine && State.isEngineLoaded) {
        onProgress("AI Engine ready (Instant Load).", 100);
        return State.engine;
    }
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported. Use Chrome/Edge on Desktop/Android.");
    }
    
    onProgress("Booting GPU Engine: This is a one-time download for first use.", 10);

    const engine = new window.webllm.MLCEngine();
    
    engine.setInitProgressCallback((report) => {
        let percentage = report.progress * 100;
        let text = report.text;

        if (text.includes("Fetching")) text = "First time user - One time load...";
        if (text.includes("Loading")) text = "Loading into GPU VRAM...";
        
        onProgress(text, percentage);
    });

    await engine.reload(CONFIG.model);
    
    State.engine = engine;
    State.isEngineLoaded = true;
    return engine;
}

// New function with retry logic
async function attemptGenerateQuestions(topic, text, onProgress, attempt = 1) {
    const engine = await getAIEngine(onProgress);
    
    UI.loader.style.width = `0%`;
    onProgress(`AI is thinking... (Attempt ${attempt}/${CONFIG.MAX_INFERENCE_RETRIES})`, 0);

    const age = State.settings.age;
    const contextLimit = 1500;
    const textContext = text.substring(0, contextLimit);
    
    // Strengthened Prompt: Explicitly demand full option text, not just A, B, C, D
    const prompt = `
    Context: ${textContext}
    Topic: ${topic}
    Create 5 high-quality, multiple-choice questions for a ${age}-year-old student.
    Return ONLY a JSON Array. DO NOT include any text, notes, or explanations before or after the array.
    The 'opts' array MUST contain the full, descriptive text for each option, not just single letters (A, B, C, D).
    Format: [{"q": "Question Text", "opts": ["Option 1 Text","Option 2 Text","Option 3 Text","Option 4 Text"], "a": "Correct Option Text", "why": "Explanation Text"}]
    `;

    const response = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, 
    });

    const raw = response.choices[0].message.content;

    try {
        return safelyParseJSON(raw);
    } catch (e) {
        console.error(`AI Output Parse Failed (Attempt ${attempt}):`, e);
        if (attempt < CONFIG.MAX_INFERENCE_RETRIES) {
            onProgress(`Failed to parse AI response. Retrying (${attempt + 1}/${CONFIG.MAX_INFERENCE_RETRIES})...`, 0);
            await new Promise(resolve => setTimeout(resolve, 1000)); // wait a second before retry
            return attemptGenerateQuestions(topic, text, onProgress, attempt + 1);
        }
        throw new Error("AI failed to generate valid quiz questions after multiple retries.");
    }
}


// --- CORE 3: PEXELS IMAGE FETCH ---
async function fetchImageForTopic(topic) {
    if (!CONFIG.pexelsKey || CONFIG.pexelsKey === "YOUR_PEXELS_KEY_HERE") {
        return null;
    }
    // ... rest of Pexels logic remains the same ...
    try {
        const query = encodeURIComponent(topic);
        const url = `https://api.pexels.com/v1/search?query=${query}&per_page=1`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: CONFIG.pexelsKey
            }
        });

        if (!response.ok) return null;
        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            return data.photos[0].src.medium; 
        }
        return null;
    } catch (e) {
        return null;
    }
}


// --- CONTROLLER: MAIN LOGIC ---
async function handleBuild() {
    const file = UI.fileInput.files[0];
    const topic = UI.topicInput.value.trim(); 

    if (!file) return showToast("Please select a PDF file.", 'warning');
    if (!topic) return showToast("Please enter a topic.", 'warning');

    UI.btn.disabled = true;
    
    // CRITICAL FIX: Ensure UI is ready before calling status updates
    UI.status.classList.remove('hidden');
    UI.loadContainer.classList.remove('hidden');

    const updateStatus = (msg, percent = null) => {
        UI.status.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${msg}`;
        if (percent !== null) UI.loader.style.width = `${percent}%`;
    };

    try {
        // 1. Load AI Engine
        await getAIEngine(updateStatus);

        // 2. PDF
        UI.loader.style.width = `0%`;
        const text = await extractTextFromPDF(file, (msg) => updateStatus(msg, 10)); 

        // 3. AI Inference with Retries (New)
        State.questions = await attemptGenerateQuestions(topic, text, updateStatus);
        
        if (State.questions.length === 0) throw new Error("AI returned an empty question set.");

        // 4. PEXELS IMAGE FETCH
        updateStatus("Finalizing... Fetching visual context.");
        const imageUrl = await fetchImageForTopic(topic);
        
        if (State.questions.length > 0) {
            State.questions[0].imageUrl = imageUrl; 
        }
        
        // 5. Start Quiz
        showToast("Library built successfully!", 'success');
        startQuiz();

    } catch (err) {
        UI.status.innerHTML = `<span style="color:var(--error)">❌ Error: ${err.message}</span>`;
        UI.loader.style.background = 'var(--error)';
    } finally {
        UI.btn.disabled = false;
        UI.loader.style.width = '100%'; 
    }
}


// --- QUIZ & UI FUNCTIONS ---
function startQuiz() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-quiz').classList.remove('hidden-view');
    State.currentQIndex = 0;
    State.quizResults = []; // Reset results
    renderQuestion();
}

function renderQuestion() {
    const q = State.questions[State.currentQIndex];
    document.getElementById('question-tracker').innerText = `${State.currentQIndex + 1}/${State.questions.length}`;
    document.getElementById('quiz-progress-bar').style.width = `${((State.currentQIndex) / State.questions.length) * 100}%`;
    document.getElementById('q-text').innerText = q.q;
    
    const imgContainer = document.getElementById('q-image-container');
    imgContainer.innerHTML = ''; 

    if (q.imageUrl) {
        imgContainer.classList.remove('hidden');
        imgContainer.innerHTML = `<img src="${q.imageUrl}" alt="${q.q}" />`;
    } else {
        imgContainer.classList.add('hidden');
    }
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    // New: Handle case where options are missing or malformed
    if (!q.opts || q.opts.length === 0 || typeof q.opts[0] !== 'string' || q.opts[0].length < 2) {
        container.innerHTML = `<p style="color: var(--error);">Error: Question options are missing or corrupted. Cannot proceed.</p>`;
        document.getElementById('next-q-btn').innerText = "Exit Quiz";
        document.getElementById('next-q-btn').onclick = exitQuiz;
        document.getElementById('next-q-btn').classList.remove('hidden');
        return;
    }

    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(btn, opt, q);
        container.appendChild(btn);
    });

    document.getElementById('q-feedback').classList.add('hidden');
    document.getElementById('next-q-btn').classList.add('hidden');
    document.getElementById('next-q-btn').innerText = "Continue";
    document.getElementById('next-q-btn').onclick = nextQuestion;

}

function checkAnswer(btn, selected, qData) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const isCorrect = selected === qData.a;

    // Record result (New)
    State.quizResults.push({
        q: qData.q,
        correct: isCorrect,
        selected: selected,
        answer: qData.a
    });

    if (isCorrect) {
        btn.classList.add('correct');
        showFeedback(true, `Correct! ${qData.why}`);
    } else {
        btn.classList.add('wrong');
        buttons.forEach(b => { if(b.innerText === qData.a) b.classList.add('correct'); });
        showFeedback(false, `Oops! ${qData.why}`);
    }
    document.getElementById('next-q-btn').classList.remove('hidden');
}

function showFeedback(isSuccess, msg) {
    const fb = document.getElementById('q-feedback');
    fb.innerHTML = `<span class="icon">${isSuccess ? '🎉' : '❌'}</span> ${msg}`;
    fb.classList.remove('hidden');
}

window.nextQuestion = () => {
    if (State.currentQIndex < State.questions.length - 1) {
        State.currentQIndex++;
        renderQuestion();
    } else {
        showQuizSummary(); // New: Show summary instead of alert
    }
};

window.exitQuiz = () => {
    document.getElementById('view-quiz').classList.add('hidden-view');
    document.getElementById('view-hub').classList.remove('hidden');
    // Hide all status/loading UI components
    UI.status.classList.add('hidden');
    UI.loadContainer.classList.add('hidden');
    UI.loader.style.width = '0%';
};

// --- NEW: QUIZ SUMMARY MODAL ---
function showQuizSummary() {
    const total = State.questions.length;
    const correct = State.quizResults.filter(r => r.correct).length;
    const scoreText = `${correct} / ${total}`;
    
    document.getElementById('summary-score').innerText = scoreText;
    
    const list = document.getElementById('summary-results-list');
    list.innerHTML = '';

    State.quizResults.forEach((r, index) => {
        const item = document.createElement('div');
        item.className = `summary-item ${r.correct ? 'correct' : 'wrong'}`;
        item.innerHTML = `
            <div class="summary-q-text">${index + 1}. ${r.q}</div>
            <div class="summary-icon"><i class="fas fa-${r.correct ? 'check' : 'times'}"></i></div>
            <div class="summary-answer">
                Your Answer: ${r.correct ? 'Correct' : r.selected || 'N/A'}<br>
                Correct Answer: ${r.answer}
            </div>
        `;
        list.appendChild(item);
    });

    UI.quizSummaryModal.classList.remove('hidden');
}

window.closeSummary = () => {
    UI.quizSummaryModal.classList.add('hidden');
    exitQuiz();
};

window.retakeQuiz = () => {
    UI.quizSummaryModal.classList.add('hidden');
    startQuiz(); // Simply restart the quiz with the same questions
};


// --- INIT LISTENERS & APP STATE ---
function handleFileSelect(e) {
    const file = e.target.files[0];
    if(file) {
        State.lastFile = { name: file.name }; // Store name for UI
        localStorage.setItem("lumina_file", JSON.stringify(State.lastFile));
        document.getElementById('file-name').innerText = file.name;
        UI.dropZone.classList.add('has-file');
    }
}

function clearSource() {
    State.lastFile = null;
    localStorage.removeItem("lumina_file");
    UI.fileInput.value = '';
    UI.topicInput.value = '';
    document.getElementById('file-name').innerText = 'Select PDF Source';
    UI.dropZone.classList.remove('has-file');
    UI.topicInput.focus();
    showToast("Source cleared.", 'info');
}

document.addEventListener('DOMContentLoaded', () => {
    UI.dropZone.onclick = () => UI.fileInput.click();
    UI.fileInput.onchange = handleFileSelect;
    UI.btn.onclick = handleBuild;
    UI.clearBtn.onclick = clearSource; // New button listener

    // Load initial state
    const slider = document.getElementById('age-slider');
    slider.value = State.settings.age;
    
    const role = State.settings.age < 10 ? 'Explorer' : (State.settings.age < 16 ? 'Creator' : 'Innovator');
    document.getElementById('level-badge').innerText = `${State.settings.age} yrs • ${role}`;

    slider.oninput = () => {
        const val = slider.value;
        const role = val < 10 ? 'Explorer' : (val < 16 ? 'Creator' : 'Innovator');
        document.getElementById('level-badge').innerText = `${val} yrs • ${role}`;
        State.settings.age = val;
        localStorage.setItem("lumina_age", val);
    };

    document.getElementById('username-input').value = State.settings.username;
    document.getElementById('nav-username').innerText = State.settings.username; 
    
    if (State.lastFile) {
        // Only update UI; actual file object needs re-upload/selection for processing
        document.getElementById('file-name').innerText = State.lastFile.name;
        UI.dropZone.classList.add('has-file');
        showToast(`Ready to analyze ${State.lastFile.name}.`, 'info');
    }
});

// Settings Modal Handlers
window.toggleSettings = () => {
    const m = document.getElementById('settings-modal');
    m.classList.toggle('hidden');
    if(!m.classList.contains('hidden')) {
        document.getElementById('age-slider').value = State.settings.age;
    } else {
        // Save on close
        State.settings.username = document.getElementById('username-input').value;
        document.getElementById('nav-username').innerText = State.settings.username;
        localStorage.setItem("lumina_user", State.settings.username);
    }
};

window.resetApp = () => { 
    if (confirm("Are you sure? This will delete all saved settings and cached data (including the AI model weights). You will have to re-download the AI model.")) {
        localStorage.clear(); 
        location.reload(true); 
    }
};