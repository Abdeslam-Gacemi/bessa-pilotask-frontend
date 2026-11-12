<script setup lang="ts">
import type { Locale } from "@/types/models";

/** Round SVG flags for the language switch: France, United Kingdom, Algeria (Arabic). */
withDefaults(defineProps<{ locale: Locale; size?: number }>(), { size: 20 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" class="shrink-0 overflow-hidden rounded-full ring-1 ring-black/10" aria-hidden="true">
    <defs>
      <clipPath id="pt-flag-circle"><circle cx="16" cy="16" r="16" /></clipPath>
    </defs>
    <g clip-path="url(#pt-flag-circle)">
      <template v-if="locale === 'fr'">
        <rect width="32" height="32" fill="#fff" />
        <rect width="10.67" height="32" fill="#0055A4" />
        <rect x="21.33" width="10.67" height="32" fill="#EF4135" />
      </template>
      <template v-else-if="locale === 'en'">
        <rect width="32" height="32" fill="#012169" />
        <path d="M0 0L32 32M32 0L0 32" stroke="#fff" stroke-width="6.4" />
        <path d="M0 0L32 32M32 0L0 32" stroke="#C8102E" stroke-width="2.2" />
        <path d="M16 0V32M0 16H32" stroke="#fff" stroke-width="9.6" />
        <path d="M16 0V32M0 16H32" stroke="#C8102E" stroke-width="5.6" />
      </template>
      <template v-else>
        <rect width="16" height="32" fill="#006633" />
        <rect x="16" width="16" height="32" fill="#fff" />
        <circle cx="16.6" cy="16" r="7.2" fill="#D21034" />
        <circle cx="18.4" cy="16" r="5.8" fill="#fff" />
        <path d="M20.6 12.6l0.9 2.4 2.5 0.1-2 1.6 0.7 2.5-2.1-1.4-2.1 1.4 0.7-2.5-2-1.6 2.5-0.1z" fill="#D21034" />
      </template>
    </g>
  </svg>
</template>
