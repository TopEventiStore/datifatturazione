# TOP EVENTI STORE — Form Conferma Dati di Fatturazione

Ad ogni conferma, il sistema **genera automaticamente un file Excel (.xls) nel tracciato
esatto della vostra anagrafica** e lo invia come allegato alla casella ufficio,
**dalla vostra casella TopHost**. Il file è pronto da importare nel gestionale.
Nessun limite di Netlify Forms.

## File del progetto
```
index.html                      → il form
netlify.toml                    → configurazione Netlify
package.json                    → dipendenze (nodemailer, xlsx)
netlify/functions/send-email.js → genera l'Excel e invia la mail con allegato
```

---

## 1) Deploy su Netlify (tramite GitHub — consigliato)
Serve un deploy che esegua `npm install` (per generare l'Excel), quindi NON usare il
semplice drag & drop.

### Opzione A — GitHub
1. Crea un repository su GitHub e carica TUTTI i file qui sopra (mantieni le cartelle).
2. Su https://app.netlify.com → **Add new site → Import from Git** → scegli il repo.
3. Build command: lascia vuoto. Publish directory: `.`  → **Deploy**.

### Opzione B — Netlify CLI
```bash
npm install
npm install -g netlify-cli
netlify deploy --prod
```

---

## 2) IMPORTANTE — Credenziali casella TopHost (variabili d'ambiente)
Le credenziali NON sono nel codice. Vai su **Site settings → Environment variables → Add**:

| Variabile     | Valore                                         |
|---------------|------------------------------------------------|
| `SMTP_HOST`   | `mail.tophost.it`                              |
| `SMTP_PORT`   | `587`                                          |
| `SMTP_USER`   | `comunicazioniufficio@topeventistore.com`      |
| `SMTP_PASS`   | la password della casella email                |
| `MAIL_TO`     | `comunicazioniufficio@topeventistore.com`      |
| `MAIL_FROM`   | `comunicazioniufficio@topeventistore.com`      |

Dopo aver salvato, fai un nuovo deploy ("Trigger deploy") perché le variabili vengano applicate.

> TopHost: server in uscita `mail.tophost.it`, porta `587`, STARTTLS, autenticazione con
> email completa + password. In alternativa porta `465` (imposta `SMTP_PORT=465`).

---

## 3) Cosa riceve l'ufficio
- Una email con oggetto `Conferma anagrafica — Ordine/Preventivo <numero> (Privato/Azienda)`.
- In allegato il file `anagrafica_<ordine>_<nome>.xls` già nel tracciato del gestionale.
- Nel corpo, un riepilogo leggibile + eventuali note del cliente.
- Reply-To = email del cliente (rispondendo scrivi a lui).

---

## Mappatura campi form → colonne gestionale (A..V)
| Col | Campo gestionale | Da dove arriva |
|-----|------------------|----------------|
| A | Tipo anagrafica | Privato / Azienda |
| **B** | Conto Cliente | **vuoto** |
| C | Cognome\Ragione Sociale | Cognome (privato) o Ragione Sociale (azienda) |
| D | Nome\Referente | Nome (privato) o Referente (azienda) |
| E | Codice Destinatario | Codice Destinatario SDI |
| F | PEC | PEC |
| G | Codice Paese | Paese (default IT) |
| **H** | Legale rappresentante | **vuoto** |
| **I** | Sesso | **vuoto** |
| J | Partita IVA | Partita IVA |
| K | Codice Fiscale | Cod. Fiscale |
| L | Indirizzo | Indirizzo (via) |
| M | Numero civico | Numero civico |
| N | Email | Email |
| O | Telefono | Telefono |
| **P** | Consenso promozioni | **sempre 1** |
| Q | Comune | Città |
| R | CAP | CAP |
| S | Provincia | Provincia |
| T | Stato | Paese (default IT) |
| **U** | Regione | **vuoto** |
| V | Data Creazione | data/ora automatica |

I campi **B, H, I** restano sempre vuoti; **P** è sempre **1**; **U** vuoto (come richiesto).
Il campo *N. Ordine/Preventivo* viene messo nell'oggetto/corpo della mail, non nell'Excel
(non esiste una colonna corrispondente nel tracciato).

---

## Personalizzazioni
- **Colori:** in `index.html`, sezione `:root` (`--rosso`, `--blu`).
- **Logo:** testuale; per usare un'immagine sostituisci il blocco `<div class="logo">`.
- **Destinatario/mittente:** variabili `MAIL_TO` / `MAIL_FROM` su Netlify.
- **Formato file:** attualmente `.xls` (come l'export). Per `.xlsx` cambia in `send-email.js`
  `bookType: 'biff8'` → `bookType: 'xlsx'` e l'estensione del nome file.
