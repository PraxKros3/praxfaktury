# NIF – Nastavenie a spustenie

## Požiadavky
- Node.js v22+ (nainštalovaný)
- PostgreSQL databáza (lokálna alebo Supabase)

---

## 1. Databáza – PostgreSQL

### Možnosť A: Supabase (odporúčané, zadarmo)
1. Choď na https://supabase.com → Create new project
2. Skopíruj `Connection string` (Settings → Database → Connection string → URI)
3. Vlož do `backend/.env` ako `DATABASE_URL`

### Možnosť B: Lokálny PostgreSQL
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/nif_db"
```

---

## 2. Backend (NestJS)

```bash
cd backend

# Nastav .env
copy .env.example .env
# Uprav DATABASE_URL v .env

# Vytvor databázové tabuľky
npx prisma migrate dev --name init

# Vytvor prvého používateľa
npm run seed

# Spusti server
npm run start:dev
```
Backend beží na: http://localhost:3000/api

**Prihlasovacie údaje:**
- Email: `admin@nif.local`
- Heslo: `admin123`

---

## 3. Frontend (Angular)

```bash
cd frontend
npm run start
```
Frontend beží na: http://localhost:4200

---

## 4. Konfigurácia v aplikácii

Po prihlásení choď do **Nastavenia** a vlož:

### Toggl API Token
1. Prihlás sa na https://track.toggl.com
2. Profile Settings → API Token → klikni "Click to reveal"
3. Skopíruj token

### Toggl Workspace ID
1. Toggl → Settings → Workspace
2. URL obsahuje workspace ID: `https://track.toggl.com/3450941/...` → `3450941`

### KROS Bearer Token
1. Prihlás sa do KROS
2. Nastavenia → API prepojenia → Vygeneruj token
3. **Ulož token hneď!** KROS ho zobrazí iba raz.

---

## 5. Prvá synchronizácia

V ľavom menu klikni **"Sync Toggl"** → systém načíta:
- Klientov z Toggl
- Projekty z Toggl
- Časové záznamy (posledných 90 dní)

Potom nastav **hodinové sadzby** pre klientov v sekcii Klienti.

---

## 6. Automatická fakturácia

Faktúry sa generujú **automaticky 1. každého mesiaca o 7:00** za predchádzajúci mesiac a odošlú sa do KROS.

Manuálne: Faktúry → vyber mesiac/rok → "Generovať faktúry"

---

## 7. KROS Webhook (voliteľné)

Pre automatické aktualizácie stavu faktúry nastav webhook URL v KROS:
```
https://tvoj-server.com/api/webhooks/kros
```
(KROS: Nastavenia → URL pre príjem notifikácií z API)

---

## Štruktúra projektu

```
nif/
├── backend/          ← NestJS API (port 3000)
│   ├── src/
│   │   ├── auth/     ← JWT autentifikácia
│   │   ├── clients/  ← Správa klientov
│   │   ├── invoices/ ← Fakturácia + výpočty
│   │   ├── kros/     ← KROS API integrácia + webhook
│   │   ├── toggl/    ← Toggl API integrácia
│   │   ├── cron/     ← Automatické joby
│   │   └── prisma/   ← Databáza
│   └── prisma/
│       └── schema.prisma
└── frontend/         ← Angular UI (port 4200)
    └── src/app/
        ├── features/ ← Dashboard, Faktúry, Klienti, Projekty, Nastavenia
        └── core/     ← Services, Guards, Models
```
