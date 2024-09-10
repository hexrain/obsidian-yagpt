import { App, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, requestUrl, RequestUrlParam } from 'obsidian';


// Remember to rename these classes and interfaces!

interface YaGPTPluginSettings {
	bearerToken: string;
	folderId: string;
}

const DEFAULT_SETTINGS: YaGPTPluginSettings = {
	bearerToken: 'default',
	folderId: 'some folder id'
}

export default class YaGPTPlugin extends Plugin {
	settings: YaGPTPluginSettings;


	getClassifyPrompt(): string {
		return "Пользователь ведет заметки в стиле zettelkasten. Определи, к какому типу относится заметка, которую пришлет пользоватеель. Fleeting note, Permanent note, Literature note. ответь только типом заметки"
	}


	async readActiveFile(): Promise<string> {
		let activeFile = this.app.workspace.getActiveFile()
		if (activeFile == null) {
			return "empty file"
		} else {
			return await this.app.vault.read(activeFile);
		}
	}

	async getBody(): Promise<string> {
		let params = {
			modelUri: `gpt://${this.settings.folderId}/yandexgpt-lite`,
			completionOptions: {
				stream: false,
				temperature: 0.1,
				maxTokens: "1000"
			},
			messages: [
				{
					role: "system",
					text: this.getClassifyPrompt()
				},
				{
					role: "user",
					text: await this.readActiveFile()
				}
			]
		}

		return JSON.stringify(params)
	}

	async classifyNote() {
		let params: RequestUrlParam = {
			method: "POST",
			url: "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
			body: await this.getBody(),
			headers: {
				"Accept": "application/json",
				"Authorization": `Bearer ${this.settings.bearerToken}`
			}
		};

		let response = await requestUrl(params);
		console.log(response.text)


		new SampleModal(this.app, response.json.result.alternatives[0].message.text).open();

	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			this.classifyNote();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		this.addCommand({
			id: 'obsidian-yagpt-classify-note',
			name: 'Classify Note',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						this.classifyNote();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	text: string;

	constructor(app: App, text: string) {
		super(app);
		this.text = text;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.text);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: YaGPTPlugin;

	constructor(app: App, plugin: YaGPTPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Bearer Token')
			.setDesc('Debug setting before auth is implemented')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.bearerToken)
				.onChange(async (value) => {
					this.plugin.settings.bearerToken = value;
					await this.plugin.saveSettings();
				}));


		new Setting(containerEl)
			.setName('Folder Id')
			.setDesc('Folder Id')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.folderId)
				.onChange(async (value) => {
					this.plugin.settings.folderId = value;
					await this.plugin.saveSettings();
				}));
	}
}
