const heroBackgroundUploadForm = document.querySelector("#heroBackgroundUploadForm");
const heroBackgroundUploadMessage = document.querySelector("#heroBackgroundUploadMessage");
const heroUploadForm = document.querySelector("#heroUploadForm");
const heroUploadMessage = document.querySelector("#heroUploadMessage");
const heroBackgroundList = document.querySelector("#heroBackgroundList");
const heroList = document.querySelector("#heroList");
const newProjectForm = document.querySelector("#newProjectForm");
const newProjectMessage = document.querySelector("#newProjectMessage");
const projectsList = document.querySelector("#projectsList");
const logoutButton = document.querySelector("#logoutButton");

let images = [];
let projects = [];

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

function emptyState(text) {
  const element = document.createElement("p");
  element.className = "empty-state";
  element.textContent = text;
  return element;
}

function heroSectionSelect(value) {
  const select = document.createElement("select");
  select.name = "section";

  [
    ["hero_background", "Fundo principal da hero"],
    ["hero", "Carrossel da hero"],
  ].forEach(([optionValue, text]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = text;
    option.selected = optionValue === value;
    select.append(option);
  });

  return select;
}

function heroImageCard(image) {
  const article = document.createElement("article");
  article.className = "image-card";

  const preview = document.createElement("img");
  preview.src = image.url;
  preview.alt = image.alt || "";
  article.append(preview);

  const form = document.createElement("form");

  const section = heroSectionSelect(image.section);
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

    await loadAll();
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

    await loadAll();
  });

  article.append(form);
  return article;
}

function projectSelect(selectedId) {
  const select = document.createElement("select");
  select.name = "project_id";

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.title;
    option.selected = project.id === selectedId;
    select.append(option);
  });

  return select;
}

function portfolioPhotoCard(image) {
  const article = document.createElement("article");
  article.className = "image-card";

  const preview = document.createElement("img");
  preview.src = image.url;
  preview.alt = image.alt || "";
  article.append(preview);

  const form = document.createElement("form");

  const project = projectSelect(image.project_id);
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
    field("Projeto", project),
    field("Texto alternativo", alt),
    field("Ordem na galeria", order),
    actions
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.textContent = "Salvando...";

    const data = Object.fromEntries(new FormData(form));
    const response = await request(`/api/admin/images/${image.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, section: "portfolio" }),
    });

    save.textContent = "Salvar";

    if (!response || !response.ok) {
      alert("Não foi possível salvar esta foto.");
      return;
    }

    await loadAll();
  });

  remove.addEventListener("click", async () => {
    const ok = window.confirm("Excluir esta foto do projeto?");
    if (!ok) return;

    remove.textContent = "Excluindo...";

    const response = await request(`/api/admin/images/${image.id}`, {
      method: "DELETE",
    });

    if (!response || !response.ok) {
      remove.textContent = "Excluir";
      alert("Não foi possível excluir esta foto.");
      return;
    }

    await loadAll();
  });

  article.append(form);
  return article;
}

function projectCard(project, photos) {
  const article = document.createElement("article");
  article.className = "project-card";

  const header = document.createElement("div");
  header.className = "project-header";

  const titleForm = document.createElement("form");
  titleForm.className = "project-title-form";

  const titleInput = document.createElement("input");
  titleInput.name = "title";
  titleInput.type = "text";
  titleInput.value = project.title;

  const renameButton = document.createElement("button");
  renameButton.type = "submit";
  renameButton.textContent = "Renomear";

  titleForm.append(titleInput, renameButton);

  const deleteProjectButton = document.createElement("button");
  deleteProjectButton.type = "button";
  deleteProjectButton.className = "delete-button";
  deleteProjectButton.textContent = "Excluir projeto";

  header.append(titleForm, deleteProjectButton);

  titleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    renameButton.textContent = "Salvando...";

    const response = await request(`/api/admin/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.value }),
    });

    renameButton.textContent = "Renomear";

    if (!response || !response.ok) {
      alert("Não foi possível renomear o projeto.");
      return;
    }

    await loadAll();
  });

  deleteProjectButton.addEventListener("click", async () => {
    const ok = window.confirm(
      `Excluir o projeto "${project.title}" e todas as suas fotos? Essa ação não pode ser desfeita.`
    );
    if (!ok) return;

    deleteProjectButton.textContent = "Excluindo...";

    const response = await request(`/api/admin/projects/${project.id}`, {
      method: "DELETE",
    });

    if (!response || !response.ok) {
      deleteProjectButton.textContent = "Excluir projeto";
      alert("Não foi possível excluir este projeto.");
      return;
    }

    await loadAll();
  });

  const photosGrid = document.createElement("div");
  photosGrid.className = "image-grid";

  if (photos.length === 0) {
    photosGrid.append(emptyState("Nenhuma foto neste projeto ainda."));
  } else {
    photosGrid.append(...photos.map(portfolioPhotoCard));
  }

  const addPhotoForm = document.createElement("form");
  addPhotoForm.className = "add-photo-form";

  const fileInput = document.createElement("input");
  fileInput.name = "image";
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  fileInput.required = true;

  const altInput = document.createElement("input");
  altInput.name = "alt";
  altInput.type = "text";
  altInput.placeholder = "Texto alternativo";

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Adicionar foto";

  const addMessage = document.createElement("p");
  addMessage.className = "form-message";

  addPhotoForm.append(
    field("Nova foto", fileInput),
    field("Texto alternativo", altInput),
    addButton,
    addMessage
  );

  addPhotoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    addMessage.textContent = "Enviando...";

    const formData = new FormData(addPhotoForm);
    formData.set("section", "portfolio");
    formData.set("project_id", project.id);

    const response = await request("/api/admin/images", {
      method: "POST",
      body: formData,
    });

    if (!response || !response.ok) {
      const result = response ? await response.json().catch(() => ({})) : {};
      addMessage.textContent = result.error || "Não foi possível enviar.";
      return;
    }

    await loadAll();
  });

  article.append(header, photosGrid, addPhotoForm);
  return article;
}

