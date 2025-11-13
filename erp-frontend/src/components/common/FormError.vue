<template>
    <div v-if="error" class="form-error">
        <p v-if="typeof error === 'string'">{{ error }}</p>

        <ul v-if="Array.isArray(error)">
            <li v-for="(err, index) in error" :key="index">
                {{ err.path }}: {{ err.msg }}
            </li>
        </ul>
    </div>
</template>

<script setup>
defineProps({
    error: [String, Array]
});
</script>

<style lang="scss">
.form-error {
    background-color: #ffebeB;
    color: #c0392b;
    border: 1px solid #e74c3c;
    border-radius: 4px;
    padding: 1rem;
    margin: 1rem 0;

    p,
    ul {
        margin: 0;
    }

    ul {
        padding-left: 20px;
    }
}
</style>