// --- CONFIGURATION & STATE (V11.0 Stable)---
const PEXELS_API_KEY_DEFAULT = "qQZw9X3j2A76TuOYYHDo2ssebWP5H7K056k1rpdOTVvqh7SVDQr4YyWM"; 
// --- app.js (Relevant Function Updates for V12.0) ---

// V12.0 FIX: Reinstated robust check for file input and topic name
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
        State.db = generateMockData(50, topic); 
        
        document.getElementById('action-tiles').classList.remove('hidden');
        document.getElementById('file-status').innerHTML = `✅ **Ready! 50 Questions Loaded for ${topic}.**`;
        processButton.disabled = false;
        
    }, 3000); 
}

// V12.0 FIX: Ensures the modal action button state is always correctly set for binding
function openSettingsModal() {
    const modalBody = document.getElementById('modal-body');
    const modalActionBtn = document.getElementById('modal-action-btn');

    document.getElementById('modal-title').innerText = 'App Settings';
    
    // D12.1 Fix: Ensure the button is visible before attempting to bind the click handler
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

// ... (Rest of app.js, including saveSettings, remains the same) ...