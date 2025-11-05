const express = require('express');
const cors = require('cors');
const { Cloud } = require('@tuyapi/cloud'); // Knihovna Cloud z @tuyapi
const fs = require('fs'); // Knihovna pro práci se soubory

const app = express();
const PORT = 3000;

// 🚨 VLOŽ ZDE SVÉ SKUTEČNÉ KLÍČE 🚨
const TUYA_CLIENT_ID = 'kruugnjh47qpwgjhevqqnj'; // <--- TVÉ Access ID
const TUYA_SECRET = '6f6b0a0063644dee9976c9c0dbee896e';     // <--- TVŮJ Secret Key

// NASTAVENÍ
const TUYA_REGION = 'eu'; 
const CONFIG_FILE = 'config.json';

let cloud = null;
let deviceId = ''; 

app.use(cors());
app.use(express.json());

// --- FUNKCE PRO NAČTENÍ DEVICE ID ZE SOUBORU config.json ---
function loadConfig() {
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        const config = JSON.parse(configData);
        deviceId = config.MAIN_LIGHT_DEVICE_ID;
    } catch (error) {
        console.error(`[SERVER] Chyba při čtení ${CONFIG_FILE}. Používám placeholder.`);
        deviceId = 'ZATIM_NEMAM_ZASUVKU';
    }
}

// --- FUNKCE PRO ULOŽENÍ NOVÉHO DEVICE ID DO config.json ---
function saveConfig(newDeviceId) {
    const config = { MAIN_LIGHT_DEVICE_ID: newDeviceId };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    deviceId = newDeviceId;
    console.log(`[SERVER] Device ID uloženo a aktualizováno na: ${deviceId}`);
}

// --- INITIALIZACE TUYA CLOUDU ---
function initializeTuya() {
    if (deviceId && deviceId !== 'ZATIM_NEMAM_ZASUVKU') {
        try {
            // Inicializace proběhne POUZE, když máme platné ID
            cloud = new Cloud({
                accessId: TUYA_CLIENT_ID, // opravený název proměnné
                secretKey: TUYA_SECRET,   // opravený název proměnné
                region: TUYA_REGION,
            });
            console.log('✅ Tuya Cloud inicializován s tvými klíči.');
        } catch (error) {
            console.error('--- KRITICKÁ CHYBA PŘI INITIALIZACI TUYA CLOUDU: ZKONTROLUJ KLÍČE ---', error.message);
            cloud = null; // V případě chyby necháme null
        }
    } else {
        console.log('--- Tuya Cloud NENÍ inicializován (chybí Device ID). ---');
        cloud = null;
    }
}

// --- ENDPOINT PRO OVLÁDÁNÍ ZÁSUVKY ---
app.post('/api/light/toggle', async (req, res) => {
    const { action } = req.body;
    const value = action === 'on';

    console.log(`[LPHaus API] PŘÍKAZ PŘIJAT: Akce: ${action}`);

    if (cloud === null) {
        console.warn('[SERVER] Nelze ovládat: Device ID není nastaveno nebo inicializace selhala. Spouštím simulaci.');
        return res.json({ success: true, message: 'Simulace: ID nenastaveno, akce proběhla.' });
    }

    try {
        // Použijeme deviceId načtené z configu
        const result = await cloud.device.control(deviceId, {
            commands: [{ code: 'switch_led', value: value }], // 'switch_led' je běžné ID pro vypínač
        });

        console.log(`[TUYA] Akce '${action}' odeslána pro ID: ${deviceId}`);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[TUYA] Chyba při odesílání příkazu:', error.message);
        res.status(500).json({ success: false, error: 'Chyba při komunikaci s Tuya Cloud.' });
    }
});

// --- NOVÝ ENDPOINT PRO ZÍSKÁNÍ/NASTAVENÍ Device ID (Konfigurace) ---

// 1. Získání aktuálního Device ID
app.get('/api/config', (req, res) => {
    res.json({ deviceId: deviceId });
});

// 2. Nastavení nového Device ID
app.post('/api/config', (req, res) => {
    const { newDeviceId } = req.body;

    if (!newDeviceId || typeof newDeviceId !== 'string' || newDeviceId.length < 10) {
        return res.status(400).json({ success: false, error: 'Neplatné Device ID (příliš krátké).' });
    }

    saveConfig(newDeviceId); // Uloží ID do souboru a proměnné
    initializeTuya(); // Zkusí znovu inicializovat Tuya Cloud s novým ID

    res.json({ success: true, message: 'Device ID úspěšně nastaveno.', deviceId: deviceId });
});


// --- SPUŠTĚNÍ SERVERU ---
loadConfig(); // Načte ID při startu
initializeTuya(); // Zkusí inicializovat Tuya

app.listen(PORT, () => {
    console.log(`-----------------------------------------------------`);
    console.log(`✅ LPHaus API Server běží na http://localhost:${PORT}`);
    console.log(`-----------------------------------------------------`);
});