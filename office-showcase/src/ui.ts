import "./style.css";

export type Preset = "software" | "bank" | "restaurant" | "semiconductor" | "creative";

type GalleryCallbacks = {
  onSelect: (preset: Preset) => void;
  onReset: () => void;
  onToggleOrbit: (enabled: boolean) => void;
};

type GalleryUI = {
  setActive: (preset: Preset) => void;
  setLoading: (loading: boolean) => void;
};

type Office = {
  id: Preset;
  number: string;
  name: string;
  place: string;
  description: string;
  color: string;
};

const offices: Office[] = [
  {
    id: "software",
    number: "01",
    name: "Aperture Studio",
    place: "Software studio",
    description: "A sunlit workshop for ideas, code, and the people who bring them together.",
    color: "#b67543",
  },
  {
    id: "bank",
    number: "02",
    name: "Northstar Bank",
    place: "Neighborhood bank",
    description: "Calm, considered spaces made for trust, conversation, and everyday service.",
    color: "#35575b",
  },
  {
    id: "restaurant",
    number: "03",
    name: "Sora Table",
    place: "Restaurant",
    description: "A warm dining room and open kitchen, ready for the neighborhood rush.",
    color: "#c4774a",
  },
  {
    id: "semiconductor",
    number: "04",
    name: "Mesa Micro",
    place: "Semiconductor lab",
    description: "Bright benches and quiet precision, where the smallest details matter.",
    color: "#5a8ea5",
  },
  {
    id: "creative",
    number: "05",
    name: "Lumen Works",
    place: "Creative studio",
    description: "An expressive shared space to sketch, test, meet, and make things real.",
    color: "#8170a0",
  },
];

function icon(name: "orbit" | "reset" | "arrow") {
  if (name === "orbit") return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.7 12.2c0 4.6-3 8.3-6.7 8.3s-6.7-3.7-6.7-8.3 3-8.3 6.7-8.3 6.7 3.7 6.7 8.3Z" stroke="currentColor" stroke-width="1.55"/><path d="M2.6 12.1c2.1 1.4 5.5 2.3 9.4 2.3s7.3-.9 9.4-2.3M15.4 3.6c-1.1 2.1-1.8 5.1-1.8 8.6s.7 6.5 1.8 8.6" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`;
  if (name === "reset") return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.4 9.5A8 8 0 1 1 4 12" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path d="M4.3 4.8v5.1h5.1" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5.5 12 12.7 0m-5.1-5.1 5.1 5.1-5.1 5.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function mountUI(callbacks: GalleryCallbacks): GalleryUI {
  const host = document.querySelector<HTMLElement>("#app");
  if (!host) throw new Error("Gallery root #app is missing");
  const root = host;

  host.innerHTML = `
    <header class="masthead">
      <a class="brand" href="/" aria-label="Workplace Atlas home">
        <span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
        <span class="brand-name">workplace<span>atlas</span><small>OFFICES IN MINIATURE</small></span>
      </a>
      <div class="masthead-meta"><span class="collection-label">The workplace collection</span><span class="edition">FIVE WORLDS · ONE GALLERY</span></div>
      <div class="scene-controls" aria-label="Scene controls">
        <button class="tool-button" type="button" id="orbit-button" aria-pressed="false" title="Toggle automatic rotation">${icon("orbit")}<span>Auto orbit</span></button>
        <button class="tool-button" type="button" id="reset-button" title="Return to the original view">${icon("reset")}<span>Reset view</span></button>
      </div>
    </header>
    <main class="gallery-main">
      <section class="scene-caption" aria-live="polite">
        <div class="caption-kicker"><span class="caption-line"></span><span id="office-place">Software studio</span></div>
        <h1 id="office-name">Aperture Studio</h1>
        <p id="office-description">A sunlit workshop for ideas, code, and the people who bring them together.</p>
        <div class="view-hint"><span class="hint-icon" aria-hidden="true">↔</span> Drag to explore <span aria-hidden="true">·</span> Scroll to zoom</div>
      </section>
      <div class="scene-index" aria-hidden="true"><span id="current-index">01</span><span class="index-rule"></span><span>05</span></div>
      <div class="scene-loading" id="scene-loading" role="status" aria-live="polite" hidden><span class="loading-ring" aria-hidden="true"></span><span>Preparing the office…</span></div>
    </main>
    <nav class="gallery-dock" aria-label="Choose an office">
      <div class="dock-heading"><span>EXPLORE THE COLLECTION</span><span class="dock-hint">Select a workplace ${icon("arrow")}</span></div>
      <div class="office-tabs" role="group" aria-label="Company offices">${offices.map((office) => `
        <button type="button" class="office-tab" data-office="${office.id}" aria-pressed="false" style="--tab-color:${office.color}">
          <span class="tab-index">${office.number}</span>
          <span class="tab-swatch" aria-hidden="true"><span></span><span></span><span></span></span>
          <span class="tab-copy"><strong>${office.name}</strong><small>${office.place}</small></span>
          <span class="tab-arrow" aria-hidden="true">↗</span>
        </button>`).join("")}</div>
    </nav>
  `;

  const name = host.querySelector<HTMLElement>("#office-name")!;
  const place = host.querySelector<HTMLElement>("#office-place")!;
  const description = host.querySelector<HTMLElement>("#office-description")!;
  const currentIndex = host.querySelector<HTMLElement>("#current-index")!;
  const loading = host.querySelector<HTMLElement>("#scene-loading")!;
  const orbitButton = host.querySelector<HTMLButtonElement>("#orbit-button")!;
  const resetButton = host.querySelector<HTMLButtonElement>("#reset-button")!;
  const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>(".office-tab"));
  let active: Preset = "software";
  let autoOrbit = false;

  function setActive(preset: Preset) {
    const office = offices.find((entry) => entry.id === preset);
    if (!office) return;
    active = preset;
    root.dataset.office = preset;
    root.style.setProperty("--office-accent", office.color);
    name.textContent = office.name;
    place.textContent = office.place;
    description.textContent = office.description;
    currentIndex.textContent = office.number;
    for (const tab of tabs) tab.setAttribute("aria-pressed", String(tab.dataset.office === preset));
    root.querySelector<HTMLButtonElement>(`[data-office="${preset}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const preset = tab.dataset.office as Preset;
      if (preset === active) return;
      setActive(preset);
      callbacks.onSelect(preset);
    });
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = offices.findIndex((office) => office.id === tab.dataset.office);
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + offices.length) % offices.length;
      tabs[next]?.focus();
      tabs[next]?.click();
    });
  }
  resetButton.addEventListener("click", callbacks.onReset);
  orbitButton.addEventListener("click", () => {
    autoOrbit = !autoOrbit;
    orbitButton.setAttribute("aria-pressed", String(autoOrbit));
    callbacks.onToggleOrbit(autoOrbit);
  });

  setActive("software");
  return {
    setActive,
    setLoading(value) {
      loading.hidden = !value;
      root.classList.toggle("is-loading", value);
    },
  };
}
