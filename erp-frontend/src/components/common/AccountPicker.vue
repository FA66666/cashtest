<template>
    <select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)" :disabled="isLoading">
        <option value="" disabled>{{ placeholder }}</option>

        <option v-if="isLoading" value="" disabled>Loading accounts...</option>
        <option v-if="!isLoading && filteredAccounts.length === 0" value="" disabled>
            No accounts found (or none match filter)
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
    accountTypes: {
        type: [String, Array],
        required: true
    },
    placeholder: {
        type: String,
        default: 'Select an account'
    },
    selectableOnly: {
        type: Boolean,
        default: true
    },
    filterByCurrencyGuid: {
        type: String,
        default: null
    },
    // (新增) 用于过滤 STOCK 账户
    filterByCommodityGuid: {
        type: String,
        default: null
    }
});
const emit = defineEmits(['update:modelValue', 'accountsLoaded']);

const allAccounts = ref([]);
const isLoading = ref(false);

const filteredAccounts = computed(() => {
    const types = Array.isArray(props.accountTypes) ? props.accountTypes : [props.accountTypes];

    return allAccounts.value.filter(acc => {
        const typeMatch = types.includes(acc.account_type);
        const selectableMatch = props.selectableOnly ? !acc.placeholder : true;

        // (修改) 区分货币过滤和商品过滤
        let currencyMatch = true;
        if (props.filterByCurrencyGuid) {
            // 过滤非 STOCK 账户 (如 Expense, Asset)
            currencyMatch = acc.commodity_guid === props.filterByCurrencyGuid;
        } else if (props.filterByCommodityGuid && acc.account_type === 'STOCK') {
            // 专门过滤 STOCK 账户
            currencyMatch = acc.commodity_guid === props.filterByCommodityGuid;
        }

        return typeMatch && selectableMatch && currencyMatch;
    });
});

onMounted(async () => {
    isLoading.value = true;
    try {
        const response = await getAccounts();
        allAccounts.value = response.data;
        emit('accountsLoaded', allAccounts.value);
    } catch (error) {
        console.error("Failed to load accounts:", error);
    } finally {
        isLoading.value = false;
    }
});
</script>

<style scoped>
select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
}
</style>