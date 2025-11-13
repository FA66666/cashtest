<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading customers...</option>
        <option v-if="!isLoading && customers.length === 0" value="" disabled>
            No customers found
        </option>

        <template v-if="!isLoading">
            <option v-for="customer in customers" :key="customer.guid" :value="customer.guid">
                {{ customer.name }} ({{ customer.id }})
            </option>
        </template>
    </select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getCustomers } from '../../services/salesService';

defineProps({
    modelValue: String, // 用于 v-model
    placeholder: {
        type: String,
        default: 'Select a customer'
    }
});
defineEmits(['update:modelValue']);

const customers = ref([]);
const isLoading = ref(false);

onMounted(async () => {
    isLoading.value = true;
    try {
        // TODO: 考虑将此 API 调用缓存在 Pinia store 中
        const response = await getCustomers();
        customers.value = response.data;
    } catch (error) {
        console.error("Failed to load customers:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>