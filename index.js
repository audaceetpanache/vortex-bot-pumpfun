import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET || "defaultsecret";
const PORT = process.env.PORT || 10000;

if (!TOKEN) { console.error("❌ TELEGRAM_BOT_TOKEN missing."); process.exit(1); }

// --------------------
// DATA PERSISTENCE
// --------------------
const DATA_FILE = "./data.json";
let data = { users: {} };
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function getUserProjects(userId) { if (!data.users[userId]) data.users[userId] = { projects: [] }; return data.users[userId].projects; }
function generateProjectId() { return "P" + Math.random().toString(36).substring(2, 8).toUpperCase(); }
function findProject(userId, projectId) { const projects = getUserProjects(userId); return projects.find(p => p.id === projectId); }

// --------------------
// EXPRESS WEBHOOK
// --------------------
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}${SECRET}`);
app.post(`/bot${TOKEN}${SECRET}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });
app.listen(PORT, () => console.log(`✅ Bot listening on port ${PORT}`));

// --------------------
// UTILITIES
// --------------------
function sendNeedProject(chatId) {
  bot.sendMessage(chatId, `⛔️ Access not allowed\nYou need to launch a Project first`, {
    reply_markup: { inline_keyboard: [
      [{ text: "📁 Your Projects", callback_data: "my_projects" }],
      [{ text: "🚀 Create New Project", callback_data: "create_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
}

function backHome(chatId, firstName) { bot.emit("text", { chat: { id: chatId }, from: { first_name: firstName }, text: "/home" }); }

// --------------------
// COMMANDS
// --------------------
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `🌟 Welcome to VORTEX!
🔥 Where Things Happen! 🔥
Available Features:
• Launch pump.fun tokens
• Create or import multiple wallets
• Auto-fund wallets via SOL disperser
• Bundle up to 24 wallets
• CTO pump.fun/raydium tokens
• Delayed bundle on pump.fun
• Advanced swap manager with intervals, sell all functions.
• Anti-MEV protection
Use /home to access all features
Use /settings for configuration`);
});

bot.onText(/\/home/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "friend";
  const text = `Yo, ${firstName}! Glad you're here! 🔥
What's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸
Hit the buttons below and let's make it happen:`;
  const opts = { reply_markup: { inline_keyboard: [
    [{ text: "📁 Your Projects", callback_data: "my_projects" }, { text: "🚀 Create New Project", callback_data: "create_project" }],
    [{ text: "🚀 SPAM LAUNCH", callback_data: "need_project" }],
    [{ text: "🤑 BUMP BOT 🤑", callback_data: "need_project" }],
    [{ text: "💰 GET ALL SOL", callback_data: "need_project" }],
    [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "need_project" }],
    [{ text: "🔗 Referrals", callback_data: "need_project" }],
    [{ text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
    [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
  ]}};
  bot.sendMessage(chatId, text, opts);
});

bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const text = `⚙️ Settings
Current Settings:
• Tip Amount: Disabled
• Auto Tip: Enabled
• Max Tip: 0.01 SOL
• Priority Fee: 0.0005 SOL
• Buy Slippage: 15%
• Sell Slippage: 15%
Safe Settings: Enabled`;
  bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: [
      [{ text: "💰 TIP: ❌", callback_data: "need_project" }, { text: "✅ AUTO TIP", callback_data: "need_project" }, { text: "📊 MAX: 0.01 SOL", callback_data: "need_project" }],
      [{ text: "⚡️ PRIO: 0.0005 SOL", callback_data: "need_project" }, { text: "📈 BUY SLIP: 15%", callback_data: "need_project" }, { text: "📉 SELL SLIP: 15%", callback_data: "need_project" }],
      [{ text: "🔓 UI SECURITY: 🟢", callback_data: "need_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
      [{ text: "🎯 LSNIPE Settings", callback_data: "lsnipe_settings" }, { text: "📦 LBS Settings", callback_data: "need_project" }],
    ]},
  });
});

bot.onText(/\/lsnipesettings/, (msg) => {
  const chatId = msg.chat.id;
  const text = `🎯 LSNIPE Settings - Preset: default
Current Settings:
• Dev Buy: 0%
• Dev Tip: 0 SOL
• Snipe Wallet: 0%
• Snipe Buy: 0%
• Snipe Tip: 0 SOL
• Max Sniper: 0%
• Risk Mode: ❌ Disabled`;
  bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: [
      [{ text: "💰 Dev Buy: 0", callback_data: "need_project" }, { text: "💎 Dev Tip: 0", callback_data: "need_project" }],
      [{ text: "🎯 Snipe Wallet: 0", callback_data: "need_project" }, { text: "💫 Snipe Buy: 0", callback_data: "need_project" }],
      [{ text: "🌟 Snipe Tip: 0", callback_data: "need_project" }, { text: "🚀 Max Sniper: 0", callback_data: "need_project" }],
      [{ text: "⚡️ Risk Mode: OFF", callback_data: "need_project" }],
      [{ text: "📝 New Preset", callback_data: "need_project" }],
      [{ text: "✅ default", callback_data: "need_project" }],
      [{ text: "✏️", callback_data: "need_project" }, { text: "🗑️", callback_data: "need_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
});

// --------------------
// CALLBACK QUERIES
// --------------------
bot.on("callback_query", async (cb) => {
  const chatId = cb.message.chat.id;
  const firstName = cb.from.first_name || "friend";
  const dataCb = cb.data;

  if (dataCb === "need_project") return sendNeedProject(chatId);
  if (dataCb === "back_home") return backHome(chatId, firstName);

  // --- MY PROJECTS ---
  if (dataCb === "my_projects") {
    const projects = getUserProjects(chatId);
    if (projects.length === 0) return bot.sendMessage(chatId, `Yo ${firstName}, you don’t have any Project yet! Let’s start a new one!`, { reply_markup: { inline_keyboard: [[{ text: "🚀 Create New Project", callback_data: "create_project" }], [{ text: "⬅️ Back", callback_data: "back_home" }]] } });
    const buttons = projects.map(p => [{ text: `📌 ${p.name || p.id}`, callback_data: `project_${p.id}` }]);
    buttons.push([{ text: "🚀 Create New Project", callback_data: "create_project" }]);
    buttons.push([{ text: "⬅️ Back", callback_data: "back_home" }]);
    return bot.sendMessage(chatId, `Yo ${firstName}! Here's your project list 📋 Select a project:`, { reply_markup: { inline_keyboard: buttons } });
  }

  // --- CREATE PROJECT ---
  if (dataCb === "create_project") {
    const projectId = generateProjectId();
    const projects = getUserProjects(chatId);
    projects.push({ id: projectId, name: null, symbol: null, description: null, twitter: null, telegram: null, website: null, image: null, wallets: [], step: 1 });
    saveData();
    return bot.sendMessage(chatId, `🎯 Choose Project Type
• Create new coin on pump.fun
• Make CTO on any pump.fun or raydium token
Select your preferred option:`, { reply_markup: { inline_keyboard: [[{ text: "🚀 Create new coin", callback_data: `step2_${projectId}` }], [{ text: "🎯 Create CTO", callback_data: `cto_${projectId}` }], [{ text: "⬅️ Back", callback_data: "back_home" }]] } });
  }

  // --- CTO / BONK / Ray POPUPS ---
  if (["cto_", "bonk_", "ray_"].some(pref => dataCb.startsWith(pref))) return bot.sendMessage(chatId, `🚧 Feature not finished yet. Will be available soon!`, { reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "back_home" }]] } });

  // --- STEP 2 ---
  if (dataCb.startsWith("step2_")) {
    const projectId = dataCb.split("_")[1];
    return bot.sendMessage(chatId, `🎯 Choose Platform for Your New Coin
• Pump.fun
• BONK
• Ray Launchlab
Select your preferred platform:`, { reply_markup: { inline_keyboard: [[{ text: "🚀 Pump.fun", callback_data: `step3_${projectId}` }], [{ text: "💎 BONK", callback_data: `bonk_${projectId}` }], [{ text: "🌟 Ray Launchlab", callback_data: `ray_${projectId}` }], [{ text: "⬅️ Back", callback_data: "create_project" }]] } });
  }

  // --- STEP 3 ---
  if (dataCb.startsWith("step3_")) {
    const projectId = dataCb.split("_")[1];
    return bot.sendMessage(chatId, `🚀 New Pump.fun Project Created
Project ID: ${projectId}
Please set up your project by configuring:
• Token Metadata
• Project Wallets
What would you like to set up first?`, { reply_markup: { inline_keyboard: [[{ text: "📝 Token Metadata", callback_data: `meta_${projectId}` }, { text: "👛 Project Wallet", callback_data: `wallet_${projectId}` }], [{ text: "🗑️ Delete Project", callback_data: `delete_${projectId}` }], [{ text: "⬅️ Back to Menu", callback_data: "back_home" }]] } });
  }

  // --- FICHE PROJET / METADATA / WALLET / DELETE ---
  if (["project_", "meta_", "wallet_", "delete_"].some(pref => dataCb.startsWith(pref))) {
    const [action, projectId, field] = dataCb.split("_");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);

    if (action === "delete") {
      data.users[chatId].projects = data.users[chatId].projects.filter(p => p.id !== projectId);
      saveData();
      return bot.sendMessage(chatId, `🗑️ Project ${projectId} deleted.`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]] } });
    }

    if (action === "project") {
      const name = project.name || "N/A";
      const symbol = project.symbol || "N/A";
      return bot.sendMessage(chatId, `🏷 Project ${project.id}
Name: ${name}
Symbol: ${symbol}
Status: ⏳ In Progress
What would you like to manage?`, { reply_markup: { inline_keyboard: [
        [{ text: "📝 Token Metadata", callback_data: `meta_${projectId}` }, { text: "👛 Project Wallet", callback_data: `wallet_${projectId}` }],
        [{ text: "🔫 Wallet Warmup", callback_data: "need_project" }, { text: "💱 Swap Manager", callback_data: "need_project" }],
        [{ text: "🧠 Smart Sell", callback_data: "need_project" }, { text: "🎯 Auto TP", callback_data: "need_project" }],
        [{ text: "🤖 Market Maker", callback_data: "need_project" }, { text: "🔑 GET CA", callback_data: "need_project" }],
        [{ text: "🚀 Launch", callback_data: "need_project" }, { text: "🎯 Launch with Bundle", callback_data: "need_project" }],
        [{ text: "🚀🎯 Launch + Snipe", callback_data: "need_project" }, { text: "🎯🚀 Launch Bundle Snipe", callback_data: "need_project" }],
        [{ text: "🔴 X LAUNCH", callback_data: "need_project" }],
        [{ text: "🗑️ Delete Project", callback_data: `delete_${projectId}` }],
        [{ text: "⬅️ Back", callback_data: "back_home" }],
      ]}});
    }

    if (action === "meta") {
      // Build Metadata buttons dynamically
      const metaButtons = [
        [{ text: `📝 Name${project.name?" ✅":""}`, callback_data: `editname_${projectId}` }, { text: `💎 Symbol${project.symbol?" ✅":""}`, callback_data: `editsymbol_${projectId}` }],
        [{ text: `📋 Description${project.description?" ✅":""}`, callback_data: `editdesc_${projectId}` }, { text: `🐦 Twitter${project.twitter?" ✅":""}`, callback_data: `edittwitter_${projectId}` }],
        [{ text: `📱 Telegram${project.telegram?" ✅":""}`, callback_data: `edittelegram_${projectId}` }, { text: `🌐 Website${project.website?" ✅":""}`, callback_data: `editwebsite_${projectId}` }],
        [{ text: `🖼️ Image${project.image?" ✅":""}`, callback_data: `editimage_${projectId}` }],
        [{ text: "🚀 DEPLOY METADATA", callback_data: `deploy_${projectId}` }],
        [{ text: "🔄 CLONE METADATA", callback_data: `need_project` }],
        [{ text: "⬅️ Back", callback_data: `project_${projectId}` }]
      ];
      return bot.sendMessage(chatId, `🎯 Project ${projectId} Metadata\nSelect a field to edit:`, { reply_markup: { inline_keyboard: metaButtons } });
    }

    if (action === "wallet") {
      return bot.sendMessage(chatId, `🏦 Project Wallets\nProject: ${projectId}\nSelect a wallet action:`, { reply_markup: { inline_keyboard: [
        [{ text: "✚ Create Wallet", callback_data: `createwallet_${projectId}` }],
        [{ text: "📥 Import Wallet", callback_data: `importwallet_${projectId}` }],
        [{ text: "👑 Import Creator", callback_data: `importcreator_${projectId}` }],
        [{ text: "⬅️ Back to Project", callback_data: `project_${projectId}` }],
      ]}});
    }
  }
});

