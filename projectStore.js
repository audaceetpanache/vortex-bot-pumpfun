// projectStore.js

class ProjectStore {
  constructor() {
    // Stockage en mémoire : { chatId: [ {id, name, symbol, description, wallet} ] }
    this.projects = {};
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  addProject(chatId, name = "Nouveau projet") {
    const project = {
      id: Date.now().toString(), // ID unique basé sur le timestamp
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
}

export const projectStore = new ProjectStore();
