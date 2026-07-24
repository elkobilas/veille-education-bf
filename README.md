# 📡 Veille Éducation Burkina Faso

Application de surveillance automatique des communiqués officiels du secteur éducatif burkinabè.

## 🎯 Fonctionnalités

- **Scraping automatique** des sites officiels (MEBAPLN, DIOSPB, etc.)
- **Détection de nouveaux communiqués** avec déduplication
- **Résumé automatique par IA** (OpenAI) pour chaque communiqué
- **Notification par e-mail** (Gmail) avec : titre, résumé, personnes concernées, dates, pièces à fournir, lien officiel
- **Dashboard web** pour gérer les sources et consulter l'historique
- **Planificateur** : vérification toutes les heures (modifiable)

## 🚀 Installation

```bash
npm install --legacy-peer-deps
```

## ⚙️ Configuration

Copiez `.env.example` vers `.env` et remplissez :

```env
# Gmail (compte qui envoie les notifications)
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-dapplication

# Destinataire
NOTIFICATION_EMAIL=kiemamahama@gmail.com

# OpenAI (pour les résumés automatiques)
OPENAI_API_KEY=sk-...

# Fréquence (minutes)
SCRAPE_INTERVAL_MINUTES=300
```

> Pour Gmail : créez un [mot de passe d'application](https://myaccount.google.com/apppasswords).

## 🗄️ Base de données

```bash
# Générer le client Prisma
npx prisma generate

# Créer la base et pousser le schéma
npx prisma db push

# (Optionnel) Insérer les sources par défaut
npx tsx prisma/seed.ts
```

## 🖥️ Utilisation

### Dashboard web

```bash
npm run dev
```

Ouvre http://localhost:3000 — interface pour gérer les sources, lancer un scraping manuel et consulter les communiqués.

### Scraping ponctuel

```bash
npm run scrape:once
```

### Planificateur (vérification continue)

```bash
npm run cron:start
```

## 📁 Structure

```
src/
├── ai/summarizer.ts        # Résumé IA via OpenAI
├── app/
│   ├── api/
│   │   ├── communiques/    # API communiqués
│   │   ├── scrape/         # API déclenchement scrape
│   │   └── sources/        # API CRUD sources
│   ├── dashboard-client.tsx # Composant dashboard
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Page dashboard
├── cron/scheduler.ts       # Planificateur horaire
├── email/mailer.ts         # Envoi e-mails HTML
├── lib/
│   ├── env.ts              # Validation variables d'env
│   └── prisma.ts           # Client Prisma singleton
└── scraper/
    ├── orchestrator.ts     # Orchestration scrape + enrich + envoi
    ├── run-once.ts         # Script scraping unique
    ├── scraper.ts          # Scraper HTML avec cheerio
    └── types.ts            # Types partagés
```

## 🔧 Ajouter une source

Via le dashboard (bouton "Ajouter une source") :

| Champ | Description |
|---|---|
| Nom | Nom affiché (ex: "MEBAPLN") |
| URL | URL de la page à scraper |
| Type | WEBSITE, FACEBOOK_PAGE ou RSS |
| Catégorie | bourses, examens, concours, calendrier... |
| Sélecteurs CSS | Pour cibler précisément les communiqués |

Si les sélecteurs ne sont pas fournis, le scraper utilise des heuristiques (balises `<article>`, listes de liens).

## 📧 Format des e-mails

Chaque e-mail contient :

- 📌 Titre du communiqué
- 📝 Résumé généré par IA
- 👥 Personnes concernées (CEP, BEPC, Bac, etc.)
- 📅 Dates importantes
- 📋 Pièces à fournir
- 🔗 Lien vers le communiqué officiel

## 🔮 Évolutions prévues

- Support des flux RSS
- Scraping des pages Facebook
- Plus de sources (bourses, affectations, concours, résultats)
- Assistant personnel burkinabè (marchés publics, assurances, financements...)
