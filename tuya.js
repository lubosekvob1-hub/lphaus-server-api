// tuya.js - Třída pro komunikaci s Tuya Cloud
const axios = require('axios');
const crypto = require('crypto');

class TuyaCloud {
    constructor({ accessId, accessKey, region = 'eu' }) {
        this.accessId = accessId;
        this.accessKey = accessKey;
        this.endpoint = `https://openapi.tuya${region}.com`;
        this.token = null;
        this.expireTime = 0;
    }

    // --- Autentizace a token ---
    async getToken() {
        // Kontrola, zda je token platný
        if (this.token && Date.now() < this.expireTime) {
            return this.token;
        }

        const path = '/v1.0/token?grant_type=1';
        const url = this.endpoint + path;
        const t = Date.now();
        const nonce = '';
        
        const signData = [this.accessId, t, nonce, 'GET', path];
        const sign = this.getSign(signData);

        try {
            const response = await axios.get(url, {
                headers: {
                    'client_id': this.accessId,
                    'sign': sign,
                    't': t,
                    'sign_method': 'HMAC-SHA256'
                }
            });

            if (response.data && response.data.result) {
                const result = response.data.result;
                this.token = result.access_token;
                this.expireTime = Date.now() + (result.expire_time * 1000) - 60000; // Platnost mínus 1 minuta rezerva
                return this.token;
            } else {
                console.error("Chyba při získávání tokenu Tuya:", response.data);
                throw new Error("Chyba při získávání tokenu Tuya.");
            }
        } catch (error) {
            console.error("Síťová chyba při získávání tokenu Tuya:", error.message);
            throw new Error("Chyba při komunikaci s Tuya API.");
        }
    }

    getSign(signData, body = '') {
        const signStr = signData.join('\n');
        const content = signStr + (body ? '\n' + body : '');

        return crypto
            .createHmac('sha256', this.accessKey)
            .update(content)
            .digest('hex')
            .toUpperCase();
    }
    
    // --- Ovládání zařízení ---
    async setDeviceStatus(deviceId, commands) {
        const token = await this.getToken();
        const path = `/v1.0/devices/${deviceId}/commands`;
        const url = this.endpoint + path;
        const t = Date.now();
        const nonce = '';
        const method = 'POST';
        
        const body = JSON.stringify({ commands });
        
        const signData = [this.accessId, token, t, nonce, method, path];
        const sign = this.getSign(signData, body);

        try {
            const response = await axios.post(url, { commands }, {
                headers: {
                    'client_id': this.accessId,
                    'sign': sign,
                    't': t,
                    'sign_method': 'HMAC-SHA256',
                    'access_token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.success) {
                return { success: true, data: response.data };
            } else {
                console.error(`Chyba při ovládání zařízení ${deviceId}:`, response.data);
                return { success: false, data: response.data };
            }

        } catch (error) {
            console.error(`Síťová chyba při ovládání zařízení ${deviceId}:`, error.message);
            throw new Error("Chyba při komunikaci s Tuya API (ovládání).");
        }
    }
}

module.exports = { TuyaCloud };