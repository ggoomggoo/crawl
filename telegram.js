const TelegramBot = require('node-telegram-bot-api');

const token = '0';
const defaultChatId = '-0';
const defaultMinorChatId = '-0';


const bot = new TelegramBot(token, { polling: false });

module.exports.sendTelegramMessage = (message, chatId) => {
    try {
        bot.sendMessage((chatId || defaultChatId), message);
    } catch (error) {
        console.error(`send telegram message failed. ${error.message}`)
    }
}

module.exports.sendTelegramMessageMinor = (message, chatId) => {
    try {
        bot.sendMessage((chatId || defaultMinorChatId), message);
    } catch (error) {
        console.error(`send telegram message failed. ${error.message}`)
    }
}
