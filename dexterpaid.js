const fs = require('fs-extra');
const path = require('path');
const pino = require('pino');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { get } = require('./configdb');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const BASE_DIR = './MESSAGE_DATABASE';
const CLEAN_AFTER = 15 * 60 * 1000; 
const messageCache = new Map();
const randomFile = (ext) => path.join(require('os').tmpdir(), `${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`);

function getMsgDir(botNumber) {
    const sanitized = botNumber.replace(/[^0-9]/g, '');
    return path.join(BASE_DIR, sanitized, 'messages');
}

function isJidGroup(jid) {
    return jid?.endsWith('@g.us') || false;
}

async function ensureBase(botNumber) {
    try {
        await fs.ensureDir(getMsgDir(botNumber));
        console.log(`✅ [ANTI-DELETE] Directory ready for ${botNumber}`);
    } catch (e) {
        console.error('[ANTI-DELETE] Failed to create directory:', e);
    }
}

async function downloadMedia(message, type) {
    let retries = 3;
    
    while (retries > 0) {
        try {
            const stream = await downloadContentFromMessage(message, type);
            let buffer = Buffer.from([]);
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            if (buffer.length > 0) {
                console.log(`✅ [ANTI-DELETE] Downloaded ${type}: ${buffer.length} bytes`);
                return buffer;
            }
            
            retries--;
        } catch (e) {
            console.error(`[ANTI-DELETE] Download attempt failed (${retries} left):`, e.message);
            retries--;
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    
    console.error('[ANTI-DELETE] Media download failed after all retries');
    return null;
}

function getMessageType(msg) {
    if (!msg) return { type: null, content: null, mediaType: null, isViewOnce: false };
    
    const mediaMapping = {
        'imageMessage': 'image',
        'videoMessage': 'video',
        'audioMessage': 'audio',
        'documentMessage': 'document',
        'stickerMessage': 'sticker'
    };
    
    if (msg.conversation) {
        return { 
            type: 'conversation', 
            content: msg.conversation, 
            mediaType: null,
            isViewOnce: false 
        };
    }
    
    if (msg.extendedTextMessage) {
        return { 
            type: 'extendedTextMessage', 
            content: msg.extendedTextMessage, 
            mediaType: null,
            isViewOnce: false 
        };
    }
    
    const viewOnceTypes = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
    for (const vType of viewOnceTypes) {
        if (msg[vType]?.message) {
            const innerMsg = msg[vType].message;
            for (const innerType of Object.keys(mediaMapping)) {
                if (innerMsg[innerType]) {
                    return { 
                        type: innerType, 
                        content: innerMsg[innerType], 
                        mediaType: mediaMapping[innerType],
                        isViewOnce: true 
                    };
                }
            }
        }
    }
    
    const types = [
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage',
        'contactMessage',
        'locationMessage'
    ];
    
    for (const type of types) {
        if (msg[type]) {
            return { 
                type, 
                content: msg[type], 
                mediaType: mediaMapping[type] || null,
                isViewOnce: false 
            };
        }
    }
    
    return { type: null, content: null, mediaType: null, isViewOnce: false };
}

async function convertToOpus(inputBuffer) {
    const tempMp3 = randomFile("mp3");
    const tempOpus = randomFile("opus");
    
    try {
        fs.writeFileSync(tempMp3, inputBuffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(tempMp3)
                .audioCodec("libopus")
                .audioBitrate("128k")
                .audioChannels(1)
                .audioFrequency(48000)
                .toFormat("opus")
                .on("end", () => {
                    console.log("✅ [ANTI-DELETE] Audio conversion completed");
                    resolve();
                })
                .on("error", (err) => {
                    console.error("❌ [ANTI-DELETE] FFmpeg error:", err);
                    reject(err);
                })
                .save(tempOpus);
        });
        
        if (fs.existsSync(tempMp3)) {
            fs.unlinkSync(tempMp3);
        }
        
        const opusBuffer = fs.readFileSync(tempOpus);
        
        if (fs.existsSync(tempOpus)) {
            fs.unlinkSync(tempOpus);
        }
        
        return opusBuffer;
        
    } catch (e) {
        if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);
        if (fs.existsSync(tempOpus)) fs.unlinkSync(tempOpus);
        throw e;
    }
}
async function sendReaction(sock, jid, messageKey, emoji) {
    try {
        await sock.sendMessage(jid, {
            react: {
                text: emoji,
                key: messageKey
            }
        });
    } catch (e) {
        console.error('[ANTI-DELETE] Reaction error:', e.message);
    }
}

