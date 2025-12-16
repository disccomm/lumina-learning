// --- CONFIGURATION & STATE ---
const CONFIG = {
    model: "Phi-3-mini-4k-instruct-q4f16_1-MLC",
    pexelsKey: "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM" // Replace for images
};

const State = {
    engine: null,
    pdfText: "",
    questions: [],
    currentQIndex: 0,
    settings: {
        username: localStorage.getItem("lumina_user") || "Student",
        age: parseInt(localStorage.getItem("lumina_age")) || 12
    }
};

const UI = {
    // Mapping IDs to easier variables
    btn: document.getElementById('generate-btn'),
    status: document.getElementById('system-status'),
    fileInput: document.getElementById('file-upload'),
    topicInput: document.getElementById('topic-input'),
    dropZone: document.getElementById('drop-zone')
};

// --- CORE: PDF PROCESSING (The Critical Fix) ---

async function extractTextFromPDF(file, onProgress) {
    // SAFETY CHECK: Ensure callback is actually a function
    const safeProgress = (msg) => {
        if (typeof onProgress === 'function') {
            onProgress(msg);
        } else {
            console.log("Progress:", msg); // Fallback to console
        }
    };

    try {
        if (!window.pdfjsLib) throw new Error("PDF Library failed to load.");
        
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = "";
        
        const limit = Math.min(pdf.numPages, 6); // Limit pages for speed
        
        for (let i = 1; i <= limit; i++) {
            safeProgress(`Reading page ${i}/${pdf.numPages}...`);
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(" ") + " ";
        }
        
        if(fullText.length < 50) throw new Error("PDF seems empty or scanned image.");
        return fullText;

    } catch (e) {
        console.error("PDF Error:", e);
        throw e;
    }
}

// --- CORE: AI GENERATION ---

async function initAI(onProgress) {
    if (State.engine) return State.engine;
    
    if (!window.webllm) throw new Error("WebLLM module not found.");
    
    onProgress("Booting Neural Engine...");
    
    const engine = new window.webllm.MLCEngine();
    engine.setInitProgressCallback((report) => {
        // Formats the messy output from WebLLM into a clean %
        const percent = Math.round(report.progress * 100);
        onProgress(`Loading Model: ${percent}%`);
    });
    
    await engine.reload(CONFIG.model);
    State.engine = engine;
    return engine;
}

async function generateQuestions(topic, text, onProgress) {
    const engine = await initAI(onProgress);
    
    onProgress("Analysing Content...");

    // Prompt Engineering based on Age
    const age = State.settings.age;
    const role = age < 12 ? "friendly teacher" : "university professor";
    const complexity = age < 12 ? "simple, fun language" : "detailed, analytical";

    const prompt = `
    You are a ${role}. 
    Context: ${text.substring(0, 3500)}
    Topic: ${topic}
    Task: Create 5 multiple-choice questions suitable for a ${age}-year-old student. Use ${complexity}.
    Format: STRICT JSON array. No markdown.
    Structure: [{"q": "Question?", "opts": ["A", "B", "C", "D"], "a": "Correct Option String", "why": "Explanation"}]
    `;

    onProgress("Dreaming up questions...");
    
    const response = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
    });

    const raw = response.choices[0].message.content;
    
    // JSON Cleaning (AI sometimes adds backticks)
    const jsonStr = raw.replace(/```json|```/g, "").trim();
    
    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        throw new Error("AI output was not valid JSON. Try again.");
    }
}

// --- CONTROLLER: MAIN LOGIC ---

