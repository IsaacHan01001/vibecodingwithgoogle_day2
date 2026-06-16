# BigQuery Release Insights 🚀

A premium web dashboard to track, search, filter, and share Google Cloud BigQuery release notes in real-time. Built with a Flask backend and a modern, high-fidelity responsive frontend.

![BigQuery Release Insights Dashboard](https://github.com/IsaacHan01001/vibecodingwithgoogle_day2/raw/main/static/logo.png) *(or dynamic mockup placeholder)*

---

## Key Features

- **Real-Time Feed Integration**: Pulls directly from the official Google Cloud BigQuery Atom/XML release notes feed.
- **Smart Server-Side Caching**: Uses an in-memory cache to ensure ultra-fast load times while avoiding redundant upstream requests, featuring manual refresh capabilities.
- **Dynamic Classification**: Auto-groups release items into semantic categories like **Features**, **Issues**, **Changes**, and **Fixes**.
- **Interactive UI**:
  - **Statistical Overview**: Highlights metrics on total updates, features, and fixes.
  - **Full-Text Search**: Instant search by keywords, contents, or dates.
  - **Multi-Category Filters**: Smoothly filter the timeline using interactive pills.
  - **Chronological Sorting**: Sort updates by newest or oldest first.
- **One-Click Share to X (Twitter)**: Pick any release update and automatically draft a beautifully formatted post to share with your audience.
- **Premium Dark-Mode Aesthetic**: Styled using Outfit and Inter typography, glassmorphic elements, vibrant custom gradients, and subtle micro-animations.

---

## Tech Stack

- **Backend**: Python 3, Flask, BeautifulSoup4, LXML, Requests
- **Frontend**: Vanilla HTML5, CSS3 (Custom Variables, Gradients, Flexbox/Grid), Modern ES6 JavaScript
- **API**: Custom local JSON endpoints (`/api/updates` and `/api/refresh`)

---

## File Structure

```text
├── app.py                  # Flask application server, cache manager, and XML parser
├── templates/
│   └── index.html          # Semantic HTML dashboard template
├── static/
│   ├── css/
│   │   └── style.css       # Premium responsive design stylesheet
│   └── js/
│       └── app.js          # Client-side reactivity, search/filters, and X sharing
├── requirements.txt        # Python package dependencies
└── README.md               # Project documentation
```

---

## Getting Started

### Prerequisites

Ensure you have Python 3.8+ installed on your system.

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/IsaacHan01001/vibecodingwithgoogle_day2.git
   cd vibecodingwithgoogle_day2
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

Start the Flask development server:
```bash
python app.py
```

Once running, navigate to `http://127.0.0.1:5000` in your web browser.

---

## License

This project is open-source and available under the MIT License.
