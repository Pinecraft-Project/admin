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

const githubToken = ref(window.localStorage.getItem('Token') || '');
const githubUsername = ref(window.localStorage.getItem('Github username') || '');
const githubRepo = ref(window.localStorage.getItem('Repo name') || '');
const githubBranch = ref(window.localStorage.getItem('Branch') || '');
const githubPath = ref(window.localStorage.getItem('Path') || '');
const githubRepos = ref([]);
const githubReposLoading = ref(false);
const githubReposError = ref('');
const repoSearch = ref(window.localStorage.getItem('Repo name') || '');
const showRepoDropdown = ref(false);
const githubBranches = ref([]);
const githubBranchesLoading = ref(false);
const githubBranchesError = ref('');
let githubBranchRefreshTimer = null;
let githubRepoRefreshTimer = null;
const showSaveConfirmModal = ref(false);
const pendingChanges = ref([]);
const initialSettings = ref({});

const updateValidation = (field, isValid) => {
  validFields.value[field] = isValid;
};

const isFormValid = () => {
  return Object.values(validFields.value).every(v => v);
};

const handleSave = () => {
  pendingChanges.value = getPendingChanges();
  showSaveConfirmModal.value = true;
};

const closeSaveConfirm = () => {
  showSaveConfirmModal.value = false;
};

const confirmSave = () => {
  showSaveConfirmModal.value = false;
  router.push('/');
};

const ollamaUrl = ref(window.localStorage.getItem('Ollama URL') || '');
const ollamaModel = ref(window.localStorage.getItem('Ollama model') || '');
const ollamaMasterPrompt = ref(window.localStorage.getItem('Ollama master prompt') || '');
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

const onOllamaMasterPromptInput = (event) => {
  const value = event?.target?.value || '';
  ollamaMasterPrompt.value = value;
  window.localStorage.setItem('Ollama master prompt', value);
};

const refreshGithubBranches = async () => {
  const token = String(githubToken.value || '').trim();
  const username = String(githubUsername.value || '').trim();
  const repo = String(githubRepo.value || '').trim();

  githubBranchesError.value = '';

  if (!token || !username || !repo) {
    githubBranches.value = [];
    updateValidation('branch', !!githubBranch.value);
    return;
  }

  githubBranchesLoading.value = true;
  try {
    const response = await fetch(`https://api.github.com/repos/${username}/${repo}/branches?per_page=100`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to load branches');
    }

    const branches = Array.isArray(data)
      ? data.map((item) => item?.name).filter(Boolean)
      : [];

    githubBranches.value = branches;

    if (branches.length && !branches.includes(githubBranch.value)) {
      githubBranch.value = branches[0];
      window.localStorage.setItem('Branch', githubBranch.value);
    }

    updateValidation('branch', !!githubBranch.value);
  } catch (error) {
    githubBranches.value = [];
    githubBranchesError.value = error?.message || 'Could not fetch branches';
    updateValidation('branch', !!githubBranch.value);
  } finally {
    githubBranchesLoading.value = false;
  }
};

const filteredRepos = () => {
  const q = String(repoSearch.value || '').trim().toLowerCase();
  if (!q) return githubRepos.value.slice(0, 40);
  return githubRepos.value
    .filter((name) => name.toLowerCase().includes(q))
    .slice(0, 40);
};

const refreshGithubRepos = async () => {
  const token = String(githubToken.value || '').trim();
  const username = String(githubUsername.value || '').trim();

  githubReposError.value = '';

  if (!token || !username) {
    githubRepos.value = [];
    updateValidation('repo', !!githubRepo.value);
    return;
  }

  githubReposLoading.value = true;
  try {
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const data = await response.json().catch(() => ([]));
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to load repositories');
    }

    const repos = Array.isArray(data)
      ? data
          .map((item) => item?.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      : [];

    githubRepos.value = repos;

    if (!githubRepo.value && repos.length) {
      githubRepo.value = repos[0];
      repoSearch.value = repos[0];
      window.localStorage.setItem('Repo name', repos[0]);
    }

    updateValidation('repo', !!githubRepo.value);
  } catch (error) {
    githubRepos.value = [];
    githubReposError.value = error?.message || 'Could not fetch repositories';
    updateValidation('repo', !!githubRepo.value);
  } finally {
    githubReposLoading.value = false;
  }
};

