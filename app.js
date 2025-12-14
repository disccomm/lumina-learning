const PEXELS_API_KEY = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM";

const State = {
    db: [],
    currentTopic: "",
    currentIndex: 0,
    correctCount: 0,
    seconds: 0,
    timerInt: null
};

// --- CORE FUNCTIONS ---

async function processAndLoad() {
    const fileInput = document.getElementById('pdf-file');
    const topic = document.getElementById('topic-name').value;

    if (!fileInput.files[0] || !topic) {
        alert("Please provide a name and select a file.");
        return;
    }

    // SIMULATING LLM EXTRACTION (Required for PWA Demo)
    // In real use, this fetch calls your LLM to parse the PDF text
    document.getElementById('file-status').innerText = "Analyzing Content...";
    
    setTimeout(() => {
        State.db = generateMockData(50); // Generates 50 questions
        document.getElementById('action-tiles').classList.remove('hidden');
        document.getElementById('file-status').innerText = "✅ Ready!";
    }, 1500);
}

function openQuizConfig() {
    const max = State.db.length;
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <p>Questions in bank: ${max}</p>
        <input type="number" id="q-count" value="10" min="1" max="${max}">
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function startQuiz() {
    const count = parseInt(document.getElementById('q-count').value);
    State.sessionSet = [...State.db].sort(() => 0.5 - Math.random()).slice(0, count);
    State.currentIndex = 0;
    switchView('quiz-view');
    renderQuestion();
    startTimer();
}

function renderQuestion() {
    const q = State.sessionSet[State.currentIndex];
    const content = document.getElementById('quiz-content');
    const options = [...q.options].sort(() => 0.5 - Math.random()); // Shuffle options

    content.innerHTML = `
        <div class="question-card glass">
            <img src="https://images.pexels.com/photos/search?query=${q.pexels_query}&per_page=1" class="q-img">
            <h2>${q.question}</h2>
            <div class="options-list">
                ${options.map(opt => `
                    <button class="opt-btn" onclick="selectOption(this, '${opt}', '${q.correct}')">
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function selectOption(btn, choice, correct) {
    const allBtns = document.querySelectorAll('.opt-btn');
    allBtns.forEach(b => b.classList.remove('selected', 'wrong', 'right'));
    
    btn.classList.add('selected');
    document.getElementById('next-btn').disabled = false;
    
    // Immediate Visual Feedback
    if(choice === correct) {
        btn.classList.add('right');
        playAudio('success');
    } else {
        btn.classList.add('wrong');
        playAudio('error');
    }
}

// Helper: Navigation
function switchView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function generateMockData(num) {
    // Returns 50 questions with page numbers and pexels tags
    return Array.from({length: num}, (_, i) => ({
        question: `Sample Concept ${i+1}: What is the primary function of this subject?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: "Option A",
        pdf_ref: `Page ${Math.floor(i/2) + 1}`,
        pexels_query: "education"
    }));
}