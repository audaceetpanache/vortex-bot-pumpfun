// Simple in-memory storage for projects
export const projectStore = {
  projects: {},

  addProject(chatId, name, symbol = "", description = "", wallet = "") {
    if (!this.projects[chatId]) this.projects[chatId] = [];
    const newProj = {
      id: Date.now().toString(),
      name,
      symbol,
      description,
      wallet
    };
    this.projects[chatId].push(newProj);
    return newProj;
  },

  getProjects(chatId) {
    return this.projects[chatId] || [];
  },

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find(p => p.id === projectId);
  },

  updateProject(chatId, projectId, updates) {
    const proj = this.getProject(chatId, projectId);
    if (proj) {
      Object.assign(proj, updates);
    }
    return proj;
  },

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter(p => p.id !== projectId);
  }
};
