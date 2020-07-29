const { isTrue } = require("./utils");
module.exports = {
	URI: process.env.RABBITMQ_URI || "amqp://guest:guest@localhost:5672",
	DLX_ENABLED: isTrue(process.env.DLX_ENABLED),
};
