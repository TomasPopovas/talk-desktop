/**
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const { app, Tray, Menu } = require('electron')
const path = require('node:path')
const { getTrayIcon } = require('../shared/icons.utils.js')
const { requestAddAccount, requestFocusAccount, requestFocusActive } = require('./accountActions.ts')
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
function buildTrayMenu(account) {
	const accounts = listAccounts()
	const template = [
		{
			label: 'Open',
			click: () => requestFocusActive(),
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
/** Single shared tray instance for the whole application */
let trayInstance = null

/**
 * Update the shared tray menu and tooltip to reflect the active account.
 *
 * @param {import('./accounts.service.ts').Account} [activeAccount] - Currently active account
 */
function updateTrayMenu(activeAccount) {
	if (!trayInstance || trayInstance.isDestroyed()) {
		return
	}
	trayInstance.setToolTip(activeAccount?.id ? `${app.name} — ${activeAccount.id}` : app.name)
	trayInstance.setContextMenu(buildTrayMenu(activeAccount))
}

function setupTray(browserWindow, account) {
	// Minimize to tray instead of closing (per window)
	browserWindow.on('close', (event) => {
		if (!isAppQuitting && !browserWindow.isDestroyed()) {
			event.preventDefault()
			browserWindow.hide()
		}
	})

	// The tray icon is shared between all account windows
	if (!trayInstance || trayInstance.isDestroyed()) {
		const icon = path.resolve(__dirname, getTrayIcon())
		trayInstance = new Tray(icon)
		trayInstance.on('click', () => requestFocusActive())
	}

	updateTrayMenu(account)

	return trayInstance
}

module.exports = {
	setupTray,
	updateTrayMenu,
}
