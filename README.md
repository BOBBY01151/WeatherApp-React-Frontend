# 🌤️ WeatherApp - React Frontend

[![React](https://img.shields.io/badge/React-19.2.4-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0.0-646CFF.svg)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A sleek, responsive, and high-performance weather visualization dashboard built with React 19 and Vite. This frontend provides a premium user experience with real-time weather data visualization and dynamic UI elements.

---

## 🌟 Features

- **Dynamic Weather Dashboard:** Real-time visualization of weather metrics.
- **Modern UI/UX:** Clean, premium design with focus on usability.
- **Optimized Performance:** Built with Vite for ultra-fast HMR and building.
- **Responsive Design:** Fully adaptive layout for mobile, tablet, and desktop.
- **API Integration:** Seamless connectivity with the Spring Boot microservice.

---

## 🚀 Tech Stack

- **Core:** React 19 (Latest)
- **Tooling:** Vite 8.0
- **Styling:** Modern Vanilla CSS
- **Deployment Ready:** Scalable architecture for modern cloud providers.

---

## 🛠 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd WeatherApp-React--Frontend-
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file based on `.env.example` (usually you can leave `VITE_API_BASE_URL` empty and use the dev proxy):
   ```env
   VITE_API_BASE_URL=http://localhost:8084
   VITE_API_PROXY_TARGET=http://localhost:8084
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

---

## 🧩 Component Architecture

- `src/components/` - Reusable UI components.
- `src/services/` - API client and data fetching logic.
- `src/App.jsx` - Main application entry point.

---

## 🔭 Future Roadmap

### 📊 Predictive Visualization
- Implementation of dynamic charts for AI-powered weather predictions.
- Advanced mapping and radar visualizations.

### 🧪 Testing & DevOps
- **Microservice Testing:** Integration of Cypress or Playwright for End-to-End (E2E) testing.
- **Dockerization:** Future support for containerized frontend deployments.
- **CI/CD:** Automated builds and deployment pipelines for static hosting (Vercel/Netlify).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Designed with ❤️ by [Vimukthi Buddika](https://github.com/BOBBY01151).
