const TelegramBot = require('node-telegram-bot-api');
const instaScrapper = require('./insta')
require('dotenv').config()

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_API;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Salve meu patrão! Me manda qualquer link do Instagram (menos os de stories) aqui embaixo e eu devolvo pra você como um arquivo de mídia!");
});

bot.on('message', async (msg) => {
  if (msg.text !== '/start' && msg.text.includes('https://www.instagram.com/')) {
    try {
      bot.sendMessage(msg.chat.id, 'Segura aí, tô processando seu link... um minutinho!')
      const post = await instaScrapper(msg.text)
      console.log(post);
      const chatId = msg.chat.id;
      if (post.length > 0) {
        post.forEach(media => {
          if (media.type === 'image') {
            bot.sendPhoto(chatId, media.link);
          }
          else if (media.type === 'video') {
            bot.sendVideo(chatId, media.link);
          } else {
            bot.sendMessage(chatId, 'Ops, deu ruim ao enviar seu link! Tenta de novo mais tarde!')
          } 
        })
      } else {
        bot.sendMessage(chatId, 'Não achei a mídia pra esse link, viu?')
      }
    } catch (err) {
      console.log(err);
      bot.sendMessage(chatId, 'Deu um errinho ao processar o link. Tenta de novo!')
    }
  }

})