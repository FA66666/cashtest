<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading items...</option>
        <option v-if="!isLoading && items.length === 0" value="" disabled>
            No stock items found
        </option>

        <template v-if="!isLoading">
            <option v-for="item in items" :key="item.guid" :value="item.guid">
                {{ item.mnemonic }} ({{ item.fullname }})
            </option>
        </template>
    </select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getStockItems } from '../../services/inventoryService'; // (我们复用 inventoryService)

defineProps({
    modelValue: String, // 用于 v-model
    placeholder: {
        type: String,
        default: 'Select an item'
    }
});
defineEmits(['update:modelValue']);

const items = ref([]);
const isLoading = ref(false);

onMounted(async () => {
    isLoading.value = true;
    try {
        // TODO: 考虑将此 API 调用缓存在 Pinia store 中
        const response = await getStockItems();
        items.value = response.data;
    } catch (error) {
        console.error("Failed to load stock items:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style lang="scss" scoped>
/* (添加基础样式) */
select {
    width: 100%;
    padding: 0.5rem;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 4px;
}
</style>