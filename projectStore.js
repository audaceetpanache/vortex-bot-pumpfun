class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.editState = {}; // { chatId: { projectId, field } }
  }

  addProject(chatId, name, symbol, description, wallet) {
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
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find(p => p.id === projectId);
  }

  deleteProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter(p => p.id !== projectId);
  }

  updateProject(chatId, projectId, field, value) {
    const proj = this.getProject(chatId, projectId);
    if (proj) {
      proj[field] = value;
    }
    return proj;
  }

  setEditState(chatId, projectId, field) {
    this.editState[chatId] = { projectId, field };
  }

  getEditState(chatId) {
    return this.editState[chatId] || null;
  }

  clearEditState(chatId) {
    delete this.editState[chatId];
  }
}

export const projectStore = new ProjectStore();
