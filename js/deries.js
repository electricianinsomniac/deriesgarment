(function() {
    "use strict";

    // Keep media frames intentional while the user-owned assets are not present yet.
    document.querySelectorAll('.dg-media-frame img, .dg-product-media img').forEach(function(image) {
      const frame = image.closest('figure');
      const markMissing = function() {
        if (frame) frame.classList.add('is-missing');
      };
      const markAvailable = function() {
        if (frame) frame.classList.remove('is-missing');
      };

      image.addEventListener('error', markMissing);
      image.addEventListener('load', markAvailable);
      if (image.complete) {
        if (image.naturalWidth === 0) markMissing();
        else markAvailable();
      }
    });

    // Hero slider: auto crossfade every 4.5s, paused on hover/focus (instant swap with reduced motion)
    const slider = document.querySelector('.dg-slider');
    if (slider) {
      const slides = slider.querySelectorAll('.dg-slide');
      const dots = slider.querySelectorAll('.dg-slider-dot');
      let current = 0;
      let timer = null;
      const show = function(index) {
        current = (index + slides.length) % slides.length;
        slides.forEach(function(slide, i) { slide.classList.toggle('is-active', i === current); });
        dots.forEach(function(dot, i) {
          dot.classList.toggle('is-active', i === current);
          dot.setAttribute('aria-selected', String(i === current));
        });
      };
      const start = function() {
        if (timer || slides.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        timer = setInterval(function() { show(current + 1); }, 4500);
      };
      const stop = function() {
        clearInterval(timer);
        timer = null;
      };
      dots.forEach(function(dot, i) {
        dot.addEventListener('click', function() {
          stop();
          show(i);
          start();
        });
      });
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', start);
      slider.addEventListener('focusin', stop);
      slider.addEventListener('focusout', start);
      start();
    }

    const embroideryVideo = document.querySelector('.dg-video-banner video');
    const videoFrame = embroideryVideo ? embroideryVideo.closest('.dg-video-banner') : null;
    if (embroideryVideo && videoFrame) {
      const markVideoMissing = function() {
        videoFrame.classList.add('is-missing');
      };
      embroideryVideo.addEventListener('error', markVideoMissing);
      embroideryVideo.querySelectorAll('source').forEach(function(source) {
        source.addEventListener('error', markVideoMissing);
      });
      if (embroideryVideo.error) markVideoMissing();
    }

    // Smooth scroll for section links, with room for the fixed navbar
    document.querySelectorAll('.dg-nav-links a[href^="#"]').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (this.hash) {
          var target = document.querySelector(this.hash);
          if (target) {
            e.preventDefault();
            var offset = 80; // navbar height
            var targetPos = target.getBoundingClientRect().top + window.pageYOffset - offset;
            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            window.scrollTo({ top: targetPos, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }
        }
      });
    });
  })();
