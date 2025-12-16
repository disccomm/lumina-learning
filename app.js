// --- CONFIGURATION ---
const CONFIG = {
    model: "Phi-3-mini-4k-instruct-q4f16_1-MLC", 
    pexelsKey: "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM" // <-- ADD YOUR KEY HERE
};

const State = {
    engine: null, // Singleton instance
    isEngineLoaded: false,
    questions: [],
    currentQIndex: 0,
    settings: {
        username: localStorage.getItem("lumina_user") || "Student",
        age: parseInt(localStorage.getItem("lumina_age")) || 12
    }
};

const UI = {
    btn: document.getElementById('generate-btn'),
    status: document.getElementById('system-status'),
    loader: document.getElementById('ai-loader-bar'),
    loadContainer: document.getElementById('ai-progress-container'),
    fileInput: document.getElementById('file-upload'),
    topicInput: document.getElementById('topic-input'),
    dropZone: document.getElementById('drop-zone')
};

// --- CORE 1: PDF EXTRACTION ---
async function extractTextFromPDF(file, onProgress) {
    // FIX: Prevents "statusCallback is not a function" crash
    const safeProgress = (msg) => typeof onProgress === 'function' ? onProgress(msg) : console.log(msg);

    try {
        if (!window.pdfjsLib) throw new Error("PDF Engine not ready.");
        
        safeProgress("Scanning PDF Structure...");
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = "";
        
        const limit = Math.min(pdf.numPages, 5);
        
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

// --- CORE 2: AI ENGINE (SINGLETON & OPTIMIZED) ---
async function getAIEngine(onProgress) {
    // FIX: Singleton pattern prevents slow repeated reloading
    if (State.engine && State.isEngineLoaded) {
        return State.engine;
    }
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser. Use Chrome/Edge on Desktop/Android.");
    }
    onProgress("Booting GPU Engine...", 10);

    const engine = new window.webllm.MLCEngine();
    
    // FIX: Custom progress handler to show linear progress
    engine.setInitProgressCallback((report) => {
        let percentage = report.progress * 100;
        let text = report.text;

        if (text.includes("Fetching")) text = "Downloading AI Model (Once only)...";
        if (text.includes("Loading")) text = "Loading into GPU VRAM...";
        
        onProgress(text, percentage);
    });

    await engine.reload(CONFIG.model);
    
    State.engine = engine;
    State.isEngineLoaded = true;
    return engine;
}

async function generateQuestions(topic, text, onProgress) {
    const engine = await getAIEngine(onProgress);
    
    onProgress("AI is thinking...", 100);

    const age = State.settings.age;
    
    const prompt = `
    Context: ${text.substring(0, 3000)}
    Topic: ${topic}
    Create 5 multiple-choice questions for a ${age}-year-old student.
    Return ONLY a JSON Array.
    Format: [{"q": "Question", "opts": ["A","B","C","D"], "a": "Correct Option String", "why": "Explanation"}]
    `;

    const response = await engine.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
    });

    const raw = response.choices[0].message.content;

    // FIX: Robust JSON Parsing to find array brackets
    try {
        const start = raw.indexOf('[');
        const end = raw.lastIndexOf(']') + 1;
        
        if (start === -1 || end === 0) throw new Error("AI did not return an array.");
        
        const jsonStr = raw.substring(start, end);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse Error", e);
        throw new Error("Failed to parse AI response. Retrying...");
    }
}


