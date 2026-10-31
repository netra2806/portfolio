/**
 * Netraa Ingale Portfolio
 * Scroll-Driven Cinematic Hero Animation & Interactive System
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 80;
  const FRAME_PATH_PREFIX = 'frames/frame_';
  const FRAME_EXTENSION = '.jpg';

  // Precomputed edge/background colors for each of the 80 frames
  // Seamlessly transitions from studio off-white (243,243,243) -> warm gaze -> deep pupil black (0,0,0)
  const FRAME_COLORS = [
    [243, 243, 243], [242, 241, 241], [242, 241, 241], [242, 241, 241], [242, 241, 241],
    [242, 240, 241], [242, 241, 241], [243, 242, 243], [243, 242, 243], [243, 242, 243],
    [243, 242, 243], [243, 242, 243], [243, 242, 243], [244, 242, 243], [244, 242, 243],
    [244, 242, 243], [244, 242, 243], [244, 242, 243], [244, 242, 243], [244, 242, 243],
    [244, 242, 243], [245, 243, 244], [214, 210, 210], [179, 174, 172], [177, 172, 171],
    [176, 171, 171], [173, 168, 167], [180, 173, 173], [177, 172, 172], [174, 168, 167],
    [178, 172, 172], [151, 134, 139], [158, 141, 142], [148, 125, 119], [144, 120, 109],
    [143, 110, 93],  [119, 98, 84],   [139, 110, 92],  [112, 68, 41],   [120, 76, 47],
    [132, 82, 49],   [173, 113, 65],  [171, 112, 64],  [166, 114, 73],  [132, 79, 49],
    [184, 111, 62],  [193, 122, 68],  [207, 129, 73],  [193, 112, 60],  [156, 93, 53],
    [167, 97, 54],   [181, 108, 62],  [169, 102, 57],  [168, 97, 49],   [220, 138, 78],
    [208, 120, 65],  [185, 109, 62],  [193, 115, 67],  [211, 126, 71],  [202, 121, 69],
    [162, 92, 53],   [162, 95, 56],   [168, 98, 59],   [149, 83, 45],   [139, 78, 44],
    [128, 73, 43],   [124, 71, 42],   [122, 73, 45],   [115, 67, 41],   [104, 60, 38],
    [88, 51, 31],    [78, 44, 27],    [66, 38, 22],    [51, 29, 16],    [33, 18, 11],
    [13, 6, 1],      [2, 0, 0],       [0, 0, 0],       [0, 0, 0],       [0, 0, 0]
  ];

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCounter = document.getElementById('preloader-counter');

  const heroTrack = document.getElementById('hero-track');
  const heroSticky = document.getElementById('hero-sticky');
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const heroAura = document.getElementById('hero-aura');
  const heroScrollHint = document.getElementById('hero-scroll-hint');

  const hudFrameNum = document.getElementById('hud-frame-num');
  const hudProgressBar = document.getElementById('hud-progress-bar');
  const siteHeader = document.getElementById('site-header');

  const cursorGlow = document.getElementById('cursor-glow');
  const toastPopup = document.getElementById('toast-popup');

  // Animation & Frame State
  const images = [];
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let isCanvasReady = false;
  let lastDrawnIndex = -1;

  /**
   * Helper: Format frame file path
   * frame_000.jpg to frame_079.jpg
   */
  function getFrameSrc(index) {
    const padIndex = String(index).padStart(3, '0');
    return `${FRAME_PATH_PREFIX}${padIndex}${FRAME_EXTENSION}`;
  }

  /**
   * Helper: Calculate smoothly interpolated background color
   */
  function getInterpolatedBgColor(frameFloat) {
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, frameFloat));
    const idx1 = Math.floor(clamped);
    const idx2 = Math.min(TOTAL_FRAMES - 1, idx1 + 1);
    const ratio = clamped - idx1;

    const c1 = FRAME_COLORS[idx1] || [243, 243, 243];
    const c2 = FRAME_COLORS[idx2] || [0, 0, 0];

    const r = Math.round(c1[0] + (c2[0] - c1[0]) * ratio);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * ratio);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * ratio);

    return { r, g, b, css: `rgb(${r}, ${g}, ${b})` };
  }

  /**
   * Preload all frames sequentially with priority on frame 0
   */
  function preloadImages() {
    return new Promise((resolve) => {
      // 1. First priority: Load Frame 0 immediately
      const firstImg = new Image();
      firstImg.src = getFrameSrc(0);
      firstImg.onload = () => {
        images[0] = firstImg;
        loadedCount++;
        renderFrame(0, 0);
        isCanvasReady = true;

        // 2. Preload remaining 79 frames in parallel
        for (let i = 1; i < TOTAL_FRAMES; i++) {
          const img = new Image();
          img.src = getFrameSrc(i);
          img.onload = () => {
            loadedCount++;
            onImageLoaded();
            if (loadedCount >= TOTAL_FRAMES) {
              resolve();
            }
          };
          img.onerror = () => {
            console.warn(`Fallback for frame ${i}`);
            loadedCount++;
            images[i] = images[0];
            if (loadedCount >= TOTAL_FRAMES) {
              resolve();
            }
          };
          images[i] = img;
        }
      };

      firstImg.onerror = (err) => {
        console.error('Error loading initial frame:', err);
        resolve();
      };
    });
  }

  /**
   * Preload Progress handler
   */
  function onImageLoaded() {
    const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    if (preloaderBar) preloaderBar.style.width = `${percent}%`;
    if (preloaderCounter) preloaderCounter.textContent = `${percent}%`;

    if (percent === 100) {
      setTimeout(dismissPreloader, 300);
    }
  }

  /**
   * Smoothly hide the preloader
   */
  function dismissPreloader() {
    if (!preloader) return;
    document.body.classList.remove('is-loading');
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
  }

  /**
   * Resize Canvas for crisp High-DPI display
   */
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.scale(dpr, dpr);
    lastDrawnIndex = -1; // Force redraw on resize
    renderFrame(Math.round(currentFrame), currentFrame);
  }

  /**
   * Render a specific frame on canvas
   * Fully visible 1:1 square, nicely zoomed out, perfectly centered,
   * with dynamically matched background seamlessly filling the surrounding space.
   */
  function renderFrame(index, frameFloat) {
    if (!canvas || !ctx) return;
    const img = images[index];
    if (!img || !img.complete) return;

    const canvasW = canvas.clientWidth || window.innerWidth;
    const canvasH = canvas.clientHeight || window.innerHeight;

    // 1. Get smoothly interpolated background color
    const bgColor = getInterpolatedBgColor(frameFloat !== undefined ? frameFloat : index);

    // 2. Synchronize viewport container background
    if (heroSticky) {
      heroSticky.style.backgroundColor = bgColor.css;
    }

    // 3. Clear and fill the canvas with the matching background color
    ctx.fillStyle = bgColor.css;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 4. Subtle ambient lighting around the character in early frames
    if (bgColor.r > 150) {
      const auraGrad = ctx.createRadialGradient(
        canvasW * 0.5, canvasH * 0.5, 50,
        canvasW * 0.5, canvasH * 0.5, Math.max(canvasW, canvasH) * 0.7
      );
      auraGrad.addColorStop(0, 'rgba(235, 215, 240, 0.35)');
      auraGrad.addColorStop(0.5, 'rgba(244, 235, 245, 0.15)');
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    // 5. Dynamic Zoom Progression:
    // User requested: "as we go further zoom those images instead of adding background for them"
    // Phase 1 (frames 0 to ~16): Centered 1:1 containment with comfortable breathing room.
    // Phase 2 (frames 16 to ~44): Smoothly zooms up from 1:1 containment to 100% full-screen cover.
    // Phase 3 (frames 45 to 79): Full-screen immersion into the eye/pupil, ending in pure black.
    const isMobile = window.innerWidth < 768;
    const currentProgressFrame = frameFloat !== undefined ? frameFloat : index;
    const imgW = img.naturalWidth || 1080;
    const imgH = img.naturalHeight || 1080;

    // Centered contain scale (Phase 1):
    // Desktop Web remains untouched at 0.78.
    // Phone view uses 0.90 of width so initial frame 0 is prominent, balanced, and not shrunken.
    const containDim = isMobile ? (canvasW * 0.90) : (Math.min(canvasW, canvasH) * 0.78);
    const containScale = containDim / imgW;

    // Full-screen cover scale (Phase 3)
    const coverScale = Math.max(canvasW / imgW, canvasH / imgH) * 1.02;

    // Wisely adjusted zoom progression:
    // On mobile, starting subtle zoom earlier (frame 6) provides immediate, satisfying responsiveness on scroll down
    const zoomStart = isMobile ? 6 : 16;
    const zoomEnd = isMobile ? 46 : 44;
    let t = Math.max(0, Math.min(1, (currentProgressFrame - zoomStart) / (zoomEnd - zoomStart)));
    // Smoothstep easing for cinematic fluid motion
    const easeT = t * t * (3 - 2 * t);

    const currentScale = containScale + (coverScale - containScale) * easeT;

    const drawW = Math.round(imgW * currentScale);
    const drawH = Math.round(imgH * currentScale);
    const offsetX = Math.round((canvasW - drawW) * 0.5);
    const offsetY = Math.round((canvasH - drawH) * 0.5);

    // 6. Draw image centered
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    lastDrawnIndex = index;
  }

  /**
   * Scroll Progress & Frame Target Calculation
   */
  function updateScrollState() {
    if (!heroTrack) return;

    const trackRect = heroTrack.getBoundingClientRect();
    const trackHeight = heroTrack.offsetHeight;
    const viewportHeight = window.innerHeight;
    const maxScroll = trackHeight - viewportHeight;

    // Track scroll progress: 0.0 at top of track, 1.0 at bottom
    const scrolled = -trackRect.top;
    const progress = Math.max(0, Math.min(1, scrolled / maxScroll));

    // Target frame based on progress (0 to 79)
    targetFrame = progress * (TOTAL_FRAMES - 1);

    // Update HUD indicator
    if (hudProgressBar) {
      hudProgressBar.style.width = `${progress * 100}%`;
    }

    // Hide scroll hint once user starts scrolling
    if (heroScrollHint) {
      if (progress > 0.04) {
        heroScrollHint.style.opacity = '0';
        heroScrollHint.style.pointerEvents = 'none';
      } else {
        heroScrollHint.style.opacity = '1';
        heroScrollHint.style.pointerEvents = 'auto';
      }
    }

    // Dynamic aura opacity
    if (heroAura) {
      if (progress > 0.5) {
        heroAura.style.opacity = Math.max(0, 1 - (progress - 0.5) / 0.3).toFixed(2);
      } else {
        heroAura.style.opacity = '1';
      }
    }

    // Header styling on scroll
    if (siteHeader) {
      if (window.scrollY > 80) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }
  }

  /**
   * Buttery Smooth RAF (RequestAnimationFrame) LERP Loop
   */
  function renderLoop() {
    const delta = targetFrame - currentFrame;
    if (Math.abs(delta) > 0.003) {
      currentFrame += delta * 0.15; // smooth lag
      const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));

      renderFrame(frameIndex, currentFrame);

      if (hudFrameNum) {
        hudFrameNum.textContent = `${String(frameIndex + 1).padStart(2, '0')} / ${TOTAL_FRAMES}`;
      }
    }

    requestAnimationFrame(renderLoop);
  }

  /**
   * Interactive Features (Tabs, Copy Email, Form, Clock)
   */
  function initInteractiveFeatures() {
    // Skills Category Filter Tabs
    const filterButtons = document.querySelectorAll('.filter-btn');
    const skillCards = document.querySelectorAll('.skill-card');

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const category = btn.getAttribute('data-category');
        skillCards.forEach((card) => {
          const cardCats = (card.getAttribute('data-category') || '').split(' ');
          if (category === 'all' || cardCats.includes(category)) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });



    // Copy Email to Clipboard
    const copyBtn = document.getElementById('btn-copy-email');
    const copyText = document.getElementById('copy-text');
    const emailElem = document.getElementById('email-address');

    if (copyBtn && emailElem) {
      copyBtn.addEventListener('click', () => {
        const email = emailElem.textContent.trim();
        navigator.clipboard.writeText(email).then(() => {
          showToast('Email copied to clipboard! ✨');
          if (copyText) copyText.textContent = 'Copied!';
          setTimeout(() => {
            if (copyText) copyText.textContent = 'Copy';
          }, 2500);
        }).catch(() => {
          showToast('Email: netraaingale@gmail.com');
        });
      });
    }

    // Contact Form Real Email Delivery (FormSubmit API)
    const contactForm = document.getElementById('contact-form');
    const formToast = document.getElementById('form-toast');
    const submitBtn = document.getElementById('btn-submit');

    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('form-name');
        const emailInput = document.getElementById('form-email');
        const messageInput = document.getElementById('form-message');

        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const message = messageInput ? messageInput.value.trim() : '';

        if (!name || !email || !message) {
          showToast('Please fill out all fields first!');
          return;
        }

        const originalBtnHTML = submitBtn ? submitBtn.innerHTML : 'Send Message →';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Sending... ⏳</span>';
        }

        if (formToast) {
          formToast.style.display = 'none';
          formToast.className = 'form-toast';
        }

        try {
          const response = await fetch('https://formsubmit.co/ajax/netraaingale@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              name: name,
              email: email,
              message: message,
              _subject: `New Portfolio Message from ${name} via Netraa.portfolio`,
              _captcha: 'false',
              _template: 'table'
            })
          });

          const result = await response.json().catch(() => ({}));

          if (response.ok || result.success === 'true' || result.success === true) {
            if (formToast) {
              formToast.textContent = `Thank you, ${name}! Your message has been sent to Netraa's inbox. 🚀`;
              formToast.className = 'form-toast success';
              formToast.style.display = 'block';
            }
            showToast('Message sent to netraaingale@gmail.com! 🚀');
            contactForm.reset();
          } else {
            throw new Error(result.message || 'Submission error');
          }
        } catch (err) {
          console.error('Email dispatch error:', err);
          if (formToast) {
            formToast.innerHTML = `⚠️ Direct delivery couldn't connect. <a href="mailto:netraaingale@gmail.com?subject=Portfolio%20Inquiry%20from%20${encodeURIComponent(name)}&body=${encodeURIComponent(message)}" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">Click here to send directly via Gmail/Mail app</a>`;
            formToast.className = 'form-toast error';
            formToast.style.display = 'block';
          }
          showToast('Could not send automatically. Direct email link provided.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHTML;
          }
          setTimeout(() => {
            if (formToast && formToast.classList.contains('success')) {
              formToast.style.display = 'none';
            }
          }, 8000);
        }
      });
    }

    // Live Clock (India Standard Time)
    const liveTimeElem = document.getElementById('live-time');
    function updateClock() {
      if (!liveTimeElem) return;
      const now = new Date();
      const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      liveTimeElem.textContent = `${now.toLocaleTimeString('en-US', options)} IST`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // Clean up any legacy view mode state
    try {
      localStorage.removeItem('netraa_view_mode');
      document.documentElement.classList.remove('view-mode-phone');
    } catch (err) {}

    // Mouse Glow Follower
    if (cursorGlow) {
      window.addEventListener('pointermove', (e) => {
        cursorGlow.style.left = `${e.clientX}px`;
        cursorGlow.style.top = `${e.clientY}px`;
      }, { passive: true });
    }
  }

  /**
   * Show Toast Notification
   */
  function showToast(message) {
    if (!toastPopup) return;
    toastPopup.textContent = message;
    toastPopup.classList.add('show');
    setTimeout(() => {
      toastPopup.classList.remove('show');
    }, 3200);
  }

  // --- Initialization ---
  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    initInteractiveFeatures();

    // Start preloading images
    preloadImages().then(() => {
      dismissPreloader();
    });

    // Start RAF rendering loop
    renderLoop();

    // Event Listeners
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', () => {
      resizeCanvas();
      updateScrollState();
    });

    // Initial scroll position sync
    updateScrollState();
  });

})();
