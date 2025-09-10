// projectStore.js
class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.editing = {};  // { chatId: { projectId, field } }
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  addProject(chatId, name) {
    if (!this.projects[chatId]) this.projects[chatId] = [];
    const newProj = {
      id: Date.now().toString(),
      name,
      symbol: "",
      description: "",
      wallet: ""
    };
    this.projects[chatId].push(newProj);
    return newProj;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter(p => p.id !== projectId);
  }

  getProject(chatId, projectId) {
    return (this.projects[chatId] || []).find(p => p.id === projectId);
  }

  setEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  getEditing(chatId) {
    return this.editing[chatId];
  }

  clearEditing(chatId) {
    delete this.editing[chatId];
  }

  updateProjectField(chatId, projectId, field, value) {
    const proj = this.getProject(chatId, projectId);
    if (proj && field in proj) {
      proj[field] = value;
    }
    return proj;
  }
}

export const projectStore = new ProjectStore();
