import * as io from '../../socket.io/socket.io.esm.min.js';

const FONT_SIZE_KEY = 'revealRemoteNotesFontSize';
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 48;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_DEFAULT = 16;

function applyNotesFontSize(size) {
    document.getElementById('notes').style.fontSize = size + 'px';
}

function loadNotesFontSize() {
    const saved = parseInt(localStorage.getItem(FONT_SIZE_KEY), 10);
    const size = (saved >= FONT_SIZE_MIN && saved <= FONT_SIZE_MAX) ? saved : FONT_SIZE_DEFAULT;
    applyNotesFontSize(size);
    return size;
}

let currentFontSize = loadNotesFontSize();

window.slideControl = window.slideControl || (function () {
    let socket;
    let allowSwipe = true;

    function init() {
        const path = window.location.pathname.replace(/\/_remote\/ui\/[^\/]*(?:\?.*)?$/, '/socket.io'),
            id = window.location.search.substring(1);

        setupSwipe();

        socket = io.connect({path: path});

        socket.on('connect_error', function (err) {
            console.warn("Could not connect to socket.io-remote server", err);
        });

        socket.on('reconnect_error', function (err) {
            console.warn("Could not reconnect to socket.io-remote server", err);
        });

        socket.on('connect_timeout', function () {
            console.warn("Could not connect to socket.io-remote server (timeout)");
        });

        socket.on('reconnect_failed', function (err) {
            console.warn("Could not reconnect to socket.io-remote server - this was the last try, giving up", err);
        });

        socket.on('error', function (err) {
            console.warn("Unknown error in socket.io", err);
        });

        socket.on('connect', function () {
            console.info("Connected - sending welcome message");

            socket.emit('start', {
                type: 'remote',
                id: id
            });
        });

        function colorListMarkers(container) {
            container.querySelectorAll('li').forEach(function(li) {
                var kids = Array.from(li.childNodes).filter(function(n) { return n.nodeType === Node.ELEMENT_NODE; });
                var onlyWhitespaceText = Array.from(li.childNodes)
                    .filter(function(n) { return n.nodeType === Node.TEXT_NODE; })
                    .every(function(n) { return !n.textContent.trim(); });
                var span = onlyWhitespaceText && kids.length === 1 && (kids[0].tagName === 'SPAN' || kids[0].tagName === 'FONT') ? kids[0] : null;
                if (span && span.style.color) li.style.color = span.style.color;
            });
        }

        socket.on('notes_changed', function (data) {
            let text = data.text;
            if (text === undefined || text === null || text.trim() === "") {
                text = "(The current slide has no speaker notes)";
            }
            var notesDiv = document.getElementById('notes');
            notesDiv.innerHTML = text;
            colorListMarkers(notesDiv);
        });

        socket.on('state_changed', function (data) {
            allowSwipe = data.allowSwipe;
            document.getElementById('progress').style.width = Math.floor(data.progress * 100) + '%';

            document.getElementById('next').className = data.isLastSlide ? 'disabled' : '';
            document.getElementById('prev').className = data.isFirstSlide ? 'disabled' : '';
            document.getElementById('left').className = data.availableRoutes.left ? '' : 'disabled';
            document.getElementById('right').className = data.availableRoutes.right ? '' : 'disabled';
            document.getElementById('up').className = data.availableRoutes.up ? '' : 'disabled';
            document.getElementById('down').className = data.availableRoutes.down ? '' : 'disabled';

            document.getElementById('pause').className = data.isPaused ? 'pressed' : '';
            document.getElementById('overview').className = data.isOverview ? 'pressed' : '';

            if (data.autoslide) {
                document.getElementById('autoslide').className = data.isAutoSliding ? 'pressed' : '';
            } else {
                document.getElementById('autoslide').className = 'hidden';
            }
        });
    }

    function sendCommand(cmd) {
        socket.emit('command', {
            command: cmd
        });
    }

    function command(cmd) {
        return function () {
            sendCommand(cmd);
        };
    }

    function setupSwipe() {
        let startX = 0;
        let startY = 0;
        let isMoving = false;
        const target = document.getElementById("notes");

        target.addEventListener('touchstart', function (e) {
            if (!allowSwipe) return;

            if (e.touches.length === 1) {
                startX = e.touches[0].pageX;
                startY = e.touches[0].pageY;
                isMoving = true;
                target.addEventListener('touchmove', onTouchMove, false);
                target.addEventListener('touchend', onTouchEnd, false);
            }
        }, false);

        function onTouchEnd() {
            target.removeEventListener('touchmove', onTouchMove);
            target.removeEventListener('touchend', onTouchEnd);
            isMoving = false;
        }

        function onTouchMove(e) {
            if (isMoving) {
                const x = e.touches[0].pageX;
                const y = e.touches[0].pageY;
                const dx = startX - x;
                const dy = startY - y;

                if (Math.abs(dx) >= 25) {
                    if (Math.abs(dy) <= 50) {
                        sendCommand(dx > 0 ? "next" : "prev");
                    }

                    onTouchEnd();
                } else if (Math.abs(dy) > 100) {
                    onTouchEnd();
                }
            }
        }
    }

    function showMenu() {
        document.getElementsByTagName('body')[0].className = '';
    }

    function hideMenu() {
        document.getElementsByTagName('body')[0].className = 'collapsed';
    }

    init();

    return {
        next: command("next"),
        prev: command("prev"),
        left: command("left"),
        right: command("right"),
        up: command("up"),
        down: command("down"),
        overview: command("overview"),
        pause: command("pause"),
        autoslide: command("autoslide"),
        showMenu,
        hideMenu,
        increaseFontSize() {
            currentFontSize = Math.min(FONT_SIZE_MAX, currentFontSize + FONT_SIZE_STEP);
            localStorage.setItem(FONT_SIZE_KEY, currentFontSize);
            applyNotesFontSize(currentFontSize);
        },
        decreaseFontSize() {
            currentFontSize = Math.max(FONT_SIZE_MIN, currentFontSize - FONT_SIZE_STEP);
            localStorage.setItem(FONT_SIZE_KEY, currentFontSize);
            applyNotesFontSize(currentFontSize);
        },
    }
})();
