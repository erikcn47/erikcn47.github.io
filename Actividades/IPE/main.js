/* =====================================================
   SMR TECH & REPAIR — MAIN JS
   ===================================================== */

// ── Navbar scroll effect ──────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ── Hamburger menu ────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  const isOpen = mobileMenu.classList.contains('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu on link click
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});

// ── Scroll reveal ─────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

document.querySelectorAll('.reveal').forEach(el => {
  revealObserver.observe(el);
});

// ── Smooth active nav links ───────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'var(--cyan)';
        }
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));

// ── Contact form ──────────────────────────────────────
const form = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const btn = form.querySelector('.btn-primary');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  // Simulate async send
  setTimeout(() => {
    formSuccess.classList.add('show');
    btn.textContent = '✓ Enviado';
    form.querySelectorAll('input, select, textarea').forEach(el => {
      el.value = '';
    });
    setTimeout(() => {
      btn.textContent = 'Enviar solicitud →';
      btn.disabled = false;
      formSuccess.classList.remove('show');
    }, 5000);
  }, 1200);
});

// ── Animated counter numbers ──────────────────────────
function animateValue(el, start, end, suffix, duration) {
  let startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * (end - start) + start);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ── Scroll-triggered bar animation ───────────────────
const barFill = document.querySelector('.bar-fill');
if (barFill) {
  barFill.style.width = '0%';
  setTimeout(() => {
    barFill.style.transition = 'width 1.5s ease 0.5s';
    barFill.style.width = '85%';
  }, 300);
}

// ── Navbar smooth scroll for all anchor links ─────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ── PC card floating animation ───────────────────────
const pcCard = document.querySelector('.pc-card');
if (pcCard) {
  let tick = 0;
  const float = () => {
    tick += 0.02;
    const y = Math.sin(tick) * 8;
    pcCard.style.transform = `translateY(${y}px)`;
    requestAnimationFrame(float);
  };
  float();
}
