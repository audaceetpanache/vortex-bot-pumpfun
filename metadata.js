// metadata.js
import { projectStore } from "./projectStore.js";

export function getMetadataMenu(userId, projectId) {
  const project = projectStore.getProject(userId, projectId);
  if (!project) {
    return {
      text: "❌ Project not found",
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "your_projects" }]],
      },
    };
  }

  const m = project.metadata;
  const deployed = project.validated
    ? "✅ Metadata deployed"
    : "❌ Metadata not yet deployed";

  return {
    text: `🎯 Project ${project.id} Metadata\nSelect a field to edit:\n${deployed}`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Name", callback_data: `meta_name_${project.id}` },
          { text: "Symbol", callback_data: `meta_symbol_${project.id}` },
        ],
        [
          { text: "Description", callback_data: `meta_description_${project.id}` },
        ],
        [
          { text: "Twitter", callback_data: `meta_twitter_${project.id}` },
          { text: "Telegram", callback_data: `meta_telegram_${project.id}` },
        ],
        [
          { text: "Website", callback_data: `meta_website_${project.id}` },
          { text: "Image", callback_data: `meta_image_${project.id}` },
        ],
        [
          { text: "🚀 Deploy Metadata", callback_data: `meta_deploy_${project.id}` },
        ],
        [
          { text: "📋 Clone Metadata", callback_data: `unavailable` },
        ],
        [
          { text: "⬅️ Back", callback_data: `project_${project.id}` },
        ],
      ],
    },
  };
}
