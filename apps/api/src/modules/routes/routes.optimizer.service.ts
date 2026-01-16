/**
 * Servicio de optimización de rutas
 */

interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface PuntoRuta extends Coordenadas {
  id: number;
  pedidoId: number;
  clienteNombre: string;
  direccion?: string | undefined;
  comuna?: string | undefined;
}

export interface RutaOptimizada {
  puntos: PuntoRuta[];
  distanciaTotal: number;
  tiempoEstimado: number;
  orden: number[];
}

function calcularDistancia(punto1: Coordenadas, punto2: Coordenadas): number {
  const R = 6371;
  
  const lat1Rad = (punto1.latitud * Math.PI) / 180;
  const lat2Rad = (punto2.latitud * Math.PI) / 180;
  const deltaLat = ((punto2.latitud - punto1.latitud) * Math.PI) / 180;
  const deltaLon = ((punto2.longitud - punto1.longitud) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function optimizarRuta(
  puntos: PuntoRuta[],
  puntoInicio?: Coordenadas
): RutaOptimizada {
  if (puntos.length === 0) {
    return {
      puntos: [],
      distanciaTotal: 0,
      tiempoEstimado: 0,
      orden: [],
    };
  }

  if (puntos.length === 1) {
    return {
      puntos,
      distanciaTotal: 0,
      tiempoEstimado: 15,
      orden: [puntos[0]!.pedidoId],
    };
  }

  const primerPunto = puntos[0];
  if (!primerPunto) {
    return {
      puntos: [],
      distanciaTotal: 0,
      tiempoEstimado: 0,
      orden: [],
    };
  }

  const inicio: Coordenadas = puntoInicio ?? primerPunto;
  const puntosRestantes = [...puntos];
  const rutaOptimizada: PuntoRuta[] = [];
  let distanciaTotal = 0;
  let puntoActual: Coordenadas = inicio;

  let indiceMasCercano = 0;
  let distanciaMinima = Infinity;

  puntosRestantes.forEach((punto, index) => {
    const distancia = calcularDistancia(puntoActual, punto);
    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      indiceMasCercano = index;
    }
  });

  const primerPuntoRuta = puntosRestantes.splice(indiceMasCercano, 1)[0];
  if (primerPuntoRuta !== undefined) {
    rutaOptimizada.push(primerPuntoRuta);
    distanciaTotal += distanciaMinima;
    puntoActual = primerPuntoRuta;
  }

  while (puntosRestantes.length > 0) {
    let indiceMasCercano = 0;
    let distanciaMinima = Infinity;

    puntosRestantes.forEach((punto, index) => {
      const distancia = calcularDistancia(puntoActual, punto);
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        indiceMasCercano = index;
      }
    });

    const puntoMasCercano = puntosRestantes.splice(indiceMasCercano, 1)[0];
    if (puntoMasCercano !== undefined) {
      rutaOptimizada.push(puntoMasCercano);
      distanciaTotal += distanciaMinima;
      puntoActual = puntoMasCercano;
    }
  }

  const tiempoViaje = (distanciaTotal / 40) * 60;
  const tiempoParadas = rutaOptimizada.length * 15;
  const tiempoEstimado = Math.ceil(tiempoViaje + tiempoParadas);

  return {
    puntos: rutaOptimizada,
    distanciaTotal: Math.round(distanciaTotal * 100) / 100,
    tiempoEstimado,
    orden: rutaOptimizada.map((p) => p.pedidoId),
  };
}

export function compararRutas(
  rutaManual: PuntoRuta[],
  rutaOptimizada: PuntoRuta[]
): {
  ahorroDistancia: number;
  ahorroTiempo: number;
  ahorroCombustible: number;
  ahorroDinero: number;
  porcentajeMejora: number;
} {
  let distanciaManual = 0;
  for (let i = 0; i < rutaManual.length - 1; i++) {
    const p1 = rutaManual[i];
    const p2 = rutaManual[i + 1];
    if (p1 && p2) {
      distanciaManual += calcularDistancia(p1, p2);
    }
  }

  let distanciaOptimizada = 0;
  for (let i = 0; i < rutaOptimizada.length - 1; i++) {
    const p1 = rutaOptimizada[i];
    const p2 = rutaOptimizada[i + 1];
    if (p1 && p2) {
      distanciaOptimizada += calcularDistancia(p1, p2);
    }
  }

  const ahorroDistancia = distanciaManual - distanciaOptimizada;
  const ahorroTiempo = Math.round((ahorroDistancia / 40) * 60);
  const consumoPorKm = 0.12;
  const precioCombustible = 1300;
  const ahorroCombustible = ahorroDistancia * consumoPorKm;
  const ahorroDinero = Math.round(ahorroCombustible * precioCombustible);
  const porcentajeMejora = Math.round(
    ((ahorroDistancia / distanciaManual) * 100) * 10
  ) / 10;

  return {
    ahorroDistancia: Math.round(ahorroDistancia * 100) / 100,
    ahorroTiempo,
    ahorroCombustible: Math.round(ahorroCombustible * 100) / 100,
    ahorroDinero,
    porcentajeMejora,
  };
}

export function calcularCentroGeografico(
  puntos: Coordenadas[]
): Coordenadas | null {
  if (puntos.length === 0) return null;

  const suma = puntos.reduce(
    (acc, punto) => ({
      latitud: acc.latitud + punto.latitud,
      longitud: acc.longitud + punto.longitud,
    }),
    { latitud: 0, longitud: 0 }
  );

  return {
    latitud: suma.latitud / puntos.length,
    longitud: suma.longitud / puntos.length,
  };
}