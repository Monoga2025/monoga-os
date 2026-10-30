/* Sample project registry (sanitized for the public repo). */
window.MONOGA_OS_DATA = {
  "meta": {
    "name": "Monoga OS",
    "owner": "Monoga",
    "generatedAt": "2026-10",
    "source": "Sanitized sample registry",
    "disclaimer": "Sample data for the public repo."
  },
  "categories": [
    {
      "key": "apps_web",
      "label": "Apps Web",
      "color": "blue",
      "icon": "window"
    },
    {
      "key": "bots",
      "label": "Bots",
      "color": "violet",
      "icon": "bot"
    },
    {
      "key": "dashboards",
      "label": "Dashboards",
      "color": "green",
      "icon": "chart"
    },
    {
      "key": "landing_pages",
      "label": "Landing Pages",
      "color": "amber",
      "icon": "globe"
    },
    {
      "key": "automatizaciones",
      "label": "Automatizaciones",
      "color": "rose",
      "icon": "bolt"
    },
    {
      "key": "agentes_ia",
      "label": "Agentes IA",
      "color": "teal",
      "icon": "chip"
    },
    {
      "key": "ia_tools",
      "label": "IA Tools",
      "color": "indigo",
      "icon": "wand"
    },
    {
      "key": "youtube_personal",
      "label": "YouTube Marca Personal",
      "color": "red",
      "icon": "play"
    },
    {
      "key": "ventas",
      "label": "Ventas",
      "color": "orange",
      "icon": "tag"
    },
    {
      "key": "finanzas",
      "label": "Finanzas",
      "color": "slate",
      "icon": "wallet"
    },
    {
      "key": "personal",
      "label": "Personal",
      "color": "cyan",
      "icon": "user"
    }
  ],
  "statuses": {
    "activo": {
      "label": "Activo",
      "color": "green"
    },
    "sin_verificar": {
      "label": "Sin verificar",
      "color": "amber"
    },
    "en_pausa": {
      "label": "En pausa",
      "color": "slate"
    },
    "archivado": {
      "label": "Archivado",
      "color": "slate"
    },
    "candidato_a_borrar": {
      "label": "Candidato a borrar",
      "color": "red"
    },
    "borrador": {
      "label": "Borrador",
      "color": "slate"
    }
  },
  "projects": [
    {
      "id": "jarvis",
      "name": "Jarvis Engine",
      "path": "projects/jarvis",
      "kind": "project",
      "categories": [
        "bots",
        "agentes_ia",
        "automatizaciones"
      ],
      "status": "sin_verificar",
      "stack": [
        "Node.js",
        "TypeScript",
        "SQLite",
        "TypeBox"
      ],
      "hasGit": true
    },
    {
      "id": "unab_os",
      "name": "UNAB OS (aplicacion)",
      "path": "projects/unab_os",
      "kind": "project",
      "categories": [
        "apps_web",
        "dashboards"
      ],
      "status": "sin_verificar",
      "stack": [
        "Next.js 16",
        "Supabase"
      ],
      "hasGit": false,
      "run": {
        "label": "Correr UNAB OS",
        "cwd": "trabajo/monoga/proyectos/unab-os/UNAB_OS_Plataforma",
        "command": "node",
        "args": [
          "node_modules/next/dist/bin/next",
          "dev",
          "-p",
          "4310"
        ],
        "url": "http://127.0.0.1:4310"
      }
    },
    {
      "id": "mejorar_voz",
      "name": "Mejorar Voz Monoga",
      "path": "projects/mejorar_voz",
      "kind": "project",
      "categories": [
        "ia_tools"
      ],
      "status": "sin_verificar",
      "stack": [
        "Electron",
        "JavaScript"
      ],
      "hasGit": false
    },
    {
      "id": "sales_engine",
      "name": "Sales Engine",
      "path": "projects/sales_engine",
      "kind": "project",
      "categories": [
        "ventas",
        "automatizaciones"
      ],
      "status": "en_pausa",
      "stack": [],
      "hasGit": false,
      "children": [
        {
          "name": "01_EMBUDO_VENTAS",
          "kind": "docs",
          "hasGit": false
        },
        {
          "name": "02_COPYS_CONSULTIVOS_MARKETINGSKILLS",
          "kind": "docs",
          "hasGit": false
        },
        {
          "name": "03_CRM_Y_OPERACIONES",
          "kind": "docs",
          "hasGit": false
        }
      ]
    },
    {
      "id": "monoga_erp",
      "name": "Monoga ERP",
      "path": "projects/monoga_erp",
      "kind": "project",
      "categories": [
        "apps_web",
        "dashboards"
      ],
      "status": "sin_verificar",
      "stack": [
        "Vite",
        "TypeScript"
      ],
      "hasGit": true
    }
  ],
  "clients": [],
  "tasks": [],
  "notes": [],
  "findings": []
};
