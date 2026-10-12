/**
 * Royal Home Painting — Main Interactive UI Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileNav();
  initScrollReveals();
  initSmoothScroll();
  initSocialDeepLinks();
  initDynamicSiteConfig();
});

/**
 * Enhanced Instagram App redirection & WhatsApp pre-filled messaging
 */
function initSocialDeepLinks() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

  // 1. WhatsApp Deep Linking (ensures message is automatically typed in composer)
  document.addEventListener('click', (e) => {
    const waLink = e.target.closest('a[href*="wa.me"], a[href*="whatsapp.com"], .floating-whatsapp, .mobile-bar-item-wa, .btn-whatsapp');
    if (!waLink) return;

    const href = waLink.getAttribute('href') || '';
    if (!href || href === '#') return;

    e.preventDefault();

    let text = '';
    let phone = '919380017556';

    try {
      const urlObj = new URL(href, window.location.href);
      text = urlObj.searchParams.get('text') || '';
      const phoneParam = urlObj.searchParams.get('phone');
      if (phoneParam) {
        phone = phoneParam.replace(/\D/g, '');
      } else if (urlObj.pathname) {
        const seg = urlObj.pathname.split('/').filter(Boolean);
        if (seg.length && /^\d+$/.test(seg[seg.length - 1])) {
          phone = seg[seg.length - 1];
        }
      }
    } catch (_) {
      const match = href.match(/[?&]text=([^&]+)/);
      if (match) text = decodeURIComponent(match[1]);
    }

    if (!text) {
      text = 'Hi Royal Home Painting, I would like to get a free quote for my home in Bangalore.';
    }

    const encodedText = encodeURIComponent(text);

    if (isMobile) {
      // Native scheme forces WhatsApp app to launch and pre-type the text into composer
      const nativeScheme = `whatsapp://send?phone=${phone}&text=${encodedText}`;
      const webFallback = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

      const startTime = Date.now();
      window.location.href = nativeScheme;

      setTimeout(() => {
        // If app wasn't launched after 800ms, fallback to web
        if (Date.now() - startTime < 1500 && !document.hidden) {
          window.location.href = webFallback;
        }
      }, 800);
    } else {
      // Desktop browser -> WhatsApp Web or WhatsApp Desktop app
      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`, '_blank', 'noopener,noreferrer');
    }
  });

  // 2. Instagram Deep Linking (opens native app directly without web login wall)
  document.addEventListener('click', (e) => {
    const igLink = e.target.closest('a[href*="instagram.com"], .instagram-link');
    if (!igLink) return;

    e.preventDefault();
    const username = 'royalhomepainting11';
    const webUrl = `https://www.instagram.com/${username}/`;

    if (isAndroid) {
      // Android Intent URI directly opens the Instagram App to the profile
      window.location.href = `intent://instagram.com/_u/${username}/#Intent;package=com.instagram.android;scheme=https;end`;
    } else if (isIOS) {
      // iOS custom scheme opens native Instagram app, timer fallback to web
      const startTime = Date.now();
      window.location.href = `instagram://user?username=${username}`;

      setTimeout(() => {
        if (Date.now() - startTime < 1500 && !document.hidden) {
          window.location.href = webUrl;
        }
      }, 800);
    } else {
      // Desktop browser
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  });
}

/**
 * Adds background blur and shadow when scrolled
 */
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close mobile menu when clicking nav link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/**
 * Staggered IntersectionObserver for element reveals
 */
function initScrollReveals() {
  const reveals = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    // Fallback for browsers without IntersectionObserver
    reveals.forEach(el => el.classList.add('active'));
  }
}

/**
 * Smooth anchor scrolling
 */
function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/**
 * Quick helper to set dropdown value when clicking a service card CTA
 * @param {string} serviceName 
 */