const scheduleRefreshGithubRepos = () => {
  if (githubRepoRefreshTimer) {
    clearTimeout(githubRepoRefreshTimer);
  }

  githubRepoRefreshTimer = setTimeout(() => {
    refreshGithubRepos();
  }, 400);
};

const scheduleRefreshGithubBranches = () => {
  if (githubBranchRefreshTimer) {
    clearTimeout(githubBranchRefreshTimer);
  }

  githubBranchRefreshTimer = setTimeout(() => {
    refreshGithubBranches();
  }, 400);
};

const onTokenInput = (value) => {
  githubToken.value = value;
  scheduleRefreshGithubRepos();
  scheduleRefreshGithubBranches();
};

const onGithubUsernameInput = (value) => {
  githubUsername.value = value;
  scheduleRefreshGithubRepos();
  scheduleRefreshGithubBranches();
};

const onRepoInput = (value) => {
  repoSearch.value = value;
  githubRepo.value = value;
  window.localStorage.setItem('Repo name', value);
  updateValidation('repo', !!value);
  showRepoDropdown.value = true;
  scheduleRefreshGithubBranches();
};

const onRepoFocus = () => {
  showRepoDropdown.value = true;
};

const onRepoBlur = () => {
  setTimeout(() => {
    showRepoDropdown.value = false;
  }, 150);
};

const selectRepo = (repoName) => {
  githubRepo.value = repoName;
  repoSearch.value = repoName;
  window.localStorage.setItem('Repo name', repoName);
  updateValidation('repo', true);
  showRepoDropdown.value = false;
  scheduleRefreshGithubBranches();
};

const onPathInput = (value) => {
  githubPath.value = value;
};

const onBranchChange = (event) => {
  const value = event?.target?.value || '';
  githubBranch.value = value;
  window.localStorage.setItem('Branch', value);
  updateValidation('branch', !!value);
};

const getCurrentSettings = () => ({
  token: String(githubToken.value || ''),
  username: String(githubUsername.value || ''),
  repo: String(githubRepo.value || ''),
  path: String(githubPath.value || ''),
  branch: String(githubBranch.value || ''),
  ollamaUrl: String(ollamaUrl.value || ''),
  ollamaModel: String(ollamaModel.value || ''),
  ollamaMasterPrompt: String(ollamaMasterPrompt.value || '')
});

const getPendingChanges = () => {
  const next = getCurrentSettings();
  const prev = initialSettings.value || {};
  const changes = [];

  if (next.token !== prev.token) {
    changes.push('GitHub token will be updated.');
  }
  if (next.username !== prev.username) {
    changes.push(`GitHub username: ${prev.username || '(empty)'} -> ${next.username || '(empty)'}`);
  }
  if (next.repo !== prev.repo) {
    changes.push(`Repository: ${prev.repo || '(empty)'} -> ${next.repo || '(empty)'}`);
  }
  if (next.path !== prev.path) {
    changes.push(`Posts path: ${prev.path || '(empty)'} -> ${next.path || '(empty)'}`);
  }
  if (next.branch !== prev.branch) {
    changes.push(`Branch: ${prev.branch || '(empty)'} -> ${next.branch || '(empty)'}`);
  }
  if (next.ollamaUrl !== prev.ollamaUrl) {
    changes.push(`Ollama URL: ${prev.ollamaUrl || '(empty)'} -> ${next.ollamaUrl || '(empty)'}`);
  }
  if (next.ollamaModel !== prev.ollamaModel) {
    changes.push(`Ollama model: ${prev.ollamaModel || '(empty)'} -> ${next.ollamaModel || '(empty)'}`);
  }
  if (next.ollamaMasterPrompt !== prev.ollamaMasterPrompt) {
    changes.push('Ollama master prompt will be updated.');
  }

  return changes;
};

