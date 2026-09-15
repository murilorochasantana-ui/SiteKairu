const form = document.querySelector("#loginForm");
const message = document.querySelector("#loginMessage");

async function checkSession() {
  const response = await fetch("/api/admin/me");
  if (response.ok) {
    window.location.href = "/admin";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Entrando...";

  const data = Object.fromEntries(new FormData(form));
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    message.textContent = result.error || "Não foi possível entrar.";
    return;
  }

  window.location.href = "/admin";
});

checkSession();
