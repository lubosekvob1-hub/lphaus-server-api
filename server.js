// server.js - API Server pro LPHaus (Verze s Místnostmi)
const express = require('express');
const { TuyaCloud } = require('./tuya.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = 'config.json';

// ***************************************************************
// * 1. ZDE MUSÍTE DEFINOVAT MÍSTNOSTI A DEVICE ID               *
// ***************************************************************

let devices = {
    obývací_pokoj: {
        id: 'obývací_pokoj',
        název: 'Obývací Pokoj',
        zařízení: [
            // Nahraďte ZÁSTUPNÉ ID skutečnými ID z Tuya IoT!
            { jméno: 'Hlavní Světlo', deviceId: 'ZDE_ID_OBAVACI_SVETLO_TUYA', kód_funkce: 'switch_1' }, 
            { jméno: 'TV Zásuvka', deviceId: 'ZDE_ID_OBYVACI_ZASUVKA_TUYA', kód_funkce: 'switch_1' }
        ]
    },
    koupelna: {
        id: 'koupelna',
        název: 'Koupelna',
        zařízení: [
            { jméno: 'Osvětlení', deviceId: 'ZDE_ID_KOUPELNA_OSVETLENI_TUYA', kód_funkce: 'switch_1' }
        ]
    }
    // Zde můžete přidat další místnosti a zařízení
};

let tuya;

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// --- FUNKCE PRO NASTAVENÍ A INICIALIZACI ---

function initializeTuya() {
    tuya = new TuyaCloud({
        accessId: process.env.TUYA_ACCESS_ID,
        accessKey: process.env.TUYA_ACCESS_KEY,
        region: process.env.TUYA_REGION || 'eu', 
    });
}

// Při startu použijeme jako initialDeviceId první ID z celé struktury (jen pro inicializaci)
function getInitialDeviceId() {
    for (const room in devices) {
        if (devices[room].zařízení.length > 0) {
            return devices[room].zařízení[0].deviceId;
        }
    }
    return ''; // Prázdné, pokud nejsou žádná zařízení
}

// Vzhledem ke komplexnosti to zjednodušíme. Načítání z config.json teď přeskočíme.
function loadConfig() {
    // Tuto funkci nyní zjednodušíme, ID jsou definována přímo v proměnné 'devices'.
}


// --- API ENDPOINTY ---

// A. Endpoint pro získání celé mapy zařízení (Místnosti)
app.get('/api/devices', (req, res) => {
    // Pošleme celou strukturu místností a zařízení aplikaci
    res.json(devices);
});

// B. Univerzální Endpoint pro zapnutí/vypnutí libovolného zařízení
// Očekává POST tělo: { deviceId: 'SKUTECNE_TUYA_ID', state: true/false, code: 'switch_1' }
app.post('/api/device/toggle', async (req, res) => {
    const { deviceId, state, code = 'switch_1' } = req.body; 

    if (!deviceId || deviceId.length < 10) {
        console.log('[LOG] CHYBA: Chybí Device ID pro ovládání. SIMULACE.');
        // Vrátíme simulaci, pokud chybí ID, aby aplikace nehavarovala
        return res.json({ success: true, data: 'OK (SIMULACE - chybí ID)' }); 
    }

    try {
        const result = await tuya.setDeviceStatus(deviceId, [{
            code: code,
            value: state, 
        }]);

        if (result.success) {
            console.log(`[LOG] TUYA: Příkaz k přepnutí zařízení ${deviceId} na stav ${state} odeslán úspěšně.`);
            return res.json({ success: true, data: result.success });
        } else {
            console.error('[TUYA] Chyba: Komunikace s Tuya Cloud selhala.');
            return res.status(500).json({ success: false, error: 'Chyba při komunikaci s Tuya Cloud.' });
        }
    } catch (error) {
        console.error('[TUYA] Chyba při odesílání příkazu:', error.message);
        return res.status(500).json({ success: false, error: 'Chyba při komunikaci s Tuya Cloud.' });
    }
});


// C. Ponecháme staré /api/config pro kompatibilitu, ale zjednodušíme ho
app.get('/api/config', (req, res) => {
    res.json({ deviceId: getInitialDeviceId() });
});


// --- SPUŠTĚNÍ SERVERU ---
loadConfig(); 
initializeTuya(); 

app.listen(PORT, () => {
    console.log(`[SERVER] LPHaus API Server běží na http://localhost:${PORT}`);
    const firstId = getInitialDeviceId();
    if (firstId) {
        console.log(`[SERVER] Tuya Cloud inicializován s prvním Device ID: ${firstId}`);
    } else {
        console.warn(`[SERVER] UPOZORNĚNÍ: Žádná Device ID nenalezena. Server běží v SIMULAČNÍM režimu.`);
    }
});