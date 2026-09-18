# Royal Home Painting — Full-Stack Marketing Website & Lead Engine

> **Tagline**: *"Simple, Seamless, Satisfaction"*  
> **Founded**: 2018 | Bangalore, Karnataka, India  
> **Services**: House Painting (Interior & Exterior) & Terrace / Roof Waterproofing  
> **Contact**: Phone/WhatsApp: +91 97403 18779 | Email: royalhomepainting11@gmail.com  

---

## 🎨 Overview

A high-converting, production-ready full-stack marketing website and lead capture engine built specifically for **Royal Home Painting** in Bangalore. The platform features a branded aesthetic with Archivo typography, warm off-white tones (`#EFE9E1`), signature orange accents (`#F0620D`), and slate blue trust highlights (`#14495F`).

Every lead submitted through the landing page is validated server-side, saved permanently to an SQLite database, compiled into an official branded `.xlsx` spreadsheet, emailed to `royalhomepainting11@gmail.com` with the `.xlsx` attached, and seamlessly handed off to WhatsApp for rapid customer follow-up.

---

## 🚀 Key Features

1. **Brand Identity & Landing Page**:
   - **Sticky Navigation**: Brand logo, direct call link, section links (*Services, How It Works, Why Us, Gallery, Contact*), and primary "Get a Free Quote" action button.
   - **Hero Section**: High-converting value proposition, 24-hour callback guarantee badge, dual CTAs (*Get Free Quote* and *Message on WhatsApp*), and trust statistics (*Since 2018*, *24 Hr Callback*, *100% Free Inspection*).
   - **Services Breakdown**: Dedicated cards for **House Painting** and **Terrace Waterproofing** detailing scope of work, branded materials used (Asian Paints, Berger, Dr. Fixit), warranties, and direct booking buttons.
   - **4-Step Process**: Clear workflow from problem statement to free inspection, written quote, and spotless execution.
   - **Why Us (6-Tile Grid)**: Trust pillars highlighting experience since 2018, root-cause diagnosis, written quotes, clean job sites, branded materials, and 24-hour response.
   - **Before / After Project Gallery**: Authentic split photography showcasing interior living rooms, rooftop waterproofing, exterior facades, and wall seepage remediation.
   - **Lead Capture & Contact**: Interactive form with real-time feedback, Bangalore area coverage, working hours, and phone/WhatsApp links.
   - **Dual-Confirmation Flow**: Modal confirmation plus immediate WhatsApp pre-filled chat link for instant customer-contractor engagement.
   - **Floating Quick Contact**: 1-tap WhatsApp button accessible on mobile and desktop.

2. **Backend Engine**:
   - **Persistent Database**: SQLite (`data/leads.db`) ensures zero lead loss even during network or SMTP outages.
   - **Google Sheets Real-Time Sync**: Automatically appends each lead as a formatted row to your Google Sheet on `royalhomepainting11@gmail.com`.
   - **Automated Excel (.xlsx) Generation**: `exceljs` creates a styled, branded spreadsheet with customer contact details and job requirements.
   - **Email Notification**: `nodemailer` delivers an HTML summary and the `.xlsx` attachment to `royalhomepainting11@gmail.com`.
   - **Spam Defense**: Honeypot anti-spam trap (`website_url_hp`) and IP rate limiting via `express-rate-limit`.
   - **Operational Endpoints**: `/api/health` for monitoring and `/api/leads` for reviewing captured inquiries.

---

## 📁 Project Structure

```
royal-home-painting/
├── package.json               # Project dependencies and run scripts
├── server.js                  # Express application, routes, rate limiter & static server
├── .env.example               # Configuration template
├── .env                       # Environment variables
├── google-apps-script.js      # Copy-paste Google Apps Script for royalhomepainting11@gmail.com
├── test-lead.js               # Backend service verification test script
├── test-sheet.js              # Google Sheets webhook verification script
├── test-api.js                # API endpoint HTTP test script
├── test-assets.js             # Asset & route HTTP verification script
├── db/
│   └── database.js            # SQLite database manager & queries
├── services/
│   ├── excelService.js        # Branded .xlsx generator
│   ├── emailService.js        # Nodemailer dispatcher with attachment
│   └── googleSheetService.js  # Google Sheets real-time webhook sync service
├── data/
│   └── leads.db               # SQLite database file
├── exports/                   # Stored lead Excel spreadsheets (.xlsx)
└── public/
    ├── index.html             # Semantic landing page
    ├── css/
    │   └── style.css          # Custom styling & responsive layouts
    ├── js/
    │   ├── main.js            # Header, scroll reveals & smooth scrolling
    │   └── lead-form.js       # Form validation, AJAX submit & modal logic
    └── assets/
        ├── logo.svg           # Scalable vector wordmark logo
        ├── logo.png           # Logo placeholder / PNG asset
        └── gallery/           # Before & After project photos
            ├── interior-painting.jpg
            ├── terrace-waterproofing.jpg
            ├── exterior-facade.jpg
            └── dampness-repair.jpg
```

---

## ⚡ Getting Started

### 1. Installation

Ensure Node.js (v18+) is installed. Run:

```bash
npm install
```

### 2. Configure Environment Variables

Open `.env` and configure your credentials:

```env
PORT=3000
NODE_ENV=development

# Gmail SMTP Configuration
# Generate an App Password at: https://myaccount.google.com/apppasswords
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=royalhomepainting11@gmail.com
SMTP_PASS=your_16_digit_gmail_app_password

# Recipient Email for Lead Alerts
NOTIFICATION_EMAIL=royalhomepainting11@gmail.com

# Google Sheets Real-Time Sync (for royalhomepainting11@gmail.com)
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/your_deployment_id/exec
```

> **Quick Google Sheets Connection (1 Minute)**:
> 1. Log in with `royalhomepainting11@gmail.com` and open a new sheet at [sheets.new](https://sheets.new).
> 2. Click **Extensions > Apps Script**, paste the code from [google-apps-script.js](file:///c:/Users/abrar/Downloads/royal%20home%20painting/google-apps-script.js), and click **Deploy > New deployment > Web app** (Execute as: Me, Access: Anyone).
> 3. Paste the generated Web App URL into `GOOGLE_SHEET_WEBHOOK_URL` in `.env`.
> 4. All leads will automatically populate your Google Sheet in real-time!

> **Note on Gmail App Passwords**:
> Google requires a 16-character **App Password** (not your regular Gmail password) when using SMTP. You can create one in 60 seconds at [Google Account App Passwords](https://myaccount.google.com/apppasswords).
> If `SMTP_PASS` is left unconfigured, the application runs in simulation mode: leads are safely stored in SQLite, `.xlsx` files are generated on disk, and email previews are printed to the console.

### 3. Start the Server

```bash
npm start
```

Visit **`http://localhost:3000`** in your browser.

---

## 🧪 Testing

Run the automated test suites anytime:

```bash
# 1. Test database persistence, Excel generation, and email service
npm run test:lead

# 2. Test HTTP API routes and honeypot validation
node test-api.js

# 3. Test that all frontend assets, scripts, and images return HTTP 200 OK
node test-assets.js
```

---

## 🌐 Deployment Options

- **Render / Railway / Fly.io**: Connect your Git repository, set the build command to `npm install` and start command to `npm start`, and configure environment variables.
- **VPS / Ubuntu / EC2**: Run with `pm2 start server.js --name "royal-home-painting"`.
