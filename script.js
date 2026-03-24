const rotatingLines = [
  "You have been on my mind a lot lately.",
  "I like talking to you more than I should.",
  "You are really easy to like.",
  "This is me trying to say that properly."
];

const mediaCatalog = {
  photos: [
    {
      type: "photo",
      src: "WhatsApp Image 2026-03-07 at 22.47.21.jpeg",
      title: "My goddess",
      caption: "One of my favorite pictures of you.",
      alt: "Naomi smiling"
    }
  ],
  videos: [
    {
      type: "video",
      src: "WhatsApp Video 2026-03-07 at 22.45.59.mp4",
      title: "Video 01",
      caption: "One of those clips I can keep watching."
    },
    {
      type: "video",
      src: "WhatsApp Video 2026-03-07 at 22.47.20 (1).mp4",
      title: "Video 02",
      caption: "Another moment worth keeping."
    },
    {
      type: "video",
      src: "WhatsApp Video 2026-03-07 at 22.47.27.mp4",
      title: "Video 03",
      caption: "The kind of clip that makes me smile again."
    },
    {
      type: "video",
      src: "WhatsApp Video 2026-03-07 at 22.47.27_2.mp4",
      title: "Video 04",
      caption: "Proof that I really was not joking about liking you."
    },
    {
      type: "video",
      src: "WhatsApp Video 2026-03-08 at 10.09.58.mp4",
      title: "Video 05",
      caption: "One more favorite for the catalogue."
    }
  ]
};

const letterLines = [
  "You are easy to talk to, easy to think about, and honestly hard to ignore.",
  "Somewhere along the way, I stopped seeing you as just someone I know and started seeing you as someone I really want.",
  "I like your vibe, I like your smile, and I like how natural it feels whenever we talk.",
  "So yes, this is me saying it clearly: I like you, my goddess, and I would love a real chance with you."
];

const noResponses = [
  "Are you sure that's what you really want, fine girl?",
  "Hmm. Think about it one more time for me, my goddess.",
  "Still no? You are making this hard for a man that came prepared.",
  "You really want to press no again after all this effort?",
  "Oh. Okay then... I guess we can just be friends."
];

const noNotes = [
  "I am still hoping you change your mind.",
  "You are making this a little stressful for me.",
  "At this point, I think you are enjoying this.",
  "One more no and I may have to accept defeat.",
  "Friend zone accepted. Painfully, but accepted."
];

const rotatingLineEl = document.getElementById("rotating-line");
const letterBody = document.getElementById("letter-body");
const letterButton = document.getElementById("letter-button");
const noButton = document.getElementById("no-button");
const yesButton = document.getElementById("yes-button");
const finalTitle = document.getElementById("final-title");
const finalCopy = document.getElementById("final-copy");
const responseNote = document.getElementById("response-note");
const celebration = document.getElementById("celebration");
const sparkField = document.getElementById("spark-field");
const closeCelebration = document.getElementById("close-celebration");
const menuToggle = document.getElementById("menu-toggle");
const closeMenu = document.getElementById("close-menu");
const mediaDrawer = document.getElementById("media-drawer");
const mediaOverlay = document.getElementById("media-overlay");
const photoGrid = document.getElementById("photo-grid");
const videoGrid = document.getElementById("video-grid");
const photoCount = document.getElementById("photo-count");
const videoCount = document.getElementById("video-count");

let lineIndex = 0;
let rotatingIndex = 0;
let noClickCount = 0;
let yesEmailSent = false;
let noEmailSent = false;

const notifyDecision = async (decision, note) => {
  try {
    const response = await fetch("/api/decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        decision,
        note
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to send decision email.");
    }
  } catch (error) {
    console.error("Decision email failed:", error);
  }
};

const createEmptyState = (label) => {
  const card = document.createElement("article");
  card.className = "media-card media-card-empty";
  card.innerHTML = `
    <p class="media-card-tag">${label}</p>
    <h4>Nothing here yet</h4>
    <p>Add Naomi's ${label.toLowerCase()} files to this project and they can show up here.</p>
  `;
  return card;
};

const renderMediaGrid = (container, items, label, counter) => {
  if (!container || !counter) {
    return;
  }

  counter.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
  container.innerHTML = "";

  if (!items.length) {
    container.appendChild(createEmptyState(label));
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "media-card";

    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.src;
      video.controls = true;
      video.preload = "auto";
      video.playsInline = true;
      video.addEventListener(
        "loadeddata",
        () => {
          const previewTime = Number.isFinite(video.duration) && video.duration > 0.15 ? 0.15 : 0;
          try {
            video.currentTime = previewTime;
          } catch (error) {
            // If the browser blocks seeking here, it will still fall back to the native preview.
          }
        },
        { once: true }
      );
      card.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = item.src;
      image.alt = item.alt || item.title || label;
      card.appendChild(image);
    }

    const caption = document.createElement("div");
    caption.className = "media-card-copy";
    caption.innerHTML = `<h4>${item.title || "Naomi"}</h4><p>${item.caption || ""}</p>`;
    card.appendChild(caption);
    container.appendChild(card);
  });
};

