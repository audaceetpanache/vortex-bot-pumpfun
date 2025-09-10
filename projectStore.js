// projectStore.js
import fs from "fs";
const FILE = "./projects.json";

function load() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify({ users: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return { users: {} };
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const data = load();

function genId() {
  return Math.random().toString(36).substring(2, 9);
}

export const projectStore = {
  addProject(userId, name) {
    const id = genId();
    const project = {
      id,
      name,
      symbol: null,
      description: null,
      wallets: [],
      validated: false,
    };
    data.users[userId] ||= [];
    data.users[userId].push(project);
    save(data);
    return project;
  },

  getProjects(userId) {
    return data.users[userId] || [];
  },

  getProject(userId, projectId) {
    return (data.users[userId] || []).find((p) => p.id === projectId);
  },

  deleteProject(userId, projectId) {
    const list = data.users[userId] || [];
    data.users[userId] = list.filter((p) => p.id !== projectId);
    save(data);
  },

  updateProject(userId, projectId, fields) {
    const proj = this.getProject(userId, projectId);
    if (!proj) return null;
    Object.assign(proj, fields);
    this._maybeValidate(proj);
    save(data);
    return proj;
  },

  addWallet(userId, projectId, wallet) {
    const proj = this.getProject(userId, projectId);
    if (!proj) return null;
    proj.wallets.push(wallet);
    this._maybeValidate(proj);
    save(data);
    return proj;
  },

  _maybeValidate(project) {
    project.validated = !!(
      project.name &&
      project.symbol &&
      project.description &&
      project.wallets.length > 0
    );
  },

  getValidProject(userId) {
    return this.getProjects(userId).find((p) => p.validated) || null;
  },
};
