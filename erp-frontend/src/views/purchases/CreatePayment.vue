<template>
    <div class="form-container">
        <h1>{{ $t('purchases.record_payment') }}</h1>
        <form @submit.prevent="handleSubmit">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('purchases.payment_details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="date">{{ $t('purchases.date') }}</label>
                        <input type="datetime-local" id="date" v-model="payment.date" required>
                    </div>
                    <div class="form-group">
                        <label for="amount">{{ $t('purchases.amount') }}</label>
                        <input type="number" step="0.01" min="0" id="amount" v-model.number="payment.amount" required>
                    </div>
                    <div class="form-group">
                        <label for="currency">{{ $t('vendors.currency') }}</label>
                        <CurrencyPicker id="currency" v-model="payment.currency_guid" required />
                    </div>
                    <div class="form-group">
                        <label for="checking_account">{{ $t('purchases.checking_account') }}</label>
                        <AccountPicker id="checking_account" v-model="payment.checking_account_guid"
                            accountTypes="ASSET" placeholder="Select Bank/Checking Account" required
                            :filterByCurrencyGuid="payment.currency_guid" />
                    </div>

                    <div class="form-group">
                        <label for="vendor">{{ $t('purchases.vendor') }}</label>
                        <VendorPicker id="vendor" v-model="payment.vendor_guid" placeholder="Select Vendor" required />
                    </div>
                    <div class="form-group full-width">
                        <label for="description">{{ $t('purchases.description') }}</label>
                        <input type="text" id="description" v-model="payment.description" required>
                    </div>
                </div>
            </fieldset>

            <div class="form-actions">
                <router-link :to="{ name: 'PurchaseBillList' }" class="btn-cancel">{{ $t('cancel') }}</router-link>
                <button type="submit" :disabled="isSubmitting" class="btn-submit">
                    {{ isSubmitting ? $t('submitting') : $t('purchases.record_payment') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createVendorPayment } from '../../services/purchaseService';
import { parseApiError } from '../../utils/errorHandler';
import { formatDateTimeForAPI } from '../../utils/formatters';
import AccountPicker from '../../components/common/AccountPicker.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';
import FormError from '../../components/common/FormError.vue';
import VendorPicker from '../../components/common/VendorPicker.vue';

const { t } = useI18n();
const router = useRouter();

const isSubmitting = ref(false);
const apiError = ref(null);
const getISODateTime = () => new Date().toISOString().slice(0, 16);

const payment = reactive({
    date: getISODateTime(),
    description: 'Vendor Payment',
    currency_guid: '',
    checking_account_guid: '',
    vendor_guid: '',
    amount: 0
});

// (新增) 侦听货币变化，重置银行账户
watch(() => payment.currency_guid, (newCurrency, oldCurrency) => {
    if (newCurrency !== oldCurrency) {
        payment.checking_account_guid = '';
    }
});

const handleSubmit = async () => {
    isSubmitting.value = true;
    apiError.value = null;

    try {
        const apiPayload = {
            date: formatDateTimeForAPI(payment.date),
            description: payment.description,
            currency_guid: payment.currency_guid,
            checking_account_guid: payment.checking_account_guid,
            vendor_guid: payment.vendor_guid,
            amount: payment.amount
        };

        await createVendorPayment(apiPayload);
        router.push({ name: 'PurchaseBillList' });

    } catch (error) {
        console.error("Failed to create payment:", error);
        apiError.value = parseApiError(error) || error.message;
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<style lang="scss" scoped>
@use "../../assets/form-styles.scss";

.form-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
}

.btn-cancel {
    background-color: #95a5a6;
    color: white;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    border-radius: 4px;
}
</style>