const openDrawer = () => {
  if (!menuToggle || !mediaDrawer || !mediaOverlay) {
    return;
  }

  mediaDrawer.classList.add("is-open");
  mediaOverlay.hidden = false;
  mediaOverlay.classList.add("is-visible");
  mediaDrawer.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
};

const closeDrawer = () => {
  if (!menuToggle || !mediaDrawer || !mediaOverlay) {
    return;
  }

  mediaDrawer.classList.remove("is-open");
  mediaOverlay.classList.remove("is-visible");
  mediaDrawer.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  window.setTimeout(() => {
    if (!mediaDrawer.classList.contains("is-open")) {
      mediaOverlay.hidden = true;
    }
  }, 220);
};

if (rotatingLineEl) {
  window.setInterval(() => {
    rotatingIndex = (rotatingIndex + 1) % rotatingLines.length;
    rotatingLineEl.textContent = rotatingLines[rotatingIndex];
  }, 3200);
}

renderMediaGrid(photoGrid, mediaCatalog.photos, "Photos", photoCount);
renderMediaGrid(videoGrid, mediaCatalog.videos, "Videos", videoCount);

if (menuToggle) {
  menuToggle.addEventListener("click", openDrawer);
}

if (closeMenu) {
  closeMenu.addEventListener("click", closeDrawer);
}

if (mediaOverlay) {
  mediaOverlay.addEventListener("click", closeDrawer);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
  }
});

if (letterButton && letterBody) {
  letterButton.addEventListener("click", () => {
    if (lineIndex >= letterLines.length) {
      return;
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = letterLines[lineIndex];
    letterBody.appendChild(paragraph);
    lineIndex += 1;

    if (lineIndex === letterLines.length) {
      letterButton.textContent = "That is everything";
      letterButton.disabled = true;
      letterButton.style.opacity = "0.75";
      letterButton.style.cursor = "default";
    }
  });
}

const animateNoButton = () => {
  if (!noButton) {
    return;
  }

  const shiftX = Math.floor(Math.random() * 18) - 9;
  const shiftY = Math.floor(Math.random() * 12) - 6;

  noButton.classList.remove("is-wobbling");
  noButton.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
  void noButton.offsetWidth;
  noButton.classList.add("is-wobbling");

  window.setTimeout(() => {
    noButton.style.transform = "";
    noButton.classList.remove("is-wobbling");
  }, 420);
};

const handleNoClick = () => {
  if (!noButton || !finalTitle || !finalCopy || !responseNote) {
    return;
  }

  noClickCount += 1;
  animateNoButton();

  if (noClickCount < 5) {
    finalTitle.textContent = "Hmm... really?";
    finalCopy.textContent = noResponses[noClickCount - 1];
    responseNote.textContent = noNotes[noClickCount - 1];
    noButton.textContent = noClickCount === 4 ? "Last chance to change that" : "No";
    return;
  }

  finalTitle.textContent = "Oh... okay.";
  finalCopy.textContent = noResponses[4];
  responseNote.textContent = noNotes[4];
  noButton.textContent = "Friends";
  noButton.disabled = true;
  noButton.style.opacity = "0.72";
  noButton.style.cursor = "default";
  if (yesButton) {
    yesButton.textContent = "Wait... yes";
  }
  if (!noEmailSent) {
    noEmailSent = true;
    notifyDecision("no", "She pressed no five times and the site landed on the friends ending.");
  }
};

if (noButton) {
  noButton.addEventListener("click", handleNoClick);
}

const launchCelebration = () => {
  if (!celebration || !sparkField || !finalTitle || !finalCopy) {
    return;
  }

  finalTitle.textContent = "I was really hoping you'd say that.";
  finalCopy.textContent =
    "Then I am glad I said it. My goddess, I really do want you, and I am so happy this is not one-sided.";

  celebration.classList.add("is-visible");
  celebration.setAttribute("aria-hidden", "false");
  sparkField.innerHTML = "";

  for (let index = 0; index < 28; index += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.textContent = "\u2665";
    spark.style.left = `${Math.random() * 100}%`;
    spark.style.animationDelay = `${Math.random() * 500}ms`;
    spark.style.animationDuration = `${1200 + Math.random() * 900}ms`;
    spark.style.transform = `scale(${0.75 + Math.random() * 0.8})`;
    sparkField.appendChild(spark);
  }

  if (!yesEmailSent) {
    yesEmailSent = true;
    notifyDecision("yes", "She clicked yes on the girlfriend question.");
  }
};

if (yesButton) {
  yesButton.addEventListener("click", launchCelebration);
}

if (closeCelebration && celebration) {
  closeCelebration.addEventListener("click", () => {
    celebration.classList.remove("is-visible");
    celebration.setAttribute("aria-hidden", "true");
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18
  }
);

document.querySelectorAll("[data-reveal]").forEach((element) => {
  revealObserver.observe(element);
});
