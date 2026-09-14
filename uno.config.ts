import type { WebFontMeta } from '@unocss/preset-web-fonts'
import type { Preset, PresetOrFactoryAwaitable } from 'unocss'

import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'

import { createExternalPackageIconLoader } from '@iconify/utils/lib/loader/external-pkg'
import { presetChromatic } from '@proj-airi/unocss-preset-chromatic'
import { colorToString } from '@unocss/preset-mini/utils'
import { defineConfig, mergeConfigs, presetAttributify, presetIcons, presetTypography, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss'
import { presetScrollbar } from 'unocss-preset-scrollbar'
import { parseColor } from 'unocss/preset-mini'

// On Netlify, building will result in when fetching metadata and fonts from @unocss/preset-web-fonts plugin:
//
// [cause]: AggregateError [ETIMEDOUT]:
//    at internalConnectMultiple (node:net:1134:18)
//  code: 'ETIMEDOUT',
//  [errors]: [
//    Error: connect ETIMEDOUT 146.75.77.229:443 ...
//    Error: connect ENETUNREACH 2a04:4e42:83::485:443 - Local (:::0) ...
//  ]
//
// This is same for either Google Fonts or Fontsource as provider. But GitHub Actions and local development works fine.
// My assumption is that the default timeout for auto-selecting family is too short (250ms)[^1] for the implementation
// of the Happy Eyeballs algorithm in Node.js, which is used by the `net` module to connect to the server, workflows
// illustrates like this:
//
// lookupAndConnect > autoSelectFamilyAttemptTimeout > lookupAndConnectMultiple > internalConnectMultiple > defaultTriggerAsyncIdScope
//
// Such mechanism will be used when the `net` module attempts to connect to a server using both IPv4 and IPv6 addresses,
// which is the case for Netlify builder.
//
// In order to fix this issue, we can increase the timeout to 1000ms (1 second) so that the algorithm has more time to
// attempt to connect to the server before timing out.
//
// [^1]: https://github.com/nodejs/node/pull/44731/files#diff-d76469e9e7f555294a7a5488c5c8fc4ef8ce5aea448cc26a1322d1ab693e09caR921
setDefaultAutoSelectFamilyAttemptTimeout(1000)

export function presetStoryMockHover(): PresetOrFactoryAwaitable {
  return {
    name: 'story-mock-hover',
    variants: [
      (matcher) => {
        if (!matcher.includes('hover')) {
          return matcher
        }

        return {
          matcher,
          selector: (s) => {
            return `${s}, ${s.replace(/:hover$/, '')}._hover`
          },
        }
      },
    ],
  }
}

export function safelistAllPrimaryBackgrounds(): string[] {
  return [undefined, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => {
    const prefix = shade ? `bg-primary-${shade}` : `bg-primary`
    return [
      prefix,
      ...[5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(opacity => `${prefix}/${opacity}`),
    ]
  }).flat()
}

export function safelistSettingsEntryIcons(): string[] {
  return [
    'i-solar:emoji-funny-square-bold-duotone',
    'i-solar:people-nearby-bold-duotone',
    'i-solar:leaf-bold-duotone',
    'i-solar:armchair-2-bold-duotone',
    'i-solar:database-bold-duotone',
    'i-solar:wi-fi-router-bold-duotone',
    'i-solar:layers-bold-duotone',
    'i-solar:box-minimalistic-bold-duotone',
    'i-solar:filters-bold-duotone',
  ]
}

/**
 * Provider metadata stores Iconify class names as data. UnoCSS cannot see
 * those runtime values while it scans templates, so provider brand marks need
 * an explicit build-time list.
 */
export function safelistProviderBrandIcons(): string[] {
  return [
    'i-lobe-icons:ai302',
    'i-lobe-icons:ai302-color',
    'i-lobe-icons:aihubmix',
    'i-lobe-icons:aihubmix-color',
    'i-lobe-icons:alibabacloud',
    'i-lobe-icons:aws',
    'i-lobe-icons:aws-color',
    'i-lobe-icons:bilibiliindex',
    'i-lobe-icons:bytedance',
    'i-lobe-icons:bytedance-color',
    'i-lobe-icons:cerebras',
    'i-lobe-icons:cerebras-color',
    'i-lobe-icons:claude',
    'i-lobe-icons:claude-color',
    'i-lobe-icons:cloudflare-color',
    'i-lobe-icons:cometapi',
    'i-lobe-icons:cometapi-color',
    'i-lobe-icons:deepseek',
    'i-lobe-icons:deepseek-color',
    'i-lobe-icons:featherless-color',
    'i-lobe-icons:fireworks',
    'i-lobe-icons:fireworks-color',
    'i-lobe-icons:gemini',
    'i-lobe-icons:gemini-color',
    'i-lobe-icons:groq',
    'i-lobe-icons:huggingface',
    'i-lobe-icons:lmstudio',
    'i-lobe-icons:microsoft',
    'i-lobe-icons:minimax',
    'i-lobe-icons:minimax-color',
    'i-lobe-icons:mistral',
    'i-lobe-icons:mistral-color',
    'i-lobe-icons:modelscope',
    'i-lobe-icons:modelscope-color',
    'i-lobe-icons:moonshot',
    'i-lobe-icons:novita',
    'i-lobe-icons:novita-color',
    'i-lobe-icons:ollama',
    'i-lobe-icons:openai',
    'i-lobe-icons:openrouter',
    'i-lobe-icons:perplexity',
    'i-lobe-icons:perplexity-color',
    'i-lobe-icons:player2',
    'i-lobe-icons:replicate',
    'i-lobe-icons:replicate-color',
    'i-lobe-icons:speaker',
    'i-lobe-icons:together',
    'i-lobe-icons:together-color',
    'i-lobe-icons:volcengine',
    'i-lobe-icons:xai',
    'i-lobe-icons:zai',
    'i-simple-icons:cloudflare',
    'i-simple-icons:deepgram',
    'i-simple-icons:elevenlabs',
    'i-simple-icons:microsoftazure',
    'i-simple-icons:nvidia',
    'i-simple-icons:xiaomi',
  ]
}

export function presetWebFontsFonts(provider: 'fontsource' | 'none'): Record<string, string | WebFontMeta | (string | WebFontMeta)[]> {
  return {
    'sans': {
      name: provider === 'fontsource' ? 'DM Sans' : 'DM Sans Variable',
      provider,
    },
    'serif': {
      name: 'DM Serif Display',
      provider,
    },
    'mono': {
      name: 'DM Mono',
      provider,
    },
    'cutejp': {
      name: 'Kiwi Maru',
      provider,
      subsets: ['latin', 'japanese'],
    },
    'cuteen': {
      name: provider === 'fontsource' ? 'Nunito' : 'Nunito Variable',
      provider,
    },
    'jura': {
      name: provider === 'fontsource' ? 'Jura' : 'Jura Variable',
      provider,
    },
    'gugi': {
      name: 'Gugi',
      provider,
    },
    'quicksand': {
      name: provider === 'fontsource' ? 'Quicksand' : 'Quicksand Variable',
      provider,
    },
    'urbanist': {
      name: provider === 'fontsource' ? 'Urbanist' : 'Urbanist Variable',
      provider,
    },
    'comfortaa': {
      name: provider === 'fontsource' ? 'Comfortaa' : 'Comfortaa Variable',
      provider,
    },
    'm-plus-rounded': {
      name: 'M PLUS Rounded 1c',
      provider,
    },
    'quanlai': {
      name: 'cjkfonts AllSeto',
      provider: 'none',
    },
    'xiaolai': {
      name: 'Xiaolai SC',
      provider: 'none',
    },
  }
}

export function sharedUnoConfig() {
  return defineConfig({
    presets: [
      presetWind3(),
      presetAttributify(),
      presetTypography(),
      presetIcons({
        scale: 1.2,
        collections: {
          ...createExternalPackageIconLoader('@proj-airi/lobe-icons'),
          ...createExternalPackageIconLoader('@proj-airi/iconify-meteocons'),
        },
      }),
      presetScrollbar(),
      presetChromatic({
        baseHue: 220.44,
        colors: {
          primary: 0,
          complementary: 180,
        },
      }) as Preset,
    ],
    transformers: [
      transformerDirectives({
        applyVariable: ['--at-apply'],
      }),
      transformerVariantGroup(),
    ],
    shortcuts: {
      'glass-tier-1': 'border border-solid border-[var(--color-glass-border-1)] bg-[var(--color-glass-fill-1)] shadow-[var(--shadow-glass-1)] backdrop-blur-[12px]',
      'glass-tier-2': 'border border-solid border-[var(--color-glass-border-2)] bg-[var(--color-glass-fill-2)] shadow-[var(--shadow-glass-2)] backdrop-blur-[20px]',
      'glass-tier-3': 'border border-solid border-[var(--color-glass-border-3)] bg-[var(--color-glass-fill-3)] shadow-[var(--shadow-glass-3)] backdrop-blur-[30px]',
      'text-glass-primary': 'text-[var(--color-text-primary)]',
      'text-glass-secondary': 'text-[var(--color-text-secondary)]',
      'text-glass-muted': 'text-[var(--color-text-muted)]',
      'glass-focus-ring': 'outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    },
    safelist: [
      ...'prose prose-sm m-auto text-left'.split(' '),
      ...safelistAllPrimaryBackgrounds(),
      ...safelistSettingsEntryIcons(),
      ...safelistProviderBrandIcons(),
    ],
    // hyoban/unocss-preset-shadcn: Use shadcn ui with UnoCSS
    // https://github.com/hyoban/unocss-preset-shadcn
    //
    // Thanks to
    // https://github.com/unovue/shadcn-vue/issues/34#issuecomment-2467318118
    // https://github.com/hyoban-template/shadcn-vue-unocss-starter
    //
    // By default, `.ts` and `.js` files are NOT extracted.
    // If you want to extract them, use the following configuration.
    // It's necessary to add the following configuration if you use shadcn-vue or shadcn-svelte.
    content: {
      pipeline: {
        include: [
          // the default

          /\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/,
          // include js/ts files
          '(components|src)/**/*.{js,ts,vue}', // THIS CAN INCLUDE node_modules
          '**/stage-ui/**/*.{vue,js,ts}', // THIS TOO
          '**/ui/**/*.{vue,js,ts}', // THIS TOO
        ],
        exclude: [

          /\/node_modules\//, // DO NOT SCAN THE BLACK HOLE
        ],
      },
    },
    rules: [

      [/^mask-\[(.*)\]$/, ([, suffix]) => ({ '-webkit-mask-image': suffix.replace(/_/g, ' ') })],

      [/^bg-dotted-\[(.*)\]$/, ([, color], { theme }) => {
        const parsedColor = parseColor(color, theme)
        // Util usage: https://github.com/unocss/unocss/blob/f57ef6ae50006a92f444738e50f3601c0d1121f2/packages-presets/preset-mini/src/_utils/utilities.ts#L186
        return {
          'background-image': `radial-gradient(circle at 1px 1px, ${colorToString(parsedColor?.cssColor ?? parsedColor?.color ?? color, 'var(--un-background-opacity)')} 1px, transparent 0)`,
          '--un-background-opacity': parsedColor?.cssColor?.alpha ?? parsedColor?.alpha ?? 1,
        }
      }],

      [/drag-region/, () => ({ 'app-region': 'drag' })],
    ],
    theme: {
      fontFamily: {
        'sans': `"DM Sans Variant", "DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";`,
        'sans-rounded': `"Comfortaa Variable", "Comfortaa", "DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";`,
        'cute': `"Nunito Variable", "Nunito", "ChillRoundM", "Kiwi Maru", "Comfortaa Variable", "Comfortaa", "DM Sans Variant", "DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";`,
        'cuteen': `"Nunito Variable", "Nunito", "ChillRoundM", "Kiwi Maru", "Comfortaa Variable", "Comfortaa", "DM Sans Variant", "DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";`,
        'cutejp': `"Nunito Variable", "Nunito", "ChillRoundM", "Kiwi Maru", "Comfortaa Variable", "Comfortaa", "DM Sans Variant", "DM Sans", ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";`,
      },
      /**
       * https://github.com/unocss/unocss/blob/1031312057a3bea1082b7d938eb2ad640f57613a/packages-presets/preset-wind4/src/theme/animate.ts
       * https://unocss.dev/presets/wind4#transformdirectives
       */
      animation: {
        keyframes: {
          overlayShow: '{from{opacity:0;}to{opacity:1;}}',
          overlayHide: '{from{opacity:1;}to{opacity:0;}}',
          contentShow: '{from:{opacity:0;transform:translate(-50%,-48%) scale(0.96);}to:{opacity:1;transform:translate(-50%,-50%) scale(1);}}',
          contentHide: '{from:{opacity:1;transform:translate(-50%,-50%) scale(1);}to:{opacity:0;transform:translate(-50%,-48%) scale(0.96);}}',
          slideUpAndFade: '{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:translateY(0)}}',
          slideRightAndFade: '{from{opacity:0;transform:translateX(-2px)}to{opacity:1;transform:translateX(0)}}',
          slideDownAndFade: '{from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:translateY(0)}}',
          slideLeftAndFade: '{from{opacity:0;transform:translateX(2px)}to{opacity:1;transform:translateX(0)}}',
          fadeIn: '{from{opacity:0;}to{opacity:1;}}',
          fadeOut: '{from{opacity:1;}to{opacity:0;}}',
          glassRise: '{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}',
          glassSink: '{from{opacity:1;transform:translateY(0);}to{opacity:0;transform:translateY(8px);}}',
          sidebarIn: '{from{opacity:0;transform:translateX(-14px);}to{opacity:1;transform:translateX(0);}}',
        },
        durations: {
          overlayShow: '300ms',
          overlayHide: '300ms',
          contentShow: '150ms',
          contentHide: '150ms',
          slideUpAndFade: '400ms',
          slideRightAndFade: '400ms',
          slideDownAndFade: '400ms',
          slideLeftAndFade: '400ms',
          fadeIn: '200ms',
          fadeOut: '200ms',
          glassRise: '400ms',
          glassSink: '250ms',
          sidebarIn: '420ms',
        },
        timingFns: {
          overlayShow: 'cubic-bezier(0.16, 1, 0.3, 1)',
          overlayHide: 'cubic-bezier(0.16, 1, 0.3, 1)',
          contentShow: 'cubic-bezier(0.16, 1, 0.3, 1)',
          contentHide: 'cubic-bezier(0.16, 1, 0.3, 1)',
          slideUpAndFade: 'cubic-bezier(0.16, 1, 0.3, 1)',
          slideRightAndFade: 'cubic-bezier(0.16, 1, 0.3, 1)',
          slideDownAndFade: 'cubic-bezier(0.16, 1, 0.3, 1)',
          slideLeftAndFade: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fadeIn: 'ease-in-out',
          fadeOut: 'ease-in-out',
          glassRise: 'cubic-bezier(.34, 1.56, .64, 1)',
          glassSink: 'cubic-bezier(.16, 1, .3, 1)',
          sidebarIn: 'var(--motion-glass-emphasized)',
        },
      },
    },
  })
}

export function histoireUnoConfig() {
  return defineConfig({
    presets: [
      presetStoryMockHover(),
    ],
  })
}

export default mergeConfigs([
  sharedUnoConfig(),
  histoireUnoConfig(),
])
