const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "default_secret";

if (!TOKEN) {
  console.error("❌ BOT_TOKEN manquant dans les variables d'environnement");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });
const app = express();

app.use(express.json());

// Commandes
bot.onText(/\/start/, (msg) => {
  console.log("➡️ /start reçu :", msg.chat.username || msg.chat.id);
  bot.sendMessage(msg.chat.id, "👋 Bienvenue ! Utilise /home pour continuer.");
});

bot.onText(/\/home/, (msg) => {
  console.log("➡️ /home reçu :", msg.chat.username || msg.chat.id);
  bot.sendMessage(msg.chat.id, "🏠 Tu es dans le menu principal.");
});

// Endpoint webhook avec SECRET
app.post(`/webhook/${WEBHOOK_SECRET}`, (req, res) => {
  console.log("📩 Update reçu de Telegram");
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Page d'accueil
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Configurer le webhook avec SECRET au lieu du token
  await bot.setWebHook(`${URL}/webhook/${WEBHOOK_SECRET}`);
  console.log("✅ Webhook configuré avec succès !");
});
