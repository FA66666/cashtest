<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading vendors...</option>
        <option v-if="!isLoading && vendors.length === 0" value="" disabled>
            No vendors found
        </option>

        <template v-if="!isLoading">
            <option v-for="vendor in vendors" :key="vendor.guid" :value="vendor.guid">
                {{ vendor.name }} ({{ vendor.id }})
            </option>
        </template>
    </select>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getVendors } from '../../services/purchaseService';

defineProps({
    modelValue: String, // 用于 v-model
    placeholder: {
        type: String,
        default: 'Select a vendor'
    }
});
// (修改) 移除了 'vendorLoaded'
defineEmits(['update:modelValue']);

const vendors = ref([]);
const isLoading = ref(false);

onMounted(async () => {
    isLoading.value = true;
    try {
        const response = await getVendors();
        vendors.value = response.data;
    } catch (error) {
        console.error("Failed to load vendors:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>