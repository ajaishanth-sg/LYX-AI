export const API_BASE = typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" ? `http://${window.location.hostname}:8000` : "http://127.0.0.1:8000";
// STT+LLM+TTS can legitimately take a few seconds, but with no timeout at
// all a stalled/blocked backend call (e.g. the LLM request hanging) left
// the mic frozen in "processing" forever with no error and no way to
// recover except reloading. Cap it so the UI always gets a response one
// way or another.
const REQUEST_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("The request took too long to respond. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse(res) {
  const body = await res.json();
  if (!body.success) {
    const message = body.error?.message || "Request failed.";
    throw new Error(message);
  }
  return body.data;
}

export async function setPersona(personaPrompt) {
  const res = await fetch(`${API_BASE}/api/v1/settings/persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona_prompt: personaPrompt }),
  });
  return handleResponse(res);
}

export async function getPersona() {
  const res = await fetch(`${API_BASE}/api/v1/settings/persona`);
  return handleResponse(res);
}

export async function getModels() {
  const res = await fetch(`${API_BASE}/api/v1/settings/models`);
  return handleResponse(res);
}

export async function createModel(name, apiKey, provider, baseUrl) {
  const res = await fetch(`${API_BASE}/api/v1/settings/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, api_key: apiKey, provider, base_url: baseUrl }),
  });
  return handleResponse(res);
}

export async function deleteModel(modelId) {
  const res = await fetch(`${API_BASE}/api/v1/settings/models/${modelId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function startConversation() {
  const res = await fetch(`${API_BASE}/api/v1/conversation/start`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function sendMessage(sessionId, audioBlob, modelId = null) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "message.webm");
  formData.append("session_id", sessionId);
  if (modelId) formData.append("model_id", modelId);

  const res = await fetchWithTimeout(`${API_BASE}/api/v1/conversation/message`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function sendTextMessage(sessionId, message, modelId = null) {
  const res = await fetch(`${API_BASE}/api/v1/conversation/message-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, model_id: modelId }),
  });
  return handleResponse(res);
}

export async function sendTextMessageStream(sessionId, message, modelId = null) {
  const res = await fetch(`${API_BASE}/api/v1/conversation/message-text-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, model_id: modelId }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || res.statusText);
  }
  return res.body;
}

export async function endConversation(sessionId) {
  const res = await fetch(`${API_BASE}/api/v1/conversation/${sessionId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/documents/upload`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/api/v1/documents`);
  return handleResponse(res);
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/api/v1/documents/${docId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function getConversationHistory() {
  const res = await fetch(`${API_BASE}/api/v1/conversation/history`);
  return handleResponse(res);
}

export async function deleteConversationHistory(sessionId) {
  const res = await fetch(`${API_BASE}/api/v1/conversation/history/${sessionId}`, {
    method: "DELETE",
  });
  return handleResponse(res);
}

export async function executeConnector(connectorId, credential) {
  const res = await fetch(`${API_BASE}/api/connectors/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connector_id: connectorId, credential: credential }),
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || "Connection failed");
  }
  return body.text;
}

export async function syncConnector(connectorId, credential) {
  const res = await fetch(`${API_BASE}/api/connectors/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connector_id: connectorId, credential: credential }),
  });
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || "Sync failed");
  }
  return body;
}

export async function executeSystemAction(action, { command, code, filename, appName } = {}) {
  const res = await fetch(`${API_BASE}/api/v1/system/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      command,
      code,
      filename,
      app_name: appName,
    }),
  });
  return handleResponse(res);
}

export async function getSystemStatus() {
  const res = await fetch(`${API_BASE}/api/v1/system/status`);
  return handleResponse(res);
}