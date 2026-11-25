(function () {
  "use strict";

  var CATALOG = {
    show_prices: true,
    currency: "R$",
    hero_text: "Sabonetes feitos à mão, cuidado, beleza e carinho em cada detalhe Río Rosa.",
    footer_note: "Um catálogo para olhar devagar e escolher com vontade. Encomendas direto com a Río Rosa.",
    instagram: "",
    whatsapp: "5548998063538",
    cover_path: ""
  };

  var PRODUCTS = [
    ["Rosa Mosqueta", "Pétalas de rosa mosqueta e óleo de amêndoas. Floral, luminoso e macio como um segredo.", 48, "assets/images/rosamosqueta.jpeg"],
    ["Lavanda Silvestre", "Lavanda selvagem e manteiga de karité. Acalma a pele e deixa o banho mais lento.", 46, "assets/images/lavanda.jpeg"],
    ["Aveia e Mel", "Aveia e mel numa espuma doce. O cuidado que a pele sensível reconhece na hora.", 42, "assets/images/me"],
    ["Jasmim", "Jasmim noturno e um fundo morno de baunilha. O perfume fica na toalha.", 54, "assets/images/soap-04.svg"],
    ["Cítricos do Vale", "Laranja, limão e um toque de hortelã. Frescor que acorda o corpo inteiro.", 38, "assets/images/soap-05.svg"],
    ["Argila Rosa", "Argila rosa e água de rosas. Limpa com delicadeza e deixa um viço lindo.", 45, "assets/images/soap-06.svg"],
    ["Alecrim e Sálvia", "Alecrim e sálvia num aroma herbal fresco. Limpa o dia e perfuma a pele.", 41, "assets/images/soap-07.svg"],
    ["Coco e Baunilha", "Óleo de coco e baunilha. Espuma cremosa, quase uma sobremesa.", 43, "assets/images/soap-08.svg"],
    ["Calêndula", "Flores de calêndula e azeite. Sol líquido para a pele que quer brilhar.", 47, "assets/images/soap-09.svg"],
    ["Chá Verde", "Chá verde e pepino. Leve, vegetal e impossivelmente fresco.", 44, "assets/images/soap-10.svg"],
    ["Amêndoa Doce", "Amêndoa e manteiga de cacau. Nutre, perfuma e pede outro banho.", 52, "assets/images/soap-11.svg"],
    ["Gerânio", "Gerânio e pau-rosa, com um final empoado e deliciosamente feminino.", 49, "assets/images/soap-12.svg"]
  ].map(function (item, index) {
    return {
      id: "demo-" + (index + 1),
      name: item[0],
      description: item[1],
      price: item[2],
      image_path: item[3]
    };
  });

  var grid = document.querySelector("#product-grid");
  var statusEl = document.querySelector("#catalog-status");
  var heroImage = document.querySelector("#hero-image");
  var heroFallbackUsed = false;

  heroImage.addEventListener("error", function () {
    if (heroFallbackUsed) return;
    heroFallbackUsed = true;
    heroImage.dataset.src = "";
    heroImage.src = "assets/images/hero.svg";
    heroImage.alt = "Composição botânica da Río Rosa";
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function setStatus(text) {
    statusEl.hidden = !text;
    statusEl.textContent = text || "";
  }

  function formatPrice(value, currency) {
    if (value === null || value === undefined || value === "") return "";
    var number = Number(value);
    if (!Number.isFinite(number)) return "";
    var formatted = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
    return clean(currency || "R$") + " " + formatted;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function cleanInstagram(value) {
    return clean(value).replace(/^@/, "").replace(/[^\w.]/g, "");
  }

  function cleanWhatsapp(value) {
    return clean(value).replace(/\D/g, "");
  }

  function applySettings(settings) {
    var text = document.querySelector("#hero-text");
    var footer = document.querySelector("#footer-note");
    if (settings.hero_text) text.textContent = settings.hero_text;
    if (settings.footer_note) footer.textContent = settings.footer_note;
    renderContact(settings);
  }

  var BRAND_WHATSAPP = "5548998063538";

  function renderContact(settings) {
    var wrap = document.querySelector("#footer-contact");
    wrap.replaceChildren();
    var instagram = cleanInstagram(settings.instagram);
    var whatsapp = cleanWhatsapp(settings.whatsapp) || BRAND_WHATSAPP;
    if (instagram) wrap.append(externalLink("https://instagram.com/" + instagram, "@" + instagram));
    wrap.append(whatsappLink(whatsapp));
    wrap.hidden = false;
  }

  function whatsappLink(digits) {
    var international = digits.length <= 11 ? "55" + digits : digits;
    var label = formatWhatsapp(international);
    var link = document.createElement("a");
    link.className = "whatsapp-link";
    link.href = "https://wa.me/" + international;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "WhatsApp " + label);
    link.append(whatsappIcon(), el("span", null, label));
    return link;
  }

  function formatWhatsapp(digits) {
    if (digits.length === 13 && digits.slice(0, 2) === "55") {
      return "(" + digits.slice(2, 4) + ") " + digits.slice(4, 9) + "-" + digits.slice(9);
    }
    if (digits.length === 11) {
      return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
    }
    return digits;
  }

  function whatsappIcon() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("d", "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z");
    svg.append(path);
    return svg;
  }

  function externalLink(href, label) {
    var link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    return link;
  }

  function fallback(name) {
    var letter = clean(name).charAt(0).toLocaleUpperCase("pt-BR") || "R";
    return el("div", "photo-fallback", letter);
  }

  function photoFrame(url, name, eager) {
    var frame = el("div", "card-photo");
    if (!url) {
      frame.append(fallback(name));
      return frame;
    }
    var image = document.createElement("img");
    image.src = url;
    image.alt = name;
    image.loading = eager ? "eager" : "lazy";
    image.decoding = "async";
    image.addEventListener("error", function () {
      image.replaceWith(fallback(name));
    });
    frame.append(image);
    return frame;
  }

  function renderCard(product, settings, resolveUrl, eager) {
    var card = el("article", "card");
    card.append(photoFrame(resolveUrl(product), product.name, eager));
    var body = el("div", "card-body");
    body.append(el("h3", null, product.name));
    var description = clean(product.description);
    if (description) body.append(el("p", "card-description", description));
    if (settings.show_prices !== false) {
      var price = formatPrice(product.price, settings.currency);
      if (price) body.append(el("p", "card-price", price));
    }
    card.append(body);
    return card;
  }

  function renderProducts(products, settings, resolveUrl) {
    var fragment = document.createDocumentFragment();
    products.forEach(function (product, index) {
      fragment.append(renderCard(product, settings, resolveUrl, index < 4));
    });
    grid.replaceChildren(fragment);
    setStatus(products.length ? "" : "A coleção ainda está em preparo.");
  }

  function start() {
    applySettings(CATALOG);
    renderProducts(PRODUCTS, CATALOG, function (product) { return product.image_path || ""; });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
