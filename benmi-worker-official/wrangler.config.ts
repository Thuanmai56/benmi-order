import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig((ctx) => {
	switch (ctx.mode) {
		case "test": {
			return {
				types: {
					generate: false,
				},
			};
		}
		case "dev": {
			return {
				types: {
					generate: false,
				},
			};
		}
		default: {
			return {
				types: {
					generate: false,
				},
			};
		}
	}
});
