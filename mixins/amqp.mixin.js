/*
 * moleculer-amqp-queue
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const amqp = require("amqplib");
const Errors = require("moleculer").Errors;
const config = require("../config");

module.exports = {
	name: "moleculer-amqp-queue",

	settings: {
		url: config.RABBITMQ.URI,
		deadLetterRoutingKey: config.RABBITMQ.DLX_ENABLED,
	},

	methods: {
		decodeMessage(message) {
			return JSON.parse(message.content.toString());
		},
		async getAMQPQueue(name) {
			if (!this.$queues[name]) {
				try {
					let queueOptions = {
						durable: true,
					};

					if (this.settings.deadLetterRoutingKey) {
						const dlkName = `${name}.dead-letter`;

						let channelDLK = await this.AMQPConn.createChannel();
						await channelDLK.assertQueue(dlkName, {
							durable: true,
						});

						// set DLX options for main queue
						queueOptions = {
							...queueOptions,
							deadLetterExchange: "",
							deadLetterRoutingKey: dlkName,
						};
					}

					let channel = await this.AMQPConn.createChannel();
					channel.on("close", () => {
						delete this.$queues[name];
					});
					channel.on("error", (err) => {
						/* istanbul ignore next */
						this.logger.error(err);
					});
					await channel.assertQueue(name, queueOptions);

					channel.prefetch(1);
					this.$queues[name] = channel;
				} catch (err) {
					this.logger.error(err);
					throw MoleculerError("Unable to start queue");
				}
			}
			return this.$queues[name];
		},
		async addAMQPJob(name, message) {
			let queue = await this.getAMQPQueue(name);
			queue.sendToQueue(name, Buffer.from(JSON.stringify(message)), {
				persistent: true,
			});
		},
	},

	created() {
		this.AMQPConn = null;
		this.$queues = {};
	},

	async started() {
		if (!this.settings.url)
			throw new Errors.ServiceSchemaError("Missing options URL");

		try {
			this.AMQPConn = await amqp.connect(this.settings.url);
			if (this.schema.AMQPQueues) {
				_.forIn(this.schema.AMQPQueues, async (job, name) => {
					let channel = await this.getAMQPQueue(name);
					// fn.bind(this, channel) allows job to get access to `this` context
					// as well as partial call the function with channel argument
					channel.consume(name, job.bind(this, channel), {
						noAck: false,
					});
				});
			}
		} catch (err) {
			this.logger.error(err);
			throw Errors.MoleculerError("Unable to connect to AMQP");
		}
	},
	async stopped() {
		for (const queue in this.$queues) {
			await this.$queues[queue].close();
		}
		await this.AMQPConn.close();
	},
};
