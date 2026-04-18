<script setup>
import { computed } from 'vue';

const props = defineProps({
  metadata: {
    type: Object,
    default: () => ({})
  }
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateString;
  }
};

const hasMetadata = computed(() => {
  return props.metadata && Object.keys(props.metadata).length > 0;
});
</script>

<template>
  <div v-if="hasMetadata" class="post-meta mb-8 pb-8 border-b border-textColor/10">
    <!-- Draft Badge -->
    <div v-if="metadata.draft" class="mb-2">
      <span class="text-sm text-red-500 font-semibold">(Draft)</span>
    </div>

    <!-- Title -->
    <h1 v-if="metadata.title" class="text-3xl sm:text-4xl font-semibold text-accent-2 mb-3">
      {{ metadata.title }}
    </h1>

    <!-- Description -->
    <p v-if="metadata.description" class="text-textColor/70 text-base mb-4">
      {{ metadata.description }}
    </p>

    <!-- Date and Update Info -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <p v-if="metadata.publishDate" class="font-semibold text-textColor">
        {{ formatDate(metadata.publishDate) }}
      </p>

      <p v-else-if="metadata.date" class="font-semibold text-textColor">
        {{ metadata.date }}
      </p>
      
      <span v-if="metadata.updatedDate" class="rounded-lg bg-quote/10 px-2 py-1 text-quote text-xs">
        Last Updated: {{ formatDate(metadata.updatedDate) }}
      </span>

      <span v-if="metadata.badge" class="rounded-lg bg-accent/10 px-2 py-1 text-accent text-xs">
        {{ metadata.badge }}
      </span>
    </div>

    <!-- Tags -->
    <div v-if="metadata.tags && metadata.tags.length" class="mt-4 flex flex-wrap items-center gap-2">
      <svg
        aria-hidden="true"
        class="inline-block h-5 w-5 text-textColor/70"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        viewBox="0 0 24 24"
      >
        <path d="M0 0h24v24H0z" fill="none" stroke="none" />
        <path d="M7.859 6h-2.834a2.025 2.025 0 0 0 -2.025 2.025v2.834c0 .537 .213 1.052 .593 1.432l6.116 6.116a2.025 2.025 0 0 0 2.864 0l2.834 -2.834a2.025 2.025 0 0 0 0 -2.864l-6.117 -6.116a2.025 2.025 0 0 0 -1.431 -.593z" />
        <path d="M17.573 18.407l2.834 -2.834a2.025 2.025 0 0 0 0 -2.864l-7.117 -7.116" />
        <path d="M6 9h-.01" />
      </svg>
      <div class="inline-flex flex-wrap gap-1 text-sm">
        <span 
          v-for="(tag, index) in metadata.tags" 
          :key="tag"
          class="text-textColor"
        >
          <a 
            href="#" 
            class="cactus-link inline-block hover:text-link transition-colors"
            @click.prevent
          >
            #{{ tag }}
          </a>
          <span v-if="index < metadata.tags.length - 1">, </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cactus-link {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.cactus-link:hover {
  text-decoration-thickness: 2px;
}
</style>