function render() {
  heroBackgroundList.replaceChildren();
  heroList.replaceChildren();
  projectsList.replaceChildren();

  const heroBackgroundImages = images.filter(
    (image) => image.section === "hero_background"
  );
  const heroImages = images.filter((image) => image.section === "hero");

  if (heroBackgroundImages.length === 0) {
    heroBackgroundList.append(emptyState("Nenhuma imagem cadastrada no fundo principal."));
  } else {
    heroBackgroundList.append(...heroBackgroundImages.map(heroImageCard));
  }

  if (heroImages.length === 0) {
    heroList.append(emptyState("Nenhuma imagem cadastrada no carrossel."));
  } else {
    heroList.append(...heroImages.map(heroImageCard));
  }

  if (projects.length === 0) {
    projectsList.append(emptyState("Nenhum projeto cadastrado ainda. Crie o primeiro acima."));
  } else {
    projectsList.append(
      ...projects.map((project) => {
        const photos = images.filter(
          (image) => image.section === "portfolio" && image.project_id === project.id
        );
        return projectCard(project, photos);
      })
    );
  }
}

async function loadAll() {
  const [imagesResponse, projectsResponse] = await Promise.all([
    request("/api/admin/images"),
    request("/api/admin/projects"),
  ]);

  if (!imagesResponse || !projectsResponse) return;

  images = await imagesResponse.json();
  projects = await projectsResponse.json();
  render();
}

function bindStaticUploadForm(form, message, section) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "Enviando imagem...";

    const formData = new FormData(form);
    formData.set("section", section);

    const response = await request("/api/admin/images", {
      method: "POST",
      body: formData,
    });

    if (!response || !response.ok) {
      const result = response ? await response.json().catch(() => ({})) : {};
      message.textContent = result.error || "Não foi possível enviar.";
      return;
    }

    form.reset();
    message.textContent = "Imagem enviada com sucesso.";
    await loadAll();
  });
}

bindStaticUploadForm(heroBackgroundUploadForm, heroBackgroundUploadMessage, "hero_background");
bindStaticUploadForm(heroUploadForm, heroUploadMessage, "hero");

newProjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  newProjectMessage.textContent = "Criando projeto...";

  const data = Object.fromEntries(new FormData(newProjectForm));
  const response = await request("/api/admin/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response || !response.ok) {
    const result = response ? await response.json().catch(() => ({})) : {};
    newProjectMessage.textContent = result.error || "Não foi possível criar o projeto.";
    return;
  }

  newProjectForm.reset();
  newProjectMessage.textContent = "Projeto criado. Adicione as fotos abaixo.";
  await loadAll();
});

logoutButton.addEventListener("click", async () => {
  await request("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin/login.html";
});

loadAll();
