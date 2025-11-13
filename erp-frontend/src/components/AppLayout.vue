<template>
    <div class="app-layout">
        <Sidebar />

        <div class="main-content-wrapper">
            <AppHeader />

            <main class="main-content">
                <router-view />
            </main>
        </div>
    </div>
</template>

<script setup>
// (这个组件只负责布局，所以脚本很简单)
import Sidebar from './Sidebar.vue';
import AppHeader from './AppHeader.vue';
</script>

<style lang="scss">
/* (这些是布局样式) */
.app-layout {
    display: flex;
    width: 100vw;
    height: 100vh;
}

.main-content-wrapper {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* 防止布局溢出 */
}

.main-content {
    flex-grow: 1;
    overflow-y: auto;
    /* 使内容区可滚动 */
    padding: 2rem;
    background-color: #f4f7f6;
}
</style>