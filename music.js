/*
 * Shared background-music player for the Happy Birthday site.
 *
 * Each page is a separate HTML document, so a plain <audio> tag would restart
 * the song on every navigation and browsers block autoplay until the visitor
 * interacts. This one self-contained script solves both:
 *   - It injects its own <audio>, <style> and a floating play/pause button, so
 *     every page only needs a single <script src="music.js" defer></script>.
 *   - It persists playback position + play/mute state in localStorage, so the
 *     song feels continuous as the visitor moves between pages.
 *
 * Drop your MP3 next to this file and point AUDIO_SRC at it.
 */
(function () {
    'use strict';

    var AUDIO_SRC = 'nastelbom-happy-birthday-495860.mp3';
    var KEYS = { time: 'bgMusicTime', paused: 'bgMusicPaused', muted: 'bgMusicMuted' };

    // localStorage can throw (private mode / disabled cookies); keep it safe.
    function readState() {
        try {
            return {
                time: parseFloat(localStorage.getItem(KEYS.time)) || 0,
                paused: localStorage.getItem(KEYS.paused) === 'true',
                muted: localStorage.getItem(KEYS.muted) === 'true'
            };
        } catch (e) {
            return { time: 0, paused: false, muted: false };
        }
    }

    function save(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }

    function init() {
        var state = readState();

        // --- Audio element ---------------------------------------------------
        var audio = document.createElement('audio');
        audio.id = 'bg-music';
        audio.src = AUDIO_SRC;
        audio.loop = true;
        audio.preload = 'auto';
        audio.muted = state.muted;
        document.body.appendChild(audio);

        // Restore the saved position once we know the track's duration.
        audio.addEventListener('loadedmetadata', function () {
            if (state.time > 0 && state.time < audio.duration) {
                try { audio.currentTime = state.time; } catch (e) { /* ignore */ }
            }
        });

        // If the MP3 is missing/unplayable, fail quietly — the rest of the page
        // must keep working. The button stays but simply won't start anything.
        audio.addEventListener('error', function () {
            console.warn('[music] Could not load "' + AUDIO_SRC + '". Drop the MP3 next to music.js.');
        });

        // --- Styles (injected so it looks identical on every page) -----------
        var style = document.createElement('style');
        style.textContent = [
            '.bg-music-controls{position:fixed;right:20px;bottom:20px;z-index:100000;',
            'display:flex;gap:8px;align-items:center}',
            '.bg-music-btn{width:52px;height:52px;border:none;border-radius:50%;',
            'background:linear-gradient(45deg,#ff69b4,#ff99cc);color:#fff;font-size:1.4rem;',
            'line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(255,105,180,0.5);',
            'display:flex;align-items:center;justify-content:center;',
            'transition:transform .2s,box-shadow .2s}',
            '.bg-music-btn:hover{transform:scale(1.1);box-shadow:0 6px 20px rgba(255,105,180,0.7)}',
            '.bg-music-btn.mute-btn{width:40px;height:40px;font-size:1rem;',
            'background:linear-gradient(45deg,#c77dff,#ff8fd0)}',
            '.bg-music-btn.is-playing{animation:bgMusicSpin 6s linear infinite}',
            '@keyframes bgMusicSpin{to{transform:rotate(360deg)}}',
            '.bg-music-btn.is-playing:hover{animation:none;transform:scale(1.1)}',
            '@media (max-width:768px){.bg-music-controls{right:14px;bottom:14px}}'
        ].join('');
        document.head.appendChild(style);

        // --- Controls --------------------------------------------------------
        var wrap = document.createElement('div');
        wrap.className = 'bg-music-controls';

        var playBtn = document.createElement('button');
        playBtn.className = 'bg-music-btn';
        playBtn.type = 'button';

        var muteBtn = document.createElement('button');
        muteBtn.className = 'bg-music-btn mute-btn';
        muteBtn.type = 'button';

        wrap.appendChild(playBtn);
        wrap.appendChild(muteBtn);
        document.body.appendChild(wrap);

        function renderPlay() {
            var playing = !audio.paused;
            playBtn.textContent = playing ? '❚❚' : '♪';
            playBtn.classList.toggle('is-playing', playing);
            var label = playing ? 'Pause music' : 'Play music';
            playBtn.setAttribute('aria-label', label);
            playBtn.title = label;
        }

        function renderMute() {
            muteBtn.textContent = audio.muted ? '🔇' : '🔊';
            var label = audio.muted ? 'Unmute music' : 'Mute music';
            muteBtn.setAttribute('aria-label', label);
            muteBtn.title = label;
        }

        // --- Autoplay handling ----------------------------------------------
        // Browsers block audio until a user gesture. Try to play; if that
        // rejects, start on the visitor's first interaction with the page.
        function startPlayback() {
            var attempt = audio.play();
            if (attempt && typeof attempt.then === 'function') {
                attempt.then(function () {
                    renderPlay();
                }).catch(function () {
                    armFirstGesture();
                    renderPlay();
                });
            }
        }

        var gestureEvents = ['pointerdown', 'keydown', 'touchstart'];
        function onFirstGesture() {
            disarmFirstGesture();
            if (!state.paused) { audio.play().then(renderPlay).catch(function () {}); }
        }
        function armFirstGesture() {
            gestureEvents.forEach(function (ev) {
                document.addEventListener(ev, onFirstGesture, { once: true, passive: true });
            });
        }
        function disarmFirstGesture() {
            gestureEvents.forEach(function (ev) {
                document.removeEventListener(ev, onFirstGesture);
            });
        }

        // --- Wiring ----------------------------------------------------------
        playBtn.addEventListener('click', function () {
            if (audio.paused) {
                save(KEYS.paused, 'false');
                state.paused = false;
                disarmFirstGesture();
                audio.play().then(renderPlay).catch(function () {});
            } else {
                save(KEYS.paused, 'true');
                state.paused = true;
                audio.pause();
            }
            renderPlay();
        });

        muteBtn.addEventListener('click', function () {
            audio.muted = !audio.muted;
            save(KEYS.muted, audio.muted ? 'true' : 'false');
            renderMute();
        });

        audio.addEventListener('play', renderPlay);
        audio.addEventListener('pause', renderPlay);

        // Persist position: throttled while playing + on the way out.
        var lastSaved = 0;
        audio.addEventListener('timeupdate', function () {
            if (audio.currentTime - lastSaved >= 1 || audio.currentTime < lastSaved) {
                lastSaved = audio.currentTime;
                save(KEYS.time, audio.currentTime);
            }
        });
        function persistNow() { save(KEYS.time, audio.currentTime); }
        window.addEventListener('pagehide', persistNow);
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') { persistNow(); }
        });

        // Initial render + kick off playback unless the visitor paused it.
        renderPlay();
        renderMute();
        if (state.paused) {
            audio.pause();
        } else {
            startPlayback();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
