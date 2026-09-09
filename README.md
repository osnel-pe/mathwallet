# MathWallet

PWA escolar independiente conectada al mismo proyecto Supabase de SendaPrime.

## Preparación

1. Abre esta carpeta en Visual Studio Code.
2. En la terminal ejecuta `npm install`.
3. Duplica `.env.example` con el nombre `.env`.
4. Coloca la URL y la clave pública `anon` de Supabase.
5. Ejecuta `supabase/mathwallet.sql` en el SQL Editor de Supabase.
6. Inicia con `npm run dev`.

## Accesos iniciales

Los códigos se cambian en `.env`:

- Maestro: `VITE_CODIGO_MAESTRO`
- Alumno: `VITE_CODIGO_ALUMNO`

El código del maestro conduce al inicio de sesión real de Supabase. El QR contiene únicamente el ID numérico del alumno.

## Producción

Ejecuta `npm run build`. La carpeta `dist` contiene la PWA lista para desplegar.
