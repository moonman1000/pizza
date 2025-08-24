import { store } from './memory.js';
import { route } from './geoService.js';

export function setupSockets(io){
  io.on('connection', (socket)=>{
    socket.on('joinOrder', ({tracking_code})=>{ if(tracking_code){ socket.join(`order:${tracking_code}`);} });
    socket.on('registerDriver', ({name, plate})=>{
      const d = { id: socket.id, name: name || 'Motorista', plate: plate || '', location:null };
      store.drivers.set(socket.id, d);
      io.emit('driversUpdate', Array.from(store.drivers.values()));
      socket.on('disconnect', ()=>{ store.drivers.delete(socket.id); io.emit('driversUpdate', Array.from(store.drivers.values())); });
    });
    socket.on('localizacaoMotorista', async ({lat,lon})=>{
      const d = store.drivers.get(socket.id); if(!d) return; d.location = { lat, lon };
      io.emit('driversUpdate', Array.from(store.drivers.values()));
      for (const o of store.orders.values()){
        if (o.driver && o.driver.id === d.id){
          io.to(`order:${o.tracking_code}`).emit('atualizacaoLocalizacao', { lat, lon });
          try { const data = await route(lat, lon, o.customer_lat, o.customer_lon);
            o.delivery_eta_min = data.etaMin;
            io.to(`order:${o.tracking_code}`).emit('rotaAtualizada', { etaMin: data.etaMin });
          } catch (e) {}
        }
      }
    });
  });
}