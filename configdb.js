const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://USER:PASSWORD@cluster.mongodb.net/SOLOMINI1';

const ConfigSchema = new mongoose.Schema({
    number: { type: String, unique: true, required: true },
    data: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Config = mongoose.model('Config', ConfigSchema);
const defaultSettings = {
    AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'true',
    AUTO_LIKE_EMOJI: ['💋', '🍬', '💗', '🎈', '🎉', '🥳', '❤️', '🧫', '🐭'],
    AUTO_RECORDING: 'false',
    AUTO_TYPING: 'false',
    ALWAYS_ONLINE: 'false',
    PRESENCE: 'available',
    WORK_TYPE: 'public',
    AUTO_READ_MESSAGE: 'off',
    ANTI_DELETE: 'on',
    ANTI_CALL: 'off',
    AUTO_REPLY: 'on',
    AUTO_REPLY_TRIGGERS: {
        "hi": { replyType: "text", content: "Hello 👋", caption: "" },
        "hello": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" },
        "bye": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/bye-bye-see-you-later.mp3", caption: "" },
        "gm": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/tiktok-star-hi-hi-good-morning-kid-toddler.mp3", caption: "" },
        "online": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/its-my-life.mp3", caption: "" },
        "හුකහන්": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/asahane.mp3", caption: "" },
        "pakaya": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ane-kata-wahapiya.mp3", caption: "" },
        "හයි": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" }
    },
    PREFIX: '.',
    BOT_NAME: 'SOLO LEVELING BOT',
    BOT_FOOTER: '⛩️ 𝘚𝘖𝘓𝘖 𝘓𝘌𝘝𝘌𝘓𝘐𝘕𝘎 𝘟 ⛩️',
    BOT_LOGO_URL: 'https://i.ibb.co/hjKj81d/solo-leveling.jpg',
    MAX_RETRIES: 3,
    GROUP_INVITE_LINK: 'https://chat.whatsapp.com/GZhtZL0KKdRF2VfQFuUxOE',
    ADMIN_LIST_PATH: './admin.json',
    NEWSLETTER_JID: '120363403127547914@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 9999999,
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbBqGK64dTnC22fWR92k'
};
let isConnected = false;
async function connectdb() {
    if (isConnected) {
        console.log('[CONFIG DB] Already connected to MongoDB');
        return;
    }
    
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        isConnected = true;
        console.log('[CONFIG DB] ✅ Connected to MongoDB');
    } catch (error) {
        console.error('[CONFIG DB] ❌ Connection failed:', error.message);
      
        setTimeout(connectdb, 5000);
    }
}
async function get(key, number) {
    try {
        if (!number) {
            console.warn('[CONFIG DB] No number provided for get()');
            return defaultSettings[key];
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const config = await Config.findOne({ number: sanitizedNumber });
        
        if (!config || !config.data) {
            return defaultSettings[key];
        }
        
        const value = config.data[key];
        return value !== undefined ? value : defaultSettings[key];
        
    } catch (error) {
        console.error('[CONFIG DB] Get error:', error.message);
        return defaultSettings[key];
    }
}
async function input(key, value, number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for input()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        await Config.updateOne(
            { number: sanitizedNumber },
            { 
                $set: { 
                    [`data.${key}`]: value,
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );
        
        console.log(`[CONFIG DB] ✅ Updated ${key} for ${sanitizedNumber}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Input error:', error.message);
        return false;
    }
}
async function getalls(number) {
    try {
        if (!number) {
            console.warn('[CONFIG DB] No number provided for getalls()');
            return { ...defaultSettings };
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const config = await Config.findOne({ number: sanitizedNumber });
        
        if (!config || !config.data) {
            return { ...defaultSettings };
        }
       
        return { ...defaultSettings, ...config.data };
        
    } catch (error) {
        console.error('[CONFIG DB] Get all error:', error.message);
        return { ...defaultSettings };
    }
}
async function ensureConfig(number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for ensureConfig()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const existing = await Config.findOne({ number: sanitizedNumber });
        
        if (!existing) {
            await Config.create({ 
                number: sanitizedNumber, 
                data: { ...defaultSettings },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`[CONFIG DB] ✅ Created default config for ${sanitizedNumber}`);
        } else {
            const currentData = existing.data || {};
            let needsUpdate = false;
            const updatedData = { ...currentData };
            
            for (const key of Object.keys(defaultSettings)) {
                if (updatedData[key] === undefined) {
                    updatedData[key] = defaultSettings[key];
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                await Config.updateOne(
                    { number: sanitizedNumber },
                    { $set: { data: updatedData, updatedAt: new Date() } }
                );
                console.log(`[CONFIG DB] ✅ Updated missing defaults for ${sanitizedNumber}`);
            }
        }
        
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Ensure config error:', error.message);
        return false;
    }
}
async function resetSettings(number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for resetSettings()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        
        await Config.updateOne(
            { number: sanitizedNumber },
            { 
                $set: { 
                    data: { ...defaultSettings },
                    updatedAt: new Date()
                } 
            },
            { upsert: true }
        );
        
        console.log(`[CONFIG DB] ✅ Reset config for ${sanitizedNumber}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Reset error:', error.message);
        return false;
    }
}
async function deleteConfig(number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for deleteConfig()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Config.deleteOne({ number: sanitizedNumber });
        
        console.log(`[CONFIG DB] ✅ Deleted config for ${sanitizedNumber}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Delete error:', error.message);
        return false;
    }
}
async function addAutoReplyTrigger(number, trigger, replyType, content, caption = "") {
    try {
        if (!number || !trigger || !replyType || !content) {
            console.error('[CONFIG DB] Missing parameters for addAutoReplyTrigger()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const currentTriggers = await get('AUTO_REPLY_TRIGGERS', sanitizedNumber) || {};
        
        currentTriggers[trigger.toLowerCase()] = {
            replyType: replyType.toLowerCase(),
            content: content,
            caption: caption
        };
        
        await input('AUTO_REPLY_TRIGGERS', currentTriggers, sanitizedNumber);
        
        console.log(`[CONFIG DB] ✅ Added auto-reply trigger: ${trigger}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Add trigger error:', error.message);
        return false;
    }
}
async function removeAutoReplyTrigger(number, trigger) {
    try {
        if (!number || !trigger) {
            console.error('[CONFIG DB] Missing parameters for removeAutoReplyTrigger()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const currentTriggers = await get('AUTO_REPLY_TRIGGERS', sanitizedNumber) || {};
        
        const triggerKey = trigger.toLowerCase();
        
        if (!currentTriggers[triggerKey]) {
            console.log(`[CONFIG DB] Trigger not found: ${trigger}`);
            return false;
        }
        
        delete currentTriggers[triggerKey];
        await input('AUTO_REPLY_TRIGGERS', currentTriggers, sanitizedNumber);
        
        console.log(`[CONFIG DB] ✅ Removed auto-reply trigger: ${trigger}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Remove trigger error:', error.message);
        return false;
    }
}
async function getAutoReplyTriggers(number) {
    try {
        if (!number) {
            return defaultSettings.AUTO_REPLY_TRIGGERS;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        return await get('AUTO_REPLY_TRIGGERS', sanitizedNumber) || defaultSettings.AUTO_REPLY_TRIGGERS;
        
    } catch (error) {
        console.error('[CONFIG DB] Get triggers error:', error.message);
        return defaultSettings.AUTO_REPLY_TRIGGERS;
    }
}
async function clearAutoReplyTriggers(number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for clearAutoReplyTriggers()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await input('AUTO_REPLY_TRIGGERS', {}, sanitizedNumber);
        
        console.log(`[CONFIG DB] ✅ Cleared all auto-reply triggers for ${sanitizedNumber}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Clear triggers error:', error.message);
        return false;
    }
}
async function resetAutoReplyTriggers(number) {
    try {
        if (!number) {
            console.error('[CONFIG DB] No number provided for resetAutoReplyTriggers()');
            return false;
        }
        
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await input('AUTO_REPLY_TRIGGERS', defaultSettings.AUTO_REPLY_TRIGGERS, sanitizedNumber);
        
        console.log(`[CONFIG DB] ✅ Reset auto-reply triggers to default for ${sanitizedNumber}`);
        return true;
        
    } catch (error) {
        console.error('[CONFIG DB] Reset triggers error:', error.message);
        return false;
    }
}
function getDefaultSettings() {
    return { ...defaultSettings };
}
function isValidSetting(key) {
    return defaultSettings.hasOwnProperty(key);
}
async function getAllConfiguredNumbers() {
    try {
        const configs = await Config.find({}, 'number').lean();
        return configs.map(c => c.number);
    } catch (error) {
        console.error('[CONFIG DB] Get all numbers error:', error.message);
        return [];
    }
}

module.exports = {
    connectdb,
    input,
    get,
    getalls,
    ensureConfig,
    resetSettings,
    deleteConfig,
    addAutoReplyTrigger,
    removeAutoReplyTrigger,
    getAutoReplyTriggers,
    clearAutoReplyTriggers,
    resetAutoReplyTriggers,
    getDefaultSettings,
    isValidSetting,
    getAllConfiguredNumbers,
    defaultSettings
};
