var extend = require('xtend'),
	request = require('request'),
	querystring = require('querystring'),
	BlueBird = require('bluebird'),
	PromiseRetryer = require('promise-retryer')(BlueBird),
	PromiseObject = require('promise-object')(BlueBird),
	debug = require('debug')('http'),
	colors = require('colors'),
	Joi = require('joi');

BlueBird.promisifyAll(Joi);

/**
 * Digitalocean API Client
 */
var DigitalOcean = PromiseObject.create({
	initialize: function ($config) {
		this._token = $config.token;
		this._itemsPerPage = $config.itemsPerPage || 100;
		this._maxRetries = $config.maxRetries || 5;
		this._raw = $config.raw || false;
	},

	API_URL: 'https://api.digitalocean.com/v2',

	_request: function ($deferred, schema, payload, raw) {
		var hasQuery = !!(payload && payload.query),
			hasBody = !!(payload && payload.body);

		schema = schema || {};
		payload = payload || {};

		payload.raw = raw;

		if (hasQuery) {
			payload.query = extend({
				page: 1,
				per_page: this._itemsPerPage
			}, payload.query);
		}

		if (hasBody) {
			if (hasQuery && payload.body.per_page) {
				payload.query.per_page = payload.body.per_page;
				delete payload.body.per_page;
			}

			if (hasQuery && payload.body.page) {
				payload.query.page = payload.body.page;
				delete payload.body.page;
			}
		}

		schema.path = Joi.string().required();
		schema.callee = Joi.string().required();
		schema.required = Joi.string();
		schema.method = Joi.valid(['GET', 'POST', 'PUT', 'DELETE']).required();
		schema.query = extend({
			per_page: Joi.number(),
			page: Joi.number()
		}, schema.query);
		schema.raw = Joi.boolean();

		$deferred.resolve(this._validateAndMakeRequest(schema, payload));
	},

	_tryRequest: function($deferred, $self, $config) {
		$config.query = extend({}, $config.query);
		$config.body = extend({}, $config.body);

		var getURL = this.API_URL + '/' + $self._resolvePath($config.path, $config.params) + (Object.keys($config.query).length ? '?' + querystring.stringify($config.query) : ''); // Construct URL with parameters

		$deferred.resolve(PromiseRetryer.run({
			delay: function (attempt) {
				return attempt * 1000;
			},
			maxRetries: $self._maxRetries,
			onAttempt: function (attempt) {
				if (attempt === 1) {
					debug(('[doapi] ' + $config.method + ' "' + getURL + '"')[attempt > 1 ? 'red' : 'grey']);
				} else {
					debug(('[doapi attempt ' + attempt + '] ' + $config.method + ' "' + getURL + '"')[attempt > 1 ? 'red' : 'grey']);
				}
			},
			promise: function (attempt) {
				return new BlueBird(function (resolve, reject) {
					request(
						{
							method: $config.method,
							url: getURL,
							json: true,
							headers: {
								Authorization: "Bearer " + $self._token
							},
							body: $config.body
						},
						function(error, response, body) {
							if (error) {
								return reject(new Error(
									'Request Failed: ' + error
								));
							}

							var ratelimit, requestinfo;

							if (response && response.headers) {
								ratelimit = {
									limit: response.headers['ratelimit-limit'],
									remaining: response.headers['ratelimit-remaining'],
									reset: response.headers['ratelimit-reset']
								};

								requestinfo = {
									id: response.headers['x-request-id'],
									runtime: response.headers['x-runtime'],
								};
							}

							if (body && (response.statusCode < 200 || response.statusCode > 299)) {
								return reject(new Error(
									'\nRequest Details: ' + JSON.stringify(requestinfo) +
									'\nAPI Error: ' + (body.description || body.message)
								));
							} else if ($config.required && !body[$config.required]) {
								return reject(new Error(
									'\nRequest Details: ' + JSON.stringify(requestinfo) +
									'\nAPI Error: Response was missing required field (' + $config.required + ')'
								));
							} else {
								if ($config.raw || $self._raw && $config.raw !== false) {
									body.ratelimit = ratelimit;
									body.requestinfo = requestinfo;

									resolve(body || {});
								} else if ($config.required) {
									resolve(body[$config.required] || {});
								} else {
									resolve(body || {});
								}
							}
						}
					);
				});
			}
		}));
	},

	_resolvePath: function (path, params) {
		return path.replace(/\:([a-z0-9_-]+)\b/gi, function (string, match) {
			return params.hasOwnProperty(match) ? params[match] : string;
		});
	},

	_validateAndMakeRequest: function ($deferred, $self, schema, payload) {
		Joi.validateAsync(payload, schema, {abortEarly: false})
			.then(function () {
				$deferred.resolve($self._tryRequest(payload));
			})
			.catch(function (error) {
				var errorMessage = ('DigitalOceanApiError: validation error when calling "' + payload.callee + '"\n[' + payload.method + '] /' + $self._resolvePath(payload.path, payload.params) + '\n').red;

				errorMessage += error.annotate();

				$deferred.reject(errorMessage);
			});
	},

	/**
	 * Get User Information
	 */
	accountGet: function ($deferred, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'accountGet',
			method: 'GET',
			path: 'account',
			required: 'account'
		}, raw));
	},


	/**
	 * Show All Active Droplets
	 *
	 * This method returns all active droplets that are currently running in your account. All available API information is presented for each droplet.
	 */
	dropletGetAll: function ($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'dropletGetAll',
			method: 'GET',
			path: 'droplets',
			required: 'droplets',
			query: query || {}
		}, raw));
	},


	/**
	 * New Droplet
	 *
	 * This method allows you to create a new droplet. See the required parameters section below for an explanation of the variables that are needed to create a new droplet.
	 */
	dropletNew: function($deferred, body, raw) {
		$deferred.resolve(this._request({
			body: {
				name: Joi.string().required(),
				region: Joi.string().required(),
				size: Joi.string().required(),
				image: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
				ssh_keys: Joi.array().items(Joi.string(), Joi.number()),
				backups: Joi.boolean(),
				ipv6: Joi.boolean(),
				private_networking: Joi.boolean(),
				user_data: Joi.string()
			}
		}, {
			callee: 'dropletNew',
			method: 'POST',
			path: 'droplets',
			required: 'droplet',
			body: body || {}
		}, raw));
	},

	/**
	 * List all available Kernels for a Droplet
	 */
	dropletKernelsGetAll: function($deferred, id, query, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletKernelsGetAll',
			method: 'GET',
			path: 'droplets/:droplet_id/kernels',
			required: 'kernels',
			params: {
				droplet_id: id
			},
			query: query || {}
		}, raw));
	},

	/**
	 * List snapshots for a Droplet
	 */
	dropletSnapshotsGetAll: function($deferred, id, query, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletSnapshotsGetAll',
			method: 'GET',
			path: 'droplets/:droplet_id/snapshots',
			required: 'snapshots',
			params: {
				droplet_id: id
			},
			query: query || {}
		}, raw));
	},

	/**
	 * List backups for a Droplet
	 */
	dropletBackupsGetAll: function($deferred, id, query, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletBackupsGetAll',
			method: 'GET',
			path: 'droplets/:droplet_id/backups',
			required: 'backups',
			params: {
				droplet_id: id
			},
			query: query || {}
		}, raw));
	},

	/**
	 * List actions for a Droplet
	 */
	dropletActionGetAll: function($deferred, id, query, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletActionGetAll',
			method: 'GET',
			path: 'droplets/:droplet_id/actions',
			required: 'actions',
			params: {
				droplet_id: id
			},
			query: query || {}
		}, raw));
	},

	/**
	 * List Neighbors for a Droplet
	 */
	dropletNeighborsGetAll: function($deferred, id, query, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletNeighborsGetAll',
			method: 'GET',
			path: 'droplets/:droplet_id/neighbors',
			required: 'droplets',
			params: {
				droplet_id: id
			},
			query: query || {}
		}, raw));
	},

	/**
	 * List all Droplet Neighbors
	 */
	reportDropletNeighborsGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'reportDropletNeighborsGetAll',
			method: 'GET',
			path: 'reports/droplet_neighbors',
			required: 'neighbors',
			query: query || {}
		}, raw));
	},

	/**
	 * List Droplet Upgrades
	 *
	 * list of droplets that are scheduled to be upgraded
	 */

	dropletUpgradesGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'dropletUpgradesGetAll',
			method: 'GET',
			path: 'droplet_upgrades',
			query: query || {}
		}, raw));
	},


	/**
	 * Show Droplet
	 *
	 * This method returns full information for a specific droplet ID that is passed in the URL.
	 */
	dropletGet: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletGet',
			method: 'GET',
			path: 'droplets/:droplet_id',
			required: 'droplet',
			params: {
				droplet_id: id
			}
		}, raw));
	},

	/**
	 * Reboot Droplet
	 *
	 * This method allows you to reboot a droplet. This is the preferred method to use if a server is not responding.
	 */
	dropletReboot: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletReboot',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'reboot'
			}
		}, raw));
	},

	/**
	 * Power Cycle Droplet
	 *
	 * This method allows you to power cycle a droplet. This will turn off the droplet and then turn it back on.
	 */
	dropletPowerCycle: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletPowerCycle',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'power_cycle'
			}
		}, raw));
	},

	/**
	 * Shut Down Droplet
	 *
	 * This method allows you to shutdown a running droplet. The droplet will remain in your account.
	 */
	dropletShutdown: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletShutdown',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'shutdown'
			}
		}, raw));
	},

	/**
	 * Power Off
	 *
	 * This method allows you to poweroff a running droplet. The droplet will remain in your account.
	 */
	dropletPowerOff: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletPowerOff',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'power_off'
			}
		}, raw));
	},

	/**
	 * Power On
	 *
	 * This method allows you to poweron a powered off droplet.
	 */
	dropletPowerOn: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletPowerOn',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'power_on'
			}
		}, raw));
	},

	/**
	 * Reset Root Password
	 *
	 * This method will reset the root password for a droplet. Please be aware that this will reboot the droplet to allow resetting the password.
	 */
	dropletPasswordReset: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'dropletPasswordReset',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: {
				type: 'password_reset'
			}
		}, raw));
	},


	/**
	 * Resize Droplet
	 *
	 * This method allows you to resize a specific droplet to a different size. This will affect the number of processors and memory allocated to the droplet.
	 */
	dropletResize: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				size: Joi.string().required(),
				disk: Joi.boolean()
			}
		}, {
			callee: 'dropletResize',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: extend({
				type: 'resize'
			}, body)
		}, raw));
	},

	/**
	 * Take a Snapshot
	 *
	 * This method allows you to take a snapshot of the running droplet, which can later be restored or used to create a new droplet from the same image. Please be aware this may cause a reboot.
	 */
	dropletSnapshot: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				name: Joi.string()
			}
		}, {
			callee: 'dropletSnapshot',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: extend({
				type: 'snapshot'
			}, body)
		}, raw));
	},

	/**
	 * Restore Droplet
	 *
	 * This method allows you to restore a droplet with a previous image or snapshot. This will be a mirror copy of the image or snapshot to your droplet. Be sure you have backed up any necessary information prior to restore.
	 */
	dropletRestore: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				image: Joi.alternatives().try(Joi.string(), Joi.number()).required()
			}
		}, {
			callee: 'dropletRestore',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: extend({
				type: 'restore'
			}, body)
		}, raw));
	},


	/**
	 * Rebuild Droplet
	 *
	 * This method allows you to reinstall a droplet with a default image. This is useful if you want to start again but retain the same IP address for your droplet.
	 */
	dropletRebuild: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				image: Joi.alternatives().try(Joi.string(), Joi.number()).required()
			}
		}, {
			callee: 'dropletRebuild',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: extend({
				type: 'rebuild'
			}, body)
		}, raw));
	},

	/**
	 * Rename Droplet
	 *
	 * This method renames the droplet to the specified name.
	 */
	dropletRename: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				name: Joi.string().required()
			}
		}, {
			callee: 'dropletRename',
			method: 'POST',
			path: 'droplets/:droplet_id/actions',
			required: 'action',
			params: {
				droplet_id: id
			},
			body: extend({
				type: 'rename'
			}, body)
		}, raw));
	},

	/**
	 * Destroy Droplet
	 *
	 * This method destroys one of your droplets - this is irreversible.
	 */
	dropletDestroy: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletDestroy',
			method: 'DELETE',
			path: 'droplets/:droplet_id',
			params: {
				droplet_id: id
			}
		}, raw));
	},

	/**
	 * All Regions
	 *
	 * This method will return all the available regions within the Digital Ocean cloud.
	 */
	regionGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'regionGetAll',
			method: 'GET',
			path: 'regions',
			required: 'regions',
			query: query || {}
		}, raw));
	},


	/**
	 * All Images
	 *
	 * This method returns all the available images that can be accessed by your client ID. You will have access to all public images by default, and any snapshots or backups that you have created in your own account.
	 */
	imageGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'imageGetAll',
			method: 'GET',
			path: 'images',
			required: 'images',
			query: query || {}
		}, raw));
	},

	/**
	 * List all Distribution Images
	 */
	imageDistributionGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request({
			query: {
				type: Joi.string().required()
			}
		}, {
			callee: 'imageDistributionGetAll',
			method: 'GET',
			path: 'images',
			required: 'images',
			query: extend({
				type: 'distribution'
			}, query)
		}, raw));
	},


	/**
	 * List all Application Images
	 */
	imageApplicationGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request({
			query: {
				type: Joi.string().required()
			}
		}, {
			callee: 'imageApplicationGetAll',
			method: 'GET',
			path: 'images',
			required: 'images',
			query: extend({
				type: 'application'
			}, query)
		}, raw));
	},

	/**
	 * Mine images
	 *
	 * This method returns snapshots or backups that you have created in your own account.
	 */
	imageGetMine: function($deferred, query, raw) {
		$deferred.resolve(this._request({
			query: {
				private: Joi.boolean().required()
			}
		}, {
			callee: 'imageGetMine',
			method: 'GET',
			path: 'images',
			required: 'images',
			query: extend({
				private: true
			}, query)
		}, raw));
	},


	/**
	 * Show Image
	 *
	 * This method displays the attributes of an image.
	 */
	imageGet: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				image_id: Joi.number().required()
			}
		}, {
			callee: 'imageGet',
			method: 'GET',
			path: 'images/:image_id',
			required: 'image',
			params: {
				image_id: id
			}
		}, raw));
	},

	/**
	 * Destroy Image
	 *
	 * This method allows you to destroy an image. There is no way to restore a deleted image so be careful and ensure your data is properly backed up.
	 */
	imageDestroy: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				image_id: Joi.number().required()
			}
		}, {
			callee: 'imageDestroy',
			method: 'DELETE',
			path: 'images/:image_id',
			params: {
				image_id: id
			}
		}, raw));
	},

	/**
	 * Transfer Image
	 *
	 * This method allows you to transfer an image to a specified region.
	 */
	imageTransfer: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				image_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				region: Joi.string().required()
			}
		}, {
			callee: 'imageTransfer',
			method: 'POST',
			path: 'images/:image_id/actions',
			required: 'action',
			params: {
				image_id: id
			},
			body: extend({
				type: 'transfer'
			}, body)
		}, raw));
	},

	/**
	 * Convert Image To Snapshot
	 *
	 * This method allows you to transfer an image to a specified region.
	 */
	imageToSnapshot: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				image_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required()
			}
		}, {
			callee: 'imageToSnapshot',
			method: 'POST',
			path: 'images/:image_id/actions',
			required: 'action',
			params: {
				image_id: id
			},
			body: {
				type: 'convert'
			}
		}, raw));
	},

	/**
	 * All SSH Keys
	 *
	 * This method lists all the available public SSH keys in your account that can be added to a droplet.
	 */
	sshKeyGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'sshKeyGetAll',
			method: 'GET',
			path: 'account/keys',
			required: 'ssh_keys',
			query: query || {}
		}, raw));
	},

	/**
	 * Add SSH Key.
	 *
	 * This method allows you to add a new public SSH key to your account.
	 */
	sshKeyAdd: function($deferred, body, raw) {
		$deferred.resolve(this._request({
			body: {
				name: Joi.string().required(),
				public_key: Joi.string().required()
			}
		}, {
			callee: 'sshKeyAdd',
			method: 'POST',
			path: 'account/keys',
			required: 'ssh_key',
			body: body || {}
		}, raw));
	},

	/**
	 * Show SSH Key
	 *
	 * This method shows a specific public SSH key in your account that can be added to a droplet.
	 */
	sshKeyGet: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				key_id: Joi.number().required()
			}
		}, {
			callee: 'sshKeyGet',
			method: 'GET',
			path: 'account/keys/:key_id',
			required: 'ssh_key',
			params: {
				key_id: id
			}
		}, raw));
	},

	/**
	 * Edit SSH Key
	 *
	 * This method allows you to modify an existing public SSH key in your account.
	 */
	sshKeyUpdate: function($deferred, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				key_id: Joi.number().required()
			},
			body: {
				name: Joi.string().required()
			}
		}, {
			callee: 'sshKeyUpdate',
			method: 'PUT',
			path: 'account/keys/:key_id',
			required: 'ssh_key',
			params: {
				key_id: id
			},
			body: body || {}
		}, raw));
	},

	/**
	 * Destroy SSH Key
	 *
	 * This method will delete the SSH key from your account.
	 */
	sshKeyDestroy: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				key_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
			}
		}, {
			callee: 'sshKeyDestroy',
			method: 'DELETE',
			path: 'account/keys/:key_id',
			params: {
				key_id: id
			}
		}, raw));
	},

	/**
	 * All Sizes
	 *
	 * This method returns all the available sizes that can be used to create a droplet.
	 */
	sizeGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'sizeGetAll',
			method: 'GET',
			path: 'sizes',
			required: 'sizes',
			query: query || {}
		}, raw));
	},

	/**
	 * All Domains
	 *
	 * This method returns all of your current domains.
	 */
	domainGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'domainGetAll',
			method: 'GET',
			path: 'domains',
			required: 'domains',
			query: query || {}
		}, raw));
	},

	/**
	 * New Domain
	 *
	 * This method creates a new domain name with an A record for the specified [ip_address].
	 */
	domainNew: function($deferred, body, raw) {
		$deferred.resolve(this._request({
			body: {
				name: Joi.string().required(),
				ip_address: Joi.string().required()
			}
		}, {
			callee: 'domainNew',
			method: 'POST',
			path: 'domains',
			required: 'domains',
			body: body || {}
		}, raw));
	},

	/**
	 * Domain Show
	 *
	 * This method returns the specified domain.
	 */
	domainGet: function($deferred, name, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required()
			}
		}, {
			callee: 'domainGet',
			method: 'GET',
			path: 'domains/:domain_name',
			required: 'domain',
			params: {
				domain_name: name
			}
		}, raw));
	},

	/**
	 * Destroy Domain
	 *
	 * This method deletes the specified domain.
	 */
	domainDestroy: function($deferred, name, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required()
			}
		}, {
			callee: 'domainDestroy',
			method: 'DELETE',
			path: 'domains/:domain_name',
			params: {
				domain_name: name
			}
		}, raw));
	},

	/**
	 * All Domain Records
	 *
	 * This method returns all of your current domain records.
	 */
	domainRecordGetAll: function($deferred, name, query, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required(),
			}
		}, {
			callee: 'domainRecordGetAll',
			method: 'GET',
			path: 'domains/:domain_name/records',
			required: 'domain_records',
			query: query || {},
			params: {
				domain_name: name
			}
		}, raw));
	},

	/**
	 * New Domain Record
	 *
	 * This method creates a new domain name with an A record for the specified [ip_address].
	 */
	domainRecordNew: function($deferred, name, body, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required()
			},
			body: {
				type: Joi.string().required(),
				name: Joi.string().required(),
				data: Joi.string().required(),
				priority: Joi.number(),
				port: Joi.number(),
				weight: Joi.number()
			}
		}, {
			callee: 'domainRecordNew',
			method: 'POST',
			path: 'domains',
			required: 'domain_record',
			params: {
				domain_name: name
			},
			body: body || {}
		}, raw));
	},


	/**
	 * Show Domain Record
	 *
	 * This method returns the specified domain record.
	 */
	domainRecordGet: function($deferred, name, id, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required(),
				record_id: Joi.number().required()
			}
		}, {
			callee: 'domainRecordGet',
			method: 'GET',
			path: 'domains/:domain_name/records/:record_id',
			required: 'domain_record',
			params: {
				domain_name: name,
				record_id: id
			}
		}, raw));
	},


	/**
	 * Edit Domain Record
	 *
	 * This method edits an existing domain record.
	 */
	domainRecordEdit: function($deferred, name, id, body, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required(),
				record_id: Joi.number().required()
			},
			body: {
				type: Joi.string().required(),
				name: Joi.string().required(),
				data: Joi.string().required(),
				priority: Joi.number(),
				port: Joi.number(),
				weight: Joi.number()
			}
		}, {
			callee: 'domainRecordEdit',
			method: 'PUT',
			path: 'domains/:domain_name/records/:record_id',
			required: 'domain_record',
			params: {
				domain_name: name,
				record_id: id
			},
			body: body || {}
		}, raw));
	},

	/**
	 * Destroy Domain Record
	 *
	 * This method deletes the specified domain record.
	 */
	domainRecordDestroy: function($deferred, name, id, raw) {
		$deferred.resolve(this._request({
			params: {
				domain_name: Joi.string().required(),
				record_id: Joi.number().required()
			}
		}, {
			callee: 'domainRecordDestroy',
			method: 'DELETE',
			path: 'domains/:domain_name/records/:record_id',
			params: {
				domain_name: name,
				record_id: id
			}
		}, raw));
	},

	/**
	 * List all Actions
	 *
	 * List all of the actions that have been executed on the current account.
	 */
	actionsGetAll: function($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'actionsGetAll',
			method: 'GET',
			path: 'actions',
			required: 'actions',
			query: query || {}
		}, raw));
	},

	/**
	 * Retrieve an existing Action
	 */
	actionsGet: function($deferred, id, raw) {
		$deferred.resolve(this._request({
			params: {
				action_id: Joi.number().required()
			}
		}, {
			callee: 'actionsGet',
			method: 'GET',
			path: 'actions/:action_id',
			required: 'action',
			params: {
				action_id: id
			}
		}, raw));
	},

	/**
	 * List all Actions
	 *
	 * List all of the actions that have been executed on the current account.
	 * https://developers.digitalocean.com/documentation/v2/#list-all-floating-ips
	 */
	floatingIpGetAll: function ($deferred, query, raw) {
		$deferred.resolve(this._request(null, {
			callee: 'floatingIpsGetAll',
			method: 'GET',
			path: 'floating_ips',
			required: 'floating_ips',
			query: query || {}
		}, raw));
	},

	/**
	 * Retrieve an existing Floating Ip
	 */
	floatingIpGet: function($deferred, ip, raw) {
		$deferred.resolve(this._request({
			params: {
				ip: Joi.string().required()
			}
		}, {
			callee: 'floatingIpsGet',
			method: 'GET',
			path: 'floating_ips/:ip',
			required: 'floating_ip',
			params: {
				ip: ip
			}
		}, raw));
	},

	/**
	 * New floating Ip
	 *
	 * This method creates a new floating ip
	 */
	floatingIpNew: function($deferred, body, raw) {
		$deferred.resolve(this._request({
			body: Joi.object({
				region: Joi.string(),
				droplet_id: Joi.number()
			}).min(1).required()
		}, {
			callee: 'floatingIpNew',
			method: 'POST',
			path: 'floating_ips',
			required: 'floating_ip',
			body: body || {}
		}, raw));
	},

	/**
	 * Destroy a floating Ip
	 *
	 * This method deletes the specified floating ip
	 */
	floatingIpDestroy: function($deferred, ip, raw) {
		$deferred.resolve(this._request({
			params: {
				ip: Joi.string().required()
			}
		}, {
			callee: 'domainRecordDestroy',
			method: 'DELETE',
			path: 'floating_ips/:ip',
			params: {
				ip: ip
			}
		}, raw));
	},

	/**
	 * Assign a Floating IP to a Droplet
	 */
	floatingIpAssign: function($deferred, ip, body, raw) {
		$deferred.resolve(this._request({
			params: {
				ip: Joi.string().required()
			},
			body: {
				type: Joi.string().required(),
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletReboot',
			method: 'POST',
			path: 'floating_ips/:ip/actions',
			required: 'action',
			params: {
				ip: ip
			},
			body: extend({
				type: 'assign'
			}, body)
		}, raw));
	},

	/**
	 * Unassign a Floating IP
	 */
	floatingIpUnassign: function($deferred, ip, body, raw) {
		$deferred.resolve(this._request({
			params: {
				ip: Joi.string().required()
			},
			body: {
				type: Joi.string().required(),
				droplet_id: Joi.number().required()
			}
		}, {
			callee: 'dropletReboot',
			method: 'POST',
			path: 'floating_ips/:ip/actions',
			required: 'action',
			params: {
				ip: ip
			},
			body: extend({
				type: 'unassign'
			}, body)
		}, raw));
	}
});

module.exports = DigitalOcean;
