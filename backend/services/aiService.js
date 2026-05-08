const path = require('path');
const fs = require('fs');
const axios = require('axios');

const keyJsonPath = path.join(__dirname, '../../key.json');

let modelsConfig = null;

function loadModelsConfig() {
  if (!modelsConfig) {
    const data = fs.readFileSync(keyJsonPath, 'utf8');
    modelsConfig = JSON.parse(data);
  }
  return modelsConfig;
}

function getModelById(modelId) {
  const config = loadModelsConfig();
  return config.models.find(m => m.id === modelId);
}

async function chatCompletion(modelId, messages, options = {}) {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const { apiKey, apiBase, model: modelName } = model;
  const url = `${apiBase}/chat/completions`;

  const requestBody = {
    model: modelName,
    messages: messages,
    stream: false,
    ...options
  };

  const response = await axios.post(url, requestBody, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return response.data;
}

async function chatCompletionStream(modelId, messages, options = {}, onData, onComplete, onError) {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model not found: ${modelId}`);
  }

  const { apiKey, apiBase, model: modelName } = model;
  const url = `${apiBase}/chat/completions`;

  const requestBody = {
    model: modelName,
    messages: messages,
    stream: true,
    ...options
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      responseType: 'stream'
    });

    let buffer = '';

    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }
        if (trimmedLine.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmedLine.slice(6));
            onData(data);
          } catch (parseError) {
          }
        }
      }
    });

    response.data.on('end', () => {
      if (onComplete) onComplete();
    });

    response.data.on('error', (err) => {
      if (onError) onError(err);
    });

  } catch (error) {
    if (onError) onError(error);
  }
}

module.exports = {
  loadModelsConfig,
  getModelById,
  chatCompletion,
  chatCompletionStream
};
