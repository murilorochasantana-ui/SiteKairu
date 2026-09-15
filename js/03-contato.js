(function () {
  const form = document.getElementById("contatoForm");
  const status = document.getElementById("contatoStatus");
  if (!form || !status) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const dados = Object.fromEntries(new FormData(form).entries());

    status.textContent = "Enviando...";
    status.className = "contato-status";
    submitButton.disabled = true;

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const resultado = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(resultado.error || "Não foi possível enviar sua mensagem.");
      }

      status.textContent = "Mensagem enviada com sucesso! Em breve entraremos em contato.";
      status.className = "contato-status contato-status-ok";
      form.reset();
    } catch (error) {
      status.textContent = error.message || "Erro ao enviar. Tente novamente.";
      status.className = "contato-status contato-status-erro";
    } finally {
      submitButton.disabled = false;
    }
  });
})();
