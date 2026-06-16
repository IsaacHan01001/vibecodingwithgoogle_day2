import datetime
import logging
import hashlib
import requests
from flask import Flask, jsonify, render_template
from bs4 import BeautifulSoup

app = Flask(__name__)

# Cache for storing parsed release notes in memory
feed_cache = {
    "last_updated": None,
    "data": None
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_release_notes():
    try:
        logger.info(f"Fetching feed from {FEED_URL}")
        response = requests.get(FEED_URL, timeout=15)
        if response.status_code != 200:
            logger.error(f"Failed to fetch feed: status code {response.status_code}")
            return None
            
        soup = BeautifulSoup(response.content, "xml")
        entries = soup.find_all("entry")
        
        parsed_updates = []
        
        for entry in entries:
            date_str = entry.title.text.strip() if entry.title else "Unknown Date"
            updated_str = entry.updated.text.strip() if entry.updated else ""
            
            link_tag = entry.find("link", rel="alternate")
            entry_link = link_tag["href"] if link_tag else "https://cloud.google.com/bigquery/docs/release-notes"
            
            # Content of the entry is HTML
            content_html = entry.content.text if entry.content else ""
            if not content_html:
                continue
                
            content_soup = BeautifulSoup(content_html, "html.parser")
            
            # Extract individual updates within this entry
            current_cat = None
            current_blocks = []
            
            def commit_update(cat, blocks):
                if not blocks:
                    return
                # Wrap blocks in HTML string
                html_content = "".join(str(b) for b in blocks)
                # Text conversion
                text_content = "".join(b.get_text() for b in blocks).strip()
                
                # Create a unique ID for this specific update
                h = hashlib.md5()
                h.update(f"{date_str}-{cat}-{text_content[:80]}".encode('utf-8'))
                update_id = h.hexdigest()
                
                parsed_updates.append({
                    "id": update_id,
                    "date": date_str,
                    "updated": updated_str,
                    "category": cat or "General",
                    "html": html_content,
                    "text": text_content,
                    "link": entry_link
                })
            
            for child in content_soup.children:
                # child can be NavigableString (no name) or Tag
                if child.name in ["h3", "h4"]:
                    if current_blocks:
                        commit_update(current_cat, current_blocks)
                    current_cat = child.get_text().strip()
                    current_blocks = []
                elif child.name:  # Only append HTML tags
                    current_blocks.append(child)
                elif child.string and child.string.strip():  # Text nodes at root level (if any)
                    current_blocks.append(child)
            
            if current_blocks:
                commit_update(current_cat, current_blocks)
                
        logger.info(f"Successfully parsed {len(parsed_updates)} updates from the feed.")
        return parsed_updates
    except Exception as e:
        logger.exception("Error parsing release notes from feed")
        return None

def get_data(force_refresh=False):
    global feed_cache
    now = datetime.datetime.now()
    
    # Refresh cache if empty or force_refresh is True
    if force_refresh or feed_cache["data"] is None:
        data = parse_release_notes()
        if data is not None:
            feed_cache["data"] = data
            feed_cache["last_updated"] = now.strftime("%b %d, %Y at %I:%M %p")
            
    return feed_cache["data"], feed_cache["last_updated"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/updates")
def get_updates():
    data, last_updated = get_data()
    if data is None:
        return jsonify({"error": "Failed to fetch release notes"}), 500
    return jsonify({
        "updates": data,
        "last_updated": last_updated
    })

@app.route("/api/refresh", methods=["POST"])
def refresh_updates():
    data, last_updated = get_data(force_refresh=True)
    if data is None:
        return jsonify({"error": "Failed to refresh release notes"}), 500
    return jsonify({
        "updates": data,
        "last_updated": last_updated
    })

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
