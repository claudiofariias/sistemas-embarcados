const mqtt = require('mqtt');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: 'Método não permitido' 
    });
  }

  // Validação básica do corpo da requisição
  if (!req.body || !req.body.hour || !req.body.minute || !req.body.medicine) {
    return res.status(400).json({
      success: false,
      error: 'Dados incompletos. Forneça hour, minute e medicine'
    });
  }

  const { hour, minute, medicine } = req.body;
  const clientId = `api_${Math.random().toString(16).substr(2, 8)}`;
  
  // Configurações aprimoradas de conexão
  const options = {
    clientId: clientId,
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 0 // Desativa reconexão automática
  };

  const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt', options);

  try {
    // Conexão com timeout
    await new Promise((resolve, reject) => {
      client.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        resolve();
      });

      client.on('error', (err) => {
        console.error('Erro MQTT:', err);
        reject(new Error('Falha na conexão MQTT'));
      });

      setTimeout(() => {
        reject(new Error('Timeout de conexão MQTT'));
      }, 8000);
    });

    // Publicação com confirmação
    await new Promise((resolve, reject) => {
      client.publish('medicine_reminder/hour', hour.toString(), { qos: 1 }, (err) => {
        if (err) return reject(err);
      });
      client.publish('medicine_reminder/minute', minute.toString(), { qos: 1 }, (err) => {
        if (err) return reject(err);
      });
      client.publish('medicine_reminder/medicine', medicine, { qos: 1 }, (err) => {
        if (err) return reject(err);
      });
      client.publish('medicine_reminder/add', '1', { qos: 1 }, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return res.status(200).json({ 
      success: true,
      message: 'Alarme configurado com sucesso' 
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno no servidor',
      details: error.message 
    });
  } finally {
    // Garante que o cliente seja encerrado
    if (client && client.connected) {
      client.end();
    }
  }
};