// --- CONFIGURATION & STATE (V26.0 - Fixes Applied) ---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
// --- CONFIGURATION & STATE (V26.0 - Fixes Applied) ---
const PEXELS_API_KEY_DEFAULT = "ADD_YOUR_KEY_HERE"; 
let PEXELS_API_KEY = localStorage.getItem('pexelsKey') || PEXELS_API_KEY_DEFAULT; 

// AI Model: 'Phi-3' is safer for mobile/web.
const SELECTED_MODEL = "Phi-3-mini-4k-instruct-q4f16_1-MLC"; 

// App Settings
let isDarkMode = localStorage.getItem('isDarkMode') === 'true';
let fontSize = localStorage.getItem('fontSize') || 16;
let userName = localStorage.getItem('userName') || "Student"; 

const KNOWLEDGE_ZONES = {
    Explorer: { 
        min: 5, max: 10, 
        prompt: "You are a teacher for children (ages 5-10). Use simple language. Focus on basic facts." 
    },
    Creator: { 
        min: 11, max: 15, 
        prompt: "You are a tutor for teenagers. Focus on applying concepts." 
    },
    Innovator: { 
        min: 16, max: 25, 
        prompt: "You are a professor. Focus on critical analysis and complex synthesis." 
    }
};

const State = {
    db: [], 
    sessionSet: [], 
    currentIndex: 0,
    seconds: 0,
    timerInt: null,
    quizState: [], 
    engine: null, // Holds WebLLM engine
    extractedText: "" 
};

// --- CORE UTILITIES ---
function getKnowledgeZone(age) {
    const ageInt = parseInt(age);
    if (ageInt >= 16) return 'Innovator';
    if (ageInt >= 11) return 'Creator';
    return 'Explorer';
}

function applyTheme() {
    // 1. Apply Dark Mode Class
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }

    // 2. Apply Font Size Variable
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);

    // 3. Update Inputs if they are visible (Settings Modal)
    const rangeInput = document.getElementById('font-size-range');
    if (rangeInput) rangeInput.value = fontSize;
    
    const darkCheck = document.getElementById('dark-mode-check');
    if (darkCheck) darkCheck.checked = isDarkMode;
}

