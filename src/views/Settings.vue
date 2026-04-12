<script setup>
import { ref } from 'vue';
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