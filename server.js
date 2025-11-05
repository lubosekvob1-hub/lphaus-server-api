// server.js - LPHaus API Server (Opravená verze s Místnostmi)
const express = require('express');
const { TuyaCloud } = require('./tuya.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ***************************************************************
// * 1. ZDE MUSÍTE DEFINOVAT MÍSTNOSTI A DEVICE ID               *
// ***************************************************************

let devices = {
    obývací_pokoj: {
        id: 'obývací_pokoj',
        název: 'Obývací Pokoj',
        zařízení: [
            // ZMĚŇTE TOTO: Vložte svá skutečná Device ID sem!
            { jméno: 'Hlavní Světlo', deviceId: 'VAŠE_SKUTECNE_ID_SVETLO_1', kód_funkce: 'switch_1' }, 
            { jméno: 'TV Zásuvka', deviceId: 'VAŠE_SKUTECNE_ID_ZASUVKA_2', kód_funkce: 'switch_1' }
        ]
    },
    koupelna: {
        id: 'koupelna',
        název: 'Koupelna',
        zařízení: [
            { jméno: 'Osvětlení', deviceId: 'VAŠE_SKUTECNE_ID_KOUPELNA_3', kód_funkce: 'switch_1' }
        ]
    }
};

let tuya;

app.use(express.json());

app.use((req, res, next) => {
    // Toto umožňuje přístup z Expo aplikace (CORS)
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

// Získá první ID pro účely inicializace Tuya Cloud
function getInitialDeviceId() {
    for (const room in devices) {
        if (devices[room].zařízení.length > 0) {
            return devices[room].zařízení[0].deviceId;
        }
    }
    return ''; 
}


// --- API ENDPOINTY ---

// A. Endpoint pro získání celé mapy zařízení (Místnosti)
app.get('/api/devices', (req, res) => {
    // Aplikace zavolá tento endpoint, aby získala seznam místností
    res.json(devices);
});

// B. Univerzální Endpoint pro zapnutí/vypnutí libovolného zařízení
// Očekává POST tělo: { deviceId: 'SKUTECNE_TUYA_ID', state: true/false, code: 'switch_1' }
app.post('/api/device/toggle', async (req, res) => {
    const { deviceId, state, code = 'switch_1' } = req.body; 

    if (!deviceId || deviceId.length < 10) {
        console.log('[LOG] CHYBA: Chybí Device ID pro ovládání. SIMULACE.');
        // Vrací 200 OK s upozorněním, aby aplikace fungovala i bez ID
        return res.json({ success: true, message: 'OK (SIMULACE - chybí ID)' }); 
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


// C. Endpoint pro získání prvního Device ID pro kompatibilitu
app.get('/api/config', (req, res) => {
    res.json({ deviceId: getInitialDeviceId() });
});


// --- SPUŠTĚNÍ SERVERU ---
initializeTuya(); 

app.listen(PORT, () => {
    console.log(`[SERVER] LPHaus API Server běží na http://localhost:${PORT}`);
    const firstId = getInitialDeviceId();
    if (firstId && firstId.includes('VAŠE_SKUTECNE_ID')) {
        console.warn(`[SERVER] EXTRÉMNÍ UPOZORNĚNÍ: Používáte zástupná Device ID! Server nemusí fungovat.`);
    } else if (firstId) {
        console.log(`[SERVER] Tuya Cloud inicializován s prvním Device ID: ${firstId}`);
    } else {
        console.warn(`[SERVER] UPOZORNĚNÍ: Žádná Device ID nenalezena. Server běží v SIMULAČNÍM režimu.`);
    }
});