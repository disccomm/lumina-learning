// CONFIGURATION
const PEXELS_API_KEY = "YOUR_PEXELS_API_KEY_HERE"; // <--- ADD YOUR KEY HERE
let currentSession = {
    questions: [],
    currentIndex: 0,
    timer: 0,
    isPaused: false,
    results: []
};

// INITIALIZATION
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

// 1. IMPORT & PDF PROCESSING
document.getElementById('pdf-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const nickname = document.getElementById('topic-nickname').value || "Unnamed Topic";
    
    // UI Feedback: Loading
    showView('menu-view');
    document.getElementById('current-topic-display').innerText = `Topic: ${nickname}`;
    
    // Note: In a production environment, text is extracted here using PDF.js
    // and sent to an LLM endpoint. For this architecture, we simulate the 50-question 
    // JSON generation result from the LLM.
    generateQuestionsFromLLM(file);
});

// 2. QUIZ LOGIC
function startQuiz() {
    const count = prompt("How many questions? (10-200)", "20");
    setupQuizSession(parseInt(count));
    showView('quiz-view');
    startTimer();
}

function setupQuizSession(count) {
    // Dynamic Capping Logic
    const max = currentSession.questions.length;
    const finalCount = Math.min(count, max);
    
    // Shuffle logic (Fisher-Yates)
    currentSession.activeSet = currentSession.questions
        .sort(() => 0.5 - Math.random())
        .slice(0, finalCount);
    
    renderQuestion();
}

function renderQuestion() {
    const q = currentSession.activeSet[currentSession.currentIndex];
    const container = document.getElementById('question-container');
    
    // Pexels API Integration Placeholder
    const imageUrl = `https://api.pexels.com/v1/search?query=${q.pexels_query}`;
    
    container.innerHTML = `
        <h3>Question ${currentSession.currentIndex + 1}</h3>
        <p>${q.question}</p>
        <div class="options-grid">
            ${q.options.map(opt => `<button class="option-btn" onclick="checkAnswer('${opt}')">${opt}</button>`).join('')}
        </div>
    `;
    
    updateProgressBar();
}

// 3. UI HELPERS
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
}

function updateProgressBar() {
    const progress = ((currentSession.currentIndex + 1) / currentSession.activeSet.length) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
}