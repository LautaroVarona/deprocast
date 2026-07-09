export async function register() {
  // No cargar runtime setup acá: instrumentation también se analiza
  // en contextos donde Node built-ins no están disponibles (webpack).
  // El bootstrap de runtime se sigue haciendo dentro de los route handlers.
  return;
}
