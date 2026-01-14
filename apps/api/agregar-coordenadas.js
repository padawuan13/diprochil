/**
 * Script para agregar coordenadas a clientes en MySQL
 * Ejecutar desde: apps/api
 * Comando: node agregar-coordenadas.js
 */

const mysql = require('mysql2/promise');

// Coordenadas de comunas de Chiloé
const COORDENADAS_CHILOE = {
  'Castro': { lat: -42.4696, lng: -73.7711 },
  'Quellón': { lat: -43.1167, lng: -73.6167 },
  'Queilén': { lat: -42.8778, lng: -73.4722 },
  'Dalcahue': { lat: -42.3778, lng: -73.6500 },
  'Ancud': { lat: -41.8711, lng: -73.8247 },
  'Quemchi': { lat: -42.1389, lng: -73.4667 },
  'Chonchi': { lat: -42.6264, lng: -73.7706 },
  'Curaco': { lat: -42.4333, lng: -73.5833 },
  'Puqueldón': { lat: -42.5958, lng: -73.6728 },
  'Quinchao': { lat: -42.4667, lng: -73.5167 }
};

async function main() {
  console.log('🚀 Iniciando proceso de geocodificación...\n');

  // Conectar a MySQL
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'diprochil_user',
    password: 'diprochil_pass',
    database: 'diprochil'
  });

  console.log('✅ Conectado a la base de datos\n');

  try {
    // Ver estado inicial
    const [initialCount] = await connection.execute(
      'SELECT COUNT(*) as total, COUNT(latitud) as con_coordenadas FROM Client'
    );
    console.log('📊 Estado inicial:');
    console.log(`   Total clientes: ${initialCount[0].total}`);
    console.log(`   Con coordenadas: ${initialCount[0].con_coordenadas}`);
    console.log(`   Sin coordenadas: ${initialCount[0].total - initialCount[0].con_coordenadas}\n`);

    // Obtener todos los clientes
    const [clientes] = await connection.execute(
      'SELECT id, razonSocial, comuna, latitud, longitud FROM Client'
    );

    console.log('🔄 Procesando clientes...\n');

    let actualizados = 0;
    let errores = 0;

    for (const cliente of clientes) {
      // Si ya tiene coordenadas, saltar
      if (cliente.latitud && cliente.longitud) {
        continue;
      }

      try {
        // Buscar coordenadas por comuna
        let coords = null;
        const comunaLower = (cliente.comuna || '').toLowerCase();

        for (const [nombre, coordenadas] of Object.entries(COORDENADAS_CHILOE)) {
          if (comunaLower.includes(nombre.toLowerCase())) {
            coords = coordenadas;
            break;
          }
        }

        // Si no encuentra la comuna, usar centro de Chiloé
        if (!coords) {
          coords = { lat: -42.4696, lng: -73.7711 };
        }

        // Agregar variación aleatoria (±1km aprox)
        const latitud = coords.lat + (Math.random() - 0.5) * 0.02;
        const longitud = coords.lng + (Math.random() - 0.5) * 0.02;

        // Actualizar en la base de datos
        await connection.execute(
          'UPDATE Client SET latitud = ?, longitud = ? WHERE id = ?',
          [latitud, longitud, cliente.id]
        );

        actualizados++;
        console.log(`✅ ${actualizados}/${clientes.length} - ${cliente.razonSocial} (${cliente.comuna})`);

      } catch (error) {
        errores++;
        console.error(`❌ Error con ${cliente.razonSocial}:`, error.message);
      }
    }

    // Ver estado final
    console.log('\n' + '='.repeat(60));
    const [finalCount] = await connection.execute(
      'SELECT COUNT(*) as total, COUNT(latitud) as con_coordenadas FROM Client'
    );
    console.log('📊 Estado final:');
    console.log(`   Total clientes: ${finalCount[0].total}`);
    console.log(`   Con coordenadas: ${finalCount[0].con_coordenadas}`);
    console.log(`   Actualizados ahora: ${actualizados}`);
    console.log(`   Errores: ${errores}`);
    console.log('='.repeat(60));

    // Ver distribución por comuna
    console.log('\n📍 Distribución por comuna:');
    const [distribucion] = await connection.execute(`
      SELECT 
        comuna,
        COUNT(*) as total,
        SUM(CASE WHEN latitud IS NOT NULL THEN 1 ELSE 0 END) as con_coordenadas
      FROM Client
      GROUP BY comuna
      ORDER BY total DESC
      LIMIT 10
    `);

    distribucion.forEach(row => {
      console.log(`   ${row.comuna}: ${row.con_coordenadas}/${row.total}`);
    });

    console.log('\n✅ Proceso completado exitosamente!');
    console.log('💡 Recarga la página de clientes para ver el mapa actualizado\n');

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await connection.end();
    console.log('🔌 Conexión cerrada');
  }
}

main();