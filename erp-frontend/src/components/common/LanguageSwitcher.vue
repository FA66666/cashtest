<template>
    <div class="language-switcher">
        <label for="lang-switcher">{{ $t('language') }}: </label>

        <select v-model="locale" id="lang-switcher">
            <option value="en">English</option>
            <option value="zh_CN">中文 (简体)</option>
        </select>
    </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

// 从 vue-i18n 中解构出响应式的 'locale' 变量
// 'locale' 的值 (例如 'en') 会自动被 vue-i18n 
// 持久化 (通常是到 localStorage, 取决于库的配置)
const { locale } = useI18n();
</script>

<style lang="scss" scoped>
/* 这是一个自包含的组件样式，
  可以确保它在任何地方看起来都一致。
*/
.language-switcher {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    /* 在标签和下拉框之间添加一些间距 */

    label {
        font-size: 0.9em;
        color: #555;
        /* 一个中性的颜色，适用于亮色和暗色背景 */
    }

    select {
        padding: 4px 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: white;
        cursor: pointer;
    }
}
</style>