/*
 * Shared "cute" effects for the Happy Birthday site.
 * Currently: a tiny heart that trails the cursor / finger as it moves.
 * Self-contained — injects its own <style>; every page just needs
 *   <script src="cute.js" defer></script>
 */
(function () {
    'use strict';

    var HEARTS = ['💖', '💗', '💕', '💓', '🌸', '✨'];
    var THROTTLE_MS = 70; // limit how often we spawn, so it stays light

    function init() {
        // Injected styles (kept independent of each page's own CSS).
        var style = document.createElement('style');
        style.textContent = [
            '.cute-trail{position:fixed;pointer-events:none;z-index:99998;',
            'font-size:16px;will-change:transform,opacity;',
            'animation:cuteTrail 1s ease-out forwards}',
            '@keyframes cuteTrail{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}',
            '100%{opacity:0;transform:translate(-50%,-140%) scale(0.4)}}'
        ].join('');
        document.head.appendChild(style);

        var last = 0;
        function spawn(x, y) {
            var now = Date.now();
            if (now - last < THROTTLE_MS) return;
            last = now;

            var heart = document.createElement('div');
            heart.className = 'cute-trail';
            heart.textContent = HEARTS[(Math.floor(x + y)) % HEARTS.length];
            heart.style.left = x + 'px';
            heart.style.top = y + 'px';
            heart.style.fontSize = (12 + ((x + y) % 10)) + 'px';
            document.body.appendChild(heart);
            setTimeout(function () { heart.remove(); }, 1000);
        }

        document.addEventListener('pointermove', function (e) {
            spawn(e.clientX, e.clientY);
        }, { passive: true });

        // touchmove for browsers that don't fire pointermove on touch
        document.addEventListener('touchmove', function (e) {
            var t = e.touches && e.touches[0];
            if (t) spawn(t.clientX, t.clientY);
        }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
