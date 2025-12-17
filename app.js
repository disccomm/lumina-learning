import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

let db = JSON.parse(localStorage.getItem('lumina_v9')) || [];
let active = null; let idx = 0; let mode = 'quiz';

const Core = {
    async process() {
        const name = document.getElementById('topic').value;
        const file = document.getElementById('file').files[0];
        if(!file || !name) return;
        document.getElementById('proc-btn').innerText = "SCANNING...";

        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(buffer).promise;
        const questions = [];

        for(let i=0; i<100; i++) {
            const pgNum = Math.floor(Math.random() * pdf.numPages) + 1;
            const page = await pdf.getPage(pgNum);
            const text = await page.getTextContent();
            // FILTER: Get actual sentences, not just numbers
            const strings = text.items.map(s => s.str).filter(s => s.trim().length > 20);
            const context = strings.length > 0 ? strings[Math.floor(Math.random()*strings.length)] : "this specific data segment";

            questions.push({
                q: `[Page ${pgNum}] Critical Context Analysis: What is the primary focus of the section regarding: "${context.substring(0, 70)}..."?`,
                a: "Context-specific application.",
                opts: ["Context-specific application.", "Minor secondary detail.", "Historical reference.", "Technical redundancy."],
                pg: pgNum
            });
        }

        db.push({ id: Date.now(), name, pages: pdf.numPages, data: questions });
        localStorage.setItem('lumina_v9', JSON.stringify(db));
        location.reload();
    },
    setMode(m) {
        mode = m; idx = 0;
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.id === `t-${m}`));
        this.render();
    },
    render() {
        const stage = document.getElementById('stage');
        const next = document.getElementById('next-btn');
        const item = active.data[idx];
        next.classList.add('hidden');
        stage.innerHTML = '';

        if(mode === 'quiz') {
            stage.innerHTML = `<h4>Question ${idx+1}/100</h4><h2>${item.q}</h2>` + 
                item.opts.map(o => `<div class="option" onclick="Core.check(this, '${o}', '${item.a}')">${o}</div>`).join('');
        } else if(mode === 'cards') {
            stage.innerHTML = `<div class="card-3d" onclick="this.querySelector('.card-inner').classList.toggle('flipped')">
                <div class="card-inner"><div class="face">${item.q}</div><div class="face back">${item.a}</div></div></div>`;
            next.classList.remove('hidden');
        } else {
            stage.innerHTML = `<div style="overflow-y:auto; height:400px">${active.data.slice(0,20).map((d,i)=>`
                <div style="padding:15px; border-bottom:1px solid var(--border)"><b>${i+1}. ${d.q}</b><br><span style="color:var(--neon)">${d.a}</span></div>`).join('')}</div>`;
        }
    },
    check(el, sel, cor) {
        document.querySelectorAll('.option').forEach(o => o.style.pointerEvents = 'none');
        el.classList.add(sel === cor ? 'correct' : 'wrong');
        document.getElementById('next-btn').classList.remove('hidden');
    },
    next() {
        idx++; if(idx < 100) this.render(); else Nav.closeHub();
    },
    purge() { localStorage.clear(); location.replace(location.href); }
};

const Nav = {
    toggle: (id) => document.getElementById(`modal-${id}`).classList.toggle('hidden'),
    openHub: (id) => {
        active = db.find(d => d.id === id);
        document.getElementById('hub-topic').innerText = active.name;
        document.getElementById('view-hub').classList.remove('hidden');
        Core.setMode('quiz');
    },
    closeHub: () => document.getElementById('view-hub').classList.add('hidden')
};

window.Core = Core; window.Nav = Nav;
document.getElementById('file').onchange = (e) => document.getElementById('fname').innerText = e.target.files[0].name;

(function init() {
    const list = document.getElementById('deck-list');
    list.innerHTML = `<div class="tile add" onclick="Nav.toggle('add')"><i class="fas fa-plus"></i><p>SYNC SOURCE</p></div>` + 
        db.map(d => `<div class="tile" onclick="Nav.openHub(${d.id})"><h3>${d.name}</h3><p>${d.pages} Pages</p></div>`).join('');
})();