// --------------------
// TEXT RESPONSES FOR USER INPUT (Metadata / Wallets)
// --------------------
const userStates = {}; // track which user is editing which field
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (!userStates[chatId]) return; // ignore normal messages
  const state = userStates[chatId];
  const project = findProject(chatId, state.projectId);
  if (!project) return;

  switch(state.field){
    case "name": project.name = text; break;
    case "symbol": project.symbol = text; break;
    case "description": project.description = text; break;
    case "twitter": project.twitter = text; break;
    case "telegram": project.telegram = text; break;
    case "website": project.website = text; break;
    case "wallet_create": project.wallets.push({ type: "user", keys: text.split("\n") }); break;
    case "wallet_import": project.wallets.push({ type: "import", keys: text.split("\n") }); break;
    case "wallet_creator": project.wallets.push({ type: "creator", keys: text.split("\n") }); break;
    default: break;
  }
  saveData();
  delete userStates[chatId];
  bot.sendMessage(chatId, `✅ Updated ${state.field}`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `meta_${project.id}` }]] } });
});

// --------------------
// CALLBACK TO INIT EDITING (Metadata / Wallets)
// --------------------
bot.on("callback_query", (cb) => {
  const chatId = cb.message.chat.id;
  const dataCb = cb.data;

  if (dataCb.startsWith("edit") || dataCb.startsWith("createwallet") || dataCb.startsWith("importwallet") || dataCb.startsWith("importcreator")) {
    const [action, projectId] = dataCb.split("_");
    const fieldMap = { editname:"name", editsymbol:"symbol", editdesc:"description", edittwitter:"twitter", edittelegram:"telegram", editwebsite:"website", editimage:"image", createwallet:"wallet_create", importwallet:"wallet_import", importcreator:"wallet_creator" };
    const field = fieldMap[action];
    userStates[chatId] = { projectId, field };
    bot.sendMessage(chatId, field.startsWith("wallet") ? "Please paste your private keys (one per line, base58 encoded)" : `Enter value for ${field}:`);
  }

  if (dataCb.startsWith("deploy_")) {
    const projectId = dataCb.split("_")[1];
    const project = findProject(chatId, projectId);
    if (!project.name || !project.symbol) return bot.sendMessage(chatId, `❌ Metadata not deployed. You need to complete your Metadata.`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `meta_${projectId}` }]] } });
    bot.sendMessage(chatId, `✅ Metadata deployed`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `project_${projectId}` }]] } });
  }
});