onMounted(() => {
  initialSettings.value = getCurrentSettings();
  updateValidation('repo', !!githubRepo.value);
  updateValidation('branch', !!githubBranch.value);
  refreshGithubRepos();
  refreshGithubBranches();
  refreshOllamaModels();
});
</script>

<template>
  <main class="w-screen h-screen bg-bgColor overflow-y-auto">
    <div class="w-full max-w-5xl mx-auto p-6 md:p-8">
      <div class="mb-6">
        <div class="flex items-center justify-between mb-3">
          <h1 class="text-3xl md:text-4xl font-semibold text-accent-2">Project Settings</h1>
          <ThemeToggle />
        </div>
        <p class="text-textColor/70 text-sm md:text-base">
          Configure GitHub and Ollama integration. Changes are stored locally in your browser and applied to the editor.
        </p>

        <div class="mt-4 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
          GitHub token permissions required: Contents (Read and write) and Workflows (Read and write).
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <section class="w-full border border-textColor/10 rounded p-6 md:p-7">
          <h2 class="text-lg font-semibold text-accent-2 mb-4">GitHub Connection</h2>

        <Input 
          label="Token" 
          type="password" 
          :required="true"
          errorMessage="GitHub token is required"
          :value="githubToken"
          @input="onTokenInput"
          @validate="(valid) => updateValidation('token', valid)"
        />
        <p class="text-textColor/60 text-xs -mt-3 mb-5">
          GitHub Personal Access Token. Required permissions: Contents (Read and write), Workflows (Read and write). Path: GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate new token.
        </p>

        <Input 
          label="Github username" 
          placeholder="User1337" 
          :required="true"
          pattern="^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$"
          errorMessage="Enter a valid GitHub username"
          :value="githubUsername"
          @input="onGithubUsernameInput"
          @validate="(valid) => updateValidation('username', valid)"
        />
        <p class="text-textColor/60 text-xs -mt-3 mb-5">
          Your GitHub account name (owner of the repository).
        </p>

        <div class="relative mb-5">
          <label class="block text-xs bg-accent text-white rounded px-1 w-max mb-1">
            Repo name *
          </label>
          <input
            :value="repoSearch"
            @input="(e) => onRepoInput(e.target.value)"
            @focus="onRepoFocus"
            @blur="onRepoBlur"
            placeholder="Search repository..."
            class="h-10 w-full px-2 rounded bg-bgColor text-textColor font-mono text-sm border border-textColor/20 hover:border-accent focus:border-accent"
          />
          <div v-if="showRepoDropdown" class="absolute z-20 mt-1 w-full rounded border border-textColor/20 bg-bgColor shadow-lg max-h-56 overflow-y-auto">
            <div v-if="githubReposLoading" class="px-3 py-2 text-xs text-textColor/70">Loading repositories...</div>
            <div v-else-if="githubReposError" class="px-3 py-2 text-xs text-red-500">{{ githubReposError }}</div>
            <button
              v-else-if="filteredRepos().length"
              v-for="repo in filteredRepos()"
              :key="repo"
              @mousedown.prevent="selectRepo(repo)"
              type="button"
              class="w-full text-left px-3 py-2 text-sm hover:bg-textColor/5"
            >
              {{ repo }}
            </button>
            <div v-else class="px-3 py-2 text-xs text-textColor/60">No repositories match your search.</div>
          </div>
        </div>
        <p class="text-textColor/60 text-xs -mt-3 mb-5">
          Repository name only, without URL. Example: astro-blog.
        </p>

        <Input 
          label="Path" 
          placeholder="path/to/your/posts" 
          :required="true"
          :value="githubPath"
          @input="onPathInput"
          errorMessage="Path to posts is required"
          @validate="(valid) => updateValidation('path', valid)"
        />
        <p class="text-textColor/60 text-xs -mt-3 mb-5">
          Folder path inside repository where posts are stored. Example: src/content/blog
        </p>
        <div class="mb-5">
          <label class="block text-xs bg-accent text-white rounded px-1 w-max mb-1">
            Branch *
          </label>
          <select
            :value="githubBranch"
            @change="onBranchChange"
            class="h-10 w-full px-2 rounded bg-bgColor text-textColor font-mono text-sm border border-textColor/20 hover:border-accent focus:border-accent"
          >
            <option value="" disabled>
              {{ githubBranchesLoading ? 'Loading branches...' : 'Select branch' }}
            </option>
            <option v-for="branch in githubBranches" :key="branch" :value="branch">
              {{ branch }}
            </option>
            <option
              v-if="githubBranch && !githubBranches.includes(githubBranch)"
              :value="githubBranch"
            >
              {{ githubBranch }} (saved)
            </option>
          </select>
          <p v-if="githubBranchesError" class="text-red-500 text-xs mt-1">
            {{ githubBranchesError }}
          </p>
          <p v-else-if="!githubBranchesLoading && !githubBranches.length" class="text-textColor/60 text-xs mt-1">
            Enter token, username and repo to load branches automatically.
          </p>
        </div>
        <p class="text-textColor/60 text-xs -mt-3 mb-5">
          Target branch for reading and saving posts. List is loaded automatically from GitHub.
        </p>
        </section>

        <section class="w-full border border-textColor/10 rounded p-6 md:p-7">
          <h2 class="text-lg font-semibold text-accent-2 mb-4">Ollama AI (Optional)</h2>
          <Input
            label="Ollama URL"
            placeholder="http://127.0.0.1:11434"
            pattern="^https?://.+"
            errorMessage="Enter a valid URL, e.g. http://127.0.0.1:11434"
            :value="ollamaUrl"
            @input="onOllamaUrlInput"
          />
          <p class="text-textColor/60 text-xs -mt-3 mb-5">
            Local Ollama endpoint. Usually http://127.0.0.1:11434
          </p>

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
          <p class="text-textColor/60 text-xs -mt-3 mb-5">
            Model name used for AI writing and metadata generation.
          </p>

          <div class="mb-5">
            <label class="block text-xs bg-accent text-white rounded px-1 w-max mb-1">
              Ollama master prompt
            </label>
            <textarea
              :value="ollamaMasterPrompt"
              @input="onOllamaMasterPromptInput"
              rows="5"
              placeholder="You are an assistant for Astro blog writing..."
              class="w-full px-2 py-2 rounded bg-bgColor text-textColor font-mono text-sm border border-textColor/20 hover:border-accent focus:border-accent resize-y"
            ></textarea>
          </div>
          <p class="text-textColor/60 text-xs -mt-3 mb-1">
            Global instruction appended to every Ollama request (style, tone, constraints).
          </p>
        </section>
      </div>
        
      <div class="w-full border border-textColor/10 rounded p-4 bg-bgColor/60 sticky bottom-4 backdrop-blur">
        <p v-if="!isFormValid()" class="text-yellow-200 text-xs mb-3">
          Some required fields are incomplete. You can still continue, but loading/saving may fail.
        </p>
        <button 
          @click="handleSave"
          class="text-center w-full text-sm py-3 px-6 border border-textColor/20 rounded hover:border-accent transition-colors font-semibold"
        > 
          Review Changes & Continue
        </button>
      </div>
    </div>

    <div
      v-if="showSaveConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="closeSaveConfirm"
    >
      <div class="w-full max-w-2xl rounded border border-textColor/20 bg-bgColor p-5">
        <h3 class="text-lg font-semibold text-accent-2 mb-2">Confirm Settings Update</h3>
        <p class="text-sm text-textColor/75 mb-4">
          These changes will be used by the editor for loading/saving posts and AI requests.
        </p>

        <div class="max-h-64 overflow-y-auto rounded border border-textColor/10 p-3 bg-bgColor/70">
          <p v-if="!pendingChanges.length" class="text-sm text-textColor/70">
            No value changes detected. Continue with current settings?
          </p>
          <ul v-else class="text-sm text-textColor/85 list-disc pl-5 space-y-1">
            <li v-for="change in pendingChanges" :key="change">{{ change }}</li>
          </ul>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="closeSaveConfirm"
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmSave"
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors font-semibold"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style> 