// Netlify Function — TOP EVENTI STORE
// 1) riceve i dati del form
// 2) genera un file .xls nel tracciato esatto dell'anagrafica gestionale
// 3) invia una mail (via SMTP TopHost) all'ufficio con l'Excel allegato
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');

// Intestazioni nell'ORDINE ESATTO del gestionale (colonne A..V)
const HEADER = [
  'Tipo anagrafica',                                            // A
  'Conto Cliente',                                              // B (vuoto)
  'Cognome\\Ragione Sociale',                                   // C
  'Nome\\Referente',                                            // D
  'Codice Destinatario',                                        // E
  'PEC',                                                        // F
  'Codice Paese',                                               // G
  'Legale rappresentante',                                      // H (vuoto)
  'Sesso',                                                      // I (vuoto)
  'Partita IVA',                                                // J
  'Codice Fiscale',                                             // K
  'Indirizzo',                                                  // L
  'Numero civico',                                             // M
  'Email',                                                      // N
  'Telefono',                                                   // O
  "Consento l'utilizzo dei miei dati per l'invio di promozioni",// P (sempre 1)
  'Comune',                                                     // Q
  'CAP',                                                        // R
  'Provincia',                                                  // S
  'Stato',                                                      // T
  'Regione',                                                    // U (vuoto)
  'Data Creazione'                                              // V
];

function dataOraRoma() {
  const fmt = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const p = {};
  fmt.formatToParts(new Date()).forEach(x => p[x.type] = x.value);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Metodo non consentito' };

  let d;
  try { d = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: 'Dati non validi' }; }

  if (d['bot-field']) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  if (!d['Email'] || !d['N. Ordine/Preventivo'] || !d['Tipo Cliente']) {
    return { statusCode: 400, body: 'Campi obbligatori mancanti' };
  }

  const azienda = (d['Tipo Cliente'] === 'Azienda');
  const paese = (d['Paese'] || 'IT').toUpperCase().trim();

  // Riga nel tracciato (B, H, I sempre vuote; P sempre 1; U vuota)
  const riga = [
    d['Tipo Cliente'] || '',                                   // A
    '',                                                        // B Conto Cliente
    azienda ? (d['Ragione Sociale'] || '') : (d['Cognome'] || ''), // C
    azienda ? (d['Referente'] || '') : (d['Nome'] || ''),      // D
    azienda ? (d['Codice Destinatario SDI'] || '') : '',       // E
    d['PEC'] || '',                                            // F
    paese,                                                     // G
    '',                                                        // H Legale rappresentante
    '',                                                        // I Sesso
    azienda ? (d['Partita IVA'] || '') : '',                   // J
    azienda ? (d['Codice Fiscale (Azienda)'] || '') : (d['Codice Fiscale (Privato)'] || ''), // K
    d['Indirizzo'] || '',                                      // L
    d['Numero civico'] || '',                                  // M
    d['Email'] || '',                                          // N
    d['Telefono'] || '',                                       // O
    1,                                                         // P sempre 1
    d['Città'] || '',                                          // Q Comune
    d['CAP'] || '',                                            // R
    (d['Provincia'] || '').toUpperCase(),                      // S
    paese,                                                     // T Stato
    '',                                                        // U Regione
    dataOraRoma()                                              // V Data Creazione
  ];

  // --- Genera .xls (BIFF8) ---
  const ws = XLSX.utils.aoa_to_sheet([HEADER, riga]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'sheet');
  const xlsBuffer = XLSX.write(wb, { bookType: 'biff8', type: 'buffer' });

  const ordine = String(d['N. Ordine/Preventivo']).replace(/[^\w\-]+/g, '_');
  const nome = (azienda ? d['Ragione Sociale'] : `${d['Cognome'] || ''}_${d['Nome'] || ''}`) || 'cliente';
  const fileName = `anagrafica_${ordine}_${String(nome).replace(/[^\w\-]+/g, '_')}.xls`;

  // --- Corpo email (riepilogo leggibile) ---
  const righeHtml = HEADER.map((h, i) => {
    const v = riga[i];
    if (v === '' || v === null || v === undefined) return '';
    return `<tr><td style="padding:5px 10px;font-weight:bold;background:#f4f6f9;border:1px solid #d6dce5;">${h}</td>` +
           `<td style="padding:5px 10px;border:1px solid #d6dce5;">${esc(String(v))}</td></tr>`;
  }).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#1c2531;max-width:680px">
      <h2 style="color:#003a70;border-bottom:3px solid #c8102e;padding-bottom:8px;">
        Nuova conferma anagrafica — TOP EVENTI STORE
      </h2>
      <p><strong>N. Ordine/Preventivo:</strong> ${esc(String(d['N. Ordine/Preventivo']))}</p>
      <p>In allegato il file <strong>${esc(fileName)}</strong> pronto da importare nel gestionale.</p>
      ${d['Note'] ? `<p><strong>Note cliente:</strong> ${esc(String(d['Note']))}</p>` : ''}
      <table style="border-collapse:collapse;width:100%;font-size:13px;">${righeHtml}</table>
    </div>`;

  // --- Invio SMTP TopHost ---
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,                 // mail.tophost.it
    port: port,
    secure: port === 465,                        // 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: `"TOP EVENTI STORE — Form" <${process.env.MAIL_FROM || process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO || process.env.SMTP_USER,
      replyTo: d['Email'],
      subject: `Conferma anagrafica — Ordine/Preventivo ${d['N. Ordine/Preventivo']} (${d['Tipo Cliente']})`,
      html: html,
      attachments: [{ filename: fileName, content: xlsBuffer, contentType: 'application/vnd.ms-excel' }]
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Errore invio:', err);
    return { statusCode: 500, body: 'Errore nell\'invio della mail' };
  }
};

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
