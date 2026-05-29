# PoliJardín — Monitoreo Inteligente de Jardines Polinizadores

Aplicación web para monitorear temperatura, humedad y luz solar de jardines polinizadores.

## Estructura del proyecto

```
/
├── frontend/   → React + Vite + TypeScript  (Vercel)
└── backend/    → json-server + Express       (Render)
```

---

## Despliegue

### 1. Backend en Render

1. Ve a [render.com](https://render.com) y crea un **New Web Service**.
2. Conecta tu repositorio de GitHub.
3. Configura el servicio:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Copia la URL que te da Render (ej. `https://polijardin-backend.onrender.com`).

> **Nota:** En el plan gratuito de Render, el servicio "duerme" tras 15 minutos de inactividad y los datos se pierden al reiniciarse. Es el comportamiento esperado.

---

### 2. Frontend en Vercel

1. Ve a [vercel.com](https://vercel.com) y crea un **New Project**.
2. Importa tu repositorio de GitHub.
3. Configura el proyecto:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. En **Environment Variables**, añade:
   - `VITE_API_URL` = `https://polijardin-backend.onrender.com` (la URL de tu backend en Render)
5. Haz deploy.

---

## Desarrollo local

### Backend
```bash
cd backend
npm install
npm start
# Corre en http://localhost:3002
```

### Frontend
```bash
cd frontend
npm install
# Crea tu .env local (opcional)
cp .env.example .env
# El proxy de Vite apunta a localhost:3002 automáticamente
npm run dev
# Corre en http://localhost:3000
```

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL del backend en Render | `https://polijardin-backend.onrender.com` |

En desarrollo local **no necesitas** definir esta variable — el proxy de Vite la maneja.

---

## Tecnologías

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide
- **Backend:** json-server, Express, Node.js (ESM)
- **Deploy:** Vercel (frontend) + Render (backend)
