/* ASG — single vehicle offer data. One object, keyed by slug.
   Source: Porsche configuration document "718 Cayman GT4 RS", Porsche Code PSK6VK92 (German, headed 2025),
   translated line by line with option codes kept. Model year, net price and Incoterms stated by ASG.
   No supplier identity, supplier cost, margin or negotiation range appears in this file. */
window.ASG_OFFERS = {
  "porsche-718-cayman-gt4-rs": {
    slug: "porsche-718-cayman-gt4-rs",
    reference: "ASG-OFFER-GT4RS-261022",

    evidenceMode: "actual",
    mediaGrade: "file",

    title: "Porsche 718 Cayman GT4 RS",
    titleLines: ["Porsche 718", "Cayman GT4 RS"],
    subtitle: "Gentian Blue Metallic · Weissach Package",

    commercialStatus: "Private proposal",
    availabilityStatus: "Availability to be confirmed",
    locationStatus: "Ex-works, Austria",

    evidenceLabel: "",
    evidenceTitle: "Photographs of this vehicle, as it stands today.",
    evidenceBody: "The photographs on this page are of this car, new and unregistered, with its factory protective covers still in place on the seats, the steering wheel and the door edges. The specification below is reproduced from the Porsche configuration document for this vehicle, line by line, with every option code. The cover image and the final gallery frame are the manufacturer's configurator view of this configuration, and are labelled as such.",

    priceLabel: "Price · NET",
    price: "167,895 EUR",
    priceNote: "Net of VAT, ex-works Austria.",

    hero: "assets/media/hero.webp",
    heroPosition: "58% 50%",
    heroMobilePosition: "72% 62%",

    facts: [
      ["Model year", "2026"],
      ["Exterior", "Gentian Blue Metallic"],
      ["Package", "Weissach Package"],
      ["Transmission", "PDK"]
    ],

    narrative: {
      eyebrow: "GENTIAN BLUE, WEISSACH SPECIFICATION",
      title: "A GT4 RS configured for the circuit.",
      body: "Gentian Blue Metallic over 20-inch magnesium forged wheels painted in silver, with Porsche Ceramic Composite Brakes behind them. The Weissach Package and the Clubsport Package carry the specification; inside, the Weissach interior package in black and Deep Sea Blue is matched by Deep Sea Blue seat belts and white Exclusive Manufaktur dials. Front-axle lift and a rear camera keep the car usable away from the track."
    },

    highlights: [
      ["Track specification", "Weissach Package · Clubsport Package · PCCB"],
      ["Wheels", "20-inch magnesium forged · painted in silver"],
      ["Cabin", "Black / Deep Sea Blue · white Exclusive Manufaktur dials"]
    ],

    galleryTitle: "A closer look",
    mediaIntro: "Photographs of this vehicle: exterior, wheels and cabin. The final frame is the manufacturer's configurator view.",
    mediaBase: "assets/media/",
    thumbBase: "assets/media/thumbs/",
    gallery: [
      ["03.webp", "Exterior", "Rear three-quarter, Gentian Blue Metallic and rear wing"],
      ["01.webp", "Exterior", "Rear three-quarter and roll cage through the rear window"],
      ["02.webp", "Exterior", "Rear wing and side air intake"],
      ["05.webp", "Wheels", "20-inch magnesium forged wheel in silver, PCCB"],
      ["04.webp", "Interior", "Cockpit with factory protective covers"],
      ["06.webp", "Configuration", "Manufacturer configurator view of this configuration", "configuration"]
    ],

    experienceChapters: [
      {
        title: "Weissach specification",
        eyebrow: "PACKAGES",
        clientReading: "Weissach and Clubsport, together.",
        summary: "The Weissach Package and the Clubsport Package are both specified. The visible result in the photographs is the roll cage behind the seats and the exposed carbon of the rear wing and air intakes.",
        image: "01.webp",
        caption: "Roll cage visible through the rear window",
        points: ["Weissach Package · P74", "Clubsport Package · 003", "Fire extinguisher · 509"]
      },
      {
        title: "Wheels and brakes",
        eyebrow: "MAGNESIUM AND CERAMIC",
        clientReading: "Forged magnesium, ceramic discs.",
        summary: "20-inch 718 Cayman GT4 RS magnesium forged wheels, painted in silver, over Porsche Ceramic Composite Brakes with yellow calipers.",
        image: "05.webp",
        caption: "Magnesium forged wheel and PCCB",
        points: ["20-inch magnesium forged wheels · 422", "Wheels painted in silver · 346", "Porsche Ceramic Composite Brake (PCCB) · 450"]
      },
      {
        title: "Cockpit",
        eyebrow: "BLACK / DEEP SEA BLUE",
        clientReading: "Race-Tex, leather and white dials.",
        summary: "The Weissach interior package with extended leather and Race-Tex in black and Deep Sea Blue, full bucket seats, Deep Sea Blue seat belts and white instrument and Chrono dials from Exclusive Manufaktur.",
        image: "04.webp",
        caption: "Cockpit, protective covers in place",
        points: ["Interior Weissach Package, black / Deep Sea Blue · 62", "Seat belts in Deep Sea Blue · 563", "White dials, Exclusive Manufaktur · XFJ · XGM"]
      },
      {
        title: "Everyday equipment",
        eyebrow: "BEYOND THE CIRCUIT",
        clientReading: "Lift, camera, cruise control.",
        summary: "Front-axle lift for ramps and kerbs, ParkAssist with a reversing camera, cruise control, LED headlights with PDLS, a 90-litre tank and the BOSE® Surround Sound System.",
        image: "02.webp",
        caption: "Rear wing and side air intake",
        points: ["Front axle lift system · 474", "ParkAssist rear incl. reversing camera · 637", "90-litre fuel tank · 082"]
      }
    ],

    specificationHighlights: [
      { group: "Driving", title: "Front-axle lift and PCCB", meaning: "Ceramic brakes for the circuit; a lift system that raises the nose for ramps and steep entrances on the way there." },
      { group: "Visual", title: "Gentian Blue over silver magnesium", meaning: "A deep metallic blue with the forged magnesium wheels painted in silver and the side decal lettering deleted." },
      { group: "Cabin", title: "Deep Sea Blue against black", meaning: "Deep Sea Blue in the Weissach interior package and the seat belts, with white Exclusive Manufaktur dials and Race-Tex sun visors." }
    ],

    specifications: [
      {
        group: "Exterior colours & wheels",
        items: [
          ["Exterior colour", "Gentian Blue Metallic · 1A"],
          ["Wheels", "20-inch 718 Cayman GT4 RS magnesium forged wheels · 422"],
          ["Wheel colour", "Wheels painted in silver · 346"]
        ]
      },
      {
        group: "Interior colours & seats",
        items: [
          ["Interior colour & material", "Interior Weissach Package with extended leather and Race-Tex trim, black / Deep Sea Blue · 62"],
          ["Seats", "Full bucket seats · P11 · standard equipment"]
        ]
      },
      {
        group: "Equipment packages",
        items: [
          ["Equipment packages", "Clubsport Package · 003"],
          ["Equipment packages", "Weissach Package · P74"]
        ]
      },
      {
        group: "Exterior",
        items: [
          ["Lettering & decals", "Deletion of side decal lettering · 712"],
          ["Light & vision", "LED main headlights incl. Porsche Dynamic Light System (PDLS) · 634"],
          ["Light & vision", "Automatically dimming interior / exterior mirrors with integrated rain sensor · P13"]
        ]
      },
      {
        group: "Interior",
        items: [
          ["Belts & seat design", "Seat belts in Deep Sea Blue · 563"],
          ["Interior design", "Instrument cluster dials in white, Exclusive Manufaktur · XFJ"],
          ["Interior design", "Chrono stopwatch dial in white, Exclusive Manufaktur · XGM"],
          ["Interior design", "Floor mats · 810"],
          ["Interior design", "Sun visors in Race-Tex, Exclusive Manufaktur · XLU"],
          ["Interior design", "Climate control panel trim, painted, Exclusive Manufaktur · CHL"],
          ["Interior design", "Fire extinguisher · 509"]
        ]
      },
      {
        group: "Technology",
        items: [
          ["Drivetrain & performance", "Front axle lift system · 474"],
          ["Drivetrain & performance", "Chrono Package · QR5"],
          ["Drivetrain & performance", "90-litre fuel tank · 082"],
          ["Drivetrain & performance", "Porsche Ceramic Composite Brake (PCCB) · 450"],
          ["Drivetrain & performance", "Porsche Doppelkupplung (PDK) · 250 · standard equipment"],
          ["Assistance systems", "ParkAssist rear incl. reversing camera · 637"],
          ["Assistance systems", "Cruise control · 454"],
          ["Comfort & everyday usability", "Light Design Package · 630"],
          ["Infotainment", "Voice control · QH1 · standard equipment"],
          ["Infotainment", "BOSE® Surround Sound System · 9VL"],
          ["Infotainment", "Porsche Vehicle Tracking System Plus (PVTS Plus) · 7I2"],
          ["Infotainment", "Apple® CarPlay · 9WT · standard equipment"]
        ]
      }
    ],

    commercialTitle: "Vehicle price, before destination costs.",
    commercialBody: "The figure above is net and stated by ASG for this vehicle. It is a private, non-binding proposal: the vehicle, its specification and the purchase terms are reconfirmed in writing before any commitment is made on either side.",
    commercialTerms: [
      ["Basis", "Net price · excluding VAT"],
      ["Delivery terms", "EXW, Austria"],
      ["Not included", "Transport, destination taxes and duties, registration and local costs"]
    ],

    readiness: [
      "Confirm the model year on the vehicle documents — the supplied configuration document is headed 2025.",
      "Reconfirm the vehicle, its specification and current availability with the source.",
      "Prepare the purchase contract and invoice in your or your company's name.",
      "Coordinate collection ex-works in Austria, transport and the documents required in the destination country."
    ],

    asgService: {
      eyebrow: "WITH ASG",
      title: "From your choice to your handover.",
      body: "ASG coordinates the vehicle and document checks, purchase terms and international delivery planning. Scope, responsibilities and costs are agreed before commitment.",
      alternativeTitle: "Looking for another vehicle?",
      alternativeBody: "Tell the ASG team which model or specification you have in mind."
    },

    sourceDisclosure: "Photographs are of this vehicle; a licence plate on another car in the background has been obscured. The cover image and the final gallery frame are the manufacturer's configurator view, not a photograph. Specification translated from the Porsche configuration document for this vehicle (Porsche Code PSK6VK92), with every option code kept; the document's own gross prices are not this offer. Specification, availability and delivery arrangements are reconfirmed in writing. Source documents prevail.",

    uiCopy: {
      primaryCta: "Enquire with ASG",
      galleryLink: "Explore the car",
      specificationTitle: "Full specification",
      modelDataNote: "Any performance figures published for this model are manufacturer figures for the model, not measurements of this vehicle.",
      mediaLabel: "Cover · manufacturer configuration visual",
      enquiry: {
        title: "Speak with ASG",
        intro: "Tell us how to reach you. The ASG team can help with this vehicle, delivery arrangements or another search.",
        topics: [
          { value: "THIS_VEHICLE", label: "This Porsche" },
          { value: "DELIVERY", label: "Delivery and purchase terms" },
          { value: "OTHER_VEHICLE", label: "Another vehicle" }
        ],
        submit: "Send enquiry"
      }
    },

    prices: [
      { currency: "EUR", price: "167,895 EUR" },
      { currency: "USD", price: "196,639 USD", note: "Indicative conversion at 1 EUR = 1.1712 USD. The contract is settled in EUR." },
      { currency: "GBP", price: "146,589 GBP", note: "Indicative conversion at 1 EUR = 0.8731 GBP. The contract is settled in EUR." },
      { currency: "CHF", price: "157,015 CHF", note: "Indicative conversion at 1 EUR = 0.9352 CHF. The contract is settled in EUR." },
      { currency: "AED", price: "722,150 AED", note: "Indicative conversion at 1 EUR = 4.3012 AED. The contract is settled in EUR." }
    ],
    fx: { amount: 167895, base: "EUR", show: ["USD", "GBP", "CHF", "AED"], ratesUrl: "/rates.json" },

    marque: { make: "Porsche", model: "718 Cayman GT4 RS" },

    deliveryTitle: "From confirmation to handover.",
    deliveryIntro: "The usual sequence for an export purchase. Timing is agreed for each deal and confirmed in writing.",
    deliveryTimeline: [
      { title: "Availability & Confirmation", body: "Vehicle, specification, price and availability confirmed.", duration: "Same day / 1 day" },
      { title: "Buyer Details & Contract", body: "Buyer details confirmed.\nPurchase agreement and invoice issued to you or your company.", duration: "1 – 2 days" },
      { title: "Payment & Release", body: "Payment received and cleared.\nVehicle released for collection or export.", duration: "Up to 2 days" },
      { title: "Collection or Delivery", body: "Collect the vehicle EXW, or we arrange transport to your destination by road, air or sea.", duration: ["EU: 2 – 7 days", "International: route dependent"] },
      { title: "Arrival & Handover", body: "Vehicle arrives at destination and is handed over according to the agreed delivery terms.", duration: "On arrival" }
    ]
  }
};
