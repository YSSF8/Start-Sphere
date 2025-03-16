# Start Sphere

A modern web-based start page application with integrated search functionality, favorites management, and AI chat capabilities.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [License](#license)

## Features

- **Smart Search**
  - Multi-engine search support (DuckDuckGo, Google, Bing, Yahoo, Ecosia)
  - Search suggestions as you type
  - Customizable default search engine

- **Favorites Management**
  - Add/remove favorite websites
  - Auto-fetching favicons
  - Context menu actions (open, remove, copy URL)
  - Animated removal transitions

- **AI Chat Integration**
  - Powered by DeepSeek-R1 model
  - Chat history management
  - Code syntax highlighting
  - LaTeX math support
  - Voice input support
  - Export/Import conversation history

## Tech Stack

- **Frontend**
  - HTML/SCSS/JavaScript
  - [highlight.js](https://highlightjs.org/) for code highlighting
  - [marked](https://marked.js.org/) for Markdown rendering

- **Backend**
  - Python/Flask
  - BeautifulSoup4 for favicon scraping
  - Requests for API interactions

## Installation

1. Clone the repository
2. Install Python dependencies:
```sh
pip install -r requirements.txt
```

3. Run the Flask application:
```sh
python3 app.py
```

4. Open `http://localhost:5000` in your browser

## Project Structure

```
.
├── app.py              # Flask backend
├── static/
│   ├── data/          # Static data files
│   ├── images/        # Image assets
│   ├── script/        # JavaScript files
│   └── style/         # CSS/SCSS files
└── templates/         # HTML templates
```

## License

This project is open source and available under the MIT License.