<template>
    <div class="form-container">
        <h1>{{ isEditMode ? $t('customers.edit_title') : $t('customers.create_title') }}</h1>

        <div v-if="isLoading" class="loading-message">{{ $t('loading') }}</div>
        <div v-if="error" class="error">{{ $t('errors.load_failed') }}: {{ error }}</div>

        <form @submit.prevent="handleSubmit" v-if="!isLoading">
            <FormError :error="apiError" />

            <fieldset>
                <legend>{{ $t('customers.details') }}</legend>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="name">{{ $t('customers.name') }}</label>
                        <input type="text" id="name" v-model="customer.name" required>
                    </div>
                    <div class="form-group">
                        <label for="id">{{ $t('customers.id') }}</label>
                        <input type="text" id="id" v-model="customer.id" required>
                    </div>

                    <div class="form-group">
                        <label for="active">{{ $t('customers.active') }}</label>
                        <select id="active" v-model="customer.active">
                            <option :value="true">Yes</option>
                            <option :value="false">No</option>
                        </select>
                    </div>
                    <div class="form-group full-width">
                        <label for="notes">{{ $t('customers.notes') }}</label>
                        <textarea id="notes" v-model="customer.notes" rows="3"></textarea>
                    </div>
                </div>
            </fieldset>

            <div class="form-actions">
                <router-link :to="{ name: 'CustomerList' }" class="btn-cancel">{{ $t('cancel') }}</router-link>
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
import { getCustomer, createCustomer, updateCustomer } from '../../services/salesService';
import { parseApiError } from '../../utils/errorHandler';
import FormError from '../../components/common/FormError.vue';
// (已移除) CurrencyPicker

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const guid = ref(route.params.guid || null);
const isEditMode = computed(() => !!guid.value);
const isLoading = ref(false);
const isSubmitting = ref(false);
const error = ref(null);
const apiError = ref(null);

// (已修改)
const customer = reactive({
    name: '',
    id: '',
    notes: '',
    active: true,
    // currency: '' // (已移除)
});

onMounted(async () => {
    if (isEditMode.value) {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await getCustomer(guid.value);
            Object.assign(customer, response.data);
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
            // (已修改)
            const updatePayload = {
                name: customer.name,
                id: customer.id,
                notes: customer.notes,
                active: customer.active
            };
            await updateCustomer(guid.value, updatePayload);
        } else {
            // (已修改)
            await createCustomer(customer);
        }
        router.push({ name: 'CustomerList' });
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

small {
    margin-top: 4px;
    font-size: 0.85em;
    color: #555;
}
</style>