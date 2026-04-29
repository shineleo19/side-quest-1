# ⚑ SideQuest 1: Generative Poster Engine

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

A sleek, terminal-inspired design engine that transforms text prompts and images into high-impact, brutalist-style posters. 

Instead of relying on diffuse raster image models, this application uses **Google's Gemini API** to generate raw, pure SVG code. This ensures crisp typography, perfect geometric layouts, and authentic Swiss/Brutalist design aesthetics that are print-ready.

## ✨ Key Features

* **AI-Powered SVG Generation:** Leverages LLMs to generate structured vector graphics (SVG) rather than pixel-based images, guaranteeing readable, bold typography.
* **CTF / Hacker Aesthetic Interface:** A custom-built UI featuring a dot-grid background, real-time mouse coordinate tracking, pixel-art cursors, and floating glitch elements.
* **Dual-Source Image Pipeline:** Users can upload local images or provide external URLs. The app uses a built-in proxy and Base64 conversion pipeline to bypass strict canvas CORS limitations.
* **High-Resolution Export:** Integrated `html2canvas` pipeline to capture the DOM node at 2x scaling, exporting clean `1000x1500px` PNG files.
* **Power-User Shortcuts:** Global keyboard listeners for rapid prototyping (`C` to copy to clipboard, `D` to download).

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone [https://github.com/shineleo19/side-quest-1.git](https://github.com/shineleo19/side-quest-1.git)
cd side-quest-1
2. Install dependencies
Bash
npm install
# or
yarn install
3. Set up Environment Variables
Create a .env.local file in the root directory and add your Google Gemini API key. We recommend using the gemini-2.5-flash model for optimal SVG code generation and speed.

Code snippet
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
4. Run the development server
Bash
npm run dev
# or
yarn dev
Open http://localhost:3000 with your browser to see the result.

🧠 How the AI Generation Works
This project bypasses traditional text-to-image models. Instead, the Node.js backend sends a highly engineered system prompt to Gemini, instructing it to act as a layout engine. The AI calculates the coordinates and returns raw <svg> markup restricted to basic geometries (<rect>, <path>, <text>) to prevent token-limit exhaustion.

A custom regex parser on the server strips out markdown fences, validates the XML, and passes a Base64 Data URL back to the frontend for rendering.

👤 Author
Shine Leo * GitHub: @shineleo19

📄 License
This project is open-source and available under the MIT License.
