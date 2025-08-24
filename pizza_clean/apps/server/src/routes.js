import express from 'express';
import { route, geocode } from './geoService.js';
import { store } from './memory.js';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

export function buildApi(io){
  const api = express.Router();

  api.get('/routes', async (req, res) => {
    try {
      const [fromLat, fromLon] = (req.query.from || '').split(',').map(Number);
      const [toLat, toLon] = (req.query.to || '').split(',').map(Number);
      if (!Number.isFinite(fromLat) || !Number.isFinite(fromLon) || !Number.isFinite(toLat) || !Number.isFinite(toLon)) {
        return res.status(400).json({ error: 'Parâmetros inválidos. Use ?from=lat,lon&to=lat,lon' });
      }
      const data = await route(fromLat, fromLon, toLat, toLon);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/orders', async (req,res)=>{
    try{
      const { address_text, items, payment_method } = req.body || {};
      if(!address_text || !Array.isArray(items) || items.length===0){
        return res.status(400).json({ error:'Dados do pedido inválidos' });
      }
      const dest = await geocode(address_text);
      const id = String(Date.now());
      const tracking_code = nanoid();
      const order = {
        id, tracking_code, address_text,
        customer_lat: dest.lat, customer_lon: dest.lon,
        items, payment_method, status:'CRIADO', delivery_eta_min: null,
        driver: null
      };
      store.orders.set(id, order);
      store.byTracking.set(tracking_code, order);
      res.json({ id, tracking_code, customer_lat: dest.lat, customer_lon: dest.lon, status: order.status });
    }catch(e){ res.status(500).json({ error: e.message }); }
  });

  api.post('/orders/:id/pay', (req,res)=>{
    const o = store.orders.get(req.params.id);
    if(!o) return res.status(404).json({error:'Pedido não encontrado'});
    o.status='PAGO';
    io.emit('pedidoAtualizado', { id:o.id, status:o.status });
    res.json({ ok:true });
  });

  api.get('/orders/:tracking', (req,res)=>{
    const o = store.byTracking.get(req.params.tracking);
    if(!o) return res.status(404).json({error:'Pedido não encontrado'});
    res.json({
      id:o.id, tracking_code:o.tracking_code, status:o.status,
      customer_lat:o.customer_lat, customer_lon:o.customer_lon,
      delivery_eta_min:o.delivery_eta_min,
      driver: o.driver ? { name:o.driver.name, plate:o.driver.plate } : null
    });
  });

  api.get('/admin/orders', (req,res)=>{ res.json(Array.from(store.orders.values())); });
  api.get('/admin/drivers', (req,res)=>{ res.json(Array.from(store.drivers.values())); });

  api.post('/admin/orders/:id/assign-driver', (req,res)=>{
    const { driverId } = req.body || {};
    const o = store.orders.get(req.params.id);
    const d = store.drivers.get(driverId);
    if(!o) return res.status(404).json({error:'Pedido não encontrado'});
    if(!d) return res.status(404).json({error:'Motorista não encontrado'});
    o.driver = { id:d.id, name:d.name, plate:d.plate };
    o.status = 'SAIU_PARA_ENTREGA';
    io.to(`order:${o.tracking_code}`).emit('driverAssigned', { driver:o.driver });
    io.emit('pedidoAtualizado', { id:o.id, status:o.status, driver:o.driver });
    res.json({ok:true});
  });

  return api;
}