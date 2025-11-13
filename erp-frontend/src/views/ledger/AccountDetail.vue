<template>
    <div class="form-container">
        <h1>{{ isEditMode ? $t('ledger.edit_title') : $t('ledger.create_title') }}</h1>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <form @submit.prevent="handleSubmit" v-if="!isLoading">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('ledger.details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="name">{{ $t('ledger.name') }}</label>
                        <input type="text" id="name" v-model="account.name" required>
                    </div>
                    <div class="form-group">
                        <label for="code">{{ $t('ledger.code') }}</label>
                        <input type="text" id="code" v-model="account.code">
                    </div>
                    <div class="form-group">
                        <label for="type">{{ $t('ledger.type') }}</label>
                        <select id="type" v-model="account.account_type" required>
                            <option value="ASSET">ASSET</option>
                            <option value="LIABILITY">LIABILITY</option>
                            <option value="EQUITY">EQUITY</option>
                            <option value="INCOME">INCOME</option>
                            <option value="EXPENSE">EXPENSE</option>
                            <option value="STOCK">STOCK</option>
                            <option value="CURRENCY">CURRENCY</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="commodity">{{ $t('ledger.currency') }}</label>
                        <CurrencyPicker id="commodity" v-model="account.commodity_guid" required />
                    </div>
                    <div class="form-group">
                        <label for="parent">{{ $t('ledger.parent') }}</label>
                        <AccountPicker id="parent" v-model="account.parent_guid"
                            :accountTypes="['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']"
                            :selectableOnly="false" placeholder="Select Parent (optional)" />
                    </div>
                    <div class="form-group">
                        <label for="placeholder">{{ $t('ledger.placeholder') }}</label>
                        <select id="placeholder" v-model="account.placeholder">
                            <option :value="true">Yes</option>
                            <option :value="false">No</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <div class="form-actions">
                <router-link :to="{ name: 'AccountList' }" class="btn-cancel">{{ $t('cancel') }}</router-link>
                <button type="submit" :disabled="isSubmitting" class="btn-submit">
                    {{ isSubmitting ? $t('submitting') : $t('save') }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAccount, createAccount, updateAccount } from '../../services/ledgerService';
import { parseApiError } from '../../utils/errorHandler';
import FormError from '../../components/common/FormError.vue';
import CurrencyPicker from '../../components/common/CurrencyPicker.vue';
import AccountPicker from '../../components/common/AccountPicker.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const guid = ref(route.params.guid || null);
const isEditMode = computed(() => !!guid.value);
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref(null);
const apiError = ref(null);

const account = reactive({
    name: '',
    code: '',
    account_type: 'EXPENSE',
    commodity_guid: '',
    parent_guid: null,
    placeholder: false
});

onMounted(async () => {
    if (isEditMode.value) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await getAccount(guid.value);
            Object.assign(account, response.data);
        } catch (err) {
            error.value = parseApiError(err);
        } finally {
            isLoading.value = false;
        }
    }
});

async function handleSubmit() {
    isSubmitting.value = true;
    apiError.value = null;
    try {
        if (isEditMode.value) {
            await updateAccount(guid.value, account);
        } else {
            await createAccount(account);
        }
        router.push({ name: 'AccountList' });
    } catch (err) {
        apiError.value = parseApiError(err);
    } finally {
        isSubmitting.value = false;
    }
}
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