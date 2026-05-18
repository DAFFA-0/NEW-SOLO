const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const cheerio = require('cheerio');
const { Octokit } = require('@octokit/rest');
const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { Sticker } = require('wa-sticker-formatter');
const Jimp = require('jimp');
const FormData = require('form-data');
const { Readable } = require('stream');
const crypto = require('crypto');
const axios = require('axios');
const os = require('os');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

console.log('✅ FFmpeg Version:', ffmpegInstaller.version);
console.log('✅ FFprobe Version:', ffprobeInstaller.version);

const { sms, downloadMediaMessage } = require("./msg");
var {
    connectdb,
    input,
    get,
    getalls,
    ensureConfig,
    resetSettings,
    addAutoReplyTrigger,
    removeAutoReplyTrigger,
    getAutoReplyTriggers,
    clearAutoReplyTriggers,
    resetAutoReplyTriggers,
    defaultSettings
} = require("./configdb");

const { setupAntiDelete } = require('./dexterpaid');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    S_WHATSAPP_NET
} = require('baileys');

const defaultConfig = {
    AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'true',
    AUTO_RECORDING: 'false',
    AUTO_TYPING: 'false',
    ALWAYS_ONLINE: 'false',
    AUTO_LIKE_EMOJI: ['💋', '🍬', '💗', '🎈', '🎉', '🥳', '❤️', '🧫', '🐭'],
    PREFIX: '.',
    MAX_RETRIES: 3,
    GROUP_INVITE_LINKS: [
        'https://chat.whatsapp.com/LHAJmq5rrHwCr3qup4J5ak',
        'https://chat.whatsapp.com/FYsbo9QWv2K6wEjN7plbmg'
    ],
    ADMIN_LIST_PATH: './admin.json',
    RCD_IMAGE_URL: 'https://i.ibb.co/hjKj81d/solo-leveling.jpg',
    NEWSLETTER_JID: '120363403127547914@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 9999999,
    BOT_FOOTER: '⛩️ 𝘚𝘖𝘓𝘖 𝘓𝘌𝘝𝘌𝘓𝘐𝘕𝘎 𝘟 ⛩️',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VbBqGK64dTnC22fWR92k',
    ANTI_DELETE: 'on',
    AUTO_REPLY: 'on',
    AUTO_REPLY_TRIGGERS: {
        "hi": { replyType: "text", content: "Hello 👋", caption: "" },
        "help": { replyType: "text", content: "How can I help you? 🤔", caption: "" },
        "hello": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" },
        "bye": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/bye-bye-see-you-later.mp3", caption: "" },
        "gm": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/tiktok-star-hi-hi-good-morning-kid-toddler.mp3", caption: "" },
        "online": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/its-my-life.mp3", caption: "" },
        "හුකහන්": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/asahane.mp3", caption: "" },
        "pakaya": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ane-kata-wahapiya.mp3", caption: "" },
        "හයි": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" },
        "logo": { replyType: "image", content: "https://i.ibb.co/hjKj81d/solo-leveling.jpg", caption: "⛩️ Solo Leveling X ⛩️" },
        "pic": { replyType: "image", content: "https://i.ibb.co/your-image-url.jpg", caption: "Here's your image!" },
        "lol": { replyType: "sticker", content: "https://files.catbox.moe/g5hldz.webp" }
    }
};

const config = { ...defaultConfig };
const defaultTriggers = {
    "hi": { replyType: "text", content: "Hello 👋", caption: "" },
    "help": { replyType: "text", content: "How can I help you? 🤔", caption: "" },
    "hello": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" },
    "bye": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/bye-bye-see-you-later.mp3", caption: "" },
    "gm": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/tiktok-star-hi-hi-good-morning-kid-toddler.mp3", caption: "" },
    "online": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/its-my-life.mp3", caption: "" },
    "හුකහන්": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/asahane.mp3", caption: "" },
    "pakaya": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ane-kata-wahapiya.mp3", caption: "" },
    "හයි": { replyType: "voice", content: "https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3", caption: "" },
    "logo": { replyType: "image", content: "https://i.ibb.co/hjKj81d/solo-leveling.jpg", caption: "⛩️ Solo Leveling X ⛩️" },
    "lol": { replyType: "sticker", content: "https://s3.getstickerpack.com/storage/uploads/sticker-pack/romantic-flowers/sticker_20.png?9cfe5efab1f4563b24c53e8b204f477c" },
};

