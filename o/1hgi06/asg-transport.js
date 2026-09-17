/* ASG Client View — enquiry transport (Web3Forms).
 *
 * The ONLY line to change per deployment is ACCESS_KEY below.
 * Get it from web3forms.com (register the ASG recipient address once).
 * The key is a public submission key by design — it is safe in a public
 * repository. It is not a secret and grants no access to anything else.
 *
 * Until a real key is set the transport stays undefined on purpose: the form
 * then validates and honestly says enquiries are unavailable, instead of
 * pretending a message was sent.
 */
(() => {
  "use strict";

  const ACCESS_KEY = "f2190531-0275-4b8a-9c63-b6f29784ca96";
  const RECIPIENT_NAME = "ASG — Automotive Supply Group";
  const ENDPOINT = "https://api.web3forms.com/submit";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ACCESS_KEY)) return;

  const CHANNEL = { WhatsApp: "WhatsApp", Telegram: "Telegram", Email: "Email", Phone: "Phone" };
  const TOPIC = {
    THIS_VEHICLE: "This vehicle",
    DELIVERY: "Delivery and purchase terms",
    OTHER_VEHICLE: "Another vehicle"
  };

  // A short, stable id derived from the submission's own idempotency key. It is
  // sent to ASG inside the message, so the client-facing reference and the
  // received enquiry always carry the same value.
  const referenceFrom = (key) =>
    "ASG-" + String(key || "").replace(/[^0-9a-z]/gi, "").slice(0, 10).toUpperCase().padEnd(10, "0");

  function offerIdentity() {
    const offers = window.ASG_OFFERS && typeof window.ASG_OFFERS === "object" ? window.ASG_OFFERS : {};
    const slug = document.documentElement.dataset.offer || Object.keys(offers)[0] || "";
    const offer = offers[slug] || offers[Object.keys(offers)[0]] || {};
    return {
      vehicle: String(offer.title || document.title || "").trim(),
      slug: String(slug || "").trim(),
      page: location.origin + location.pathname
    };
  }

  window.ASG_ENQUIRY_TRANSPORT = async (fields, context) => {
    const reference = referenceFrom(context && context.idempotencyKey);
    const identity = offerIdentity();
    const honeypot = document.getElementById("enquiryBotcheck");

    const payload = {
      access_key: ACCESS_KEY,
      subject: "Offer enquiry · " + (identity.vehicle || "ASG Client View") + " · " + reference,
      from_name: RECIPIENT_NAME,
      botcheck: Boolean(honeypot && honeypot.checked),

      reference: reference,
      vehicle: identity.vehicle,
      offer_slug: identity.slug,
      offer_page: identity.page,

      name: fields.name || "",
      contact_channel: CHANNEL[fields.contactChannel] || fields.contactChannel || "",
      contact: fields.contact || "",
      destination: fields.destination || "",
      topic: TOPIC[fields.topic] || fields.topic || "",
      requested_vehicle: fields.requestedVehicleText || "",
      message: fields.message || ""
    };

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return { accepted: false };

    let result;
    try { result = await response.json(); } catch { return { accepted: false }; }
    if (result && result.success === true) return { accepted: true, reference: reference };
    return { accepted: false };
  };
})();
