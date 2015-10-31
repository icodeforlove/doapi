# doapi

The doapi module allows you to communicate with the [DigitalOcean API V2](https://developers.digitalocean.com/documentation/v2/) from node.js in a promise friendly manner.

It also supports automatic request retries.

## Installation

This module is published in NPM:

```
npm install doapi --save
```

The `--save` tells NPM to automatically add it to your `package.json` file

## Usage

```js
// Import a module
var DigitalOceanAPI = require('doapi');

// Create an instance with your API V2 credentials
var api = new DigitalOceanAPI({token: 'my_token'});

// Get things done
api.dropletGetAll().then(function (droplets) {
	console.log(droplets);
});
```

## Config
```js
new DigitalOceanAPI({
	token: 'my_token',
	itemsPerPage: 100, // default=100
	maxRetries: 5, // default=5
	raw: false // default=false
});
```

## Pagination
you can pass pagination params into any method that has a `body` or `query` argument.

```js
api.dropletGetAll({per_page: 1, page: 2}).then(function (droplets) {
	console.log(droplets);
});
```

## Raw
if you set raw it will return the full response body with `request info` and `ratelimiting details`, the default is false.

```js
api.accountGet(true)
```

would return
```
	{
		account: {
			droplet_limit: 25,
			email: 'email@domain.com',
			uuid: 'f5bbaffce3a8792421593a7075b486bafd66672f',
			email_verified: true
		},
		ratelimit: {
			limit: '5000',
			remaining: '4993',
			reset: '1434197547'
		},
		requestinfo: {
			id: 'a24427fd-0d43-9536-a206-zac22d2696e1',
			runtime: '0.038537'
		 }
	}
```

and with raw set to false (the default), it would return

```
	{
		droplet_limit: 25,
		email: 'email@domain.com',
		uuid: 'f5bbaffce3a8792421593a7075b486bafd66672f',
		email_verified: true
	}
```

## Debugging
we use the debug module so you can debug the http requests by doing the following

```
DEBUG=http node myfile.js
```

![image](http://cdn.img42.com/4ad5f305b6fe80613c90aadf54337598.png)

also all methods enforce type checking so invalid usage would result in errors like this

![image](http://cdn.img42.com/cf073d9c3bf95bc0355045a024ad0be4.png)

## Methods

All methods follow the [official API documentation](https://developers.digitalocean.com/documentation/v2/).

### Droplets

- [dropletGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-droplets)
- [dropletNew(Object body, [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#create-a-new-droplet)
- [dropletGet(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-droplet-by-id)
- [dropletReboot(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#reboot-a-droplet)
- [dropletPowerCycle(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#power-cycle-a-droplet)
- [dropletShutdown(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#shutdown-a-droplet)
- [dropletPowerOff(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#power-off-a-droplet)
- [dropletPowerOn(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#power-on-a-droplet)
- [dropletPasswordReset(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#password-reset-a-droplet)
- [dropletResize(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#resize-a-droplet)
- [dropletSnapshot(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#snapshot-a-droplet)
- [dropletRestore(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#restore-a-droplet)
- [dropletRebuild(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#rebuild-a-droplet)
- [dropletRename(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#rename-a-droplet)
- [dropletDestroy(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#delete-a-droplet)
- [dropletKernalsGetAll(Number id, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-available-kernels-for-a-droplet)
- [dropletSnapshotsGetAll(Number id, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-snapshots-for-a-droplet)
- [dropletBackupsGetAll(Number id, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-backups-for-a-droplet)
- [dropletActionGetAll(Number id, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-actions-for-a-droplet)
- [dropletNeighborsGetAll(Number id, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-neighbors-for-a-droplet)
- [dropletUpgradesGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-droplet-upgrades)
- [reportDropletNeighborsGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-droplet-neighbors)

## Account

- [accountGet([Boolean raw])](https://developers.digitalocean.com/documentation/v2/#get-user-information)

### Regions

- [regionGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-regions)

### Images

- [imageGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-images)
- [imageDistributionGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-distribution-images)
- [imageApplicationGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-application-images)
- [imageGetMine(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-a-user-s-images)
- [imageGet(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-image-by-id)
- [imageDestroy(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#delete-an-image)
- [imageTransfer(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#transfer-an-image)
- [imageToSnapshot(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#convert-an-image-to-a-snapshot)

### SSH keys

- [sshKeyGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-keys)
- [sshKeyAdd(Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#create-a-new-key)
- [sshKeyGet(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-key)
- [sshKeyUpdate(Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#update-a-key)
- [sshKeyDestroy(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#destroy-a-key)

### Sizes

- [sizeGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-sizes)

### Domains

- [domainGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-domains)
- [domainNew(String name, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#create-a-new-domain)
- [domainGet(String name [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-domain)
- [domainDestroy(String name [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#delete-a-domain)
- [domainRecordGetAll(String name, Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-domain-records)
- [domainRecordNew(String name, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#create-a-new-domain-record)
- [domainRecordGet(String name, Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-domain-record)
- [domainRecordEdit(String name, Number id, Object body [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#update-a-domain-record)
- [domainRecordDestroy(String name, Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#delete-a-domain-record)


### Actions

- [actionsGetAll(String name [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-actions)
- [actionsGet(Number id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-action)

### Floating IPs

- [floatingIpGetAll(Object query [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#list-all-floating-ips)
- [floatingIpGet(String ip [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-floating-ip)
- [floatingIpNew(Object body, [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#create-a-new-floating-ip-assigned-to-a-droplet)
- [floatingIpDestroy(String ip [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#delete-a-floating-ips)
- [floatingIpAssign(String droplet_id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#assign-a-floating-ip-to-a-droplet)
- [floatingIpUnassign(String droplet_id [, Boolean raw])](https://developers.digitalocean.com/documentation/v2/#unassign-a-floating-ip)