// --- CORE 3: PEXELS IMAGE FETCH ---
async function fetchImageForTopic(topic) {
    if (!CONFIG.pexelsKey || CONFIG.pexelsKey === "YOUR_PEXELS_KEY_HERE") {
        console.warn("Pexels API key not configured. Skipping image fetch.");
        return null;
    }

    try {
        const query = encodeURIComponent(topic);
        const url = `https://api.pexels.com/v1/search?query=${query}&per_page=1`;
        
        const response = await fetch(url, {
            headers: {
                Authorization: CONFIG.pexelsKey
            }
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.photos && data.photos.length > 0) {
            return data.photos[0].src.medium; 
        }
        return null;
    } catch (e) {
        console.error("Image Fetch Error:", e);
        return null;
    }
}


// --- CONTROLLER: MAIN LOGIC ---
async function handleBuild() {
    const file = UI.fileInput.files[0];
    const topic = UI.topicInput.value.trim(); // FIX: Topic is trimmed and checked

    if (!file) return alert("Please select a PDF file.");
    if (!topic) return alert("Please enter a topic.");

    UI.btn.disabled = true;
    UI.status.classList.remove('hidden');
    UI.loadContainer.classList.remove('hidden');

    const updateStatus = (msg, percent = null) => {
        UI.status.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${msg}`;
        if (percent !== null) UI.loader.style.width = `${percent}%`;
    };

    try {
        // 1. PDF
        const text = await extractTextFromPDF(file, (msg) => updateStatus(msg, 10));
        
        // 2. AI
        State.questions = await generateQuestions(topic, text, updateStatus);

        // 3. PEXELS IMAGE FETCH
        updateStatus("Finalizing... Fetching image for Quiz 1");
        const imageUrl = await fetchImageForTopic(topic);
        
        if (State.questions.length > 0) {
            State.questions[0].imageUrl = imageUrl; 
        }
        
        // 4. Start
        startQuiz();

    } catch (err) {
        UI.status.innerHTML = `<span style="color:var(--error)">${err.message}</span>`;
        UI.loader.style.background = 'var(--error)';
    } finally {
        UI.btn.disabled = false;
    }
}

// --- QUIZ FUNCTIONS ---
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
    
    // IMAGE RENDERING LOGIC
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

    q.opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(btn, opt, q);
        container.appendChild(btn);
    });

    document.getElementById('q-feedback').classList.add('hidden');
    document.getElementById('next-q-btn').classList.add('hidden');
}

function checkAnswer(btn, selected, qData) {
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    if (selected === qData.a) {
        btn.classList.add('correct');
        showFeedback(true, "Correct! " + qData.why);
    } else {
        btn.classList.add('wrong');
        buttons.forEach(b => { if(b.innerText === qData.a) b.classList.add('correct'); });
        showFeedback(false, "Oops! " + qData.why);
    }
    document.getElementById('next-q-btn').classList.remove('hidden');
}

function showFeedback(isSuccess, msg) {
    const fb = document.getElementById('q-feedback');
    fb.innerHTML = (isSuccess ? '🎉 ' : '❌ ') + msg;
    fb.style.color = isSuccess ? '#00D885' : '#FF4455';
    fb.classList.remove('hidden');
}

window.nextQuestion = () => {
    if (State.currentQIndex < State.questions.length - 1) {
        State.currentQIndex++;
        renderQuestion();
    } else {
        alert("Quiz Complete!");
        exitQuiz();
    }
};

window.exitQuiz = () => {
    document.getElementById('view-quiz').classList.add('hidden-view');
    document.getElementById('view-hub').classList.remove('hidden');
    UI.status.classList.add('hidden');
    UI.loadContainer.classList.add('hidden');
    UI.loader.style.width = '0%';
};

// --- INIT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    UI.dropZone.onclick = () => UI.fileInput.click();
    UI.fileInput.onchange = (e) => {
        if(e.target.files[0]) {
            document.getElementById('file-name').innerText = e.target.files[0].name;
            UI.dropZone.style.borderColor = '#6C5DD3';
            UI.dropZone.style.background = 'rgba(108, 93, 211, 0.1)';
        }
    };

    const slider = document.getElementById('age-slider');
    slider.oninput = () => {
        const val = slider.value;
        const role = val < 10 ? 'Explorer' : (val < 16 ? 'Creator' : 'Innovator');
        document.getElementById('level-badge').innerText = `${val} yrs • ${role}`;
        State.settings.age = val;
    };

    document.getElementById('username-input').value = State.settings.username;
    document.getElementById('nav-username').innerText = State.settings.username; // Ensure initial name is displayed
    
    UI.btn.onclick = handleBuild;
});

window.toggleSettings = () => {
    const m = document.getElementById('settings-modal');
    m.classList.toggle('hidden');
    if(m.classList.contains('hidden')) {
        State.settings.username = document.getElementById('username-input').value;
        document.getElementById('nav-username').innerText = State.settings.username;
        localStorage.setItem("lumina_user", State.settings.username);
    }
};

window.resetApp = () => { localStorage.clear(); location.reload(); };