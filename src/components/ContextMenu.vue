<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  editor: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['format']);

const showMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });

const menuItems = [
  { label: 'Bold', action: 'bold', shortcut: 'Ctrl+B', icon: '𝐁' },
  { label: 'Italic', action: 'italic', shortcut: 'Ctrl+I', icon: '𝐼' },
  { label: 'Code', action: 'code', shortcut: 'Ctrl+`', icon: '</>' },
  { divider: true },
  { label: 'Heading 1', action: 'h1', icon: 'H₁' },
  { label: 'Heading 2', action: 'h2', icon: 'H₂' },
  { label: 'Heading 3', action: 'h3', icon: 'H₃' },
  { divider: true },
  { label: 'Link', action: 'link', shortcut: 'Ctrl+K', icon: '🔗' },
  { label: 'Image', action: 'image', icon: '🖼️' },
  { label: 'Code Block', action: 'codeblock', icon: '{ }' },
  { divider: true },
  { label: 'Unordered List', action: 'ul', icon: '•' },
  { label: 'Ordered List', action: 'ol', icon: '1.' },
  { label: 'Quote', action: 'quote', icon: '❝' },
  { label: 'Horizontal Rule', action: 'hr', icon: '―' },
];

const handleContextMenu = (event) => {
  event.preventDefault();
  menuPosition.value = { x: event.clientX, y: event.clientY };
  showMenu.value = true;
};

const handleClick = (event) => {
  // Close menu if clicking outside
  const menu = document.querySelector('.context-menu');
  if (menu && !menu.contains(event.target)) {
    showMenu.value = false;
  }
};

const executeAction = (action) => {
  emit('format', action);
  showMenu.value = false;
};

// Watch for editor changes and attach/detach listeners
watch(() => props.editor, (newEditor, oldEditor) => {
  if (oldEditor) {
    oldEditor.removeEventListener('contextmenu', handleContextMenu);
  }
  if (newEditor) {
    newEditor.addEventListener('contextmenu', handleContextMenu);
  }
}, { immediate: true });

// Handle clicks
watch(showMenu, (isShown) => {
  if (isShown) {
    setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 0);
  } else {
    document.removeEventListener('click', handleClick);
  }
});
</script>

<template>
  <teleport to="body">
    <div
      v-if="showMenu"
      :style="{ 
        position: 'fixed', 
        left: menuPosition.x + 'px', 
        top: menuPosition.y + 'px',
        zIndex: 9999
      }"
      class="context-menu bg-bgColor border border-textColor/20 rounded shadow-lg py-1 min-w-[200px]"
    >
      <template v-for="(item, index) in menuItems" :key="index">
        <div v-if="item.divider" class="h-px bg-textColor/10 my-1"></div>
        <button
          v-else
          @click="executeAction(item.action)"
          class="w-full px-3 py-2 text-left text-sm text-textColor hover:bg-accent/10 flex items-center justify-between transition-colors"
        >
          <span class="flex items-center gap-2">
            <span class="w-6 text-center font-semibold text-accent">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
          </span>
          <span v-if="item.shortcut" class="text-xs text-textColor/50">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </teleport>
</template>

<style scoped>
.context-menu {
  backdrop-filter: blur(10px);
}
</style>
