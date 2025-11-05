// server.js - LPHaus API Server (Simulační Verze s Místnostmi)
const express = require('express');
const { TuyaCloud } = require('./tuya.js'); 
const app = express();
const PORT = process.env.PORT || 3000;

// ***************************************************************
// * SIMULAČNÍ KONFIGURACE MÍSTNOSTÍ A STAVU ZAŘÍZENÍ            *
// ***************************************************************

let devices = {
    obývací_pokoj: {
        id: 'obývací_pokoj',
        název: 'Obývací Pokoj',
        zařízení: [
            // Simulační zařízení. Status bude přepínán lokálně.
            { jméno: 'Hlavní Světlo', deviceId: 'SIMULACE_ID_SVETLO_1', kód_funkce: 'switch_1', status: false }, 
            { jméno: 'TV Zásuvka', deviceId: 'SIMULACE_ID_ZASUVKA_2', kód_funkce: 'switch_1', status: false }
        ]
    },
    koupelna: {
        id: 'koupelna',
        název: 'Koupelna',
        zařízení: [
            { jméno: 'Osvětlení', deviceId: 'SIMULACE_ID_KOUPELNA_3', kód_funkce: 'switch_1', status: false }
        ]
    }
};

let tuya;

app.use(express.json());

app.use((req, res, next) => {
    // CORS pro Expo
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

function initializeTuya() {
    tuya = new TuyaCloud({
        accessId: process.env.TUYA_ACCESS_ID || 'SIMULACE',
        accessKey: process.env.TUYA_ACCESS_KEY || 'SIMULACE',
        region: process.env.TUYA_REGION || 'eu', 
    });
}

// A. Endpoint pro získání celé mapy zařízení (Místnosti)
app.get('/api/devices', (req, res) => {
    res.json(devices);
});

// B. Endpoint pro zapnutí/vypnutí (Simulace)
app.post('/api/device/toggle', async (req, res) => {
    const { deviceId, state, code = 'switch_1' } = req.body; 

    // **SIMULACE LOGIKA:** Měníme stav zařízení v lokální paměti.
    for (const room in devices) {
        let device = devices[room].zařízení.find(d => d.deviceId === deviceId);
        if (device) {
            device.status = state;
            break; 
        }
    }

    try {
        await tuya.setDeviceStatus(deviceId, [{ code: code, value: state }]);
        console.log(`[LOG] SIMULACE: Zařízení ${deviceId} přepnuto na stav ${state} v paměti.`);
        return res.json({ success: true, message: 'OK (Simulace úspěšná)' });
    } catch (error) {
        return res.json({ success: true, message: 'OK (Simulace s chybou Tuya ignorována)' });
    }
});

// C. Kompatibilní endpoint
app.get('/api/config', (req, res) => {
    res.json({ deviceId: 'SIMULACE_SERVER' });
});


// --- SPUŠTĚNÍ SERVERU ---
initializeTuya(); 

app.listen(PORT, () => {
    console.log(`[SERVER] LPHaus API Server běží na http://localhost:${PORT}`);
    console.warn(`[SERVER] EXTRÉMNÍ UPOZORNĚNÍ: Server běží v simulačním režimu.`);
});