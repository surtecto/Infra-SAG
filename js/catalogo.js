// Catálogo de redes, tipos de elemento y campos.
// Para agregar un campo o un tipo nuevo alcanza con editar este archivo: los formularios,
// las fichas, la leyenda y los indicadores se generan a partir de lo que está acá.
//
// Campo: { k: clave, n: etiqueta, t: 'num' | 'texto' | 'lista' | 'fecha' | 'largo', op: [opciones], u: unidad }
// Tipo:  { nombre, plural, geom: 'linea' | 'punto', campos, clave: [campos que definen "datos completos"],
//          colorPor: { campo, valores: { valor: color } } }

const ESTADO = { k: 'estado', n: 'Estado', t: 'lista', op: ['Bueno', 'Regular', 'Malo', 'Fuera de servicio'] };
const OBS = { k: 'observaciones', n: 'Observaciones', t: 'largo' };
const ANIO = { k: 'anio', n: 'Año de obra', t: 'num' };
const FECHA_REL = { k: 'fecha_relevamiento', n: 'Fecha de relevamiento', t: 'fecha' };
const SIN_DATO = '#8A949E';

export const REDES = {
  agua: {
    nombre: 'Agua corriente', corto: 'Agua', color: '#1463B8',
    tipos: {
      tramo: {
        nombre: 'Cañería', plural: 'Cañerías', geom: 'linea', clave: ['diametro_mm', 'material', 'profundidad_m'],
        colorPor: { campo: 'material', valores: { 'PVC': '#1463B8', 'Asbesto cemento': '#7A3FA8', 'PEAD': '#0B8F8A', 'Hierro fundido': '#3B4A57', 'Acero': '#C24A7A' } },
        campos: [
          { k: 'calle', n: 'Calle', t: 'texto' },
          { k: 'funcion', n: 'Función', t: 'lista', op: ['Distribución', 'Maestra', 'Impulsión', 'Acueducto'] },
          { k: 'diametro_mm', n: 'Diámetro', t: 'num', u: 'mm' },
          { k: 'material', n: 'Material', t: 'lista', op: ['PVC', 'Asbesto cemento', 'PEAD', 'Hierro fundido', 'Acero', 'Otro'] },
          { k: 'clase_presion', n: 'Clase de presión', t: 'texto' },
          { k: 'profundidad_m', n: 'Tapada', t: 'num', u: 'm' },
          { k: 'ubicacion', n: 'Ubicación en la calle', t: 'lista', op: ['Vereda par', 'Vereda impar', 'Calzada', 'Banquina'] },
          { k: 'longitud_m', n: 'Longitud declarada', t: 'num', u: 'm' },
          ANIO, { k: 'mes', n: 'Mes de obra', t: 'texto' }, ESTADO, FECHA_REL, OBS,
        ],
      },
      valvula: {
        nombre: 'Válvula', plural: 'Válvulas', geom: 'punto', color: '#D1342F', clave: ['tipo', 'diametro_mm', 'posicion'],
        campos: [
          { k: 'codigo', n: 'Código', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Esclusa', 'Mariposa', 'De aire', 'Retención', 'Reguladora de presión', 'Otro'] },
          { k: 'diametro_mm', n: 'Diámetro', t: 'num', u: 'mm' },
          { k: 'posicion', n: 'Posición habitual', t: 'lista', op: ['Abierta', 'Cerrada', 'Parcial'] },
          { k: 'operable', n: '¿Se puede maniobrar?', t: 'lista', op: ['Sí', 'Con dificultad', 'No, trabada', 'No se encontró'] },
          { k: 'vueltas', n: 'Vueltas de cierre', t: 'num' },
          { k: 'profundidad_m', n: 'Profundidad', t: 'num', u: 'm' },
          { k: 'camara', n: 'Cámara o caja', t: 'lista', op: ['Caja brasero', 'Cámara de mampostería', 'Cámara de hormigón', 'Sin protección', 'Tapada por pavimento'] },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      hidrante: {
        nombre: 'Hidrante', plural: 'Hidrantes', geom: 'punto', color: '#E8791A', clave: ['tipo', 'estado'],
        campos: [
          { k: 'codigo', n: 'Código', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['De columna', 'A bola (bajo nivel)', 'Toma para motobomba'] },
          { k: 'diametro_mm', n: 'Diámetro de la derivación', t: 'num', u: 'mm' },
          { k: 'presion_bar', n: 'Presión medida', t: 'num', u: 'bar' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
      pozo: {
        nombre: 'Pozo de bombeo', plural: 'Pozos de bombeo', geom: 'punto', color: '#0A2F5C', clave: ['profundidad_m', 'caudal_m3h', 'potencia_hp'],
        campos: [
          { k: 'numero', n: 'Número de pozo', t: 'num' },
          { k: 'estado', n: 'Estado', t: 'lista', op: ['En servicio', 'En reserva', 'Fuera de servicio', 'Cegado'] },
          { k: 'profundidad_m', n: 'Profundidad', t: 'num', u: 'm' },
          { k: 'diametro_encamisado_mm', n: 'Diámetro del encamisado', t: 'num', u: 'mm' },
          { k: 'nivel_estatico_m', n: 'Nivel estático', t: 'num', u: 'm' },
          { k: 'nivel_dinamico_m', n: 'Nivel dinámico', t: 'num', u: 'm' },
          { k: 'caudal_m3h', n: 'Caudal', t: 'num', u: 'm³/h' },
          { k: 'bomba', n: 'Bomba (marca y modelo)', t: 'texto' },
          { k: 'potencia_hp', n: 'Potencia', t: 'num', u: 'HP' },
          { k: 'cloracion', n: 'Cloración', t: 'lista', op: ['Sí, dosificador en el pozo', 'Sí, en otro punto', 'No'] },
          { k: 'tablero', n: 'Tablero y protecciones', t: 'texto' },
          { k: 'acuifero', n: 'Acuífero', t: 'texto' },
          ANIO, FECHA_REL, OBS,
        ],
      },
      tanque: {
        nombre: 'Tanque o cisterna', plural: 'Tanques y cisternas', geom: 'punto', color: '#0B8F8A', clave: ['capacidad_m3', 'altura_m'],
        campos: [
          { k: 'nombre', n: 'Nombre', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Tanque elevado', 'Cisterna enterrada', 'Cisterna a nivel'] },
          { k: 'capacidad_m3', n: 'Capacidad', t: 'num', u: 'm³' },
          { k: 'altura_m', n: 'Altura de fondo', t: 'num', u: 'm' },
          { k: 'material', n: 'Material', t: 'lista', op: ['Hormigón armado', 'Metálico', 'PRFV', 'Mampostería'] },
          { k: 'ultima_limpieza', n: 'Última limpieza y desinfección', t: 'fecha' },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      conexion: {
        nombre: 'Conexión domiciliaria', plural: 'Conexiones domiciliarias', geom: 'punto', color: '#5B9BD9', clave: ['partida', 'diametro_mm'],
        campos: [
          { k: 'partida', n: 'Partida municipal', t: 'texto' },
          { k: 'domicilio', n: 'Domicilio', t: 'texto' },
          { k: 'diametro_mm', n: 'Diámetro', t: 'num', u: 'mm' },
          { k: 'material', n: 'Material', t: 'lista', op: ['PEAD', 'PVC', 'Plomo', 'Hierro galvanizado', 'Otro'] },
          { k: 'medidor', n: 'Medidor', t: 'lista', op: ['Sí', 'No'] },
          { k: 'llave_maestra', n: 'Llave maestra', t: 'lista', op: ['Sí', 'No', 'No se encontró'] },
          { k: 'uso', n: 'Uso', t: 'lista', op: ['Residencial', 'Comercial', 'Industrial', 'Público'] },
          ESTADO, FECHA_REL, OBS,
        ],
      },
    },
    fallas: ['Pérdida en calzada', 'Pérdida en vereda', 'Rotura de cañería', 'Falta de agua', 'Baja presión', 'Agua turbia o con olor', 'Válvula que no cierra', 'Bomba fuera de servicio'],
  },

  cloaca: {
    nombre: 'Red cloacal', corto: 'Cloaca', color: '#8A5A1E',
    tipos: {
      tramo: {
        nombre: 'Colector', plural: 'Colectores', geom: 'linea', color: '#8A5A1E', clave: ['diametro_mm', 'material', 'pendiente'],
        campos: [
          { k: 'calle', n: 'Calle', t: 'texto' },
          { k: 'funcion', n: 'Función', t: 'lista', op: ['Colectora', 'Colector principal', 'Impulsión', 'Emisario'] },
          { k: 'diametro_mm', n: 'Diámetro', t: 'num', u: 'mm' },
          { k: 'material', n: 'Material', t: 'lista', op: ['PVC', 'Hormigón simple', 'Hormigón armado', 'Asbesto cemento', 'Gres', 'PEAD', 'Otro'] },
          { k: 'pendiente', n: 'Pendiente', t: 'num', u: '‰' },
          { k: 'tapada_inicio_m', n: 'Tapada aguas arriba', t: 'num', u: 'm' },
          { k: 'tapada_fin_m', n: 'Tapada aguas abajo', t: 'num', u: 'm' },
          { k: 'cota_intrados_inicio', n: 'Cota de intradós aguas arriba', t: 'num', u: 'm IGN' },
          { k: 'cota_intrados_fin', n: 'Cota de intradós aguas abajo', t: 'num', u: 'm IGN' },
          { k: 'ubicacion', n: 'Ubicación en la calle', t: 'lista', op: ['Eje de calzada', 'Vereda par', 'Vereda impar'] },
          { k: 'longitud_m', n: 'Longitud declarada', t: 'num', u: 'm' },
          ANIO, { k: 'mes', n: 'Mes de obra', t: 'texto' }, { k: 'id_sig', n: 'Número en el SIG anterior', t: 'num' }, ESTADO, FECHA_REL, OBS,
        ],
      },
      boca: {
        nombre: 'Boca de registro', plural: 'Bocas de registro', geom: 'punto', color: '#3B2A14', clave: ['cota_tapa', 'profundidad_m', 'estado'],
        campos: [
          { k: 'numero', n: 'Número', t: 'texto' },
          { k: 'cota_tapa', n: 'Cota de tapa', t: 'num', u: 'm IGN' },
          { k: 'cota_fondo', n: 'Cota de fondo', t: 'num', u: 'm IGN' },
          { k: 'profundidad_m', n: 'Profundidad', t: 'num', u: 'm' },
          { k: 'diametro_m', n: 'Diámetro interior', t: 'num', u: 'm' },
          { k: 'material', n: 'Material del cuerpo', t: 'lista', op: ['Hormigón premoldeado', 'Hormigón in situ', 'Mampostería', 'PRFV'] },
          { k: 'tapa', n: 'Tapa', t: 'lista', op: ['Hierro fundido', 'Hormigón', 'Faltante', 'Rota', 'Tapada por pavimento'] },
          { k: 'entradas', n: 'Cantidad de entradas', t: 'num' },
          { k: 'salto', n: '¿Tiene salto?', t: 'lista', op: ['Sí', 'No'] },
          { k: 'sedimento', n: 'Sedimento o tirante observado', t: 'texto' },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      bombeo: {
        nombre: 'Estación de bombeo', plural: 'Estaciones de bombeo', geom: 'punto', color: '#D1342F', clave: ['cantidad_bombas', 'caudal_m3h', 'potencia_kw'],
        campos: [
          { k: 'nombre', n: 'Nombre', t: 'texto' },
          { k: 'cantidad_bombas', n: 'Cantidad de bombas', t: 'num' },
          { k: 'bomba', n: 'Bombas (marca y modelo)', t: 'texto' },
          { k: 'potencia_kw', n: 'Potencia por bomba', t: 'num', u: 'kW' },
          { k: 'caudal_m3h', n: 'Caudal de diseño', t: 'num', u: 'm³/h' },
          { k: 'altura_m', n: 'Altura manométrica', t: 'num', u: 'm' },
          { k: 'pozo_humedo', n: 'Pozo húmedo (dimensiones)', t: 'texto' },
          { k: 'grupo_electrogeno', n: 'Grupo electrógeno', t: 'lista', op: ['Sí', 'No'] },
          { k: 'telemetria', n: 'Alarma o telemetría', t: 'lista', op: ['Sí', 'No'] },
          { k: 'estado', n: 'Estado', t: 'lista', op: ['En servicio', 'Con una bomba fuera de servicio', 'Fuera de servicio'] },
          ANIO, FECHA_REL, OBS,
        ],
      },
      planta: {
        nombre: 'Planta o punto de vuelco', plural: 'Plantas y puntos de vuelco', geom: 'punto', color: '#2E6B3A', clave: ['tipo', 'cuerpo_receptor'],
        campos: [
          { k: 'nombre', n: 'Nombre', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Planta depuradora', 'Lagunas de estabilización', 'Punto de vuelco', 'Descarga de camiones atmosféricos'] },
          { k: 'capacidad_m3d', n: 'Capacidad', t: 'num', u: 'm³/día' },
          { k: 'cuerpo_receptor', n: 'Cuerpo receptor', t: 'texto' },
          { k: 'permiso_vuelco', n: 'Permiso de vuelco (ADA)', t: 'texto' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
      conexion: {
        nombre: 'Conexión domiciliaria', plural: 'Conexiones domiciliarias', geom: 'punto', color: '#C49A5E', clave: ['partida'],
        campos: [
          { k: 'partida', n: 'Partida municipal', t: 'texto' },
          { k: 'domicilio', n: 'Domicilio', t: 'texto' },
          { k: 'diametro_mm', n: 'Diámetro', t: 'num', u: 'mm' },
          { k: 'profundidad_m', n: 'Profundidad en línea municipal', t: 'num', u: 'm' },
          { k: 'camara_inspeccion', n: 'Cámara de inspección', t: 'lista', op: ['Sí', 'No', 'No se encontró'] },
          { k: 'uso', n: 'Uso', t: 'lista', op: ['Residencial', 'Comercial', 'Industrial', 'Público'] },
          ESTADO, FECHA_REL, OBS,
        ],
      },
    },
    fallas: ['Obstrucción', 'Desborde en calzada', 'Desborde en domicilio', 'Hundimiento sobre el colector', 'Tapa faltante o rota', 'Olores', 'Bomba fuera de servicio', 'Rotura de colector'],
  },

  calles: {
    nombre: 'Calles urbanas', corto: 'Calles', color: '#3D4852',
    tipos: {
      tramo: {
        nombre: 'Cuadra', plural: 'Cuadras', geom: 'linea', clave: ['calzada', 'ancho_calzada_m', 'estado'],
        colorPor: { campo: 'calzada', valores: { 'Tierra': '#A9713A', 'Mejorado': '#C9A227', 'Hormigón': '#7C8894', 'Asfalto': '#16212B', 'Adoquín': '#7A3FA8', 'Intertrabado': '#0B8F8A' } },
        campos: [
          { k: 'nombre', n: 'Nombre de la calle', t: 'texto' },
          { k: 'codigo_via', n: 'Código de vía', t: 'num' },
          { k: 'tipo_via', n: 'Tipo de vía', t: 'lista', op: ['Calle', 'Avenida', 'Pasaje', 'Colectora', 'Ruta Provincial', 'Ruta Nacional'] },
          { k: 'numeracion_desde', n: 'Numeración desde', t: 'num' },
          { k: 'numeracion_hasta', n: 'Numeración hasta', t: 'num' },
          { k: 'calzada', n: 'Calzada', t: 'lista', op: ['Tierra', 'Mejorado', 'Hormigón', 'Asfalto', 'Adoquín', 'Intertrabado'] },
          { k: 'ancho_calzada_m', n: 'Ancho de calzada', t: 'num', u: 'm' },
          { k: 'ancho_lm_m', n: 'Ancho entre líneas municipales', t: 'num', u: 'm' },
          { k: 'cordon_cuneta', n: 'Cordón cuneta', t: 'lista', op: ['Sí', 'Un solo lado', 'No'] },
          { k: 'veredas', n: 'Veredas', t: 'lista', op: ['Ambos lados', 'Un lado', 'Sin veredas'] },
          { k: 'sentido', n: 'Sentido de circulación', t: 'lista', op: ['Doble mano', 'Mano única'] },
          { k: 'transito_pesado', n: 'Tránsito pesado', t: 'lista', op: ['Permitido', 'Prohibido'] },
          { k: 'anio_pavimento', n: 'Año de pavimentación', t: 'num' },
          { k: 'longitud_m', n: 'Longitud declarada', t: 'num', u: 'm' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
      sumidero: {
        nombre: 'Sumidero', plural: 'Sumideros', geom: 'punto', color: '#1463B8', clave: ['tipo', 'estado'],
        campos: [
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['De reja horizontal', 'De ventana (boca de tormenta)', 'Mixto'] },
          { k: 'descarga', n: 'Descarga a', t: 'lista', op: ['Conducto pluvial', 'Zanja', 'Cuneta', 'Curso de agua'] },
          { k: 'limpieza', n: 'Última limpieza', t: 'fecha' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
      pluvial: {
        nombre: 'Conducto pluvial', plural: 'Conductos pluviales', geom: 'linea', color: '#1E88A8', clave: ['seccion', 'material'],
        campos: [
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Conducto entubado', 'Zanja a cielo abierto', 'Canal revestido'] },
          { k: 'seccion', n: 'Sección (diámetro o ancho × alto)', t: 'texto' },
          { k: 'material', n: 'Material', t: 'lista', op: ['Hormigón', 'PVC', 'PEAD', 'Chapa', 'Tierra'] },
          { k: 'pendiente', n: 'Pendiente', t: 'num', u: '‰' },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      alcantarilla: {
        nombre: 'Alcantarilla o cruce', plural: 'Alcantarillas y cruces', geom: 'punto', color: '#0B8F8A', clave: ['tipo', 'seccion', 'estado'],
        campos: [
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Caño', 'Losa', 'Badén'] },
          { k: 'material', n: 'Material', t: 'lista', op: ['Hormigón', 'Chapa', 'PVC', 'PEAD', 'Mampostería'] },
          { k: 'cantidad', n: 'Cantidad de caños o vanos', t: 'num' },
          { k: 'seccion', n: 'Sección (diámetro o luz)', t: 'texto' },
          { k: 'largo_m', n: 'Largo', t: 'num', u: 'm' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
    },
    fallas: ['Bache', 'Hundimiento', 'Anegamiento', 'Cordón roto', 'Sumidero tapado', 'Calle intransitable', 'Rotura por obra de servicios', 'Señalización dañada'],
  },

  caminos: {
    nombre: 'Caminos rurales', corto: 'Caminos', color: '#5C7A1F',
    tipos: {
      tramo: {
        nombre: 'Camino', plural: 'Caminos', geom: 'linea', clave: ['calzada', 'ancho_m', 'estado'],
        colorPor: { campo: 'calzada', valores: { 'Tierra': '#A9713A', 'Mejorado': '#C9A227', 'Entoscado': '#D9822B', 'Pavimento': '#16212B' } },
        campos: [
          { k: 'nombre', n: 'Nombre o código', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Camino', 'Camino cerrado', 'Camino existente', 'Camino dudoso', 'Ruta', 'Autopista'] },
          { k: 'jurisdiccion', n: 'Jurisdicción', t: 'lista', op: ['Vecinal', 'Provincial', 'Nacional'] },
          { k: 'red', n: 'Red', t: 'lista', op: ['Primaria', 'Secundaria', 'Terciaria'] },
          { k: 'calzada', n: 'Calzada', t: 'lista', op: ['Tierra', 'Mejorado', 'Entoscado', 'Pavimento'] },
          { k: 'transitabilidad', n: 'Transitabilidad', t: 'lista', op: ['Permanente', 'Temporario'] },
          { k: 'ancho_m', n: 'Ancho de calzada', t: 'num', u: 'm' },
          { k: 'ancho_zona_m', n: 'Ancho de zona de camino', t: 'num', u: 'm' },
          { k: 'cunetas', n: 'Cunetas', t: 'lista', op: ['Ambos lados, limpias', 'Ambos lados, colmatadas', 'Un lado', 'Sin cunetas'] },
          { k: 'ultimo_repaso', n: 'Último repaso de motoniveladora', t: 'fecha' },
          { k: 'longitud_m', n: 'Longitud declarada', t: 'num', u: 'm' },
          { k: 'estado', n: 'Estado', t: 'lista', op: ['Bueno', 'Regular', 'Malo', 'Intransitable'] },
          FECHA_REL, OBS,
        ],
      },
      alcantarilla: {
        nombre: 'Alcantarilla', plural: 'Alcantarillas', geom: 'punto', color: '#0B8F8A', clave: ['tipo', 'seccion', 'estado'],
        campos: [
          { k: 'codigo', n: 'Código', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Caño', 'Losa', 'Bóveda', 'Badén'] },
          { k: 'material', n: 'Material', t: 'lista', op: ['Hormigón', 'Chapa ondulada', 'PEAD', 'Mampostería', 'Madera'] },
          { k: 'cantidad', n: 'Cantidad de caños o vanos', t: 'num' },
          { k: 'seccion', n: 'Sección (diámetro o luz × alto)', t: 'texto' },
          { k: 'largo_m', n: 'Largo', t: 'num', u: 'm' },
          { k: 'cabezales', n: 'Cabezales', t: 'lista', op: ['Ambos', 'Uno solo', 'Sin cabezales', 'Dañados'] },
          { k: 'obstruccion', n: 'Obstrucción', t: 'lista', op: ['Libre', 'Parcial', 'Total'] },
          { k: 'curso', n: 'Curso de agua o cuneta que cruza', t: 'texto' },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      puente: {
        nombre: 'Puente', plural: 'Puentes', geom: 'punto', color: '#3B4A57', clave: ['tipo', 'material', 'luz_m', 'estado'],
        campos: [
          { k: 'nombre', n: 'Nombre', t: 'texto' },
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Losa', 'Vigas', 'Bóveda', 'Reticulado', 'Pasarela'] },
          { k: 'material', n: 'Material', t: 'lista', op: ['Hormigón armado', 'Metálico', 'Madera', 'Mampostería', 'Mixto'] },
          { k: 'obstaculo', n: 'Curso que cruza', t: 'texto' },
          { k: 'luz_m', n: 'Luz total', t: 'num', u: 'm' },
          { k: 'ancho_m', n: 'Ancho de calzada', t: 'num', u: 'm' },
          { k: 'carga_t', n: 'Carga máxima señalizada', t: 'num', u: 't' },
          { k: 'barandas', n: 'Barandas', t: 'lista', op: ['Completas', 'Incompletas', 'Sin barandas'] },
          ANIO, ESTADO, FECHA_REL, OBS,
        ],
      },
      guardaganado: {
        nombre: 'Guardaganado o tranquera', plural: 'Guardaganados y tranqueras', geom: 'punto', color: '#B4532A', clave: ['tipo', 'estado'],
        campos: [
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Guardaganado', 'Tranquera', 'Alambrado sobre el camino'] },
          { k: 'autorizado', n: '¿Está autorizado?', t: 'lista', op: ['Sí', 'No', 'Sin datos'] },
          ESTADO, FECHA_REL, OBS,
        ],
      },
      cuneta: {
        nombre: 'Canal o cuneta', plural: 'Canales y cunetas', geom: 'linea', color: '#1E88A8', clave: ['seccion', 'estado'],
        campos: [
          { k: 'tipo', n: 'Tipo', t: 'lista', op: ['Cuneta', 'Canal', 'Préstamo'] },
          { k: 'seccion', n: 'Sección (ancho × profundidad)', t: 'texto' },
          { k: 'ultima_limpieza', n: 'Última limpieza', t: 'fecha' },
          ESTADO, FECHA_REL, OBS,
        ],
      },
    },
    fallas: ['Camino intransitable', 'Huellones', 'Anegamiento', 'Alcantarilla obstruida', 'Alcantarilla rota', 'Erosión o cárcava', 'Puente dañado', 'Camino cerrado u ocupado', 'Falta de repaso'],
  },
};

export const COLOR_SIN_DATO = SIN_DATO;

// Intervenciones: todo lo que le pasa a la red en el tiempo.
export const CLASES = {
  falla: { nombre: 'Falla o reclamo', plural: 'Fallas y reclamos' },
  inspeccion: { nombre: 'Inspección', plural: 'Inspecciones' },
  reparacion: { nombre: 'Reparación', plural: 'Reparaciones' },
  mantenimiento: { nombre: 'Mantenimiento', plural: 'Mantenimientos' },
  obra: { nombre: 'Obra', plural: 'Obras' },
};
export const ESTADOS_INT = {
  abierta: { nombre: 'Abierta', color: '#D1342F' },
  en_curso: { nombre: 'En curso', color: '#E8A013' },
  resuelta: { nombre: 'Resuelta', color: '#2E8B4A' },
  cerrada: { nombre: 'Cerrada', color: '#8A949E' },
};
export const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

export function camposIntervencion(red, clase) {
  const c = [];
  if (clase === 'falla') c.push({ k: 'subtipo', n: 'Tipo de falla', t: 'lista', op: [...REDES[red].fallas, 'Otra'] });
  c.push({ k: 'titulo', n: 'Título', t: 'texto', req: true });
  c.push({ k: 'descripcion', n: 'Descripción', t: 'largo' });
  c.push({ k: 'prioridad', n: 'Prioridad', t: 'lista', op: PRIORIDADES });
  c.push({ k: 'fecha', n: clase === 'obra' ? 'Fecha de inicio' : 'Fecha', t: 'fecha', req: true });
  if (clase === 'falla') {
    c.push({ k: 'origen', n: 'Origen del aviso', t: 'lista', op: ['Reclamo de vecino', 'Inspección municipal', 'Cuadrilla', 'Otra área'] });
    c.push({ k: 'reclamante', n: 'Reclamante y contacto', t: 'texto' });
  }
  if (clase === 'inspeccion') c.push({ k: 'resultado', n: 'Resultado', t: 'lista', op: ['Sin novedad', 'Con observaciones', 'Requiere intervención', 'Requiere intervención urgente'] });
  if (clase !== 'falla' && clase !== 'inspeccion') {
    c.push({ k: 'responsable', n: clase === 'obra' ? 'Contratista o ejecutor' : 'Cuadrilla o responsable', t: 'texto' });
    c.push({ k: 'materiales', n: 'Materiales utilizados', t: 'largo' });
    c.push({ k: 'costo', n: clase === 'obra' ? 'Monto de obra' : 'Costo estimado', t: 'num', u: '$' });
  }
  if (clase === 'obra') {
    c.push({ k: 'expediente', n: 'Expediente', t: 'texto' });
    c.push({ k: 'avance', n: 'Avance', t: 'num', u: '%' });
    c.push({ k: 'fecha_fin_prevista', n: 'Fecha de fin prevista', t: 'fecha' });
  }
  c.push({ k: 'fecha_cierre', n: 'Fecha de resolución', t: 'fecha' });
  return c;
}

// Perfiles de acceso. La base de datos aplica estas mismas reglas (sql/01_esquema.sql):
// lo que figura acá solo decide qué botones se muestran.
export const ROLES = {
  visualizador: { nombre: 'Visualizador', desc: 'Consulta el mapa, las fichas y las intervenciones.' },
  inspector: { nombre: 'Inspector', desc: 'Además registra fallas e inspecciones en campo.' },
  obras: { nombre: 'Obras y mantenimiento', desc: 'Además carga y actualiza reparaciones, mantenimientos y obras.' },
  editor: { nombre: 'Editor de redes', desc: 'Además modifica el trazado y los datos de las redes.' },
  admin: { nombre: 'Administrador', desc: 'Todo lo anterior y la gestión de usuarios.' },
};
export const puede = {
  editarRed: (rol) => rol === 'editor' || rol === 'admin',
  clases: (rol) => rol === 'inspector' ? ['falla', 'inspeccion']
    : ['obras', 'editor', 'admin'].includes(rol) ? Object.keys(CLASES) : [],
  editarInt: (perfil, i) => ['obras', 'editor', 'admin'].includes(perfil.rol)
    || (perfil.rol === 'inspector' && i.created_by === perfil.id && ['falla', 'inspeccion'].includes(i.clase)),
  borrarInt: (rol) => rol === 'editor' || rol === 'admin',
  administrar: (rol) => rol === 'admin',
};
