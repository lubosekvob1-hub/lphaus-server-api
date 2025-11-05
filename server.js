// server.js - API Server pro LPHaus
const express = require('express');
const { TuyaCloud } = require('./tuya.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = 'config.json';
let deviceId = '';

app.use(express.json());

// Povolit CORS (Cross-Origin Resource Sharing) pro komunikaci s aplikací
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

let tuya;

// --- FUNKCE PRO NASTAVENÍ A INICIALIZACI ---

// 1. Inicializuje Tuya Cloud s aktuálním Device ID
function initializeTuya() {
    // Vytvoření instance klienta Tuya Cloud s klíči
    tuya = new TuyaCloud({
        accessId: process.env.TUYA_ACCESS_ID,
        accessKey: process.env.TUYA_ACCESS_KEY,
        // DŮLEŽITÉ: REGION musíte nastavit správně (eu, us, atd.)
        region: process.env.TUYA_REGION || 'eu', 
    });
}

// 2. Ukládá konfiguraci (Device ID) do souboru
function saveConfig(newDeviceId) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ deviceId: newDeviceId }));
    deviceId = newDeviceId;
}

// 3. Načítá konfiguraci ze souboru nebo používá placeholder
function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        deviceId = config.deviceId;
    } catch (error) {
        console.error(`[SERVER] Chyba při čtení ${CONFIG_FILE}. Používám placeholder.`);
        
        // *******************************************************************
        // * ZDE JE MÍSTO PRO VLOŽENÍ VAŠEHO SKUTEČNÉHO DEVICE ID Z TUYA *
        // *******************************************************************
        deviceId = 'ZDE_VLOZTE_TVOJE_SKUTECNE_DEVICE_ID_Z_TUYA'; // ZASTUPNÝ TEXT PRO SIMULACI/PRVNÍ SPUŠTĚNÍ
    }
}


// --- API ENDPOINTY ---

// A. Endpoint pro zapnutí/vypnutí světla (HLAVNÍ FUNKCE)
app.post('/api/light/toggle', async (req, res) => {
    if (!deviceId || deviceId.length < 10) {
        // SIMULACE: Pokud není platné Device ID, pouze simulujeme OK
        console.log('[LOG] SIMULACE: Přepínání stavu zásuvky (chybí Device ID).');
        return res.json({ success: true, data: 'OK' }); 
    }

    try {
        const status = await tuya.getDeviceStatus(deviceId);
        const currentPower = status.find(item => item.code === 'switch_1').value;
        const newPower = !currentPower;

        const result = await tuya.setDeviceStatus(deviceId, [{
            code: 'switch_1',
            value: newPower,
        }]);

        if (result.success) {
            console.log(`[LOG] TUYA: Příkaz k přepnutí na stav ${newPower} odeslán úspěšně.`);
            return res.json({ success: true, data: result.success });
        } else {
            // Chyba v komunikaci s Tuya Cloud
            console.error('[TUYA] Chyba: Komunikace s Tuya Cloud selhala.');
            return res.status(500).json({ success: false, error: 'Chyba při komunikaci s Tuya Cloud.' });
        }
    } catch (error) {
        console.error('[TUYA] Chyba při odesílání příkazu:', error.message);
        return res.status(500).json({ success: false, error: 'Chyba při komunikaci s Tuya Cloud.' });
    }
});


// B. Endpoint pro získání aktuálního Device ID (Konfigurace)
app.get('/api/config', (req, res) => {
    res.json({ deviceId: deviceId });
});

// C. Endpoint pro nastavení nového Device ID (Konfigurace)
app.post('/api/config', (req, res) => {
    const { newDeviceId } = req.body;
    if (!newDeviceId || typeof newDeviceId !== 'string' || newDeviceId.length < 10) {
        return res.status(400).json({ success: false, error: 'Neplatné Device ID (příliš krátké).' });
    }

    saveConfig(newDeviceId); // Uloží ID do souboru a proměnné
    initializeTuya(); // Znovu inicializuje Tuya Cloud s novým ID
    
    res.json({ success: true, message: 'Device ID úspěšně nastaveno.', deviceId: deviceId });
});


// --- SPUŠTĚNÍ SERVERU ---
loadConfig(); // Načte Device ID při startu
initializeTuya(); // Inicializuje Tuya s Device ID

app.listen(PORT, () => {
    console.log(`[SERVER] LPHaus API Server běží na http://localhost:${PORT}`);
    if (deviceId && deviceId.length > 10) {
        console.log(`[SERVER] Tuya Cloud inicializován s Device ID: ${deviceId}`);
    } else {
        console.warn(`[SERVER] UPOZORNĚNÍ: Používám placeholder. Je třeba nastavit skutečné Device ID.`);
    }
});