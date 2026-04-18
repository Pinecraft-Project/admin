<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  metadata: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:metadata']);

const localMeta = ref({
  title: '',
  date: 'Без дати',
  pin: false,
  draft: false
});

watch(() => props.metadata, (value) => {
  localMeta.value = {
    title: String(value?.title || ''),
    date: String(value?.date || 'Без дати'),
    pin: value?.pin === true,
    draft: value?.draft === true
  };
}, { immediate: true, deep: true });

watch(localMeta, (value) => {
  emit('update:metadata', {
    title: String(value.title || ''),
    date: String(value.date || 'Без дати'),
    pin: value.pin === true,
    draft: value.draft === true
  });
}, { deep: true });
</script>

<template>
  <div class="border-b border-textColor/10 bg-bgColor">
    <div class="px-4 py-3">
      <h3 class="text-sm font-semibold text-accent-2 mb-3">Gallery Metadata</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Title</label>
          <input v-model="localMeta.title" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Date</label>
          <input v-model="localMeta.date" type="text" placeholder="Без дати" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div class="md:col-span-2 flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="localMeta.pin" type="checkbox" class="accent-accent cursor-pointer" />
            <span class="text-textColor">Pin</span>
          </label>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="localMeta.draft" type="checkbox" class="accent-accent cursor-pointer" />
            <span class="text-textColor">Draft</span>
          </label>
        </div>
      </div>
      <p class="mt-3 text-xs text-textColor/60">
        These values are saved to the gallery metadata JSON for the selected image.
      </p>
    </div>
  </div>
</template>

<style scoped>
input:focus {
  outline: none;
}
</style>
