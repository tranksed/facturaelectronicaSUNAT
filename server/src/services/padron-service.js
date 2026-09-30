const axios = require('axios');

// In-memory cache for fast repeated lookups
const cache = new Map();

/**
 * Clean string formatting
 */
function cleanText(str) {
  if (!str) return '';
  return str.toString().trim().replace(/\s+/g, ' ');
}

/**
 * Consulta de RUC (11 dígitos)
 * Retorna Razón Social, Dirección Fiscal, Estado y Condición.
 */
async function consultarRuc(ruc) {
  const cleanRuc = cleanText(ruc);
  if (!/^\d{11}$/.test(cleanRuc)) {
    throw new Error('El RUC debe tener exactamente 11 dígitos numéricos.');
  }

  const cacheKey = `ruc_${cleanRuc}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // Endpoints to try in order
  const endpoints = [
    {
      url: `https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`,
      handler: (data) => {
        if (!data || !data.nombre) return null;
        let direccionCompleta = cleanText(data.direccion);
        const partes = [];
        if (data.distrito && data.distrito !== '-') partes.push(data.distrito);
        if (data.provincia && data.provincia !== '-') partes.push(data.provincia);
        if (data.departamento && data.departamento !== '-') partes.push(data.departamento);
        if (partes.length > 0 && direccionCompleta) {
          direccionCompleta += ` - ${partes.join(', ')}`;
        }
        return {
          tipoDoc: '6',
          nroDoc: cleanRuc,
          nombre: cleanText(data.nombre),
          direccion: direccionCompleta,
          estado: data.estado || 'ACTIVO',
          condicion: data.condicion || 'HABIDO',
          ubigeo: data.ubigeo || ''
        };
      }
    },
    {
      url: `https://api.apis.net.pe/v2/sunat/ruc?numero=${cleanRuc}`,
      headers: { 'Referer': 'https://apis.net.pe/consulta-ruc-api' },
      handler: (data) => {
        if (!data || !data.razonSocial) return null;
        return {
          tipoDoc: '6',
          nroDoc: cleanRuc,
          nombre: cleanText(data.razonSocial),
          direccion: cleanText(data.direccion),
          estado: data.estado || 'ACTIVO',
          condicion: data.condicion || 'HABIDO',
          ubigeo: data.ubigeo || ''
        };
      }
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ...(ep.headers || {})
        },
        timeout: 4500
      });

      const parsed = ep.handler(res.data);
      if (parsed) {
        cache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (e) {
      // Try next endpoint on failure
    }
  }

  throw new Error(`No se encontraron datos para el RUC ${cleanRuc}. Verifica el número o ingrésalo manualmente.`);
}

/**
 * Consulta de DNI (8 dígitos)
 * Retorna Nombres y Apellidos completos.
 */
async function consultarDni(dni) {
  const cleanDni = cleanText(dni);
  if (!/^\d{8}$/.test(cleanDni)) {
    throw new Error('El DNI debe tener exactamente 8 dígitos numéricos.');
  }

  const cacheKey = `dni_${cleanDni}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const endpoints = [
    {
      url: `https://api.apis.net.pe/v2/reniec/dni?numero=${cleanDni}`,
      handler: (data) => {
        if (!data) return null;
        const nombre = data.nombreCompleto || `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
        if (!nombre) return null;
        return {
          tipoDoc: '1',
          nroDoc: cleanDni,
          nombre: cleanText(nombre),
          nombres: cleanText(data.nombres),
          apellidoPaterno: cleanText(data.apellidoPaterno),
          apellidoMaterno: cleanText(data.apellidoMaterno),
          direccion: ''
        };
      }
    },
    {
      url: `https://api.apis.net.pe/v1/dni?numero=${cleanDni}`,
      handler: (data) => {
        if (!data || !data.nombre) return null;
        return {
          tipoDoc: '1',
          nroDoc: cleanDni,
          nombre: cleanText(data.nombre),
          nombres: cleanText(data.nombres),
          apellidoPaterno: cleanText(data.apellidoPaterno),
          apellidoMaterno: cleanText(data.apellidoMaterno),
          direccion: ''
        };
      }
    }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(ep.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ...(ep.headers || {})
        },
        timeout: 4500
      });

      const parsed = ep.handler(res.data);
      if (parsed) {
        cache.set(cacheKey, parsed);
        return parsed;
      }
    } catch (e) {
      // Try next endpoint on failure
    }
  }

  throw new Error(`No se encontraron datos para el DNI ${cleanDni}. Verifica el número o ingrésalo manualmente.`);
}

module.exports = {
  consultarRuc,
  consultarDni
};
