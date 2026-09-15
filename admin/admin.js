const uploadForm = document.querySelector("#uploadForm");
const uploadMessage = document.querySelector("#uploadMessage");
const heroBackgroundList = document.querySelector("#heroBackgroundList");
const heroList = document.querySelector("#heroList");
const portfolioList = document.querySelector("#portfolioList");
const logoutButton = document.querySelector("#logoutButton");

let images = [];

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 401) {
    window.location.href = "/admin/login.html";
    return null;
  }

  return response;
}

function field(labelText, input) {
  const label = document.createElement("label");
  label.textContent = labelText;
  label.append(input);
  return label;
}

function createSectionSelect(value) {
  const select = document.createElement("select");
  select.name = "section";

  [
    ["hero_background", "Fundo principal da hero"],
    ["hero", "Carrossel da hero"],
    ["portfolio", "Portfólio"],
  ].forEach(([optionValue, text]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = text;
    option.selected = optionValue === value;
    select.append(option);
  });

  return select;
}

function imageCard(image) {
  const article = document.createElement("article");
  article.className = "image-card";

  const preview = document.createElement("img");
  preview.src = image.url;
  preview.alt = image.alt || "";
  article.append(preview);

  const form = document.createElement("form");

  const section = createSectionSelect(image.section);
  const alt = document.createElement("input");
  alt.name = "alt";
  alt.type = "text";
  alt.value = image.alt || "";
  alt.placeholder = "Texto alternativo";

  const order = document.createElement("input");
  order.name = "sort_order";
  order.type = "number";
  order.min = "1";
  order.value = image.sort_order || 1;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Salvar";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "Excluir";

  actions.append(save, remove);
  form.append(
    field("Onde aparece", section),
    field("Texto alternativo", alt),
    field("Ordem", order),
    actions
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.textContent = "Salvando...";

    const response = await request(`/api/admin/images/${image.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    save.textContent = "Salvar";

    if (!response || !response.ok) {
      alert("Não foi possível salvar esta imagem.");
      return;
    }

    await loadImages();
  });

  remove.addEventListener("click", async () => {
    const ok = window.confirm("Excluir esta imagem do site?");
    if (!ok) return;

    remove.textContent = "Excluindo...";

    const response = await request(`/api/admin/images/${image.id}`, {
      method: "DELETE",
    });

    if (!response || !response.ok) {
      remove.textContent = "Excluir";
      alert("Não foi possível excluir esta imagem.");
      return;
    }

    await loadImages();
  });

  article.append(form);
  return article;
}

function emptyState(text) {
  const element = document.createElement("p");
  element.className = "empty-state";
  element.textContent = text;
  return element;
}

function render() {
  heroBackgroundList.replaceChildren();
  heroList.replaceChildren();
  portfolioList.replaceChildren();

  const heroBackgroundImages = images.filter(
    (image) => image.section === "hero_background"
  );
  const heroImages = images.filter((image) => image.section === "hero");
  const portfolioImages = images.filter((image) => image.section === "portfolio");

  if (heroBackgroundImages.length === 0) {
    heroBackgroundList.append(emptyState("Nenhuma imagem cadastrada no fundo principal."));
  } else {
    heroBackgroundList.append(...heroBackgroundImages.map(imageCard));
  }

  if (heroImages.length === 0) {
    heroList.append(emptyState("Nenhuma imagem cadastrada no carrossel."));
  } else {
    heroList.append(...heroImages.map(imageCard));
  }

  if (portfolioImages.length === 0) {
    portfolioList.append(emptyState("Nenhuma imagem cadastrada no portfólio."));
  } else {
    portfolioList.append(...portfolioImages.map(imageCard));
  }
}

async function loadImages() {
  const response = await request("/api/admin/images");
  if (!response) return;

  images = await response.json();
  render();
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadMessage.textContent = "Enviando imagem...";

  const response = await request("/api/admin/images", {
    method: "POST",
    body: new FormData(uploadForm),
  });

  if (!response || !response.ok) {
    const result = response ? await response.json().catch(() => ({})) : {};
    uploadMessage.textContent = result.error || "Não foi possível enviar.";
    return;
  }

  uploadForm.reset();
  uploadMessage.textContent = "Imagem enviada com sucesso.";
  await loadImages();
});

logoutButton.addEventListener("click", async () => {
  await request("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login.html";
});

loadImages();
