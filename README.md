# EcoQuote Climatización

**EcoQuote** es una aplicación web progresiva (SPA) diseñada para la generación instantánea de presupuestos de climatización (Aire Acondicionado, Calderas, Aerotermia). Permite a usuarios y técnicos configurar equipos, calcular financiación, firmar digitalmente y recibir un PDF oficial por correo electrónico.

El sistema incluye un panel de administración con Inteligencia Artificial integrada para digitalizar catálogos técnicos automáticamente.

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework:** React 18 + Vite
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Internacionalización:** i18next (Español, Catalán, Inglés, Francés)
- **Utilidades UI:** Lucide React (iconos), React Signature Canvas (firma digital)

### Backend & Servicios
- **Base de Datos & Auth:** Supabase (PostgreSQL + Storage)
- **Generación de Documentos:** jsPDF (Generación Client-side)
- **Correos Transaccionales:** EmailJS
- **Inteligencia Artificial:** Google Gemini API (`@google/genai`) para extracción de datos de PDFs.

---

## 📂 Estructura del Proyecto

```
src/
├── components/       # Componentes de UI (Calculadora, Admin, Tarjetas)
│   ├── Admin.tsx         # Panel de gestión
│   ├── Calculator.tsx    # Lógica de presupuestos y firma
│   ├── ProductCard.tsx   # Visualización de catálogo
│   └── ...
├── services/
│   └── api.ts        # Singleton principal. Gestiona Supabase, EmailJS y Gemini.
├── locales/          # Archivos de traducción (JSON)
├── types.ts          # Definiciones de tipos TypeScript (Interfaces globales)
├── i18nUtils.ts      # Helpers para manejo de textos localizados
├── App.tsx           # Controlador principal de vistas y navegación
└── main.tsx          # Punto de entrada
```

---

## 🚀 Requisitos Previos

Para ejecutar este proyecto necesitas:

1.  **Node.js** (v18 o superior) y **npm**.
2.  Una cuenta en **Supabase** (para Base de datos y Storage).
3.  Una cuenta en **EmailJS** (para el envío de correos).
4.  Una API Key de **Google AI Studio** (para Gemini).

---

## ⚙️ Configuración del Entorno

El proyecto requiere variables de entorno para funcionar correctamente y no exponer credenciales.

1.  Copia el archivo de ejemplo:
    ```bash
    cp .env.example .env
    ```
2.  Rellena el archivo `.env` con tus claves reales:

    | Variable | Descripción |
    |Str|---|
    | `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
    | `VITE_SUPABASE_KEY` | Clave pública (Anon Key) de Supabase |
    | `VITE_GEMINI_API_KEY` | API Key de Google Gemini |
    | `VITE_EMAILJS_SERVICE_ID` | ID del servicio en EmailJS |
    | `VITE_EMAILJS_TEMPLATE_ID` | ID de la plantilla en EmailJS |
    | `VITE_EMAILJS_PUBLIC_KEY` | Clave pública de EmailJS |

---

## 💻 Ejecución en Local

1.  Instala las dependencias:
    ```bash
    npm install
    ```

2.  Inicia el servidor de desarrollo:
    ```bash
    npm run dev
    ```

3.  Abre tu navegador en `http://localhost:5173`.

---

## 📦 Build para Producción

Para generar los archivos estáticos optimizados para despliegue (Vercel, Netlify, etc.):

```bash
npm run build
```

Los archivos se generarán en la carpeta `dist/`.

---

## 🔮 Roadmap: Evolución SaaS

Este proyecto se encuentra en una fase de transición para convertirse en una plataforma **SaaS Multi-Tenant (Multi-empresa)**.

Las próximas actualizaciones incluirán:
- Autenticación robusta y gestión de roles.
- Separación de datos por empresa (Tenant Isolation).
- Configuración dinámica de marca y colores por cliente.
- Planes de suscripción y pasarela de pagos.