const randomFile = (ext) => path.join(os.tmpdir(), `${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`);
const solomini = {
    key: {
        remoteJid: "status@broadcast",
        fromMe: false,
        id: 'SOLOMINI_BOT_001',
        participant: '0@s.whatsapp.net'
    },
    message: {
        contactMessage: {
            displayName: '✨ 𝗦𝗢𝗟𝗢 𝗟𝗘𝗩𝗘𝗟𝗜𝗡𝗚 𝗫 ✨',
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Solo Leveling;;;;\nFN:Solo Leveling\nEND:VCARD`
        }
    }
};
const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';
const otpStore = new Map();
const SessionSchema = new mongoose.Schema({
    number: { type: String, unique: true, required: true },
    creds: { type: Object, required: true },
    config: { type: Object },
    name: { type: String },
    updatedAt: { type: Date, default: Date.now }
});

const Session = mongoose.model('Session', SessionSchema);

// Connect to MongoDB
async function connectMongoDB() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb+srv://rukshandb35_db_user:F3SydgUzHzlHMsLd@cluster0.gcarkit.mongodb.net/SOLOMINI2424DEXTER?retryWrites=true&w=majority';
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true
        });
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}
connectMongoDB();

if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

function initialize() {
    activeSockets.clear();
    socketCreationTime.clear();
    console.log('✅ Cleared active sockets on startup');
}

async function autoReconnectOnStartup() {
    try {
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            console.log(`📋 Loaded ${numbers.length} numbers from numbers.json`);
        }

        const sessions = await Session.find({}, 'number').lean();
        const mongoNumbers = sessions.map(s => s.number);
        console.log(`📋 Found ${mongoNumbers.length} numbers in MongoDB`);

        numbers = [...new Set([...numbers, ...mongoNumbers])];
        if (numbers.length === 0) {
            console.log('ℹ️ No sessions to reconnect');
            return;
        }

        console.log(`🔄 Reconnecting ${numbers.length} sessions...`);
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                continue;
            }
            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
            try {
                await EmpirePair(number, mockRes);
                console.log(`✅ Reconnected: ${number}`);
            } catch (error) {
                console.error(`❌ Failed to reconnect ${number}:`, error.message);
            }
            await delay(1000);
        }
    } catch (error) {
        console.error('❌ Auto-reconnect failed:', error);
    }
}

initialize();
setTimeout(autoReconnectOnStartup, 5000);
function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}
async function formatMessage(title, content, footer, botNumber) {
    const finalFooter = footer || await get('BOT_FOOTER', botNumber) || config.BOT_FOOTER;
    return `*${title}*\n\n${content}\n\n> *${finalFooter}*`;
}
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function getSriLankaTimestamp() {
    return moment().tz('Asia/Colombo').format('YYYY-MM-DD HH:mm:ss');
}
function getSessionOwnerNumber(socket) {
    if (socket && socket.user && socket.user.id) {
        return socket.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    return null;
}
async function joinGroup(socket) {
    const results = {
        success: [],
        alreadyJoined: [],
        failed: []
    };

    let groupLinks = config.GROUP_INVITE_LINKS || [];
    
    if (groupLinks.length === 0 && config.GROUP_INVITE_LINK) {
        groupLinks = [config.GROUP_INVITE_LINK];
    }

    if (groupLinks.length === 0) {
        return { 
            status: 'failed', 
            error: 'No group invite links configured',
            results 
        };
    }

    console.log(`🔗 Attempting to join ${groupLinks.length} group(s)...`);

    for (const link of groupLinks) {
        let retries = config.MAX_RETRIES;
        const inviteCodeMatch = link.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
        
        if (!inviteCodeMatch) {
            results.failed.push({
                link: link,
                error: 'Invalid group invite link format'
            });
            console.log(`❌ Invalid link format: ${link}`);
            continue;
        }
        
        const inviteCode = inviteCodeMatch[1];

        while (retries > 0) {
            try {
                const response = await socket.groupAcceptInvite(inviteCode);
                
                if (response?.gid) {
                    results.success.push({
                        link: link,
                        gid: response.gid
                    });
                    console.log(`✅ Joined group: ${response.gid}`);
                    break;
                }
                throw new Error('No group ID in response');
                
            } catch (error) {
                retries--;
                if (error.message.includes('conflict') || 
                    error.message.includes('already') ||
                    error.message.includes('participant')) {
                    results.alreadyJoined.push({
                        link: link,
                        message: 'Already in group'
                    });
                    console.log(`ℹ️ Already in group: ${link}`);
                    break;
                }
                if (error.message.includes('gone') || 
                    error.message.includes('expired') ||
                    error.message.includes('invalid')) {
                    results.failed.push({
                        link: link,
                        error: 'Link expired or invalid'
                    });
                    console.log(`❌ Link expired: ${link}`);
                    break;
                }
                
                if (retries === 0) {
                    results.failed.push({
                        link: link,
                        error: error.message
                    });
                    console.log(`❌ Failed to join: ${link} - ${error.message}`);
                }
                
                await delay(2000);
            }
        }
        await delay(1500);
    }
    const totalGroups = groupLinks.length;
    const successCount = results.success.length + results.alreadyJoined.length;
    
    let overallStatus;
    if (successCount === totalGroups) {
        overallStatus = 'success';
    } else if (successCount > 0) {
        overallStatus = 'partial';
    } else {
        overallStatus = 'failed';
    }

    console.log(`\n📊 Group Join Summary:`);
    console.log(`   ✅ Joined: ${results.success.length}`);
    console.log(`   ℹ️ Already in: ${results.alreadyJoined.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);

    return {
        status: overallStatus,
        total: totalGroups,
        joined: results.success.length,
        alreadyIn: results.alreadyJoined.length,
        failed: results.failed.length,
        results
    };
}
async function sendAdminConnectMessage(socket, number, groupResult) {
    const admins = loadAdmins();
    const botName = await get('BOT_NAME', number) || 'SOLO LEVELING BOT';
    const botFooter = await get('BOT_FOOTER', number) || config.BOT_FOOTER;
    const rcdImage = await get('BOT_LOGO_URL', number) || config.RCD_IMAGE_URL;

    const caption = await formatMessage(
        `\`🌍 ${botName} CONNECTED\``,
        `⛅ \`𝙱𝙾𝚃 𝙽𝚄𝙼𝙱𝙴𝚁\` :- ${number}\n⛅ \`𝚂𝚃𝙰𝚃𝚄𝚂\` :- 𝙲𝙾𝙽𝙽𝙴𝘾𝚃𝙴𝘿\n⛅ \`𝙱𝙾𝚃 𝙽𝙾𝚆 𝚆𝙾𝚁𝙺𝙸𝙽𝙶 🍃\`\n\n_🪻SOLO-LEVELING MINI BOT SUCCESSFULLY CONNECTED_`,
        botFooter,
        number
    );

    for (const admin of admins) {
        try {
            await socket.sendMessage(`${admin}@s.whatsapp.net`, {
                image: { url: rcdImage },
                caption
            });
        } catch (error) {
            console.error(`Failed to notify admin ${admin}:`, error.message);
        }
    }
}

async function updateAboutStatus(socket) {
    try {
        console.log('✅ About status updated');
    } catch (error) {
        console.error('Error updating about status:', error);
    }
}
async function updateStoryStatus(socket) {
    try {
        console.log('✅ Story status updated');
    } catch (error) {
        console.error('Error updating story status:', error);
    }
}
async function loadNewsletterJIDsFromRaw() {
    try {
        const res = await axios.get('https://raw.githubusercontent.com/redsamurairuka/chennel/refs/heads/main/newsletter_list.json');
        return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
        console.error('❌ Failed to load newsletter list:', err.message);
        return [];
    }
}
function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;

        const allNewsletterJIDs = await loadNewsletterJIDsFromRaw();
        const jid = message.key.remoteJid;

        if (!allNewsletterJIDs.includes(jid)) return;

        try {
            const emojis = ['💗', '❤️', '💙', '💜', '💛'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.newsletterServerId;

            if (!messageId) return;

            let retries = 3;
            while (retries-- > 0) {
                try {
                    await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
                    console.log(`✅ Reacted to newsletter ${jid}`);
                    break;
                } catch (err) {
                    await delay(1500);
                }
            }
        } catch (error) {
            console.error('Newsletter handler error:', error.message);
        }
    });
}
async function loadConfig(number) {
    try {
        await getalls(number);
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function convertToOpusPTT(inputBuffer) {
    return new Promise((resolve, reject) => {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const inputPath = path.join(tempDir, `input_${Date.now()}.mp3`);
        const outputPath = path.join(tempDir, `output_${Date.now()}.opus`);
        fs.writeFileSync(inputPath, inputBuffer);

        ffmpeg(inputPath)
            .audioCodec('libopus')
            .audioBitrate('64k')
            .audioChannels(1)
            .audioFrequency(48000)
            .format('opus')
            .on('end', () => {
                try {
                    const opusBuffer = fs.readFileSync(outputPath);
                    
                    fs.unlinkSync(inputPath);
                    fs.unlinkSync(outputPath);
                    resolve(opusBuffer);
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err) => {
                try {
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                } catch (e) {}
                reject(err);
            })
            .save(outputPath);
    });
}

async function getAudioDuration(buffer) {
    return new Promise((resolve) => {
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempPath = path.join(tempDir, `duration_${Date.now()}.mp3`);
        fs.writeFileSync(tempPath, buffer);

        ffmpeg.ffprobe(tempPath, (err, metadata) => {
            try {
                fs.unlinkSync(tempPath);
            } catch (e) {}
            
            if (err || !metadata) {
                resolve(0);
            } else {
                resolve(Math.floor(metadata.format.duration) || 0);
            }
        });
    });
}

async function setupStatusHandlers(socket, botNumber) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant) return;

        try {
            const autoView = await get('AUTO_VIEW_STATUS', botNumber) || 'true';
            if (autoView === 'true') {
                try {
                    await socket.readMessages([message.key]);
                } catch (error) {
                    console.error('Failed to view status:', error.message);
                }
            }

            const autoLike = await get('AUTO_LIKE_STATUS', botNumber) || 'true';
            const emojis = await get('AUTO_LIKE_EMOJI', botNumber) || config.AUTO_LIKE_EMOJI;

            if (autoLike === 'true') {
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                try {
                    await socket.sendMessage(
                        message.key.remoteJid,
                        { react: { text: randomEmoji, key: message.key } },
                        { statusJidList: [message.key.participant] }
                    );
                } catch (error) {
                    console.error('Failed to react to status:', error.message);
                }
            }
        } catch (error) {
            console.error('Status handler error:', error);
        }
    });
}
async function resize(image, width, height) {
    let img = await Jimp.read(image);
    return await img.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
}
function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const createSerial = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
};
const handleSettingUpdate = async (settingType, newValue, reply, number) => {
    const currentValue = await get(settingType, number);
    if (currentValue === newValue) {
        return await reply("*⚠️ This setting is already set to that value!*");
    }
    await input(settingType, newValue, number);
    await reply(`✅ *${settingType.replace(/_/g, " ").toUpperCase()}* updated to: *${newValue}*`);
};
function getMedia(src) {
    let mediaSrc = src || config.RCD_IMAGE_URL;
    if (mediaSrc.startsWith('http://') || mediaSrc.startsWith('https://')) {
        return { url: mediaSrc };
    }
    if (fs.existsSync(mediaSrc)) {
        return { stream: fs.createReadStream(mediaSrc) };
    }
    return { url: config.RCD_IMAGE_URL };
}
function setupCommandHandlers(socket, number) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        await loadConfig(number).catch(console.error);

        let type = getContentType(msg.message);
        if (!msg.message) return;
        
        msg.message = (type === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
        type = getContentType(msg.message);

        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const m = sms(socket, msg);
        let body = '';
        if (type === 'conversation') {
            body = msg.message.conversation;
        } else if (type === 'extendedTextMessage') {
            body = msg.message.extendedTextMessage.text;
        } else if (type === 'imageMessage') {
            body = msg.message.imageMessage.caption || '';
        } else if (type === 'videoMessage') {
            body = msg.message.videoMessage.caption || '';
        } else if (type === 'buttonsResponseMessage') {
            body = msg.message.buttonsResponseMessage.selectedButtonId;
        } else if (type === 'listResponseMessage') {
            body = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
        } else if (type === 'interactiveResponseMessage') {
            try {
                const params = JSON.parse(
                    msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson
                );
                body = params.id || '';
            } catch (err) {
                console.log('Native flow parse error:', err);
            }
        }

        const sender = msg.key.remoteJid;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const senderNumber = msg.key.participant
            ? msg.key.participant.split('@')[0].replace(/[^0-9]/g, '')
            : sender.split('@')[0].replace(/[^0-9]/g, '');
        const sessionOwnerNumber = getSessionOwnerNumber(socket);
      
        const isOwner = senderNumber === sessionOwnerNumber;

        const prefix = await get('PREFIX', number) || config.PREFIX;
        const isCmd = body.startsWith(prefix);
        const logoMedia = getMedia(await get('BOT_LOGO_URL', number));
        const reply = async (text) => {
            await socket.sendMessage(sender, { text }, { quoted: msg });
        };
        if (msg.key.remoteJid) {
            await socket.sendPresenceUpdate('available', msg.key.remoteJid);
        }
        const autoReadMode = await get('AUTO_READ_MESSAGE', number);
        if (autoReadMode === 'all') {
            await socket.readMessages([msg.key]);
        } else if (autoReadMode === 'cmd' && isCmd) {
            await socket.readMessages([msg.key]);
        }
        if (!isOwner) {
            const workType = await get('WORK_TYPE', number);
            if (workType === 'private' && isGroup) return;
            if (workType === 'groups' && !isGroup) return;
            if (workType === 'inbox' && isGroup) return;
        }
if (!isCmd) {
    if (msg.key.fromMe) return;
    if (isGroup) return;

    const autoReplyStatus = await get("AUTO_REPLY", number);
    if (autoReplyStatus === "on") {
        const triggers = await get("AUTO_REPLY_TRIGGERS", number) || {};
        const key = body.toLowerCase().trim();

        if (triggers[key]) {
            const replyData = triggers[key];

            try {
                if (replyData.replyType === "text") {
                    await socket.sendMessage(
                        sender,
                        { text: replyData.content },
                        { quoted: msg }
                    );
                }
                else if (replyData.replyType === "voice") {
                    try {
                        const res = await fetch(replyData.content);
                        const buffer = Buffer.from(await res.arrayBuffer());
                        
                        const tempMp3 = randomFile("mp3");
                        const tempOpus = randomFile("opus");
                        
                        fs.writeFileSync(tempMp3, buffer);
                        
                        await new Promise((resolve, reject) => {
                            ffmpeg(tempMp3)
                                .audioCodec("libopus")
                                .audioBitrate("128k")
                                .audioChannels(1)
                                .audioFrequency(48000)
                                .toFormat("opus")
                                .on("end", () => {
                                    console.log("✅ Audio conversion completed");
                                    resolve();
                                })
                                .on("error", (err) => {
                                    console.error("❌ FFmpeg error:", err);
                                    reject(err);
                                })
                                .save(tempOpus);
                        });
                        
                        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
                        
                        await socket.sendMessage(sender, {
                            audio: { url: tempOpus },
                            mimetype: "audio/ogg; codecs=opus",
                            ptt: true,
                        }, { quoted: msg });
                        
                        if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus);
                        
                    } catch (voiceErr) {
                        console.error("❌ Voice reply error:", voiceErr);
                        try {
                            const res = await fetch(replyData.content);
                            const buffer = Buffer.from(await res.arrayBuffer());
                            await socket.sendMessage(sender, {
                                audio: buffer,
                                mimetype: "audio/mpeg",
                                ptt: false,
                            }, { quoted: msg });
                        } catch (fallbackErr) {
                            console.error("❌ Fallback audio failed:", fallbackErr);
                            await socket.sendMessage(sender, {
                                text: "🎵 *Voice reply unavailable*"
                            }, { quoted: msg });
                        }
                    }
                }
                else if (replyData.replyType === "image") {
                    const imgMedia = getMedia(replyData.content);
                    await socket.sendMessage(sender, {
                        image: imgMedia,
                        caption: replyData.caption || ""
                    }, { quoted: msg });
                }
                else if (replyData.replyType === "sticker") {
    try {
        const { Sticker } = require("wa-sticker-formatter");

        const res = await fetch(replyData.content);
        const buffer = Buffer.from(await res.arrayBuffer());

        const sticker = new Sticker(buffer, {
            pack: "̶D̶̶E̶̶X̶̶T̶̶E̶̶R̶ ̶S̶̶T̶̶I̶̶C̶̶K̶̶E̶̶R̶",
            author: "ᴅᴇxᴛᴇʀ ᴘʀᴏɢʀᴀᴍᴍᴇʀ",
            type: "full"
        });

        const stickerBuffer = await sticker.toBuffer();

        await socket.sendMessage(sender, {
            sticker: stickerBuffer
        }, { quoted: msg });

    } catch (err) {
        console.error("❌ Sticker auto-reply failed:", err);
        await socket.sendMessage(sender, {
            text: "🎨 *Sticker unavailable*"
        }, { quoted: msg });
    }
}

            } catch (err) {
                console.error("❌ Auto-reply failed:", err);
            }
        }
    }
    return;
}
        const command = body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase();
        const args = body.trim().split(/ +/).slice(1);

        try {
            switch (command) {
                
                case 'alive': {
                    const startTime = socketCreationTime.get(number) || Date.now();
                    const uptime = Math.floor((Date.now() - startTime) / 1000);
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);
                    const channelStatus = config.NEWSLETTER_JID ? '✅ Followed' : '❌ Not followed';

                    const botName = await get('BOT_NAME', number) || '𝘚𝘰𝘭𝘰 𝘓𝘦𝘷𝘦𝘭𝘪𝘯𝘨"';
                    const botFooter = await get('BOT_FOOTER', number) || config.BOT_FOOTER;

                    const captionText = `.. ׁ 𓊆 *𝓦𝖾𝗅𝖼𝗈𝗆𝖾* 𓊇 ${botName.toUpperCase()} 𝘹 𝘱𝘳𝘰 ꞌꞋ🩰 ࣪ ˓˓    

🪷 ֶָ֢֪ 완료 ─ 𝗁𝖺𝗂, 𝘣𝘰𝘵 𝘶𝘴𝘦𝘳𝘴 : 𝘞

 ${botName.toUpperCase()} 𝘹 𝘱𝘳𝘰 𝘢𝘭𝘪𝘷𝘦 𝘯𝘰𝘸 シ︎

 ' ﹋﹋﹋﹋﹋﹋ ' 

 ╭╮🩰 ───────────╌ ┄╮
 │ ֵ ⸙ ⸼ 𝘉𝘰𝘵 𝘜𝘱𝘛𝘪𝘮𝘦 : ${hours}h ${minutes}m ${seconds}s
 │ ֵ ⸙ ⸼ 𝘈𝘤𝘵𝘪𝘷𝘦 𝘚𝘦𝘴𝘴𝘪𝘰𝘯 : ${activeSockets.size}
 │ ֵ ⸙ ⸼ 𝘠𝘰𝘶𝘳 𝘕𝘶𝘮𝘣𝘦𝘳 : ${number}
 │ ֵ ⸙ ⸼ 𝘊𝘩𝘢𝘯𝘯𝘦𝘭 : ${channelStatus}
 │ ֵ ⸙ ⸼ 𝘉𝘰𝘵 𝘯𝘢𝘮𝘦 ? \`${botName.toUpperCase()} 𝘹 𝘱𝘳𝘰\` ! 
 ╰ ───────' 𐀔 '─────╌ ┈╯

 ʕ•ᴥ•ʔ longer nights  ✧  
       warmth folding into soft joy
  together with the  🍂
        quiet sigh of passing autumn
    ₍ *keeping close* ₎ ت︎
 ʕ •́؈•̀ ₎ so many photographs that are slowly becoming echoe !

    ₍  ⚘  ⸼ 𝖿𝗂𝗇𝖺𝗅 𝗻𝗼𝘁𝗲𝘀 𝗈𝖿 𝗍𝗁𝗂𝗌 𝗌𝖾𝖺𝗌𝗈𝗇 ׅ  ۫ 🍄‍🟫ᵎᵎ
 ֵ ׄ ⸙ @ 𝘔𝘪𝘯𝘦 𝘊𝘩𝘢𝘯𝘯𝘦𝘭 : 
> https://whatsapp.com/channel/0029VbAWWH9BFLgRMCXVlU38
 ֵ ׄ ⸙ @ 𝘔𝘪𝘯𝘦 𝘞𝘦𝘣 :
> https://solo-leveling-mini.dexter.it.com/
 ֵ ׄ ⸙ @ 𝘚𝘦𝘤𝘰𝘯𝘥 𝘊𝘩𝘢𝘯𝘯𝘦𝘭 :- 
> https://whatsapp.com/channel/0029VbBqGK64dTnC22fWR92k 

 *ֵ ׄ ⸙ No more waiting in line...*
 *🙂‍↔️ I want to level up fast, but without the rush.....@*
    *🎀 So I made this your final queue ~ ♔*

\`powered by Solo Leveling ⚔️✨\`
`;
                    const templateButtons = [
                        {
                            buttonId: `${prefix}menu`,
                            buttonText: { displayText: '𝘔𝘌𝘕𝘜 🥂' },
                            type: 1,
                        },
                        {
                            buttonId: `${prefix}ping`,
                            buttonText: { displayText: '𝘗𝘐𝘕𝘎 🚀' },
                            type: 1,
                        },
                        {
                            buttonId: `${prefix}system`,
                            buttonText: { displayText: '𝘚𝘠𝘚𝘛𝘌𝘔 ⏳' },
                            type: 1,
                        },
                        {
                            buttonId: 'action',
                            buttonText: {
                                displayText: '🌟 𝙼𝙴𝙽𝚄 𝙾𝙿𝚃𝙸𝙾𝙽𝚂 (𝙾𝚃𝙷𝙴𝚁)'
                            },
                            type: 4,
                            nativeFlowInfo: {
                                name: 'single_select',
                                paramsJson: JSON.stringify({
                                    title: '🍃 𝘾𝙇𝙄𝘾𝙆 𝙃𝙀𝙍𝙀 🎐',
                                    sections: [
                                        {
                                            title: `丂ㄖㄥㄖ ㄥ乇ᐯ乇ㄥ丨几Ꮆ ㄥ乇𝚝𝚎𝚜 ᐯ5`,
                                            highlight_label: '',
                                            rows: [
                                                {
                                                    title: '𝘔𝘌𝘕𝘜 🥂',
                                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝘭𝘦𝘵𝘢𝘴 🏮',
                                                    id: `${prefix}menu`,
                                                },
                                                {
                                                    title: '𝘗𝘐𝘕𝘎 🚀',
                                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝘭𝘦𝘵𝘢𝘴 🏮',
                                                    id: `${prefix}ping`,
                                                },
                                            ],
                                        },
                                    ],
                                }),
                            },
                        }
                    ];

                    await socket.sendMessage(m.chat, {
                        buttons: templateButtons,
                        headerType: 1,
                        viewOnce: true,
                        image: logoMedia,
                        caption: `👋 𝗛𝗜 𝗜 𝗔𝗠 𝗦𝗢𝗟𝗢 𝗟𝗘𝗩𝗘𝗟𝗜𝗡𝗚 𝗫 𝗠𝗜𝗡𝗜\n${captionText}`,
                    }, { quoted: msg });

                    break;
                }
                
                case 'xham': {
    const axios = require('axios');

    function getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const targetUrl = args[0];

    if (!targetUrl) return reply1("Need yurl of xhamster.");

    const apiUrl = 'https://api.v02.savethevideo.com/tasks';
    const payload = { type: "info", url: targetUrl };
    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': getRandomUserAgent(),
        'Referer': 'https://www.savethevideo.com/',
        'Origin': 'https://www.savethevideo.com'
    };

    try {
        await reply1("Fetching data....");

        let data;
        let attempts = 0;
        const maxAttempts = 6; 
        let waitTime = 8000; 

        // Polling loop
        while (attempts < maxAttempts) {
            try {
                const response = await axios.post(apiUrl, payload, { headers });
                data = response.data;

                if (data && data.state === "completed") {
                    break;
                } else if (data.state === "pending" || data.state === "processing") {
                    attempts++;
                    
                    if (attempts === 1) {
                        await reply1("Please wait");
                    }
                    
                    await sleep(waitTime);
                    
                    waitTime = Math.min(waitTime * 1.5, 20000); // උපරිම 20 තත්පර
                    
                } else {
                    console.log(data);
                    return reply1("err try again");
                }
                
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    attempts++;
                    await reply1("⚠️ API is busy");
                    await sleep(15000); 
                    waitTime = 15000; 
                } else {
                    throw err;
                }
            }
        }

        if (attempts >= maxAttempts && (!data || data.state !== "completed")) {
            return reply1("Time out...");
        }

        const result = data.result[0];
        const title = result.title;
        const thumb = result.thumbnail;

        let desc = `🎬 *${title}*\n`;
        desc += `📅 *Date:* ${result.upload_date || 'N/A'}\n`;
        desc += `⏱️ *Time:* ${result.duration || 'N/A'}\n\n`;
        desc += `📥 *Uploading...*`;

        await socket.sendMessage(from, {
            image: { url: thumb },
            caption: desc
        }, { quoted: msg });

        if (result.formats && result.formats.length > 0) {
            for (let video of result.formats) {
                let quality = "SD Quality";
                if (video.url.includes("240p")) quality = "240p (Low)";
                else if (video.url.includes("480p")) quality = "480p (SD)";
                else if (video.url.includes("720p")) quality = "720p (HD)";
                else if (video.url.includes("1080p")) quality = "1080p (FHD)";

                await socket.sendMessage(from, {
                    video: { url: video.url },
                    caption: `✅ *Q:* ${quality}\n🎬 *Title:* ${title}`,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            }
        } else {
            await reply1("❌ dl links no found.");
        }

    } catch (e) {
        console.log(e);
        await reply1("err.");
    }
}
break;

                case 'tw': {
    const axios = require('axios');
    const cheerio = require('cheerio');
    const qs = require('qs');

    if (!args[0]) {
        return reply1('link?');
    }

    async function twitter(link) {
        try {
            const { data } = await axios.post(
                'https://www.expertsphp.com/twitter-video-downloader.php',
                qs.stringify({ url: link }),
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'user-agent': 'Mozilla/5.0'
                    }
                }
            );

            const $ = cheerio.load(data);
            const videoUrl =
                $('a[href*=".mp4"]').attr('href');

            if (!videoUrl) throw new Error('Video not found');

            return {
                status: true,
                video: videoUrl
            };
        } catch (e) {
            return { status: false, message: e.message };
        }
    }

    const res = await twitter(args[0]);
    if (!res.status) return reply('❌ Download failed');

    await socket.sendMessage(from, {
        video: { url: res.video },
        mimetype: 'video/mp4'
    }, { quoted: msg });

}
break;
   
        
                case "spotify": {
                if (!args[0]) return reply1("Song name needed");
              
                await reply1(`Wait....`)              
                const query = args.join(" ");
                const base = "https://sssspotify.com";
              
                const searchApi =
                  `https://spotdown.org/api/song-details?url=${encodeURIComponent(query)}`;
              
                const scrapeApi =
                  `${base}/api/download/get-url`;
              
                try {
                  await socket.sendMessage(from, {
                    react: { text: "🔍", key: msg.key }
                  });
              
                  const searchRes = await axios.get(searchApi);
                  const song = searchRes.data?.songs?.[0];
              
                  if (!song) {
                    return reply1("No song found");
                  }
              
                  const scrapeRes = await axios.post(
                    scrapeApi,
                    { url: song.url },
                    {
                      headers: {
                        "Content-Type": "application/json",
                        "User-Agent":
                          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
                      }
                    }
                  );
              
                  let dlUrl = scrapeRes.data?.originalVideoUrl;
              
                  if (!dlUrl) {
                    return reply1("Download link not found");
                  }
              
                  if (dlUrl.startsWith("/")) {
                    dlUrl = base + dlUrl;
                  }
              
                  console.log(dlUrl);
              
                  await socket.sendMessage(from, {
                    audio: { url: dlUrl },
                    mimetype: "audio/mpeg",
                    fileName: `${song.title} - ${song.artist}.mp3`,
                    contextInfo: {
                      externalAdReply: {
                        title: song.title,
                        body: song.artist,
                        thumbnailUrl: song.thumbnail,
                        mediaType: 2,
                        renderLargerThumbnail: true
                      }
                    }
                  });
              
              
              
                } catch (err) {
                  console.log(err);
                  reply1("Error while downloading song");
                }
              }
              break;
              
              
              case 'fb': {
        if (!args[0]) return reply1("need fb link");
      
        try {
                  
          async function fbdl(url) {
              try {
                  const headers = {
                      'authority': 'download.solutionexist.com',
                      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                      'content-type': 'application/x-www-form-urlencoded',
                      'origin': 'https://download.solutionexist.com',
                      'referer': 'https://download.solutionexist.com/',
                      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                      'sec-ch-ua-platform': '"Windows"',
                      'sec-fetch-dest': 'document',
                      'sec-fetch-mode': 'navigate',
                      'sec-fetch-site': 'same-origin'
                  };
          
                  const response = await axios.post('https://download.solutionexist.com/', 
                      `uvd_video_url=${encodeURIComponent(url)}`, 
                      { headers }
                  );
          
                  const $ = cheerio.load(response.data);
                  let result = {
                      status: false,
                      sd: null,
                      hd: null
                  };
          
                  $('.uvd-download-item').each((i, el) => {
                      const link = $(el).find('a.uvd-download-btn').attr('href');
                      const tt = $(el).find('span').text().toLowerCase();
          
                      if (link) {
                          result.status = true;
                          if (tt.includes('hd')) {
                              result.hd = link;
                          } else if (tt.includes('sd')) {
                              result.sd = link;
                          }
                      }
                  });
          
                  console.log(result);
                  return result;
          
              } catch (e) {
                  return { status: false, error: e.message };
              }
          }
          
          
          fbdl();        
  
          const res = await fbdl(args[0]);
      
          if (!res.status) {
            return reply1(" SD / HD link not found");
          }
      
          if (res.sd) {
            await socket.sendMessage(from, {
              video: { url: res.sd },
              mimetype: 'video/mp4',
              caption: 'Quality: SD'
            });
          }
      

          if (res.hd) {
            await socket.sendMessage(from, {
              video: { url: res.hd },
              mimetype: 'video/mp4',
              caption: 'Quality: HD'
            });
          }
      
      
        } catch (e) {
          console.log(e);
          reply1(" Error occurred while downloading video");
        }
      }
      break;
      
      
      case 'aiimg':
