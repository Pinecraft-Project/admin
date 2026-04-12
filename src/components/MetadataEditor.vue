<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
	metadata: {
		type: Object,
		default: () => ({})
	},
	allPosts: {
		type: Array,
		default: () => []
	}
});

const emit = defineEmits(['update:metadata', 'upload-cover']);

const isCollapsed = ref(true);
const isUpdating = ref(false);

const localMetadata = ref({
	title: '',
	description: '',
	publishDate: '',
	updatedDate: '',
	tags: '',
	draft: false,
	pin: false,
	coverImage: {
		src: '',
		alt: ''
	},
	...props.metadata
});

// Get all unique tags from posts
const existingTags = computed(() => {
	const tags = new Set();
	props.allPosts.forEach(post => {
		if (post.metadata?.tags) {
			post.metadata.tags.forEach(tag => tags.add(tag));
		}
	});
	return Array.from(tags).sort();
});

// State for tag suggestions
const showTagSuggestions = ref(false);
const tagInputFocused = ref(false);

// Convert tags array to string for editing
const tagsString = computed({
	get() {
		if (Array.isArray(localMetadata.value.tags)) {
			return localMetadata.value.tags.join(', ');
		}
		return localMetadata.value.tags || '';
	},
	set(value) {
		localMetadata.value.tags = value;
	}
});

// Add tag from suggestions
const addTag = (tag) => {
	const currentTags = tagsString.value ? tagsString.value.split(',').map(t => t.trim()).filter(Boolean) : [];
	if (!currentTags.includes(tag)) {
		currentTags.push(tag);
		tagsString.value = currentTags.join(', ');
	}
};

// Date picker state
const showPublishDatePicker = ref(false);
const showUpdatedDatePicker = ref(false);

