<script setup>
import { ref, onMounted } from 'vue';
import Input from '@/components/Input.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const validFields = ref({
  token: false,
  username: false,
  repo: false,
  path: false,
  branch: false
});

const updateValidation = (field, isValid) => {
  validFields.value[field] = isValid;
};

const isFormValid = () => {
  return Object.values(validFields.value).every(v => v);
};

const handleSave = () => {
  if (isFormValid() || confirm('Some fields are empty. Continue anyway?')) {
    router.push('/');
  }
};

const ollamaUrl = ref(window.localStorage.getItem('Ollama URL') || '');
const ollamaModel = ref(window.localStorage.getItem('Ollama model') || '');
const ollamaModels = ref([]);
const ollamaLoading = ref(false);
const ollamaError = ref('');
let ollamaRefreshTimer = null;

const normalizeOllamaUrl = (value) => {
  return String(value || '').trim().replace(/\/+$/, '');
};

const refreshOllamaModels = async () => {
  const baseUrl = normalizeOllamaUrl(ollamaUrl.value);
  ollamaError.value = '';

  if (!baseUrl) {
    ollamaModels.value = [];
    return;
  }

  ollamaLoading.value = true;
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to load models');
    }

    const models = Array.isArray(data.models)
      ? data.models.map((item) => item?.name).filter(Boolean)
      : [];

    ollamaModels.value = models;

    if (models.length && !models.includes(ollamaModel.value)) {
      ollamaModel.value = models[0];
      window.localStorage.setItem('Ollama model', ollamaModel.value);
    }
  } catch (error) {
    ollamaModels.value = [];
    ollamaError.value = error?.message || 'Could not fetch Ollama models';
  } finally {
    ollamaLoading.value = false;
  }
};

const scheduleRefreshOllamaModels = () => {
  if (ollamaRefreshTimer) {
    clearTimeout(ollamaRefreshTimer);
  }

  ollamaRefreshTimer = setTimeout(() => {
    refreshOllamaModels();
  }, 400);
};

const onOllamaUrlInput = (value) => {
  ollamaUrl.value = value;
  scheduleRefreshOllamaModels();
};

const onOllamaModelChange = (event) => {
  const value = event?.target?.value || '';
  ollamaModel.value = value;
  window.localStorage.setItem('Ollama model', value);
};

onMounted(() => {
  refreshOllamaModels();
});
</script>

<template>
  <main class="flex flex-col w-screen h-screen bg-bgColor">
    <div class="flex items-center flex-col w-full h-full p-8 justify-center">
      <div class="w-full max-w-md border border-textColor/10 rounded p-8">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-3xl font-semibold text-accent-2">Settings</h1>
          <ThemeToggle />
        </div>
        
        <p class="text-textColor/70 text-sm mb-8">
          Configure your GitHub repository connection
        </p>
        
        <Input 
          label="Token" 
          type="password" 
          :required="true"
          errorMessage="GitHub token is required"
          @validate="(valid) => updateValidation('token', valid)"
        />
        <Input 
          label="Github username" 
          placeholder="User1337" 
          :required="true"
          pattern="^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$"
          errorMessage="Enter a valid GitHub username"
          @validate="(valid) => updateValidation('username', valid)"
        />
        <Input 
          label="Repo name" 
          placeholder="vue-site-blog" 
          :required="true"
          pattern="^[a-zA-Z0-9._-]+$"
          errorMessage="Enter a valid repository name"
          @validate="(valid) => updateValidation('repo', valid)"
        />
        <Input 
          label="Path" 
          placeholder="path/to/your/posts" 
          :required="true"
          errorMessage="Path to posts is required"
          @validate="(valid) => updateValidation('path', valid)"
        />
        <Input 
          label="Branch" 
          placeholder="main" 
          :required="true"
          pattern="^[a-zA-Z0-9/_-]+$"
          errorMessage="Enter a valid branch name"
          @validate="(valid) => updateValidation('branch', valid)"
        />

        <div class="border-t border-textColor/10 pt-5 mt-2">
          <p class="text-textColor/70 text-sm mb-4">
            Optional: local Ollama AI settings for post writing/editing
          </p>
          <Input
            label="Ollama URL"
            placeholder="http://127.0.0.1:11434"
            pattern="^https?://.+"
            errorMessage="Enter a valid URL, e.g. http://127.0.0.1:11434"
            :value="ollamaUrl"
            @input="onOllamaUrlInput"
          />

          <div class="mb-5">
            <label class="block text-xs bg-accent text-white rounded px-1 w-max mb-1">
              Ollama model
            </label>
            <select
              :value="ollamaModel"
              @change="onOllamaModelChange"
              class="h-10 w-full px-2 rounded bg-bgColor text-textColor font-mono text-sm border border-textColor/20 hover:border-accent focus:border-accent"
            >
              <option value="" disabled>
                {{ ollamaLoading ? 'Loading models...' : 'Select model' }}
              </option>
              <option v-for="model in ollamaModels" :key="model" :value="model">
                {{ model }}
              </option>
              <option
                v-if="ollamaModel && !ollamaModels.includes(ollamaModel)"
                :value="ollamaModel"
              >
                {{ ollamaModel }} (saved)
              </option>
            </select>
            <p v-if="ollamaError" class="text-red-500 text-xs mt-1">
              {{ ollamaError }}
            </p>
            <p v-else-if="!ollamaLoading && !ollamaModels.length" class="text-textColor/60 text-xs mt-1">
              Enter Ollama URL to load models automatically.
            </p>
          </div>

          <Input
            label="Ollama master prompt"
            placeholder="You are an assistant for Astro blog writing..."
          />
        </div>
        
        <button 
          @click="handleSave"
          class="mt-6 text-center w-full text-sm py-3 px-6 border border-textColor/20 rounded hover:border-accent transition-colors font-semibold"
        > 
          Save & Continue
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style> 