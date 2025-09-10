import { randomUUID } from "crypto";

class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.editing = {}; // { chatId: { projectId, field } }
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find((p) => p.id === projectId);
  }

  addProject(chatId, name) {
    const proj = {
      id: randomUUID(),
      name,
      symbol: "N/A",
      description: "N/A",
      wallet: "N/A",
    };
    if (!this.projects[chatId]) this.projects[chatId] = [];
    this.projects[chatId].push(proj);
    return proj;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter((p) => p.id !== projectId);
  }

  updateProject(chatId, projectId, field, value) {
    const proj = this.getProject(chatId, projectId);
    if (proj) {
      proj[field] = value;
    }
  }

  setEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  isEditing(chatId) {
    return !!this.editing[chatId];
  }

  getEditing(chatId) {
    return this.editing[chatId];
  }

  clearEditing(chatId) {
    delete this.editing[chatId];
  }
}

export const projectStore = new ProjectStore();
