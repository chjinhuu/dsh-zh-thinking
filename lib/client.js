window.__ModuleLoader__.load({
	id: "dsh-zh-thinking",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");

		/** Host entry id, which is also the settings namespace the package declares. */
		const NS = "zh-thinking";
		const title = "中文思考";

		/**
		 * The settings section: one switch over `enabled`.
		 *
		 * The Host serves the namespace as soon as the entry declares a `Config`,
		 * so the scope is read inside `whileServed` rather than at mount time. A
		 * single checkbox does not need staged saving: writing one `set` operation
		 * applies immediately, and the patch file it lands in is hot-reloaded.
		 *
		 * @param props - the scope injected by the slot registration.
		 * @returns the section body.
		 */
		function ZhThinkingSection(props) {
			const scope = props.scope;
			const enabled = React.useSyncExternalStore(
				(listener) => scope.subscribe(listener),
				() => scope.getSnapshot().value?.enabled ?? true,
			);
			const writable = scope.getSnapshot().writable !== false;

			return React.createElement(
				"section",
				{ style: { display: "grid", gap: "10px", maxWidth: "680px", padding: "16px 0" } },
				React.createElement("h2", { style: { margin: 0, fontSize: "17px" } }, title),
				React.createElement(
					"p",
					{ style: { margin: 0, fontSize: "13px", lineHeight: 1.7, opacity: 0.75 } },
					"让模型在推理（reasoning）通道里用简体中文书写，不只是用中文回答。提示词会贴在每一次请求的首尾；关掉开关后所有注册全部撤下，等于没装这个插件。",
				),
				React.createElement(
					"label",
					{
						style: {
							display: "flex",
							alignItems: "center",
							gap: "8px",
							cursor: writable ? "pointer" : "default",
							padding: "4px 0",
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
					React.createElement("span", { style: { fontWeight: 600 } }, "在每次请求中提醒模型用中文思考"),
				),
				React.createElement(
					"p",
					{ style: { margin: 0, fontSize: "12px", lineHeight: 1.6, opacity: 0.6 } },
					enabled
						? "当前：已启用。新开的会话立即生效，已经跑起来的长会话建议重启 DSH 后再对比。"
						: "当前：已关闭。插件仍留在 profile 里，重新打开即恢复。",
				),
			);
		}

		const inject = ["slots", "locale", "configForms"];

		/**
		 * Mount the section while the Host serves the namespace.
		 * @param ctx - the browser plugin context.
		 */
		function apply(ctx) {
			ctx.effect(
				() =>
					ctx.configForms.whileServed([NS], () => {
						const scope = ctx.configForms.get(NS);
						return ctx.slots.inject("settings.section", () =>
							ctx.slots.register(
								{
									name: "settings.section",
									id: "zh-thinking",
									order: 60,
									label: () => title,
									inject: () => ({ scope }),
								},
								ZhThinkingSection,
							),
						);
					}),
				"zh-thinking: settings section",
			);
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});