(function () {
  "use strict";

  var gate = document.querySelector("#gate");
  var loginCard = document.querySelector("#login-card");
  var gateStatus = document.querySelector("#gate-status");
  var setup = document.querySelector("#setup");
  var loginForm = document.querySelector("#login-form");
  var loginMessage = document.querySelector("#login-message");
  var app = document.querySelector("#app");
  var settingsForm = document.querySelector("#settings-form");
  var createForm = document.querySelector("#create-form");
  var list = document.querySelector("#product-list");
  var listMessage = document.querySelector("#list-message");
  var adminCount = document.querySelector("#admin-count");
  var coverCurrent = document.querySelector("#cover-current");
  var removeCoverButton = document.querySelector("#remove-cover");

  var client = null;
  var products = [];
  var settings = null;
  var busy = false;
  var coverRemoval = false;
  var settingsPhoto = null;
  var createPhoto = null;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function setMessage(node, text, kind) {
    node.hidden = !text;
    node.textContent = text || "";
    node.className = "form-message" + (kind ? " " + kind : "");
  }

  function prefersReduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function createId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
      var random = Math.random() * 16 | 0;
      var value = char === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function blobFromCanvas(canvas, type, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(resolve, type, quality);
    });
  }

  async function optimizeImage(file, maxEdge) {
    if (file.type && file.type.indexOf("image/") !== 0) {
      throw new Error("O arquivo escolhido não é uma imagem.");
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("A fotografia passa de 20 MB. Escolha uma mais leve.");
    }
    var bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (error) {
      throw new Error("Não consegui ler essa fotografia. Tente um JPG ou PNG.");
    }
    var edge = maxEdge || 1600;
    var scale = Math.min(1, edge / bitmap.width, edge / bitmap.height);
    var width = Math.max(1, Math.round(bitmap.width * scale));
    var height = Math.max(1, Math.round(bitmap.height * scale));
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#FBF8F4";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    if (bitmap.close) bitmap.close();

    var preparedBlob = await blobFromCanvas(canvas, "image/webp", 0.82);
    var extension = "webp";
    var contentType = "image/webp";
    if (!preparedBlob || !preparedBlob.size) {
      preparedBlob = await blobFromCanvas(canvas, "image/jpeg", 0.86);
      extension = "jpg";
      contentType = "image/jpeg";
    } else if (preparedBlob.size > 2.6 * 1024 * 1024) {
      var smaller = document.createElement("canvas");
      smaller.width = Math.max(1, Math.round(width * 0.75));
      smaller.height = Math.max(1, Math.round(height * 0.75));
      var smallerContext = smaller.getContext("2d", { alpha: false });
      smallerContext.fillStyle = "#FBF8F4";
      smallerContext.fillRect(0, 0, smaller.width, smaller.height);
      smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      preparedBlob = await blobFromCanvas(smaller, "image/jpeg", 0.74);
      extension = "jpg";
      contentType = "image/jpeg";
    }
    if (!preparedBlob || !preparedBlob.size) throw new Error("Não consegui preparar a fotografia.");
    var chosen = { blob: preparedBlob, extension: extension, contentType: contentType };
    chosen.previewUrl = URL.createObjectURL(chosen.blob);
    return chosen;
  }

  function bindPhotoField(form, maxEdge) {
    var input = form.querySelector('input[type="file"]');
    var preview = form.querySelector("[data-preview]");
    var previewImage = preview.querySelector("img");
    var meta = form.querySelector("[data-photo-meta]");
    var submit = form.querySelector("[type='submit']");
    var prepared = null;
    var preparing = false;

    function clearPrepared() {
      if (prepared && prepared.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
      prepared = null;
      preview.hidden = true;
      previewImage.removeAttribute("src");
    }

    input.addEventListener("change", async function () {
      var file = input.files && input.files[0];
      clearPrepared();
      if (!file) {
        meta.textContent = "";
        return;
      }
      preparing = true;
      if (submit) submit.disabled = true;
      meta.textContent = "Preparando a fotografia…";
      try {
        prepared = await optimizeImage(file, maxEdge);
        previewImage.src = prepared.previewUrl;
        preview.hidden = false;
        meta.textContent = "Pronta para salvar · " + formatBytes(prepared.blob.size);
      } catch (error) {
        input.value = "";
        meta.textContent = error.message;
      } finally {
        preparing = false;
        if (submit && form.dataset.saving !== "true") submit.disabled = false;
      }
    });

    return {
      peek: function () { return prepared; },
      ready: function () { return !preparing; },
      reset: function () {
        clearPrepared();
        input.value = "";
        meta.textContent = "";
      }
    };
  }

  function imageUrl(path, version) {
    if (!path) return "";
    var result = client.storage.from(window.RIO_ROSA.imagesBucket).getPublicUrl(path);
    var url = result && result.data ? result.data.publicUrl : "";
    if (!url) return "";
    if (!version) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + encodeURIComponent(version);
  }

  function cleanName(value) {
    var raw = clean(value).replace(/\s+/g, " ");
    if (!raw) throw new Error("Escreva o nome do sabonete.");
    if (raw.length > 80) throw new Error("O nome pode ter até 80 caracteres.");
    return raw;
  }

  function cleanTitle(value) {
    var raw = clean(value).replace(/\s+/g, " ");
    if (!raw) throw new Error("Escreva o título da capa.");
    if (raw.length > 90) throw new Error("O título pode ter até 90 caracteres.");
    return raw;
  }

  function localMessage(error) {
    if (error && !error.code && error.message && !/Failed to fetch|NetworkError|Load failed|row-level|JWT|schema cache/i.test(error.message)) {
      return error.message;
    }
    return window.rioRosaMessage(error);
  }

  function cleanDescription(value) {
    var raw = clean(value);
    if (raw.length > 280) throw new Error("A descrição pode ter até 280 caracteres.");
    return raw;
  }

  function cleanPrice(value) {
    var raw = clean(value);
    if (!raw) return null;
    var normalized = raw.replace(/\s/g, "").replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new Error("Escreva o preço só com números, sem ponto de milhar. Exemplo: 48 ou 48,50.");
    }
    return Number(normalized);
  }

  function priceForInput(value) {
    if (value === null || value === undefined || value === "") return "";
    var number = Number(value);
    if (!Number.isFinite(number)) return "";
    return number.toFixed(2).replace(".", ",");
  }

  function cleanInstagram(value) {
    var raw = clean(value);
    if (!raw) return "";
    raw = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
    if (!/^[A-Za-z0-9._]{1,30}$/.test(raw)) {
      throw new Error("Escreva só o usuário do Instagram. Exemplo: riorosa.");
    }
    return raw;
  }

  function cleanWhatsapp(value) {
    var raw = clean(value);
    if (!raw) return "";
    var digits = raw.replace(/\D/g, "");
    if (!digits || digits.length < 8 || digits.length > 15) {
      throw new Error("Escreva o WhatsApp com o código do país, só números. Exemplo: 5511912345678.");
    }
    return digits;
  }

  function cleanCurrency(value) {
    var raw = clean(value);
    if (!raw || raw.length > 4) throw new Error("Escreva um símbolo curto, por exemplo R$.");
    return raw;
  }

  function formatPrice(value, currency) {
    if (value === null || value === undefined || value === "") return "Sem preço";
    var number = Number(value);
    if (!Number.isFinite(number)) return "Sem preço";
    return clean(currency || "R$") + " " + new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }

  async function uploadImage(path, image) {
    var file = new File([image.blob], "photo." + image.extension, { type: image.contentType });
    var result = await client.storage.from(window.RIO_ROSA.imagesBucket).upload(path, file, {
      contentType: image.contentType,
      cacheControl: "3600",
      upsert: false
    });
    if (result.error) throw result.error;
  }

  async function removeImage(path) {
    if (!path) return;
    var result = await client.storage.from(window.RIO_ROSA.imagesBucket).remove([path]);
    if (result.error) throw result.error;
  }

  function showGate(mode, message) {
    gate.hidden = false;
    app.hidden = true;
    setup.hidden = mode !== "setup";
    loginForm.hidden = mode !== "login";
    loginCard.classList.toggle("is-setup", mode === "setup");
    gateStatus.hidden = mode === "login" || !message;
    gateStatus.textContent = message || "";
    if (mode === "login") setMessage(loginMessage, message || "", message ? "error" : "");
  }

  function showApp(email) {
    gate.hidden = true;
    app.hidden = false;
    document.querySelector("#admin-email").textContent = email || "";
  }

  async function requireAdmin(session) {
    var user = session && session.user;
    if (!user) return null;
    var result = await client.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      await client.auth.signOut();
      throw new Error("Esta conta não administra o catálogo. Inclua o e-mail na tabela admins, como explica o README.");
    }
    return user;
  }

  async function reloadProducts() {
    var result = await client
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (result.error) throw result.error;
    products = result.data || [];
    closeEditor();
    renderList();
  }

  async function reloadSettings() {
    var result = await client.from("settings").select("*").eq("id", 1).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      throw new Error("Falta a configuração inicial. Execute supabase/schema.sql no Supabase.");
    }
    settings = result.data;
    fillSettings(settings);
  }

  function fillSettings(data) {
    settingsForm.elements.hero_title.value = data.hero_title || "";
    settingsForm.elements.hero_text.value = data.hero_text || "";
    settingsForm.elements.footer_note.value = data.footer_note || "";
    settingsForm.elements.instagram.value = data.instagram || "";
    settingsForm.elements.whatsapp.value = data.whatsapp || "";
    settingsForm.elements.currency.value = data.currency || "$";
    settingsForm.elements.show_prices.checked = Boolean(data.show_prices);
    coverRemoval = false;
    settingsPhoto.reset();
    showCurrentCover(data.cover_path, data.updated_at);
  }

  function showCurrentCover(path, version) {
    if (!path || coverRemoval) {
      coverCurrent.hidden = true;
      coverCurrent.removeAttribute("src");
      removeCoverButton.hidden = true;
      return;
    }
    coverCurrent.src = imageUrl(path, version);
    coverCurrent.hidden = false;
    removeCoverButton.hidden = false;
  }

  function fallback(name) {
    return el("div", "photo-fallback", clean(name).charAt(0).toLocaleUpperCase("pt-BR") || "R");
  }

  function thumb(product) {
    var frame = el("div", "thumb");
    var url = imageUrl(product.image_path, product.updated_at);
    if (!url) {
      frame.append(fallback(product.name));
      return frame;
    }
    var image = document.createElement("img");
    image.src = url;
    image.alt = "";
    image.addEventListener("error", function () { image.replaceWith(fallback(product.name)); });
    frame.append(image);
    return frame;
  }

  function actionButton(action, label, disabled) {
    var button = el("button", action === "delete" ? "button ghost danger" : "button secondary", label);
    button.type = "button";
    button.dataset.action = action;
    button.setAttribute("aria-label", label);
    if (disabled) button.disabled = true;
    return button;
  }

  function renderList(highlightId) {
    list.replaceChildren();
    adminCount.textContent = products.length === 1 ? "1 sabonete" : products.length + " sabonetes";
    if (!products.length) {
      list.append(el("p", "empty", "Ainda não há sabonetes. Use o formulário Novo sabonete."));
      return;
    }
    var currency = settings && settings.currency;
    products.forEach(function (product, index) {
      var row = el("article", "product-row");
      row.dataset.id = product.id;
      row.append(thumb(product));
      var body = el("div", "product-body");
      body.append(el("h3", "product-name", product.name));
      var meta = el("div", "product-meta");
      meta.append(el("span", null, formatPrice(product.price, currency)));
      meta.append(el("span", product.published ? "badge" : "badge is-off", product.published ? "Publicado" : "Oculto"));
      body.append(meta);
      var actions = el("div", "row-actions");
      var edit = actionButton("edit", "Editar " + product.name, false);
      edit.textContent = "Editar";
      var toggle = actionButton("toggle", (product.published ? "Ocultar " : "Publicar ") + product.name, false);
      toggle.textContent = product.published ? "Ocultar" : "Publicar";
      var up = actionButton("up", "Subir " + product.name, index === 0);
      up.textContent = "Subir";
      var down = actionButton("down", "Descer " + product.name, index === products.length - 1);
      down.textContent = "Descer";
      var remove = actionButton("delete", "Excluir " + product.name, false);
      remove.textContent = "Excluir";
      actions.append(edit, toggle, up, down, remove);
      body.append(actions);
      row.append(body);
      row.append(el("div", "editor"));
      list.append(row);
    });
    if (!highlightId) return;
    var fresh = list.querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(highlightId) : highlightId) + '"]');
    if (!fresh) return;
    fresh.classList.add("is-fresh");
    fresh.scrollIntoView({ block: "center", behavior: prefersReduced() ? "auto" : "smooth" });
  }

  function closeEditor() {
    var open = list.querySelector(".editor-form");
    if (open && open._photo) open._photo.reset();
    list.querySelectorAll(".editor").forEach(function (node) { node.replaceChildren(); });
    list.querySelectorAll(".product-row").forEach(function (row) { row.classList.remove("is-editing"); });
  }

  function field(labelText, control) {
    var wrap = el("div", "field");
    var label = el("label", null, labelText);
    var id = "edit-" + control.name + "-" + Math.random().toString(16).slice(2);
    control.id = id;
    label.htmlFor = id;
    wrap.append(label, control);
    return wrap;
  }

  function openEditor(product) {
    closeEditor();
    var row = list.querySelector('[data-id="' + (window.CSS && CSS.escape ? CSS.escape(product.id) : product.id) + '"]');
    if (!row) return;
    row.classList.add("is-editing");
    var form = el("form", "editor-form");
    var name = document.createElement("input");
    name.name = "name";
    name.maxLength = 80;
    name.required = true;
    name.value = product.name;
    var description = document.createElement("textarea");
    description.name = "description";
    description.maxLength = 280;
    description.rows = 4;
    description.value = product.description || "";
    var price = document.createElement("input");
    price.name = "price";
    price.inputMode = "decimal";
    price.value = priceForInput(product.price);
    price.placeholder = "48,00";
    var file = document.createElement("input");
    file.type = "file";
    file.name = "photo";
    file.accept = "image/*";
    var select = document.createElement("select");
    select.name = "published";
    [["true", "Publicado"], ["false", "Oculto"]].forEach(function (optionData) {
      var option = document.createElement("option");
      option.value = optionData[0];
      option.textContent = optionData[1];
      option.selected = String(product.published) === optionData[0];
      select.append(option);
    });
    form.append(
      field("Nome do sabonete", name),
      field("Descrição", description),
      field("Preço", price)
    );
    var photoField = el("div", "field");
    photoField.append(el("span", null, "Trocar a fotografia"));
    photoField.append(el("p", "hint", "Opcional. Escolha outra só se quiser substituir a atual. Ela também é reduzida antes de salvar."));
    if (product.image_path) {
      var current = document.createElement("img");
      current.className = "cover-current";
      current.alt = "Fotografia atual";
      current.src = imageUrl(product.image_path, product.updated_at);
      photoField.append(current);
    }
    var fileLabel = el("label", "file-button", "Escolher outra fotografia");
    fileLabel.append(file);
    var preview = el("div", "preview");
    preview.dataset.preview = "";
    preview.hidden = true;
    var previewImage = document.createElement("img");
    previewImage.alt = "Prévia da nova fotografia";
    preview.append(previewImage);
    var photoMeta = el("p", "hint");
    photoMeta.dataset.photoMeta = "";
    photoField.append(fileLabel, preview, photoMeta);
    form.append(photoField, field("Estado", select));
    var message = el("p", "form-message");
    message.hidden = true;
    var actions = el("div", "row-actions");
    var save = el("button", "button", "Salvar alterações");
    save.type = "submit";
    var cancel = el("button", "button secondary", "Cancelar");
    cancel.type = "button";
    cancel.dataset.cancel = "true";
    actions.append(save, cancel);
    form.append(message, actions);
    row.querySelector(".editor").append(form);
    form._photo = bindPhotoField(form, 1600);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      saveProduct(product, form, message);
    });
    cancel.addEventListener("click", function () { closeEditor(); });
    name.focus();
  }

  async function saveProduct(product, form, message) {
    var photo = form._photo;
    if (!photo.ready()) {
      setMessage(message, "Espere a fotografia ficar pronta.", "error");
      return;
    }
    var submit = form.querySelector("[type='submit']");
    form.dataset.saving = "true";
    submit.disabled = true;
    var previousPath = product.image_path;
    var newPath = "";
    var saved = false;
    try {
      var payload = {
        name: cleanName(form.elements.name.value),
        description: cleanDescription(form.elements.description.value),
        price: cleanPrice(form.elements.price.value),
        published: form.elements.published.value === "true"
      };
      var image = photo.peek();
      if (image) {
        newPath = "products/" + product.id + "-" + Date.now() + "." + image.extension;
        await uploadImage(newPath, image);
        payload.image_path = newPath;
      }
      var result = await client.from("products").update(payload).eq("id", product.id).select("id").single();
      if (result.error) throw result.error;
      saved = true;
      if (newPath && previousPath && previousPath !== newPath) {
        try { await removeImage(previousPath); } catch (ignore) { /* la foto nueva ya quedó publicada */ }
      }
      await reloadProducts();
      setMessage(listMessage, "Sabonete atualizado.", "ok");
    } catch (error) {
      if (newPath && !saved) {
        try { await removeImage(newPath); } catch (ignore) { /* no queda una fila apuntando a esta foto */ }
      }
      setMessage(message, localMessage(error), "error");
      submit.disabled = false;
    } finally {
      form.dataset.saving = "false";
    }
  }

  function planOrderPatches(previous, next) {
    var seen = {};
    var unique = true;
    previous.forEach(function (item) {
      if (seen[item.sort_order]) unique = false;
      seen[item.sort_order] = true;
    });
    var orders;
    if (unique && previous.length) {
      orders = previous.map(function (item) { return item.sort_order; }).sort(function (a, b) { return a - b; });
    } else {
      orders = next.map(function (item, index) { return (index + 1) * 10; });
    }
    return next.map(function (item, index) {
      return { id: item.id, sort_order: orders[index], current: item.sort_order };
    }).filter(function (patch) {
      return patch.current !== patch.sort_order;
    });
  }

  async function applyPatches(patches) {
    var results = await Promise.all(patches.map(function (patch) {
      return client.from("products").update({ sort_order: patch.sort_order }).eq("id", patch.id);
    }));
    var failed = results.find(function (result) { return result.error; });
    if (failed) throw failed.error;
  }

  async function moveProduct(product, direction) {
    var index = products.findIndex(function (item) { return item.id === product.id; });
    var target = index + direction;
    if (index < 0 || target < 0 || target >= products.length) return;
    var next = products.slice();
    var moved = next.splice(index, 1)[0];
    next.splice(target, 0, moved);
    var patches = planOrderPatches(products, next);
    setBusy(true);
    try {
      await applyPatches(patches);
      await reloadProducts();
      setMessage(listMessage, "Ordem atualizada.", "ok");
    } catch (error) {
      setMessage(listMessage, window.rioRosaMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleProduct(product) {
    setBusy(true);
    try {
      var result = await client.from("products").update({ published: !product.published }).eq("id", product.id).select("id").single();
      if (result.error) throw result.error;
      await reloadProducts();
      setMessage(listMessage, product.published ? "Sabonete oculto." : "Sabonete publicado.", "ok");
    } catch (error) {
      setMessage(listMessage, window.rioRosaMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(product) {
    var confirmed = window.confirm("Excluir “" + product.name + "”? A fotografia também sai do catálogo.");
    if (!confirmed) return;
    setBusy(true);
    try {
      var result = await client.from("products").delete().eq("id", product.id);
      if (result.error) throw result.error;
      if (product.image_path) {
        try { await removeImage(product.image_path); } catch (ignore) { /* el producto ya no está en el catálogo */ }
      }
      await reloadProducts();
      setMessage(listMessage, "Sabonete excluído.", "ok");
    } catch (error) {
      setMessage(listMessage, window.rioRosaMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function setBusy(value) {
    busy = value;
    document.body.classList.toggle("is-busy", value);
  }

  list.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-action]");
    if (!button || busy) return;
    var row = button.closest("[data-id]");
    if (!row) return;
    var product = products.find(function (item) { return item.id === row.dataset.id; });
    if (!product) return;
    if (button.dataset.action === "edit") openEditor(product);
    else if (button.dataset.action === "up") moveProduct(product, -1);
    else if (button.dataset.action === "down") moveProduct(product, 1);
    else if (button.dataset.action === "toggle") toggleProduct(product);
    else if (button.dataset.action === "delete") deleteProduct(product);
  });

  settingsForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!settingsPhoto.ready()) {
      setMessage(document.querySelector("#settings-message"), "Espere a capa ficar pronta.", "error");
      return;
    }
    var submit = settingsForm.querySelector("[type='submit']");
    settingsForm.dataset.saving = "true";
    submit.disabled = true;
    var newPath = "";
    var previousPath = settings.cover_path;
    var saved = false;
    try {
      var payload = {
        hero_title: cleanTitle(settingsForm.elements.hero_title.value),
        hero_text: clean(settingsForm.elements.hero_text.value),
        footer_note: clean(settingsForm.elements.footer_note.value),
        instagram: cleanInstagram(settingsForm.elements.instagram.value),
        whatsapp: cleanWhatsapp(settingsForm.elements.whatsapp.value),
        currency: cleanCurrency(settingsForm.elements.currency.value),
        show_prices: settingsForm.elements.show_prices.checked
      };
      if (payload.hero_text.length > 320) throw new Error("O texto de apresentação pode ter até 320 caracteres.");
      if (payload.footer_note.length > 240) throw new Error("A nota do rodapé pode ter até 240 caracteres.");
      var image = settingsPhoto.peek();
      if (image) {
        newPath = "brand/cover-" + Date.now() + "." + image.extension;
        await uploadImage(newPath, image);
        payload.cover_path = newPath;
      } else if (coverRemoval) {
        payload.cover_path = null;
      }
      var result = await client.from("settings").update(payload).eq("id", 1).select("*").single();
      if (result.error) throw result.error;
      saved = true;
      if (newPath && previousPath && previousPath !== newPath) {
        try { await removeImage(previousPath); } catch (ignore) { /* la portada nueva ya está guardada */ }
      }
      if (coverRemoval && previousPath && !newPath) {
        try { await removeImage(previousPath); } catch (ignore) { /* el catálogo ya volvió a la ilustración */ }
      }
      settings = result.data;
      fillSettings(settings);
      setMessage(document.querySelector("#settings-message"), "Apresentação salva. O catálogo já mostra estas palavras.", "ok");
    } catch (error) {
      if (newPath && !saved) {
        try { await removeImage(newPath); } catch (ignore) { /* se descarta la portada que no llegó a publicarse */ }
      }
      setMessage(document.querySelector("#settings-message"), localMessage(error), "error");
    } finally {
      settingsForm.dataset.saving = "false";
      submit.disabled = false;
    }
  });

  removeCoverButton.addEventListener("click", function () {
    coverRemoval = true;
    settingsPhoto.reset();
    showCurrentCover("", "");
    setMessage(document.querySelector("#settings-message"), "A ilustração da marca volta quando você salvar.", "ok");
  });

  createForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var message = document.querySelector("#create-message");
    if (!createPhoto.ready()) {
      setMessage(message, "Espere a fotografia ficar pronta.", "error");
      return;
    }
    var image = createPhoto.peek();
    if (!image) {
      setMessage(message, "Escolha uma fotografia do sabonete.", "error");
      return;
    }
    var submit = createForm.querySelector("[type='submit']");
    createForm.dataset.saving = "true";
    submit.disabled = true;
    var id = createId();
    var path = "";
    var saved = false;
    try {
      var name = cleanName(createForm.elements.name.value);
      var description = cleanDescription(createForm.elements.description.value);
      var price = cleanPrice(createForm.elements.price.value);
      var published = createForm.elements.published.value === "true";
      var maxOrder = products.reduce(function (max, product) {
        return Math.max(max, Number(product.sort_order) || 0);
      }, 0);
      path = "products/" + id + "-" + Date.now() + "." + image.extension;
      await uploadImage(path, image);
      var result = await client.from("products").insert({
        id: id,
        name: name,
        description: description,
        price: price,
        image_path: path,
        published: published,
        sort_order: maxOrder + 10
      }).select("id").single();
      if (result.error) throw result.error;
      saved = true;
      createForm.reset();
      createPhoto.reset();
      createForm.elements.published.value = "true";
      await reloadProducts();
      renderList(id);
      setMessage(message, "Sabonete publicado na coleção.", "ok");
    } catch (error) {
      if (path && !saved) {
        try { await removeImage(path); } catch (ignore) { /* no se creó el producto */ }
      }
      setMessage(message, localMessage(error), "error");
    } finally {
      createForm.dataset.saving = "false";
      submit.disabled = false;
    }
  });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var submit = loginForm.querySelector("[type='submit']");
    submit.disabled = true;
    setMessage(loginMessage, "Conferindo…", "");
    try {
      var email = clean(loginForm.elements.email.value);
      var password = loginForm.elements.password.value;
      var signIn = await client.auth.signInWithPassword({ email: email, password: password });
      if (signIn.error) throw signIn.error;
      var user = await requireAdmin(signIn.data.session);
      await openDashboard(user);
    } catch (error) {
      setMessage(loginMessage, window.rioRosaMessage(error), "error");
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("#toggle-password").addEventListener("click", function () {
    var input = document.querySelector("#password");
    var showing = input.type === "text";
    input.type = showing ? "password" : "text";
    this.textContent = showing ? "Mostrar" : "Ocultar";
  });

  document.querySelector("#logout").addEventListener("click", async function () {
    await client.auth.signOut();
    products = [];
    settings = null;
    loginForm.reset();
    setMessage(loginMessage, "", "");
    showGate("login", "");
  });

  async function openDashboard(user) {
    showApp(user.email);
    await reloadSettings();
    await reloadProducts();
  }

  function start() {
    var problem = window.rioRosaKeyProblem();
    if (problem) {
      showGate("setup", problem);
      return;
    }
    if (!window.rioRosaConfigured()) {
      showGate("setup", "");
      return;
    }
    try {
      client = window.rioRosaClient();
    } catch (error) {
      showGate("login", error.message);
      return;
    }
    settingsPhoto = bindPhotoField(settingsForm, 1800);
    createPhoto = bindPhotoField(createForm, 1600);
    client.auth.getSession().then(async function (result) {
      if (result.error) {
        showGate("login", window.rioRosaMessage(result.error));
        return;
      }
      if (!result.data.session) {
        showGate("login", "");
        return;
      }
      try {
        var user = await requireAdmin(result.data.session);
        await openDashboard(user);
      } catch (error) {
        showGate("login", window.rioRosaMessage(error));
      }
    }).catch(function (error) {
      showGate("login", window.rioRosaMessage(error));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
