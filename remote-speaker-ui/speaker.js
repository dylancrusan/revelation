import { io } from '/socket.io/socket.io.esm.min.js';

const remoteId = window.location.search.slice(1);
const socket = io({ path: '/socket.io' });

// ── Timer ─────────────────────────────────────────────
let timerStart = Date.now();
const timerEl = document.getElementById('timer');

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
}

setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - timerStart);
}, 1000);

function resetTimer() {
    timerStart = Date.now();
    timerEl.textContent = '0:00';
}

timerEl.addEventListener('click', resetTimer);
timerEl.addEventListener('touchend', (e) => { e.preventDefault(); resetTimer(); });

// ── Font size ─────────────────────────────────────────
const FONT_KEY = 'speakerNotesFontSize';
const notesEl = document.getElementById('notes');
let fontSize = parseFloat(localStorage.getItem(FONT_KEY)) || 16;

function applyFontSize() {
    document.documentElement.style.setProperty('--notes-font-size', fontSize + 'px');
}
applyFontSize();

window.speakerControl = {
    increaseFontSize() { fontSize = Math.min(40, fontSize + 2); localStorage.setItem(FONT_KEY, fontSize); applyFontSize(); },
    decreaseFontSize() { fontSize = Math.max(10, fontSize - 2); localStorage.setItem(FONT_KEY, fontSize); applyFontSize(); },
    prev()  { socket.emit('command', { command: 'prev' }); },
    next()  { socket.emit('command', { command: 'next' }); },
    up()    { socket.emit('command', { command: 'up' }); },
    down()  { socket.emit('command', { command: 'down' }); },
    pause() { socket.emit('command', { command: 'pause' }); },
};

// ── Swipe on notes panel ──────────────────────────────
let swipeStartX = 0, swipeStartY = 0;
notesEl.addEventListener('touchstart', (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
}, { passive: true });
notesEl.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(dy) > 100) return;
    if (dx < -25) speakerControl.next();
    else if (dx > 25) speakerControl.prev();
});

// ── Socket ────────────────────────────────────────────
socket.on('connect', () => {
    socket.emit('start', { type: 'remote', id: remoteId });
});

socket.on('notes_changed', (data) => {
    notesEl.innerHTML = data.text || '';
});

socket.on('state_changed', (data) => {
    document.getElementById('progress').style.width = (data.progress * 100) + '%';
    const total = data.slideCount ?? 1;
    const current = data.currentSlide ?? (Math.round(data.progress * (total - 1)) + 1);
    document.getElementById('slide-current').textContent = current;
    document.getElementById('slide-total').textContent = data.slideCount ?? '–';

    document.getElementById('prev').classList.toggle('disabled', !!data.isFirstSlide);
    document.getElementById('next').classList.toggle('disabled', !!data.isLastSlide);
    document.getElementById('up').classList.toggle('disabled', !data.availableRoutes?.up);
    document.getElementById('down').classList.toggle('disabled', !data.availableRoutes?.down);
    document.getElementById('pause').classList.toggle('pressed', !!data.isPaused);
});

socket.on('slide_preview', (data) => {
    const cur = document.getElementById('thumb-current');
    const nxt = document.getElementById('thumb-next');
    if (data.current) cur.src = data.current;
    if (data.next)    nxt.src = data.next;
    else              nxt.src = '';
});
