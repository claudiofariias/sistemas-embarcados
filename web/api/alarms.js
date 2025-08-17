const mqtt = require('mqtt');

module.exports = async (req, res) => {
  // Só processa requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { hour, minute, medicine } = req.body;
    
    // Conexão MQTT
    const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt');
    
    await new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('error', reject);
      setTimeout(reject, 5000, new Error('Timeout MQTT'));
    });

    client.publish('medicine_reminder/hour', hour.toString());
    client.publish('medicine_reminder/minute', minute.toString());
    client.publish('medicine_reminder/medicine', medicine);
    client.publish('medicine_reminder/add', '1');

    client.end();
    return res.json({ success: true });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Erro no servidor',
      details: error.message 
    });
  }
};