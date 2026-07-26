/* Matthew Bergstrom — portfolio behavior.
   Everything here is progressive: without JS the page is fully readable, and
   every motion feature is gated on prefers-reduced-motion / pointer type. */

const root = document.documentElement;
root.classList.add("js");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

/* ------------------------------------------------------------- navigation */

function initNavigation() {
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = Array.from(document.querySelectorAll("main > section[id]"));

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open", !expanded);
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href")?.replace("#", "");
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      event.preventDefault();

      const headerOffset = header?.offsetHeight || 0;
      const targetTop =
        target.getBoundingClientRect().top + window.scrollY - headerOffset;

      window.scrollTo({
        top: targetTop,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });

      if (nav && navToggle) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  const update = () => {
    header?.classList.toggle("scrolled", window.scrollY > 8);

    const marker = window.scrollY + window.innerHeight * 0.35;
    let currentId = "";

    sections.forEach((section) => {
      const top = section.offsetTop;
      if (marker >= top && marker < top + section.offsetHeight) {
        currentId = section.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`
      );
    });
  };

  let rafId = 0;
  window.addEventListener(
    "scroll",
    () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    },
    { passive: true }
  );

  update();
}

/* ------------------------------------------------- scroll-driven headings */

function initScrollType() {
  const titles = Array.from(document.querySelectorAll("[data-words]"));
  if (!titles.length) return;

  // Split into per-word spans so each can carry its own stagger index. The
  // text content is unchanged, so assistive tech reads the heading normally.
  titles.forEach((title) => {
    const words = title.textContent.trim().split(/\s+/);
    title.textContent = "";
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.className = "word";
      span.style.setProperty("--i", String(i));
      span.textContent = word;
      title.append(span, i < words.length - 1 ? " " : "");
    });
  });

  if (prefersReducedMotion) {
    titles.forEach((title) => title.classList.add("in-view"));
    return;
  }

  // Native scroll-driven animations handle it in CSS where supported.
  if (CSS.supports("animation-timeline: view()")) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );

  titles.forEach((title) => observer.observe(title));
}

/* -------------------------------------------------------------- the hero */

/* The display name is a window onto the landscape photo; moving the pointer
   shifts the view inside the letterforms. */
function initHeroParallax() {
  const hero = document.querySelector(".hero");
  const title = document.querySelector(".hero-title");
  if (!hero || !title || prefersReducedMotion || !hasFinePointer) return;

  const MAX = 26;
  let pending = false;
  let x = 0;
  let y = 0;

  const apply = () => {
    pending = false;
    title.style.setProperty("--mx", `${x}px`);
    title.style.setProperty("--my", `${y}px`);
  };

  const onMove = (event) => {
    const rect = hero.getBoundingClientRect();
    x = ((event.clientX - rect.left) / rect.width - 0.5) * -2 * MAX;
    y = ((event.clientY - rect.top) / rect.height - 0.5) * -2 * (MAX / 2);
    if (pending) return;
    pending = true;
    requestAnimationFrame(apply);
  };

  hero.addEventListener("pointermove", onMove, { passive: true });

  // Stop listening once the hero is off screen.
  const visibility = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        hero.addEventListener("pointermove", onMove, { passive: true });
      } else {
        hero.removeEventListener("pointermove", onMove);
      }
    },
    { threshold: 0 }
  );
  visibility.observe(hero);
}

/* ----------------------------------------------------------- the cursor */

function initCursor() {
  if (!hasFinePointer || prefersReducedMotion) return;

  const cursor = document.querySelector(".cursor");
  const dot = cursor?.querySelector(".cursor-dot");
  const ring = cursor?.querySelector(".cursor-ring");
  if (!cursor || !dot || !ring) return;

  root.classList.add("has-cursor");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let ringX = targetX;
  let ringY = targetY;

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!root.classList.contains("cursor-live")) {
        // Jump the ring to the pointer on first move instead of flying in.
        ringX = event.clientX;
        ringY = event.clientY;
        root.classList.add("cursor-live");
      }
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
    },
    { passive: true }
  );

  const loop = () => {
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener("pointerover", (event) => {
    const hot = event.target instanceof Element &&
      event.target.closest('[data-cursor="hover"], a, button, summary');
    root.classList.toggle("cursor-hot", Boolean(hot));
  });

  document.addEventListener("pointerleave", () =>
    root.classList.remove("cursor-hot")
  );
}

/* ---------------------------------------------------------- easter eggs */

function initEasterEggs() {
  // 1. Konami code toggles blueprint mode: the layout grid, exposed.
  const KONAMI = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "b",
    "a"
  ];
  let progress = 0;

  window.addEventListener("keydown", (event) => {
    const expected = KONAMI[progress];
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (key === expected) {
      progress += 1;
      if (progress === KONAMI.length) {
        progress = 0;
        const on = root.classList.toggle("blueprint");
        console.log(
          on ? "blueprint mode on — this is the grid." : "blueprint mode off."
        );
      }
      return;
    }

    progress = key === KONAMI[0] ? 1 : 0;
  });

  // 2. A note for anyone who opens devtools.
  console.log(
    "%cMATTHEW BERGSTROM",
    "font: 700 22px/1 system-ui; letter-spacing: 2px;"
  );
  console.log(
    "%cPlatform engineer. You're in the devtools, so you're my kind of person.\n" +
      "Two things to try: the konami code, and triple-clicking the MB up top.\n" +
      "matthewbergstrom23@gmail.com",
    "font: 13px/1.6 ui-monospace, monospace;"
  );

  // 3. Triple-click the wordmark.
  const brand = document.querySelector(".brand");
  const secret = document.querySelector(".brand-secret");
  if (brand && secret) {
    brand.addEventListener("click", (event) => {
      if (event.detail < 3) return;
      event.preventDefault();
      secret.hidden = !secret.hidden;
    });
  }
}

initNavigation();
initScrollType();
initHeroParallax();
initCursor();
initEasterEggs();
