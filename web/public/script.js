const mqttConfig = {
  hosts: [
    "wss://broker.hivemq.com:8884/mqtt",
    "wss://broker.hivemq.com:8883/mqtt",
    "wss://broker.emqx.io:8084/mqtt"
  ],
  currentHostIndex: 0,
  clientId: "web_" + Math.random().toString(16).substr(2, 8),
  timeout: 3,
  keepAliveInterval: 60,
  topics: {
    hour: "medicine_reminder/hour",
    minute: "medicine_reminder/minute",
    medicine: "medicine_reminder/medicine",
    add: "medicine_reminder/add",
    clear: "medicine_reminder/clear",
    status: "medicine_reminder/status",
    list: "medicine_reminder/list"
  }
};

const appState = {
  client: null,
  connected: false,
  alarms: []
};

const elements = {
  addAlarmBtn: document.getElementById('addAlarmBtn'),
  cancelAllBtn: document.getElementById('cancelAllBtn'),
  alarmTimeInput: document.getElementById('alarmTime'),
  alarmDescInput: document.getElementById('alarmDesc'),
  alarmsList: document.getElementById('alarmsList'),
  statusMessage: document.getElementById('statusMessage'),
  connectionStatus: document.getElementById('connectionStatus'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text')
};

if (typeof Paho.MQTT === 'undefined' && typeof Paho !== 'undefined') {
  Paho.MQTT = {
    Client: Paho.Client,
    Message: Paho.Message
  };
}

function initMQTT() {
  if (appState.client && appState.client.isConnected()) {
    appState.client.disconnect();
  }

  const currentHost = mqttConfig.hosts[mqttConfig.currentHostIndex];
  const [host, port, path] = parseHostUrl(currentHost);
  
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  appState.client = new Paho.Client(
    host,
    Number(port),
    formattedPath, 
    mqttConfig.clientId
  );

  appState.client.onConnectionLost = (response) => {
    if (response.errorCode !== 0) {
      console.log("Conexão perdida:", response.errorMessage);
    }
    appState.connected = false;
    updateConnectionStatus();
    setTimeout(initMQTT, 5000);
  };

  appState.client.onMessageArrived = (message) => {
    if (message.destinationName === mqttConfig.topics.status) {
      showStatus(message.payloadString, "success");
    } else if (message.destinationName === mqttConfig.topics.list) {
      updateAlarmsList(message.payloadString);
    }
  };

  const connectOptions = {
    useSSL: true,
    mqttVersion: 4,
    keepAliveInterval: mqttConfig.keepAliveInterval,
    timeout: mqttConfig.timeout,
    cleanSession: true,
    onSuccess: () => {
      console.log("Conectado via", mqttConfig.hosts[mqttConfig.currentHostIndex]);
      appState.connected = true;
      updateConnectionStatus();
      appState.client.subscribe(mqttConfig.topics.status, {qos: 0});
      appState.client.subscribe(mqttConfig.topics.list, {qos: 0});
      requestAlarmsList();
    },
    onFailure: (error) => {
      console.error("Falha na conexão com", mqttConfig.hosts[mqttConfig.currentHostIndex], error.errorMessage);
      mqttConfig.currentHostIndex = (mqttConfig.currentHostIndex + 1) % mqttConfig.hosts.length;
      setTimeout(initMQTT, 2000);
    }
  };

  appState.client.connect(connectOptions);
}

function parseHostUrl(url) {
  const withoutProtocol = url.replace(/^wss?:\/\//, '');
  const [hostPort, ...pathParts] = withoutProtocol.split('/');
  const [host, port] = hostPort.split(':');
  const finalPort = port || '8884';
  const finalPath = pathParts.join('/') || 'mqtt';
  
  return [host, finalPort, finalPath];
}


function updateAlarmsList(alarmString) {
  elements.alarmsList.innerHTML = "";
  appState.alarms = [];

  if (!alarmString || alarmString.trim() === "") {
    elements.alarmsList.innerHTML = `
      <div class="alarm-item">
        <span>Nenhum alarme configurado</span>
      </div>
    `;
    return;
  }

  const alarmItems = alarmString.split("|");

  alarmItems.forEach(item => {
    if (!item) return;
    const parts = item.split(",");
    if (parts.length >= 3) {
      const hour = parseInt(parts[0]);
      const minute = parseInt(parts[1]);
      const medicine = parts.slice(2).join(",");

      appState.alarms.push({ hour, minute, medicine });

      const alarmElement = document.createElement("div");
      alarmElement.className = "alarm-item";
      alarmElement.innerHTML = `
        <div>
          <span class="alarm-time">${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}</span>
          <span class="alarm-desc">${medicine}</span>
        </div>
      `;
      elements.alarmsList.appendChild(alarmElement);
    }
  });

  if (appState.alarms.length === 0) {
    elements.alarmsList.innerHTML = `
      <div class="alarm-item">
        <span>Nenhum alarme configurado</span>
      </div>
    `;
  }
}

function requestAlarmsList() {
  if (appState.connected) {
    const message = new Paho.Message("1");
    message.destinationName = mqttConfig.topics.list;
    appState.client.send(message);
  }
}

async function addAlarm() {
  const time = document.getElementById('alarmTime').value;
  const medicine = document.getElementById('alarmDesc').value.trim();

  if (!time || !medicine) {
    alert('Preencha todos os campos');
    return;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hour: parseInt(time.split(':')[0]),
        minute: parseInt(time.split(':')[1]),
        medicine
      })
    });

    const data = await response.json();
    if (response.ok) {
      alert('Alarme adicionado com sucesso!');
    } else {
      alert(data.error || 'Erro ao adicionar alarme');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro de conexão');
  }
}

function clearAllAlarms() {
  sendMessage(mqttConfig.topics.clear, "1");
  showStatus("Todos os alarmes foram removidos", "success");
}

function sendMessage(topic, message) {
  if (appState.connected && appState.client) {
    try {
      const msg = new Paho.Message(message);
      msg.destinationName = topic;
      appState.client.send(msg);
      console.log(`Mensagem enviada para ${topic}: ${message}`);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      showStatus("Erro ao enviar mensagem", "error");
    }
  } else {
    showStatus("Erro: Não conectado ao broker MQTT", "error");
  }
}

function showStatus(text, type) {
  elements.statusMessage.textContent = text;
  elements.statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    elements.statusMessage.classList.remove("show");
  }, 3000);
}

function updateConnectionStatus() {
  elements.statusDot.className = `status-dot ${appState.connected ? 'connected' : 'disconnected'}`;
  elements.statusText.textContent = appState.connected ? 'Conectado' : 'Desconectado';
}

window.addEventListener('load', () => {
  initMQTT();
  elements.addAlarmBtn.addEventListener('click', addAlarm);
  elements.cancelAllBtn.addEventListener('click', clearAllAlarms);
});