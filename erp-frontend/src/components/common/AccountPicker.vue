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
        // 基础过滤
        const typeMatch = types.includes(acc.account_type);
        const selectableMatch = props.selectableOnly ? !acc.placeholder : true;

        // --- (已修改) 重写过滤逻辑 ---

        // 1. 商品过滤 (仅适用于 STOCK 账户)
        let commodityMatch = true;
        if (props.filterByCommodityGuid) {
            // 如果此过滤器开启，则必须是 STOCK 账户且商品 GUID 匹配
            commodityMatch = (acc.account_type === 'STOCK' && acc.commodity_guid === props.filterByCommodityGuid);
        }

        // 2. 货币过滤 (适用于所有类型)
        let currencyMatch = true;
        if (props.filterByCurrencyGuid) {
            if (acc.account_type === 'STOCK') {
                // 对于 STOCK 账户, 我们检查其 *父* 账户的货币
                if (!acc.parent_guid) {
                    currencyMatch = false;
                } else {
                    const parentAccount = allAccounts.value.find(p => p.guid === acc.parent_guid);
                    currencyMatch = parentAccount ? parentAccount.commodity_guid === props.filterByCurrencyGuid : false;
                }
            } else {
                // 对于非 STOCK 账户, 我们检查其 *自身* 的货币
                currencyMatch = acc.commodity_guid === props.filterByCurrencyGuid;
            }
        }
        // --- 逻辑结束 ---

        return typeMatch && selectableMatch && currencyMatch && commodityMatch;
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