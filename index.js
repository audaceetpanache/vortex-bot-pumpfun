import express from "express";
import bot from "./bot.js";

const app = express();

// Webhook config
const PORT = process.env.PORT || 10000;
const URL = process.env.RENDER_EXTERNAL_URL || "https://vortex-bot-pumpfun.onrender.com";

// Attach webhook to Express
app.use(express.json());
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("✅ Vortex bot is running!");
});

app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);

  // Configure webhook à chaque démarrage
  await bot.setWebHook(`${URL}/bot${process.env.BOT_TOKEN}`);
  console.log("✅ Webhook configuré avec succès !");
});
