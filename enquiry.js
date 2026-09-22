/* ASG catalogue — enquiry form: validation, submission, confirmation.
 *
 * The transport is the one the offer pages use (Web3Forms). The access key is
 * a public submission key by design — it is safe in a public repository, it is
 * not a secret, and it grants no access to anything else.
 *
 * Nothing about a vehicle is read from the page: what the sender types is what
 * is sent, plus which marque filter was open when they wrote.
 */
(function () {
  "use strict";

  var ACCESS_KEY = "f2190531-0275-4b8a-9c63-b6f29784ca96";
  var ENDPOINT = "https://api.web3forms.com/submit";
  var RECIPIENT = "ASG — Automotive Supply Group";

  var form = document.getElementById("enquiryForm");
  if (!form) return;

  var statusLine = document.getElementById("enquiryStatus");
  var submit = document.getElementById("enquirySubmit");
  var success = document.getElementById("enquirySuccess");
  var successRef = document.getElementById("enquirySuccessRef");
  var topic = document.getElementById("enquiryTopic");
  var channel = document.getElementById("enquiryChannel");
  var contact = document.getElementById("enquiryContact");
  var contactLabel = document.getElementById("contactLabel");
  var contactHint = document.getElementById("contactHint");
  var vehicleField = document.getElementById("vehicleField");
  var vehicleLabel = document.getElementById("vehicleLabel");
  var vehicleInput = document.getElementById("enquiryVehicle");
  var contextField = document.getElementById("enquiryContext");
  var idle = statusLine ? statusLine.textContent : "";

  var CHANNEL_COPY = {
    WhatsApp: ["WhatsApp number (required)", "Include the country code, for example +41 79 000 00 00.", "+41 79 000 00 00"],
    Telegram: ["Telegram (required)", "A @username or the number your Telegram is registered to.", "@username"],
    Email: ["Email address (required)", "The address the ASG team should reply to.", "name@company.com"],
    Phone: ["Phone number (required)", "Include the country code, for example +41 79 000 00 00.", "+41 79 000 00 00"]
  };

  /* Which vehicle the sender means is a different question depending on the
     topic, and on a shelf it is the question that matters most. */
  var TOPIC_COPY = {
    LIST_VEHICLE: ["Which vehicle? (required)", "Name it, or paste the link from the card — several is fine."],
    OTHER_VEHICLE: ["What are you looking for? (required)", "Make, model or the specification you have in mind."],
    DELIVERY: ["", ""]
  };

  function setFieldError(input, message) {
    var wrapper = input ? input.closest(".field") : null;
    var holder = wrapper ? wrapper.querySelector(".field-error") : null;
    if (wrapper) wrapper.classList.toggle("is-invalid", Boolean(message));
    if (holder) {
      holder.textContent = message || "";
      holder.hidden = !message;
    }
  }

  function say(message, isError) {
    if (!statusLine) return;
    statusLine.textContent = message;
    statusLine.classList.toggle("is-error", Boolean(isError));
  }

  function syncChannel() {
    var copy = CHANNEL_COPY[channel && channel.value];
    if (contactLabel) contactLabel.textContent = copy ? copy[0] : "Contact (required)";
    if (contactHint) contactHint.textContent = copy ? copy[1] : "Choose a channel above.";
    if (contact) contact.placeholder = copy ? copy[2] : "Choose your preferred channel above";
    if (contact) contact.setAttribute("inputmode", channel && channel.value === "Email" ? "email" : "text");
  }

  function syncTopic() {
    var value = topic ? topic.value : "LIST_VEHICLE";
    var copy = TOPIC_COPY[value] || TOPIC_COPY.LIST_VEHICLE;
    var needed = value !== "DELIVERY";
    if (vehicleField) vehicleField.hidden = !needed;
    if (vehicleLabel && copy[0]) vehicleLabel.textContent = copy[0];
    if (vehicleInput) {
      vehicleInput.placeholder = copy[1] || "";
      if (!needed) setFieldError(vehicleInput, "");
    }
  }

  /* Whoever writes from a filtered view is usually writing about that marque;
     saying so in the enquiry saves a round trip. */
  function readContext() {
    var active = document.querySelector("#filters .chip.is-active");
    var marque = active ? active.getAttribute("data-filter") : "all";
    return marque && marque !== "all" ? "Viewing: " + marque : "Viewing: all vehicles";
  }

  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }

  function looksLikeNumber(value) {
    return (value.match(/\d/g) || []).length >= 7;
  }

  function validate() {
    var problems = 0;
    var name = form.elements.name;
    if (!name.value.trim()) {
      setFieldError(name, "Enter your name.");
      problems++;
    } else setFieldError(name, "");

    if (!channel.value) {
      setFieldError(channel, "Choose how we should reply.");
      problems++;
    } else setFieldError(channel, "");

    var contactValue = contact.value.trim();
    if (!contactValue) {
      setFieldError(contact, "Enter your contact.");
      problems++;
    } else if (channel.value === "Email" && !looksLikeEmail(contactValue)) {
      setFieldError(contact, "That does not look like an email address.");
      problems++;
    } else if ((channel.value === "Phone" || channel.value === "WhatsApp") && !looksLikeNumber(contactValue)) {
      setFieldError(contact, "Include the full number with its country code.");
      problems++;
    } else setFieldError(contact, "");

    if (vehicleField && !vehicleField.hidden && !vehicleInput.value.trim()) {
      setFieldError(vehicleInput, "Tell us which vehicle, or what you are looking for.");
      problems++;
    } else if (vehicleInput) setFieldError(vehicleInput, "");

    return problems;
  }

  function reference() {
    var key = (window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(16).slice(2);
    return "ASG-" + key.replace(/[^0-9a-z]/gi, "").slice(0, 10).toUpperCase();
  }

  if (channel) channel.addEventListener("change", syncChannel);
  if (topic) topic.addEventListener("change", syncTopic);
  syncChannel();
  syncTopic();

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var problems = validate();
    if (problems) {
      say(problems === 1 ? "One field needs attention." : problems + " fields need attention.", true);
      var firstInvalid = form.querySelector(".field.is-invalid input, .field.is-invalid select");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var ticket = reference();
    if (contextField) contextField.value = readContext();

    var payload = {
      access_key: ACCESS_KEY,
      subject: "Catalogue enquiry · " + ticket,
      from_name: RECIPIENT,
      botcheck: Boolean(form.elements.botcheck && form.elements.botcheck.checked),
      reference: ticket,
      source: "Catalogue — offers.asg-hub.com",
      context: contextField ? contextField.value : "",
      name: form.elements.name.value.trim(),
      contact_channel: channel.value,
      contact: contact.value.trim(),
      destination: form.elements.destination.value.trim(),
      topic: topic ? topic.options[topic.selectedIndex].text : "",
      requested_vehicle: vehicleInput ? vehicleInput.value.trim() : "",
      message: form.elements.message.value.trim()
    };

    submit.disabled = true;
    say("Sending your enquiry…", false);

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.ok ? response.json() : null;
    }).then(function (result) {
      if (!result || result.success !== true) throw new Error("not accepted");
      if (successRef) successRef.textContent = ticket;
      form.hidden = true;
      if (success) {
        success.hidden = false;
        var heading = success.querySelector("h3");
        if (heading) heading.focus();
      }
    }).catch(function () {
      submit.disabled = false;
      say("We could not confirm that your enquiry was received. Your details are still here — try again, or write to info@asg-hub.com.", true);
    });
  });

  form.addEventListener("input", function (event) {
    if (event.target.closest(".field.is-invalid")) {
      setFieldError(event.target, "");
      if (!form.querySelector(".field.is-invalid")) say(idle, false);
    }
  });
})();
