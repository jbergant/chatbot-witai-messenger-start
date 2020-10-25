const {Wit, log} = require('node-wit');
const config = require('../config/dev.js');

const client = new Wit({
  accessToken: config.WIT_TOKEN,
  logger: new log.Logger(log.DEBUG) // optional
});




module.exports = {
    /**
     * send a text query to DF
     * @param sessionIds
     * @param sender
     * @param userData
     * @param handleWitAiResponse
     * @param text
     * @param params
     * @returns {Promise<void>}
     */
    async sendTextQueryToWit(sender, sessionIds, userData, handleWitAiResponse, text, params = {}) {

        client.message(text, {})
        .then((result) => {
          handleWitAiResponse(sender, sessionIds, userData, result, params);
        })
        .catch(console.error);
    },
}