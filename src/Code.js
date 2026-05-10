/* Denna behöver uppdateras varje år, till redigeringslänken för google-formuläret,
   på formen https://docs.google.com/forms/d/[bokstäver-och-siffror]/edit
   Den används för att stänga grupper automatiskt när de blir fulla.
*/
const formUrl = 'https://docs.google.com/forms/d/1jD3aTiGTchCo569yXjOWlncNqaCQv8P9ePGfixyGlNA/edit';
/* Namn på fliken i Sheets där formulärssvar fylls i */
const formTabName = 'Form responses 2'

/* Behöver uppdateras om man ändrar gruppnamn i Sheets eller Forms.
   Vänstra är i Forms, högra i Sheets. */
const groupNames = [
  ["Nybörjare 10.00-10.30", "Nybörjare 10.00"],
  ["Nybörjare 10.30-11.00", "Nybörjare 10.30"],
  ["Fortsättning 11.00-11.30", "Fortsättning 11.00"],
  ["Syskongrupp 12.15-12.45", "Syskongrupp"],
  ["Märkestagning 12.45-14.00", "Märkestagning"],
  ["Märkestagning VUXEN 12.45-14.00", "Märkestagning Vuxen"]];

/* Pris för 1 vs 2 vs 3 veckor simskola */
const costs = {
    1: 400,
    2: 700,
    3: 750
};

const orgNr = "853300-7848";
const bgNumber = "5684-9060";
const swishSpaced = "123 1317 635";
// text i formulär vid val av grupp
const DELTAR_EJ = 'Deltar ej';

function luhnChecksum_(number) {
  const digits = String(number).split('').map(Number).reverse();

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits[i];
    if (i % 2 === 0) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }

  return (10 - (sum % 10)) % 10;
}

function newOCR_(dataSheet) {
  const existing = dataSheet
    .getRange('R2:R')
    .getValues()
    .flat();
  var number = new Date().getFullYear() * 1000 + 1;
  while (true) {
    const ocr = number * 10 + luhnChecksum_(number);
    if (!existing.includes(ocr))
      return ocr;
    number++;
  }
}

