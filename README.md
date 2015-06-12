# doapi

The doapi module allows you to communicate with the [DigitalOcean API V2](https://developers.digitalocean.com/documentation/v2/) from node.js in a promise friendly manner.

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
	itemsPerPage: 100
});
```

## Methods

All methods follow the [official API documentation](https://developers.digitalocean.com/documentation/v2/).

### Droplets

- [dropletGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-droplets)
- [dropletNew([body])](https://developers.digitalocean.com/documentation/v2/#create-a-new-droplet)
- [dropletGet([id])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-droplet-by-id)
- [dropletReboot([id])](https://developers.digitalocean.com/documentation/v2/#reboot-a-droplet)
- [dropletPowerCycle([id])](https://developers.digitalocean.com/documentation/v2/#power-cycle-a-droplet)
- [dropletShutdown([id])](https://developers.digitalocean.com/documentation/v2/#shutdown-a-droplet)
- [dropletPowerOff([id])](https://developers.digitalocean.com/documentation/v2/#power-off-a-droplet)
- [dropletPowerOn([id])](https://developers.digitalocean.com/documentation/v2/#power-on-a-droplet)
- [dropletPasswordReset([id])](https://developers.digitalocean.com/documentation/v2/#password-reset-a-droplet)
- [dropletResize([id, body])](https://developers.digitalocean.com/documentation/v2/#resize-a-droplet)
- [dropletSnapshot([id, body])](https://developers.digitalocean.com/documentation/v2/#snapshot-a-droplet)
- [dropletRestore([id, body])](https://developers.digitalocean.com/documentation/v2/#restore-a-droplet)
- [dropletRebuild([id, body])](https://developers.digitalocean.com/documentation/v2/#rebuild-a-droplet)
- [dropletRename([id, body])](https://developers.digitalocean.com/documentation/v2/#rename-a-droplet)
- [dropletDestroy([id])](https://developers.digitalocean.com/documentation/v2/#delete-a-droplet)


### Regions

- [regionGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-regions)

### Images

- [imageGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-images)
- [imageDistributionGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-distribution-images)
- [imageApplicationGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-application-images)
- [imageGetMine([query])](https://developers.digitalocean.com/documentation/v2/#list-a-user-s-images)
- [imageGet([id])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-image-by-id)
- [imageDestroy([id])](https://developers.digitalocean.com/documentation/v2/#delete-an-image)
- [imageTransfer([id, body])](https://developers.digitalocean.com/documentation/v2/#transfer-an-image)
- [imageToSnapshot([id])](https://developers.digitalocean.com/documentation/v2/#convert-an-image-to-a-snapshot)

### SSH keys

- [sshKeyGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-keys)
- [sshKeyAdd([body])](https://developers.digitalocean.com/documentation/v2/#create-a-new-key)
- [sshKeyGet([id])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-key)
- [sshKeyUpdate([id, body])](https://developers.digitalocean.com/documentation/v2/#update-a-key)
- [sshKeyDestroy([id])](https://developers.digitalocean.com/documentation/v2/#destroy-a-key)

### Sizes

- [sizeGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-sizes)

### Domains

- [domainGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-domains)
- [domainNew([name, body])](https://developers.digitalocean.com/documentation/v2/#create-a-new-domain)
- [domainGet([name])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-domain)
- [domainDestroy([name])](https://developers.digitalocean.com/documentation/v2/#delete-a-domain)
- [domainRecordGetAll([name, query])](https://developers.digitalocean.com/documentation/v2/#list-all-domain-records)
- [domainRecordGet([name, id])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-domain-record)
- [domainRecordEdit([name, id, body])](https://developers.digitalocean.com/documentation/v2/#update-a-domain-record)
- [domainRecordDestroy([name, id])](https://developers.digitalocean.com/documentation/v2/#delete-a-domain-record)


### Actions

- [actionsGetAll([query])](https://developers.digitalocean.com/documentation/v2/#list-all-actions)
- [actionsGet([id])](https://developers.digitalocean.com/documentation/v2/#retrieve-an-existing-action)
