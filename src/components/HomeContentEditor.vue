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
const localData = ref({
  landingContent: {
    metaTitle: '',
    hero: {
      brandPrefix: '',
      brandAccent: '',
      subtitle: '',
      copyTitle: '',
      primaryCta: { href: '', label: '' },
      secondaryCta: { href: '', label: '' }
    },
    about: { title: '', subtitle: '' },
    status: { title: '', subtitle: '' },
    map: { title: '', subtitle: '', ctaLabel: '' },
    events: { title: '', subtitle: '' },
    news: { title: '', subtitle: '', emptyText: '' },
    gallery: { title: '', subtitle: '', ctaLabel: '' },
    join: { title: '', subtitle: '', compatibilityLabel: '', discordLabel: '' }
  },
  aboutFeatureCards: []
});

const getDefaultState = () => ({
  landingContent: {
    metaTitle: '',
    hero: {
      brandPrefix: '',
      brandAccent: '',
      subtitle: '',
      copyTitle: '',
      primaryCta: { href: '', label: '' },
      secondaryCta: { href: '', label: '' }
    },
    about: { title: '', subtitle: '' },
    status: { title: '', subtitle: '' },
    map: { title: '', subtitle: '', ctaLabel: '' },
    events: { title: '', subtitle: '' },
    news: { title: '', subtitle: '', emptyText: '' },
    gallery: { title: '', subtitle: '', ctaLabel: '' },
    join: { title: '', subtitle: '', compatibilityLabel: '', discordLabel: '' }
  },
  aboutFeatureCards: []
});

const syncFromContent = (content) => {
  isSyncing.value = true;
  try {
    const parsed = JSON.parse(String(content || '{}'));
    localData.value = {
      ...getDefaultState(),
      ...parsed,
      landingContent: {
        ...getDefaultState().landingContent,
        ...(parsed?.landingContent || {}),
        hero: {
          ...getDefaultState().landingContent.hero,
          ...(parsed?.landingContent?.hero || {}),
          primaryCta: {
            ...getDefaultState().landingContent.hero.primaryCta,
            ...(parsed?.landingContent?.hero?.primaryCta || {})
          },
          secondaryCta: {
            ...getDefaultState().landingContent.hero.secondaryCta,
            ...(parsed?.landingContent?.hero?.secondaryCta || {})
          }
        },
        about: {
          ...getDefaultState().landingContent.about,
          ...(parsed?.landingContent?.about || {})
        },
        status: {
          ...getDefaultState().landingContent.status,
          ...(parsed?.landingContent?.status || {})
        },
        map: {
          ...getDefaultState().landingContent.map,
          ...(parsed?.landingContent?.map || {})
        },
        events: {
          ...getDefaultState().landingContent.events,
          ...(parsed?.landingContent?.events || {})
        },
        news: {
          ...getDefaultState().landingContent.news,
          ...(parsed?.landingContent?.news || {})
        },
        gallery: {
          ...getDefaultState().landingContent.gallery,
          ...(parsed?.landingContent?.gallery || {})
        },
        join: {
          ...getDefaultState().landingContent.join,
          ...(parsed?.landingContent?.join || {})
        }
      },
      aboutFeatureCards: Array.isArray(parsed?.aboutFeatureCards) ? parsed.aboutFeatureCards : []
    };
  } catch {
    localData.value = getDefaultState();
  }

  setTimeout(() => {
    isSyncing.value = false;
  }, 0);
};

watch(() => props.content, (next) => {
  syncFromContent(next);
}, { immediate: true });

watch(localData, (next) => {
  if (isSyncing.value) return;
  emit('update:content', `${JSON.stringify(next, null, 2)}\n`);
}, { deep: true });
</script>

<template>
  <div class="border-b border-textColor/10 bg-bgColor">
    <div class="px-4 py-3 space-y-5">
      <h3 class="text-sm font-semibold text-accent-2">Home Text Content</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Meta Title</label>
          <input v-model="localData.landingContent.metaTitle" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Copy Button Hint</label>
          <input v-model="localData.landingContent.hero.copyTitle" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Brand Prefix</label>
          <input v-model="localData.landingContent.hero.brandPrefix" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Brand Accent</label>
          <input v-model="localData.landingContent.hero.brandAccent" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs text-textColor/70 mb-1">Hero Subtitle</label>
          <textarea v-model="localData.landingContent.hero.subtitle" rows="2" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Primary Button Label</label>
          <input v-model="localData.landingContent.hero.primaryCta.label" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Primary Button Link</label>
          <input v-model="localData.landingContent.hero.primaryCta.href" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Secondary Button Label</label>
          <input v-model="localData.landingContent.hero.secondaryCta.label" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div>
          <label class="block text-xs text-textColor/70 mb-1">Secondary Button Link</label>
          <input v-model="localData.landingContent.hero.secondaryCta.href" type="text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">About</h4>
          <input v-model="localData.landingContent.about.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.about.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
        </div>
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">Status</h4>
          <input v-model="localData.landingContent.status.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.status.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
        </div>
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">Map</h4>
          <input v-model="localData.landingContent.map.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.map.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
          <input v-model="localData.landingContent.map.ctaLabel" type="text" placeholder="Button label" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">Join Block</h4>
          <input v-model="localData.landingContent.join.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.join.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
          <input v-model="localData.landingContent.join.compatibilityLabel" type="text" placeholder="Compatibility label" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <input v-model="localData.landingContent.join.discordLabel" type="text" placeholder="Discord button label" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">Events</h4>
          <input v-model="localData.landingContent.events.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.events.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
        </div>
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">News</h4>
          <input v-model="localData.landingContent.news.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.news.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
          <input v-model="localData.landingContent.news.emptyText" type="text" placeholder="Empty state text" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
        <div class="space-y-2">
          <h4 class="text-xs uppercase tracking-wide text-textColor/60">Gallery</h4>
          <input v-model="localData.landingContent.gallery.title" type="text" placeholder="Section title" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="localData.landingContent.gallery.subtitle" rows="2" placeholder="Section subtitle" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
          <input v-model="localData.landingContent.gallery.ctaLabel" type="text" placeholder="Button label" class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
        </div>
      </div>

      <div class="space-y-3">
        <h4 class="text-xs uppercase tracking-wide text-textColor/60">About Cards</h4>
        <div v-for="(card, index) in localData.aboutFeatureCards" :key="index" class="rounded border border-textColor/10 p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          <input v-model="card.icon" type="text" placeholder="Icon" class="px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <input v-model="card.title" type="text" placeholder="Card title" class="px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors" />
          <textarea v-model="card.description" rows="2" placeholder="Card description" class="md:col-span-3 px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"></textarea>
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
