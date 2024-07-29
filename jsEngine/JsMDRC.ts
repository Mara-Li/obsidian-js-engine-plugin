import { type MarkdownPostProcessorContext, MarkdownRenderChild, Menu, setIcon, type TAbstractFile, TFile } from 'obsidian';
import type JsEnginePlugin from 'jsEngine/main';

import { type JsExecutionContext, type JsExecution } from 'jsEngine/engine/JsExecution';
import { ResultRenderer } from 'jsEngine/engine/ResultRenderer';

export class JsMDRC extends MarkdownRenderChild {
	plugin: JsEnginePlugin;
	content: string;
	ctx: MarkdownPostProcessorContext;
	jsExecution: JsExecution | undefined;

	constructor(containerEl: HTMLElement, plugin: JsEnginePlugin, content: string, ctx: MarkdownPostProcessorContext) {
		super(containerEl);
		this.plugin = plugin;
		this.content = content;
		this.ctx = ctx;
	}

	getExecutionFile(): TFile | undefined {
		if (!this.ctx.sourcePath) {
			return undefined;
		}

		const abstractFile: TAbstractFile | null = this.plugin.app.vault.getAbstractFileByPath(this.ctx.sourcePath);
		if (!abstractFile) {
			return undefined;
		}

		if (abstractFile instanceof TFile) {
			return abstractFile;
		} else {
			return undefined;
		}
	}

	buildExecutionContext(): JsExecutionContext {
		// console.log(this.ctx);
		const file = this.getExecutionFile();
		return {
			file: file,
			metadata: file === undefined ? undefined : (this.plugin.app.metadataCache.getFileCache(file) ?? undefined),
			block: undefined,
		};
	}

	async tryRun(context: JsExecutionContext): Promise<JsExecution> {
		return this.plugin.jsEngine.execute({
			code: this.content,
			context: context,
			contextOverrides: {},
			component: this,
			container: this.containerEl,
		});
	}

	async renderResults(container: HTMLElement): Promise<void> {
		const context = this.buildExecutionContext();

		this.jsExecution = await this.tryRun(context);
		const result = this.jsExecution.result;

		const renderer = new ResultRenderer(this.plugin, container, this.ctx.sourcePath, this);
		await renderer.render(result);
	}

	renderExecutionStats(container: HTMLElement): void {
		const menu = new Menu();
		menu.addItem(item => {
			item.setTitle('Info');
			item.setIcon('info');
			item.onClick(() => {
				this.jsExecution?.openStatsModal();
			});
		});

		menu.addItem(item => {
			item.setTitle('Rerun');
			item.setIcon('rotate-ccw');
			item.onClick(() => {
				void this.render();
			});
		});

		const statsContainer = container.createDiv();

		statsContainer.addClass('js-engine-execution-stats-button');
		statsContainer.addEventListener('click', evt => {
			menu.showAtMouseEvent(evt);
		});
		setIcon(statsContainer, 'info');
	}

	async render(): Promise<void> {
		this.containerEl.empty();

		if (!this.containerEl.hasClass('js-engine-execution-render-child')) {
			this.containerEl.addClass('js-engine-execution-render-child');
		}

		try {
			await this.renderResults(this.containerEl);
			this.renderExecutionStats(this.containerEl);
		} catch (e) {
			this.containerEl.innerText = e instanceof Error ? (e.stack?.toString() ?? '') : (e as string);
			this.containerEl.addClass('mod-warning');
		}
	}

	async onload(): Promise<void> {
		// console.log('load');

		await this.render();
	}

	onunload(): void {
		// console.log('unload');
	}
}
