"use strict";

const amqpMixin = require("../mixins/amqp.mixin");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 */

module.exports = {
	name: "consumer",

	/**
	 * Settings
	 */
	settings: {},

	/**
	 * Dependencies
	 */
	dependencies: [],
	mixins: [amqpMixin],
	/**
	 * Actions
	 */
	actions: {},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {
		async handleMessage(message) {
			console.log(message);
		},
	},
	AMQPQueues: {
		async welcome(channel, message) {
			const data = this.decodeMessage(message);
			await this.handleMessage(data);
			channel.ack(message);
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {},
};
