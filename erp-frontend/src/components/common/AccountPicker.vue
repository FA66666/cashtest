<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading accounts...</option>
        <option v-if="!isLoading && filteredAccounts.length === 0" value="" disabled>
            No accounts found
        </option>

        <template v-if="!isLoading">
            <option v-for="account in filteredAccounts" :key="account.guid" :value="account.guid">
                {{ account.code }} - {{ account.name }}
            </option>
        </template>
    </select>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getAccounts } from '../../services/ledgerService';

const props = defineProps({
    modelValue: String, // 用于 v-model
    // 允许传入单个类型或类型数组
    accountTypes: {
        type: [String, Array],
        required: true
    },
    placeholder: {
        type: String,
        default: 'Select an account'
    },
    // 是否只显示非占位符 (即：可过账的) 账户
    selectableOnly: {
        type: Boolean,
        default: true
    }
});
defineEmits(['update:modelValue']);

const allAccounts = ref([]);
const isLoading = ref(false);

const filteredAccounts = computed(() => {
    const types = Array.isArray(props.accountTypes) ? props.accountTypes : [props.accountTypes];

    return allAccounts.value.filter(acc => {
        // 1. 过滤类型
        const typeMatch = types.includes(acc.account_type);
        // 2. 过滤占位符 (placeholder)
        const selectableMatch = props.selectableOnly ? !acc.placeholder : true;

        return typeMatch && selectableMatch;
    });
});

onMounted(async () => {
    isLoading.value = true;
    try {
        // TODO: 考虑将此 API 调用缓存在 Pinia store 中，避免重复加载
        const response = await getAccounts();
        allAccounts.value = response.data;
    } catch (error) {
        console.error("Failed to load accounts:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style scoped>
/* (可选) 为选择器添加一点基本样式 */
select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
}
</style>