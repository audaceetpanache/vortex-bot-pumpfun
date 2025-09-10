// projectStore.js

class ProjectStore {
  constructor() {
    // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.projects = {};
    // { chatId: { projectId, field } }
    this.editing = {};
  }

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

    if (!this.projects[chatId]) {
      this.projects[chatId] = [];
    }

    this.projects[chatId].push(project);
    return project;
  }

  getProject(chatId, projectId) {
    const list = this.getProjects(chatId);
    return list.find((p) => p.id === projectId);
  }

  updateProject(chatId, projectId, field, value) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      project[field] = value;
    }
    return project;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter((p) => p.id !== projectId);
  }

  // --- Gestion de l'édition
  startEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  isEditing(chatId) {
    return this.editing[chatId] || null;
  }

  stopEditing(chatId) {
    delete this.editing[chatId];
  }

  // --- Appliquer l'édition (appelé après réception du message texte de l'utilisateur)
  applyEdit(chatId, value) {
    const edit = this.isEditing(chatId);
    if (!edit) return null;

    const { projectId, field } = edit;
    const updated = this.updateProject(chatId, projectId, field, value);

    this.stopEditing(chatId);
    return updated;
  }
}

export const projectStore = new ProjectStore();
