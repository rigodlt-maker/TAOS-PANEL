# Optimizador de Vida · TAOS

Tu día en una pantalla: agenda, correo, tareas, clima, noticias y lugares frecuentes, con resumen en la mañana y en la noche.

> **© TAOS Soluciones · Todos los derechos reservados.** Este repositorio es visible, pero no es de uso libre: solo puedes instalarlo para tu uso personal con tu código de compra de *“Organiza tu vida con TAOS”*. Prohibido copiarlo, publicarlo o revenderlo. Lee el archivo [LICENSE](LICENSE).

## Instalar

[![Instalar en Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frigodlt-maker%2FTAOS-PANEL&project-name=optimizador-de-vida&repository-name=optimizador-de-vida&env=CODIGO_COMPRA,NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SECRET_KEY,ALLOWED_EMAIL,PANEL_PASSWORD,CRON_SECRET&envDescription=Tu%20c%C3%B3digo%20de%20compra%20de%20Hotmart%20%28HP...%29%2C%20datos%20de%20tu%20proyecto%20de%20Supabase%2C%20tu%20correo%20y%20un%20texto%20al%20azar%20para%20los%20avisos)

1. Toca el botón y entra con GitHub.
2. Pega las variables (abajo) y toca **Deploy**.
3. Abre tu app, entra con tu contraseña y ve a Más › Ajustes › Configurar base de datos: copia el código y pégalo en Supabase › SQL Editor.
4. Agrega la app a la pantalla de inicio de tu celular y activa las notificaciones.

| Variable | Qué pegar |
| --- | --- |
| `CODIGO_COMPRA` | Tu código de compra de Hotmart (empieza con `HP`; viene en el correo de tu compra) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto de Supabase, solo hasta `.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) |
| `ALLOWED_EMAIL` | Tu correo: solo ese puede entrar |
| `PANEL_PASSWORD` | La contraseña con la que vas a entrar al panel |
| `CRON_SECRET` | Un texto al azar (por ejemplo de generate-secret.vercel.app/32) |
| `GOOGLE_CLIENT_ID` | (Para agenda, correo y tareas) ID de cliente de tu proyecto de Google Cloud |
| `GOOGLE_CLIENT_SECRET` | (Para agenda, correo y tareas) Secreto del cliente de Google Cloud |

Con esas dos variables, entra a **Más → Conectar con Google** en tu app: la conexión se guarda sola. (Si ya tienes un `GOOGLE_REFRESH_TOKEN`, también funciona y tiene prioridad.)

## Actualizaciones (automáticas)

Tu app se pone al día **sola cada noche**: el botón **Actualizar TAOS** (pestaña *Actions* de este repositorio) trae la versión nueva y Vercel la publica. Si quieres tenerla al momento: *Actions › Actualizar TAOS › Run workflow*.

- **Tus datos no se tocan**: viven en tu Supabase, no en este repositorio. Las actualizaciones solo agregan funciones.
- Si una versión nueva necesita un lugar nuevo en tu base de datos, la app te muestra un aviso con un código para copiar y pegar (1 minuto). Solo agrega lo nuevo.
- Al abrir la app después de una actualización verás **Novedades** con lo que cambió.
- No edites `.github/workflows/actualizar.yml` ni los archivos de la app: si cambias el código, las actualizaciones lo reemplazan.

## Probar en tu computadora

```bash
npm install
npm run dev
npm test
```

Parte de **TAOS**, un sistema de 4 apps personales para organizar tu vida. Herramienta de organización personal: no es asesoría médica, financiera ni legal.

## Soporte y modificaciones

- El soporte de TAOS cubre **la versión original** de esta app, instalada siguiendo la guía.
- Si cambias el código (tú, otra persona o una IA), la app lo detecta al publicarse y muestra el aviso **“versión modificada”**. Puede dejar de funcionar como se diseñó y ya no tiene soporte.
- Para instalar o arreglar un error de configuración **no necesitas cambiar código**: casi siempre es una variable en Vercel o el SQL de Supabase.
- Tus datos viven en tus propias cuentas (Supabase, Vercel y Google). Nadie más puede verlos.
