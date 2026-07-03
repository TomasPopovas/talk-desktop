/**
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const { BrowserWindow } = require('electron')
const { bindWebContentsToAccount, unbindWebContents } = require('../app/accounts.service.ts')
const { setupTray } = require('../app/app.tray.js')
const { getAppConfig } = require('../app/AppConfig.ts')
const { applyContextMenu } = require('../app/applyContextMenu.js')
const { applyDownloadHandler } = require('../app/downloads.ts')
const { applyExternalLinkHandler } = require('../app/externalLinkHandlers.ts')
const { getScaledWindowMinSize, getScaledWindowSize, applyZoom, buildTitle, getWindowUrl, getTitleBarSymbolColor } = require('../app/utils.ts')
const { applyWheelZoom } = require('../app/zoom.service.ts')
const { TITLE_BAR_HEIGHT } = require('../constants.js')
const { BUILD_CONFIG } = require('../shared/build.config.ts')
const { getBrowserWindowIcon } = require('../shared/icons.utils.js')

/**
 * Create a Talk window for an account.
 *
 * @param {import('../app/accounts.service.ts').Account} [account] - Account to bind the window to.
 *        When omitted, the window uses the default session (legacy single-account behaviour).
 * @return {import('electron').BrowserWindow}
 */
function createTalkWindow(account) {
	const zoomFactor = getAppConfig('zoomFactor')

	// Show the account id in the title when there is more than one account
	const accountLabel = account?.id ? account.id : undefined
	const title = accountLabel ? buildTitle(accountLabel) : buildTitle()

	const talkWindowOptions = {
		title,
		...getScaledWindowMinSize({
			minWidth: 600,
			minHeight: 400,
		}),
		backgroundColor: BUILD_CONFIG.backgroundColor,
		autoHideMenuBar: true,
		webPreferences: {
			preload: TALK_DESKTOP__WINDOW_TALK_PRELOAD_WEBPACK_ENTRY,
			zoomFactor,
			// Isolate the account into its own persistent session.
			// `undefined` keeps the default session for the primary account.
			...(account?.partition ? { partition: account.partition } : {}),
		},
		icon: getBrowserWindowIcon(),
		titleBarStyle: getAppConfig('systemTitleBar') ? 'default' : 'hidden',
		titleBarOverlay: {
			color: '#FFFFFF00',
			symbolColor: getTitleBarSymbolColor(),
			height: Math.round(TITLE_BAR_HEIGHT * zoomFactor),
		},
		// Position of the top left corner of the traffic light on Mac
		trafficLightPosition: {
			x: 12, // In line with SearchBox
			y: Math.round((TITLE_BAR_HEIGHT * zoomFactor - 16) / 2), // 16 is the default traffic light button diameter
		},
	}

	const window = new BrowserWindow({
		...talkWindowOptions,
		...getScaledWindowSize({
			width: 1400,
			height: 900,
		}),
		show: false,
	})

	// Bind this window's webContents to its account so the renderer receives
	// the correct appData via the `appData:get` IPC handler.
	if (account) {
		// Capture the id up front: in the `closed` handler the window is already
		// destroyed and accessing `window.webContents` would throw
		// "Object has been destroyed" and crash the main process.
		const webContentsId = window.webContents.id
		bindWebContentsToAccount(webContentsId, account)
		window.on('closed', () => unbindWebContents(webContentsId))
	}

	// TODO: return it on release
	/*
	if (process.env.NODE_ENV === 'production') {
		window.removeMenu()
	}
	 */

	applyExternalLinkHandler(window, {
		...talkWindowOptions,
		...getScaledWindowSize({
			width: 800,
			height: 600,
		}),
	})

	applyContextMenu(window)
	applyDownloadHandler(window)
	applyWheelZoom(window)
	applyZoom(window)

	setupTray(window, account)

	window.loadURL(getWindowUrl('talk', account?.appData?.serverUrl) + '#/apps/spreed')

	return window
}

module.exports = {
	createTalkWindow,
}
