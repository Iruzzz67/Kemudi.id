// Kemudi.id — peningkatan UI sisi klien (Blazor Server friendly).
// Aman untuk DOM dinamis: IntersectionObserver untuk elemen yang sudah ada,
// MutationObserver untuk konten yang dirender ulang Blazor setelah navigasi.
(function () {
    'use strict';

    var hasIO = 'IntersectionObserver' in window;

    // ── 1. Scroll reveal ────────────────────────────────────────────────────
    var revealObserver = null;
    if (hasIO) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    }

    function observeReveal(root) {
        if (!revealObserver) return;
        var els = root.querySelectorAll('.card, .section-title, .hero > h1, .hero > p');
        els.forEach(function (el) {
            if (el.classList.contains('reveal')) return;
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    }

    // ── 2. Angka beranimasi (elemen .count-up dengan data-target) ───────────
    var countObserver = null;
    if (hasIO) {
        countObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                animateCount(entry.target);
                countObserver.unobserve(entry.target);
            });
        }, { threshold: 0.4 });
    }

    function observeCounters(root) {
        if (!countObserver) return;
        root.querySelectorAll('.count-up').forEach(function (el) {
            if (el.dataset.countBound) return;
            el.dataset.countBound = '1';
            countObserver.observe(el);
        });
    }

    function animateCount(el) {
        var target = parseFloat(el.dataset.target || el.textContent || '0');
        var prefix = el.dataset.prefix || '';
        var suffix = el.dataset.suffix || '';
        var duration = 900;
        var start = null;

        function step(ts) {
            if (!start) start = ts;
            var progress = Math.min(1, (ts - start) / duration);
            var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            var value = Math.round(target * eased);
            el.textContent = prefix + value.toLocaleString('id-ID') + suffix;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = prefix + target.toLocaleString('id-ID') + suffix;
        }
        requestAnimationFrame(step);
    }

    // ── 3. Ripple tombol ────────────────────────────────────────────────────
    document.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.btn') : null;
        if (!btn || btn.disabled) return;
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var span = document.createElement('span');
        span.className = 'ripple';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - rect.left - size / 2) + 'px';
        span.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(span);
        setTimeout(function () { span.remove(); }, 600);
    });

    // ── 4. Navbar bayangan saat scroll ──────────────────────────────────────
    function updateNavShadow() {
        var nav = document.querySelector('.kemudi-navbar, header nav, .navbar, nav.site-nav');
        if (!nav) return;
        nav.classList.toggle('scrolled', window.scrollY > 8);
    }
    window.addEventListener('scroll', updateNavShadow, { passive: true });

    // ── 5. Watcher konten dinamis Blazor ────────────────────────────────────
    observeReveal(document);
    observeCounters(document);

    if (hasIO && 'MutationObserver' in window) {
        new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType !== 1) return;
                    observeReveal(node);
                    observeCounters(node);
                    if (node.classList && node.classList.contains('count-up')) observeCounters(node.parentNode);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
})();