async function handleGeneration() {
    const file = UI.fileInput.files[0];
    const topic = UI.topicInput.value;

    if (!file || !topic) {
        alert("Please select a file and enter a topic.");
        return;
    }

    // LOCK UI
    UI.btn.disabled = true;
    UI.status.classList.remove('hidden');

    try {
        // 1. Extract Text (Passing Arrow Function specifically to avoid Scope Errors)
        const text = await extractTextFromPDF(file, (msg) => {
            UI.status.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${msg}`;
        });

        // 2. Generate Content
        State.questions = await generateQuestions(topic, text, (msg) => {
            UI.status.innerHTML = `<i class="fas fa-brain fa-pulse"></i> ${msg}`;
        });

        // 3. Success
        startQuiz();

    } catch (err) {
        UI.status.innerHTML = `<span style="color:var(--error)">Error: ${err.message}</span>`;
        console.error(err);
    } finally {
        UI.btn.disabled = false;
    }
}

// --- QUIZ LOGIC ---

function startQuiz() {
    document.getElementById('view-hub').classList.add('hidden');
    document.getElementById('view-quiz').classList.remove('hidden-view');
    State.currentQIndex = 0;
    renderQuestion();
}

function renderQuestion() {
    const q = State.questions[State.currentQIndex];
    document.getElementById('question-tracker').innerText = `${State.currentQIndex + 1}/${State.questions.length}`;
    document.getElementById('quiz-progress-bar').style.width = `${((State.currentQIndex) / State.questions.length) * 100}%`;
    
    document.getElementById('q-text').innerText = q.q;
    
    const optsContainer = document.getElementById('options-container');
    optsContainer.innerHTML = ''; // Clear

    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(btn, opt, q);
        optsContainer.appendChild(btn);
    });

    // Reset Feedback
    document.getElementById('q-feedback').classList.add('hidden');
    document.getElementById('next-q-btn').classList.add('hidden');
}

function checkAnswer(btn, selected, qData) {
    // Disable all
    const all = document.querySelectorAll('.option-btn');
    all.forEach(b => b.disabled = true);

    const isCorrect = selected === qData.a;
    
    if (isCorrect) {
        btn.classList.add('correct');
        showFeedback(true, "Correct! " + qData.why);
    } else {
        btn.classList.add('wrong');
        // Highlight correct
        all.forEach(b => {
            if (b.innerText === qData.a) b.classList.add('correct');
        });
        showFeedback(false, "Oops! " + qData.why);
    }
    
    document.getElementById('next-q-btn').classList.remove('hidden');
}

function showFeedback(isSuccess, text) {
    const fb = document.getElementById('q-feedback');
    fb.innerHTML = (isSuccess ? '🎉 ' : '❌ ') + text;
    fb.style.color = isSuccess ? 'var(--success)' : 'var(--error)';
    fb.classList.remove('hidden');
}

window.nextQuestion = function() {
    if (State.currentQIndex < State.questions.length - 1) {
        State.currentQIndex++;
        renderQuestion();
    } else {
        alert("Quiz Complete! Returning to Hub.");
        exitQuiz();
    }
};

window.exitQuiz = function() {
    document.getElementById('view-quiz').classList.add('hidden-view');
    document.getElementById('view-hub').classList.remove('hidden');
    UI.status.classList.add('hidden');
};

// --- EVENTS & INIT ---

document.addEventListener('DOMContentLoaded', () => {
    // File Input Logic
    UI.dropZone.onclick = () => UI.fileInput.click();
    
    UI.fileInput.onchange = (e) => {
        if (e.target.files[0]) {
            document.getElementById('file-name').innerText = e.target.files[0].name;
            UI.dropZone.classList.add('has-file');
        }
    };

    // Slider Logic
    const slider = document.getElementById('age-slider');
    const badge = document.getElementById('level-badge');
    
    const updateBadge = () => {
        const val = slider.value;
        let role = val < 10 ? 'Explorer' : (val < 16 ? 'Creator' : 'Innovator');
        badge.innerText = `${val} yrs • ${role}`;
        State.settings.age = val;
        localStorage.setItem("lumina_age", val);
    };
    
    slider.oninput = updateBadge;
    updateBadge(); // Init

    // Settings
    document.getElementById('username-input').value = State.settings.username;
    
    UI.btn.onclick = handleGeneration;
});

// Settings Modal
window.toggleSettings = () => {
    const m = document.getElementById('settings-modal');
    m.classList.toggle('hidden');
    // Save on close
    if (m.classList.contains('hidden')) {
        State.settings.username = document.getElementById('username-input').value;
        document.getElementById('nav-username').innerText = State.settings.username;
        localStorage.setItem("lumina_user", State.settings.username);
    }
};

window.resetApp = () => {
    localStorage.clear();
    location.reload();
};