// Format date to "DD MMM YYYY"
const formatDate = (date) => {
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const d = new Date(date);
	return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Set date from picker
const setPublishDate = (event) => {
	if (event.target.value) {
		localMetadata.value.publishDate = formatDate(event.target.value);
	}
	showPublishDatePicker.value = false;
};

const setUpdatedDate = (event) => {
	if (event.target.value) {
		localMetadata.value.updatedDate = formatDate(event.target.value);
	}
	showUpdatedDatePicker.value = false;
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
	const today = new Date();
	return today.toISOString().split('T')[0];
};

// Watch for changes and emit
watch(localMetadata, (newValue) => {
	if (isUpdating.value) return; // Prevent recursive updates

	const metadata = { ...newValue };
	// Convert tags string to array
	if (typeof metadata.tags === 'string' && metadata.tags) {
		metadata.tags = metadata.tags.split(',').map(t => t.trim()).filter(Boolean);
	} else if (!metadata.tags) {
		metadata.tags = [];
	}
	emit('update:metadata', metadata);
}, { deep: true });

// Watch for external changes
watch(() => props.metadata, (newValue) => {
	isUpdating.value = true;
	localMetadata.value = {
		title: '',
		description: '',
		publishDate: '',
		updatedDate: '',
		tags: '',
		draft: false,
		pin: false,
		coverImage: {
			src: '',
			alt: ''
		},
		...newValue
	};
	// Use nextTick to ensure DOM is updated before clearing flag
	setTimeout(() => {
		isUpdating.value = false;
	}, 0);
}, { deep: true });

const errors = ref({});

const validateField = (field) => {
	errors.value[field] = '';

	if (field === 'title' && !localMetadata.value.title) {
		errors.value.title = 'Title is required';
	}

	if (field === 'publishDate' && localMetadata.value.publishDate) {
		const dateRegex = /^\d{1,2}\s\w{3}\s\d{4}$/;
		if (!dateRegex.test(localMetadata.value.publishDate)) {
			errors.value.publishDate = 'Format: DD MMM YYYY (e.g., 12 Apr 2026)';
		}
	}
};

const handleTagBlur = () => {
	setTimeout(() => {
		tagInputFocused.value = false;
	}, 200);
};

const onCoverFileSelected = (event) => {
	const file = event?.target?.files?.[0];
	if (!file) return;
	emit('upload-cover', file);
	// allow selecting same file again
	event.target.value = '';
};
</script>

<template>
	<div class="metadata-editor border-b border-textColor/10 bg-bgColor">
		<div>
			<button @click="isCollapsed = !isCollapsed"
				class="w-full px-4 py-3 flex items-center justify-between hover:bg-textColor/5 transition-colors">
				<h3 class="text-sm font-semibold text-accent-2 flex items-center gap-2">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
							d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					Post Metadata
				</h3>
				<svg class="w-5 h-5 text-textColor/70 transition-transform" :class="{ 'rotate-180': !isCollapsed }" fill="none"
					stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<div v-show="!isCollapsed" class="px-4 pb-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					<!-- Title -->
					<div class="md:col-span-2">
						<label class="block text-xs text-textColor/70 mb-1">
							Title <span class="text-red-500">*</span>
						</label>
						<input v-model="localMetadata.title" @blur="validateField('title')" type="text" placeholder="Post title"
							class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border rounded transition-colors"
							:class="errors.title ? 'border-red-500' : 'border-textColor/20 focus:border-accent'" />
						<span v-if="errors.title" class="text-xs text-red-500 mt-1">{{ errors.title }}</span>
					</div>

					<!-- Description -->
					<div class="md:col-span-2">
						<label class="block text-xs text-textColor/70 mb-1">Description</label>
						<textarea v-model="localMetadata.description" rows="2" placeholder="Brief description of the post"
							class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-none"></textarea>
					</div>

					<!-- Publish Date -->
					<div class="relative">
						<label class="block text-xs text-textColor/70 mb-1">Publish Date</label>
						<div class="flex gap-2">
							<input v-model="localMetadata.publishDate" @blur="validateField('publishDate')" type="text"
								placeholder="12 Apr 2026"
								class="flex-1 px-3 py-2 text-sm bg-bgColor text-textColor border rounded transition-colors"
								:class="errors.publishDate ? 'border-red-500' : 'border-textColor/20 focus:border-accent'" />
							<button @click="showPublishDatePicker = !showPublishDatePicker" type="button"
								class="px-3 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors"
								title="Pick date">
								📅
							</button>
						</div>
						<input v-if="showPublishDatePicker" type="date" :value="getTodayDate()" @change="setPublishDate"
							class="absolute z-10 mt-1 px-3 py-2 text-sm bg-bgColor text-textColor border border-accent rounded" />
						<span v-if="errors.publishDate" class="text-xs text-red-500 mt-1">{{ errors.publishDate }}</span>
					</div>

					<!-- Updated Date -->
					<div class="relative">
						<label class="block text-xs text-textColor/70 mb-1">Updated Date</label>
						<div class="flex gap-2">
							<input v-model="localMetadata.updatedDate" type="text" placeholder="12 Apr 2026"
								class="flex-1 px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
							<button @click="showUpdatedDatePicker = !showUpdatedDatePicker" type="button"
								class="px-3 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors"
								title="Pick date">
								📅
							</button>
						</div>
						<input v-if="showUpdatedDatePicker" type="date" :value="getTodayDate()" @change="setUpdatedDate"
							class="absolute z-10 mt-1 px-3 py-2 text-sm bg-bgColor text-textColor border border-accent rounded" />
					</div>

					<!-- Tags -->
					<div class="md:col-span-2 relative">
						<label class="block text-xs text-textColor/70 mb-1">
							Tags <span class="text-textColor/50">(comma separated)</span>
						</label>
						<div class="flex gap-2">
							<input v-model="tagsString" @focus="tagInputFocused = true" @blur="handleTagBlur" type="text"
								placeholder="Vue.js, Markdown, Tutorial"
								class="flex-1 px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
							<button @click="showTagSuggestions = !showTagSuggestions" type="button"
								class="px-3 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors"
								title="Choose from existing tags">
								🏷️
							</button>
						</div>

						<!-- Tag suggestions dropdown -->
						<div v-if="showTagSuggestions && existingTags.length > 0"
							class="absolute z-10 mt-1 w-full bg-bgColor border border-textColor/20 rounded shadow-lg max-h-48 overflow-y-auto">
							<div class="p-2 text-xs text-textColor/70 border-b border-textColor/10">
								Click to add tag:
							</div>
							<button v-for="tag in existingTags" :key="tag" @click="addTag(tag); showTagSuggestions = false"
								type="button"
								class="w-full text-left px-3 py-2 text-sm text-textColor hover:bg-accent/10 transition-colors flex items-center justify-between">
								<span>#{{ tag }}</span>
								<span class="text-xs text-textColor/50">+</span>
							</button>
						</div>
					</div>

					<!-- Cover Image -->
					<div class="md:col-span-2">
						<label class="block text-xs text-textColor/70 mb-1">Cover Image</label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
							<input v-model="localMetadata.coverImage.src" type="text" placeholder="./cover.png"
								class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
							<input v-model="localMetadata.coverImage.alt" type="text" placeholder="Astro build wallpaper"
								class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
						</div>
						<div class="mt-2">
							<label class="inline-flex items-center gap-2 px-3 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors cursor-pointer">
								<span>Upload cover image</span>
								<input type="file" class="hidden" accept="image/*" @change="onCoverFileSelected" />
							</label>
						</div>
					</div>

					<!-- Checkboxes -->
					<div class="flex items-center gap-4">
						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input v-model="localMetadata.draft" type="checkbox" class="accent-accent cursor-pointer" />
							<span class="text-textColor">Draft</span>
						</label>

						<label class="flex items-center gap-2 text-sm cursor-pointer">
							<input v-model="localMetadata.pin" type="checkbox" class="accent-accent cursor-pointer" />
							<span class="text-textColor">Pin</span>
						</label>
					</div>
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

.rotate-180 {
	transform: rotate(180deg);
}
</style>
