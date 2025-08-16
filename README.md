
# Medicine Reminder System - ESP32

## Descrição do Projeto

Este projeto consiste em um **Sistema de Lembrete de Medicamentos** baseado em **ESP32**. Ele utiliza a conectividade **Wi-Fi** e **MQTT** para receber mensagens que configuram alarmes para lembrar o usuário de tomar medicamentos. O sistema é composto por um display **OLED**, um **buzzer**, um **LED** e um **botão** para interação.

### Funcionalidades:

- **Adicionar alarmes** para medicamentos com hora e minuto específicos.
- **Exibir os próximos alarmes** no display OLED.
- **Alarme sonoro** e visual com buzzer e LED.
- **Controle via MQTT** para adicionar, remover ou listar alarmes.
- **Integração com servidor NTP** para hora atual.

## Componentes Usados

- **ESP32** - Placa principal do projeto.
- **Display OLED SSD1306** - Para exibir informações sobre os alarmes e o horário atual.
- **Buzzer** - Para gerar o som de alerta quando o alarme for disparado.
- **LED** - Para indicar visualmente que o alarme está sendo acionado.
- **Botão** - Para interromper o alarme.

## Como Executar o Projeto

### Ferramentas Necessárias

- **Arduino IDE** (ou PlatformIO)
- **Bibliotecas necessárias**:
  - `WiFi.h` - Para conectividade Wi-Fi.
  - `PubSubClient.h` - Para comunicação MQTT.
  - `Adafruit_SSD1306.h` - Para controlar o display OLED.
  - `Adafruit_GFX.h` - Para funções gráficas do display OLED.
  - `WiFiUdp.h` e `NTPClient.h` - Para sincronização de hora via NTP.
- **MQTT Broker**: `broker.hivemq.com` (ou outro broker MQTT de sua preferência)

### Passos para Configuração

1. **Instalar o Arduino IDE**:
   - Baixe e instale o [Arduino IDE](https://www.arduino.cc/en/software).
   
2. **Instalar as Bibliotecas Necessárias**:
   - Abra o Arduino IDE.
   - Vá para **Sketch** > **Incluir Biblioteca** > **Gerenciar Bibliotecas**.
   - Instale as bibliotecas:
     - `WiFi`
     - `PubSubClient`
     - `Adafruit SSD1306`
     - `Adafruit GFX`
     - `WiFiUdp`
     - `NTPClient`

3. **Configurar o Código**:
   - No código fornecido, altere as variáveis `ssid` e `pass` para os dados da sua rede Wi-Fi.
   - Caso queira utilizar um broker MQTT personalizado, altere as variáveis relacionadas ao **broker MQTT**.

4. **Carregar o Código no ESP32**:
   - Selecione a placa **ESP32** no Arduino IDE.
   - Conecte o ESP32 ao computador e faça o upload do código.

5. **Conectar ao Broker MQTT**:
   - O sistema se conectará automaticamente ao **broker MQTT** especificado.
   - A partir daí, você pode começar a controlar os alarmes via MQTT enviando mensagens para os tópicos especificados.

### Tópicos MQTT:

- **medicine_reminder/hour** - Para definir a hora do alarme.
- **medicine_reminder/minute** - Para definir o minuto do alarme.
- **medicine_reminder/medicine** - Para definir o nome do medicamento.
- **medicine_reminder/add** - Para adicionar um novo alarme (valor "1" no payload).
- **medicine_reminder/clear** - Para remover todos os alarmes (valor "1" no payload).
- **medicine_reminder/status** - Para receber status sobre o sistema.
- **medicine_reminder/list** - Para listar todos os alarmes configurados.

### Como Interagir via Web

O sistema também pode ser controlado via **aplicativo Web**, que se conecta ao mesmo broker MQTT para interagir com o ESP32. O código JavaScript principal do repositório é responsável por enviar as mensagens para configurar os alarmes, adicionar novos, limpar alarmes existentes e obter o status.



## Conclusão

Este sistema pode ser controlado tanto pelo **ESP32** quanto através de um **aplicativo web** que interage via MQTT. O aplicativo permite a adição, remoção e listagem de alarmes diretamente na interface web, tornando a solução ainda mais flexível.