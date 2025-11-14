<template>
    <div class="form-container">
        <h1>{{ $t('inventory.create_item') }}</h1>

        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('inventory.item_details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="fullname">{{ $t('inventory.item_name') }}</label>
                        <input type="text" id="fullname" v-model="item.fullname" required>
                    </div>
                    <div class="form-group">
                        <label for="mnemonic">{{ $t('inventory.mnemonic') }} (SKU)</label>
                        <input type="text" id="mnemonic" v-model="item.mnemonic" required>
                    </div>
                    <div class="form-group full-width">
                        <label for="parent_account">{{ $t('inventory.valuation_currency') }}</label>
                        <AccountPicker id="parent_account" v-model="item.parent_inventory_account_guid"
                            :accountTypes="['ASSET']" :selectableOnly="false"
                            :placeholder="$t('inventory.select_valuation_account')" required />
                        <small>{{ $t('inventory.valuation_help') }}</small>
                    </div>
                </div>
            </fieldset>

            <button type="submit" :disabled="isLoading" class="btn-submit">
                {{ isLoading ? $t('submitting') : $t('inventory.create_item_btn') }}
            </button>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createStockItem } from '../../services/commoditiesService';
import { parseApiError } from '../../utils/errorHandler';
import AccountPicker from '../../components/common/AccountPicker.vue';
import FormError from '../../components/common/FormError.vue';

const { t } = useI18n();
const router = useRouter();

const isLoading = ref(false);
const apiError = ref(null);

const item = reactive({
    fullname: '',
    mnemonic: '',
    parent_inventory_account_guid: 'a0000000000000000000000000000007' // 默认为 USD
});

const handleSubmit = async () => {
    isLoading.value = true;
    apiError.value = null;
    try {
        await createStockItem(item);
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