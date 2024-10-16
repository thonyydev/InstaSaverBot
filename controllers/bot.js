const TelegramBot = require("node-telegram-bot-api");
const instaScrapper = require("./insta"); // Função para scrapear o Instagram
require("dotenv").config();

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_API;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Fila para processar os pedidos
let downloadQueue = [];
let isProcessing = false; // Flag para indicar se o bot está processando um pedido

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Salve meu patrão! Me manda qualquer link do Instagram (menos os de stories) aqui embaixo e eu devolvo pra você como um arquivo de mídia!"
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Verifica se a mensagem é um link do Instagram
  if (
    msg.text !== "/start" &&
    msg.text.includes("https://www.instagram.com/")
  ) {
    // Adiciona o pedido à fila
    downloadQueue.push({ chatId: chatId, text: msg.text });

    const queuePosition = downloadQueue.length;

    // Log para verificar a fila
    console.log(
      `Novo pedido adicionado à fila. Posição na fila: ${queuePosition}`
    );
    console.log("Fila atual:", downloadQueue);

    // Se o bot já estiver processando um pedido, avisa o usuário que ele está na fila
    if (isProcessing) {
      bot.sendMessage(
        chatId,
        `Tem uma galera na frente! Você está na posição ${queuePosition} da fila. Aguarde sua vez.`
      );
      console.log(
        `O usuário ${chatId} foi colocado na fila na posição ${queuePosition}`
      );
    } else {
      // Se o bot não estiver processando, começa a processar a fila
      console.log(
        `Nenhum download em andamento. Iniciando processamento da fila.`
      );
      processQueue();
    }
  }
});

// Função para processar a fila de downloads
async function processQueue() {
  if (downloadQueue.length === 0) {
    isProcessing = false;
    console.log("Fila vazia. Nenhum processamento a ser feito.");
    return;
  }

  isProcessing = true; // Define que o bot está processando

  const currentRequest = downloadQueue[0]; // Pega o primeiro pedido da fila
  const { chatId, text } = currentRequest;

  try {
    // Envia mensagem de que está processando o pedido do usuário
    bot.sendMessage(
      chatId,
      "Segura aí, tô processando seu link... um minutinho!"
    );

    console.log(`Processando o pedido do usuário ${chatId}. Link: ${text}`);

    // Faz o download do conteúdo do Instagram
    const post = await instaScrapper(text); // Chama a função de scraping
    console.log(`Resultado do scraping para o usuário ${chatId}:`, post);

    if (post.length > 0) {
      for (const media of post) {
        if (media.type === "image") {
          await bot.sendPhoto(chatId, media.link);
          console.log(
            `Enviando imagem para o usuário ${chatId}: ${media.link}`
          );
        } else if (media.type === "video") {
          await bot.sendVideo(chatId, media.link);
          console.log(`Enviando vídeo para o usuário ${chatId}: ${media.link}`);
        } else {
          await bot.sendMessage(
            chatId,
            "Ops, deu ruim ao enviar seu link! Tenta de novo mais tarde!"
          );
          console.log(
            `Erro ao enviar mídia para o usuário ${chatId}. Tipo de mídia desconhecido.`
          );
        }
      }
    } else {
      await bot.sendMessage(chatId, "Não achei a mídia pra esse link, viu?");
      console.log(`Nenhuma mídia encontrada para o link do usuário ${chatId}`);
    }
  } catch (err) {
    console.log(err);
    await bot.sendMessage(
      chatId,
      "Deu um errinho ao processar o link. Tenta de novo!"
    );
    console.log(`Erro ao processar o link do usuário ${chatId}:`, err);
  }

  // Remove o pedido da fila após o processamento
  downloadQueue.shift();
  console.log(`Pedido do usuário ${chatId} processado. Removido da fila.`);
  console.log("Fila atual após remoção:", downloadQueue);

  // Processa o próximo pedido, se houver
  if (downloadQueue.length > 0) {
    const nextUser = downloadQueue[0];
    bot.sendMessage(
      nextUser.chatId,
      "Você chegou ao topo da fila! Seu download será processado agora."
    );
    console.log(
      `Próximo na fila: usuário ${nextUser.chatId}. Iniciando download.`
    );
    processQueue(); // Chama a função para o próximo na fila
  } else {
    isProcessing = false; // Não há mais pedidos, encerra o processamento
    console.log("Nenhum pedido restante na fila. Processamento finalizado.");
  }
}