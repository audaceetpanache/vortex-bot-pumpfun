// projectStore.js
import fs from "fs";
const FILE = "./projects.json";

function load() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify({ users: {} }, null, 2));
    }
    const raw = fs.readFileSync(FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load projects.json:", e);
    return { users: {} };
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const data = load();

export const projectStore = {
  addProject(userId, name) {
    const id = Math.random().toString(36).substring(2, 9);
    const project = { id, name, createdAt: new Date().toISOString(), metadata: {}, wallets: [] };
    data.users[userId] ||= [];
    data.users[userId].push(project);
    save(data);
    return project;
  },

  getProjectsByUser(userId) {
    return data.users[userId] || [];
  },

  getProject(userId, projectId) {
    return (data.users[userId] || []).find((p) => p.id === projectId);
  },

  deleteProject(userId, projectId) {
    const list = data.users[userId] || [];
    const idx = list.findIndex((p) => p.id === projectId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    data.users[userId] = list;
    save(data);
    return true;
  },

  updateMetadata(userId, projectId, key, value) {
    const project = this.getProject(userId, projectId);
    if (!project) return false;
    project.metadata ||= {};
    project.metadat
