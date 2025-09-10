const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL; // Render la fournit automatiquement

if (!TOKEN) {
  console.error("❌ BOT_TOKEN manquant dans les variables d'environnement");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });
const app = express();

app.use(express.json());

// Commande /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Bienvenue ! Utilise /home pour continuer.");
});

// Commande /home
bot.onText(/\/home/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏠 Tu es dans le menu principal.");
});

// Endpoint webhook
app.post(`/webhook/${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Home page (Render check)
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // On configure le webhook automatiquement au démarrage
  await bot.setWebHook(`${URL}/webhook/${TOKEN}`);
  console.log("✅ Webhook configuré avec succès !");
});
