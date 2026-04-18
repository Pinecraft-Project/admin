<script>
import Toast from '@/components/Toast.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import PostMeta from '@/components/PostMeta.vue';
import PostFilters from '@/components/PostFilters.vue';
import ContextMenu from '@/components/ContextMenu.vue';
import MetadataEditor from '@/components/MetadataEditor.vue';
import SiteSettingsEditor from '@/components/SiteSettingsEditor.vue';
import HomeContentEditor from '@/components/HomeContentEditor.vue';
import GalleryMetadataEditor from '@/components/GalleryMetadataEditor.vue';
import matter from 'gray-matter';

export default {
  components: {
    Toast,
    LoadingSpinner,
    ThemeToggle,
    PostMeta,
    PostFilters,
    ContextMenu,
    MetadataEditor,
    SiteSettingsEditor,
    HomeContentEditor,
    GalleryMetadataEditor
  },
  data() {
    return {
      branch: window.localStorage.getItem("Branch") || false,
      username: window.localStorage.getItem("Github username") || false,
      path: window.localStorage.getItem("Path") || false,
      repo: window.localStorage.getItem("Repo name") || false,
      token: window.localStorage.getItem("Token") || false,
      contentType: window.localStorage.getItem("Content Type") || 'post',
      collectionPresets: {
        home: {
          label: 'Home',
          singleLabel: 'Home item',
          path: 'src/site.config.json',
          kind: 'config'
        },
        post: {
          label: 'Posts',
          singleLabel: 'Post',
          path: 'src/content/post',
          kind: 'content'
        },
        event: {
          label: 'Events',
          singleLabel: 'Event',
          path: 'src/content/event',
          kind: 'content'
        },
        wiki: {
          label: 'Wiki',
          singleLabel: 'Wiki page',
          path: 'src/content/wiki',
          kind: 'content'
        },
        images: {
          label: 'Images',
          singleLabel: 'Image',
          path: 'src/assets/images',
          kind: 'media'
        },
        gallery: {
          label: 'Gallery',
          singleLabel: 'Gallery image',
          path: 'src/assets/gallery',
          kind: 'media'
        }
      },
      regImg: /!\[.*?\]\(((?!https?:\/\/|\/)[^)]+)\)/gm,
      posts: [],
      filtered: [],
      url: "",
      selected: "",
      preview: false,
      isLoading: false,
      isSaving: false,
      postMetadata: {},
      editableMetadata: {},
      editorContent: '',
      showMetadataInEditor: false,
      contentWithoutMetadata: '',
      previewHtml: '',
      leftPanelWidth: 50,
      isResizing: false,
      showCreatePostModal: false,
      newPostSlug: '',
      aiPrompt: '',
      aiIsLoading: false,
      isAIPanelCollapsed: true,
      assetPreviewVersion: 0,
      galleryMetadataMap: {},
      showGalleryUploadModal: false,
      galleryUploadFile: null,
      galleryUploadTitle: '',
      galleryUploadDate: 'Без дати',
      galleryUploadPin: false,
      galleryUploadDraft: false,
      galleryUploadPreview: ''
    };
  },
  mounted: async function() {
    this.syncCollectionPath();
    this.loadList()
    
    const externalScript = document.createElement('script')
    externalScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/marked/marked.min.js')
    document.head.appendChild(externalScript)
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown);
    // Add resize listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
    
    // Load saved preview width
    const savedWidth = localStorage.getItem('previewPanelWidth');
    if (savedWidth) {
      this.leftPanelWidth = parseInt(savedWidth);
    }
  },
  updated() {
    // Add paste handler for images when editor is ready
    if (this.$refs.editor && !this.$refs.editor._pasteHandlerAttached) {
      this.$refs.editor.addEventListener('paste', this.handlePaste);
      this.$refs.editor._pasteHandlerAttached = true;
    }
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    if (this.$refs.editor) {
      this.$refs.editor.removeEventListener('paste', this.handlePaste);
    }
  },
  methods: {
    normalizeRepoPath(path) {
      return String(path || '')
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
    },
    joinRepoPath(...parts) {
      return parts
        .map((part) => this.normalizeRepoPath(part))
        .filter(Boolean)
        .join('/');
    },
    getCurrentPreset() {
      return this.collectionPresets[this.contentType] || this.collectionPresets.post;
    },
    isMediaMode() {
      return this.getCurrentPreset()?.kind === 'media';
    },
    isConfigMode() {
      return this.getCurrentPreset()?.kind === 'config';
    },
    isImageFile(name = '') {
      return /\.(png|jpe?g|webp|gif|svg)$/i.test(String(name || ''));
    },
    isGalleryMode() {
      return this.contentType === 'gallery';
    },
    isHomeSettingsSelection() {
      return this.isConfigMode() && this.selected?.path === 'src/site.config.json';
    },
    isHomeTextSelection() {
      return this.isConfigMode() && this.selected?.path === 'src/data/landing.content.json';
    },
    canOpenCreateModal() {
      return !this.isMediaMode() && !this.isConfigMode();
    },
    canSaveSelected() {
      if (!this.selected) return false;
      if (this.isGalleryMode()) return true;
      if (this.isMediaMode()) return false;
      if (this.isConfigMode() && this.isImageFile(this.selected.name)) return false;
      return true;
    },
    canDeleteSelected() {
      return !!(this.selected && this.selected.path && !this.isConfigMode());
    },
    canUploadCurrentSelection() {
      if (this.isGalleryMode()) {
        return !!(this.selected && this.isImageFile(this.selected.name));
      }
      if (this.contentType === 'images') {
        return !!(this.selected && this.isImageFile(this.selected.name));
      }
      if (this.isMediaMode()) return true;
      if (this.isConfigMode()) {
        return !!(this.selected && this.isImageFile(this.selected.name));
      }
      return !!this.selected;
    },
    canReplaceCurrentSelection() {
      if (this.contentType === 'images' || this.isGalleryMode()) {
        return true;
      }
      if (this.isMediaMode()) {
        return !!(this.selected && this.isImageFile(this.selected.name));
      }
      if (this.isConfigMode()) {
        return !!(this.selected && this.isImageFile(this.selected.name));
      }
      return this.canOpenCreateModal();
    },
    getPrimaryActionLabel() {
      if (this.isGalleryMode()) {
        return 'Add to Gallery';
      }
      if (this.contentType === 'images') {
        return 'Upload Image';
      }
      if (this.isMediaMode()) {
        return this.selected ? 'Reupload Selected Image' : 'Select Image to Replace';
      }
      if (this.isConfigMode()) {
        return this.selected && this.isImageFile(this.selected.name) ? 'Replace Image' : 'Select Map Preview';
      }
      return `New ${this.getCurrentPreset().singleLabel}`;
    },
    getUploadButtonLabel() {
      if (this.isGalleryMode()) return 'Change';
      if (this.contentType === 'images') return 'Change';
      if (this.isMediaMode()) return 'Change';
      if (this.isConfigMode()) return 'Replace Image';
      return 'Add Image';
    },
    normalizeGalleryMetadataEntry(entry = {}, fileName = '') {
      const fallbackTitle = String(fileName || '')
        .replace(/\.[^.]+$/, '')
        .replace(/[+_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      return {
        title: String(entry?.title || fallbackTitle || ''),
        date: String(entry?.date || 'Без дати'),
        pin: entry?.pin === true,
        draft: entry?.draft === true
      };
    },
    getHomeEntries() {
      return [
        {
          name: 'site.config.json',
          path: 'src/site.config.json',
          type: 'file',
          metadata: { title: 'Site Settings', description: 'Main site title, description and public links' }
        },
        {
          name: 'landing.content.json',
          path: 'src/data/landing.content.json',
          type: 'file',
          metadata: { title: 'Home Text Content', description: 'Hero, map and join section texts' }
        },
        {
          name: 'map-preview.png',
          path: 'src/assets/images/map-preview.png',
          type: 'file',
          metadata: { title: 'Map Preview Image', description: 'Preview image used on the home page map card' }
        }
      ];
    },
    getAssetFolderPath() {
      return this.isMediaMode() ? this.getCurrentPreset().path : 'src/assets/images';
    },
    getRawGitHubUrl(repoPath = '') {
      const normalized = this.normalizeRepoPath(repoPath);
      return `https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch}/${normalized}`;
    },
    async fetchRepoText(filePath) {
      const response = await fetch(this.getRawGitHubUrl(filePath));
      if (!response.ok) {
        throw new Error('Failed to load repository file');
      }
      return await response.text();
    },
    async saveRepoTextFile(filePath, contentToSave, customMessage = '') {
      const normalizedPath = this.normalizeRepoPath(filePath);
      const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${normalizedPath}`;

      const shaResponse = await fetch(url, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      let sha = null;
      if (shaResponse.ok) {
        const shaData = await shaResponse.json();
        sha = shaData.sha;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          message: customMessage || `Adding/Updating file ${normalizedPath}`,
          content: this.toBase64Utf8(contentToSave),
          sha,
          branch: this.branch,
          owner: this.username,
          repo: this.repo,
          path: normalizedPath,
          committer: {
            name: this.username,
            email: this.username + '@github.com'
          }
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Save failed');
      }

      return await response.json().catch(() => ({}));
    },
    getRelativeAssetPath(filename) {
      return `../../assets/images/${filename}`;
    },
    getGalleryMetadataPath() {
      return 'src/data/gallery.metadata.json';
    },
    buildGalleryMetadataContent(fileName, metadata) {
      const nextMap = {
        ...this.galleryMetadataMap,
        [fileName]: this.normalizeGalleryMetadataEntry(metadata, fileName)
      };
      this.galleryMetadataMap = Object.fromEntries(
        Object.entries(nextMap).sort(([a], [b]) => a.localeCompare(b, 'uk'))
      );
      return `${JSON.stringify(this.galleryMetadataMap, null, 2)}\n`;
    },
    openGalleryUploadModal() {
      this.galleryUploadFile = null;
      this.galleryUploadPreview = '';
      this.galleryUploadTitle = '';
      this.galleryUploadDate = 'Без дати';
      this.galleryUploadPin = false;
      this.galleryUploadDraft = false;
      this.showGalleryUploadModal = true;
    },
    closeGalleryUploadModal() {
      this.showGalleryUploadModal = false;
      this.galleryUploadFile = null;
      this.galleryUploadPreview = '';
      this.galleryUploadTitle = '';
      this.galleryUploadDate = 'Без дати';
      this.galleryUploadPin = false;
      this.galleryUploadDraft = false;
    },
    onGalleryUploadFileChange(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      this.galleryUploadFile = file;
      this.galleryUploadTitle = this.normalizeGalleryMetadataEntry({}, file.name).title;

      const reader = new FileReader();
      reader.onload = () => {
        this.galleryUploadPreview = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    },
    async confirmGalleryUpload() {
      if (!this.galleryUploadFile) {
        this.$refs.toast.warning('Choose an image first');
        return;
      }

      this.isSaving = true;
      try {
        const { filename } = await this.uploadAssetFile(this.galleryUploadFile, {
          directory: 'src/assets/gallery'
        });

        const metadataContent = this.buildGalleryMetadataContent(filename, {
          title: this.galleryUploadTitle,
          date: this.galleryUploadDate,
          pin: this.galleryUploadPin,
          draft: this.galleryUploadDraft
        });
        await this.saveRepoTextFile(this.getGalleryMetadataPath(), metadataContent, `Update gallery metadata for ${filename}`);
        this.assetPreviewVersion += 1;
        this.closeGalleryUploadModal();
        await this.loadList();
        await this.edit(filename);
        this.$refs.toast.success('Gallery image uploaded');
      } catch (error) {
        console.log('Gallery upload failed', error);
        this.$refs.toast.error(`Gallery upload failed: ${error.message || 'Upload failed'}`);
      } finally {
        this.isSaving = false;
      }
    },
    async uploadAssetFile(file, options = {}) {
      const extension = file.name.includes('.') ? file.name.split('.').pop() : (file.type.split('/')[1] || 'png');
      const providedName = String(options.filename || file.name || '').trim();
      const fallbackName = `image-${Date.now()}.${extension}`;
      const finalName = (providedName || fallbackName).replace(/\s+/g, '-');
      const directory = this.normalizeRepoPath(options.directory || this.getAssetFolderPath());
      const path = this.joinRepoPath(directory, finalName);
      const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${path}`;

      let sha = null;
      const shaResponse = await fetch(url, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (shaResponse.ok) {
        const shaData = await shaResponse.json();
        sha = shaData.sha;
      }

      const content = await this.toBase64(file);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          message: `Upload asset ${path}`,
          content: content.split(',')[1],
          sha,
          branch: this.branch,
          owner: this.username,
          repo: this.repo,
          path,
          committer: {
            name: this.username,
            email: this.username + '@github.com'
          },
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Upload failed');
      }

      return { path, filename: finalName };
    },
    syncCollectionPath(force = false) {
      const preset = this.getCurrentPreset();
      const presetPaths = Object.values(this.collectionPresets).map((item) => item.path).filter(Boolean);

      if (preset.path && (force || !this.path || presetPaths.includes(this.path))) {
        this.path = preset.path;
        window.localStorage.setItem('Path', preset.path);
      }

      window.localStorage.setItem('Content Type', this.contentType);
    },
    setContentType(type) {
      if (!this.collectionPresets[type]) return;
      this.contentType = type;
      this.syncCollectionPath(true);
      this.clearSelected();
      this.loadList();
    },
    getDefaultMetadata(slug) {
      const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const today = this.formatMetaDate();

      if (this.contentType === 'event') {
        return {
          title,
          description: 'Опис події для анонсу. Додайте деталі, час проведення та основні винагороди для учасників.',
          date: '20 Apr 2026 · 18:00 — 20:00',
          bannerUrl: '',
          imageUrl: '',
          reward: '',
          badge: 'Upcoming Event',
          status: 'upcoming'
        };
      }

      if (this.contentType === 'wiki') {
        return {
          title,
          description: 'Короткий опис сторінки вікі для навігації та швидкого розуміння її вмісту.',
          icon: '📄',
          badge: 'Guide',
          badgeColor: '#4ade80',
          order: this.posts.length + 1
        };
      }

      return {
        title,
        description: 'Чернетка опису для майбутнього допису. Додайте короткий анонс у межах опису сторінки.',
        publishDate: today,
        updatedDate: today,
        tags: ['draft'],
        draft: true,
        pin: false,
        ogImage: ''
      };
    },
    getDefaultContent() {
      if (this.contentType === 'event') {
        return '# Нова подія\n\nОпишіть сюжет, час проведення та умови участі.\n';
      }

      if (this.contentType === 'wiki') {
        return '# Нова сторінка вікі\n\nДодайте корисну інформацію для гравців.\n';
      }

      return '# Новий допис\n\nПочніть писати тут...\n';
    },
    generateUrl() {
      if (
        !this.branch ||
        !this.username ||
        !this.path ||
        !this.repo ||
        !this.token
      ) return false;

      const repoPath = this.normalizeRepoPath(this.path);
      return `https://api.github.com/repos/${this.username}/${this.repo}/contents/${repoPath}?ref=${this.branch}`
    },
    updateFiltered(filteredPosts) {
      this.filtered = filteredPosts;
    },
    formatMetaDate(date = new Date()) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    },
    slugifyPostName(name) {
      return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\./g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    },
    openCreatePostModal() {
      this.newPostSlug = '';
      this.showCreatePostModal = true;
      this.$nextTick(() => {
        if (this.$refs.newPostSlugInput) {
          this.$refs.newPostSlugInput.focus();
        }
      });
    },
    closeCreatePostModal() {
      this.showCreatePostModal = false;
    },
    getNewPostSlugError() {
      const raw = String(this.newPostSlug || '').trim().toLowerCase();
      if (!raw) return 'Slug is required';

      const slug = this.slugifyPostName(raw);
      if (slug !== raw) {
        return 'Use only lowercase letters, numbers and hyphens (a-z, 0-9, -)';
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return 'Invalid slug format';
      }

      const exists = this.posts.some((post) => {
        const postName = String(post.name || '').toLowerCase();
        const postPath = String(post.path || '').toLowerCase();
        return postName === slug || postName === `${slug}.md` || postPath.endsWith(`/${slug}.md`) || postPath.includes(`/${slug}/`);
      });

      if (exists) return 'Entry with this slug already exists';
      return '';
    },
    createNewPost() {
      const slug = this.slugifyPostName(this.newPostSlug);
      const slugError = this.getNewPostSlugError();
      if (slugError) {
        this.$refs.toast.error(slugError);
        return;
      }

      if (!slug) {
        this.$refs.toast.error('Invalid post name');
        return;
      }

      this.editableMetadata = this.getDefaultMetadata(slug);
      this.contentWithoutMetadata = this.getDefaultContent();
      this.editorContent = this.contentWithoutMetadata;
      this.showMetadataInEditor = false;
      this.preview = false;

      const filePath = this.joinRepoPath(this.path, `${slug}.md`);
      this.selected = {
        name: `${slug}.md`,
        path: filePath,
        type: 'file',
        sha: null,
      };

      this.$nextTick(() => {
        if (this.$refs['file-title']) {
          this.$refs['file-title'].value = filePath;
          this.titleSize();
        }
        this.renderFile();
        this.putFile();
      });

      this.closeCreatePostModal();
      this.$refs.toast.success(`New ${this.getCurrentPreset().singleLabel.toLowerCase()} draft created: ${slug}`);
    },
    previewSwich() {
      this.preview = !this.preview
    },
    async edit(file) {
      const post = this.posts.find(post => post.name == file);
      if (!post) return;

      if (this.isMediaMode()) {
        this.selected = post;
        this.preview = false;
        this.previewHtml = '';
        this.postMetadata = {};
        this.editableMetadata = this.isGalleryMode()
          ? this.normalizeGalleryMetadataEntry(post.metadata || {}, post.name)
          : {};
        this.contentWithoutMetadata = '';
        this.editorContent = '';
        return;
      }

      if (this.isConfigMode()) {
        this.isLoading = true;
        try {
          this.selected = post;
          this.preview = false;
          this.previewHtml = '';
          this.postMetadata = {};
          this.editableMetadata = {};
          this.showMetadataInEditor = false;

          if (this.isImageFile(post.name)) {
            this.contentWithoutMetadata = '';
            this.editorContent = '';
            this.$refs.toast.success('Home image selected');
            return;
          }

          const content = await this.fetchRepoText(post.path);
          if (content) {
            this.contentWithoutMetadata = content;
            this.editorContent = content;
            this.titleSize();
            this.$refs.toast.success('Config file loaded successfully');
          } else {
            this.$refs.toast.error('Failed to load config file');
          }
        } catch (error) {
          console.log('Failed to load config file', error);
          this.$refs.toast.error('Network error while loading config file');
        } finally {
          this.isLoading = false;
        }
        return;
      }

      const file_url = post.type == 'file'
        ? post.download_url
        : `https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch}/${this.joinRepoPath(this.path, file, 'index.md')}`

      this.isLoading = true;
      try {
        const response = await fetch(file_url);
        if (response.ok) {
          const content = await response.text();
          
          // Parse content
          const parsed = matter(content);
          this.contentWithoutMetadata = parsed.content;
          this.editableMetadata = { ...parsed.data };
          
          // Set editor content (without metadata by default)
          this.showMetadataInEditor = false;
          this.editorContent = parsed.content;
          
          this.selected = post
          this.renderFile()
          
          this.titleSize()
          this.$refs.toast.success('File loaded successfully');
        } else {
          this.$refs.toast.error('Failed to load file');
        }
      } catch (error) {
        console.log('File does not exist, creating new one', error);
        this.$refs.toast.warning('File not found, creating new one');
      } finally {
        this.isLoading = false;
      }
    },
    async loadList() {
      if (this.isConfigMode()) {
        if (!(this.token && this.username && this.repo && this.branch)) {
          this.url = false;
          return;
        }
        this.isLoading = false;
        this.url = 'home://config';
        const homeEntries = this.getHomeEntries();
        this.posts = homeEntries;
        this.filtered = homeEntries;
        return;
      }

      if (!(this.url = this.generateUrl())) return;
      this.isLoading = true;
      try {
        const response = await fetch(this.url, {
          headers: {
            'Authorization': `token ${this.token}`
          }
        });
        if (response.ok) {
          const files = await response.json();

          if (this.isMediaMode()) {
            let metadataMap = {};
            if (this.isGalleryMode()) {
              try {
                metadataMap = JSON.parse(await this.fetchRepoText(this.getGalleryMetadataPath()));
              } catch (_error) {
                metadataMap = {};
              }
            }

            this.galleryMetadataMap = metadataMap;

            const mediaFiles = files
              .filter((file) => file.type === 'file' && this.isImageFile(file.name))
              .filter((file) => !(this.contentType === 'images' && file.name === 'map-preview.png'))
              .map((file) => ({
                ...file,
                metadata: this.isGalleryMode()
                  ? this.normalizeGalleryMetadataEntry(metadataMap[file.name] || {}, file.name)
                  : { title: file.name }
              }))
              .sort((a, b) => {
                if (this.isGalleryMode()) {
                  if (a.metadata?.pin && !b.metadata?.pin) return -1;
                  if (!a.metadata?.pin && b.metadata?.pin) return 1;
                }
                const titleA = a.metadata?.title || a.name;
                const titleB = b.metadata?.title || b.name;
                return titleA.localeCompare(titleB, 'uk');
              });

            this.posts = mediaFiles;
            this.filtered = mediaFiles;
            this.$refs.toast.success(`Loaded ${mediaFiles.length} ${this.getCurrentPreset().label.toLowerCase()}`);
            return;
          }

          const contentFiles = files.filter((file) => {
            if (file.type === 'dir') return true;
            return file.type === 'file' && file.name.endsWith('.md');
          });
          
          const postsWithMetadata = await Promise.all(
            contentFiles.map(async (file) => {
              const file_url = file.type == 'file' 
                ? file.download_url 
                : `https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch}/${this.joinRepoPath(this.path, file.name, 'index.md')}`;
              
              try {
                const contentResponse = await fetch(file_url);
                if (contentResponse.ok) {
                  const content = await contentResponse.text();
                  const parsed = matter(content);
                  return {
                    ...file,
                    metadata: parsed.data,
                    isPinned: parsed.data.pin === true
                  };
                }
              } catch (error) {
                console.log('Error loading metadata for', file.name, error);
              }
              
              return {
                ...file,
                metadata: {},
                isPinned: false
              };
            })
          );
          
          // Sort: pinned first, then by date
          this.posts = postsWithMetadata.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            
            const dateA = a.metadata.publishDate ? new Date(a.metadata.publishDate) : new Date(0);
            const dateB = b.metadata.publishDate ? new Date(b.metadata.publishDate) : new Date(0);
            return dateB - dateA;
          });
          
          this.filtered = this.posts;
          this.$refs.toast.success(`Loaded ${this.posts.length} ${this.getCurrentPreset().label.toLowerCase()}`);
        } else {
          this.$refs.toast.error('Failed to load files from GitHub');
        }
      } catch (error) {
        console.log('Failed to load list', error);
        this.$refs.toast.error('Network error: Could not connect to GitHub');
      } finally {
        this.isLoading = false;
      }
    },
    titleSize() {
      if (this.$refs['file-title']) {
        this.$refs['file-title'].size = this.$refs['file-title'].value.length
      }
    },
    getTextWidth(text, font) {
    // Create a canvas element
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Set the font. The format is similar to CSS font property, e.g., "16px Arial"
    context.font = font;

    // Measure the text width
    const metrics = context.measureText(text);
    return metrics.width;
    },
    renderFile() {
      // Get current content from editor
      const currentContent = this.editorContent ?? this.$refs.editor?.value ?? '';
      
      // Update contentWithoutMetadata if showing metadata
      if (this.showMetadataInEditor) {
        const parsed = matter(currentContent);
        this.contentWithoutMetadata = parsed.content;
        this.postMetadata = parsed.data || {};
      } else {
        this.contentWithoutMetadata = currentContent;
        // Frontmatter is hidden in editor, keep metadata from form state
        this.postMetadata = this.editableMetadata || {};
      }
      
      // Render markdown content without frontmatter
      this.previewHtml = window.marked.parse(
        this.imagePathModify(
          this.regImg,
          this.contentWithoutMetadata,
          `https://raw.githubusercontent.com/${this.username}/${this.repo}/${this.branch}/${this?.selected?.path}`
        )
      )

      this.$nextTick(() => {
        this.syncPreviewScrollWithEditor();
      });
    },
    clearSelected () {
      this.editorContent = "";
      this.selected = ""
      this.previewHtml = ""
      this.postMetadata = {}
      this.editableMetadata = {}
      this.contentWithoutMetadata = ''
      this.showMetadataInEditor = false
      this.titleSize()
    },
    generateYAMLFrontmatter(metadata, content) {
      const quote = (value) => JSON.stringify(String(value));
      let yaml = '---\n';

      if (metadata.title) yaml += `title: ${quote(metadata.title)}\n`;
      if (metadata.description) yaml += `description: ${quote(metadata.description)}\n`;

      if (this.contentType === 'post') {
        if (metadata.publishDate) yaml += `publishDate: ${quote(metadata.publishDate)}\n`;
        if (metadata.updatedDate) yaml += `updatedDate: ${quote(metadata.updatedDate)}\n`;
        if (metadata.tags && metadata.tags.length) yaml += `tags: ${JSON.stringify(metadata.tags)}\n`;
        yaml += `draft: ${metadata.draft === true}\n`;
        yaml += `pin: ${metadata.pin === true}\n`;
        if (metadata.ogImage) yaml += `ogImage: ${quote(metadata.ogImage)}\n`;
        if (metadata.coverImage && (metadata.coverImage.src || metadata.coverImage.alt)) {
          yaml += 'coverImage:\n';
          if (metadata.coverImage.src) yaml += `  src: ${quote(metadata.coverImage.src)}\n`;
          if (metadata.coverImage.alt) yaml += `  alt: ${quote(metadata.coverImage.alt)}\n`;
        }
      }

      if (this.contentType === 'event') {
        if (metadata.date) yaml += `date: ${quote(metadata.date)}\n`;
        if (metadata.imageUrl) yaml += `imageUrl: ${quote(metadata.imageUrl)}\n`;
        if (metadata.bannerUrl) yaml += `bannerUrl: ${quote(metadata.bannerUrl)}\n`;
        if (metadata.reward) yaml += `reward: ${quote(metadata.reward)}\n`;
        if (metadata.badge) yaml += `badge: ${quote(metadata.badge)}\n`;
        if (metadata.status) yaml += `status: ${String(metadata.status)}\n`;
      }

      if (this.contentType === 'wiki') {
        if (metadata.icon) yaml += `icon: ${quote(metadata.icon)}\n`;
        if (metadata.badge) yaml += `badge: ${quote(metadata.badge)}\n`;
        if (metadata.badgeColor) yaml += `badgeColor: ${quote(metadata.badgeColor)}\n`;
        if (Number.isFinite(Number(metadata.order))) yaml += `order: ${Number(metadata.order)}\n`;
      }
      
      yaml += '---\n';
      return yaml + content;
    },
    updateMetadata(metadata) {
      this.editableMetadata = metadata;
      this.postMetadata = metadata;

      if (this.isMediaMode() || this.isConfigMode()) {
        return;
      }
      
      const fullContent = this.generateYAMLFrontmatter(metadata, this.contentWithoutMetadata);
      
      if (this.showMetadataInEditor) {
        this.editorContent = fullContent;
      }
    },
    toggleMetadataInEditor() {
      this.showMetadataInEditor = !this.showMetadataInEditor;
      
      if (this.showMetadataInEditor) {
        // Show full content with metadata
        const fullContent = this.generateYAMLFrontmatter(this.editableMetadata, this.contentWithoutMetadata);
        this.editorContent = fullContent;
      } else {
        // Show only content
        this.editorContent = this.contentWithoutMetadata;
      }
    },
    async uploadCoverImage(file) {
      if (!file || !this.$refs['file-title']?.value) return;

      this.isSaving = true;
      try {
        const extension = file.name.includes('.') ? file.name.split('.').pop() : 'png';
        const { filename } = await this.uploadAssetFile(file, {
          directory: 'src/assets/images',
          filename: `cover-${Date.now()}.${extension}`
        });

        const nextMetadata = {
          ...this.editableMetadata,
          coverImage: {
            src: this.getRelativeAssetPath(filename),
            alt: this.editableMetadata?.coverImage?.alt || 'Cover image'
          }
        };
        this.updateMetadata(nextMetadata);
        this.$refs.toast.success('Cover image uploaded');
      } catch (error) {
        console.log('Error uploading cover image', error);
        this.$refs.toast.error(`Failed to upload cover image: ${error.message || 'Upload failed'}`);
      } finally {
        this.isSaving = false;
      }
    },
    getOllamaSettings() {
      const baseUrl = String(window.localStorage.getItem('Ollama URL') || '')
        .trim()
        .replace(/\/+$/, '');
      const model = String(window.localStorage.getItem('Ollama model') || '').trim();
      const masterPrompt = String(window.localStorage.getItem('Ollama master prompt') || '').trim();
      return { baseUrl, model, masterPrompt };
    },
    isAIConfigured() {
      const { baseUrl, model } = this.getOllamaSettings();
      return !!baseUrl && !!model;
    },
    buildOllamaPrompt(mode, instruction, markdown, masterPrompt = '') {
      const prefix = masterPrompt
        ? [`Master instruction (always follow): ${masterPrompt}`, ''].join('\n')
        : '';

      if (mode === 'write') {
        return prefix + [
          'You are a professional technical blog writer.',
          'Return ONLY markdown for the post body.',
          'Do not include YAML frontmatter and do not wrap the answer in code fences.',
          `Task: ${instruction}`
        ].join('\n');
      }

      return prefix + [
        'You are a markdown editor for blog posts.',
        'Modify the markdown according to the instruction and return ONLY the updated markdown body.',
        'Do not include YAML frontmatter and do not wrap the answer in code fences.',
        `Instruction: ${instruction}`,
        '',
        'Current markdown:',
        markdown || ''
      ].join('\n');
    },
    normalizeOllamaOutput(text) {
      return String(text || '')
        .trim()
        .replace(/^```(?:markdown|md)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
    },
    parseJsonFromOllama(text) {
      const raw = String(text || '').trim();
      if (!raw) return null;

      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch (_) {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          try {
            return JSON.parse(cleaned.slice(start, end + 1));
          } catch (__unused) {
            return null;
          }
        }
        return null;
      }
    },
    normalizeMetadataFromAI(payload) {
      if (!payload || typeof payload !== 'object') return null;

      const next = { ...this.editableMetadata };
      if (typeof payload.title === 'string' && payload.title.trim()) {
        next.title = payload.title.trim();
      }
      if (typeof payload.description === 'string' && payload.description.trim()) {
        next.description = payload.description.trim();
      }
      if (Array.isArray(payload.tags)) {
        next.tags = payload.tags
          .map((tag) => String(tag || '').trim())
          .filter(Boolean)
          .slice(0, 8);
      }
      if (typeof payload.draft === 'boolean') {
        next.draft = payload.draft;
      }
      if (typeof payload.pin === 'boolean') {
        next.pin = payload.pin;
      }
      if (typeof payload.publishDate === 'string' && payload.publishDate.trim()) {
        next.publishDate = payload.publishDate.trim();
      }
      if (typeof payload.updatedDate === 'string' && payload.updatedDate.trim()) {
        next.updatedDate = payload.updatedDate.trim();
      }

      if (!next.publishDate) {
        next.publishDate = this.formatMetaDate();
      }
      next.updatedDate = this.formatMetaDate();

      return next;
    },
    async autocompleteMetadataWithAI() {
      if (!this.selected) {
        this.$refs.toast.warning('Select or create a post first');
        return;
      }

      const markdown = String(this.contentWithoutMetadata || '').trim();
      if (!markdown) {
        this.$refs.toast.warning('Write post content first to generate metadata');
        return;
      }

      const { baseUrl, model, masterPrompt } = this.getOllamaSettings();
      if (!baseUrl || !model) {
        this.$refs.toast.error('Set "Ollama URL" and "Ollama model" in Settings');
        return;
      }

      this.aiIsLoading = true;
      this.$refs.toast.info('Generating metadata from post context...');

      try {
        const prompt = [
          masterPrompt ? `Master instruction (always follow): ${masterPrompt}` : '',
          'You generate blog post metadata from markdown content.',
          'Return ONLY valid JSON with fields: title, description, tags, draft, pin, publishDate, updatedDate.',
          'Date format must be: DD MMM YYYY (example: 12 Apr 2026).',
          'tags must be an array of short strings.',
          'Do not include markdown, comments, or code fences.',
          '',
          'Markdown content:',
          markdown,
          '',
          'Current metadata context (can be improved):',
          JSON.stringify(this.editableMetadata || {})
        ].filter(Boolean).join('\n');

        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: true })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Ollama request failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);
              if (chunk.response) fullResponse += chunk.response;
            } catch (_) {}
          }
        }

        const parsed = this.parseJsonFromOllama(fullResponse);
        if (!parsed) {
          throw new Error('Could not parse metadata JSON from Ollama');
        }

        const nextMetadata = this.normalizeMetadataFromAI(parsed);
        if (!nextMetadata) {
          throw new Error('Invalid metadata payload from Ollama');
        }

        this.updateMetadata(nextMetadata);
        this.$refs.toast.success('Metadata auto-completed from post content');
      } catch (error) {
        console.log('Ollama metadata autocomplete error', error);
        this.$refs.toast.error(`Metadata autocomplete failed: ${error.message || 'Request failed'}`);
      } finally {
        this.aiIsLoading = false;
      }
    },
    async applyOllama(mode) {
      if (!this.selected) {
        this.$refs.toast.warning('Select or create a post first');
        return;
      }

      const instruction = String(this.aiPrompt || '').trim();
      if (!instruction) {
        this.$refs.toast.warning('Enter AI instruction first');
        return;
      }

      const { baseUrl, model, masterPrompt } = this.getOllamaSettings();
      if (!baseUrl || !model) {
        this.$refs.toast.error('Set "Ollama URL" and "Ollama model" in Settings');
        return;
      }

      if (mode === 'modify' && !String(this.contentWithoutMetadata || '').trim()) {
        this.$refs.toast.warning('No markdown content to modify');
        return;
      }

      this.aiIsLoading = true;
      this.$refs.toast.info(`Requesting ${model} via Ollama...`);

      try {
        const prompt = this.buildOllamaPrompt(mode, instruction, this.contentWithoutMetadata, masterPrompt);
        const response = await fetch(`${baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: true })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || 'Ollama request failed');
        }

        // Clear content before streaming
        this.contentWithoutMetadata = '';
        this.editorContent = '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        let renderScheduled = false;

        const scheduleRender = () => {
          if (renderScheduled) return;
          renderScheduled = true;
          requestAnimationFrame(() => {
            renderScheduled = false;
            this.renderFile();
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const chunk = JSON.parse(line);
              if (chunk.response) {
                accumulated += chunk.response;
                this.contentWithoutMetadata = accumulated;
                this.editorContent = this.showMetadataInEditor
                  ? this.generateYAMLFrontmatter(this.editableMetadata, accumulated)
                  : accumulated;
                scheduleRender();
              }
            } catch (_) {}
          }
        }

        // Final normalise pass after stream ends
        const aiMarkdown = this.normalizeOllamaOutput(accumulated);
        this.contentWithoutMetadata = aiMarkdown;
        this.editorContent = this.showMetadataInEditor
          ? this.generateYAMLFrontmatter(this.editableMetadata, aiMarkdown)
          : aiMarkdown;
        this.renderFile();
        this.$refs.toast.success(mode === 'write' ? 'Post draft generated by Ollama' : 'Post updated by Ollama');
      } catch (error) {
        console.log('Ollama error', error);
        this.$refs.toast.error(`Ollama error: ${error.message || 'Request failed'}`);
      } finally {
        this.aiIsLoading = false;
      }
    },
    handleMouseDown(event) {
      if (event.button !== 0) return; // Only left mouse button
      this.isResizing = true;
      event.preventDefault();
    },
    handleMouseMove(event) {
      if (!this.isResizing || !this.preview) return;
      
      const container = document.querySelector('.preview-container');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain width between 30% and 70%
      if (newWidth > 30 && newWidth < 70) {
        this.leftPanelWidth = newWidth;
      }
    },
    handleMouseUp() {
      if (this.isResizing) {
        this.isResizing = false;
        // Save width to localStorage
        localStorage.setItem('previewPanelWidth', Math.round(this.leftPanelWidth));
      }
    },
    syncPreviewScrollWithEditor() {
      const editor = this.$refs.editor;
      const previewPane = this.$refs.previewPane;

      if (!editor || !previewPane) return;

      const editorMaxScroll = editor.scrollHeight - editor.clientHeight;
      const previewMaxScroll = previewPane.scrollHeight - previewPane.clientHeight;

      if (editorMaxScroll <= 0 || previewMaxScroll <= 0) {
        previewPane.scrollTop = 0;
        return;
      }

      const ratio = editor.scrollTop / editorMaxScroll;
      previewPane.scrollTop = ratio * previewMaxScroll;
    },
    async putFile () {
      const filePath = this.normalizeRepoPath(this.$refs['file-title']?.value || this.selected?.path);
      if (!filePath && !this.isGalleryMode()) {
        this.$refs.toast.error('File name is required');
        return;
      }
      
      this.isSaving = true;
      try {
        let targetPath = filePath;
        let contentToSave = '';
        let message = '';

        if (this.isGalleryMode()) {
          targetPath = this.getGalleryMetadataPath();
          contentToSave = this.buildGalleryMetadataContent(this.selected.name, this.editableMetadata);
          message = `Update gallery metadata for ${this.selected.name}`;
        } else if (this.isConfigMode()) {
          contentToSave = String(this.editorContent || this.$refs.editor?.value || '');
          message = `Update config ${filePath}`;
        } else {
          contentToSave = this.generateYAMLFrontmatter(
            this.editableMetadata,
            this.contentWithoutMetadata || this.$refs.editor.value
          );
          message = `Adding/Updating file ${filePath}`;
        }

        await this.saveRepoTextFile(targetPath, contentToSave, message);
        this.$refs.toast.success(this.isGalleryMode() ? 'Gallery metadata saved' : 'File saved successfully! 🎉');
        await this.loadList();
      } catch (error) {
        console.log('Error saving file', error);
        this.$refs.toast.error(`Save failed: ${error.message || 'Unknown error'}`);
      } finally {
        this.isSaving = false;
      }
    },
    async delFile() {
      const filePath = this.normalizeRepoPath(this.$refs['file-title']?.value);
      if (!confirm(`Are you sure you want to delete ${filePath}?`)) {
        return;
      }
      
      this.isSaving = true;
      try {
        // Fetch the current file SHA required by GitHub delete API
        const shaResponse = await fetch(`https://api.github.com/repos/${this.username}/${this.repo}/contents/${filePath}`, {
          headers: {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });

        if (!shaResponse.ok) {
          const error = await shaResponse.json();
          this.$refs.toast.error(`Delete failed: ${error.message || 'Could not fetch file SHA'}`);
          return;
        }

        const shaData = await shaResponse.json();
        const fileSha = shaData.sha;

        const response = await fetch(`https://api.github.com/repos/${this.username}/${this.repo}/contents/${filePath}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${this.token}`,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({
            message: `Deleting file ${filePath}`,
            sha: fileSha,
            branch: this.branch,
            owner: this.username,
            repo: this.repo,
            path: filePath,
            committer: {
              name: this.username,
              email: this.username +'@github.com'
            },
          })
        });
        if (response.ok) {
          if (this.isGalleryMode()) {
            const nextMap = { ...this.galleryMetadataMap };
            delete nextMap[this.selected?.name];
            this.galleryMetadataMap = nextMap;
            await this.saveRepoTextFile(this.getGalleryMetadataPath(), `${JSON.stringify(this.galleryMetadataMap, null, 2)}\n`, `Remove gallery metadata for ${this.selected?.name || 'image'}`);
          }
          console.log('delete successfully');
          this.$refs.toast.success('File deleted successfully');
          this.clearSelected();
          await this.loadList();
        } else {
          const error = await response.json();
          this.$refs.toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log('Error deleting file', error);
        this.$refs.toast.error('Network error: Could not delete file');
      } finally {
        this.isSaving = false;
      }
    },
    handlePrimaryAction() {
      if (this.canOpenCreateModal()) {
        this.openCreatePostModal();
        return;
      }

      if (this.contentType === 'images') {
        this.$refs.imageUpload.click();
        return;
      }

      if (this.isGalleryMode()) {
        this.openGalleryUploadModal();
        return;
      }

      if (!this.canReplaceCurrentSelection()) {
        this.$refs.toast.info('Select an image to replace first');
        return;
      }

      this.$refs.replaceUpload.click();
    },
    handleUploadAction() {
      if (this.isGalleryMode()) {
        if (!this.selected || !this.isImageFile(this.selected.name)) {
          this.$refs.toast.info('Select a gallery image first');
          return;
        }
        this.$refs.replaceUpload.click();
        return;
      }

      if (this.contentType === 'images') {
        if (!this.selected || !this.isImageFile(this.selected.name)) {
          this.$refs.toast.info('Select an image first');
          return;
        }
        this.$refs.replaceUpload.click();
        return;
      }

      if (this.isConfigMode() && (!this.selected || !this.isImageFile(this.selected.name))) {
        this.$refs.toast.info('Select the map preview image in Home first');
        return;
      }

      this.$refs.imageUpload.click();
    },
    async replaceCurrentSelection({ target }) {
      const file = target?.files?.[0];
      if (!file || !this.selected?.path) {
        target.value = '';
        return;
      }

      this.isSaving = true;
      try {
        await this.uploadAssetFile(file, {
          directory: this.normalizeRepoPath(this.selected.path).split('/').slice(0, -1).join('/'),
          filename: this.selected.name
        });

        this.assetPreviewVersion += 1;
        await this.loadList();
        await this.edit(this.selected.name);
        this.$refs.toast.success('Image replaced successfully');
      } catch (error) {
        console.log('Error replacing image', error);
        this.$refs.toast.error(`Replace failed: ${error.message || 'Upload failed'}`);
      } finally {
        this.isSaving = false;
        target.value = '';
      }
    },
    toBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      })
    },
    toBase64Utf8(text) {
      const value = String(text ?? '');
      const bytes = new TextEncoder().encode(value);
      let binary = '';
      const chunkSize = 0x8000;

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }

      return btoa(binary);
    },
    async fileUpload({target}) {
      if (this.isConfigMode() && (!this.selected || !this.isImageFile(this.selected.name))) {
        this.$refs.toast.warning('Select an image entry in Home first');
        target.value = '';
        return;
      }

      this.isSaving = true;
      let uploadedCount = 0;
      let failedCount = 0;
      const insertedMarkdown = [];
      
      for (const file of target.files) {
        try {
          const uploadOptions = this.isConfigMode()
            ? {
                directory: this.normalizeRepoPath(this.selected.path).split('/').slice(0, -1).join('/'),
                filename: this.selected.name
              }
            : {
                directory: this.getAssetFolderPath()
              };

          const { filename } = await this.uploadAssetFile(file, uploadOptions);
          uploadedCount++;

          if (!this.isMediaMode() && !this.isConfigMode()) {
            insertedMarkdown.push(`![${filename}](${this.getRelativeAssetPath(filename)})`);
          }
        } catch (error) {
          console.log('Error uploading file', error);
          failedCount++;
        }
      }
      
      this.isSaving = false;

      if (uploadedCount > 0 && !this.isMediaMode() && !this.isConfigMode() && insertedMarkdown.length && this.$refs.editor) {
        const editor = this.$refs.editor;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const before = editor.value.substring(0, start);
        const after = editor.value.substring(end);
        const insertion = `\n${insertedMarkdown.join('\n\n')}\n`;
        editor.value = before + insertion + after;
        this.editorContent = editor.value;
        editor.focus();
        editor.setSelectionRange(start + insertion.length, start + insertion.length);
        this.renderFile();
      }
      
      if (uploadedCount > 0) {
        this.assetPreviewVersion += 1;
        this.$refs.toast.success(`Uploaded ${uploadedCount} image(s) successfully`);
        if (this.isMediaMode() || this.isConfigMode()) {
          await this.loadList();
        }
      }
      if (failedCount > 0) {
        this.$refs.toast.error(`Failed to upload ${failedCount} image(s)`);
      }
      
      target.value = '';
    },
    imagePathModify(r, v, n) {
      let text = v;
      const matched = [...v.matchAll(r)];
      matched.forEach((m) => {
        const relativePath = String(m[1] || '').trim();
        try {
          const resolved = new URL(relativePath, n).toString();
          text = text.replace(m[0], m[0].replace(m[1], resolved));
        } catch (_error) {
          // ignore bad url fragments
        }
      });
      return text;
    },
    async handlePaste(event) {
      if (this.isMediaMode()) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          
          const file = item.getAsFile();
          if (!file) continue;

          this.$refs.toast.info('Uploading image...');
          
          try {
            const timestamp = Date.now();
            const extension = file.type.split('/')[1] || 'png';
            const filename = `image-${timestamp}.${extension}`;
            await this.uploadAssetFile(file, {
              directory: 'src/assets/images',
              filename
            });

            const editor = this.$refs.editor;
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const before = editor.value.substring(0, start);
            const after = editor.value.substring(end);
            
            const imageMarkdown = `![${filename}](${this.getRelativeAssetPath(filename)})`;
            editor.value = before + imageMarkdown + after;
            this.editorContent = editor.value;
            
            const newPosition = start + imageMarkdown.length;
            editor.setSelectionRange(newPosition, newPosition);
            editor.focus();
            
            this.renderFile();
            this.$refs.toast.success('Image uploaded and inserted! 🖼️');
          } catch (error) {
            console.error('Error uploading image from clipboard:', error);
            this.$refs.toast.error(`Failed to upload image from clipboard: ${error.message || 'Upload failed'}`);
          }
          
          break;
        }
      }
    },
    handleKeyDown(event) {
      // Only handle shortcuts when editor is focused
      if (event.target !== this.$refs.editor) return;
      
      if (event.ctrlKey || event.metaKey) {
        switch(event.key.toLowerCase()) {
          case 'b':
            event.preventDefault();
            this.formatMarkdown('bold');
            break;
          case 'i':
            event.preventDefault();
            this.formatMarkdown('italic');
            break;
          case 'k':
            event.preventDefault();
            this.formatMarkdown('link');
            break;
          case '`':
            event.preventDefault();
            this.formatMarkdown('code');
            break;
        }
      }
    },
    formatMarkdown(action) {
      const editor = this.$refs.editor;
      if (!editor) return;

      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const selectedText = editor.value.substring(start, end);
      const beforeText = editor.value.substring(0, start);
      const afterText = editor.value.substring(end);

      let formatted = '';
      let cursorOffset = 0;

      switch (action) {
        case 'bold':
          formatted = `**${selectedText || 'bold text'}**`;
          cursorOffset = selectedText ? formatted.length : 2;
          break;
        case 'italic':
          formatted = `*${selectedText || 'italic text'}*`;
          cursorOffset = selectedText ? formatted.length : 1;
          break;
        case 'code':
          formatted = `\`${selectedText || 'code'}\``;
          cursorOffset = selectedText ? formatted.length : 1;
          break;
        case 'h1':
          formatted = `# ${selectedText || 'Heading 1'}`;
          cursorOffset = selectedText ? formatted.length : 2;
          break;
        case 'h2':
          formatted = `## ${selectedText || 'Heading 2'}`;
          cursorOffset = selectedText ? formatted.length : 3;
          break;
        case 'h3':
          formatted = `### ${selectedText || 'Heading 3'}`;
          cursorOffset = selectedText ? formatted.length : 4;
          break;
        case 'link':
          formatted = `[${selectedText || 'link text'}](url)`;
          cursorOffset = selectedText ? formatted.length - 4 : 1;
          break;
        case 'image':
          formatted = `![${selectedText || 'alt text'}](image-url)`;
          cursorOffset = selectedText ? formatted.length - 11 : 2;
          break;
        case 'codeblock':
          formatted = `\`\`\`\n${selectedText || 'code'}\n\`\`\``;
          cursorOffset = selectedText ? 4 + selectedText.length : 4;
          break;
        case 'ul':
          formatted = `- ${selectedText || 'list item'}`;
          cursorOffset = selectedText ? formatted.length : 2;
          break;
        case 'ol':
          formatted = `1. ${selectedText || 'list item'}`;
          cursorOffset = selectedText ? formatted.length : 3;
          break;
        case 'quote':
          formatted = `> ${selectedText || 'quote'}`;
          cursorOffset = selectedText ? formatted.length : 2;
          break;
        case 'hr':
          formatted = `\n---\n`;
          cursorOffset = formatted.length;
          break;
      }

      editor.value = beforeText + formatted + afterText;
      this.editorContent = editor.value;
      editor.focus();
      editor.setSelectionRange(start + cursorOffset, start + cursorOffset);
      
      this.renderFile();
    }
  }
}
</script>

