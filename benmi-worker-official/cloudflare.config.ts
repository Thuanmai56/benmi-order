import { bindings, triggers, defineConfig, type ConfigContext } from "cf/config";

/**
 * Wrangler environments are selected through ctx.mode and the cf --mode flag.
 * @see https://developers.cloudflare.com/workers/wrangler/environments/
 */

export default (ctx: ConfigContext) => {
	if (ctx.mode && !["dev", "test", "staging", "production"].includes(ctx.mode)) {
		throw new Error(`Unknown Cloudflare mode: ${ctx.mode}. Use dev, test, staging, or production.`);
	}
	switch (ctx.mode) {
		case "staging":
		case "test": {
			return defineConfig({
				accountId: "525bb177ae7306325d13269246769f50",
				worker: {
					name: "platform-worker-staging",
					compatibilityDate: "2026-03-28",
					entrypoint: "src/index.ts",
					workersDev: true,
					previewUrls: true,
					triggers: [triggers.scheduled({ schedule: "* * * * *" }), triggers.queue({ name: "order-cancellation-staging", deadLetterQueue: "order-cancellation-staging-dlq", maxBatchSize: 5, maxBatchTimeout: 1, maxRetries: 3, retryDelay: 30 })],
					observability: {
						enabled: true,
						headSamplingRate: 1,
						logs: {
							enabled: true,
							headSamplingRate: 1,
							persist: true,
							invocationLogs: true,
						},
						traces: {
							enabled: false,
							persist: true,
							headSamplingRate: 1,
						},
					},
					env: {
						AI: bindings.ai(),
						CANCELLATION_ENGINE_ENABLED: bindings.text("true"),
						CLEF_MODEL_VARIANT: bindings.text("@cf/cloudflare/clef"),
						LINE_WEBHOOK_SKIP_SIGNATURE: bindings.text("true"),
						CANCELLATION_QUEUE: bindings.queue({ name: "order-cancellation-staging" }),
						LIFF_ID: bindings.text("2009555608-DMioljsI"),
						LIFF_URL: bindings.text("https://liff.line.me/2009555608-DMioljsI"),
						DB: bindings.d1({
							name: "blab-db-test",
							id: "c0152835-7d42-4545-8cb4-6658dfc7e97d",
						}),
						ORDER_STATE: bindings.kv({
							id: "ad5b1e14aad4486fb2ffcd9961cadf3a",
						}),
						LINE_CHANNEL_TOKEN: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "LINE_MESSAGE_API_CHANNEL_BLAB",
						}),
						OPENROUTER_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "OPENROUTER_API_KEY_BLAB",
						}),
						GROQ_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "GROQ_API_KEY_BLAB",
						}),
					},
				},
			});
		}
		case "dev": {
			return defineConfig({
				accountId: "525bb177ae7306325d13269246769f50",
				worker: {
					name: "platform-worker-dev",
					compatibilityDate: "2026-03-28",
					entrypoint: "src/index.ts",
					workersDev: true,
					previewUrls: true,
					triggers: [triggers.scheduled({ schedule: "* * * * *" }), triggers.queue({ name: "order-cancellation-dev", deadLetterQueue: "order-cancellation-dev-dlq", maxBatchSize: 5, maxBatchTimeout: 1, maxRetries: 3, retryDelay: 30 })],
					observability: {
						enabled: true,
						headSamplingRate: 1,
						logs: {
							enabled: true,
							headSamplingRate: 1,
							persist: true,
							invocationLogs: true,
						},
						traces: {
							enabled: false,
							persist: true,
							headSamplingRate: 1,
						},
					},
					env: {
						AI: bindings.ai(),
						CANCELLATION_ENGINE_ENABLED: bindings.text("true"),
						CANCELLATION_QUEUE: bindings.queue({ name: "order-cancellation-dev" }),
						LIFF_ID: bindings.text("2011224566-kLLdMjkq"),
						LIFF_URL: bindings.text("https://liff.line.me/2011224566-kLLdMjkq"),
						DB: bindings.d1({
							name: "blab-db-dev",
							id: "40b67d8a-29e0-40c1-9ce2-b76f76864e95",
						}),
						ORDER_STATE: bindings.kv({
							id: "ad5b1e14aad4486fb2ffcd9961cadf3a",
						}),
						LINE_CHANNEL_TOKEN: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "LINE_MESSAGE_API_CHANNEL_BLAB",
						}),
						OPENROUTER_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "OPENROUTER_API_KEY_BLAB",
						}),
						GROQ_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "GROQ_API_KEY_BLAB",
						}),
					},
				},
			});
		}
		default: {
			return defineConfig({
				accountId: "525bb177ae7306325d13269246769f50",
				worker: {
					name: "benmi-worker-official",
					compatibilityDate: "2026-03-28",
					entrypoint: "src/index.ts",
					workersDev: true,
					previewUrls: true,
					triggers: [triggers.scheduled({ schedule: "* * * * *" }), triggers.queue({ name: "order-cancellation-production", deadLetterQueue: "order-cancellation-production-dlq", maxBatchSize: 5, maxBatchTimeout: 1, maxRetries: 3, retryDelay: 30 })],
					observability: {
						enabled: true,
						headSamplingRate: 1,
						logs: {
							enabled: true,
							headSamplingRate: 1,
							persist: true,
							invocationLogs: true,
						},
						traces: {
							enabled: false,
							persist: true,
							headSamplingRate: 1,
						},
					},
					env: {
						AI: bindings.ai(),
						CANCELLATION_ENGINE_ENABLED: bindings.text("false"),
						CANCELLATION_QUEUE: bindings.queue({ name: "order-cancellation-production" }),
						LIFF_ID: bindings.text("2009560906-c5taZfiY"),
						LIFF_URL: bindings.text("https://liff.line.me/2009560906-c5taZfiY"),
						DB: bindings.d1({
							name: "blab-db-production",
							id: "48479f91-eec7-4da2-b044-edaaf622f195",
						}),
						ORDER_STATE: bindings.kv({
							id: "4800c4ce106043de89baa2aa7a7676b0",
						}),
						LINE_CHANNEL_TOKEN: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "LINE_MESSAGE_API_CHANNEL_BENMI",
						}),
						LINE_TOKEN_BSC: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "LINE_MESSAGE_API_CHANNEL_BSC",
						}),
						OPENROUTER_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "OPENROUTER_API_KEY_BLAB",
						}),
						GROQ_API_KEY: bindings.secretsStoreSecret({
							storeId: "7e2896f1c5cf4e1eb80ef6c89f3024d4",
							secretName: "GROQ_API_KEY_BENMI",
						}),
					},
				},
			});
		}
	}
};
