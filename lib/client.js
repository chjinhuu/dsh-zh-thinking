window.__ModuleLoader__.load({
	id: "dsh-zh-thinking",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");

		/** Host entry id, which is also the settings namespace the packages declares. */
		const NS = "zh-thinking";
		/** Key under which this bundle's row page is looked up on the Plugins page. */
		const ROW_KEY = "dsh-zh-thinking#zh-thinking";

		const title = "中文思考";
		const hint =
			"让模型在推理（reasoning）通道里用中文书写。关掉后四条提示词注册全部撤下，等于没装这个插件，但插件仍留在 profile 里。";

		/**
		 * The row's configuration page: one switch over `enabled`.
		 *
		 * The page host hands the row's form to `plugins.row.config`, but a bare
		 * checkbox does not need the staged form machinery: reading the accepted
		 * value and writing a single `set` operation is enough, and it applies
		 * immediately instead of waiting for a Save.
		 *
		 * @param props - the view asked for (`page` or `summary`) and the scope injected below.
		 * @returns the row's description, or its switch.
		 */
		function ZhReasoningRow(props) {
			const scope = props.scope;
			const enabled = React.useSyncExternalStore(
				(listener) => scope.subscribe(listener),
				() => scope.getSnapshot().value?.enabled ?? true,
			);
			const writable = scope.getSnapshot().writable !== false;

			if (props.view === "summary") {
				return enabled ? `${title}：已启用` : `${title}：已关闭`;
			}

			return React.createElement(
				"div",
				{ style: { display: "grid", gap: "6px", padding: "4px 0" } },
				React.createElement(
					"label",
					{
						style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: writable ? "pointer" : "default",
						},
					},
					React.createElement("input", {
						type: "checkbox",
						checked: enabled,
						disabled: !writable,
						onChange: (event) => {
							void scope.set("enabled", event.target.checked).catch(() => {});
						},
					}),
					React.createElement("span", { style: { fontWeight: 600 } }, title),
				),
				React.createElement("p", {
					style: { margin: 0, fontSize: "12px", lineHeight: 1.6, opacity: 0.75 },
					children: hint,
				}),
			);
		}

		const inject = ["slots", "locale", "configForms"];

		/**
		 * Mount the switch on the Plugins page while the Host serves the namespace.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			ctx.effect(
				() =>
					ctx.configForms.whileServed([NS], () => {
						// The form only exists once the Host serves the namespace, so it is
						// read inside the served callback rather than at mount time.
						const scope = ctx.configForms.get(NS);
						return ctx.slots.inject("plugins.row.config", () =>
							ctx.slots.register(
								{
									name: "plugins.row.config",
									id: ROW_KEY,
									key: ROW_KEY,
									order: 10,
									label: () => title,
									inject: () => ({ scope }),
								},
								ZhReasoningRow,
							),
						);
					}),
				"zh-thinking: plugins page",
			);
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});