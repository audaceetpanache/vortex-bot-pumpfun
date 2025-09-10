// projectStore.js

class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ { id, name, symbol, description, wallet } ] }
    this.editing = {};  // { chatId: { projectId, field } }
  }

  // --- Gestion des projets ---
  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  addProject(chatId, name = "Nouveau projet") {
    const project = {
      id: Date.now().toString(),
      name,
      symbol: "",
      description: "",
      wallet: ""
    };
    if (!this.projects[chatId]) this.projects[chatId] = [];
    this.projects[chatId].push(project);
    return project;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter(p => p.id !== projectId);
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find(p => p.id === projectId);
  }

  // --- Edition ---
  startEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  isEditing(chatId) {
    return this.editing[chatId] || null;
  }

  applyEdit(chatId, text) {
    const editState = this.editing[chatId];
    if (!editState) return null;

    const project = this.getProject(chatId, editState.projectId);
    if (!project) return null;

    project[editState.field] = text;
    delete this.editing[chatId];
    return project;
  }

  // --- Déploiement (enregistrement/mise à jour) ---
  canDeploy(project) {
    return project.name && project.symbol && project.description && project.wallet;
  }

  getMissingFields(project) {
    const missing = [];
    if (!project.name) missing.push("Nom");
    if (!project.symbol) missing.push("Symbole");
    if (!project.description) missing.push("Description");
    if (!project.wallet) missing.push("Wallet");
    return missing;
  }
}

export const projectStore = new ProjectStore();