<template>
  <Toast ref="toast" />
  
  <main class="flex flex-row w-screen h-screen" v-if="this.url">
    <!-- Sidebar -->
    <div class="flex flex-col bg-bgColor border-r border-textColor/10" style="width: 320px; min-width: 320px; max-width: 320px;">
      <div class="flex flex-col justify-center w-full px-4 pt-4 gap-3 pb-3 border-b border-textColor/10">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-accent-2">Pinecraft Admin</h2>
          <ThemeToggle />
        </div>
        
        <RouterLink to="/settings" 
          class="text-center text-sm py-2 px-4 border border-textColor/20 rounded hover:border-accent transition-colors">
          Settings
        </RouterLink>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="(preset, key) in collectionPresets"
            :key="key"
            @click="setContentType(key)"
            :class="['text-center text-xs py-2 px-2 border rounded transition-colors', contentType === key ? 'border-accent bg-accent/10' : 'border-textColor/20 hover:border-accent']"
          >
            {{ preset.label }}
          </button>
        </div>
        <button
          @click="handlePrimaryAction()"
          :disabled="!canReplaceCurrentSelection()"
          class="text-center text-sm py-2 px-4 border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ getPrimaryActionLabel() }}
        </button>
      </div>
      
      <!-- Filters Component -->
      <PostFilters 
        :posts="posts" 
        @update:filtered="updateFiltered"
      />
      
      <div v-if="isLoading" class="flex justify-center items-center p-6">
        <LoadingSpinner size="md" color="accent" />
      </div>
      
      <div v-else class="overflow-y-auto flex-1 px-2">
        <div v-if="filtered.length" @click="edit(post.name)" 
          :class="['text-textColor px-3 py-3 my-1 cursor-pointer text-sm rounded transition-colors border-l-2',
                   selected.name === post.name ? 'bg-accent/10 border-accent' : 'hover:bg-textColor/5 border-transparent']" 
          v-for="post of filtered" :key="post.name">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-semibold truncate">
                {{ post.metadata?.title || post.name.replace('.md', '') }}
              </div>
              <div v-if="post.metadata?.publishDate" class="text-xs text-textColor/50 mt-1">
                {{ new Date(post.metadata.publishDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </div>
              <div v-else-if="post.metadata?.date" class="text-xs text-textColor/50 mt-1">
                {{ post.metadata.date }}
              </div>
              <div v-else-if="post.metadata?.description" class="text-xs text-textColor/50 mt-1 line-clamp-2">
                {{ post.metadata.description }}
              </div>
              <div v-if="post.metadata?.tags?.length" class="flex flex-wrap gap-1 mt-2">
                <span v-for="tag in post.metadata.tags.slice(0, 2)" :key="tag" 
                  class="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                  #{{ tag }}
                </span>
                <span v-if="post.metadata.tags.length > 2" class="text-xs text-textColor/50">
                  +{{ post.metadata.tags.length - 2 }}
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <span v-if="post.metadata?.pin" class="text-accent text-xs" title="Pinned">📌</span>
              <span v-if="post.metadata?.draft" class="text-red-500 text-xs" title="Draft">Draft</span>
            </div>
          </div>
        </div>
        <div v-if="!filtered.length && !isLoading" class="text-textColor/50 text-center p-4 text-sm">
          No entries found
        </div>
      </div>
    </div>
    
    <!-- Main Editor Area -->
    <div class="w-full h-full bg-bgColor flex flex-col">
      <!-- Toolbar -->
      <div class="text-textColor flex flex-row justify-between w-full border-b border-textColor/10 bg-bgColor">
        <div class="px-4 py-3 flex flex-row gap-2">
          <button v-if="canSaveSelected()" @click="putFile" :disabled="isSaving" 
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <LoadingSpinner v-if="isSaving" size="sm" color="accent" />
            <span v-else>Save</span>
          </button>
          <button v-if="canUploadCurrentSelection()" @click="handleUploadAction()" 
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors">
            {{ getUploadButtonLabel() }}
          </button>
          <input
            ref="imageUpload"
            type="file"
            @change="fileUpload"
            accept="image/*"
            multiple="true"
            capture
            class="hidden"
          />
          <input
            ref="replaceUpload"
            type="file"
            @change="replaceCurrentSelection"
            accept="image/*"
            class="hidden"
          />
          <button 
            v-if="selected && !isMediaMode() && !isConfigMode()"
            :class="['px-4 py-2 text-sm border rounded transition-colors',
                     preview ? 'border-accent bg-accent/10' : 'border-textColor/20 hover:border-accent']"
            @click="previewSwich">
            Preview
          </button>
          <button 
            v-if="selected && !isMediaMode() && !isConfigMode()"
            :class="['px-4 py-2 text-sm border rounded transition-colors',
                     showMetadataInEditor ? 'border-accent bg-accent/10' : 'border-textColor/20 hover:border-accent']"
            @click="toggleMetadataInEditor"
            title="Toggle frontmatter visibility in editor">
            {{ showMetadataInEditor ? 'Hide' : 'Show' }} Metadata
          </button>
          <span v-if="!selected" class="text-sm text-textColor/60 px-1 py-2">No entry selected</span>
        </div>
        
        <input v-if="selected" ref="file-title" @input="titleSize" 
          class="bg-transparent text-center text-sm px-4 focus:bg-textColor/5 transition-colors font-mono" 
          style="width: 100%; text-overflow: ellipsis;display: none;"
          :value="selected ? (selected.type == 'file' ? selected.path : selected.path + '/index.md') : this.path + '/new-post/index.md'" />
        <div v-else class="w-full"></div>
        
        <div class="px-4 py-3 flex flex-row gap-2">
          <button v-if="canDeleteSelected()" @click="delFile" :disabled="isSaving"
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50">
            Delete
          </button>
          <button v-if="selected && selected.path" @click="clearSelected"
            class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors">
            Close
          </button>
        </div>
      </div>
      
      <!-- Metadata Editor (Normal mode) -->
      <MetadataEditor 
        v-if="selected && !preview && !isMediaMode() && !isConfigMode()"
        :metadata="editableMetadata"
        :all-posts="posts"
        :content-type="contentType"
        @update:metadata="updateMetadata"
        @upload-cover="uploadCoverImage"
      />

      <SiteSettingsEditor
        v-if="selected && isHomeSettingsSelection()"
        :content="editorContent"
        @update:content="(value) => { editorContent = value; contentWithoutMetadata = value; }"
      />

      <HomeContentEditor
        v-if="selected && isHomeTextSelection()"
        :content="editorContent"
        @update:content="(value) => { editorContent = value; contentWithoutMetadata = value; }"
      />

      <GalleryMetadataEditor
        v-if="selected && isGalleryMode()"
        :metadata="editableMetadata"
        @update:metadata="updateMetadata"
      />

      <div v-if="selected && !preview && !isMediaMode() && !isConfigMode() && isAIConfigured()" class="border-b border-textColor/10 bg-bgColor">
        <button
          @click="isAIPanelCollapsed = !isAIPanelCollapsed"
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-textColor/5 transition-colors"
        >
          <h3 class="text-sm font-semibold text-accent-2 flex items-center gap-2">
            <span>AI Assistant</span>
          </h3>
          <svg class="w-5 h-5 text-textColor/70 transition-transform" :class="{ 'rotate-180': !isAIPanelCollapsed }" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="!isAIPanelCollapsed" class="px-4 pb-4">
          <label class="block text-xs text-textColor/70 mb-1">Instruction</label>
          <textarea
            v-model="aiPrompt"
            rows="3"
            placeholder="Describe what AI should do with this post..."
            class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"
          ></textarea>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              @click="applyOllama('write')"
              :disabled="aiIsLoading || !aiPrompt.trim()"
              class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate new markdown content with Ollama"
            >
              AI Write
            </button>
            <button
              @click="applyOllama('modify')"
              :disabled="aiIsLoading || !aiPrompt.trim()"
              class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rewrite current markdown content with Ollama"
            >
              AI Modify
            </button>
            <button
              @click="autocompleteMetadataWithAI"
              :disabled="aiIsLoading"
              class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Auto-complete metadata from post content"
            >
              AI Meta
            </button>
          </div>

          <div v-if="aiIsLoading" class="mt-3 border border-accent/30 rounded p-3 bg-accent/5">
            <div class="flex items-center gap-2 text-sm text-accent">
              <LoadingSpinner size="sm" color="accent" />
              <span>AI is processing your request...</span>
            </div>
            <div class="mt-2 h-1.5 w-full overflow-hidden rounded bg-textColor/10">
              <div class="ai-progress h-full w-1/3 bg-accent"></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!selected" class="flex-1 flex items-center justify-center text-textColor/60 text-lg">
        {{ isConfigMode() ? 'Choose a Home item' : isMediaMode() ? `Choose or upload ${getCurrentPreset().singleLabel.toLowerCase()}` : `Choose or create ${getCurrentPreset().singleLabel.toLowerCase()}` }}
      </div>
      
      <!-- Layout: Preview Mode (Left column: Metadata + Editor, Right column: Preview) -->
      <div v-else-if="preview" class="preview-container flex flex-row w-full h-full overflow-hidden">
        <!-- Left Column: Metadata + Editor -->
        <div class="flex flex-col overflow-hidden transition-all" :style="{ width: leftPanelWidth + '%' }">
          <!-- Metadata Editor -->
          <MetadataEditor 
            v-if="selected"
            :metadata="editableMetadata"
            :all-posts="posts"
            :content-type="contentType"
            @update:metadata="updateMetadata"
            @upload-cover="uploadCoverImage"
          />

          <div v-if="selected && isAIConfigured()" class="border-b border-textColor/10 bg-bgColor">
            <button
              @click="isAIPanelCollapsed = !isAIPanelCollapsed"
              class="w-full px-4 py-3 flex items-center justify-between hover:bg-textColor/5 transition-colors"
            >
              <h3 class="text-sm font-semibold text-accent-2 flex items-center gap-2">
                <span>AI Assistant</span>
              </h3>
              <svg class="w-5 h-5 text-textColor/70 transition-transform" :class="{ 'rotate-180': !isAIPanelCollapsed }" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-show="!isAIPanelCollapsed" class="px-4 pb-4">
              <label class="block text-xs text-textColor/70 mb-1">Instruction</label>
              <textarea
                v-model="aiPrompt"
                rows="3"
                placeholder="Describe what AI should do with this post..."
                class="w-full px-3 py-2 text-sm bg-bgColor text-textColor border border-textColor/20 rounded focus:border-accent transition-colors resize-y"
              ></textarea>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  @click="applyOllama('write')"
                  :disabled="aiIsLoading || !aiPrompt.trim()"
                  class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate new markdown content with Ollama"
                >
                  AI Write
                </button>
                <button
                  @click="applyOllama('modify')"
                  :disabled="aiIsLoading || !aiPrompt.trim()"
                  class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Rewrite current markdown content with Ollama"
                >
                  AI Modify
                </button>
                <button
                  @click="autocompleteMetadataWithAI"
                  :disabled="aiIsLoading"
                  class="px-4 py-2 text-sm border border-textColor/20 rounded hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto-complete metadata from post content"
                >
                  AI Meta
                </button>
              </div>

              <div v-if="aiIsLoading" class="mt-3 border border-accent/30 rounded p-3 bg-accent/5">
                <div class="flex items-center gap-2 text-sm text-accent">
                  <LoadingSpinner size="sm" color="accent" />
                  <span>AI is processing your request...</span>
                </div>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded bg-textColor/10">
                  <div class="ai-progress h-full w-1/3 bg-accent"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Editor -->
          <div class="relative flex-1 overflow-hidden border-b border-textColor/10">
            <textarea @input="renderFile" @scroll="syncPreviewScrollWithEditor" v-model="editorContent" ref="editor" 
              style="resize: none;" 
              class="bg-bgColor w-full h-full p-6 text-textColor font-mono text-sm leading-relaxed focus:outline-none"
              placeholder="Start writing your markdown here..."></textarea>
            <ContextMenu :editor="$refs.editor" @format="formatMarkdown" />
          </div>
        </div>
        
        <!-- Resizable Divider -->
        <div
          @mousedown="handleMouseDown"
          :class="['w-1 bg-textColor/10 hover:bg-accent transition-colors cursor-col-resize', { 'bg-accent': isResizing }]"
          style="user-select: none;"
        ></div>
        
        <!-- Right Column: Preview -->
        <div ref="previewPane" class="overflow-y-auto p-8 border-l border-textColor/10 transition-all" :style="{ width: (100 - leftPanelWidth) + '%' }">
          <div class="bg-bgColor text-textColor">
            <PostMeta :metadata="postMetadata" />
            <div class="prose prose-sm prose-cactus max-w-none" v-html="previewHtml"></div>
          </div>
        </div>
      </div>
      
      <div v-else-if="selected && (isMediaMode() || (isConfigMode() && isImageFile(selected.name)))" class="flex-1 overflow-y-auto p-6 md:p-8">
        <div class="mx-auto max-w-5xl">
          <div class="mb-3 text-sm text-textColor/60 font-mono break-all">
            {{ selected.path }}
          </div>
          <div class="rounded border border-textColor/10 bg-black/10 p-3">
            <img
              :src="`${getRawGitHubUrl(selected.path)}?v=${assetPreviewVersion}`"
              :alt="selected.name"
              class="max-h-[75vh] w-full object-contain rounded"
            />
          </div>
        </div>
      </div>

      <div v-else-if="selected && isConfigMode() && !isImageFile(selected.name)" class="flex-1 overflow-y-auto p-6 md:p-8">
        <div class="mx-auto max-w-4xl rounded border border-textColor/10 bg-bgColor/40 p-6 text-textColor/75">
          <h3 class="text-lg font-semibold text-accent-2 mb-2">Form-based editing enabled</h3>
          <p class="text-sm">
            Update the fields above and press Save to apply the changes to the selected Home file.
          </p>
        </div>
      </div>

      <!-- Layout: Normal Mode (Editor only) -->
      <div v-else-if="selected" class="flex flex-row w-full h-full overflow-hidden">
        <div class="relative w-full">
          <textarea @input="renderFile" @scroll="syncPreviewScrollWithEditor" v-model="editorContent" ref="editor" 
            style="resize: none;" 
            class="bg-bgColor w-full h-full p-6 text-textColor font-mono text-sm leading-relaxed focus:outline-none"
            placeholder="Start writing your markdown here..."></textarea>
          <ContextMenu :editor="$refs.editor" @format="formatMarkdown" />
        </div>
      </div>
    </div>

    <!-- Create Post Modal -->
    <div
      v-if="showCreatePostModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeCreatePostModal"
    >
      <div class="w-full max-w-md rounded border border-textColor/20 bg-bgColor p-4">
        <h3 class="mb-3 text-lg font-semibold text-accent-2">Create New Entry</h3>
        <p class="mb-3 text-sm text-textColor/70">
          Enter slug. File will be created as <span class="font-mono">/slug.md</span> in the selected collection.
        </p>
        <input
          ref="newPostSlugInput"
          v-model="newPostSlug"
          type="text"
          placeholder="my-new-post"
          class="w-full rounded border border-textColor/20 bg-bgColor px-3 py-2 text-sm text-textColor focus:border-accent"
          @keydown.enter="createNewPost"
        />
        <p v-if="getNewPostSlugError()" class="mt-2 text-xs text-red-500">
          {{ getNewPostSlugError() }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="closeCreatePostModal"
            class="rounded border border-textColor/20 px-3 py-2 text-sm hover:border-accent"
          >
            Cancel
          </button>
          <button
            @click="createNewPost"
            :disabled="!!getNewPostSlugError()"
            class="rounded border border-textColor/20 px-3 py-2 text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create Entry
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showGalleryUploadModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeGalleryUploadModal"
    >
      <div class="w-full max-w-2xl rounded border border-textColor/20 bg-bgColor p-4">
        <h3 class="mb-3 text-lg font-semibold text-accent-2">Upload Gallery Image</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-3">
            <input
              type="file"
              accept="image/*"
              @change="onGalleryUploadFileChange"
              class="w-full rounded border border-textColor/20 bg-bgColor px-3 py-2 text-sm text-textColor"
            />

            <div>
              <label class="block text-xs text-textColor/70 mb-1">Title</label>
              <input
                v-model="galleryUploadTitle"
                type="text"
                class="w-full rounded border border-textColor/20 bg-bgColor px-3 py-2 text-sm text-textColor focus:border-accent"
              />
            </div>

            <div>
              <label class="block text-xs text-textColor/70 mb-1">Date</label>
              <input
                v-model="galleryUploadDate"
                type="text"
                class="w-full rounded border border-textColor/20 bg-bgColor px-3 py-2 text-sm text-textColor focus:border-accent"
              />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="galleryUploadPin" type="checkbox" class="accent-accent cursor-pointer" />
                <span class="text-textColor">Pin</span>
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="galleryUploadDraft" type="checkbox" class="accent-accent cursor-pointer" />
                <span class="text-textColor">Draft</span>
              </label>
            </div>
          </div>

          <div class="rounded border border-textColor/10 bg-black/10 p-3 min-h-56 flex items-center justify-center">
            <img
              v-if="galleryUploadPreview"
              :src="galleryUploadPreview"
              alt="Preview"
              class="max-h-64 w-full object-contain rounded"
            />
            <span v-else class="text-sm text-textColor/50">Preview will appear here</span>
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="closeGalleryUploadModal"
            class="rounded border border-textColor/20 px-3 py-2 text-sm hover:border-accent"
          >
            Cancel
          </button>
          <button
            @click="confirmGalleryUpload"
            :disabled="!galleryUploadFile || isSaving"
            class="rounded border border-textColor/20 px-3 py-2 text-sm hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upload to Gallery
          </button>
        </div>
      </div>
    </div>
  </main>
  
  <!-- Welcome Screen -->
  <main v-else class="flex flex-row w-screen h-screen items-center justify-center bg-bgColor">
    <div class="flex flex-col justify-center w-max h-max p-8 border border-textColor/10 rounded">
      <div class="text-textColor text-2xl mb-6 text-center font-semibold">
        Setup Required
      </div>
      <p class="text-textColor/70 text-sm mb-6 text-center max-w-sm">
        Configure your GitHub repository settings to start managing your blog posts.
      </p>
      <RouterLink to="/settings" 
        class="text-center text-sm py-3 px-6 border border-textColor/20 rounded hover:border-accent transition-colors">
        Go to Settings
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.ai-progress {
  animation: ai-progress 1.2s linear infinite;
}

@keyframes ai-progress {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}
</style>