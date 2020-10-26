let witService = require('../services/wit-service');
const userService = require('../services/user-service');
const config = require('../config/dev.js');
const fbService = require('../services/fb-service');

module.exports = (app, setSessionAndUser, getUserData, changeConvState, handleWitAiResponse) => {
    /**
     * webhook for facebook for verification
     */
    app.get('/facebook/webhook/', function(req, res) {

        if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
            res.status(200).send(req.query['hub.challenge']);
        } else {
            console.error("Failed validation. Make sure the validation tokens match.");
            res.sendStatus(403);
        }
    });

    /*
     * All callbacks for Messenger are POST-ed. They will be sent to the same
     * webhook. Be sure to subscribe your app to your page to receive callbacks
     * for your page.
     * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
     *
     */
    app.post('/facebook/webhook/', function(req, res) {

        let self = module.exports;

        var data = req.body;
        //console.log(JSON.stringify(data));

        // Make sure this is a page subscription
        if (data.object == 'page') {
            // Iterate over each entry
            // There may be multiple if batched
            data.entry.forEach(function(pageEntry) {
                var pageID = pageEntry.id;
                var timeOfEvent = pageEntry.time;

                // Bot is in control - listen for messages
                if (pageEntry.messaging) {
                    // Iterate over each messaging event
                    pageEntry.messaging.forEach(function(messagingEvent) {
                        if (messagingEvent.optin) {
                            receivedOptin(messagingEvent);
                        } else if (messagingEvent.message) {
                            receivedMessage(messagingEvent);
                        } else if (messagingEvent.postback) {
                            receivedPostback(messagingEvent);
                        } else {
                            console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                        }
                    });
                }
            });

            // Assume all went well.
            // You must send back a 200, within 20 seconds
            res.sendStatus(200);
        }
    });


    
        /**
     * method that handles otins like one time notifications
     * @param event
     * @returns {Promise<void>}
     */
    async function receivedOptin(event) {
        let senderID = event.sender.id;
        let sessionIds = await setSessionAndUser(senderID);

        let sessionId = sessionIds.get(senderID);

        let optin = event.optin;
        
        switch (optin.type) {
            case 'one_time_notif_req':
                const userDataNew = {
                    one_time_notif_token: optin.one_time_notif_token,
                    conv_state: optin.payload
                };
                userService.updateCurrentUserAndSession( senderID, sessionId, userDataNew );
                
                let userData = getUserData(sessionId);

                fbService.readResponsesFromJSON(senderID, userData, 'notification_accepted');
                break;
            default:
                break;
        }

    }

    /**
     * method that handles text, attachement or quick reply messages from Messenger
     * @param event
     * @returns {Promise<void>}
     */
    async function receivedMessage(event) {

        var senderID = event.sender.id;
        var message = event.message;

        var messageId = message.mid;
        var appId = message.app_id;
        var metadata = message.metadata;

        // You may get a text or attachment but not both
        var messageText = message.text;
        var messageAttachments = message.attachments;
        var quickReply = message.quick_reply;
        

        let sessionIds = await setSessionAndUser(senderID);
        if (quickReply) {
            handleQuickReply(senderID, sessionIds, quickReply, messageId);
        } else if (messageText) {
            // check if user has reached another agent and don't let him switch back
            let userData = getUserData(sessionIds.get(senderID));

            //send incoming message to Wit
            witService.sendTextQueryToWit(senderID, sessionIds, userData, handleWitAiResponse, messageText);
        } else if (messageAttachments) {
            fbService.handleMessageAttachments(messageAttachments, senderID);
        }
    }



    /*
     * Postback Event
     *
     * This event is called when a postback is tapped on a Structured Message.
     * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
     *
     */
    async function receivedPostback(event) {

        var senderID = event.sender.id;
        var recipientID = event.recipient.id;
        var timeOfPostback = event.timestamp;

        //let sessionIds = await
        let sessionIds = await setSessionAndUser(senderID);

        // The 'payload' param is a developer-defined field which is set in a postback
        // button for Structured Messages.
        var payload = event.postback.payload;

        let userData = getUserData(sessionIds.get(senderID));

        // console.log(payload);
        switch (payload) {
            case "START": {
                changeConvState(senderID, payload);
                fbService.readResponsesFromJSON(senderID, userData, 'deal');
                break;
            }   
            case "DEAL": {
                changeConvState(senderID, payload);
                fbService.readResponsesFromJSON(senderID, userData, 'contract');
                break;
            }
            case "CONTRACT": {
                changeConvState(senderID, 'CURRENT_TIME_ASK');
                fbService.readResponsesFromJSON(senderID, userData, 'current_time');
                break;
            }  
            default: 
            //unindentified payload
                fbService.sendTextMessage(senderID, "I'm not sure what you want. Can you be more specific?");
            break;

        }

        // console.log("Received postback for user %d and page %d with payload '%s' " +
        //     "at %d", senderID, recipientID, payload, timeOfPostback);

    }

    /**
     * method for handleng payload received from quick replies... add a case ...default will forward the payload to Wit
     * @param senderID
     * @param sessionIds
     * @param quickReply
     * @param messageId
     */
    function handleQuickReply(senderID, sessionIds, quickReply, messageId) {
        var quickReplyPayload = quickReply.payload;

        switch (quickReplyPayload) {

            default:
                let userData = getUserData(sessionIds.get(senderID));
                witService.sendTextQueryToWit( senderID, userData, handleWitAiResponse, quickReplyPayload);
                break;
        }
    }


}