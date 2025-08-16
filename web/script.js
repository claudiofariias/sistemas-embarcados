const mqttConfig = {
  host: "broker.hivemq.com",
  port: 8000,
  path: "/mqtt",
  clientId: "web_" + Math.random().toString(16).substr(2, 8),
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

// ========== INICIALIZAÇÃO MQTT ========== //
function initMQTT() {
  appState.client = new Paho.MQTT.Client(
    mqttConfig.host,
    mqttConfig.port,
    mqttConfig.path,
    mqttConfig.clientId
  );

  appState.client.onConnectionLost = (response) => {
    console.log("Conexão perdida:", response.errorMessage);
    appState.connected = false;
    updateConnectionStatus();
    setTimeout(initMQTT, 5000);
  };

  appState.client.onMessageArrived = (message) => {
    console.log("Mensagem recebida:", message.destinationName, message.payloadString);
    if (message.destinationName === mqttConfig.topics.status) {
      showStatus(message.payloadString, "success");
    } else if (message.destinationName === mqttConfig.topics.list) {
      updateAlarmsList(message.payloadString);
    }
  };

  const connectOptions = {
    timeout: 3,
    onSuccess: () => {
      console.log("Conectado ao broker MQTT");
      appState.connected = true;
      updateConnectionStatus();
      appState.client.subscribe(mqttConfig.topics.status);
      appState.client.subscribe(mqttConfig.topics.list);
      requestAlarmsList();
    },
    onFailure: (error) => {
      console.error("Falha na conexão:", error.errorMessage);
      setTimeout(initMQTT, 5000);
    }
  };

  appState.client.connect(connectOptions);
}

// ========== ATUALIZA A LISTA DE ALARMES ========== //
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

// ========== SOLICITA A LISTA DE ALARMES ========== //
function requestAlarmsList() {
  if (appState.connected) {
    const message = new Paho.MQTT.Message("1");
    message.destinationName = mqttConfig.topics.list;
    appState.client.send(message);
  }
}

// ========== ADICIONA UM NOVO ALARME ========== //
function addAlarm() {
  const time = elements.alarmTimeInput.value;
  const desc = elements.alarmDescInput.value.trim();

  if (!time || !desc) {
    showStatus("Preencha todos os campos", "error");
    return;
  }

  const [hours, minutes] = time.split(':');

  // Envia os dados para o ESP32 via MQTT
  sendMessage(mqttConfig.topics.hour, hours);
  sendMessage(mqttConfig.topics.minute, minutes);
  sendMessage(mqttConfig.topics.medicine, desc);

  // Comando para adicionar o alarme
  sendMessage(mqttConfig.topics.add, "1");

  // Limpa os campos
  elements.alarmTimeInput.value = "";
  elements.alarmDescInput.value = "";

  showStatus("Alarme adicionado com sucesso!", "success");
}

// ========== LIMPA TODOS OS ALARMES ========== //
function clearAllAlarms() {
  sendMessage(mqttConfig.topics.clear, "1");
  showStatus("Todos os alarmes foram removidos", "success");
}

// ========== ENVIA MENSAGEM MQTT ========== //
function sendMessage(topic, message) {
  if (appState.connected) {
    const msg = new Paho.MQTT.Message(message);
    msg.destinationName = topic;
    appState.client.send(msg);
    console.log(`[MQTT] Enviado: ${topic} | ${message}`);
  } else {
    showStatus("Erro: Não conectado ao broker MQTT", "error");
  }
}

// ========== MOSTRA MENSAGEM DE STATUS ========== //
function showStatus(text, type) {
  elements.statusMessage.textContent = text;
  elements.statusMessage.className = `status-message show ${type}`;

  setTimeout(() => {
    elements.statusMessage.classList.remove("show");
  }, 3000);
}

// ========== ATUALIZA O STATUS DA CONEXÃO ========== //
function updateConnectionStatus() {
  elements.statusDot.className = `status-dot ${appState.connected ? 'connected' : 'disconnected'}`;
  elements.statusText.textContent = appState.connected ? 'Conectado' : 'Desconectado';
}

// ========== INICIALIZA O APP ========== //
window.addEventListener('load', () => {
  initMQTT();
  
  // Event Listeners
  elements.addAlarmBtn.addEventListener('click', addAlarm);
  elements.cancelAllBtn.addEventListener('click', clearAllAlarms);
});