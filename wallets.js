import { projectsStore, saveProjects } from "./projectStore.js";

export function getWalletsMenu(projectId) {
  const project = projectsStore[projectId];

  const text = `🏦 Project Wallets
Project: ${projectId}
Select a wallet to view details`;

  const inline_keyboard = [
    [
      { text: "➕ Create Wallet", callback_data: `create_wallet_${projectId}` },
      { text: "📥 Import Wallet", callback_data: `import_wallet_${projectId}` }
    ],
    [
      { text: "👑 Import Creator", callback_data: `import_creator_${projectId}` }
    ],
    [
      { text: "⬅️ Back", callback_data: `view_project_${projectId}` }
    ]
  ];

  return { text, inline_keyboard };
}

export function handleWalletsCallback(bot, msg, action, projectId) {
  const chatId = msg.message.chat.id;
  const project = projectsStore[projectId];
  if (!project) return;

  switch (action) {
    case "create_wallet":
    case "import_wallet":
    case "import_creator":
      bot.sendMessage(chatId, "✏️ Please enter the wallet name:");
      bot.once("message", (nameResponse) => {
        const wallet = { name: nameResponse.text };

        bot.sendMessage(chatId, "🔑 Please enter the private key:");
        bot.once("message", (keyResponse) => {
          wallet.privateKey = keyResponse.text;
          project.wallets.push(wallet);
          saveProjects();

          bot.sendMessage(chatId, `✅ Wallet '${wallet.name}' added successfully!`, {
            reply_markup: { inline_keyboard: getWalletsMenu(projectId).inline_keyboard }
          });
        });
      });
      break;

    default:
      bot.sendMessage(chatId, "❌ Unknown wallet action");
  }
}
