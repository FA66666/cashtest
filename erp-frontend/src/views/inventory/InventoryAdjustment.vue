<template>
    <div class="form-container">
        <h1>{{ $t('inventory.adjust') }}</h1>

        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('inventory.adjustment_details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="commodity">{{ $t('inventory.item_name') }}</label>
                        <CommodityPicker id="commodity" v-model="adjustment.commodity_guid"
                            placeholder="Select Item to Adjust" required @itemSelected="onItemSelected" />
                    </div>

                    <div class="form-group">
                        <label for="currency">{{ $t('reports.report_currency') }}</label>
                        <CurrencyPicker id="currency" v-model="adjustment.currency_guid"
                            placeholder="Select Cost Currency" required />
                    </div>

                    <div class="form-group">
                        <label for="quantity_change">{{ $t('inventory.quantity_change') }}</label>
                        <input type="number" step="0.01" id="quantity_change"
                            v-model.number="adjustment.quantity_change" required>
                        <small>{{ $t('inventory.quantity_note') }}</small>
                    </div>
                    <div class="form-group">
                        <label for="cost_per_unit">{{ $t('inventory.cost_per_unit') }}</label>
                        <input type="number" step="0.01" min="0" id="cost_per_unit"
                            v-model.number="adjustment.cost_per_unit" required>
                        <small>({{ $t('inventory.cost_currency_note') }})</small>
                    </div>

                    <div class="form-group full-width">
                        <label for="expense_account">{{ $t('inventory.adjustment_account') }}</label>
                        <AccountPicker id="expense_account" v-model="adjustment.adjustment_expense_account_guid"
                            accountTypes="EXPENSE" placeholder="Select Adjustment Account (must match currency)"
                            required :filterByCurrencyGuid="adjustment.currency_guid" />
                    </div>
                    <div class="form-group full-width">
                        <label for="notes">{{ $t('inventory.notes') }}</label>
                        <input type="text" id="notes" v-model="adjustment.notes">
                    </div>
                </div>
            </fieldset>

            <button type="submit" :disabled="isLoading" class="btn-submit">
                {{ isLoading ? $t('submitting') : $t('inventory.submit_adjustment') }}
            </button>
        </form>
    </div>
</template>

<script setup>
// (修改) 导入 watch
import { ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { adjustInventory } from '../../services/inventoryService';
import { parseApiError } from '../../utils/errorHandler';
import AccountPicker from '../../components/common/AccountPicker.vue';
import FormError from '../../components/common/FormError.vue';
import CommodityPicker from '../../components/common/CommodityPicker.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';

const { t } = useI18n();
const router = useRouter();

const isLoading = ref(false);
const apiError = ref(null);

const adjustment = reactive({
    commodity_guid: '',
    currency_guid: '',
    adjustment_expense_account_guid: '',
    quantity_change: 0,
    cost_per_unit: 0,
    notes: ''
});

// (新增) 当商品被选中时，自动设置货币
const onItemSelected = (item) => {
    if (item && item.valuation_currency_guid) {
        adjustment.currency_guid = item.valuation_currency_guid;
    }
};

// (新增) 侦听货币变化，重置费用科目
watch(() => adjustment.currency_guid, (newCurrency, oldCurrency) => {
    if (newCurrency !== oldCurrency) {
        adjustment.adjustment_expense_account_guid = '';
    }
});

const handleSubmit = async () => {
    isLoading.value = true;
    apiError.value = null;
    try {
        await adjustInventory(adjustment);
        router.push({ name: 'Inventory' });
    } catch (err) {
        apiError.value = parseApiError(err);
    } finally {
        isLoading.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";

small {
    margin-top: 4px;
    font-size: 0.85em;
    color: #555;
}
</style>