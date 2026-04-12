<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  allTags: {
    type: Array,
    default: () => []
  },
  selectedTags: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['toggle-tag', 'clear-tags']);

const showPopup = ref(false);
const buttonRef = ref(null);
const popupRef = ref(null);

const tagsWithCount = computed(() => {
  return props.allTags.map(tag => ({
    name: tag,
    count: 0 // Will be calculated in parent
  }));
});

const selectedCount = computed(() => props.selectedTags.length);

const togglePopup = () => {
  showPopup.value = !showPopup.value;
};

const handleClickOutside = (event) => {
  if (popupRef.value && !popupRef.value.contains(event.target) && 
      buttonRef.value && !buttonRef.value.contains(event.target)) {
    showPopup.value = false;
  }
};

const handleToggleTag = (tag) => {
  emit('toggle-tag', tag);
};

const handleClearTags = () => {
  emit('clear-tags');
  showPopup.value = false;
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div class="tag-selector relative">
    <button
      ref="buttonRef"
      @click="togglePopup"
      class="w-full px-3 py-2 text-sm text-left bg-bgColor text-textColor border border-textColor/20 rounded hover:border-accent transition-colors flex items-center justify-between"
    >
      <span v-if="selectedCount === 0" class="text-textColor/70">Select tags...</span>
      <span v-else class="text-textColor">
        {{ selectedCount }} tag{{ selectedCount > 1 ? 's' : '' }} selected
      </span>
      <svg 
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': showPopup }"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <transition name="popup">
      <div
        v-if="showPopup"
        ref="popupRef"
        class="absolute z-50 w-full mt-1 bg-bgColor border border-textColor/20 rounded shadow-lg max-h-64 overflow-y-auto"
      >
        <div v-if="allTags.length === 0" class="px-3 py-4 text-sm text-textColor/50 text-center">
          No tags available
        </div>
        
        <div v-else class="py-1">
          <button
            v-for="tag in allTags"
            :key="tag.name"
            @click="handleToggleTag(tag.name)"
            class="w-full px-3 py-2 text-sm text-left hover:bg-accent/10 transition-colors flex items-center justify-between group"
            :class="{ 'bg-accent/10': selectedTags.includes(tag.name) }"
          >
            <span class="flex items-center gap-2">
              <span 
                class="w-4 h-4 border-2 rounded flex items-center justify-center transition-colors"
                :class="selectedTags.includes(tag.name) 
                  ? 'border-accent bg-accent' 
                  : 'border-textColor/30 group-hover:border-accent'"
              >
                <svg 
                  v-if="selectedTags.includes(tag.name)"
                  class="w-3 h-3 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span class="text-textColor group-hover:text-accent transition-colors">
                #{{ tag.name }}
              </span>
            </span>
            <sup class="text-xs text-textColor/50 group-hover:text-accent/70 transition-colors">
              {{ tag.count }}
            </sup>
          </button>
        </div>

        <div v-if="selectedCount > 0" class="border-t border-textColor/10 p-2">
          <button
            @click="handleClearTags"
            class="w-full px-3 py-1.5 text-xs text-center text-textColor/70 hover:text-accent hover:bg-accent/5 rounded transition-colors"
          >
            Clear selection
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: all 0.2s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.rotate-180 {
  transform: rotate(180deg);
}

/* Custom scrollbar for popup */
.max-h-64::-webkit-scrollbar {
  width: 6px;
}

.max-h-64::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-64::-webkit-scrollbar-thumb {
  background: hsl(var(--theme-accent) / 0.3);
  border-radius: 3px;
}

.max-h-64::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--theme-accent) / 0.5);
}
</style>
