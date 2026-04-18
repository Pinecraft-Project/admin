<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:content']);

const isSyncing = ref(false);
const localValues = ref({
  title: '',
  description: '',
  author: '',
  authorGithub: '',
  lang: '',
  ogLocale: '',
  address: '',
  discordUrl: '',
  mapUrl: ''
});

const syncFromContent = (content) => {
  isSyncing.value = true;
  try {
    const parsed = JSON.parse(String(content || '{}'));
    localValues.value = {
      title: String(parsed?.title || ''),
      description: String(parsed?.description || ''),
      author: String(parsed?.author || ''),
      authorGithub: String(parsed?.authorGithub || ''),
      lang: String(parsed?.lang || ''),
      ogLocale: String(parsed?.ogLocale || ''),
      address: String(parsed?.server?.address || ''),
      discordUrl: String(parsed?.server?.discordUrl || ''),
      mapUrl: String(parsed?.server?.mapUrl || '')
    };
  } catch {
    localValues.value = {
      title: '',
      description: '',
      author: '',
      authorGithub: '',
      lang: '',
      ogLocale: '',
      address: '',
      discordUrl: '',
      mapUrl: ''
    };
  }

  setTimeout(() => {
    isSyncing.value = false;
  }, 0);
};

watch(() => props.content, (next) => {
  syncFromContent(next);
}, { immediate: true });

watch(localValues, (next) => {
  if (isSyncing.value) return;

  let parsed = {};
  try {
    parsed = JSON.parse(String(props.content || '{}'));
  } catch {
    parsed = {};
  }

  parsed = {
    ...parsed,
    author: next.author,
    authorGithub: next.authorGithub,
    description: next.description,
    lang: next.lang,
    ogLocale: next.ogLocale,
    title: next.title,
    server: {
      ...(parsed.server || {}),
      address: next.address,
      discordUrl: next.discordUrl,
      mapUrl: next.mapUrl
    }
  };

  emit('update:content', `${JSON.stringify(parsed, null, 2)}\n`);
}, { deep: true });
</script>

<template>
  <div class="border-b border-textColor/10 bg-bgColor">
    <div class="px-4 py-3">
      <h3 class="text-sm font-semibold text-accent-2 mb-3">Site Settings</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Site Title</label>
          <input v-model="localValues.title" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Author</label>
          <input v-model="localValues.author" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div class="md:col-span-2">
          <label class="block text-xs text-textColor/70 mb-1">Description</label>
          <textarea v-model="localValues.description" rows="2" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Author GitHub URL</label>
          <input v-model="localValues.authorGithub" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Language</label>
          <input v-model="localValues.lang" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">OG Locale</label>
          <input v-model="localValues.ogLocale" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Server Address</label>
          <input v-model="localValues.address" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Discord URL</label>
          <input v-model="localValues.discordUrl" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs text-textColor/70 mb-1">Map URL</label>
          <input v-model="localValues.mapUrl" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input:focus,
textarea:focus {
  outline: none;
}
</style>
