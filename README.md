# NIF — Fakturačný systém

Nástroj na automatizovanú fakturáciu pre freelancerov a živnostníkov. Spája Toggl Track (evidencia odpracovaného času) s KROS (účtovný systém) cez vlastné REST API.

---

## Architektúra

```
Toggl Track  ──sync──►  NIF Backend (NestJS)  ──send──►  KROS OpenAPI
                              │
                         NIF Frontend (Angular)
```

- **Backend:** `http://localhost:3000/api`
- **Frontend:** `http://localhost:4200`
- **Swagger UI:** `http://localhost:3000/api/docs`

---

## Predpoklady

| Čo              | Kde nájdeš                                                                 |
|-----------------|----------------------------------------------------------------------------|
| Toggl API token | toggl.com → Profile Settings → API Token (dole na stránke)                |
| Toggl Workspace ID | toggl.com → Settings → Workspace ID v URL (`/workspaces/XXXXXXX/...`) |
| KROS API token  | KROS účtovníctvo → Integrácie → OpenAPI → vygenerovať token               |

---

## Pracovný postup

### 1. Príprava v Toggl

Pred prvou synchronizáciou je potrebné mať v Toggl správne nastavené dáta:

1. **Vytvor klienta** — Clients → New Client (napr. „Firma ABC s.r.o.")
2. **Vytvor projekt** — Projects → New Project, nastaviť:
   - Názov projektu
   - Priradiť klienta (pole *Client*)
3. **Zadávaj časové záznamy** — pri každom zázname nastav:
   - Popis práce
   - **Project** — musí byť priradený projekt (bez projektu sa záznam neimportuje k žiadnemu klientovi)

> Záznamy bez priradeného projektu sa síce synchronizujú, ale nevstupujú do generovania faktúry.

---

### 2. Nastavenie NIF (jednorazovo)

Všetky API volania vyžadujú JWT token. Získaš ho prihlásením.

#### Krok 1 — Prihlásenie

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "tvoj@email.sk",
  "password": "heslo"
}
```

**Odpoveď:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Tento token pridaj do všetkých ďalších requestov ako `Authorization: Bearer <token>`.

---

#### Krok 2 — Uložiť API tokeny a nastavenia

```
PATCH /api/users/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "togglApiToken": "abc123def456...",
  "togglWorkspaceId": "1234567",
  "krosApiToken": "bearer_token_xyz...",
  "defaultHourlyRate": 50,
  "defaultVatRate": 23,
  "currency": "EUR",
  "invoiceDueDays": 14,
  "supplierIban": "SK12 0900 0000 0001 2345 6789",
  "supplierSwift": "GIBASKBX"
}
```

Všetky polia sú voliteľné — môžeš nastavovať postupne.

---

### 3. Synchronizácia z Toggl

```
POST /api/toggl/sync
Authorization: Bearer <token>
```

Synchronizácia importuje:
- **Klientov** — z Toggl Clients (workspace endpoint; ak nie je dostupný kvôli plánu, preskočí sa)
- **Projekty** — workspace endpoint s fallbackom na `/me/projects`
- **Časové záznamy** — posledných 89 dní (limit Toggl free plánu)

**Úspešná odpoveď:**
```json
{
  "clients": 3,
  "projects": 7,
  "timeEntries": 142
}
```

---

### 4. Generovanie faktúry

```
POST /api/invoices/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "year": 2026,
  "month": 4
}
```

Systém pre každého aktívneho klienta:
1. Nájde všetky nefakturované časové záznamy za dané obdobie (cez priradené projekty)
2. Pripočíta manuálne záznamy (ak existujú)
3. Vypočíta sumu podľa hodinovej sadzby klienta (alebo `defaultHourlyRate`)
4. Vygeneruje faktúru so stavom `DRAFT`
5. Označí záznamy ako `invoiced: true`

**Odpoveď:**
```json
{
  "generated": 2,
  "invoiceIds": ["clx1...", "clx2..."]
}
```

> Ak za dané obdobie neexistujú žiadne záznamy pre klienta, faktúra sa nevygeneruje.

---

### 5. Odoslanie do KROS

```
POST /api/invoices/{invoiceId}/send
Authorization: Bearer <token>
```

Faktúra sa odošle cez KROS OpenAPI. Po úspešnom odoslaní sa stav faktúry zmení na `SENT`.

Alternatívna cesta (rovnaký endpoint, iná URL):
```
POST /api/kros/invoices/{invoiceId}/send
```

---

### 6. Voliteľné — manuálne záznamy

Pre jednorazové alebo fixné položky (napr. konzultácia, licencia) možno pridať záznam ručne bez Toggl:

```
POST /api/manual-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceName": "Konzultácia",
  "performedAt": "2026-04-28",
  "hours": 2,
  "hourlyRate": 75,
  "clientId": "clx...",
  "notes": "Úvodný onboarding"
}
```

Pre fixnú cenu (bez hodinového výpočtu) použi `fixedPrice` namiesto `hours` + `hourlyRate`:

```json
{
  "serviceName": "Ročná licencia",
  "performedAt": "2026-04-01",
  "fixedPrice": 200,
  "clientId": "clx..."
}
```

---

## Prehľad API

| Metóda   | Endpoint                          | Popis                              |
|----------|-----------------------------------|------------------------------------|
| `POST`   | `/api/auth/login`                 | Prihlásenie, vráti JWT token       |
| `GET`    | `/api/auth/me`                    | Aktuálne prihlásený používateľ     |
| `PATCH`  | `/api/users/settings`             | Uložiť nastavenia a API tokeny     |
| `POST`   | `/api/toggl/sync`                 | Synchronizovať dáta z Toggl        |
| `GET`    | `/api/toggl/workspaces`           | Zoznam Toggl workspaces            |
| `GET`    | `/api/invoices`                   | Zoznam faktúr (stránkovaný)        |
| `GET`    | `/api/invoices/stats`             | Štatistiky (sumy, počty)           |
| `GET`    | `/api/invoices/:id`               | Detail faktúry                     |
| `POST`   | `/api/invoices/generate`          | Vygenerovať faktúru za obdobie     |
| `POST`   | `/api/invoices/:id/send`          | Odoslať faktúru do KROS            |
| `PATCH`  | `/api/invoices/:id/status`        | Zmeniť stav faktúry                |
| `DELETE` | `/api/invoices/:id`               | Zmazať faktúru (len DRAFT)         |
| `POST`   | `/api/manual-entries`             | Pridať manuálny záznam             |
| `GET`    | `/api/manual-entries`             | Zoznam manuálnych záznamov         |
| `DELETE` | `/api/manual-entries/:id`         | Zmazať manuálny záznam             |

Kompletná interaktívna dokumentácia: **`http://localhost:3000/api/docs`**

---

## Stavy faktúry

| Stav     | Popis                                          |
|----------|------------------------------------------------|
| `DRAFT`  | Vygenerovaná, ešte neodoslaná                  |
| `SENT`   | Odoslaná do KROS                               |
| `PAID`   | Uhradená (nastaviť manuálne)                   |

> Faktúry so stavom `SENT` alebo `PAID` nie je možné zmazať.

---

## Spustenie

```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm start
```