async function saveMessage(botNumber, msg) {
    try {
        if (!msg?.message || !msg?.key?.id) return;

        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) {
            return;
        }
        
        if (msg.message?.protocolMessage || msg.message?.reactionMessage) {
            return;
        }

        const sanitizedBot = botNumber.replace(/[^0-9]/g, '');
        const chatId = jid.split('@')[0].replace(/[^0-9]/g, '');
        const msgId = msg.key.id;
        const cacheKey = `${sanitizedBot}_${chatId}_${msgId}`;
        const fileName = `${chatId}_${msgId}.json`;
        const filePath = path.join(getMsgDir(botNumber), fileName);
        
        const { type, content, mediaType, isViewOnce } = getMessageType(msg.message);
        
        console.log(`📥 [ANTI-DELETE] Processing: ${msgId} | Type: ${type || 'unknown'}`);
        
        let mediaBuffer = null;
        if (mediaType && content) {
            try {
                mediaBuffer = await downloadMedia(content, mediaType);
                if (mediaBuffer) {
                    console.log(`💾 [ANTI-DELETE] Pre-cached ${mediaType} for ${msgId}`);
                }
            } catch (e) {
                console.error('[ANTI-DELETE] Pre-download failed:', e.message);
            }
        }
        let textContent = null;
        if (type === 'conversation') {
            textContent = content;
        } else if (type === 'extendedTextMessage') {
            textContent = content?.text || '';
        }

        const messageData = {
            key: msg.key,
            message: msg.message,
            pushName: msg.pushName || 'Unknown',
            timestamp: Date.now(),
            mediaBuffer: mediaBuffer ? mediaBuffer.toString('base64') : null,
            mediaType: mediaType,
            isViewOnce: isViewOnce,
            textContent: textContent,
            messageType: type
        };
        
        messageCache.set(cacheKey, messageData);
        await fs.writeJson(filePath, messageData);
        
        setTimeout(() => {
            messageCache.delete(cacheKey);
            fs.remove(filePath).catch(() => {});
        }, CLEAN_AFTER);

        console.log(`💾 [ANTI-DELETE] Saved: ${msgId} (${type || 'unknown'})`);

    } catch (e) {
        console.error('[ANTI-DELETE] Save error:', e.message);
    }
}

