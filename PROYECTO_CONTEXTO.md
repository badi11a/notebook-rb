# CONTINUIDAD_SESION.md — Balance Master App
Fecha: 16 mayo 2026 | Para retomar en nueva conversación

---

## Estado al cerrar esta sesión

### ✅ Completado hoy
- package.json corregido (JSON válido, dependencias alineadas al spec)
- .gitignore creado (protege .env.local)
- @supabase/ssr + @supabase/supabase-js instalados
- src/lib/supabase.ts — cliente browser con getSupabaseClient()
- src/lib/auth.ts — helper getSession()
- src/middleware.ts — protege todas las rutas, redirige a /login sin sesión
- src/app/login/page.tsx — login funcional con email/password
- src/app/error.tsx + src/app/not-found.tsx creados
- src/lib/queries.ts — 7 funciones (getActivosActivos, getUltimoSnapshot, getHistorial12M, etc.)
- src/types/index.ts — interfaces TypeScript (Activo, Snapshot, SnapshotConActivo, TipoCambio, HistorialFecha)
- Dashboard.tsx, Inversiones.tsx, Historial.tsx, Captura.tsx — conectados a Supabase (sin hardcoded)
- Schema Supabase ejecutado: tablas activos, snapshots, tipos_cambio con RLS
- 20 activos reales insertados en Supabase con usuario_id correcto
- Login funcionando, middleware protegiendo la app
- Captura guarda snapshots reales en Supabase ✅
- Dashboard muestra datos reales ✅

### ⚠️ Pendiente — próxima sesión

1. **PRIORITARIO: Importar CSV histórico a Supabase**
   - Archivo: `Balance_Master_2026 - Historico.csv` en la raíz del proyecto
   - Nunca se importó — solo hay 1 snapshot de prueba
   - Próximo paso: Claude Code lee el CSV, mapea columnas al schema, genera script de importación
   - Prompt a usar: "Lee Balance_Master_2026 - Historico.csv, muestra primeras 5 filas y nombres de columnas exactos, NO importes nada aún"

2. **Fix menor: Gráfico con valores extraños**
   - El eje Y muestra `$0.001M` con datos de prueba pequeños
   - Se corrige con datos reales o ajustando el formateador fmtM() en Dashboard.tsx

3. **Fix menor: Tipos de cambio muestra `—` en Dashboard**
   - Captura.tsx debe guardar tipos_cambio antes de snapshots
   - Verificar que insertTipoCambio() se llama correctamente al guardar

4. **Actualizar PROYECTO_CONTEXTO.md** con los cambios de arquitectura de esta sesión

---

## Configuración actual del proyecto

### Supabase
- Proyecto: **notebook-rb**
- Region: South America (São Paulo)
- API Keys: usando **Publishable key** (`sb_publishable_...`) — NO la legacy anon key
- IMPORTANTE: Las nuevas publishable keys requieren GRANT explícito en PostgreSQL
- GRANTs aplicados: `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activos, snapshots, tipos_cambio TO anon, authenticated`
- RLS: habilitado en las 3 tablas
- Auth: 1 usuario creado (badilla@gmail.com), confirmado

### Variables de entorno (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   ← publishable key, NO la legacy eyJ...
```

### Stack instalado
- next@14.2.29
- react@18.3.1 + react-dom@18.3.1
- @supabase/supabase-js@2.49.4
- @supabase/ssr@0.6.1
- @tabler/icons-react@3.31.0
- chart.js + react-chartjs-2
- tailwindcss@4.3.0
- typescript (devDependencies)

---

## Lección crítica aprendida esta sesión

**Supabase nuevo modelo de API keys (2026):**
- Las nuevas publishable keys (`sb_publishable_...`) NO otorgan GRANT automáticamente
- Toda tabla nueva requiere: `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.[tabla] TO anon, authenticated`
- Sin este GRANT, PostgREST retorna 403 aunque RLS esté deshabilitado y el JWT sea válido
- El error se manifiesta como `permission denied (42501)` — NO es un problema de RLS ni de JWT

**Middleware Next.js con src/:**
- Con estructura `src/`, el middleware DEBE estar en `src/middleware.ts`
- En la raíz del proyecto Next.js NO lo detecta cuando se usa el directorio `src/`

---

## Archivos clave del proyecto
```
mi-patrimonio/
├── .env.local                          ← keys de Supabase (nunca al repo)
├── .gitignore                          ← protege .env.local
├── Balance_Master_2026 - Historico.csv ← pendiente de importar
├── Balance_Master_2026 - Catalogo_Activos.csv
├── mi_patrimonio.html                  ← diseño UI de referencia
├── PROYECTO_CONTEXTO.md
├── supabase/migrations/20260516_init_schema.sql
└── src/
    ├── middleware.ts                   ← auth guard
    ├── lib/
    │   ├── supabase.ts                 ← getSupabaseClient()
    │   ├── auth.ts                     ← getSession()
    │   └── queries.ts                  ← 7 funciones de acceso a datos
    ├── types/index.ts                  ← interfaces TypeScript
    └── app/
        ├── login/page.tsx
        ├── error.tsx
        ├── not-found.tsx
        ├── layout.tsx
        ├── page.tsx
        └── components/
            ├── Dashboard.tsx           ← conectado a Supabase ✅
            ├── Inversiones.tsx         ← conectado a Supabase ✅
            ├── Captura.tsx             ← conectado a Supabase ✅
            └── Historial.tsx           ← conectado a Supabase ✅
```

---

## Prompt de arranque para nueva conversación

Pegar esto al inicio de la nueva sesión junto con PROYECTO_CONTEXTO.md y este archivo:

> "Retomamos el proyecto Balance Master App. Lee PROYECTO_CONTEXTO.md y CONTINUIDAD_SESION.md para tener el contexto completo. El próximo paso es importar el CSV histórico a Supabase. Claude Code está en la carpeta del proyecto."
