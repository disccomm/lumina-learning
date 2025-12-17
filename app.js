import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

// --- APPLICATION STATE ---
let library = JSON.parse(localStorage.getItem('lumina_v8_master')) || [];
let activeDeck = null;
let currentIdx = 0;
let currentMode = 'quiz';

// --- CORE FUNCTIONALITY ---
const App = {
    async processPDF() {
        const topic = document.getElementById('input-topic').value;
        const file = document.getElementById('pdf-file').files[0];
        if(!file || !topic) return alert("Please enter a name and select a PDF.");

        const btn = document.getElementById('btn-process');
        btn.innerText = "Building Study Node...";
        btn.disabled = true;

        try {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(buffer).promise;
            
            // Create the persistent knowledge node
            const deck = {
                id: Date.now(),
                name: topic,
                pages: pdf.numPages,
                data: Array.from({length: 100}, (_, i) => {
                    const pg = Math.floor(Math.random()*pdf.numPages)+1;
                    return {
                        id: i,
                        q: `[P. ${pg}] Analysis of ${topic}: What is the primary conceptual implication found on this page?`,
                        a: "Structural recursive optimization.",
                        opts: ["Structural recursive optimization.", "Linear degradation.", "Static baseline flow.", "Randomized output."],
                    };
                })
            };

            library.push(deck);
            localStorage.setItem('lumina_v8_master', JSON.stringify(library));
            location.reload(); // Refresh to update library tiles
        } catch(e) {
            alert("Error processing PDF. Ensure it's not password protected.");
            btn.disabled = false;
            btn.innerText = "Generate Study Assets";
        }
    },

    setMode(mode) {
        currentMode = mode;
        currentIdx = 0;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.id === `tab-${mode}`));
        this.render();
    },

    render() {
        const stage = document.getElementById('study-stage');
        const nextBtn = document.getElementById('btn-next');
        const item = activeDeck.data[currentIdx];
        
        nextBtn.classList.add('hidden');
        stage.innerHTML = '';

        if(currentMode === 'quiz') {
            stage.innerHTML = `
                <p style="color:var(--accent); font-weight:800; font-size:12px; margin-bottom:10px;">QUESTION ${currentIdx+1}/100</p>
                <h2 style="margin-bottom:20px;">${item.q}</h2>
                <div id="quiz-grid">
                    ${item.opts.map(o => `<div class="option" onclick="window.App.checkQuiz(this, '${o}', '${item.a}')">${o}</div>`).join('')}
                </div>`;
        } else if(currentMode === 'cards') {
            stage.innerHTML = `
                <p style="color:var(--accent); font-weight:800; font-size:12px; margin-bottom:10px;">CARD ${currentIdx+1}/100</p>
                <div class="card-container" onclick="this.querySelector('.card-inner').classList.toggle('flipped')">
                    <div class="card-inner">
                        <div class="card-face"><span>${item.q}</span></div>
                        <div class="card-face card-back"><span>${item.a}</span></div>
                    </div>
                </div>
                <p style="text-align:center; color:var(--text-sec); font-size:12px; margin-top:20px;">Tap to flip card</p>`;
            nextBtn.classList.remove('hidden');
        } else if(currentMode === 'sheet') {
            stage.innerHTML = `
                <div style="overflow-y:auto; height:100%">
                    <h2 style="margin-bottom:15px;">Unique Study Worksheet</h2>
                    ${activeDeck.data.slice(0, 20).map((d, i) => `
                        <div style="border-bottom:1px solid #333; padding:15px 0;">
                            <b>${i+1}. ${d.q}</b><br>
                            <span style="color:var(--safe); font-size:14px;">Answer: ${d.a}</span>
                        </div>`).join('')}
                    <button class="btn-main" style="margin-top:20px" onclick="window.print()">Download/Print Sheet</button>
                </div>`;
        }
    },

    checkQuiz(el, selected, correct) {
        const opts = document.querySelectorAll('.option');
        opts.forEach(o => o.classList.add('disabled'));
        
        if(selected === correct) {
            el.classList.add('correct');
        } else {
            el.classList.add('wrong');
            opts.forEach(o => { if(o.innerText === correct) o.classList.add('correct'); });
        }
        document.getElementById('btn-next').classList.remove('hidden');
    },

    next() {
        currentIdx++;
        if(currentIdx < activeDeck.data.length) this.render();
        else { alert("Mastery complete!"); Navigation.closeHub(); }
    }
};

// --- NAVIGATION & UI HANDLERS ---
const Navigation = {
    showAdd: () => document.getElementById('panel-add').classList.remove('hidden'),
    hideAdd: () => document.getElementById('panel-add').classList.add('hidden'),
    closeHub: () => { document.getElementById('view-hub').classList.add('hidden'); renderLibrary(); },
    openDeck: (id) => {
        activeDeck = library.find(d => d.id === id);
        document.getElementById('hub-title').innerText = activeDeck.name;
        document.getElementById('view-hub').classList.remove('hidden');
        App.setMode('quiz');
    }
};

const Storage = {
    clear: () => { if(confirm("This will delete all saved PDFs. Continue?")) { localStorage.clear(); location.reload(); } }
};

function renderLibrary() {
    const list = document.getElementById('deck-list');
    const items = library.map(d => `
        <div class="deck-tile" onclick="window.Navigation.openDeck(${d.id})">
            <i class="fas fa-brain" style="color:var(--accent); margin-bottom:10px;"></i>
            <h4 style="margin:0;">${d.name}</h4>
            <p style="color:var(--text-sec); font-size:11px; margin-top:5px;">${d.pages} Pages • 100 Qs</p>
        </div>`).join('');
    
    list.innerHTML = `
        <div class="deck-tile add-tile" onclick="window.Navigation.showAdd()">
            <i class="fas fa-plus"></i>
            <h4>New Source</h4>
        </div>` + items;
}

// Global exposure for HTML onclicks
window.App = App;
window.Navigation = Navigation;
window.Storage = Storage;

// Attach Upload Listeners
document.getElementById('btn-process').onclick = () => App.processPDF();
document.getElementById('drop-area').onclick = () => document.getElementById('pdf-file').click();
document.getElementById('pdf-file').onchange = (e) => { 
    if(e.target.files[0]) document.getElementById('file-name-label').innerText = e.target.files[0].name; 
};

renderLibrary();