window.selectServiceOption = function(serviceName) {
  const select = document.getElementById('lead-service');
  if (select) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value.includes(serviceName)) {
        select.selectedIndex = i;
        break;
      }
    }
  }
  const formElement = document.getElementById('quote-form');
  if (formElement) {
    formElement.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('lead-name');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 400);
    }
  }
};

/**
 * Dynamic Website Configuration:
 * Automatically applies phone, WhatsApp, announcement promo banner, tagline,
 * and service area updates made from the CRM Web Dashboard.
 */
async function initDynamicSiteConfig() {
  const isGithubPages = window.location.hostname.includes('github.io');
  const isFileProtocol = window.location.protocol === 'file:';
  const API_BASE = (isGithubPages || isFileProtocol) ? 'https://royal-home-painting.vercel.app' : '';

  let config = null;

  // 1. Instant reflection from localStorage if cached
  try {
    const cached = localStorage.getItem('rhp_site_config');
    if (cached) {
      config = JSON.parse(cached);
      applySiteConfig(config);
    }
  } catch (_) {}

  // 2. Fetch live settings from server
  try {
    const res = await fetch(`${API_BASE}/api/site-config`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        config = data.config;
        try {
          localStorage.setItem('rhp_site_config', JSON.stringify(config));
        } catch (_) {}
        applySiteConfig(config);
      }
    }
  } catch (err) {
    // If running offline or notice, cached config is already active
  }
}

function applySiteConfig(c) {
  if (!c) return;

  // 1. Phone Number links and labels
  if (c.phone) {
    const cleanDigits = c.phone.replace(/\D/g, '');
    const phoneHref = `tel:${c.phone.startsWith('+') ? c.phone.replace(/\s+/g, '') : `+91${cleanDigits}`}`;

    document.querySelectorAll('a[href^="tel:"]').forEach(el => {
      el.setAttribute('href', phoneHref);
      // If inner text looks like a phone number, update displayed text
      if (/\d{5}/.test(el.textContent)) {
        if (el.classList.contains('header-phone-link')) {
          el.innerHTML = `<span>📞</span> ${c.phone}`;
        } else if (el.closest('.contact-card-item')) {
          const valEl = el.querySelector('.contact-item-val');
          if (valEl) valEl.textContent = c.phone;
        } else if (el.textContent.includes('Phone:')) {
          el.textContent = `Phone: ${c.phone}`;
        }
      }
    });
  }

  // 2. WhatsApp Target Number
  if (c.whatsapp) {
    const cleanWa = c.whatsapp.replace(/\D/g, '');
    const fullWa = cleanWa.length === 10 ? `91${cleanWa}` : cleanWa;

    document.querySelectorAll('a[href*="wa.me"], a[href*="api.whatsapp.com"]').forEach(el => {
      const currentHref = el.getAttribute('href');
      if (currentHref) {
        try {
          const u = new URL(currentHref, window.location.href);
          u.searchParams.set('phone', fullWa);
          el.setAttribute('href', u.toString());
        } catch (_) {}
      }
    });
  }

  // 3. Top Announcement & Promo Banner
  const bannerEl = document.getElementById('site-promo-banner');
  const bannerTextEl = document.getElementById('site-promo-banner-text');
  const isBannerActive = c.promoBannerActive !== undefined ? c.promoBannerActive : c.banner_active;
  const bannerText = c.promoBanner || c.banner_text;
  if (bannerEl) {
    if (isBannerActive && bannerText) {
      bannerEl.style.display = 'block';
      if (bannerTextEl) bannerTextEl.textContent = bannerText;
    } else {
      bannerEl.style.display = 'none';
    }
  }

  // 4. Tagline & Subhead
  if (c.tagline) {
    const taglineEl = document.getElementById('hero-tagline');
    if (taglineEl) taglineEl.textContent = c.tagline;
  }

  // 5. Operating Service Areas
  const areasText = c.serviceAreas || c.service_areas;
  if (areasText) {
    const areasEl = document.getElementById('site-service-areas-text');
    if (areasEl) areasEl.textContent = areasText;
  }
}



