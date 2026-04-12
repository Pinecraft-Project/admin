<script>
export default {
  props: {
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'text'
    },
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    required: {
      type: Boolean,
      default: false
    },
    pattern: {
      type: String,
      default: ''
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      localStorageValue: window.localStorage.getItem(this.label) || this.value,
      touched: false,
      error: ''
    };
  },
  computed: {
    isValid() {
      if (this.required && !this.localStorageValue) {
        return false;
      }
      if (this.pattern && this.localStorageValue) {
        const regex = new RegExp(this.pattern);
        return regex.test(this.localStorageValue);
      }
      return true;
    },
    showError() {
      return this.touched && !this.isValid;
    }
  },
  methods: {
    handleInput({target}) {
      const newValue = target.value;
      window.localStorage.setItem(this.label, newValue);
      this.localStorageValue = newValue;
      this.$emit('input', newValue);
      this.$emit('validate', this.isValid);
    },
    handleBlur() {
      this.touched = true;
      if (!this.isValid) {
        this.error = this.errorMessage || `${this.label} is invalid`;
      } else {
        this.error = '';
      }
    }
  }
}
</script>
<template>
  <div class="relative h-10 input-component mb-5">
    <input
      :id="label"
      :type="type"
      :name="label"
      :value="localStorageValue"
      :placeholder="placeholder"
      :required="required"
      @input="handleInput"
      @blur="handleBlur"
      :class="[
        'h-full w-full px-2 transition-all rounded bg-bgColor text-textColor font-mono text-sm',
        showError ? 'border-red-500 border-2' : 'border-textColor/20 border hover:border-accent focus:border-accent'
      ]"
    />
    <label 
      :for="label" 
      :class="[
        'absolute left-2 transition-all rounded px-1 text-xs',
        showError ? 'bg-red-500 text-white' : 'bg-accent text-white'
      ]"
    >
      {{ label }}{{ required ? ' *' : '' }}
    </label>
    <transition name="error-fade">
      <span v-if="showError" class="absolute -bottom-5 left-0 text-red-500 text-xs">
        {{ error }}
      </span>
    </transition>
  </div>
</template>



<style scoped>
label {
  top: 0%;
  transform: translateY(-50%);
  font-size: 11px;
}
.empty input:not(:focus) + label {
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}
input:focus {
  outline: none;
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.2s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style> 