const state = { inventory: [], visible: [], activeIndex: -1 };

const searchInput = document.querySelector("#search");
const seriesSelect = document.querySelector("#series");
const sortSelect = document.querySelector("#sort");
const clearButton = document.querySelector("#clear");
const countLabel = document.querySelector("#result-count");
const gallery = document.querySelector("#gallery");
const emptyState = document.querySelector("#empty");
const viewer = document.querySelector("#viewer");
const viewerImage = document.querySelector("#viewer-image");
const viewerTitle = document.querySelector("#viewer-title");
const viewerStory = document.querySelector("#viewer-story");
const viewerDate = document.querySelector("#viewer-date");
const viewerPosition = document.querySelector("#viewer-position");

const dateValue = (value) => {
  const parsed = Date.parse(`1 ${value}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const issueValue = (value) => {
  const number = Number.parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(number) ? Number.MAX_SAFE_INTEGER : number;
};

const compareText = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function applyFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const series = seriesSelect.value;
  const sort = sortSelect.value;

  state.visible = state.inventory.filter((comic) => {
    if (series && comic.title !== series) return false;
    if (!query) return true;
    return `${comic.title} ${comic.issue} ${comic.story} ${comic.date}`.toLocaleLowerCase().includes(query);
  });

  state.visible.sort((a, b) => {
    if (sort === "date-asc") return dateValue(a.date) - dateValue(b.date) || compareText.compare(a.title, b.title);
    if (sort === "date-desc") return dateValue(b.date) - dateValue(a.date) || compareText.compare(a.title, b.title);
    if (sort === "issue-asc") return issueValue(a.issue) - issueValue(b.issue) || compareText.compare(a.title, b.title);
    if (sort === "issue-desc") return issueValue(b.issue) - issueValue(a.issue) || compareText.compare(a.title, b.title);
    return compareText.compare(a.title, b.title) || issueValue(a.issue) - issueValue(b.issue);
  });

  renderGallery();
}

function renderGallery() {
  gallery.replaceChildren();
  const fragment = document.createDocumentFragment();

  state.visible.forEach((comic, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "comic-card";
    card.setAttribute("aria-label", `Enlarge ${comic.title} issue ${comic.issue}, ${comic.story}, ${comic.date}`);
    card.innerHTML = `
      <img src="${comic.thumb}" alt="Cover of ${comic.title} issue ${comic.issue}" width="460" height="680" loading="lazy" decoding="async">
      <span class="comic-card__copy">
        <h2>${escapeHtml(comic.title)} #${escapeHtml(comic.issue)}</h2>
        <span class="comic-card__story">“${escapeHtml(comic.story || "Story title unavailable")}”</span>
        <span class="comic-card__date">${escapeHtml(comic.date)}</span>
      </span>`;
    card.addEventListener("click", () => openViewer(index));
    fragment.append(card);
  });

  gallery.append(fragment);
  const filtered = searchInput.value.trim() || seriesSelect.value;
  countLabel.textContent = `Showing ${state.visible.length} of ${state.inventory.length} issues`;
  clearButton.hidden = !filtered;
  emptyState.hidden = state.visible.length !== 0;
}

function openViewer(index) {
  state.activeIndex = index;
  updateViewer();
  viewer.showModal();
}

function updateViewer() {
  const comic = state.visible[state.activeIndex];
  if (!comic) return;
  viewerImage.src = comic.image;
  viewerImage.alt = `Enlarged cover of ${comic.title} issue ${comic.issue}`;
  viewerTitle.textContent = `${comic.title} #${comic.issue}`;
  viewerStory.textContent = comic.story || "Story title unavailable";
  viewerDate.textContent = comic.date;
  viewerPosition.textContent = `${state.activeIndex + 1} of ${state.visible.length}`;
}

function moveViewer(direction) {
  if (!state.visible.length) return;
  state.activeIndex = (state.activeIndex + direction + state.visible.length) % state.visible.length;
  updateViewer();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  })[character]);
}

async function initialize() {
  const response = await fetch("inventory.json");
  if (!response.ok) throw new Error("Inventory could not be loaded.");
  state.inventory = await response.json();

  [...new Set(state.inventory.map((comic) => comic.title))]
    .sort(compareText.compare)
    .forEach((title) => seriesSelect.add(new Option(title, title)));

  applyFilters();
}

[searchInput, seriesSelect, sortSelect].forEach((control) => control.addEventListener("input", applyFilters));
clearButton.addEventListener("click", () => {
  searchInput.value = "";
  seriesSelect.value = "";
  applyFilters();
  searchInput.focus();
});
document.querySelector("#close-viewer").addEventListener("click", () => viewer.close());
document.querySelector("#previous").addEventListener("click", () => moveViewer(-1));
document.querySelector("#next").addEventListener("click", () => moveViewer(1));
viewer.addEventListener("click", (event) => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") moveViewer(-1);
  if (event.key === "ArrowRight") moveViewer(1);
});

initialize().catch((error) => {
  countLabel.textContent = error.message;
  emptyState.hidden = false;
});
