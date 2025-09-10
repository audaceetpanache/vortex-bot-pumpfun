import { projects } from "./projectStore.js";

export function getWalletsMenu(projectId) {
  const text = `🏦 Project Wallets
Project: ${projectId}
Select a wallet to view details`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Create Wallets", callback_data: `wallet_create_${projectId}` },
         { text: "📥 Import Wallets", callback_data: `wallet_import_${projectId}` }],
        [{ text: "👑 Import Creator", callback_data: `wallet_creator_${projectId}` }],
        [{ text: "⬅️ Back", callback_data: `project_${projectId}` }]
      ]
    }
  };
}