// --- PDF EXTRACTION (PDF.js) ---
async function extractTextFromPDF(file, statusCallback) {
    try {
        if (!window.pdfjsLib) throw new Error("PDF.js library not loaded in index.html");
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 5); // Limit to 5 pages for speed/memory

        for (let i = 1; i <= maxPages; i++) {
            statusCallback(`📄 Reading Page ${i}/${maxPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullText += `[Page ${i}] ${pageText}\n`;
        }
        return fullText;
    } catch (e) {
        console.error("PDF Read Error:", e);
        throw new Error("Could not read PDF. Make sure it is a text PDF (not scanned).");
    }
}

// --- AI ENGINE (WebLLM) ---
async function AIExtractionService(topic, aiStatus) {
    // 1. Initialize Engine
    if (!window.webllm) throw new Error("WebLLM library not loaded.");
    
    if (!State.engine) {
        aiStatus.innerText = "📥 Downloading AI Model (First run takes time)...";
        const engine = new window.webllm.MLCEngine();
        engine.setInitProgressCallback((report) => {
            aiStatus.innerText = `📥 Loading AI: ${Math.ceil(report.progress * 100)}%`;
        });
        await engine.reload(SELECTED_MODEL);
        State.engine = engine;
    }

    // 2. Prepare Prompt
    const age = localStorage.getItem('ageRange') || 10;
    const zone = getKnowledgeZone(age);
    
    // Safety truncate
    const context = State.extractedText.substring(0, 4000); 

    const systemPrompt = `
        ${KNOWLEDGE_ZONES[zone].prompt}
        Task: Create 5 multiple-choice questions based on the Context.
        Format: ONLY valid JSON array. No text before/after.
        Example: [{"question":"?","options":["A","B","C","D"],"correct":"A"}]
    `;

    const userPrompt = `Context: ${context}\n\nGenerate 5 questions now.`;

    aiStatus.innerText = "🧠 AI is thinking...";
    
    try {
        const response = await State.engine.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
        });

        const raw = response.choices[0].message.content;
        console.log("AI Output:", raw);

        // 3. Parse JSON (Robust Finder)
        const start = raw.indexOf('[');
        const end = raw.lastIndexOf(']');
        if (start === -1 || end === -1) throw new Error("AI did not return a list.");
        
        const jsonStr = raw.substring(start, end + 1);
        const questions = JSON.parse(jsonStr);

        // 4. Map to App Format
        return questions.map((q, i) => ({
            id: `gen-${i}`,
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation || "Correct answer derived from text.",
            question_topic: topic
        }));

    } catch (e) {
        console.error(e);
        // Fallback if AI fails (prevents app crash)
        return [
            { question: "AI Generation Failed. What is the topic?", options: [topic, "Unknown", "Error", "None"], correct: topic, explanation: "Fallback question." }
        ];
    }
}

// --- MAIN BUTTON ACTION ---
async function processAndLoad() {
    const topic = document.getElementById('topic-name').value;
    const fileInput = document.getElementById('pdf-file');
    const aiStatus = document.getElementById('ai-status');
    const btn = document.querySelector('.primary-btn');

    if (!topic || !fileInput.files[0]) {
        alert("Please enter a Topic Name and select a PDF file.");
        return;
    }

    btn.disabled = true;
    
    try {
        // Step 1: Read PDF
        State.extractedText = await extractTextFromPDF(fileInput.files[0], (msg) => aiStatus.innerText = msg);
        
        // Step 2: Generate (Calls the Correct Function Name now)
        State.db = await AIExtractionService(topic, aiStatus);
        
        // Step 3: Success State
        aiStatus.innerText = `✅ Success! ${State.db.length} Questions Ready.`;
        
        // Enable Tiles
        document.querySelectorAll('.action-tile').forEach(t => t.classList.add('active'));
        
    } catch (error) {
        aiStatus.innerText = `❌ Error: ${error.message}`;
    } finally {
        btn.disabled = false;
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    
    // Set User Name in Header
    const welcomeEl = document.querySelector('header h4'); // "Welcome back..."
    if (welcomeEl) {
        // Only update the name part, keep "Welcome back,"
        // Simplest way: just replace inner text
        welcomeEl.innerHTML = `Welcome back, <br><span style="font-size:1.2em; color:var(--primary-color);">${userName}</span>`;
    }

    // Bind Level Slider
    const ageRange = document.getElementById('age-range');
    const ageVal = document.getElementById('age-val');
    
    if (ageRange) {
        const currentAge = localStorage.getItem('ageRange') || 10;
        ageRange.value = currentAge;
        ageVal.innerText = `${currentAge} yrs (${getKnowledgeZone(currentAge)})`;
        
        ageRange.addEventListener('input', (e) => {
            const val = e.target.value;
            ageVal.innerText = `${val} yrs (${getKnowledgeZone(val)})`;
            localStorage.setItem('ageRange', val);
        });
    }
});

// --- SETTINGS MODAL LOGIC (Fixed) ---
function openSettingsModal() {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    
    title.innerText = "App Settings";
    modal.classList.remove('hidden');

    body.innerHTML = `
        <div class="input-group">
            <label>Dark Mode</label>
            <input type="checkbox" id="dark-mode-check" 
                onchange="isDarkMode = this.checked; localStorage.setItem('isDarkMode', this.checked); applyTheme();" 
                ${isDarkMode ? 'checked' : ''}>
        </div>
        
        <div class="input-group" style="display:block;">
            <label>Font Size</label>
            <input id="font-size-range" type="range" min="12" max="24" value="${fontSize}" 
                oninput="fontSize = this.value; localStorage.setItem('fontSize', this.value); applyTheme();">
            <div style="text-align:right; font-size:0.8rem; color:var(--primary-color);">Drag to resize</div>
        </div>

        <button class="close-btn" onclick="document.getElementById('modal-overlay').classList.add('hidden')">
            Done
        </button>

        <button class="danger-btn" onclick="signOut()">
            Sign Out & Reset Data
        </button>
    `;
}

function signOut() {
    if(confirm("Are you sure? This will delete your generated questions and settings.")) {
        localStorage.clear();
        location.reload();
    }
}


// --- QUIZ & UI NAVIGATION ---
function startQuiz() {
    if (State.db.length === 0) return;
    
    State.sessionSet = [...State.db]; 
    State.quizState = State.sessionSet.map(() => ({ answer: null, isCorrect: null }));
    State.currentIndex = 0;
    
    switchView('quiz-view');
    renderQuestion();
}

function renderQuestion() {
    const q = State.sessionSet[State.currentIndex];
    const sq = State.quizState[State.currentIndex];
    
    document.getElementById('quiz-content').innerHTML = `
        <div class="glass-panel">
            <h3>Question ${State.currentIndex + 1} / ${State.sessionSet.length}</h3>
            <p style="font-size:1.1rem; margin-bottom:20px;">${q.question}</p>
            <div class="options-list">
                ${q.options.map(opt => `
                    <button class="opt-btn ${sq.answer === opt ? (sq.isCorrect ? 'right' : 'wrong') : ''}" 
                            onclick="selectAnswer('${opt.replace(/'/g, "\\'")}')" 
                            ${sq.isCorrect !== null ? 'disabled' : ''}>
                        ${opt}
                    </button>
                `).join('')}
            </div>
             ${sq.isCorrect !== null ? `<p style="margin-top:10px; color:var(--text-color);"><em>${q.explanation}</em></p>` : ''}
        </div>
    `;
    
    // Nav buttons
    document.getElementById('next-btn').disabled = (sq.isCorrect === null);
}

function selectAnswer(choice) {
    const sq = State.quizState[State.currentIndex];
    const q = State.sessionSet[State.currentIndex];
    
    sq.answer = choice;
    sq.isCorrect = (choice === q.correct);
    renderQuestion();
}

function handleNext() {
    if (State.currentIndex < State.sessionSet.length - 1) {
        State.currentIndex++;
        renderQuestion();
    } else {
        alert("Quiz Complete!");
        switchView('hub-view');
    }
}

function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}