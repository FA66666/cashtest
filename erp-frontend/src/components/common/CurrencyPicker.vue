<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading currencies...</option>
        <option v-if="!isLoading && currencies.length === 0" value="" disabled>
            No currencies found
        </option>

        <template v-if="!isLoading">
            <option v-for="currency in currencies" :key="currency.guid" :value="currency.guid">
                {{ currency.mnemonic }} ({{ currency.fullname }})
            </option>
        </template>
    </select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getCurrencies } from '../../services/commoditiesService';

defineProps({
    modelValue: String, // 用于 v-model
    placeholder: {
        type: String,
        default: 'Select a currency'
    }
});
// (修改) 添加 'currenciesLoaded' 事件
const emit = defineEmits(['update:modelValue', 'currenciesLoaded']);

const currencies = ref([]);
const isLoading = ref(false);

onMounted(async () => {
    isLoading.value = true;
    try {
        const response = await getCurrencies();
        currencies.value = response.data;
        // (新增) 将加载的货币列表发送给父组件
        emit('currenciesLoaded', currencies.value);
    } catch (error) {
        console.error("Failed to load currencies:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>