function htmlToText_(html) {
  return html
    // a href
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi,
      (_, href, text) => `${text} (${href})`)
    // radbrytningar
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")

    // ta bort alla taggar
    .replace(/<[^>]+>/g, "")

    // decode lite vanliga entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")

    // trimma snyggt
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml_(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

function renderInfoTableHtml_(rowByTitle) {
  rowsHtml = Object.entries(rowByTitle).map(([k, v]) => `
  <tr><td style="font-weight:bold; padding-right:10px;">${k}</td>
  <td>${escapeHtml_(v)}</td></tr>
`).join("");

  return `
    <div style="background:#f5f5f5; padding:12px; border-radius:6px;">
      <p style="font-weight:bold;">Registrerade uppgifter</p>
      <table style="font-size:13px;">
        ${rowsHtml}
      </table>
    </div>
  `;
}

function makeSwishLink_(phone, amount, ocr) {
  return `https://app.swish.nu/1/p/sw/?sw=${phone}&amt=${amount}&cur=SEK&msg=${encodeURIComponent(ocr)}`
}

function makeSwishQRData_(phone, amount, ocr) {
  // return `${makeSwishLink_(phone, amount, ocr)}&src=qr`
  return `C${phone};${amount};${encodeURIComponent(ocr)};6`;
}

function dateIsoPlusDays_(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}
function datePlusDays_(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}${mm}${dd}`;
}
function makeBankQRData_(bg, cost, ocr) {
  ddt = datePlusDays_(10);
  return JSON.stringify({"uqr": 1, "tp": 1, "nme": "Vadholmens Simskolef\u00f6rening", "cid": orgNr, "iref": ocr, "ddt": ddt, "due": cost, "pt": "BG", "acc": bg})
}

function makeQRServerURL_(payload) {
  return "https://api.qrserver.com/v1/create-qr-code/?" +
  `size=200x200&data=${encodeURIComponent(payload)}`;

}

function tryGetQrBlob_(payload, pngName) {
  var url = makeQRServerURL_(payload);
  var handle = null;
  try {
    handle = UrlFetchApp.fetch(url, {
      timeout: 5000, // ms
    })
  } catch (e) {
    Logger.log("QR fetch failed: " + e);
    return null;
  }
  return handle.getBlob().setName(pngName);
}

function formatConfirmationEmail_(
    name,
    weeks,
    cost,
    ocr,
    record) {
  
  const swish = swishSpaced.replace(/ /g, "");

  var inlineImages = {}
  for ([key, payload] of [
    ["swish", makeSwishQRData_(swish, cost, ocr)],
    ["bg", makeBankQRData_(bgNumber, cost, ocr)]
    ]) {
      var blob = tryGetQrBlob_(payload, `${key}.png`);
      if (blob) {
        inlineImages[key] = blob;
      }
    }
  weeks = weeks.map(([week, group]) => `<p>v${week}: ${group}</p>`).join('\n')
  const body = `
<p>Hej!</p>

<p>Vi har tagit emot er anmälan till simskolan.</p>

<p>Deltagare: ${name}</p>
${weeks}

<p>Totalt att betala: ${cost} kr</p>
<p>Betala inom 10 dagar för att behålla din plats i simskolan.</p>

<p style="font-weight:bold;">Betalning via Swish</p>
<p>Klicka <a href="${makeSwishLink_(swish, cost, ocr)}">här</a> för att betala på denna enhet, eller skanna QR-kod i Swish-appen:</p>
<img src="cid:swish" width="200" height="200"></p>
<table><tr>
  <td>Swish-nummer</td>
  <td>${swishSpaced}</td>
</tr><tr>
  <td>Belopp</td>
  <td>${cost} SEK</td>
</tr><tr>
  <td>Meddelande</td>
  <td>${ocr}</td>
</tr></table>

<p style="font-weight:bold;">Betalning via Bankgiro</p>
<p>Skanna QR-kod för faktura i bank-appen:</p>
<p><img src="cid:bg" width="200" height="200"></p>
<table><tr>
  <td>BG</td>
  <td>${bgNumber}</td>
</tr><tr>
  <td>Belopp</td>
  <td>${cost} SEK</td>
</tr><tr>
  <td>OCR/Fakturanummer</td>
  <td>${ocr}</td>
</tr><tr>
  <td>Säljare</td>
  <td>Vadholmens Simskoleförening</td>
</tr><tr>
  <td>Organisationsnummer</td>
  <td>${orgNr}</td>
</tr><tr>
  <td>Fakturadatum</td>
  <td>${dateIsoPlusDays_(0)}</td>
</tr><tr>
  <td>Förfallodatum</td>
  <td>${dateIsoPlusDays_(10)}</td>
</tr></table>

<p>Vänligen kontrollera att BG- och OCR-numret anges korrekt vid betalning.</p>

<p>Har ni frågor är ni varmt välkomna att svara på detta mail.</p>

<p>Vänliga hälsningar</p>
<p>Vadholmens Simskola</p>

${renderInfoTableHtml_(record)}
`;

  return [body, inlineImages];
  /*
  GmailApp.sendEmail(email, subject, body, {
    replyTo: "simskola@vadholmen.se"
    // kolla om det funkar -- behöver ev registreras som alias
    //from: "simskola@vadholmen.se"
  });*/
}

function sendConfirmationEmail_(email, htmlBody, inlineImages) {
  const subject = "Bekräftelse simskola – betalningsinformation";
  MailApp.sendEmail({
    to: email, replyTo: "simskola@vadholmen.se",
    subject: subject, htmlBody: htmlBody, body: htmlToText_(htmlBody), inlineImages: inlineImages});
}

const groupChoiceToTitle = Object.fromEntries(groupNames);
const groupTitleToChoice = Object.fromEntries(groupNames.map(([a, b]) => [b, a]));

function updateFormOptions(groupsSheet) {
  // Vecka/Namn/Kapacitet/Deltagare
  const rows = groupsSheet.getRange(2, 2, 18, 4)
          .getValues();

  const form = FormApp.openByUrl(formUrl);
  const items = form.getItems(FormApp.ItemType.MULTIPLE_CHOICE);

  for (week of ["26", "27", "28"]) {
    const groupQuestion = items.find(item =>
      item.getTitle().includes(week)
    ).asMultipleChoiceItem();

    var choices = [groupQuestion.createChoice(DELTAR_EJ)]
    var full = []
    for (const row  of rows) {
      const [rowWeek, name, capacity, members] = row;
      if (week != rowWeek)
        continue;
      if (capacity && members >= capacity) {
        full.push(name)
      } else {
        choices.push(groupQuestion.createChoice(groupTitleToChoice[name]));
      }
    }

    groupQuestion.setChoices(choices);
    groupQuestion.setHelpText(full ? "Fulla grupper: " + full.join(", ") : "");
  }
}

function processFormLine(row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet = ss.getSheetByName(formTabName);
  const targetSheet = ss.getSheetByName('DATA_registrations');
  const groupsSheet = ss.getSheetByName('DATA_groups');

  if (!sourceSheet || !targetSheet) {
    throw new Error('Saknar Form responses 2 eller DATA_registrations');
  }

  const formTitles = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn())
                             .getValues()[0];
  const rowData = sourceSheet.getRange(row, 1, 1, sourceSheet.getLastColumn())
                             .getValues()[0];

  var rowByTitle = {};
  formTitles.forEach((h, i) => {
    rowByTitle[h] = rowData[i];
  });

  title_map = {
    "Timestamp": "timestamp",
    "Grupp v26": "group_w26",
    "Grupp v27": "group_w27",
    "Grupp v28": "group_w28",
    "Förnamn": "first_name",
    "Efternamn": "last_name",
    "Personnummer YYYYMMDD-XXXX": "pers_number",
    "Adress": "address",
    "Postnummer": "postal_code",
    "Postort": "city",
    "Förnamn kontaktperson 1": "c1_first_name",
    "Efternamn kontaktperson 1": "c1_last_name",
    "Mobiltelefon kontaktperson 1": "c1_phone",
    "E-post kontaktperson 1": "c1_email",
    "Förnamn kontaktperson 2": "c2_first_name",
    "Efternamn kontaktperson 2": "c2_last_name",
    "Mobiltelefon kontaktperson 2": "c2_phone",
    "E-post kontaktperson 2": "c2_email",
    "Hur fick du kännedom om Vadholmens Simskola?": "how_found"};
  var data = {};
  for (const [title, val] of Object.entries(rowByTitle)) {
    if (title_map[title]) {
      data[title_map[title]] = val;
    }
  }
  var ocr = newOCR_(targetSheet);
  // Skapa ett internt ID (enkelt, räcker långt)
  const registrationId = 'R-' + Utilities.getUuid();

  var num_weeks = 0;
  for (const week of [data.group_w26, data.group_w27, data.group_w28]) {
    if (week != DELTAR_EJ) {
      num_weeks += 1;
    }
  }
  var cost = costs[num_weeks];
  var first = true;
  var weeks = [];
  for (const [week, choice] of [[26, data.group_w26], [27, data.group_w27], [28, data.group_w28]]) {
    if (choice == DELTAR_EJ)
      continue;
    const group = groupChoiceToTitle[choice];
    weeks.push([week, group])
    targetSheet.appendRow([
      registrationId,
      data.timestamp,
      data.first_name,
      data.last_name,
      data.pers_number,
      data.address,
      data.postal_code,
      data.city,
      data.c1_first_name + " " + data.c1_last_name,
      data.c1_phone,
      data.c1_email,
      data.c2_first_name + " " + data.c2_last_name,
      data.c2_phone,
      data.c2_email,
      data.how_found,
      group,
      week,
      first ? ocr : "",
      first ? cost : "",
      false
    ]);
    first = false;
  }
  updateFormOptions(groupsSheet);
  for (const email of [data.c1_email, data.c2_email]) {
    if (email != "") {
      var [htmlBody, inlineImages] = formatConfirmationEmail_(
        `${data.first_name} ${data.last_name}`,
        weeks,
        cost,
        ocr,
        rowByTitle);
      sendConfirmationEmail_(email, htmlBody, inlineImages);
    }
  }
}

function onFormSubmit(e) {
  processFormLine(e.range.getRow());
}

function testProcessFormLine() {
  processFormLine(3);
}
