# Panel de Vida · TAOS

Tu día en una pantalla: agenda, correo, tareas, clima, noticias y lugares frecuentes, con resumen en la mañana y en la noche.

## Instalar

[![Instalar en Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frigodlt-maker%2Ftaos-panel&project-name=panel-de-vida&repository-name=panel-de-vida&env=NEXT_PUBLIC_SUPABASE_URL,SUPABASE_SECRET_KEY,ALLOWED_EMAIL,PANEL_PASSWORD,CRON_SECRET&envDescription=Datos%20de%20tu%20proyecto%20de%20Supabase%2C%20tu%20correo%20y%20un%20texto%20al%20azar%20para%20los%20avisos)

1. Toca el botón y entra con GitHub.
2. Pega las variables (abajo) y toca **Deploy**.
3. Abre tu app, entra con tu contraseña y ve a Más › Ajustes › Configurar base de datos: copia el código y pégalo en Supabase › SQL Editor.
4. Agrega la app a la pantalla de inicio de tu celular y activa las notificaciones.

| Variable | Qué pegar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto de Supabase, solo hasta `.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`) |
| `ALLOWED_EMAIL` | Tu correo: solo ese puede entrar |
| `PANEL_PASSWORD` | La contraseña con la que vas a entrar al panel |
| `CRON_SECRET` | Un texto al azar (por ejemplo de generate-secret.vercel.app/32) |
| `GOOGLE_CLIENT_ID` | (Para agenda, correo y tareas) ID de cliente de tu proyecto de Google Cloud |
| `GOOGLE_CLIENT_SECRET` | (Para agenda, correo y tareas) Secreto del cliente de Google Cloud |

Con esas dos variables, entra a **Más → Conectar con Google** en tu app: la conexión se guarda sola. (Si ya tienes un `GOOGLE_REFRESH_TOKEN`, también funciona y tiene prioridad.)

## Probar en tu computadora

```bash
npm install
npm run dev
npm test
```

Parte de **TAOS**, un sistema de 4 apps personales para organizar tu vida. Herramienta de organización personal: no es asesoría médica, financiera ni legal.
