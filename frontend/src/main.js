const backendStatus = document.querySelector("#backend-status");
const deckList = document.querySelector("#deck-list");
const deckCount = document.querySelector("#deck-count");
const deckSection = document.querySelector(".deck-section");
const deckDetail = document.querySelector("#deck-detail");

function getApiBase() {
  // Local frontend dev server runs separately from the Worker.
  if (window.location.origin === "http://localhost:5173") {
    return "http://localhost:8787";
  }

  // Deployed frontend and Worker should share the same origin.
  return "";
}

function apiPath(path) {
  return `${getApiBase()}${path}`;
}

async function fetchJson(path) {
  const response = await fetch(apiPath(path), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function setBackendStatus(message, state) {
  backendStatus.textContent = message;
  backendStatus.dataset.state = state;
}

function showDeckList() {
  deckSection.hidden = false;
  deckDetail.hidden = true;
  deckDetail.textContent = "";
}

function showDeckDetail() {
  deckSection.hidden = true;
  deckDetail.hidden = false;
}

function renderDecks(decks) {
  deckList.textContent = "";

  if (!Array.isArray(decks) || decks.length === 0) {
    deckCount.textContent = "No decks yet";
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your decks will appear here once the backend has data.";
    deckList.append(empty);
    return;
  }

  deckCount.textContent = `${decks.length} deck${decks.length === 1 ? "" : "s"}`;

  for (const deck of decks) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "deck-card";
    item.addEventListener("click", () => loadDeckDetail(deck.id));

    const title = document.createElement("h3");
    title.textContent = deck.title || "Untitled deck";

    const source = document.createElement("p");
    source.className = "deck-source";
    source.textContent = deck.sourceName || "Unknown source";

    const meta = document.createElement("p");
    meta.className = "deck-meta";
    const phraseCount = Number.isFinite(deck.phraseCount) ? deck.phraseCount : 0;
    const updatedAt = deck.updatedAt ? new Date(deck.updatedAt).toLocaleString() : "Unknown update time";
    meta.textContent = `${phraseCount} phrase${phraseCount === 1 ? "" : "s"} - Updated ${updatedAt}`;

    item.append(title, source, meta);
    deckList.append(item);
  }
}

function appendOptionalPhraseDetail(parent, label, value) {
  if (!value) {
    return;
  }

  const detail = document.createElement("p");
  detail.className = "phrase-detail";

  const labelText = document.createElement("strong");
  labelText.textContent = `${label}: `;

  detail.append(labelText, value);
  parent.append(detail);
}

function createBackButton() {
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "back-button";
  backButton.textContent = "Back to decks";
  backButton.addEventListener("click", showDeckList);
  return backButton;
}

function renderDeckDetail(deck) {
  deckDetail.textContent = "";
  showDeckDetail();

  const title = document.createElement("h2");
  title.textContent = deck.title || "Untitled deck";

  const source = document.createElement("p");
  source.className = "deck-source";
  source.textContent = deck.sourceName || "Unknown source";

  const phrases = Array.isArray(deck.phrases) ? deck.phrases : [];
  const count = document.createElement("p");
  count.className = "deck-meta";
  count.textContent = `${phrases.length} phrase${phrases.length === 1 ? "" : "s"}`;

  const phraseList = document.createElement("div");
  phraseList.className = "phrase-list";

  if (phrases.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "This deck does not have phrases yet.";
    phraseList.append(empty);
  }

  for (const phrase of phrases) {
    const item = document.createElement("article");
    item.className = "phrase-card";

    const heading = document.createElement("div");
    heading.className = "phrase-heading";

    const phraseTitle = document.createElement("h3");
    phraseTitle.textContent = phrase.phrase || "Untitled phrase";

    const type = document.createElement("span");
    type.className = "phrase-type";
    type.textContent = phrase.type || "unknown";

    heading.append(phraseTitle, type);

    const meaning = document.createElement("p");
    meaning.className = "phrase-meaning";
    meaning.textContent = phrase.meaning || "No meaning provided.";

    item.append(heading, meaning);
    appendOptionalPhraseDetail(item, "Example", phrase.example);
    appendOptionalPhraseDetail(item, "Pattern", phrase.pattern);
    appendOptionalPhraseDetail(item, "Trap", phrase.trap);

    if (Array.isArray(phrase.tags) && phrase.tags.length > 0) {
      const tags = document.createElement("div");
      tags.className = "tag-list";

      for (const tag of phrase.tags) {
        const chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = tag;
        tags.append(chip);
      }

      item.append(tags);
    }

    phraseList.append(item);
  }

  deckDetail.append(createBackButton(), title, source, count, phraseList);
}

function renderDeckDetailError() {
  deckDetail.textContent = "";
  showDeckDetail();

  const message = document.createElement("p");
  message.className = "empty-state error";
  message.textContent = "This deck could not be loaded right now. Go back and try again.";

  deckDetail.append(createBackButton(), message);
}

async function loadHealth() {
  try {
    const health = await fetchJson("/api/health");
    if (health.ok) {
      setBackendStatus("Backend reachable", "ok");
      return;
    }

    setBackendStatus("Backend responded, but did not report healthy.", "warn");
  } catch (error) {
    setBackendStatus("Backend is not reachable yet.", "error");
  }
}

async function loadDecks() {
  try {
    const decks = await fetchJson("/api/decks");
    renderDecks(decks);
  } catch (error) {
    deckCount.textContent = "Could not load decks";
    deckList.textContent = "";

    const message = document.createElement("p");
    message.className = "empty-state error";
    message.textContent = "Decks could not be loaded right now. Check that the Worker is running and try again.";
    deckList.append(message);
  }
}

async function loadDeckDetail(deckId) {
  if (!deckId) {
    return;
  }

  deckDetail.textContent = "";
  showDeckDetail();

  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Loading deck...";
  deckDetail.append(loading);

  try {
    const deck = await fetchJson(`/api/decks/${encodeURIComponent(deckId)}`);
    renderDeckDetail(deck);
  } catch (error) {
    renderDeckDetailError();
  }
}

loadHealth();
loadDecks();
