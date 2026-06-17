/*
 * SPDX-FileCopyrightText: 2025 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import type { IpcMainEvent } from 'electron'
import type { UntrustedCertificateDetails } from '../app/certificate.service.ts'

import { BrowserWindow, ipcMain } from 'electron'
import { applyContextMenu } from '../app/applyContextMenu.js'
import { applyZoom, buildTitle, getScaledWindowMinSize, getScaledWindowSize, getWindowUrl, onReadyToShow } from '../app/utils.ts'
import { getBrowserWindowIcon } from '../shared/icons.utils.js'

/**
 * Show untrusted certificate dialog window
 *
 * @param parentWindow - Parent browser window
 * @param details - Error details
 * @return Whether user accept the certificate
 */
export function showCertificateTrustDialog(parentWindow: BrowserWindow | undefined, details: UntrustedCertificateDetails) {
	// Only attach to a live parent. The parent window may already be destroyed
	// by the time an async certificate prompt fires (e.g. while the login window
	// is closing), and `new BrowserWindow({ parent: <destroyed> })` would throw
	// "Object has been destroyed" and crash the main process.
	const liveParent = parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined
	const window = new BrowserWindow({
		title: buildTitle(),
		...getScaledWindowSize({
			width: 600,
			height: 600,
		}),
		...getScaledWindowMinSize({
			minWidth: 320,
			minHeight: 256,
		}),
		...(liveParent ? { parent: liveParent, modal: true } : {}),
		show: false,
		maximizable: false,
		minimizable: false,
		center: true,
		fullscreenable: false,
		autoHideMenuBar: true,
		webPreferences: {
			preload: TALK_DESKTOP__WINDOW_CERTIFICATE_PRELOAD_WEBPACK_ENTRY,
		},
		icon: getBrowserWindowIcon(),
	})

	applyContextMenu(window)
	applyZoom(window)
	window.removeMenu()
	onReadyToShow(window, () => window.show())

	window.loadURL(getWindowUrl('certificate') + '#' + encodeURIComponent(JSON.stringify(details)))

	return new Promise<boolean>((resolve) => {
		let isAccepted = false

		const onCertificateAccept = (event: IpcMainEvent, accepted: boolean) => {
			if (event.sender !== window.webContents) {
				return
			}
			isAccepted = accepted
			window.close()
		}

		ipcMain.once('certificate:accept', onCertificateAccept)

		window.on('closed', () => {
			ipcMain.off('certificate:accept', onCertificateAccept)
			resolve(isAccepted)
		})
	})
}
