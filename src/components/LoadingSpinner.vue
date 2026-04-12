<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md'
  },
  color: {
    type: String,
    default: 'blue'
  }
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }
  return sizes[props.size] || sizes.md
})

const colorClasses = computed(() => {
  const colors = {
    blue: 'border-blue-500',
    white: 'border-white',
    green: 'border-green-500',
    red: 'border-red-500'
  }
  return colors[props.color] || colors.blue
})
</script>

<template>
  <div :class="[sizeClasses, colorClasses, 'spinner']"></div>
</template>

<style scoped>
.spinner {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