async function restoreMessage(sock, botNumber, update) {
    try {
        const key = update.key;
        if (!key?.id || !key?.remoteJid) return;

        const jid = key.remoteJid;
        if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) {
            return;
        }
        
        const antiDelete = await get('ANTI_DELETE', botNumber);
        if (!antiDelete || antiDelete === 'off') {
            return;
        }

        const sanitizedBot = botNumber.replace(/[^0-9]/g, '');
        const chatId = jid.split('@')[0].replace(/[^0-9]/g, '');
        const msgId = key.id;
        const cacheKey = `${sanitizedBot}_${chatId}_${msgId}`;
        const fileName = `${chatId}_${msgId}.json`;
        const filePath = path.join(getMsgDir(botNumber), fileName);
        
        let stored = messageCache.get(cacheKey);
        
        if (!stored) {
            if (await fs.pathExists(filePath)) {
                stored = await fs.readJson(filePath);
            } else {
                console.log(`⚠️ [ANTI-DELETE] Message not found: ${msgId}`);
                return;
            }
        }

        const msg = stored.message;
        const mek = stored.key;
        const pushName = stored.pushName || 'Unknown';
        const preloadedMedia = stored.mediaBuffer ? Buffer.from(stored.mediaBuffer, 'base64') : null;
        const savedTextContent = stored.textContent;
        const savedType = stored.messageType;

        const sender = mek.participant || mek.remoteJid;
        const deleter = key.participant || key.remoteJid;
        const isGroup = isJidGroup(jid);
        const botJid = botNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        const deleterJid = deleter.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (deleterJid === botJid || deleter === botJid) {
            console.log(`⏭️ [ANTI-DELETE] Skipped - Bot owner deleted: ${msgId}`);
            
            messageCache.delete(cacheKey);
            await fs.remove(filePath).catch(() => {});
            return;
        }
        if (mek.fromMe === true) {
            console.log(`⏭️ [ANTI-DELETE] Skipped - Bot's own message: ${msgId}`);
            messageCache.delete(cacheKey);
            await fs.remove(filePath).catch(() => {});
            return;
        }

        const botName = await get('BOT_NAME', botNumber) || 'STARTER-V2';
        const footer = await get('BOT_FOOTER', botNumber) || '🛡️ Anti-Delete Active 🛡️';
        
        let targetJid;
        if (antiDelete === 'private') {
            targetJid = botNumber.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            targetJid = jid;
        }

        const senderNumber = sender.split('@')[0];
        const deleterNumber = deleter.split('@')[0];
        const currentTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });
        const infoMessage = `🛡️ *${botName} ANTI-DELETE*\n\n` +
            `👤 *Sender:* @${senderNumber}\n` +
            `📛 *Name:* ${pushName}\n` +
            `📱 *Number:* +${senderNumber}\n` +
            `🗑️ *Deleted By:* @${deleterNumber}\n` +
            `⏰ *Time:* ${currentTime}\n\n` +
            `> *${footer}*`;

        const mentions = antiDelete === 'on' && isGroup 
            ? [sender, deleter] 
            : [];

        const { type, content, mediaType, isViewOnce } = getMessageType(msg);
        const actualType = savedType || type;

        if (!actualType) {
            console.log(`⚠️ [ANTI-DELETE] Unknown message type for: ${msgId}`);
            return;
        }

        const viewOnceTag = isViewOnce ? '👁️ *[VIEW ONCE]*' : '';
        if (actualType === 'conversation' || actualType === 'extendedTextMessage') {
            let text = savedTextContent;
            
            if (!text) {
                if (actualType === 'conversation') {
                    text = msg.conversation || content || '';
                } else {
                    text = msg.extendedTextMessage?.text || content?.text || '';
                }
            }
            
            if (!text) {
                console.log(`⚠️ [ANTI-DELETE] Empty text for: ${msgId}`);
                text = '[Message content unavailable]';
            }
            
            const sentMsg = await sock.sendMessage(targetJid, {
                text: `📝 *Deleted Message:*\n\n${text}`
            });
            
            await sendReaction(sock, targetJid, sentMsg.key, '✅');
            
            await sock.sendMessage(targetJid, {
                text: infoMessage,
                mentions,
                quoted: sentMsg
            });
            
            console.log(`✅ [ANTI-DELETE] Restored text: ${msgId}`);
        }
        
        else if (actualType === 'imageMessage') {
            let buffer = preloadedMedia;
            
            if (!buffer) {
                buffer = await downloadMedia(content, 'image');
            }
            
            if (buffer && buffer.length > 0) {
                const caption = content?.caption || '';
                
                const sentMsg = await sock.sendMessage(targetJid, {
                    image: buffer,
                    caption: viewOnceTag ? `${viewOnceTag}\n\n🖼️ *Deleted Image*\n${caption}` : `🖼️ *Deleted Image*\n${caption}`
                });
                
                await sendReaction(sock, targetJid, sentMsg.key, '✅');
                
                await sock.sendMessage(targetJid, {
                    text: infoMessage,
                    mentions,
                    quoted: sentMsg
                });
                
                console.log(`✅ [ANTI-DELETE] Restored image: ${msgId}`);
            } else {
                const sentMsg = await sock.sendMessage(targetJid, {
                    text: `🖼️ *Deleted Image*\n❌ Failed to download\nCaption: ${content?.caption || 'None'}\n\n${infoMessage}`,
                    mentions
                });
                await sendReaction(sock, targetJid, sentMsg.key, '❌');
            }
        }
        else if (actualType === 'videoMessage') {
            let buffer = preloadedMedia;
            
            if (!buffer) {
                buffer = await downloadMedia(content, 'video');
            }
            
            if (buffer && buffer.length > 0) {
                const caption = content?.caption || '';
                
                const sentMsg = await sock.sendMessage(targetJid, {
                    video: buffer,
                    caption: viewOnceTag ? `${viewOnceTag}\n\n🎬 *Deleted Video*\n${caption}` : `🎬 *Deleted Video*\n${caption}`
                });
                
                await sendReaction(sock, targetJid, sentMsg.key, '✅');
                
                await sock.sendMessage(targetJid, {
                    text: infoMessage,
                    mentions,
                    quoted: sentMsg
                });
                
                console.log(`✅ [ANTI-DELETE] Restored video: ${msgId}`);
            } else {
                const sentMsg = await sock.sendMessage(targetJid, {
                    text: `🎬 *Deleted Video*\n❌ Failed to download\nCaption: ${content?.caption || 'None'}\n\n${infoMessage}`,
                    mentions
                });
                await sendReaction(sock, targetJid, sentMsg.key, '❌');
            }
        }
        
        else if (actualType === 'audioMessage') {
            let buffer = preloadedMedia;
            
            if (!buffer) {
                buffer = await downloadMedia(content, 'audio');
            }
            
            if (buffer && buffer.length > 0) {
                try {
                    let sentMsg;
                    
                    if (content.ptt) {
                        const opusBuffer = await convertToOpus(buffer);
                        
                        sentMsg = await sock.sendMessage(targetJid, {
                            audio: opusBuffer,
                            mimetype: "audio/ogg; codecs=opus",
                            ptt: true
                        });
                    } else {
                        sentMsg = await sock.sendMessage(targetJid, {
                            audio: buffer,
                            mimetype: content.mimetype || 'audio/mpeg',
                            ptt: false
                        });
                    }
                    
                    await sendReaction(sock, targetJid, sentMsg.key, '✅');
                    
                    await sock.sendMessage(targetJid, {
                        text: `🎵 *Deleted ${content.ptt ? 'Voice Note' : 'Audio'}*\n\n${infoMessage}`,
                        mentions,
                        quoted: sentMsg
                    });
                    
                    console.log(`✅ [ANTI-DELETE] Restored audio: ${msgId}`);
                } catch (audioErr) {
                    console.error('[ANTI-DELETE] Audio processing error:', audioErr);
                    
                    const sentMsg = await sock.sendMessage(targetJid, {
                        audio: buffer,
                        mimetype: 'audio/mpeg',
                        ptt: false
                    });
                    
                    await sendReaction(sock, targetJid, sentMsg.key, '✅');
                    
                    await sock.sendMessage(targetJid, {
                        text: `🎵 *Deleted Audio*\n\n${infoMessage}`,
                        mentions,
                        quoted: sentMsg
                    });
                }
            } else {
                const sentMsg = await sock.sendMessage(targetJid, {
                    text: `🎵 *Deleted Audio*\n❌ Failed to download\n\n${infoMessage}`,
                    mentions
                });
                await sendReaction(sock, targetJid, sentMsg.key, '❌');
            }
        }
        
        else if (actualType === 'stickerMessage') {
            let buffer = preloadedMedia;
            
            if (!buffer) {
                buffer = await downloadMedia(content, 'sticker');
            }
            
            if (buffer && buffer.length > 0) {
                const sentMsg = await sock.sendMessage(targetJid, {
                    sticker: buffer
                });
                
                await sendReaction(sock, targetJid, sentMsg.key, '✅');
                
                await sock.sendMessage(targetJid, {
                    text: `🎭 *Deleted Sticker*\n\n${infoMessage}`,
                    mentions,
                    quoted: sentMsg
                });
                
                console.log(`✅ [ANTI-DELETE] Restored sticker: ${msgId}`);
            } else {
                const sentMsg = await sock.sendMessage(targetJid, {
                    text: `🎭 *Deleted Sticker*\n❌ Failed to download\n\n${infoMessage}`,
                    mentions
                });
                await sendReaction(sock, targetJid, sentMsg.key, '❌');
            }
        }
        
        else if (actualType === 'documentMessage') {
            let buffer = preloadedMedia;
            
            if (!buffer) {
                buffer = await downloadMedia(content, 'document');
            }
            
            if (buffer && buffer.length > 0) {
                const sentMsg = await sock.sendMessage(targetJid, {
                    document: buffer,
                    mimetype: content.mimetype || 'application/octet-stream',
                    fileName: content.fileName || 'document'
                });
                
                await sendReaction(sock, targetJid, sentMsg.key, '✅');
                
                await sock.sendMessage(targetJid, {
                    text: `📄 *Deleted Document*\nFile: ${content.fileName || 'Unknown'}\n\n${infoMessage}`,
                    mentions,
                    quoted: sentMsg
                });
                
                console.log(`✅ [ANTI-DELETE] Restored document: ${msgId}`);
            } else {
                const sentMsg = await sock.sendMessage(targetJid, {
                    text: `📄 *Deleted Document*\n❌ Failed to download\nFile: ${content?.fileName || 'Unknown'}\n\n${infoMessage}`,
                    mentions
                });
                await sendReaction(sock, targetJid, sentMsg.key, '❌');
            }
        }
        
        else if (actualType === 'contactMessage') {
            const vcard = content.vcard || '';
            const displayName = content.displayName || 'Unknown';
            
            const sentMsg = await sock.sendMessage(targetJid, {
                contacts: {
                    displayName: displayName,
                    contacts: [{ vcard }]
                }
            });
            
            await sendReaction(sock, targetJid, sentMsg.key, '✅');
            
            await sock.sendMessage(targetJid, {
                text: `👤 *Deleted Contact*\nContact Name: ${displayName}\n\n${infoMessage}`,
                mentions,
                quoted: sentMsg
            });
            
            console.log(`✅ [ANTI-DELETE] Restored contact: ${msgId}`);
        }
        
        else if (actualType === 'locationMessage') {
            const sentMsg = await sock.sendMessage(targetJid, {
                location: {
                    degreesLatitude: content.degreesLatitude,
                    degreesLongitude: content.degreesLongitude,
                    name: content.name || '',
                    address: content.address || ''
                }
            });
            
            await sendReaction(sock, targetJid, sentMsg.key, '✅');
           
            await sock.sendMessage(targetJid, {
                text: `📍 *Deleted Location*\n\n${infoMessage}`,
                mentions,
                quoted: sentMsg
            });
            
            console.log(`✅ [ANTI-DELETE] Restored location: ${msgId}`);
        }
        else {
            const sentMsg = await sock.sendMessage(targetJid, {
                text: `❓ *Deleted Message*\nType: ${actualType}\nCould not restore content.\n\n${infoMessage}`,
                mentions
            });
            await sendReaction(sock, targetJid, sentMsg.key, '⚠️');
            console.log(`⚠️ [ANTI-DELETE] Unknown type: ${msgId} (${actualType})`);
        }

        // Cleanup
        messageCache.delete(cacheKey);
        await fs.remove(filePath).catch(() => {});

    } catch (e) {
        console.error('[ANTI-DELETE] Restore error:', e);
    }
}

