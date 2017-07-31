const _ = require('lodash');
const fs = require('fs');



class Settings {
	constructor() {
		this.defaultFile = '../config/default.json';
		this.envFile = `../config/${process.env.NODE_ENV}.json`;
		this.settings = _.merge(require(this.defaultFile), require(this.envFile));

		fs.watchFile(this.envFile, (curr, prev) => {
			console.log(`Settings watchFile ${this.envFile}:`, prev.mtime, curr.mtime);
			this.settings = _.merge(require(this.defaultFile), require(this.envFile));
		});
	}

	get(path, defaultValue=undefined) {
		return _.get(this.settings, path, defaultValue);
	}
}



var settings = new Settings;
module.exports = settings;