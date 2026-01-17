/* ========================================
   EXPORTAR-EXCEL.JS - Utilidad para exportar a Excel
   ======================================== */

const ExportarExcel = {
  /**
   * Exportar pedidos a Excel (con incidencias)
   */
  async exportarPedidos() {
    try {
      console.log('Exportando pedidos a Excel...');

      const response = await API.get(CONFIG.ENDPOINTS.PEDIDOS, { take: 200, skip: 0 });
      const pedidos = response.items || [];

      if (pedidos.length === 0) {
        UI.showError('No hay pedidos para exportar');
        return;
      }

      console.log('Cargando incidencias de rutas...');

      const rutasResponse = await API.get(CONFIG.ENDPOINTS.ROUTES, { take: 200 });
      const rutasIds = rutasResponse.items?.map(r => r.id) || [];
      
      const incidenciasPorPedido = {};
      
      await Promise.all(
        rutasIds.map(async (rutaId) => {
          try {
            const detalle = await API.get(`${CONFIG.ENDPOINTS.ROUTES}/${rutaId}/dashboard`);
            const ruta = detalle.item;
            
            if (ruta.incidents && ruta.incidents.length > 0) {
              ruta.incidents.forEach(inc => {
                if (!incidenciasPorPedido[inc.pedidoId]) {
                  incidenciasPorPedido[inc.pedidoId] = [];
                }
                incidenciasPorPedido[inc.pedidoId].push({
                  tipo: inc.tipo,
                  severidad: inc.severidad,
                  descripcion: inc.descripcion,
                  fecha: inc.createdAt
                });
              });
            }
          } catch (error) {
            console.warn(`No se pudo cargar detalle de ruta ${rutaId}`);
          }
        })
      );

      console.log('Incidencias cargadas');

      const data = pedidos.map(p => {
        const incidencias = incidenciasPorPedido[p.id] || [];
        const tieneIncidencia = incidencias.length > 0;
        
        return {
          'ID': p.id,
          'Cliente': p.client?.razonSocial || '-',
          'RUT': p.client?.rut || '-',
          'Dirección': p.client?.direccion || '-',
          'Comuna': p.client?.comuna || '-',
          'Teléfono': p.client?.telefono || '-',
          'Cajas': p.cajas || 0,
          'Fecha Solicitud': this.formatearFecha(p.fechaSolicitud),
          'Fecha Compromiso': p.fechaCompromiso ? this.formatearFecha(p.fechaCompromiso) : '-',
          'Estado': p.estado,
          'Tiene Incidencia': tieneIncidencia ? 'SÍ' : 'NO',
          'Tipo Incidencia': tieneIncidencia ? incidencias.map(i => i.tipo).join(', ') : '-',
          'Última Incidencia': tieneIncidencia ? incidencias[incidencias.length - 1].descripcion : '-',
          'Comentarios': p.comentarios || '-',
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

      const colWidths = [
        { wch: 8 },  
        { wch: 40 }, 
        { wch: 15 }, 
        { wch: 40 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 10 }, 
        { wch: 18 }, 
        { wch: 18 }, 
        { wch: 15 }, 
        { wch: 18 }, 
        { wch: 30 }, 
        { wch: 50 }, 
        { wch: 40 }, 
      ];
      ws['!cols'] = colWidths;

      const fecha = new Date().toISOString().split('T')[0];
      const filename = `Pedidos_${fecha}.xlsx`;
      XLSX.writeFile(wb, filename);

      console.log('Excel exportado:', filename);
      const conIncidencias = data.filter(p => p['Tiene Incidencia'] === 'SÍ').length;
      const mensaje = conIncidencias > 0 
        ? `Excel exportado: ${data.length} pedidos (${conIncidencias} con incidencias)`
        : `Excel exportado: ${data.length} pedidos`;
      UI.showSuccess(mensaje);

    } catch (error) {
      console.error('Error al exportar:', error);
      UI.showError('Error al exportar a Excel');
    }
  },

  async exportarReporteOperacion() {
    try {
      if (!window.XLSX) {
        UI.showError('No se pudo cargar la librería de Excel (SheetJS)');
        return;
      }

      UI.showLoadingOverlay(true);
      console.log('Exportando reporte operación (entregas + incidencias)...');

      const take = 200;
      let skip = 0;
      const rutas = [];

      while (true) {
        const resp = await API.get(CONFIG.ENDPOINTS.ROUTES, { take, skip });
        const items = resp.items || [];
        rutas.push(...items);
        if (items.length < take) break;
        skip += take;
      }

      if (rutas.length === 0) {
        UI.showError('No hay rutas para exportar');
        return;
      }

      const entregasRows = [];
      const incidenciasRows = [];

      for (let i = 0; i < rutas.length; i++) {
        const rutaId = rutas[i].id;
        try {
          const detalle = await API.get(`${CONFIG.ENDPOINTS.ROUTES}/${rutaId}/dashboard`);
          const ruta = detalle.item;

          const fechaRuta = this.formatearFecha(ruta.fechaRuta);
          const conductor = ruta.conductor?.nombre || '-';
          const vehiculo = ruta.vehicle?.patente || '-';
          const zona = ruta.zona || '-';

          (ruta.stops || []).forEach((stop) => {
            const pedido = stop.pedido;
            const cliente = pedido?.client;

            entregasRows.push({
              'Ruta ID': ruta.id,
              'Fecha Ruta': fechaRuta,
              'Estado Ruta': ruta.estado,
              'Zona': zona,
              'Conductor': conductor,
              'Vehículo': vehiculo,
              'Orden Visita': stop.ordenVisita ?? '-',
              'Estado Parada': stop.estadoParada || '-',
              'Pedido ID': stop.pedidoId,
              'Estado Pedido': pedido?.estado || '-',
              'Fecha Compromiso': pedido?.fechaCompromiso ? this.formatearFecha(pedido.fechaCompromiso) : '-',
              'Cajas': pedido?.cajas ?? 0,
              'Cliente': cliente?.razonSocial || '-',
              'RUT': cliente?.rut || '-',
              'Dirección': cliente?.direccion || '-',
              'Comuna': cliente?.comuna || '-',
              'Ciudad': cliente?.ciudad || '-',
              'Teléfono': cliente?.telefono || '-',
              'Comentarios Pedido': pedido?.comentarios || '-',
            });
          });

          (ruta.incidents || []).forEach((inc) => {
            const pedido = inc.pedido;
            const cliente = pedido?.client;
            const creadoPor = inc.createdBy?.nombre || '-';

            incidenciasRows.push({
              'Ruta ID': ruta.id,
              'Fecha Ruta': fechaRuta,
              'Estado Ruta': ruta.estado,
              'Zona': zona,
              'Conductor': conductor,
              'Vehículo': vehiculo,
              'Pedido ID': inc.pedidoId,
              'Cliente': cliente?.razonSocial || '-',
              'RUT': cliente?.rut || '-',
              'Comuna': cliente?.comuna || '-',
              'Ciudad': cliente?.ciudad || '-',
              'Tipo': inc.tipo || '-',
              'Descripción': inc.descripcion || '-',
              'Severidad': inc.severidad || '-',
              'Estado Incidencia': inc.estado || '-',
              'Creada por': creadoPor,
              'Creada el': inc.createdAt ? this.formatearFecha(inc.createdAt) : '-',
            });
          });

        } catch (err) {
          console.warn('No se pudo cargar dashboard ruta', rutaId, err);
        }
      }

      // 3) Crear Excel
      const wb = XLSX.utils.book_new();
      const wsEntregas = XLSX.utils.json_to_sheet(entregasRows);
      const wsIncidencias = XLSX.utils.json_to_sheet(incidenciasRows);

      // Anchos básicos
      wsEntregas['!cols'] = [
        { wch: 8 },  // Ruta ID
        { wch: 12 }, // Fecha Ruta
        { wch: 14 }, // Estado Ruta
        { wch: 18 }, // Zona
        { wch: 22 }, // Conductor
        { wch: 12 }, // Vehículo
        { wch: 12 }, // Orden
        { wch: 14 }, // Estado Parada
        { wch: 10 }, // Pedido ID
        { wch: 14 }, // Estado Pedido
        { wch: 14 }, // Fecha Compromiso
        { wch: 8 },  // Cajas
        { wch: 30 }, // Cliente
        { wch: 14 }, // RUT
        { wch: 30 }, // Dirección
        { wch: 18 }, // Comuna
        { wch: 18 }, // Ciudad
        { wch: 14 }, // Teléfono
        { wch: 30 }, // Comentarios
      ];
      wsIncidencias['!cols'] = [
        { wch: 8 },  // Ruta ID
        { wch: 12 }, // Fecha Ruta
        { wch: 14 }, // Estado Ruta
        { wch: 18 }, // Zona
        { wch: 22 }, // Conductor
        { wch: 12 }, // Vehículo
        { wch: 10 }, // Pedido ID
        { wch: 30 }, // Cliente
        { wch: 14 }, // RUT
        { wch: 18 }, // Comuna
        { wch: 18 }, // Ciudad
        { wch: 18 }, // Tipo
        { wch: 45 }, // Descripción
        { wch: 10 }, // Severidad
        { wch: 16 }, // Estado
        { wch: 18 }, // Creada por
        { wch: 16 }, // Creada el
      ];

      XLSX.utils.book_append_sheet(wb, wsEntregas, 'Entregas');
      XLSX.utils.book_append_sheet(wb, wsIncidencias, 'Incidencias');

      const fecha = new Date().toISOString().split('T')[0];
      const filename = `Reporte_Operacion_${fecha}.xlsx`;
      XLSX.writeFile(wb, filename);

      UI.showSuccess(`Reporte exportado: ${entregasRows.length} entregas / ${incidenciasRows.length} incidencias`);

    } catch (error) {
      console.error('Error al exportar reporte operación:', error);
      UI.showError('Error al exportar el reporte');
    } finally {
      UI.showLoadingOverlay(false);
    }
  },

  /**
   * Exportar rutas a Excel (con incidencias y datos reales)
   */
  async exportarRutas() {
    try {
      console.log('Exportando rutas a Excel...');

      const response = await API.get(CONFIG.ENDPOINTS.ROUTES, { take: 200 });
      let rutas = response.items || [];

      if (rutas.length === 0) {
        UI.showError('No hay rutas para exportar');
        return;
      }

      console.log('Cargando detalles de cada ruta...');
      
      const rutasCompletas = await Promise.all(
        rutas.map(async (ruta) => {
          try {
            const detalle = await API.get(`${CONFIG.ENDPOINTS.ROUTES}/${ruta.id}/dashboard`);
            return detalle.item || ruta;
          } catch (error) {
            console.warn(`No se pudo cargar detalle de ruta ${ruta.id}`);
            return ruta;
          }
        })
      );

      console.log('Detalles cargados');

      // Preparar datos de rutas para Excel
      const dataRutas = rutasCompletas.map(r => {
        const paradasCompletadas = r.stops?.filter(s => s.estadoParada === 'COMPLETADA').length || 0;
        const paradasNoEntregadas = r.stops?.filter(s => s.estadoParada === 'NO_ENTREGADA').length || 0;
        
        const paradasConHora = r.stops?.filter(s => s.horaLlegada) || [];
        paradasConHora.sort((a, b) => new Date(a.horaLlegada) - new Date(b.horaLlegada));
        
        const horaInicioReal = paradasConHora.length > 0 
          ? this.formatearHora(paradasConHora[0].horaLlegada) 
          : '-';
        
        const horaFinReal = paradasConHora.length > 0 
          ? this.formatearHora(paradasConHora[paradasConHora.length - 1].horaLlegada) 
          : '-';

        return {
          'ID': r.id,
          'Fecha': this.formatearFecha(r.fechaRuta),
          'Conductor': r.conductor?.nombre || '-',
          'Vehículo': r.vehicle?.patente || '-',
          'Zona': r.zona || '-',
          'Estado': r.estado,
          'Total Paradas': r.stops?.length || 0,
          'Paradas Completadas': paradasCompletadas,
          'Paradas No Entregadas': paradasNoEntregadas,
          'Total Incidencias': r.incidents?.length || 0,
          'Hora Inicio Real': horaInicioReal,
          'Hora Fin Real': horaFinReal,
          'Hora Inicio Prog.': r.horaInicioProg ? this.formatearHora(r.horaInicioProg) : '-',
          'Hora Fin Prog.': r.horaFinProg ? this.formatearHora(r.horaFinProg) : '-',
        };
      });

      // Preparar datos de incidencias con más detalle
      const dataIncidencias = [];
      rutasCompletas.forEach(r => {
        if (r.incidents && r.incidents.length > 0) {
          r.incidents.forEach(inc => {
            const parada = r.stops?.find(s => s.pedidoId === inc.pedidoId);
            const cliente = parada?.pedido?.client;

            dataIncidencias.push({
              'Ruta ID': r.id,
              'Fecha Ruta': this.formatearFecha(r.fechaRuta),
              'Conductor': r.conductor?.nombre || '-',
              'Pedido ID': inc.pedidoId,
              'Cliente': cliente?.razonSocial || '-',
              'RUT Cliente': cliente?.rut || '-',
              'Comuna': cliente?.comuna || '-',
              'Tipo Incidencia': inc.tipo,
              'Severidad': inc.severidad,
              'Descripción': inc.descripcion,
              'Reportado Por': inc.createdBy?.nombre || 'Sistema',
              'Fecha Reporte': this.formatearFecha(inc.createdAt),
              'Hora Reporte': this.formatearHora(inc.createdAt),
            });
          });
        }
      });

      // Crear libro de Excel
      const wb = XLSX.utils.book_new();

      // Hoja 1: Rutas
      const wsRutas = XLSX.utils.json_to_sheet(dataRutas);
      const colWidthsRutas = [
        { wch: 8 },  // ID
        { wch: 12 }, // Fecha
        { wch: 25 }, // Conductor
        { wch: 15 }, // Vehículo
        { wch: 15 }, // Zona
        { wch: 15 }, // Estado
        { wch: 15 }, // Total Paradas
        { wch: 20 }, // Paradas Completadas
        { wch: 20 }, // Paradas No Entregadas
        { wch: 18 }, // Total Incidencias
        { wch: 18 }, // Hora Inicio Real
        { wch: 18 }, // Hora Fin Real
        { wch: 18 }, // Hora Inicio Prog
        { wch: 18 }, // Hora Fin Prog
      ];
      wsRutas['!cols'] = colWidthsRutas;
      XLSX.utils.book_append_sheet(wb, wsRutas, 'Rutas');

      // Hoja 2: Incidencias (si hay)
      if (dataIncidencias.length > 0) {
        const wsIncidencias = XLSX.utils.json_to_sheet(dataIncidencias);
        const colWidthsIncidencias = [
          { wch: 10 }, // Ruta ID
          { wch: 12 }, // Fecha Ruta
          { wch: 25 }, // Conductor
          { wch: 12 }, // Pedido ID
          { wch: 40 }, // Cliente
          { wch: 15 }, // RUT Cliente
          { wch: 15 }, // Comuna
          { wch: 25 }, // Tipo Incidencia
          { wch: 12 }, // Severidad
          { wch: 50 }, // Descripción
          { wch: 25 }, // Reportado Por
          { wch: 18 }, // Fecha Reporte
          { wch: 15 }, // Hora Reporte
        ];
        wsIncidencias['!cols'] = colWidthsIncidencias;
        XLSX.utils.book_append_sheet(wb, wsIncidencias, 'Incidencias por Cliente');
      }

      const fecha = new Date().toISOString().split('T')[0];
      const filename = `Rutas_${fecha}.xlsx`;
      XLSX.writeFile(wb, filename);

      console.log('Excel exportado:', filename);
      const mensaje = dataIncidencias.length > 0 
        ? `Excel exportado: ${dataRutas.length} rutas y ${dataIncidencias.length} incidencias`
        : `Excel exportado: ${dataRutas.length} rutas`;
      UI.showSuccess(mensaje);

    } catch (error) {
      console.error('Error al exportar:', error);
      UI.showError('Error al exportar a Excel');
    }
  },

  /**
   * Formatear fecha para Excel
   */
  formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  },

  /**
   * Formatear hora para Excel
   */
  formatearHora(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hora}:${min}`;
  }
};