async function cleanupOldFiles(botNumber) {
    try {
        const dir = getMsgDir(botNumber);
        if (!await fs.pathExists(dir)) return;

        const files = await fs.readdir(dir);
        const now = Date.now();
        let cleaned = 0;

        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const stat = await fs.stat(filePath);
                if (now - stat.mtimeMs > CLEAN_AFTER) {
                    await fs.remove(filePath);
                    cleaned++;
                }
            } catch (e) {
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 [ANTI-DELETE] Cleaned ${cleaned} old files for ${botNumber}`);
        }
    } catch (e) {
        console.error('[ANTI-DELETE] Cleanup error:', e);
    }
}

async function setupAntiDelete(sock, botNumber) {
    try {
        const sanitizedNumber = botNumber.replace(/[^0-9]/g, '');
        
        await ensureBase(sanitizedNumber);
        await cleanupOldFiles(sanitizedNumber);
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                if (!msg || !msg.message) continue;
                if (msg.message.protocolMessage) continue;
                if (msg.message.reactionMessage) continue;
                if (msg.message.senderKeyDistributionMessage) continue;
                
                await saveMessage(sanitizedNumber, msg);
            }
        });
        
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update?.message === null || 
                    update.update?.messageStubType === 1 ||
                    update.update?.messageStubType === 2) {
                    await restoreMessage(sock, sanitizedNumber, update);
                }
            }
        });

        console.log(`🛡️ [ANTI-DELETE] Active for: ${sanitizedNumber}`);
        console.log(`📁 [ANTI-DELETE] Storage: ${getMsgDir(sanitizedNumber)}`);

    } catch (e) {
        console.error('[ANTI-DELETE] Setup error:', e);
    }
}

module.exports = { setupAntiDelete };
