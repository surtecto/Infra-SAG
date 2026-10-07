// Conexión con la base de datos compartida (Supabase).
// Mientras estos dos valores estén vacíos, la app funciona en modo demostración:
// los datos quedan solo en este equipo y el perfil se elige a mano.
// Los valores salen de Supabase > Project Settings > API (ver LEEME.md).
export const SUPABASE_URL = 'https://evbqzkoxojtocrqizrtb.supabase.co/rest/v1/';
export const SUPABASE_ANON_KEY = 'sb_publishable_60BozW_3TZbYqYmDzPla8g_MyeKaTQA';

export const APP = {
  nombre: 'Infra MUNISAG',
  municipio: 'San Andrés de Giles',
  version: '1.0.0',
  centro: [-34.4468, -59.4418],
  zoom: 14,
};
