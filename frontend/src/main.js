const backendStatus = document.querySelector("#backend-status");
const deckList = document.querySelector("#deck-list");
const deckCount = document.querySelector("#deck-count");

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
    const item = document.createElement("article");
    item.className = "deck-card";

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

loadHealth();
loadDecks();
