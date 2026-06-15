/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const { app, Tray, Menu } = require('electron')
const path = require('node:path')
const { getTrayIcon } = require('../shared/icons.utils.js')
const { requestAddAccount, requestFocusAccount } = require('./accountActions.ts')
const { listAccounts } = require('./accounts.service.ts')

let isAppQuitting = false

/**
 * Allow quitting the app if requested. It minimizes to a tray otherwise.
 */
app.on('before-quit', () => {
	isAppQuitting = true
})

/**
 * Build the tray context menu for a given account.
 *
 * @param {import('electron').BrowserWindow} browserWindow - Window associated with the tray
 * @param {import('./accounts.service.ts').Account} [account] - Account associated with the tray
 * @return {import('electron').Menu}
 */
function buildTrayMenu(browserWindow, account) {
	const accounts = listAccounts()
	const template = [
		{
			label: 'Open',
			click: () => browserWindow.show(),
		},
	]

	// When there is more than one account, allow quickly switching between them
	if (accounts.length > 1) {
		template.push({ type: 'separator' })
		for (const acc of accounts) {
			template.push({
				label: acc.id,
				type: 'radio',
				checked: account ? acc.id === account.id : false,
				click: () => requestFocusAccount(acc.id),
			})
		}
	}

	template.push(
		{ type: 'separator' },
		{
			label: 'Add another account…',
			click: () => requestAddAccount(),
		},
		{ type: 'separator' },
		{ role: 'quit' },
	)

	return Menu.buildFromTemplate(template)
}

/**
 * Setup tray with an icon that provides a context menu.
 *
 * @param {import('electron').BrowserWindow} browserWindow Browser window, associated with the tray
 * @param {import('./accounts.service.ts').Account} [account] Account associated with the tray
 * @return {import('electron').Tray} Tray instance
 */
function setupTray(browserWindow, account) {
	const icon = path.resolve(__dirname, getTrayIcon())
	const tray = new Tray(icon)
	tray.setToolTip(account?.id ? `${app.name} — ${account.id}` : app.name)
	tray.setContextMenu(buildTrayMenu(browserWindow, account))
	tray.on('click', () => browserWindow.show())

	browserWindow.on('close', (event) => {
		if (!isAppQuitting) {
			event.preventDefault()
			browserWindow.hide()
		}
	})

	browserWindow.on('closed', () => {
		tray.destroy()
	})

	return tray
}

module.exports = {
	setupTray,
}