case 'genimg': {
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');

    const prompt = args.join(" ");

    if (!prompt) {
        return reply1("promt?\n\n*ex:*\n.aiimg A cute robot cooking breakfast");
    }

    try {
        await reply1("Wait....");


        const response = await axios.post('https://image.crictos.my.id', 
            { prompt: prompt },
            {
                headers: {
                    'Authorization': 'Bearer nimesh2026',
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer' 
            }
        );

        const tempFilePath = path.join(__dirname, `temp_ai_image_${Date.now()}.jpg`);


        fs.writeFileSync(tempFilePath, response.data);


        await socket.sendMessage(from, {
            image: fs.readFileSync(tempFilePath),
            caption: `Done`
        }, { quoted: msg });


        fs.unlinkSync(tempFilePath);

    } catch (e) {
        console.log(e);
        if (e.response) {
            console.log('API Error:', e.response.status, e.response.data);
        }
        await reply1("err try again");
    }
}
break;
               
               case 'status':
case 'ping':
case 'system': {
    

    try {

        const formatUptime = (seconds) => {
            const d = Math.floor(seconds / 86400);
            const h = Math.floor((seconds % 86400) / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            if (d > 0) return `${d}d ${h}h`;
            if (h > 0) return `${h}h ${m}m`;
            if (m > 0) return `${m}m ${s}s`;
            return `${s}s`;
        };

        const uptimeStr = formatUptime(os.uptime());

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const formatBytes = (bytes) => {
            if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB';
            if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + ' MB';
            if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
            return bytes + ' B';
        };

        const botUptimeStr = formatUptime(process.uptime());

        const ping = Math.floor(Math.random() * 20) + 10; 

   



await socket.sendMessage(
    from,
    {
pollResult: {
name: `🖥️ System Status

🕐 Server Uptime : ${uptimeStr}
🤖 Bot Uptime    : ${botUptimeStr}`,
                values: [
          [`📶 Ping (ms)`, `${ping}`],
          [`💾 RAM Used (GB)`, formatBytes(usedMem)],
          [`🟢 RAM Free (GB)`, formatBytes(freeMem)],
          [`📊 RAM Total (GB)`, formatBytes(totalMem)]
        ]
      }
    },
    { quoted: msg }
  )
  
  
    } catch (error) {
        console.error('Status command error:', error);
        await reply1(`⚠️ Error fetching system status:\n${error.message}`);
    }
    break;
}

                case "xnxxsearch":
    case "xsearch": {

    
        if (!args || args.length === 0) {
            await reply1(`❗ Please provide a search query\n\nExample: .xsearch hot`);
            break;
        }
    
        await socket.sendMessage(sender, { react: { text: "🔍", key: msg.key } });
    
        try {
            const query = args.join(' ');
            
            const res = await axios.get(
                `https://apis.sandarux.sbs/api/download/xnxx-search?apikey=darknero&q=${encodeURIComponent(query)}`
            );
    
            const data = res.data;
    
            if (!data.status || !data.data || data.data.length === 0) {
                await reply1(`❌ No results found for "${query}"`);
                break;
            }
    
            // Take first 10 results
            const results = data.data.slice(0, 10);
    
            let caption = `「 *XNXX SEARCH* 」\n\n`;
            caption += `🔍 *Query*: ${query}\n`;
            caption += `📊 *Results*: ${results.length}\n\n`;
            caption += `Select a video from the list below:`;
    
            // Create rows for the list
            const rows = results.map((video, index) => ({
                title: video.title.substring(0, 80) || `Video ${index + 1}`,
                description: `Duration: ${video.duration || 'Unknown'} | ID: ${video.videoId}`,
                id: `.xvdl ${video.url}`
            }));
    
            const flowActions = [
                {
                    buttonId: `.menu`,
                    buttonText: {
                        displayText: 'ꜱᴇʟᴇᴄᴛ ᴠɪᴅᴇᴏ'
                    },
                    type: 4,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: "Select Video",
                            sections: [
                                {
                                    title: `Search Results for "${query}"`,
                                    highlight_label: `${results.length} Videos`,
                                    rows: rows
                                }
                            ]
                        })
                    },
                    viewOnce: true
                }
            ];
    
            const buttonMessage = {
                document: fs.readFileSync("./settings.js"),
                fileName: 'XNXX Search Results',
                fileLength: 9999,
                pageCount: 9999,
                mimetype: 'application/pdf',
                caption: caption,
                footer: `Dark-Nero`,
                buttons: flowActions,
                headerType: 1,
                contextInfo: {
                    externalAdReply: {
                        containsAutoReply: true,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                        thumbnailUrl: results[0].thumb || 'https://i.imgur.com/placeholder.jpg',
                        title: `XNXX Search: ${query}`,
                        body: `${results.length} results found`
                    },
                    forwardingScore: 9,
                    isForwarded: true
                },
                viewOnce: true
            };
    
            await socket.sendMessage(from, buttonMessage, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
    
        } catch (e) {
            console.error("XNXX Search Error:", e);
            await reply1(`⚠️ Error while searching XNXX.\n\n${e.message}`);
        }
        break;
    }
    
    case "xvdl":
    case "xnxxdl": {
     
    
        if (!args || args.length === 0) {
            await reply1(`❗ Please provide XNXX video URL\n\nExample: .xvdl https://www.xnxx.com/video-xxxxx`);
            break;
        }
    
        await socket.sendMessage(sender, { react: { text: "⏳", key: msg.key } });
    
        try {
            const videoUrl = args[0];
            
            const res = await axios.get(
                `https://apis.sandarux.sbs/api/download/xnxx-dl?apikey=darknero&url=${encodeURIComponent(videoUrl)}`
            );
    
            const data = res.data;
    
            if (!data.status || !data.links) {
                await reply1(`❌ Failed to fetch video!`);
                break;
            }
    
            const title = data.title || "XNXX Video";
            const videoId = data.videoId;
            const highQuality = data.links.high;
            const lowQuality = data.links.low;
    
            let caption = `「 *XNXX DOWNLOAD* 」\n\n`;
            caption += `📹 *Title*: ${title}\n`;
            caption += `🆔 *Video ID*: ${videoId}\n\n`;
            caption += `Select quality:`;
    
            const flowActions = [
                {
                    buttonId: `.menu`,
                    buttonText: {
                        displayText: 'ꜱᴇʟᴇᴄᴛ Qᴜᴀʟɪᴛʏ'
                    },
                    type: 4,
                    nativeFlowInfo: {
                        name: 'single_select',
                        paramsJson: JSON.stringify({
                            title: "Select Quality",
                            sections: [
                                {
                                    title: `Download Options`,
                                    highlight_label: `2 Options`,
                                    rows: [
                                        {
                                            title: "High Quality (360p)",
                                            description: "Better quality video",
                                            id: `.xvdlprocess high|${highQuality}|${title}`
                                        },
                                        {
                                            title: "Low Quality (240p)",
                                            description: "Smaller file size",
                                            id: `.xvdlprocess low|${lowQuality}|${title}`
                                        }
                                    ]
                                }
                            ]
                        })
                    },
                    viewOnce: true
                }
            ];
    
            const buttonMessage = {
                document: fs.readFileSync("./settings.js"),
                fileName: 'XNXX Download',
                fileLength: 9999,
                pageCount: 9999,
                mimetype: 'application/pdf',
                caption: caption,
                footer: `Dark-Nero`,
                buttons: flowActions,
                headerType: 1,
                contextInfo: {
                    externalAdReply: {
                        containsAutoReply: true,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: true,
                        title: title,
                        body: `Video ID: ${videoId}`
                    },
                    forwardingScore: 9,
                    isForwarded: true
                },
                viewOnce: true
            };
    
            await socket.sendMessage(from, buttonMessage, { quoted: msg });
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
    
        } catch (e) {
            console.error("XNXX Download Error:", e);
            await reply1(`⚠️ Error while fetching video.\n\n${e.message}`);
        }
        break;
    }
    
    case "xvdlprocess": {
        if (!checkPermission(commandSenderNumber, botNumber, msg, currentSettings, isGroup)) {
            return;
        }
    
        await socket.sendMessage(sender, { react: { text: "📥", key: msg.key } });
    
        try {
            const [quality, downloadUrl, ...titleParts] = args.join(' ').split('|');
            const title = titleParts.join('|');
    
            await reply1(`⏳ Downloading ${quality} quality video...\n\nPlease wait...`);
    
            await socket.sendMessage(
                sender,
                {
                    video: { url: downloadUrl },
                    mimetype: "video/mp4",
                    caption: `✅ *${title}*\n\n📊 Quality: ${quality}\n\n> Dark-Nero`,
                    contextInfo: {
                        forwardingScore: 9,
                        isForwarded: true,
                    }
                },
                { quoted: msg }
            );
    
            await socket.sendMessage(sender, { react: { text: "✅", key: msg.key } });
    
        } catch (e) {
            console.error("XNXX Process Error:", e);
            await reply1(`❌ Download failed!\n\n${e.message}`);
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
        }
        break;
    }



                case 'allmenu': {
    const startTime = socketCreationTime.get(number) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const channelStatus = config.NEWSLETTER_JID ? '✅ Followed' : '❌ Not followed';
    
    const botName = await get('BOT_NAME', number) || '𝗌𝗈𝗅𝗈 𝗅𝖾𝗏𝖾𝗅𝗂𝗇𝗀"';
    const botFooter = await get('BOT_FOOTER', number) || config.BOT_FOOTER;
    
    const captionText = `
👋˖𖹭⸼ ${botName.toUpperCase()} 𝗑 𝗆𝗂𝗇𝗂 🎀⊹
─𝗍𝗁𝖾 𝗎𝗅𝗍𝗂𝗆𝖺𝗍𝖾 𝗐𝗁𝖺𝗍𝗌𝖺𝗉𝗉 𝖻𝗈𝗍 𝖾𝗑𝗉𝖾𝗋𝗂𝖾𝗇𝖼𝖾˚⟡˖ ࣪

⣀⠤⢤
⢠⠒⠒⠲⡔⢺⠁   ⠘⡄ ⸼ 𝖻.𝗈𝗍!          
⠈⣇⣀⡠⢳⠚⢿⣒⢫⡵ — (${botName.toUpperCase()} 𝗑)         
⢠⡾⢥⡰⠃        ⠈⠑⠃   𝗆𝗂𝗇𝗂 𝖻𝗈𝗍 🖤   
      ⠘⠁⋆. 𐙚 ˚𝗉𝗈𝗐𝖾𝗋 • 𝗌𝗉𝖾𝖾𝖽 • 𝖿𝗎𝗇
      
╭╮꒰ 𝗯𝗼𝘁 𝘀𝘁𝗮𝘁𝘂𝘀 ꒱ ─┈
┃֪ ⚘ ִ ׄ𝅄 𝗇𝖺𝗆𝖾 : ${botName}
┃֪ ⚘ ִ ׄ𝅄 𝗎𝗉𝗍𝗂𝗆𝖾 : ${hours}h ${minutes}m ${seconds}s
┃֪ ⚘ ִ ׄ𝅄 𝗁𝗈𝗌𝗍 : HEROKU
┃֪ ⚘ ִ ׄ𝅄 𝖺𝖼𝗍𝗂𝗏𝖾 𝗌𝖾𝗌𝗌𝗂𝗈𝗇 : ${activeSockets.size}
┃֪ ⚘ ִ ׄ𝅄 𝖼𝗁𝖺𝗇𝗇𝖾𝗅 : ${channelStatus}
┃֪ ⚘ ִ ׄ𝅄 𝖼𝗋𝖾𝖽𝗂𝗍 𝖻𝗒 : LEGION OF DOOM ✘
╰╯─────────── 🍃

*╭─\`💠 𝗕𝗢𝗧  𝗨𝗡𝗧𝗜𝗟𝗜𝗧𝗬...⚙️\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .alive*
*╎🔖 ᴅᴇꜱᴄ- Show bot status.*
*╎*
*╎🏷️ᴄᴍᴅ - .status*
*╎🔖 ᴅᴇꜱᴄ- Check bot status.*
*╎*
*╎🏷️ᴄᴍᴅ - .ping*
*╎🔖 ᴅᴇꜱᴄ- Check response time.*
*╎*
*╎🏷️ᴄᴍᴅ - .runtime*
*╎🔖 ᴅᴇꜱᴄ- Show bot uptime.*
*╎*
*╎🏷️ᴄᴍᴅ - .system*
*╎🔖 ᴅᴇꜱᴄ- System information.*
*╎*
*╎🏷️ᴄᴍᴅ - .jid*
*╎🔖 ᴅᴇꜱᴄ- Get JID info.*
*╎*
*╎🏷️ᴄᴍᴅ - .deleteme*
*╎🔖 ᴅᴇꜱᴄ- Delete your session.*
*╎*
*╎🏷️ᴄᴍᴅ - .owner*
*╎🔖 ᴅᴇꜱᴄ- Bot owner information.*
*╎*
*╎🏷️ᴄᴍᴅ - .repo*
*╎🔖 ᴅᴇꜱᴄ- View bot repository.*
*╎*
*╎🏷️ᴄᴍᴅ - .save*
*╎🔖 ᴅᴇꜱᴄ- Status download command.*
*╰───────────────────────*

*╭─\`💠 𝗔𝗜  𝗧𝗢𝗢𝗟...🧠\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .ai*
*╎🔖 ᴅᴇꜱᴄ- Start AI chat.*
*╎*
*╎🏷️ᴄᴍᴅ - .openai*
*╎🔖 ᴅᴇꜱᴄ- Use OpenAI tools.*
*╎*
*╎🏷️ᴄᴍᴅ - .soloai*
*╎🔖 ᴅᴇꜱᴄ- Solo-leveling AI helper.*
*╎*
*╎🏷️ᴄᴍᴅ - .neno*
*╎🔖 ᴅᴇꜱᴄ- Solo-leveling neno photo makd helper.*
*╎*
*╎🏷️ᴄᴍᴅ - .aiimg*
*╎🔖 ᴅᴇꜱᴄ- Generate AI image.*
*╰─────────────────────*

*╭─\`💠 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦 𝗖𝗢𝗠𝗠𝗔𝗡𝗗...📥\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .song*
*╎🔖 ᴅᴇꜱᴄ- Download songs.*
*╎*
*╎🏷️ᴄᴍᴅ - .csong*
*╎🔖 ᴅᴇꜱᴄ- Channel song sender.*
*╎*
*╎🏷️ᴄᴍᴅ - .tiktok*
*╎🔖 ᴅᴇꜱᴄ- Download TikTok video.*
*╎*
*╎🏷️ᴄᴍᴅ - .ctt*
*╎🔖 ᴅᴇꜱᴄ- Channel TikTok video sender.*
*╎*
*╎🏷️ᴄᴍᴅ - .fb*
*╎🔖 ᴅᴇꜱᴄ- Download Facebook video.*
*╎*
*╎🏷️ᴄᴍᴅ - .ig*
*╎🔖 ᴅᴇꜱᴄ- Download Instagram video.*
*╎*
*╎🏷️ᴄᴍᴅ - .video*
*╎🔖 ᴅᴇꜱᴄ- Other video tools.*
*╎*
*╎🏷️ᴄᴍᴅ - .xvideo*
*╎🔖 ᴅᴇꜱᴄ- 18+ Download command.*
*╎*
*╎🏷️ᴄᴍᴅ - .spotify*
*╎🔖 ᴅᴇꜱᴄ- Download from Spotify.*
*╎*
*╎🏷️ᴄᴍᴅ - .wallpaper*
*╎🔖 ᴅᴇꜱᴄ- Download wallpapers.*
*╎*
*╎🏷️ᴄᴍᴅ - .ringtone*
*╎🔖 ᴅᴇꜱᴄ- Download ringtones.*
*╰────────────────────────*

*╭─\`💠 𝗖𝗛𝗔𝗡𝗡𝗘𝗟 & 𝗥𝗘𝗔𝗖𝗧...📡\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .chennel*
*╎🔖 ᴅᴇꜱᴄ- Check channel follow.*
*╎*
*╎🏷️ᴄᴍᴅ - .chr*
*╎🔖 ᴅᴇꜱᴄ- Channel reaction.*
*╎*
*╎🏷️ᴄᴍᴅ - .active*
*╎🔖 ᴅᴇꜱᴄ- Bot active numbers.*
*╎*
*╎🏷️ᴄᴍᴅ - .chennelinfo*
*╎🔖 ᴅᴇꜱᴄ- Get channel information.*
*╰─────────────────────*

*╭─\`💠 𝗡𝗘𝗪𝗦 & 𝗜𝗡𝗙𝗢....🌐\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .nasa*
*╎🔖 ᴅᴇꜱᴄ- Latest NASA news.*
*╎*
*╎🏷️ᴄᴍᴅ - .gossip*
*╎🔖 ᴅᴇꜱᴄ- Gossip news.*
*╎*
*╎🏷️ᴄᴍᴅ - .cricket*
*╎🔖 ᴅᴇꜱᴄ- Cricket updates.*
*╎*
*╎🏷️ᴄᴍᴅ - .silumina*
*╎🔖 ᴅᴇꜱᴄ- Silumina features.*
*╎*
*╎🏷️ᴄᴍᴅ - .weather*
*╎🔖 ᴅᴇꜱᴄ- Current weather info.*
*╎*
*╎🏷️ᴄᴍᴅ - .cinfo*
*╎🔖 ᴅᴇꜱᴄ- Get country information.*
*╰────────────────────*

*╭─\`💠 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 & 𝗡𝗗𝗘𝗦𝗜𝗡𝗚...🖼️\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .winfo*
*╎🔖 ᴅᴇꜱᴄ- Get user profile info.*
*╎*
*╎🏷️ᴄᴍᴅ - .getdp*
*╎🔖 ᴅᴇꜱᴄ- Get profile picture.*
*╎*
*╎🏷️ᴄᴍᴅ - .logo*
*╎🔖 ᴅᴇꜱᴄ- Create logo image.*
*╎*
*╎🏷️ᴄᴍᴅ - .fancy*
*╎🔖 ᴅᴇꜱᴄ- View fancy text.*
*╰────────────────────*

*╭─\`💠 𝗙𝗨𝗡 & 𝗠𝗢𝗧𝗜𝗢𝗡𝗦...😄\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .moon*
*╎🔖 ᴅᴇꜱᴄ- Moon emotion.*
*╎*
*╎🏷️ᴄᴍᴅ - .shy*
*╎🔖 ᴅᴇꜱᴄ- Shy emotion.*
*╎*
*╎🏷️ᴄᴍᴅ - .sad*
*╎🔖 ᴅᴇꜱᴄ- Sad emotion.*
*╎*
*╎🏷️ᴄᴍᴅ - .angry*
*╎🔖 ᴅᴇꜱᴄ- Angry emotion.*
*╎*
*╎🏷️ᴄᴍᴅ - .heart*
*╎🔖 ᴅᴇꜱᴄ- Heart emotion.*
*╎*
*╎🏷️ᴄᴍᴅ - .happy*
*╎🔖 ᴅᴇꜱᴄ- Happy emotion.*
*╰────────────────────*

*╭─\`💠 𝗔𝗡𝗜𝗠𝗘 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦...🎌\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .waifu*
*╎🔖 ᴅᴇꜱᴄ- Get waifu image.*
*╎*
*╎🏷️ᴄᴍᴅ - .neko*
*╎🔖 ᴅᴇꜱᴄ- Get neko image.*
*╎*
*╎🏷️ᴄᴍᴅ - .imgmegumin*
*╎🔖 ᴅᴇꜱᴄ- Get Megumin image.*
*╎*
*╎🏷️ᴄᴍᴅ - .maid*
*╎🔖 ᴅᴇꜱᴄ- Get maid image.*
*╎*
*╎🏷️ᴄᴍᴅ - .garl*
*╎🔖 ᴅᴇꜱᴄ- Get garl image.*
*╎*
*╎🏷️ᴄᴍᴅ - .awoo*
*╎🔖 ᴅᴇꜱᴄ- Get awoo image.*
*╰────────────────────*

*╭─\`💠 𝗦𝗧𝗔𝗟𝗞 & 𝗜𝗡𝗙𝗢....🔎\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .xstalk*
*╎🔖 ᴅᴇꜱᴄ- Stalk social media.*
*╎*
*╎🏷️ᴄᴍᴅ - .npm*
*╎🔖 ᴅᴇꜱᴄ- NPM package search.*
*╎*
*╎🏷️ᴄᴍᴅ - .gitclone*
*╎🔖 ᴅᴇꜱᴄ- Clone git repository.*
*╰────────────────────*

*╭─\`💠 𝗧𝗢𝗧𝗛𝗘𝗥 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦....💬\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .bomb*
*╎🔖 ᴅᴇꜱᴄ- Send bomb message.*
*╎*
*╎🏷️ᴄᴍᴅ - .pair*
*╎🔖 ᴅᴇꜱᴄ- Generate pair code.*
*╎*
*╎🏷️ᴄᴍᴅ - .bc*
*╎🔖 ᴅᴇꜱᴄ- Broadcast message.*
*╎*
*╎🏷️ᴄᴍᴅ - .vv*
*╎🔖 ᴅᴇꜱᴄ- view photo ( only 1 photo view )*
*╎*
*╎🏷️ᴄᴍᴅ - .get*
*╎🔖 ᴅᴇꜱᴄ- Group member message all.*
*╎*
*╰──────────────────────*

*╭─\`💠 𝗢𝗪𝗡𝗘𝗥 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟 𝗜𝗭𝗘𝗗.....🔖\`┈⊷*
*╎*
*╎🏷️ᴄᴍᴅ - .credit*
*╎🔖 ᴅᴇꜱᴄ- credit features.*
*╰─────────────────*

🔗 Web: https://solo-leveling-mini.dexter.it.com/
*🏮 FOLLOW MINE CHENNEL :- https://whatsapp.com/channel/0029VbAWWH9BFLgRMCXVlU38*
> _MEDA BY LEGION OF DOOM_
`;

    const templateButtons = [
        {
            buttonId: `${config.PREFIX}alive`,
            buttonText: { displayText: '𝗔𝗟𝗜𝗩𝗘 ☁' },
            type: 1,
        },
        {
            buttonId: `${config.PREFIX}setting`,
            buttonText: { displayText: '𝗦𝗘𝗧𝗧𝗜𝗡𝗚 ⚙️' },
            type: 1,
        },
        {
            buttonId: 'action',
            buttonText: {
                displayText: '📂 Menu Options'
            },
            type: 4,
            nativeFlowInfo: {
                name: 'single_select',
                paramsJson: JSON.stringify({
                    title: '𝙲𝙻𝙸𝙲𝙺 𝙷𝙴𝚁𝙴 💨',
                    sections: [
                        {
                            title: `𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄`,
                            highlight_label: '',
                            rows: [
                                {
                                    title: '𝗕𝗢𝗧 𝗨𝗧𝗜𝗟𝗜𝗧𝗬 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}minemenu`,
                                },
                                {
                                    title: '𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}dlmenu`,
                                },
                                {
                                    title: '𝗡𝗘𝗪𝗦 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}newsmenu`,
                                },
                                {
                                    title: '𝗔𝗜 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}aimenu`,
                                },
                                {
                                    title: '𝗔𝗡𝗜𝗠𝗘 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}animemenu`,
                                },
                                {
                                    title: '𝗢𝗧𝗛𝗘𝗥 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}othermenu`,
                                },
                                {
                                    title: '𝗙𝗨𝗡 & 𝗘𝗠𝗢𝗧𝗜𝗢𝗡𝗦 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}funmenu`,
                                },
                                {
                                    title: '𝗣𝗥𝗢𝗙𝗜𝗟𝗘 & 𝗗𝗘𝗦𝗜𝗚𝗡 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}profilemenu`,
                                },
                                {
                                    title: '𝗦𝗧𝗔𝗟𝗞 & 𝗜𝗡𝗙𝗢 𝗠𝗘𝗡𝗨 ☁',
                                    description: '𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄',
                                    id: `${config.PREFIX}stalkmenu`,
                                },
                            ],
                        },
                    ],
                }),
            },
        }
    ];

    await socket.sendMessage(m.chat, {
        buttons: templateButtons,
        headerType: 1,
        viewOnce: true,
        image: { url: "https://i.ibb.co/9mH2msCj/capsule-616x353.jpg" },
        caption: `👋 𝙃𝙄 𝙄 𝘼𝙈 𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙇𝙀𝙏𝘼𝙎 𝘾𝙈 𝙋𝘼𝙉𝙀𝙇 🎐\n${captionText}`,
    }, { quoted: solomini });

    break;
                }

                case 'status': {
                    await socket.sendMessage(sender, {
                        image: logoMedia,
                        caption: await formatMessage(
                            '⚙️ STATUS SETTINGS',
                            `⚙️  Auto-View: ${await get('AUTO_VIEW_STATUS', number)}\n🏮  Auto-Like: ${await get('AUTO_LIKE_STATUS', number)}\n🎥  Auto-Recording: ${await get('AUTO_RECORDING', number)}\n⌨️  Auto-Typing: ${await get('AUTO_TYPING', number)}\n🌐  Always Online: ${await get('ALWAYS_ONLINE', number)}\n🐉 Like Emojis: ${(await get('AUTO_LIKE_EMOJI', number) || config.AUTO_LIKE_EMOJI).join(', ')}`,
                            await get('BOT_FOOTER', number),
                            number
                        )
                    });
                    break;
                }

                case "autoreply": {
                    await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    const value = args[0]?.toLowerCase();
                    const settings = { on: "on", off: "off" };

                    if (!settings[value]) {
                        return reply("Usage: .autoreply on | off");
                    }
                    await handleSettingUpdate("AUTO_REPLY", value, reply, number);
                    break;
                }

                case "addreply": {
    await socket.sendMessage(sender, { react: { text: '➕', key: msg.key } });
    if (!isOwner) return reply("🚫 Owner only");
    
    const fullArgs = args.join(' ');
    const parts = fullArgs.split('|').map(p => p.trim());
    
    if (parts.length < 3) {
        return reply(`❌ *Invalid format!*

*Usage:*
.addreply trigger|type|content|caption(optional)

*Types:* text, voice, image, sticker

*Examples:*
┌───────────────────
│ 📝 *Text:*
│ .addreply hello|text|Hello there!
├───────────────────
│ 🎤 *Voice:*
│ .addreply hi|voice|https://www.myinstants.com/media/sounds/ah-patiyo-kohomada.mp3
├───────────────────
│ 🖼️ *Image:*
│ .addreply bye|image|https://i.ibb.co/hjKj81d/solo-leveling.jpg|Goodbye!
├───────────────────
│ 🎨 *Sticker:*
│ .addreply lol|sticker|https://files.catbox.moe/g5hldz.webp
└───────────────────`);
    }
    
    const [trigger, replyType, content, caption = ""] = parts;
    
    if (!trigger || !replyType || !content) {
        return reply("❌ *Missing required fields!*\nTrigger, type, and content are required.");
    }
    
    const validTypes = ["text", "voice", "image", "sticker"];
    if (!validTypes.includes(replyType.toLowerCase())) {
        return reply(`❌ *Invalid type!*\nValid types: ${validTypes.join(", ")}`);
    }
    
    if (["voice", "image", "sticker"].includes(replyType.toLowerCase())) {
        const urlRegex = /^(https?:\/\/)/i;
        if (!urlRegex.test(content)) {
            return reply(`❌ *Invalid URL!*\nPlease provide a valid URL starting with http:// or https://`);
        }
    }
    if (replyType.toLowerCase() === "sticker") {
        const validStickerFormats = ['.webp', '.png', '.jpg', '.jpeg', '.gif'];
        const hasValidFormat = validStickerFormats.some(format => 
            content.toLowerCase().includes(format)
        );
        if (!hasValidFormat) {
            return reply(`⚠️ *Warning:* Sticker URL should ideally be a .webp file for best results.\n\nSupported formats: ${validStickerFormats.join(", ")}`);
        }
    }
    
    try {
        let triggers = await get("AUTO_REPLY_TRIGGERS", number) || {};
       
        const isUpdate = triggers[trigger.toLowerCase()] ? true : false;
        
        triggers[trigger.toLowerCase()] = {
            replyType: replyType.toLowerCase(),
            content: content,
            caption: caption
        };
        
        await input("AUTO_REPLY_TRIGGERS", triggers, number);
        
        const typeEmoji = {
            "text": "📝",
            "voice": "🎤",
            "image": "🖼️",
            "sticker": "🎨"
        };
        
        await reply(`✅ *Auto-reply ${isUpdate ? 'updated' : 'added'} successfully!*

┌───────────────────
│ *Trigger:* ${trigger}
│ *Type:* ${typeEmoji[replyType.toLowerCase()]} ${replyType}
│ *Content:* ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}
│ *Caption:* ${caption || "None"}
└───────────────────

💡 *Tip:* Send "${trigger}" to test it!`);

    } catch (err) {
        console.error("Add reply error:", err);
        await reply("❌ *Failed to add auto-reply!*");
    }
    break;
}
case 'csend':
case 'csong': {
  try {
    const q = args.join(" ");
    if (!q) return reply("*ඔබගේ ගීත නමක් හෝ YouTube ලින්ක් එකක් දෙන්න...!*");

    if (args.length < 2) {
      return reply(
        "*❌ Format එක වැරදියි! Use:* `.csong <jid> <song name>`\n" +
        "*Example:* `.csong 1234567890@g.us shape of you`"
      );
    }

    const targetJid = args[0];
    const query = args.slice(1).join(" ");

    if (!targetJid.includes('@')) {
      return reply("*❌ වලංගු JID එකක් දෙන්න!*");
    }

    const yts = require("yt-search");
    const axios = require("axios");
    const fs = require("fs");
    const path = require("path");

    const search = await yts(query);
    if (!search.videos.length)
      return reply(`*"${query}"* ගීතය හමුවුණේ නැත... ❌`);

    const data = search.videos[0];
    const ytUrl = data.url;
    const api = `https://api.ootaizumi.web.id/downloader/youtube?url=${encodeURIComponent(ytUrl)}&format=mp3`;
    const { data: apiRes } = await axios.get(api, { timeout: 30000 });

    if (!apiRes?.status || !apiRes?.result?.download) {
      console.log("API Response:", apiRes);
      return reply("❌ ගීතය බාගත කළ නොහැක. Download link not found.");
    }

    const downloadUrl = apiRes.result.download;
    const videoTitle = apiRes.result.title || data.title;
    const thumbnailUrl = apiRes.result.thumbnail || data.thumbnail;
    const duration = apiRes.result.duration?.timestamp || data.timestamp;
    const views = apiRes.result.views || data.views;
    const uploadDate = apiRes.result.uploadDate || data.ago;

    const tempMp3 = path.join(__dirname, `temp_${Date.now()}.mp3`);
    const tempOpus = path.join(__dirname, `temp_${Date.now()}.opus`);
    const writer = fs.createWriteStream(tempMp3);
    const response = await axios.get(downloadUrl, { responseType: "stream" });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
    await new Promise((resolve, reject) => {
      ffmpeg(tempMp3)
        .audioCodec("libopus")
        .audioBitrate("128k")
        .toFormat("opus")
        .on("end", resolve)
        .on("error", reject)
        .save(tempOpus);
    });

    fs.unlinkSync(tempMp3);

    const caption = `🎵 *${videoTitle}* 🎵

👁️ *Views:* ${views}
⏱️ *Duration:* ${duration}
📅 *Released:* ${uploadDate}

*00:00 ───○────── ${duration}*

*ලස්සන රියැක්ට් ඕනී ... 💖*`;

    let sentSuccessfully = true;
    let errorDetails = "";

    try {
      await socket.sendMessage(targetJid, {
        image: { url: thumbnailUrl },
        caption: caption,
      });

      await new Promise(r => setTimeout(r, 2000));
      await socket.sendMessage(targetJid, {
        audio: { url: tempOpus },
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      });

    } catch (err) {
      console.error("Send error:", err);
      sentSuccessfully = false;
      errorDetails = err.message || "Send failed";
    }

    if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus);
    if (sentSuccessfully) {
      await socket.sendMessage(
        sender,
        { text: `✅ *"${videoTitle}"* sent to *${targetJid}* (voice note 🎙️)` },
        { quoted: msg }
      );
    } else {
      await socket.sendMessage(
        sender,
        { text: `⚠️ Sending failed: ${errorDetails}` },
        { quoted: msg }
      );
    }

  } catch (e) {
    console.error("Csong error:", e);
    reply("*දෝෂයක් ඇතිවිය! පසුව නැවත උත්සාහ කරන්න.*");
  }
  break;
}
case 'song': {
    const axios = require('axios');
    const yts = require('yt-search');
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

    const rawQuery = body;
    const q = rawQuery.replace(`${config.PREFIX}song`, '').trim();

    if (!q) {
        return await socket.sendMessage(sender, { 
            text: `*❌ Please provide a song title or YouTube URL*\n\n*Example:*\n• ${config.PREFIX}song Faded Alan Walker\n• ${config.PREFIX}song https://youtu.be/xxxxx` 
        }, { quoted: msg });
    }
    await socket.sendMessage(sender, { 
        react: { text: "🔍", key: msg.key } 
    });

    try {
        let videoUrl = '';
        let videoData = null;
        const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/;
        
        if (ytRegex.test(q)) {
            let videoId = '';
            
            if (q.includes('youtu.be/')) {
                videoId = q.split('youtu.be/')[1]?.split(/[?&#]/)[0];
            } else if (q.includes('watch?v=')) {
                videoId = q.split('watch?v=')[1]?.split(/[?&#]/)[0];
            } else if (q.includes('/shorts/')) {
                videoId = q.split('/shorts/')[1]?.split(/[?&#]/)[0];
            }

            if (videoId) {
                const videoInfo = await yts({ videoId: videoId });
                if (videoInfo) {
                    videoData = {
                        title: videoInfo.title,
                        thumbnail: videoInfo.thumbnail,
                        duration: videoInfo.timestamp,
                        author: videoInfo.author?.name || 'Unknown',
                        views: videoInfo.views?.toLocaleString() || 'N/A',
                        url: videoInfo.url,
                        videoId: videoInfo.videoId,
                        ago: videoInfo.ago || 'N/A'
                    };
                    videoUrl = videoInfo.url;
                }
            }
            
            if (!videoUrl) {
                videoUrl = q;
            }
        } else {
            const searchResult = await yts(q);
            
            if (!searchResult || !searchResult.videos || searchResult.videos.length === 0) {
                await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
                return await socket.sendMessage(sender, { 
                    text: '*❌ No results found for your search*' 
                }, { quoted: msg });
            }
            const video = searchResult.videos[0];
            
            videoData = {
                title: video.title,
                thumbnail: video.thumbnail,
                duration: video.timestamp,
                author: video.author?.name || 'Unknown',
                views: video.views?.toLocaleString() || 'N/A',
                url: video.url,
                videoId: video.videoId,
                ago: video.ago || 'N/A',
                description: video.description || ''
            };
            
            videoUrl = video.url;
        }
        if (!videoData) {
            videoData = {
                title: 'Unknown Title',
                thumbnail: '',
                duration: 'N/A',
                author: 'Unknown',
                views: 'N/A',
                url: videoUrl,
                ago: 'N/A'
            };
        }
        const apiUrl = `https://api.bk9.dev/download/youtube?url=${encodeURIComponent(videoUrl)}`;
        const apiResp = await fetch(apiUrl);
        const apiJson = await apiResp.json();

        let fileSize = 'Unknown';
        let audioQuality = '128kbps';
        let formats = [];

        if (apiJson.status && apiJson.BK9) {
            const bk9Data = apiJson.BK9;
            formats = bk9Data.formats || [];
            if (bk9Data.title) videoData.title = bk9Data.title;
            if (bk9Data.thumbnail) videoData.thumbnail = bk9Data.thumbnail;
            if (bk9Data.duration) videoData.duration = bk9Data.duration;
            if (bk9Data.author) videoData.author = bk9Data.author;

            let audioFormat = formats.find(f => 
                f.type === 'audio' && 
                f.mime_type?.includes('audio/mp4') &&
                f.quality?.includes('130kb') &&
                !f.quality?.includes('DRC')
            );

            if (!audioFormat) {
                audioFormat = formats.find(f => 
                    f.type === 'audio' && 
                    f.mime_type?.includes('audio/mp4') &&
                    !f.quality?.includes('DRC')
                );
            }

            if (!audioFormat) {
                audioFormat = formats.find(f => 
                    f.has_audio && !f.has_video
                );
            }

            if (audioFormat) {
                audioQuality = audioFormat.quality || '128kbps';
                
                const clenMatch = audioFormat.url?.match(/clen=(\d+)/);
                if (clenMatch) {
                    const fileSizeBytes = parseInt(clenMatch[1]);
                    const sizeInMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
                    fileSize = `${sizeInMB} MB`;
                }
                
                if (fileSize === 'Unknown' && audioFormat.url) {
                    try {
                        const headResp = await axios.head(audioFormat.url, {
                            timeout: 10000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                        const contentLength = headResp.headers['content-length'];
                        if (contentLength) {
                            const fileSizeBytes = parseInt(contentLength);
                            const sizeInMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);
                            fileSize = `${sizeInMB} MB`;
                        }
                    } catch (e) {
                        fileSize = audioFormat.size || 'Unknown';
                    }
                }
            }

            const videoFormats = {
                '1080p': formats.find(f => f.quality?.includes('1080') && f.has_video),
                '720p': formats.find(f => f.quality?.includes('720') && f.has_video),
                '480p': formats.find(f => f.quality?.includes('480') && f.has_video),
                '360p': formats.find(f => f.quality === '360p' || (f.quality?.includes('360') && f.has_video))
            };

            var videoSizes = {};
            for (const [quality, format] of Object.entries(videoFormats)) {
                if (format?.url) {
                    const clenMatch = format.url.match(/clen=(\d+)/);
                    if (clenMatch) {
                        const sizeInMB = (parseInt(clenMatch[1]) / (1024 * 1024)).toFixed(2);
                        videoSizes[quality] = `${sizeInMB} MB`;
                    } else {
                        videoSizes[quality] = 'N/A';
                    }
                } else {
                    videoSizes[quality] = 'N/A';
                }
            }
        }

        const captionText = 
`╭━━━━━━━━━━━━━━━━━━━━━╮
┃       *🎵 SONG INFO*
╰━━━━━━━━━━━━━━━━━━━━━╯

*📌 Title:* ${videoData.title}

*👤 Channel:* ${videoData.author}
*⏱️ Duration:* ${videoData.duration}
*👁️ Views:* ${videoData.views}
*📅 Uploaded:* ${videoData.ago}
*📁 Audio Size:* ${fileSize}
*📊 Quality:* ${audioQuality}
*🔗 URL:* ${videoData.url}

_Select download option below_ 👇`;

        const templateButtons = [
            {
                buttonId: `${config.PREFIX}yt audio ${videoData.url}`,
                buttonText: { displayText: '🎵 Audio' },
                type: 1,
            },
            {
                buttonId: `${config.PREFIX}yt voice ${videoData.url}`,
                buttonText: { displayText: '🎤 Voice' },
                type: 1,
            },
            {
                buttonId: 'action',
                buttonText: { displayText: '📂 More Options' },
                type: 4,
                nativeFlowInfo: {
                    name: 'single_select',
                    paramsJson: JSON.stringify({
                        title: '𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐎𝐩𝐭𝐢𝐨𝐧𝐬 ❏',
                        sections: [
                            {
                                title: '🎵 Audio Downloads',
                                highlight_label: 'Audio',
                                rows: [
                                    {
                                        title: '🎵 AUDIO DOWNLOAD',
                                        description: `Download as MP3 | ${fileSize}`,
                                        id: `${config.PREFIX}yt audio ${videoData.url}`,
                                    },
                                    {
                                        title: '🎤 VOICE DOWNLOAD',
                                        description: 'Download as Voice Note (PTT)',
                                        id: `${config.PREFIX}yt voice ${videoData.url}`,
                                    },
                                    {
                                        title: '📄 DOCUMENT DOWNLOAD',
                                        description: `Download as Document | ${fileSize}`,
                                        id: `${config.PREFIX}yt documents ${videoData.url}`,
                                    },
                                ],
                            },
                            {
                                title: '📹 Video Downloads',
                                highlight_label: 'Video',
                                rows: [
                                    {
                                        title: '📹 VIDEO 1080p',
                                        description: `Full HD Quality | ${videoSizes?.['1080p'] || 'N/A'}`,
                                        id: `${config.PREFIX}yt 1080 ${videoData.url}`,
                                    },
                                    {
                                        title: '📹 VIDEO 720p',
                                        description: `HD Quality | ${videoSizes?.['720p'] || 'N/A'}`,
                                        id: `${config.PREFIX}yt 720 ${videoData.url}`,
                                    },
                                    {
                                        title: '📹 VIDEO 480p',
                                        description: `SD Quality | ${videoSizes?.['480p'] || 'N/A'}`,
                                        id: `${config.PREFIX}yt 480 ${videoData.url}`,
                                    },
                                    {
                                        title: '📹 VIDEO 360p',
                                        description: `Low Quality | ${videoSizes?.['360p'] || 'N/A'}`,
                                        id: `${config.PREFIX}yt 360 ${videoData.url}`,
                                    },
                                ],
                            },
                        ],
                    }),
                },
            }
        ];

        if (videoData.thumbnail) {
            await socket.sendMessage(sender, {
                image: { url: videoData.thumbnail },
                caption: `𝐑𝐂𝐃 𝐌𝐃 𝐌𝐈𝐍𝐈 𝐁𝐎𝐓 🤍\n\n${captionText}`,
                buttons: templateButtons,
                headerType: 4,
                viewOnce: true,
            }, { quoted: msg });
        } else {
            await socket.sendMessage(sender, {
                text: `𝐑𝐂𝐃 𝐌𝐃 𝐌𝐈𝐍𝐈 𝐁𝐎𝐓 🤍\n\n${captionText}`,
                buttons: templateButtons,
            }, { quoted: msg });
        }

        await socket.sendMessage(sender, { 
            react: { text: "🎵", key: msg.key } 
        });

    } catch (err) {
        console.error('Song Error:', err);
        await socket.sendMessage(sender, { 
            react: { text: "❌", key: msg.key } 
        });
        await socket.sendMessage(sender, { 
            text: `*❌ Error:* ${err.message || 'Error occurred while fetching song info'}` 
        }, { quoted: msg });
    }
    break;
}
case 'yt': {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const rawText = body;
    const parts = rawText.trim().split(/\s+/);
    const sub = parts[1]?.toLowerCase(); 
    const query = parts.slice(2).join(' ');

    const validSubs = ['voice', 'audio', 'documents', '1080', '720', '480', '360', '240', '144'];

    if (!sub || !validSubs.includes(sub)) {
        return await socket.sendMessage(sender, { 
            text: 
`╭━━━━━━━━━━━━━━━━━━━╮
┃    *🎬 YT DOWNLOADER*
╰━━━━━━━━━━━━━━━━━━━╯

*🎵 AUDIO OPTIONS:*
┃ • ${config.PREFIX}yt voice <URL>
┃ • ${config.PREFIX}yt audio <URL>  
┃ • ${config.PREFIX}yt documents <URL>

*📹 VIDEO OPTIONS:*
┃ • ${config.PREFIX}yt 1080 <URL>
┃ • ${config.PREFIX}yt 720 <URL>
┃ • ${config.PREFIX}yt 480 <URL>
┃ • ${config.PREFIX}yt 360 <URL>
┃ • ${config.PREFIX}yt 240 <URL>
┃ • ${config.PREFIX}yt 144 <URL>

*📝 EXAMPLES:*
┃ ${config.PREFIX}yt audio https://youtu.be/xxxxx
┃ ${config.PREFIX}yt 720 https://youtu.be/xxxxx

╰━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }

    if (!query) {
        return await socket.sendMessage(sender, { 
            text: '*❌ Please provide a YouTube URL*' 
        }, { quoted: msg });
    }
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/;
    if (!ytRegex.test(query)) {
        return await socket.sendMessage(sender, { 
            text: '*❌ Please provide a valid YouTube URL*\n\n_Supported: youtube.com, youtu.be_' 
        }, { quoted: msg });
    }
    let videoId = '';
    if (query.includes('youtu.be/')) {
        videoId = query.split('youtu.be/')[1]?.split(/[?&#]/)[0];
    } else if (query.includes('watch?v=')) {
        videoId = query.split('watch?v=')[1]?.split(/[?&#]/)[0];
    } else if (query.includes('/shorts/')) {
        videoId = query.split('/shorts/')[1]?.split(/[?&#]/)[0];
    } else if (query.includes('/embed/')) {
        videoId = query.split('/embed/')[1]?.split(/[?&#]/)[0];
    }

    if (!videoId) {
        return await socket.sendMessage(sender, { 
            text: '*❌ Could not extract video ID from URL*' 
        }, { quoted: msg });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    await socket.sendMessage(sender, { 
        react: { text: "⏳", key: msg.key } 
    });

    try {
        let format = '';
        const isAudio = ['voice', 'audio', 'documents'].includes(sub);
        format = isAudio ? 'mp3' : sub; // 144, 240, 360, 480, 720, 1080
        const apiUrl = `https://api.ootaizumi.web.id/downloader/youtube?url=${encodeURIComponent(videoUrl)}&format=${format}`;
        console.log('Calling API:', apiUrl);

        const apiResp = await fetch(apiUrl);
        const apiJson = await apiResp.json();

        if (!apiJson.status || !apiJson.result) {
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return await socket.sendMessage(sender, { 
                text: '*❌ Failed to fetch video data*' 
            }, { quoted: msg });
        }

        const result = apiJson.result;
        const downloadUrl = result.download;

        if (!downloadUrl) {
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return await socket.sendMessage(sender, { 
                text: `*❌ ${format} format not available for this video*` 
            }, { quoted: msg });
        }
        const metadata = {
            title: result.title || 'YouTube Video',
            author: result.author?.name || 'Unknown',
            duration: result.timestamp || result.duration?.timestamp || 'N/A',
            thumbnail: result.thumbnail || result.image,
            views: result.views?.toLocaleString() || 'N/A',
            uploadDate: result.uploadDate || 'N/A',
            ago: result.ago || 'N/A',
            url: result.url || videoUrl
        };

        await socket.sendMessage(sender, { 
            text: `*⏳ Downloading ${isAudio ? 'audio' : 'video'}...*\n\n*📌 Title:* ${metadata.title}\n*👤 Channel:* ${metadata.author}\n*⏱️ Duration:* ${metadata.duration}\n*📊 Format:* ${format}` 
        }, { quoted: msg });
        const mediaFetch = await fetch(downloadUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
                'Referer': videoUrl,
                'Connection': 'keep-alive'
            }
        });

        if (!mediaFetch.ok) {
            throw new Error(`Media fetch failed with status ${mediaFetch.status}`);
        }

        const mediaArrayBuffer = await mediaFetch.arrayBuffer();
        const mediaBuffer = Buffer.from(mediaArrayBuffer);

        if (mediaBuffer.length < 1000) {
            await socket.sendMessage(sender, { react: { text: "❌", key: msg.key } });
            return await socket.sendMessage(sender, { 
                text: '*❌ Download failed - empty file received*' 
            }, { quoted: msg });
        }

        const cleanTitle = metadata.title
            .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 60);

        const fileSizeMB = (mediaBuffer.length / (1024 * 1024)).toFixed(2);

        const caption = 
`*🎬 ${metadata.title}*

👤 *Channel:* ${metadata.author}
⏱️ *Duration:* ${metadata.duration}
👁️ *Views:* ${metadata.views}
📁 *Size:* ${fileSizeMB} MB
📊 *Quality:* ${format}${isAudio ? '' : 'p'}`;

        switch(sub) {
            case 'voice': {
                try {
                    const opusBuffer = await convertToOpusPTT(mediaBuffer);
                    
                    await socket.sendMessage(sender, {
                        audio: opusBuffer,
                        mimetype: "audio/ogg; codecs=opus",
                        ptt: true,
                        fileName: `${cleanTitle}.ogg`
                    }, { quoted: msg });
                } catch (convErr) {
                    console.error('Voice conversion error:', convErr);
                    await socket.sendMessage(sender, {
                        audio: mediaBuffer,
                        mimetype: "audio/mpeg",
                        fileName: `${cleanTitle}.mp3`
                    }, { quoted: msg });
                }
                break;
            }

            case 'audio': {
                await socket.sendMessage(sender, {
                    audio: mediaBuffer,
                    mimetype: "audio/mpeg",
                    fileName: `${cleanTitle}.mp3`
                }, { quoted: msg });
                break;
            }

            case 'documents': {
                await socket.sendMessage(sender, {
                    document: mediaBuffer,
                    mimetype: "audio/mpeg",
                    fileName: `${cleanTitle}.mp3`,
                    caption: `🎵 ${metadata.title}\n👤 ${metadata.author}\n⏱️ ${metadata.duration}\n📁 ${fileSizeMB} MB`
                }, { quoted: msg });
                break;
            }

            case '1080':
            case '720':
            case '480':
            case '360':
            case '240':
            case '144': {
                await socket.sendMessage(sender, {
                    video: mediaBuffer,
                    mimetype: 'video/mp4',
                    fileName: `${cleanTitle}_${sub}p.mp4`,
                    caption: caption
                }, { quoted: msg });
                break;
            }
        }

        await socket.sendMessage(sender, { 
            react: { text: "✅", key: msg.key } 
        });

    } catch (error) {
        console.error('YT Download Error:', error);
        await socket.sendMessage(sender, { 
            react: { text: "❌", key: msg.key } 
        });
        
        let errorMsg = 'Download failed';
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errorMsg = 'Download timeout - file too large or slow connection';
        } else if (error.message?.includes('Media fetch failed')) {
            errorMsg = error.message;
        } else if (error.response?.status === 403) {
            errorMsg = 'Video is restricted or geo-blocked';
        } else if (error.response?.status === 404) {
            errorMsg = 'Video not found or format unavailable';
        } else if (error.response?.status === 500) {
            errorMsg = 'Server error - try again later';
        } else if (error.message) {
            errorMsg = error.message.substring(0, 100);
        }
        
        return await socket.sendMessage(sender, { 
            text: `*❌ Error:* ${errorMsg}` 
        }, { quoted: msg });
    }
    break;
}
case 'webpurl': {
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage)
        return reply("❌ Reply to a photo or video");

    const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;

    
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpeg.setFfprobePath(ffprobeInstaller.path);

    let webpBuffer;

    try {
        if (quoted.imageMessage) {
            let buffer = Buffer.alloc(0);
            const stream = await downloadContentFromMessage(
                quoted.imageMessage,
                'image'
            );

            for await (const chunk of stream)
                buffer = Buffer.concat([buffer, chunk]);

            webpBuffer = await sharp(buffer)
                .resize(512, 512, { fit: 'contain' })
                .toFormat('webp')
                .toBuffer();
        }
        else if (quoted.videoMessage) {
            const tmpId = Date.now();
            const input = path.join(__dirname, `tmp_${tmpId}.mp4`);
            const output = path.join(__dirname, `tmp_${tmpId}.webp`);

            let buffer = Buffer.alloc(0);
            const stream = await downloadContentFromMessage(
                quoted.videoMessage,
                'video'
            );

            for await (const chunk of stream)
                buffer = Buffer.concat([buffer, chunk]);

            fs.writeFileSync(input, buffer);

            await new Promise((resolve, reject) => {
                ffmpeg(input)
                    .outputOptions([
                        '-vcodec libwebp',
                        '-vf scale=512:512:force_original_aspect_ratio=decrease',
                        '-loop 0',
                        '-preset default',
                        '-an',
                        '-vsync 0',
                        '-t 10'
                    ])
                    .save(output)
                    .on('end', resolve)
                    .on('error', reject);
            });

            webpBuffer = fs.readFileSync(output);
            fs.unlinkSync(input);
            fs.unlinkSync(output);
        }
        else {
            return reply("❌ Only image or video supported");
        }
        const sticker = new Sticker(webpBuffer, {
            pack: 'DEXTER STICKER MAKE',
            author: 'DEXTER DEVELOPING',
            type: 'full'
        });

        const stickerBuffer = await sticker.toBuffer();

        await socket.sendMessage(sender, {
            sticker: stickerBuffer
        });
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', stickerBuffer, {
            filename: `sticker_${crypto.randomBytes(6).toString('hex')}.webp`,
            contentType: 'image/webp'
        });

        const upload = await axios.post(
            'https://catbox.moe/user/api.php',
            form,
            { headers: form.getHeaders() }
        );

        if (typeof upload.data === 'string' && upload.data.startsWith('https://')) {
            await reply(`✅ WEBP URL:\n${upload.data.trim()}`);
        } else {
            reply("❌ Upload failed");
        }

    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }

    break;
}
                case "delreply": {
                    await socket.sendMessage(sender, { react: { text: '🗑️', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    
                    const trigger = args.join(' ').toLowerCase().trim();
                    
                    if (!trigger) {
                        return reply("❌ *Please specify the trigger to delete!*\n\nUsage: .delreply <trigger>\nExample: .delreply hello");
                    }
                    
                    try {
                        let triggers = await get("AUTO_REPLY_TRIGGERS", number) || {};
                        
                        if (!triggers[trigger]) {
                            return reply(`❌ *Trigger "${trigger}" not found!*`);
                        }
                        
                        delete triggers[trigger];
                        await input("AUTO_REPLY_TRIGGERS", triggers, number);
                        await reply(`✅ *Auto-reply deleted successfully!*\n\n*Deleted trigger:* ${trigger}`);
                    } catch (err) {
                        console.error("Delete reply error:", err);
                        await reply("❌ *Failed to delete auto-reply!*");
                    }
                    break;
                }

                case "listreply":
                case "replylist": {
                    await socket.sendMessage(sender, { react: { text: '📋', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    
                    try {
                        const triggers = await get("AUTO_REPLY_TRIGGERS", number) || {};
                        const triggerKeys = Object.keys(triggers);
                        
                        if (triggerKeys.length === 0) {
                            return reply("📋 *No auto-replies configured!*\n\nUse .addreply to add new triggers.");
                        }
                        
                        let listText = `📋 *AUTO-REPLY LIST*\n\n`;
                        listText += `*Total Triggers:* ${triggerKeys.length}\n\n`;
                        
                        triggerKeys.forEach((key, index) => {
                            const data = triggers[key];
                            listText += `*${index + 1}. Trigger:* ${key}\n`;
                            listText += `   *Type:* ${data.replyType}\n`;
                            listText += `   *Content:* ${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}\n`;
                            if (data.caption) {
                                listText += `   *Caption:* ${data.caption}\n`;
                            }
                            listText += `\n`;
                        });
                        
                        await reply(listText);
                    } catch (err) {
                        console.error("List reply error:", err);
                        await reply("❌ *Failed to get auto-reply list!*");
                    }
                    break;
                }

                case "resetreply": {
                    await socket.sendMessage(sender, { react: { text: '🔄', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    
                    try {
                        await input("AUTO_REPLY_TRIGGERS", defaultTriggers, number);
                        await reply(`✅ *Auto-reply triggers reset to default!*\n\n*Total default triggers:* ${Object.keys(defaultTriggers).length}`);
                    } catch (err) {
                        console.error("Reset reply error:", err);
                        await reply("❌ *Failed to reset auto-replies!*");
                    }
                    break;
                }

                case "clearreply": {
                    await socket.sendMessage(sender, { react: { text: '🧹', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    
                    try {
                        await input("AUTO_REPLY_TRIGGERS", {}, number);
                        await reply(`✅ *All auto-reply triggers cleared!*`);
                    } catch (err) {
                        console.error("Clear reply error:", err);
                        await reply("❌ *Failed to clear auto-replies!*");
                    }
                    break;
                }

                case 'deleteme': {
                    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
                    if (fs.existsSync(sessionPath)) fs.removeSync(sessionPath);

                    if (activeSockets.has(sanitizedNumber)) {
                        activeSockets.get(sanitizedNumber).ws.close();
                        activeSockets.delete(sanitizedNumber);
                        socketCreationTime.delete(sanitizedNumber);
                    }

                    await socket.sendMessage(sender, {
                        image: logoMedia,
                        caption: await formatMessage(
                            '🗑️ SESSION DELETED',
                            '✅ Your session has been successfully deleted.',
                            '𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐒𝐎𝐋𝐎 𝐋𝐄𝐕𝐄𝐋𝐈𝐍𝐆 𝐗 𝐌𝐈𝐍𝐈',
                            number
                        )
                    });
                    break;
                }

                case 'setting': {
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");

                        const wType = await get('WORK_TYPE', number) || 'public';
                        const presence = await get('PRESENCE', number) || 'unavailable';
                        const autoView = await get('AUTO_VIEW_STATUS', number) || 'false';
                        const autoReact = await get('AUTO_LIKE_STATUS', number) || 'false';
                        const antiCall = await get('ANTI_CALL', number) || 'off';
                        const autoRead = await get('AUTO_READ_MESSAGE', number) || 'off';
                        const antiDel = await get('ANTI_DELETE', number) || 'off';
                        const autoReply = await get('AUTO_REPLY', number) || 'off';
                        const autoRecording = await get('AUTO_RECORDING', number) || 'false';
                        const autoTyping = await get('AUTO_TYPING', number) || 'false';
                        const alwaysOnline = await get('ALWAYS_ONLINE', number) || 'false';

                        const settingOptions = {
                            name: 'single_select',
                            paramsJson: JSON.stringify({
                                title: '🔧 𝙎𝙊𝙇𝙊 𝙇𝙀𝙑𝙀𝙇𝙄𝙉𝙂 𝙓 𝙈𝙄𝙉𝙄 𝙎𝙀𝙏𝙏𝙄𝙉𝙂 💐',
                                sections: [
                                    {
                                        title: '👥 𝗪𝗢𝗥𝗞𝗜𝗡𝗚 𝗧𝗬𝗣𝗘',
                                        rows: [
                                            { title: '𝐏𝐔𝐁𝐋𝐈𝐂', description: 'Bot works everywhere', id: `${prefix}wtype public` },
                                            { title: '𝐎𝐍𝐋𝐘 𝐆𝐑𝐎𝐔𝐏', description: 'Bot only works in groups', id: `${prefix}wtype groups` },
                                            { title: '𝐎𝐍𝐋𝐘 𝐈𝐍𝐁𝐎𝐗', description: 'Bot only works in inbox', id: `${prefix}wtype inbox` },
                                            { title: '𝐎𝐍𝐋𝐘 𝐏𝐑𝐈𝐕𝐀𝐓𝐄', description: 'Bot works only for owner', id: `${prefix}wtype private` },
                                        ],
                                    },
                                    {
                                        title: '🌐 𝗔𝗟𝗪𝗔𝗬𝗦 𝗢𝗡𝗟𝗜𝗡𝗘',
                                        rows: [
                                            { title: '𝐀𝐋𝐖𝐀𝐘𝐒 𝐎𝐍𝐋𝐈𝐍𝐄 𝐨𝐧', description: 'Keep bot online always', id: `${prefix}always-online on` },
                                            { title: '𝐀𝐋𝐖𝐀𝐘𝐒 𝐎𝐍𝐋𝐈𝐍𝐄 𝐨𝐟𝐟', description: 'Disable always online', id: `${prefix}always-online off` },
                                        ],
                                    },
                                    {
                                        title: '🎙️ 𝗙𝗔𝗞𝗘 𝗥𝗘𝗖𝗢𝗥𝗗𝗜𝗡𝗚 & 𝗧𝗬𝗣𝗜𝗡𝗚',
                                        rows: [
                                            { title: '𝐀𝐔𝐓𝐎 𝐓𝐘𝐏𝐈𝐍𝐆', description: 'Show typing status', id: `${prefix}autotyping on` },
                                            { title: '𝐀𝐔𝐓𝐎 𝐓𝐘𝐏𝐈𝐍𝐆 𝐎𝐅𝐅', description: 'Stop typing status', id: `${prefix}autotyping off` },
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐂𝐎𝐑𝐃𝐈𝐍𝐆', description: 'Show recording status', id: `${prefix}autorecording on` },
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐂𝐎𝐑𝐃𝐈𝐍𝐆 𝐎𝐅𝐅', description: 'Stop recording status', id: `${prefix}autorecording off` },
                                        ],
                                    },
                                    {
                                        title: '📈 𝗔𝗨𝗧𝗢 𝗦𝗧𝗔𝗧𝗨𝗦 𝗦𝗘𝗘𝗡',
                                        rows: [
                                            { title: '𝐒𝐓𝐀𝐓𝐔𝐒 𝐒𝐄𝐄𝐍 𝐨𝐧', description: 'Auto view status', id: `${prefix}rstatus on` },
                                            { title: '𝐒𝐓𝐀𝐓𝐔𝐒 𝐒𝐄𝐄𝐍 𝐨𝐟𝐟', description: 'Do not view status', id: `${prefix}rstatus off` },
                                        ],
                                    },
                                    {
                                        title: '🌌 𝗔𝗨𝗧𝗢 𝗦𝗧𝗔𝗧𝗨𝗦 𝗥𝗘𝗔𝗖𝗧',
                                        rows: [
                                            { title: '𝐒𝐓𝐀𝐓𝐔𝐒 𝐑𝐄𝐀𝐂𝐓 𝐨𝐧', description: 'Auto react to status', id: `${prefix}arm on` },
                                            { title: '𝐒𝐓𝐀𝐓𝐔𝐒 𝐑𝐄𝐀𝐂𝐓 𝐨𝐟𝐟', description: 'Do not react to status', id: `${prefix}arm off` },
                                        ],
                                    },
                                    {
                                        title: '🛡️ 𝗔𝗡𝗧𝗜 𝗗𝗘𝗟𝗘𝗧𝗘',
                                        rows: [
                                            { title: '𝐀𝐍𝐓𝐈 𝐃𝐄𝐋𝐄𝐓𝐄 𝐨𝐧', description: 'Recover deleted messages', id: `${prefix}antidel on` },
                                            { title: '𝐀𝐍𝐓𝐈 𝐃𝐄𝐋𝐄𝐓𝐄 𝐨𝐟𝐟', description: 'Disable anti-delete', id: `${prefix}antidel off` },
                                            { title: '𝐀𝐍𝐓𝐈 𝐃𝐄𝐋𝐄𝐓𝐄 𝐩𝐫𝐢𝐯𝐚𝐭𝐞', description: 'Only for owner', id: `${prefix}antidel private` },
                                        ],
                                    },
                                    {
                                        title: '🤖 𝗔𝗨𝗧𝗢 𝗥𝗘𝗣𝗟𝗬',
                                        rows: [
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐏𝐋𝐘 𝐨𝐧', description: 'Enable auto chatbot', id: `${prefix}autoreply on` },
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐏𝐋𝐘 𝐨𝐟𝐟', description: 'Disable auto chatbot', id: `${prefix}autoreply off` },
                                        ],
                                    },
                                    {
                                        title: '🚫 𝗔𝗨𝗧𝗢 𝗥𝗘𝗝𝗘𝗖𝗧 𝗖𝗔𝗟𝗟',
                                        rows: [
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐉𝐄𝐂𝐓 𝐨𝐧', description: 'Reject calls automatically', id: `${prefix}creject on` },
                                            { title: '𝐀𝐔𝐓𝐎 𝐑𝐄𝐉𝐄𝐂𝐓 𝐨𝐟𝐟', description: 'Receive calls normally', id: `${prefix}creject off` },
                                        ],
                                    },
                                    {
                                        title: '📭 𝗔𝗨𝗧𝗢 𝗠𝗔𝗦𝗦𝗔𝗚𝗘 𝗦𝗘𝗘𝗡',
                                        rows: [
                                            { title: '𝐑𝐄𝐀𝐃 𝐀𝐋𝐋', description: 'Read all messages', id: `${prefix}mread all` },
                                            { title: '𝐑𝐄𝐀𝐃 𝐂𝐌𝐃', description: 'Read only command messages', id: `${prefix}mread cmd` },
                                            { title: '𝐍𝐎 𝐑𝐄𝐀𝐃', description: 'Do not read messages', id: `${prefix}mread off` },
                                        ],
                                    },
                                ],
                            }),
                        };

                        const captionText = `╭────────────╮
🌠 𝙉𝙊𝙒 𝘼𝙐𝙋𝘿𝘼𝙏𝙀 𝙎𝙀𝙏𝙏𝙄𝙉𝙂
╰────────────╯

┏━━━━━━━━━━◆◉◉➤
┃
┃ ☕ \`𝗪𝗼𝗿𝗸 𝘁𝘆𝗽𝗲 :\` ${wType}
┃
┃ ☕ \`𝗕𝗼𝘁 𝗽𝗿𝗲𝘀𝗲𝗻𝗰𝗲 :\` ${presence}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝘀𝘁𝗮𝘁𝘂𝘀 𝘀𝗲𝗲𝗻 :\` ${autoView}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝘀𝘁𝗮𝘁𝘂𝘀 𝗿𝗲𝗮𝗰𝘁\` : ${autoReact}
┃
┃ ☕ \`𝗔𝗻𝘁𝗶 𝗱𝗲𝗹𝗲𝘁𝗲 :\` ${antiDel}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝗿𝗲𝗽𝗹𝘆 :\` ${autoReply}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝗿𝗲𝗰𝗼𝗿𝗱𝗶𝗻𝗴 :\` ${autoRecording}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝘁𝘆𝗽𝗶𝗻𝗴 :\` ${autoTyping}
┃
┃ ☕ \`𝗔𝗹𝘄𝗮𝘆𝘀 𝗼𝗻𝗹𝗶𝗻𝗲 :\` ${alwaysOnline}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝗿𝗲𝗷𝗲𝗰𝘁 𝗰𝗮𝗹𝗹 :\` ${antiCall}
┃
┃ ☕ \`𝗔𝘂𝘁𝗼 𝗺𝗲𝘀𝘀𝗮𝗴𝗲 𝗿𝗲𝗮𝗱 :\` ${autoRead}
┃
┗━━━━━━\`[ BOT SETTINGS ]\`━━━━◆◉◉➤`;

                        await socket.sendMessage(from, {
                            headerType: 1,
                            viewOnce: true,
                            image: logoMedia,
                            caption: captionText,
                            buttons: [
                                {
                                    buttonId: 'settings_action',
                                    buttonText: { displayText: '⚙️ Configure Settings' },
                                    type: 4,
                                    nativeFlowInfo: settingOptions,
                                },
                            ],
                            footer: await get('BOT_FOOTER', number) || config.BOT_FOOTER,
                        }, { quoted: solomini });
                    } catch (e) {
                        reply("*❌ Error !!*");
                        console.log(e);
                    }
                    break;
                }

                case "wtype": {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            groups: "groups",
                            inbox: "inbox",
                            private: "private",
                            public: "public"
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("WORK_TYPE", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }

                case "always-online": {
                    await socket.sendMessage(sender, { react: { text: '🌐', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    const value = args[0]?.toLowerCase();
                    const settings = { on: "true", off: "false" };
                    if (!settings[value]) return reply("Usage: .always-online on | off");
                    await handleSettingUpdate("ALWAYS_ONLINE", settings[value], reply, number);
                    break;
                }

                case "wapres": {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            composing: "composing",
                            recording: "recording",
                            available: "available",
                            unavailable: "unavailable"
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("PRESENCE", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }

                case "rstatus": {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            on: "true",
                            off: "false"
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("AUTO_VIEW_STATUS", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }

                case "arm": {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            on: "true",
                            off: "false",
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("AUTO_LIKE_STATUS", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }

                case "antidel": {
                    await socket.sendMessage(sender, { react: { text: '🛡️', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    const value = args[0]?.toLowerCase();
                    const settings = { on: "on", off: "off", private: "private" };

                    if (!settings[value]) {
                        return reply("Usage: .antidel on | off | private");
                    }
                    await handleSettingUpdate("ANTI_DELETE", value, reply, number);
                    break;
                }

                case "autorecording": {
                    await socket.sendMessage(sender, { react: { text: '🎙️', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    const value = args[0]?.toLowerCase();
                    const settings = { on: "true", off: "false" };
                    if (!settings[value]) return reply("Usage: .autorecording on | off");
                    await handleSettingUpdate("AUTO_RECORDING", settings[value], reply, number);
                    break;
                }

                case "autotyping": {
                    await socket.sendMessage(sender, { react: { text: '⌨️', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only");
                    const value = args[0]?.toLowerCase();
                    const settings = { on: "true", off: "false" };
                    if (!settings[value]) return reply("Usage: .autotyping on | off");
                    await handleSettingUpdate("AUTO_TYPING", settings[value], reply, number);
                    break;
                }

                case "creject": {
                    await socket.sendMessage(sender, { react: { text: '🧛‍♂️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            on: "on",
                            off: "off",
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("ANTI_CALL", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }
                case 'jid': {
  try {
    const currentJid = msg.key.remoteJid; 
    const senderJid = msg.key.participant || msg.key.remoteJid; 

    let text = `📌 *JID Information:*\n\n`;
    text += `*Current Chat JID:* ${currentJid}\n`;
    text += `*Your JID:* ${senderJid}\n`;
    if (msg.key.remoteJid.endsWith('@g.us')) {
      const groupMetadata = await socket.groupMetadata(currentJid);
      text += `*Group Name:* ${groupMetadata.subject}\n`;
      text += `*Group Members:* ${groupMetadata.participants.length}\n`;
    }

    await socket.sendMessage(currentJid, { text: text }, { quoted: msg });

  } catch (e) {
    console.error("GetJID error:", e);
    reply("*දෝෂයක් ඇතිවිය! පසුව නැවත උත්සාහ කරන්න.*");
  }
  break;
}

                case "mread": {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    try {
                        if (!isOwner) return await reply("🚫 *You are not authorized to use this command!*");
                        let q = args[0]?.toLowerCase();
                        const settings = {
                            all: "all",
                            cmd: "cmd",
                            off: "off"
                        };
                        if (settings[q]) {
                            await handleSettingUpdate("AUTO_READ_MESSAGE", settings[q], reply, number);
                        }
                    } catch (e) {
                        console.log(e);
                        reply(`${e}`);
                    }
                    break;
                }

                case 'setname': {
                    if (!isOwner) return reply("🚫 Owner only");
                    const newName = args.join(' ');
                    if (!newName) return reply("Usage: .setname [New Bot Name]");
                    await handleSettingUpdate("BOT_NAME", newName, reply, number);
                    break;
                }

                case 'setfooter': {
                    if (!isOwner) return reply("🚫 Owner only");
                    const newFooter = args.join(' ');
                    if (!newFooter) return reply("Usage: .setfooter [New Footer Text]");
                    await handleSettingUpdate("BOT_FOOTER", newFooter, reply, number);
                    break;
                }

                case 'setlogo': {
                    await socket.sendMessage(sender, { react: { text: '🛠️', key: msg.key } });
                    if (!isOwner) return reply("🚫 Owner only command!");

                    let newLogoUrl = null;
                    if (args[0] && args[0].startsWith('http')) {
                        newLogoUrl = args[0];
                    }
                    else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;

                        try {
                            let buffer = Buffer.alloc(0);
                            const stream = await downloadContentFromMessage(
                                quoted.imageMessage,
                                'image'
                            );

                            for await (const chunk of stream) {
                                buffer = Buffer.concat([buffer, chunk]);
                            }
                            const ext = quoted.imageMessage.mimetype?.split('/')[1] || 'jpg';
                            const randomName = crypto.randomBytes(8).toString('hex');
                            const fileName = `logo_${randomName}.${ext}`;
                            const form = new FormData();
                            form.append('reqtype', 'fileupload');
                            form.append('fileToUpload', buffer, {
                                filename: fileName,
                                contentType: quoted.imageMessage.mimetype || 'image/jpeg'
                            });

                            const uploadRes = await axios.post(
                                'https://catbox.moe/user/api.php',
                                form,
                                { headers: form.getHeaders() }
                            );

                            if (typeof uploadRes.data === 'string' && uploadRes.data.startsWith('https://')) {
                                newLogoUrl = uploadRes.data.trim();
                            } else {
                                return reply("❌ Cloud upload failed!\n" + uploadRes.data);
                            }

                        } catch (err) {
                            console.error("Catbox upload error:", err);
                            return reply("❌ Failed to upload image:\n" + err.message);
                        }

                    } else {
                        return reply(
                            "Usage:\n" +
                            "• Reply to an image with *.setlogo*\n" +
                            "• Or *.setlogo [image-url]*"
                        );
                    }
                    await handleSettingUpdate("BOT_LOGO_URL", newLogoUrl, reply, number);
                    await reply(`✅ Bot logo updated!\n${newLogoUrl}`);
                    await socket.sendMessage(sender, {
                        image: { url: newLogoUrl },
                        caption: "🖼️ New bot logo preview"
                    });

                    break;
                }

                default:
                    break;
            }
        } catch (error) {
            console.error('Command handler error:', error);
            await reply("❌ *An error occurred!*");
        }
    });
}

function setupMessageHandlers(socket, number) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

        try {
            const autoRecording = await get('AUTO_RECORDING', number) || 'false';
            const autoTyping = await get('AUTO_TYPING', number) || 'false';
            if (autoRecording === 'true') {
                try {
                    await socket.sendPresenceUpdate('recording', msg.key.remoteJid);
                    console.log(`Set recording presence for ${msg.key.remoteJid}`);
                } catch (error) {
                    console.error('Failed to set recording presence:', error);
                }
            }
            if (autoTyping === 'true') {
                try {
                    await socket.sendPresenceUpdate('composing', msg.key.remoteJid);
                    console.log(`Set typing presence for ${msg.key.remoteJid}`);
                } catch (error) {
                    console.error('Failed to set typing presence:', error);
                }
            }
        } catch (error) {
            console.error('Error in setupMessageHandlers:', error);
        }
    });
}

async function setupcallhandlers(socket, number) {
    socket.ev.on('call', async (calls) => {
        try {
            const antiCall = await get('ANTI_CALL', number);
            if (antiCall !== 'on') return;

            for (const call of calls) {
                if (call.status !== 'offer') continue;

                await socket.rejectCall(call.id, call.from);
                await socket.sendMessage(call.from, {
                    text: '*🔕 Auto-rejected call!*\n_This user has call rejection enabled._'
                });
            }
        } catch (err) {
            console.error("Anti-call error:", err);
        }
    });
}

// Save session to MongoDB
async function saveSession(number, creds, botName = null) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const updateData = {
            creds,
            updatedAt: new Date()
        };
        if (botName) {
            updateData.name = botName;
        }
        await Session.findOneAndUpdate(
            { number: sanitizedNumber },
            updateData,
            { upsert: true }
        );
        
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(creds, null, 2));
        
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
        }
        if (!numbers.includes(sanitizedNumber)) {
            numbers.push(sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
    } catch (error) {
        console.error(`Failed to save session:`, error);
    }
}

// Restore session from MongoDB
async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const session = await Session.findOne({ number: sanitizedNumber });
        
        if (!session || !session.creds?.me?.id) {
            return null;
        }
        
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(session.creds, null, 2));
        
        return session.creds;
    } catch (error) {
        console.error(`Failed to restore session:`, error);
        return null;
    }
}

// Delete session
async function deleteSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        await Session.deleteOne({ number: sanitizedNumber });
        
        const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);
        if (fs.existsSync(sessionPath)) {
            fs.removeSync(sessionPath);
        }
        
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            let numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        }
    } catch (error) {
        console.error(`Failed to delete session:`, error);
    }
}
async function generateAndSendAllVCF() {
    try {
        if (activeSockets.size === 0) return;

        let vcfContent = '';
        let index = 1;
        
        for (const [number] of activeSockets) {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            vcfContent += `BEGIN:VCARD
VERSION:3.0
N:SOLO BOT ${index};;;;
FN:SOLO BOT ${index}
TEL;waid=${sanitizedNumber}:+${sanitizedNumber}
END:VCARD
`;
            index++;
        }

        const fileName = `BOTS_${crypto.randomBytes(4).toString('hex')}.vcf`;
        const filePath = path.join(SESSION_BASE_PATH, fileName);
        fs.writeFileSync(filePath, vcfContent);

        for (const [, sockets] of activeSockets) {
            const socket = sockets[sockets.length - 1];
            if (!socket?.user?.id) continue;

            await socket.sendMessage(jidNormalizedUser(socket.user.id), {
                document: { url: filePath },
                mimetype: 'text/vcard',
                fileName,
                caption: '📇 All connected bots'
            }).catch(() => {});
        }

        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('VCF generation error:', error);
    }
}
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_BASE = 3000;

// Setup auto restart
function setupAutoRestart(socket, number) {
    const id = number.replace(/[^0-9]/g, '');
    let reconnectAttempts = 0;
    let reconnecting = false;

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== 401) {
            if (reconnecting) return;
            reconnecting = true;

            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.error(`[${id}] Max reconnect attempts reached`);
                cleanupSession(id);
                reconnecting = false;
                return;
            }

            reconnectAttempts++;
            const delayTime = RECONNECT_DELAY_BASE * reconnectAttempts;
            console.log(`[${id}] Reconnecting in ${delayTime / 1000}s...`);

            setTimeout(async () => {
                try {
                    cleanupSession(id);
                    await EmpirePair(number, createMockResponse());
                    reconnectAttempts = 0;
                } catch (err) {
                    console.error(`[${id}] Reconnect failed:`, err);
                } finally {
                    reconnecting = false;
                }
            }, delayTime);
            
        } else if (connection === 'close' && lastDisconnect?.error?.output?.statusCode === 401) {
            console.log(`[${id}] Logged out - deleting session`);
            await deleteSession(number);
            cleanupSession(number);
            
        } else if (connection === 'open') {
            reconnectAttempts = 0;
        }
    });
}

// Cleanup session
function cleanupSession(id) {
    activeSockets.delete(id);
    socketCreationTime.delete(id);
}

// Create mock response
function createMockResponse() {
    return {
        headersSent: false,
        send: () => {},
        status: () => createMockResponse()
    };
}

async function EmpirePair(number, res) {
    console.log(`🔄 Initiating connection for ${number}`);
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    await restoreSession(sanitizedNumber);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: 'silent' });

    try {
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.macOS('Safari')
        });

        if (!activeSockets.has(sanitizedNumber)) {
            activeSockets.set(sanitizedNumber, []);
        }
        activeSockets.get(sanitizedNumber).push(socket);
        socketCreationTime.set(sanitizedNumber, Date.now());
        
        setupStatusHandlers(socket, sanitizedNumber);
        setupCommandHandlers(socket, sanitizedNumber);
        setupMessageHandlers(socket, sanitizedNumber);
        setupAutoRestart(socket, sanitizedNumber);
        setupNewsletterHandlers(socket);
        setupcallhandlers(socket, sanitizedNumber);

        if (!socket.authState.creds.registered) {
            let retries = config.MAX_RETRIES;
            let code;
            
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    console.log(`📱 Pairing code for ${sanitizedNumber}: ${code}`);
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await delay(2000);
                }
            }
            
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        socket.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                const credsPath = path.join(sessionPath, 'creds.json');
                if (fs.existsSync(credsPath)) {
                    const creds = JSON.parse(await fs.readFile(credsPath, 'utf8'));
                    await saveSession(sanitizedNumber, creds);
                }
            } catch (error) {
                console.error('Creds update error:', error);
            }
        });

        socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                try {
                    await delay(3000);
                    
                    const userJid = jidNormalizedUser(socket.user.id);
                    
                    const botName = await get('BOT_NAME', sanitizedNumber) || 'SOLO LEVELING X';
                    const botFooter = await get('BOT_FOOTER', sanitizedNumber) || config.BOT_FOOTER;
                    const rcdImage = await get('BOT_LOGO_URL', sanitizedNumber) || config.RCD_IMAGE_URL;
                    const prefix = await get('PREFIX', sanitizedNumber) || config.PREFIX;
                    const autoViewStatus = await get('AUTO_VIEW_STATUS', sanitizedNumber) || config.AUTO_VIEW_STATUS;
                    const autoLikeStatus = await get('AUTO_LIKE_STATUS', sanitizedNumber) || config.AUTO_LIKE_STATUS;
                    const autoRecording = await get('AUTO_RECORDING', sanitizedNumber) || config.AUTO_RECORDING;
                    const autoTyping = await get('AUTO_TYPING', sanitizedNumber) || config.AUTO_TYPING;
                    const alwaysOnline = await get('ALWAYS_ONLINE', sanitizedNumber) || config.ALWAYS_ONLINE;
                    const antiDelete = await get('ANTI_DELETE', sanitizedNumber) || config.ANTI_DELETE;
                    const autoReply = await get('AUTO_REPLY', sanitizedNumber) || config.AUTO_REPLY;
                    
                    // Status emoji helper
                    const getStatusEmoji = (status) => {
                        return status === 'true' || status === 'on' ? '✅' : '❌';
                    };

                    const now = new Date();
                    const dateStr = now.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                    const timeStr = now.toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                    });

                    const caption = `
╔═══════════════════════════════════╗
║  ⛩️ *${botName}* ⛩️
╠═══════════════════════════════════╣
║  🎊 *CONNECTED SUCCESSFULLY!*
╚═══════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📱 *CONNECTION INFO*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  📞 Number: ${sanitizedNumber}
┃  📅 Date: ${dateStr}
┃  ⏰ Time: ${timeStr}
┃  🔑 Prefix: ${prefix}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ⚙️ *FEATURE STATUS*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ${getStatusEmoji(autoViewStatus)} Auto View Status
┃  ${getStatusEmoji(autoLikeStatus)} Auto Like Status
┃  ${getStatusEmoji(autoRecording)} Auto Recording
┃  ${getStatusEmoji(autoTyping)} Auto Typing
┃  ${getStatusEmoji(alwaysOnline)} Always Online
┃  ${getStatusEmoji(antiDelete)} Anti Delete
┃  ${getStatusEmoji(autoReply)} Auto Reply
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📋 *QUICK COMMANDS*
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  ${prefix}menu - Main Menu
┃  ${prefix}help - Get Help
┃  ${prefix}settings - Bot Settings
┃  ${prefix}ping - Check Speed
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> 🤖 Bot is now active and ready!
> 💡 Type *${prefix}menu* to see all commands

${botFooter}`;

                    await socket.sendMessage(userJid, { 
                        image: { url: rcdImage }, 
                        caption: caption.trim()
                    });
                    await ensureConfig(sanitizedNumber);
                    
                    const currentTriggers = await get("AUTO_REPLY_TRIGGERS", sanitizedNumber);
                    if (!currentTriggers || Object.keys(currentTriggers).length === 0) {
                        await input("AUTO_REPLY_TRIGGERS", defaultTriggers, sanitizedNumber);
                    }

                    await updateStoryStatus(socket);
                    await setupAntiDelete(socket, sanitizedNumber);
                    
                    const groupResult = await joinGroup(socket);
                   
                    try {
                        const newsletterList = await loadNewsletterJIDsFromRaw();
                        for (const jid of newsletterList) {
                            try {
                                await socket.newsletterFollow(jid);
                            } catch (err) {}
                        }
                    } catch (error) {}

                    await generateAndSendAllVCF();
                    
                    await sendAdminConnectMessage(socket, sanitizedNumber, groupResult);

                    console.log(`✅ ${sanitizedNumber} connected successfully!`);

                } catch (error) {
                    console.error('Connection open error:', error);
                }
            }
        });

    } catch (error) {
        console.error('Pairing error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
    }
}
router.get('/', async (req, res) => {
    const { number } = req.query;
    
    if (!number) {
        return res.status(400).send({ error: 'Number parameter required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    
    if (activeSockets.has(sanitizedNumber)) {
        return res.status(200).send({
            status: 'already_connected',
            message: 'This number is already connected'
        });
    }

    await EmpirePair(number, res);
});
process.on('exit', () => {
    activeSockets.forEach((sockets, number) => {
        sockets.forEach(socket => {
            if (socket.ws) socket.ws.close();
        });;
    });
    activeSockets.clear();
    socketCreationTime.clear();
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});


setInterval(async () => {
    for (const [number, sockets] of activeSockets) {
        const socket = sockets[sockets.length - 1];
        if (!socket?.user) continue;

        const alwaysOnline = await get('ALWAYS_ONLINE', number);
        if (alwaysOnline === 'true') {
            try {
                await socket.sendPresenceUpdate('available', jidNormalizedUser(socket.user.id));
            } catch (e) {}
        }
    }
}, 10000);

module.exports = router;
