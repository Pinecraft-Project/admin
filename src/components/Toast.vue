<script setup>
import { ref, computed, watch } from 'vue'

const notifications = ref([])
let notificationId = 0

const addNotification = (message, type = 'info', duration = 3000) => {
  const id = notificationId++
  notifications.value.push({ id, message, type, duration })
  
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id)
    }, duration)
  }
  
  return id
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

defineExpose({
  success: (msg, duration) => addNotification(msg, 'success', duration),
  error: (msg, duration) => addNotification(msg, 'error', duration),
  warning: (msg, duration) => addNotification(msg, 'warning', duration),
  info: (msg, duration) => addNotification(msg, 'info', duration)
})

const getIconForType = (type) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[type] || icons.info
}

const getColorClasses = (type) => {
  const colors = {
    success: 'bg-green-500 border-green-600',
    error: 'bg-red-500 border-red-600',
    warning: 'bg-yellow-500 border-yellow-600',
    info: 'bg-blue-500 border-blue-600'
  }
  return colors[type] || colors.info
}
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
    <transition-group name="toast">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 text-white',
          getColorClasses(notification.type),
          'animate-slide-in'
        ]"
        @click="removeNotification(notification.id)"
        class="cursor-pointer hover:opacity-90 transition-opacity"
      >
        <span class="text-xl font-bold">{{ getIconForType(notification.type) }}</span>
        <span class="flex-1">{{ notification.message }}</span>
        <button 
          @click.stop="removeNotification(notification.id)"
          class="text-white hover:text-gray-200 text-lg font-bold ml-2"
        >
          ×
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease;
}
</style>
