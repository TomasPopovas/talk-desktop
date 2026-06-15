/*!
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const { session } = require('electron')

/**
 * Patch requests on a session to inject the account's Basic-Auth credentials.
 *
 * The interceptor is registered on the provided session instead of always on
 * the default session, so that several accounts - each running in its own
 * session partition - can be authenticated independently at the same time.
 *
 * @param {string} serverUrl - Nextcloud server URL
 * @param {object} [options] - Patching options
 * @param {import('./accounts.service.ts').Account['appData']['credentials']} [options.credentials] - User credentials for the Authentication header
 * @param {import('electron').Session} [options.session] - Target session (defaults to the default session)
 */
function enableWebRequestInterceptor(serverUrl, { credentials, session: targetSession } = {}) {
	const ses = targetSession || session.defaultSession

	// Electron allows only a single onBeforeSendHeaders listener per session.
	// Registering a new one replaces the previous, so there is no need to disable first.
	ses.webRequest.onBeforeSendHeaders(
		{
			urls: [`${serverUrl}/*`],
			// types: ['xhr', 'image', 'media', 'webSocket', 'ping'],
		},
		(details, callback) => {
			// TODO: For performance, only add Authorization header if there is no session Cookies
			callback({
				requestHeaders: {
					...details.requestHeaders,
					Origin: new URL(serverUrl).origin,
					Authorization: `Basic ${btoa(`${credentials.user}:${credentials.password}`)}`,
					'OCS-APIRequest': 'true',
				},
			})
		},
	)
}

/**
 * Disable any request patching on a session.
 *
 * @param {import('electron').Session} [targetSession] - Target session (defaults to the default session)
 */
function disableWebRequestInterceptor(targetSession) {
	const ses = targetSession || session.defaultSession
	ses.webRequest.onBeforeSendHeaders(null)
}

module.exports = {
	enableWebRequestInterceptor,
	disableWebRequestInterceptor,
}
