<script setup>
import { ref, computed, watch } from 'vue';
import TagSelector from './TagSelector.vue';

const props = defineProps({
  posts: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:filtered']);

const FILTERS_STORAGE_KEY = 'abpm:post-filters';

const searchQuery = ref('');
const selectedTags = ref([]);
const showDrafts = ref(false);
const showPinnedOnly = ref(false);

const loadFiltersFromStorage = () => {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    searchQuery.value = typeof saved.searchQuery === 'string' ? saved.searchQuery : '';
    selectedTags.value = Array.isArray(saved.selectedTags) ? saved.selectedTags : [];
    showDrafts.value = Boolean(saved.showDrafts);
    showPinnedOnly.value = Boolean(saved.showPinnedOnly);
  } catch (error) {
    console.log('Failed to load filters from storage', error);
  }
};

const saveFiltersToStorage = () => {
  try {
    const payload = {
      searchQuery: searchQuery.value,
      selectedTags: selectedTags.value,
      showDrafts: showDrafts.value,
      showPinnedOnly: showPinnedOnly.value,
    };
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.log('Failed to save filters to storage', error);
  }
};

loadFiltersFromStorage();

// Extract all unique tags from posts with count
const allTagsWithCount = computed(() => {
  const tagCounts = new Map();
  
  props.posts.forEach(post => {
    if (post.metadata?.tags) {
      post.metadata.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }
  });
  
  return Array.from(tagCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
});

// Filter posts based on criteria
const filteredPosts = computed(() => {
  let result = props.posts;

  // Filter by search query (title or filename)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(post => {
      const title = post.metadata?.title || post.name;
      return title.toLowerCase().includes(query);
    });
  }

  // Filter by tags
  if (selectedTags.value.length > 0) {
    result = result.filter(post => {
      if (!post.metadata?.tags) return false;
      return selectedTags.value.some(tag => post.metadata.tags.includes(tag));
    });
  }

  // Filter by draft status - show ONLY drafts
  if (showDrafts.value) {
    result = result.filter(post => post.metadata?.draft === true);
  }

  // Filter by pinned status
  if (showPinnedOnly.value) {
    result = result.filter(post => post.metadata?.pin === true);
  }

  return result;
});

// Stats for filters
const stats = computed(() => {
  const total = props.posts.length;
  const drafts = props.posts.filter(p => p.metadata?.draft === true).length;
  const pinned = props.posts.filter(p => p.metadata?.pin === true).length;
  
  return { total, drafts, pinned };
});

// Watch filtered posts and emit changes
watch(filteredPosts, (newValue) => {
  emit('update:filtered', newValue);
}, { immediate: true });

watch([searchQuery, selectedTags, showDrafts, showPinnedOnly], () => {
  saveFiltersToStorage();
}, { deep: true });

const toggleTag = (tag) => {
  const index = selectedTags.value.indexOf(tag);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.push(tag);
  }
};

const clearTags = () => {
  selectedTags.value = [];
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedTags.value = [];
  showDrafts.value = false;
  showPinnedOnly.value = false;
};

const hasActiveFilters = computed(() => {
  return searchQuery.value || 
         selectedTags.value.length > 0 || 
         showDrafts.value || 
         showPinnedOnly.value;
});
</script>

<template>
  <div class="filters-container px-4 py-3 border-b border-textColor/10">
    <!-- Search -->
    <input 
      v-model="searchQuery"
      type="text"
      placeholder="Search entries..."
      class="w-full mb-3 px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors"
    />

    <!-- Filter Controls -->
    <div class="flex flex-col gap-2 mb-3">
      <label class="flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-textColor/5 rounded px-2 py-1 transition-colors">
        <span class="flex items-center gap-2">
          <input 
            v-model="showDrafts" 
            type="checkbox"
            class="accent-accent cursor-pointer"
          />
          <span class="text-textColor">Drafts only</span>
        </span>
        <sup v-if="stats.drafts > 0" class="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
          {{ stats.drafts }}
        </sup>
      </label>
      
      <label class="flex items-center justify-between gap-2 text-sm cursor-pointer hover:bg-textColor/5 rounded px-2 py-1 transition-colors">
        <span class="flex items-center gap-2">
          <input 
            v-model="showPinnedOnly" 
            type="checkbox"
            class="accent-accent cursor-pointer"
          />
          <span class="text-textColor">Pinned only</span>
        </span>
        <sup v-if="stats.pinned > 0" class="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
          {{ stats.pinned }}
        </sup>
      </label>
    </div>

    <!-- Tags Filter with TagSelector -->
    <div v-if="allTagsWithCount.length > 0" class="mb-3">
      <div class="text-xs text-textColor/70 mb-2">Filter by tags:</div>
      <TagSelector 
        :all-tags="allTagsWithCount"
        :selected-tags="selectedTags"
        @toggle-tag="toggleTag"
        @clear-tags="clearTags"
      />
    </div>

    <!-- Clear Filters -->
    <button
      v-if="hasActiveFilters"
      @click="clearFilters"
      class="w-full text-xs py-2 border border-textColor/20 rounded hover:border-accent transition-colors text-textColor/70 hover:text-textColor"
    >
      Clear Filters
    </button>
  </div>
</template>

<style scoped>
input[type="checkbox"] {
  cursor: pointer;
}
</style>
