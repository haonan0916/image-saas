<script setup lang='ts'>
import { onMounted, ref, watchEffect } from 'vue'
import { createApiClient } from '@image-saas/api'
import { UploaderButtonWithUploader } from '@image-saas/upload-button'
import { connect } from '@image-saas/preact-vue-connect'
import { createUploader } from '@image-saas/uploader'

defineOptions({
    name: 'Index',
})

const VueUploadButton = connect(UploaderButtonWithUploader)

const containerRef = ref<HTMLDivElement | null>(null)

const uploader = createUploader(async (file) => {
    const tokenResp = await fetch('/api/test');
    const token = await tokenResp.text();
    const apiClient = createApiClient({ signedToken: token });
    return apiClient?.file?.createPresignedUrl?.mutate({
        filename: file.data instanceof File ? file.data.name : "test",
        contentType: file.data instanceof File ? file.data.type : "",
        size: file.size || 0
    });
});

const uploaded = ref('')

function onFileUploaded(url: string, file: UppyFile<Meta, Body>) {
    uploaded.value = url;
}
</script>
<template>

<div>
    <VueUploadButton :onFileUploaded="onFileUploaded" :uploader="uploader">
        asdasd
    </VueUploadButton>
    <img :src="uploaded" >
</div>
</template>
<style scoped lang='scss'>

</style>